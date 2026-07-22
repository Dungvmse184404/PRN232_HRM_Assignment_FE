import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage, racesApi, tournamentsApi, type PagedResult, type RaceDto, type TournamentDto } from '../../lib/api';
import { Alert, Badge, Button, Card, Spinner } from '../../components/ui';

const STATUS: Record<number, { label: string; tone: 'neutral' | 'green' | 'red' | 'flame' }> = {
  0: { label: 'Đã lên lịch', tone: 'neutral' },
  1: { label: 'Mở đăng ký', tone: 'green' },
  2: { label: 'Đóng đăng ký', tone: 'neutral' },
  3: { label: 'Đang diễn ra', tone: 'flame' },
  4: { label: 'Đã kết thúc', tone: 'neutral' },
  5: { label: 'Đã hủy', tone: 'red' },
};

const VALID_TRANSITIONS: Record<number, { value: number; label: string }[]> = {
  0: [{ value: 1, label: 'Mở đăng ký' }, { value: 5, label: 'Hủy' }],
  1: [{ value: 2, label: 'Đóng đăng ký' }, { value: 5, label: 'Hủy' }],
  2: [{ value: 3, label: 'Bắt đầu' }],
  3: [{ value: 4, label: 'Kết thúc' }],
};

const PAGE_SIZE = 12;

export default function AdminRacesListPage() {
  const [data, setData] = useState<PagedResult<RaceDto> | null>(null);
  const [tournaments, setTournaments] = useState<TournamentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tournamentId, setTournamentId] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await racesApi.list({
        search: search.trim() || undefined,
        tournamentId,
        status: statusFilter,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      });
      setData(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, tournamentId, statusFilter, page]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    tournamentsApi.list({ pageSize: 200 }).then(r => setTournaments(r.items)).catch(() => {});
  }, []);

  async function changeStatus(r: RaceDto, newStatus: number) {
    const target = VALID_TRANSITIONS[r.status]?.find(x => x.value === newStatus)?.label ?? '';
    if (!window.confirm(`Đổi trạng thái "${r.name}" sang "${target}"?`)) return;
    setActingId(r.id);
    setError(null);
    try {
      await racesApi.updateStatus(r.id, newStatus);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setActingId(null);
    }
  }

  async function remove(r: RaceDto) {
    if (!window.confirm(`XÓA cuộc đua "${r.name}"? Chỉ xóa được khi đang ở trạng thái "Đã lên lịch" và chưa có đăng ký.`)) return;
    setActingId(r.id);
    setError(null);
    try {
      await racesApi.delete(r.id);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Quản lý cuộc đua</h1>
          <p className="mt-1 text-stone">Tạo, sửa, đổi trạng thái, đồng bộ vòng đua và xóa cuộc đua (FR-10).</p>
        </div>
        <Link
          to={tournamentId ? `/admin/races/new?tournamentId=${tournamentId}` : '/admin/races/new'}
        >
          <Button>+ Tạo cuộc đua</Button>
        </Link>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-ash">Tìm kiếm</label>
            <input
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="Tên cuộc đua..."
              className="w-full rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2 text-sm outline-none focus:border-flame"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ash">Giải đấu</label>
            <select
              value={tournamentId ?? ''}
              onChange={(e) => { setPage(1); setTournamentId(e.target.value || undefined); }}
              className="rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2 text-sm outline-none focus:border-flame"
            >
              <option value="">Tất cả</option>
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ash">Trạng thái</label>
            <select
              value={statusFilter ?? ''}
              onChange={(e) => { setPage(1); setStatusFilter(e.target.value === '' ? undefined : Number(e.target.value)); }}
              className="rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2 text-sm outline-none focus:border-flame"
            >
              <option value="">Tất cả</option>
              {Object.entries(STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}
      {loading && <div className="flex justify-center py-16"><Spinner /></div>}

      {!loading && data && data.items.length === 0 && (
        <Card className="py-12 text-center text-stone">Chưa có cuộc đua nào.</Card>
      )}

      {!loading && data && data.items.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-parchment/60 bg-cream/60 text-xs uppercase tracking-wide text-ash">
                <tr>
                  <Th>Cuộc đua</Th>
                  <Th>Giải</Th>
                  <Th>Đường đua</Th>
                  <Th>Thời gian</Th>
                  <Th>Ngựa</Th>
                  <Th>Vòng</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">Hành động</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} className="border-b border-parchment/40 last:border-0 hover:bg-cream/40">
                    <td className="px-5 py-3">
                      <Link to={`/races/${r.id}`} className="font-medium text-ink hover:text-flame">
                        {r.name}
                      </Link>
                      <div className="text-xs text-ash">{r.distanceM}m · tối đa {r.maxHorses} ngựa</div>
                    </td>
                    <td className="px-5 py-3 text-xs text-stone">{r.tournamentName || '—'}</td>
                    <td className="px-5 py-3 text-xs text-stone">{r.trackName || '—'}</td>
                    <td className="px-5 py-3 text-xs text-stone">
                      {new Date(r.scheduledStart).toLocaleString('vi-VN')}
                      {r.scheduledEnd && <div>→ {new Date(r.scheduledEnd).toLocaleString('vi-VN')}</div>}
                    </td>
                    <td className="px-5 py-3 text-xs text-stone">
                      <span className={r.entryCount >= r.maxHorses ? 'font-semibold text-red-600' : ''}>
                        {r.entryCount}/{r.maxHorses}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-stone">{r.rounds.length}</td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS[r.status]?.tone ?? 'neutral'}>
                        {STATUS[r.status]?.label ?? r.statusName}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Link to={`/admin/races/${r.id}/edit`}>
                          <Button variant="neutral">Sửa</Button>
                        </Link>
                        {VALID_TRANSITIONS[r.status]?.length > 0 && (
                          <select
                            disabled={actingId === r.id}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v) { changeStatus(r, Number(v)); e.target.value = ''; }
                            }}
                            className="rounded-[var(--radius-input)] border border-bone bg-paper px-2 py-1.5 text-xs outline-none focus:border-flame"
                            defaultValue=""
                          >
                            <option value="" disabled>Đổi trạng thái</option>
                            {VALID_TRANSITIONS[r.status].map(tr => (
                              <option key={tr.value} value={tr.value}>{tr.label}</option>
                            ))}
                          </select>
                        )}
                        {r.status === 0 && r.entryCount === 0 && (
                          <Button variant="danger" loading={actingId === r.id} onClick={() => remove(r)}>Xóa</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.totalCount > 0 && (
            <div className="flex items-center justify-between border-t border-parchment/60 px-5 py-3 text-sm text-stone">
              <span>Tổng {data.totalCount} · Trang {data.pageNumber}/{data.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="neutral" disabled={!data.hasPrevious} onClick={() => setPage(p => p - 1)}>Trước</Button>
                <Button variant="neutral" disabled={!data.hasNext} onClick={() => setPage(p => p + 1)}>Sau</Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-5 py-3 font-semibold ${className}`}>{children}</th>;
}
