import { useCallback, useEffect, useState } from 'react';
import {
  errorMessage,
  horsesApi,
  jockeyApi,
  racingApi,
  type HorseDto,
  type RaceDto,
  type PagedResult,
} from '../../lib/api';
import { Alert, Badge, Button, Card, Field, Input, Spinner } from '../../components/ui';

export default function SendInvitationPage() {
  const [races, setRaces] = useState<RaceDto[]>([]);
  const [horses, setHorses] = useState<HorseDto[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [raceId, setRaceId] = useState('');
  const [horseId, setHorseId] = useState('');
  const [jockeyId, setJockeyId] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInit = useCallback(async () => {
    setLoadingInit(true);
    try {
      const [raceData, horseData]: [PagedResult<RaceDto>, PagedResult<HorseDto>] = await Promise.all([
        racingApi.listRaces({ pageSize: 100 }),
        horsesApi.list({ pageSize: 100, status: 'Active' }),
      ]);
      setRaces(raceData.items);
      setHorses(horseData.items);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingInit(false);
    }
  }, []);

  useEffect(() => { void loadInit(); }, [loadInit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!raceId || !horseId || !jockeyId.trim()) {
      setError('Vui lòng chọn cuộc đua, ngựa và nhập ID jockey.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await jockeyApi.sendInvitation({
        raceId,
        horseId,
        jockeyId: jockeyId.trim(),
        message: message.trim() || null,
      });
      setSuccess('Đã gửi lời mời tới jockey thành công!');
      setJockeyId('');
      setMessage('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedRace = races.find((r) => r.id === raceId);
  const selectedHorse = horses.find((h) => h.id === horseId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Gửi lời mời Jockey</h1>
        <p className="mt-1 text-stone">
          Thuê / chọn jockey điều khiển ngựa của bạn trong một cuộc đua (FR-16).
        </p>
      </div>

      {loadingInit ? (
        <div className="flex items-center justify-center py-20 text-stone">
          <Spinner />
          <span className="ml-2">Đang tải dữ liệu…</span>
        </div>
      ) : (
        <Card className="p-8">
          <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-col gap-5">
            {/* Race */}
            <Field label="Cuộc đua *">
              <select
                value={raceId}
                onChange={(e) => setRaceId(e.target.value)}
                className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-flame focus:ring-2 focus:ring-flame/30"
                required
              >
                <option value="">— Chọn cuộc đua —</option>
                {races.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.tournamentName} · {new Date(r.scheduledStart).toLocaleDateString('vi-VN')}
                  </option>
                ))}
              </select>
            </Field>

            {selectedRace && (
              <div className="rounded-xl border border-marigold/60 bg-marigold/10 p-4 text-sm">
                <p className="font-medium text-ink">{selectedRace.name}</p>
                <p className="mt-0.5 text-stone">
                  📍 {selectedRace.trackName} &nbsp;·&nbsp;
                  📏 {selectedRace.distanceM} m &nbsp;·&nbsp;
                  🐎 Tối đa {selectedRace.maxHorses} ngựa
                </p>
                <p className="mt-0.5 text-stone">
                  🕐 {new Date(selectedRace.scheduledStart).toLocaleString('vi-VN')}
                </p>
              </div>
            )}

            {/* Horse */}
            <Field label="Ngựa tham dự *">
              <select
                value={horseId}
                onChange={(e) => setHorseId(e.target.value)}
                className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-flame focus:ring-2 focus:ring-flame/30"
                required
              >
                <option value="">— Chọn ngựa —</option>
                {horses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.genderName}{h.breed ? ` · ${h.breed}` : ''})
                  </option>
                ))}
              </select>
            </Field>

            {selectedHorse && (
              <div className="flex items-center gap-3 rounded-xl border border-parchment/60 bg-cream p-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-marigold text-lg">🐴</span>
                <div>
                  <p className="font-medium text-ink">{selectedHorse.name}</p>
                  <p className="text-xs text-ash">
                    {selectedHorse.color ?? 'Chưa rõ màu'} ·{' '}
                    {selectedHorse.weightKg != null ? `${selectedHorse.weightKg} kg` : ''}
                  </p>
                </div>
                <Badge tone="green">Hoạt động</Badge>
              </div>
            )}

            {/* Jockey ID */}
            <Field label="ID Jockey *" hint="Nhập UserId của jockey cần mời (lấy từ Admin > Quản lý tài khoản)">
              <Input
                value={jockeyId}
                onChange={(e) => setJockeyId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                required
              />
            </Field>

            {/* Message */}
            <Field label="Lời nhắn (tuỳ chọn)">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Gửi lời nhắn đến jockey..."
                className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm text-ink outline-none placeholder:text-driftwood focus:border-flame focus:ring-2 focus:ring-flame/30 resize-none"
              />
            </Field>

            {error && <Alert kind="error">{error}</Alert>}
            {success && <Alert kind="success">{success}</Alert>}

            <div className="flex justify-end">
              <Button type="submit" loading={submitting}>
                📨 Gửi lời mời
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
