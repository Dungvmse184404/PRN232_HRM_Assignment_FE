import { useState, type FormEvent } from 'react';
import { errorMessage, racingApi, type AssignedRaceEntryDto, type InspectionResult } from '../../lib/api';
import { Button, Card, Field } from '../ui';

const RESULT_OPTIONS: { value: InspectionResult; label: string }[] = [
  { value: 'Eligible', label: 'Đạt (Eligible)' },
  { value: 'Ineligible', label: 'Không đạt (Ineligible)' },
];

export default function InspectionFormModal({
  entry,
  onClose,
  onSaved,
  onError,
}: {
  entry: AssignedRaceEntryDto;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const [result, setResult] = useState<InspectionResult>('Eligible');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await racingApi.createInspection(entry.raceEntryId, result, note || undefined);
      await onSaved();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-ink/30 p-4 overflow-y-auto" onClick={onClose}>
      <Card className="my-8 w-full max-w-sm">
        <div onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-semibold">Ghi nhận kiểm tra ngựa</h3>
          <p className="mt-1 text-sm text-stone">Mã đăng ký: {entry.raceEntryId.slice(0, 8)}…</p>
          {entry.jockeyName && <p className="text-xs text-ash">Jockey: {entry.jockeyName}</p>}

          <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
            <Field label="Kết quả kiểm tra">
              <select
                aria-label="Kết quả kiểm tra"
                value={result}
                onChange={(e) => setResult(e.target.value as InspectionResult)}
                className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm outline-none focus:border-flame"
              >
                {RESULT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Ghi chú">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Ghi chú thêm về tình trạng sức khỏe…"
                className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm text-ink outline-none placeholder:text-driftwood focus:border-flame focus:ring-2 focus:ring-flame/30 resize-none"
              />
            </Field>

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="neutral" onClick={onClose}>Hủy</Button>
              <Button type="submit" loading={saving}>Ghi nhận</Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
