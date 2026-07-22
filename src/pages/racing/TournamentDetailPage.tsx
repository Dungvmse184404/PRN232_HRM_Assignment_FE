import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { errorMessage, racesApi, tournamentsApi, type RaceDto, type TournamentDto } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { Alert, Badge, Button, Card, Spinner } from '../../components/ui';

const STATUS_MAP: Record<number, { label: string; tone: 'neutral' | 'green' | 'red' | 'flame' }> = {
  0: { label: 'Bản nháp', tone: 'neutral' },
  1: { label: 'Đã công bố', tone: 'green' },
  2: { label: 'Đang diễn ra', tone: 'flame' },
  3: { label: 'Đã kết thúc', tone: 'neutral' },
  4: { label: 'Đã hủy', tone: 'red' },
};

// Trạng thái có thể chuyển đến từ trạng thái hiện tại
const VALID_TRANSITIONS: Record<number, { value: number; label: string }[]> = {
  0: [{ value: 1, label: 'Đã công bố' }, { value: 4, label: 'Đã hủy' }],
  1: [{ value: 2, label: 'Đang diễn ra' }, { value: 4, label: 'Đã hủy' }],
  2: [{ value: 3, label: 'Đã kết thúc' }],
};

const RACE_STATUS: Record<number, { label: string; tone: 'neutral' | 'green' | 'red' | 'flame' }> = {
  0: { label: 'Đã lên lịch', tone: 'neutral' },
  1: { label: 'Mở đăng ký', tone: 'green' },
  2: { label: 'Đóng đăng ký', tone: 'neutral' },
  3: { label: 'Đang diễn ra', tone: 'flame' },
  4: { label: 'Đã kết thúc', tone: 'neutral' },
  5: { label: 'Đã hủy', tone: 'red' },
};

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [tournament, setTournament] = useState<TournamentDto | null>(null);
  const [races, setRaces] = useState<RaceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<number | ''>('');
  const [changingStatus, setChangingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [t, r] = await Promise.all([
        tournamentsApi.getById(id),
        racesApi.list({ tournamentId: id, pageSize: 50 }),
      ]);
      setTournament(t);
      setRaces(r.items);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus() {
    if (!tournament || newStatus === '') return;
    const targetLabel = VALID_TRANSITIONS[tournament.status]?.find(t => t.value === newStatus)?.label ?? '';
    if (!window.confirm(`Bạn có chắc muốn đổi trạng thái thành "${targetLabel}"?`)) return;
    setChangingStatus(true);
    setError(null);
    try {
      await tournamentsApi.updateStatus(tournament.id, newStatus);
      await load();
      setNewStatus('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setChangingStatus(false);
    }
  }

  async function deleteTournament() {
    if (!tournament) return;
    if (!window.confirm(`Bạn có chắc muốn XÓA giải đấu "${tournament.name}"? Hành động này không thể hoàn tác.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await tournamentsApi.delete(tournament.id);
      navigate('/tournaments', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(false);
    }
  }

  // FR-09: chỉ Admin mới thấy nút Xóa, và chỉ khi giải đang Draft + chưa có race.
  const canDelete = isAdmin && tournament?.status === 0 && races.length === 0;

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!tournament) return <Alert kind="error">Không tìm thấy giải đấu.</Alert>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/tournaments" className="text-sm text-flame hover:underline">&larr; Tất cả giải đấu</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{tournament.name}</h1>
            {tournament.description && <p className="mt-2 text-stone">{tournament.description}</p>}
          </div>
          <Badge tone={STATUS_MAP[tournament.status]?.tone ?? 'neutral'}>
            {STATUS_MAP[tournament.status]?.label ?? tournament.statusName}
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-stone">
          {tournament.location && <span>{tournament.location}</span>}
          <span>{new Date(tournament.startDate).toLocaleDateString('vi-VN')} — {new Date(tournament.endDate).toLocaleDateString('vi-VN')}</span>
          {tournament.totalPrizePool != null && tournament.totalPrizePool > 0 && (
            <span className="font-semibold text-flame">{tournament.totalPrizePool.toLocaleString('vi-VN')} VND</span>
          )}
        </div>
        {isAdmin && (
          <div className="mt-4 flex flex-wrap gap-2 items-end">
            <Link to={`/admin/tournaments/${tournament.id}/edit`}><Button variant="neutral">Sửa giải đấu</Button></Link>
            <Link to={`/admin/races/new?tournamentId=${tournament.id}`}><Button>Tạo cuộc đua mới</Button></Link>
            {canDelete && (
              <Button variant="danger" loading={deleting} onClick={deleteTournament}>Xóa giải đấu</Button>
            )}
            {VALID_TRANSITIONS[tournament.status]?.length > 0 && (
              <div className="flex items-end gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-ash">Đổi trạng thái</span>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value === '' ? '' : Number(e.target.value))}
                    className="rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2 text-sm outline-none focus:border-flame"
                  >
                    <option value="">-- Chọn --</option>
                    {VALID_TRANSITIONS[tournament.status].map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <Button loading={changingStatus} disabled={newStatus === ''} onClick={changeStatus}>Đổi</Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold">Danh sách cuộc đua ({races.length})</h2>
        {races.length === 0 ? (
          <Card className="mt-4 py-12 text-center text-stone">Chưa có cuộc đua nào trong giải này.</Card>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {races.map((r) => (
              <Link key={r.id} to={`/races/${r.id}`} className="group">
                <Card className="h-full p-5 transition hover:shadow-[var(--shadow-glow)]">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-ink group-hover:text-flame transition-colors">{r.name}</h3>
                    <Badge tone={RACE_STATUS[r.status]?.tone ?? 'neutral'}>{RACE_STATUS[r.status]?.label ?? r.statusName}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone">
                    <span>{r.trackName}</span>
                    <span>{r.distanceM}m</span>
                    <span>{r.entryCount}/{r.maxHorses} ngựa</span>
                  </div>
                  <div className="mt-1 text-xs text-ash">
                    {new Date(r.scheduledStart).toLocaleString('vi-VN')}
                    {r.scheduledEnd && ` — ${new Date(r.scheduledEnd).toLocaleString('vi-VN')}`}
                  </div>
                  {r.rounds.length > 0 && (
                    <div className="mt-2 text-xs text-stone">
                      {r.rounds.length} vòng đua
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
