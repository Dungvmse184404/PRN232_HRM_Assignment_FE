import { useState, type FormEvent } from 'react';
import { horsesApi, errorMessage, type HorseDto, type HorseGender } from '../../lib/api';
import { Button, Card, Field, Input, SuggestInput } from '../ui';

const GENDER_LABEL: Record<HorseGender, string> = { Male: 'Đực', Female: 'Cái', Gelding: 'Thiến' };

const BREED_OPTIONS = [
  'Thoroughbred', 'Ả Rập (Arabian)', 'Anglo-Arab', 'Quarter Horse', 'Akhal-Teke',
  'Andalusian', 'Mông Cổ', 'Ngựa Việt (nội)', 'Standardbred', 'Warmblood',
];
const COLOR_OPTIONS = [
  'Hạt dẻ', 'Đen', 'Nâu', 'Xám', 'Trắng', 'Vàng kim', 'Loang', 'Nâu sẫm', 'Bạc', 'Vện',
];

export default function HorseFormModal({
  horse,
  genders,
  onClose,
  onSaved,
  onError,
}: {
  horse: HorseDto | null;
  genders: HorseGender[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const editing = horse !== null;
  const [form, setForm] = useState({
    name: horse?.name ?? '',
    gender: horse?.genderName ?? ('Male' as HorseGender),
    dateOfBirth: horse?.dateOfBirth ?? '',
    breed: horse?.breed ?? '',
    color: horse?.color ?? '',
    weightKg: horse?.weightKg?.toString() ?? '',
    heightCm: horse?.heightCm?.toString() ?? '',
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || null,
        breed: form.breed || null,
        color: form.color || null,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        heightCm: form.heightCm ? Number(form.heightCm) : null,
      };
      if (editing) await horsesApi.update(horse!.id, payload);
      else await horsesApi.create(payload);
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
          <h3 className="text-xl font-semibold">{editing ? 'Sửa hồ sơ ngựa' : 'Thêm ngựa mới'}</h3>

          <form className="mt-5 grid grid-cols-2 gap-4" onSubmit={onSubmit}>
            <div className="col-span-2">
              <Field label="Tên ngựa">
                <Input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="vd: Thần Mã" />
              </Field>
            </div>

            <Field label="Giới tính">
              <select
                value={form.gender}
                onChange={(e) => set('gender', e.target.value as HorseGender)}
                className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm outline-none focus:border-flame"
              >
                {genders.map((g) => <option key={g} value={g}>{GENDER_LABEL[g]}</option>)}
              </select>
            </Field>
            <Field label="Ngày sinh">
              <Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
            </Field>

            <Field label="Giống">
              <SuggestInput
                value={form.breed}
                onChange={(v) => set('breed', v)}
                options={BREED_OPTIONS}
                placeholder="Arabian…"
              />
            </Field>
            <Field label="Màu lông">
              <SuggestInput
                value={form.color}
                onChange={(v) => set('color', v)}
                options={COLOR_OPTIONS}
                placeholder="Hạt dẻ…"
              />
            </Field>

            <Field label="Cân nặng (kg)">
              <Input type="number" step="0.1" min="0" value={form.weightKg} onChange={(e) => set('weightKg', e.target.value)} />
            </Field>
            <Field label="Chiều cao (cm)">
              <Input type="number" step="0.1" min="0" value={form.heightCm} onChange={(e) => set('heightCm', e.target.value)} />
            </Field>

            <div className="col-span-2 mt-2 flex justify-end gap-2">
              <Button type="button" variant="neutral" onClick={onClose}>Hủy</Button>
              <Button type="submit" loading={saving}>{editing ? 'Lưu thay đổi' : 'Tạo ngựa'}</Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
