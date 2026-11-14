import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmActionModal from '../../src/components/ConfirmActionModal';
import Dashboard from '../../src/views/Dashboard';
import UploadMedia from '../../src/views/UploadMedia';
import type { Patient } from '../../src/types';

const patient = (uhid: string, name: string, surgeries: Patient['surgeries'] = []): Patient => ({
  uhid,
  name,
  ageYears: 50,
  gender: 'Male',
  diagnosis: 'Dx',
  primarySurgeon: 'Dr',
  studyGroupIds: [],
  createdAt: '2026-01-01',
  surgeries,
});

describe('ConfirmActionModal', () => {
  it('requires typing the UHID before permanent deletion', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <ConfirmActionModal
        action="hard-delete"
        patient={patient('HOSP-9', 'Ravi')}
        onConfirm={onConfirm}
        onClose={() => {}}
      />,
    );

    const confirm = screen.getByRole('button', { name: /delete permanently/i });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByRole('textbox'), 'HOSP-');
    expect(confirm).toBeDisabled();
    await user.type(screen.getByRole('textbox'), '9');
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('shows the error and stays open when the action fails', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error('network down'));
    render(
      <ConfirmActionModal action="restore" patient={patient('P', 'Ravi')} onConfirm={onConfirm} onClose={() => {}} />,
    );
    await user.click(screen.getByRole('button', { name: /^restore$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('network down');
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ConfirmActionModal action="soft-delete" patient={patient('P', 'Ravi')} onConfirm={vi.fn()} onClose={onClose} />,
    );
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/archive patient record/i);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Dashboard', () => {
  const patients = [patient('HOSP-1', 'Asha Menon'), patient('HOSP-2', 'Vikram Rao')];

  it('filters the registry by search term', async () => {
    const user = userEvent.setup();
    render(
      <Dashboard
        patients={patients}
        studyGroups={[]}
        media={[]}
        defaultSurgeon="Dr X"
        onAddPatient={vi.fn()}
        onSelectPatient={vi.fn()}
      />,
    );
    expect(screen.getByText('Asha Menon')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'hosp-2');
    expect(screen.queryByText('Asha Menon')).not.toBeInTheDocument();
    expect(screen.getByText('Vikram Rao')).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'nobody');
    expect(screen.getByText(/no patients match/i)).toBeInTheDocument();
  });

  it('submits a new patient and surfaces save errors', async () => {
    const user = userEvent.setup();
    const onAddPatient = vi
      .fn()
      .mockRejectedValueOnce(new Error('A patient with UHID "HOSP-1" already exists.'))
      .mockResolvedValue(undefined);
    render(
      <Dashboard
        patients={patients}
        studyGroups={[]}
        media={[]}
        defaultSurgeon="Dr X"
        onAddPatient={onAddPatient}
        onSelectPatient={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /add patient/i }));
    const dialog = screen.getByRole('dialog');
    const form = within(dialog);
    expect(form.getByLabelText(/lead surgeon/i)).toHaveValue('Dr X');
    await user.type(form.getByLabelText(/uhid/i), 'HOSP-1');
    await user.type(form.getByLabelText(/patient name/i), 'Dup');
    await user.type(form.getByLabelText(/clinical diagnosis/i), 'Dx');
    await user.click(screen.getByRole('button', { name: /complete enrollment/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/);
    expect(dialog).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /complete enrollment/i }));
    expect(onAddPatient).toHaveBeenCalledTimes(2);
    expect(onAddPatient.mock.calls[1][0]).toMatchObject({ uhid: 'HOSP-1', name: 'Dup', primarySurgeon: 'Dr X' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a patient when its card is clicked', async () => {
    const user = userEvent.setup();
    const onSelectPatient = vi.fn();
    render(
      <Dashboard
        patients={patients}
        studyGroups={[]}
        media={[]}
        defaultSurgeon=""
        onAddPatient={vi.fn()}
        onSelectPatient={onSelectPatient}
      />,
    );
    await user.click(screen.getByRole('button', { name: /vikram rao/i }));
    expect(onSelectPatient).toHaveBeenCalledWith(patients[1]);
  });
});

describe('UploadMedia', () => {
  it('switches to "new procedure" for patients without surgeries and validates input', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn().mockResolvedValue(undefined);
    render(<UploadMedia patients={[patient('P1', 'Asha')]} onUpload={onUpload} />);

    await user.selectOptions(screen.getByLabelText(/patient/i), 'P1');
    expect(screen.getByLabelText(/new procedure title/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/new procedure title/i), 'Primary repair');
    await user.type(screen.getByLabelText(/procedure date/i), '2026-11-01');

    await user.click(screen.getByRole('button', { name: /save session/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/attach at least one asset or enter clinical notes/i);
    expect(onUpload).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/clinical notes/i), 'Pre-op marking');
    await user.click(screen.getByRole('button', { name: /save session/i }));
    expect(onUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        uhid: 'P1',
        newSurgery: { title: 'Primary repair', date: '2026-11-01' },
        notes: 'Pre-op marking',
        files: [],
      }),
    );
    expect(await screen.findByText(/session saved/i)).toBeInTheDocument();
  });

  it('shows upload failures to the user', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn().mockRejectedValue(new Error('Storage quota exceeded'));
    render(
      <UploadMedia
        patients={[patient('P1', 'Asha', [{ id: 's1', title: 'Primary', date: '2026-11-01' }])]}
        onUpload={onUpload}
      />,
    );
    await user.selectOptions(screen.getByLabelText(/patient/i), 'P1');
    await user.selectOptions(screen.getByLabelText(/^procedure$/i), 's1');
    await user.upload(screen.getByLabelText(/add files/i), new File(['x'], 'a.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /save session/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage quota exceeded');
    expect(onUpload.mock.calls[0][0]).toMatchObject({ surgeryId: 's1', files: [expect.any(File)] });
  });
});
