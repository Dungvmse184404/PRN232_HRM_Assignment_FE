import { useState, type FormEvent } from 'react';
import { errorMessage, jockeyApi, type JockeyDto } from '../../lib/api';
import { Button, Card, Field, Input } from '../ui';

export default function JockeyProfileModal({
  jockey,
  onClose,
  onSaved,
  onError,
}: {
  jockey: JockeyDto;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const [licenseNo, setLicenseNo] = useState(jockey.licenseNo ?? '');
  const [experienceYears, setExperienceYears] = useState(
    jockey.experienceYears != null ? String(jockey.experienceYears) : '',
  );
  const [weightKg, setWeightKg] = useState(jockey.weightKg != null ? String(jockey.weightKg) : '');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await jockeyApi.updateJockeyProfile(jockey.id, {
        licenseNo: licenseNo.trim() || null,
        experienceYears: experienceYears.trim() === '' ? null : Number(experienceYears),
        weightKg: weightKg.trim() === '' ? null : Number(weightKg),
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
      <Card className="my-8 w-full max-w-sm">
        <div onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-semibold">Sửa hồ sơ Jockey</h3>
          <p className="mt-1 text-sm text-stone">{jockey.fullName}</p>

          <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
            <Field label="Số giấy phép (License No)" hint="Có thể để trống">
              <Input
                autoFocus
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
                placeholder="VD: JK-00123"
              />
            </Field>
            <Field label="Số năm kinh nghiệm" hint="Có thể để trống">
              <Input
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="VD: 5"
              />
            </Field>
            <Field label="Cân nặng (kg)" hint="Có thể để trống">
              <Input
                type="number"
                min={0}
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="VD: 52.5"
              />
            </Field>

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="neutral" onClick={onClose}>Hủy</Button>
              <Button type="submit" loading={saving}>Lưu</Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
