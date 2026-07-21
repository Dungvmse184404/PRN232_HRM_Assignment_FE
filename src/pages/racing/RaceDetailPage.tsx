import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { entriesApi, errorMessage, horsesApi, racesApi, type HorseDto, type RaceDto } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { Alert, Badge, Button, Card, Field, Spinner } from '../../components/ui';

const RACE_STATUS: Record<number, { label: string; tone: 'neutral' | 'green' | 'red' | 'flame' }> = {
  0: { label: 'Đã lên lịch', tone: 'neutral' },
  1: { label: 'Mở đăng ký', tone: 'green' },
  2: { label: 'Đóng đăng ký', tone: 'neutral' },
  3: { label: 'Đang diễn ra', tone: 'flame' },
  4: { label: 'Đã kết thúc', tone: 'neutral' },
  5: { label: 'Đã hủy', tone: 'red' },
};

export default function RaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const [race, setRace] = useState<RaceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Register horse form
  const [myHorses, setMyHorses] = useState<HorseDto[]>([]);
  const [selectedHorseId, setSelectedHorseId] = useState('');
  const [registering, setRegistering] = useState(false);
  const [regMsg, setRegMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  const isHorseOwner = user?.roles.includes('HorseOwner');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setRace(await racesApi.getById(id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function openRegisterForm() {
    setShowForm(true);
    setRegMsg(null);
    try {
      const result = await horsesApi.list({ pageSize: 50 });
      setMyHorses(result.items);
    } catch {
      setMyHorses([]);
    }
  }

  async function registerHorse() {
    if (!id || !selectedHorseId) return;
    setRegistering(true);
    setRegMsg(null);
    try {
      await entriesApi.register(id, selectedHorseId);
      setRegMsg({ kind: 'success', text: 'Đăng ký thành công!' });
      setSelectedHorseId('');
      setShowForm(false);
      await load();
    } catch (err) {
      setRegMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setRegistering(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!race) return <Alert kind="error">Không tìm thấy cuộc đua.</Alert>;

  const canRegister = race.status === 0 || race.status === 1;
  const notFull = race.entryCount < race.maxHorses;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to={`/tournaments/${race.tournamentId}`} className="text-sm text-flame hover:underline">
          &larr; {race.tournamentName}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{race.name}</h1>
            <p className="mt-1 text-stone">{race.trackName} · {race.distanceM}m</p>
          </div>
          <Badge tone={RACE_STATUS[race.status]?.tone ?? 'neutral'}>
            {RACE_STATUS[race.status]?.label ?? race.statusName}
          </Badge>
        </div>
        {isAdmin && (
          <div className="mt-4 flex gap-2">
            <Link to={`/admin/races/${race.id}/edit`}><Button variant="neutral">Sửa cuộc đua</Button></Link>
          </div>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ash">Thông tin</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Khoảng cách" value={`${race.distanceM}m`} />
            <Row label="Số ngựa tối đa" value={`${race.maxHorses}`} />
            <Row label="Đã đăng ký" value={
              <span className={race.entryCount >= race.maxHorses ? 'text-red-600 font-semibold' : ''}>
                {race.entryCount}/{race.maxHorses}
                {race.entryCount >= race.maxHorses && ' (đầy)'}
              </span>
            } />
            <Row label="Bắt đầu" value={new Date(race.scheduledStart).toLocaleString('vi-VN')} />
            {race.scheduledEnd && <Row label="Kết thúc" value={new Date(race.scheduledEnd).toLocaleString('vi-VN')} />}
            {race.registrationDeadline && (
              <Row label="Hạn đăng ký" value={new Date(race.registrationDeadline).toLocaleString('vi-VN')} />
            )}
          </dl>
        </Card>

        {race.rounds.length > 0 && (
          <Card className="p-5 md:col-span-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ash">Vòng đua ({race.rounds.length})</h3>
            <div className="mt-3 divide-y divide-parchment/40">
              {race.rounds.sort((a, b) => a.roundNumber - b.roundNumber).map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-ink">Vòng {r.roundNumber}</span>
                    {r.name && <span className="ml-2 text-stone">— {r.name}</span>}
                  </div>
                  <div className="text-xs text-ash">
                    {r.scheduledTime ? new Date(r.scheduledTime).toLocaleString('vi-VN') : 'Chưa có lịch'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Register Horse - Horse Owner only */}
      {isHorseOwner && (
        <Card>
          <h3 className="text-lg font-semibold">Đăng ký ngựa tham gia</h3>
          {regMsg && <div className="mt-3"><Alert kind={regMsg.kind}>{regMsg.text}</Alert></div>}

          {!canRegister && (
            <p className="mt-2 text-sm text-ash">Cuộc đua đã kết thúc đăng ký hoặc không mở đăng ký.</p>
          )}
          {canRegister && !notFull && (
            <p className="mt-2 text-sm text-red-600">Cuộc đua đã đầy, không thể đăng ký thêm.</p>
          )}

          {canRegister && notFull && !showForm && (
            <div className="mt-4">
              <Button onClick={openRegisterForm}>Đăng ký ngựa tham gia</Button>
            </div>
          )}

          {canRegister && notFull && showForm && (
            <div className="mt-4 flex flex-col gap-3">
              <Field label="Chọn ngựa của bạn">
                {myHorses.length === 0 ? (
                  <div className="rounded-[var(--radius-input)] border border-bone bg-cream/40 px-4 py-2.5 text-sm text-stone">
                    Bạn chưa có ngựa nào.{' '}
                    <Link to="/horses" className="text-flame hover:underline">Tạo ngựa mới</Link>
                  </div>
                ) : (
                  <select
                    value={selectedHorseId}
                    onChange={(e) => setSelectedHorseId(e.target.value)}
                    className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-flame focus:ring-2 focus:ring-flame/30 w-full"
                  >
                    <option value="">-- Chọn ngựa --</option>
                    {myHorses.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.breed || 'N/A'} · {h.genderName})
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <div className="flex gap-2">
                <Button loading={registering} disabled={!selectedHorseId} onClick={registerHorse}>Xác nhận đăng ký</Button>
                <Button variant="neutral" onClick={() => setShowForm(false)}>Hủy</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {!isHorseOwner && !loading && (
        <Card className="py-8 text-center text-sm text-stone">
          Bạn cần vai trò <strong>Horse Owner</strong> để đăng ký ngựa tham gia cuộc đua.
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ash">{label}</dt>
      <dd className="font-medium text-ink text-right">{value}</dd>
    </div>
  );
}
