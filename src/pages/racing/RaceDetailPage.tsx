import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { entriesApi, errorMessage, racesApi, type RaceDto } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { Alert, Badge, Button, Card, Field, Input, Spinner } from '../../components/ui';

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
  const [horseId, setHorseId] = useState('');
  const [registering, setRegistering] = useState(false);
  const [regMsg, setRegMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

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

  async function registerHorse() {
    if (!id || !horseId.trim()) return;
    setRegistering(true);
    setRegMsg(null);
    try {
      await entriesApi.register(id, horseId.trim());
      setRegMsg({ kind: 'success', text: 'Đăng ký thành công!' });
      setHorseId('');
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to={`/tournaments/${race.tournamentId}`} className="text-sm text-flame hover:underline">
          &larr; Giải đấu
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{race.name}</h1>
            <p className="mt-1 text-stone">{race.tournamentName} · {race.trackName}</p>
          </div>
          <Badge tone={RACE_STATUS[race.status]?.tone ?? 'neutral'}>
            {RACE_STATUS[race.status]?.label ?? race.statusName}
          </Badge>
        </div>
        {isAdmin && (
          <div className="mt-4">
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
            <Row label="Đã đăng ký" value={`${race.entryCount}`} />
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

      {isHorseOwner && (
        <Card>
          <h3 className="text-lg font-semibold">Đăng ký ngựa tham gia</h3>
          <p className="mt-1 text-sm text-stone">Nhập ID ngựa của bạn để đăng ký tham gia cuộc đua này.</p>
          {regMsg && <div className="mt-3"><Alert kind={regMsg.kind}>{regMsg.text}</Alert></div>}
          <div className="mt-4 flex items-end gap-3">
            <Field label="ID Ngựa (Horse ID)">
              <Input
                value={horseId}
                onChange={(e) => setHorseId(e.target.value)}
                placeholder="Nhập GUID của ngựa..."
                className="w-80"
              />
            </Field>
            <Button loading={registering} onClick={registerHorse}>Đăng ký</Button>
          </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ash">{label}</dt>
      <dd className="font-medium text-ink text-right">{value}</dd>
    </div>
  );
}
