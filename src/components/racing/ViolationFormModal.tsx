import { useState, type FormEvent } from 'react';
import { errorMessage, racingApi, type AssignedRaceEntryDto, type ViolationSeverity } from '../../lib/api';
import { Button, Card, Field, Input } from '../ui';

const SEVERITY_OPTIONS: { value: ViolationSeverity; label: string }[] = [
  { value: 'Minor', label: 'Nhẹ (Minor)' },
  { value: 'Major', label: 'Nghiêm trọng (Major)' },
  { value: 'Disqualify', label: 'Truất quyền (Disqualify)' },
];

export default function ViolationFormModal({
  raceId,
  entries,
  onClose,
  onSaved,
  onError,
}: {
  raceId: string;
  entries: AssignedRaceEntryDto[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    raceEntryId: '',
    type: '',
    severity: 'Minor' as ViolationSeverity,
    penalty: '',
    note: '',
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.type.trim()) { onError('Vui lòng nhập loại vi phạm.'); return; }
    setSaving(true);
    try {
      await racingApi.recordViolation({
        raceId,
        raceEntryId: form.raceEntryId || null,
        jockeyId: null,
        type: form.type,
        severity: form.severity,
        penalty: form.penalty || null,
        note: form.note || null,
      });
      await onSaved();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-ink/30 p-4 overflow-y-auto" onClick={onClose}>
      <Card className="my-8 w-full max-w-lg">
        <div onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-semibold">Ghi nhận vi phạm</h3>
          <p className="mt-1 text-sm text-stone">Mã cuộc đua: {raceId.slice(0, 8)}…</p>

          <form className="mt-5 grid grid-cols-2 gap-4" onSubmit={onSubmit}>
            <div className="col-span-2">
              <Field label="Ngựa / Mã đăng ký (tuỳ chọn)">
                <select
                  aria-label="Ngựa / Mã đăng ký (tuỳ chọn)"
                  value={form.raceEntryId}
                  onChange={(e) => set('raceEntryId', e.target.value)}
                  className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm outline-none focus:border-flame"
                >
                  <option value="">-- Không chọn (vi phạm chung) --</option>
                  {entries.map((e) => (
                    <option key={e.raceEntryId} value={e.raceEntryId}>
                      {e.horseName ?? e.raceEntryId.slice(0, 8)} {e.jockeyName ? `· ${e.jockeyName}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Loại vi phạm" hint="vd: Cản đường, Dùng chất kích thích…">
                <Input
                  required
                  value={form.type}
                  onChange={(e) => set('type', e.target.value)}
                  placeholder="Nhập loại vi phạm"
                />
              </Field>
            </div>

            <Field label="Mức độ">
              <select
                aria-label="Mức độ"
                value={form.severity}
                onChange={(e) => set('severity', e.target.value as ViolationSeverity)}
                className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm outline-none focus:border-flame"
              >
                {SEVERITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Hình phạt">
              <Input
                value={form.penalty}
                onChange={(e) => set('penalty', e.target.value)}
                placeholder="vd: Phạt tiền, Cảnh cáo…"
              />
            </Field>

            <div className="col-span-2">
              <Field label="Ghi chú">
                <textarea
                  value={form.note}
                  onChange={(e) => set('note', e.target.value)}
                  rows={3}
                  placeholder="Mô tả chi tiết vi phạm…"
                  className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm text-ink outline-none placeholder:text-driftwood focus:border-flame focus:ring-2 focus:ring-flame/30 resize-none w-full"
                />
              </Field>
            </div>

            <div className="col-span-2 mt-2 flex justify-end gap-2">
              <Button type="button" variant="neutral" onClick={onClose}>Hủy</Button>
              <Button type="submit" loading={saving}>Ghi nhận</Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
