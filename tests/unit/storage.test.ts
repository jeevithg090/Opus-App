import { beforeEach, describe, expect, it, vi } from 'vitest';

const createSignedUrls = vi.fn();
const upload = vi.fn();
vi.mock('../../src/lib/supabase', () => ({
  MEDIA_BUCKET: 'opus-media',
  supabase: { storage: { from: () => ({ createSignedUrls, upload }) } },
}));

const { resolveMediaUrls, uploadMediaFile } = await import('../../src/lib/storage');

describe('resolveMediaUrls', () => {
  beforeEach(() => {
    createSignedUrls.mockReset();
    upload.mockReset();
  });

  it('signs object keys and legacy public URLs in one batch, leaving external URLs alone', async () => {
    createSignedUrls.mockResolvedValue({
      data: [
        { path: 'u1/P1/a.png', signedUrl: 'https://signed/a' },
        { path: 'u1/P1/b.png', signedUrl: 'https://signed/b' },
      ],
      error: null,
    });
    const legacy = 'https://x.supabase.co/storage/v1/object/public/opus-media/u1/P1/b.png';
    const result = await resolveMediaUrls(['u1/P1/a.png', legacy, 'https://example.com/c.jpg']);

    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(createSignedUrls.mock.calls[0][0]).toEqual(['u1/P1/a.png', 'u1/P1/b.png']);
    expect(result.get('u1/P1/a.png')).toBe('https://signed/a');
    expect(result.get(legacy)).toBe('https://signed/b');
    expect(result.get('https://example.com/c.jpg')).toBe('https://example.com/c.jpg');
  });

  it('falls back to the stored reference when signing fails', async () => {
    createSignedUrls.mockResolvedValue({ data: null, error: { message: 'denied' } });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await resolveMediaUrls(['u1/P1/a.png']);
    expect(result.get('u1/P1/a.png')).toBe('u1/P1/a.png');
    warn.mockRestore();
  });

  it('skips the network call when nothing needs signing', async () => {
    await resolveMediaUrls(['https://example.com/x.jpg']);
    expect(createSignedUrls).not.toHaveBeenCalled();
  });
});

describe('uploadMediaFile', () => {
  it('uploads under the user folder and returns the key', async () => {
    upload.mockResolvedValue({ error: null });
    const file = new File(['x'], 'scan 1.png', { type: 'image/png' });
    const path = await uploadMediaFile('user-1', 'P1', file, 0, 42);
    expect(path).toBe('user-1/P1/42-0-scan_1.png');
    expect(upload).toHaveBeenCalledWith(path, file, { contentType: 'image/png', upsert: false });
  });

  it('throws storage errors', async () => {
    upload.mockResolvedValue({ error: new Error('too large') });
    await expect(uploadMediaFile('u', 'P', new File(['x'], 'a.png'), 0)).rejects.toThrow('too large');
  });
});
