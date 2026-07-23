import { useCallback, useEffect, useState } from 'react';
import { errorMessage, jockeyApi, type JockeyDto } from '../../lib/api';
import { Alert, Button, Card, Field, Input, Spinner } from '../../components/ui';
import { IdCardIcon } from '../../components/icons';

export default function MyProfilePage() {
  const [profile, setProfile] = useState<JockeyDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [licenseNo, setLicenseNo] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [weightKg, setWeightKg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await jockeyApi.getMyProfile();
      setProfile(data);
      setLicenseNo(data.licenseNo ?? '');
      setExperienceYears(data.experienceYears != null ? String(data.experienceYears) : '');
      setWeightKg(data.weightKg != null ? String(data.weightKg) : '');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await jockeyApi.updateMyProfile({
        licenseNo: licenseNo.trim() || null,
        experienceYears: experienceYears.trim() === '' ? null : Number(experienceYears),
        weightKg: weightKg.trim() === '' ? null : Number(weightKg),
      });
      setSuccessMsg('Đã lưu thông tin hồ sơ.');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Hồ sơ của tôi</h1>
        <p className="mt-1 text-stone">
          Điền hoặc cập nhật thông tin chi tiết jockey: số giấy phép, số năm kinh nghiệm, cân nặng.
          Bạn có thể để trống và bổ sung sau.
        </p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {successMsg && <Alert kind="success">{successMsg}</Alert>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-stone">
          <Spinner /><span className="ml-2">Đang tải…</span>
        </div>
      ) : (
        <Card className="flex flex-col gap-5 p-6">
          <div className="flex items-center gap-3 border-b border-parchment/60 pb-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-marigold text-ink">
              <IdCardIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-ink">{profile?.fullName}</p>
              <p className="text-xs text-ash">
                {profile?.totalRaces ?? 0} cuộc đua · {profile?.totalWins ?? 0} chiến thắng
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Số giấy phép (License No)" hint="Có thể để trống">
              <Input
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
          </div>

          <div className="flex justify-end">
            <Button loading={saving} onClick={() => void handleSave()}>
              Lưu thông tin
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
