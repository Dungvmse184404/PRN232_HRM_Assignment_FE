import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage, tournamentsApi, type PagedResult, type TournamentDto } from '../../lib/api';
import { Alert, Badge, Button, Card, Spinner } from '../../components/ui';

const STATUS: Record<number, { label: string; tone: 'neutral' | 'green' | 'red' | 'flame' }> = {
  0: { label: 'Bản nháp', tone: 'neutral' },
  1: { label: 'Đã công bố', tone: 'green' },
  2: { label: 'Đang diễn ra', tone: 'flame' },
  3: { label: 'Đã kết thúc', tone: 'neutral' },
  4: { label: 'Đã hủy', tone: 'red' },
};

// Trạng thái hợp lệ để chuyển từ trạng thái hiện tại (khớp state machine BE)
const VALID_TRANSITIONS: Record<number, { value: number; label: string }[]> = {
  0: [{ value: 1, label: 'Công bố' }, { value: 4, label: 'Hủy' }],
  1: [{ value: 2, label: 'Bắt đầu' }, { value: 4, label: 'Hủy' }],
  2: [{ value: 3, label: 'Kết thúc' }],
};

const PAGE_SIZE = 12;

export default function AdminTournamentsListPage() {
  const [data, setData] = useState<PagedResult<TournamentDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await tournamentsApi.list({
        search: search.trim() || undefined,
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
  }, [search, statusFilter, page]);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(t: TournamentDto, newStatus: number) {
    const target = VALID_TRANSITIONS[t.status]?.find(x => x.value === newStatus)?.label ?? '';
    if (!window.confirm(`Đổi trạng thái "${t.name}" sang "${target}"?`)) return;
    setActingId(t.id);
    setError(null);
    try {
      await tournamentsApi.updateStatus(t.id, newStatus);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setActingId(null);
    }
  }

  async function remove(t: TournamentDto) {
    if (!window.confirm(`XÓA giải "${t.name}"? Chỉ được xóa khi đang ở trạng thái Bản nháp và chưa có cuộc đua.`)) return;
    setActingId(t.id);
    setError(null);
    try {
      await tournamentsApi.delete(t.id);
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
          <h1 className="text-3xl font-semibold tracking-tight">Quản lý giải đấu</h1>
          <p className="mt-1 text-stone">Tạo, sửa, đổi trạng thái và xóa giải đấu (FR-09).</p>
        </div>
        <Link to="/admin/tournaments/new"><Button>+ Tạo giải đấu</Button></Link>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-ash">Tìm kiếm</label>
            <input
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="Tên giải đấu..."
              className="w-full rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2 text-sm outline-none focus:border-flame"
            />
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
        <Card className="py-12 text-center text-stone">Chưa có giải đấu nào.</Card>
      )}

      {!loading && data && data.items.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-parchment/60 bg-cream/60 text-xs uppercase tracking-wide text-ash">
                <tr>
                  <Th>Tên giải</Th>
                  <Th>Thời gian</Th>
                  <Th>Địa điểm</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">Hành động</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((t) => (
                  <tr key={t.id} className="border-b border-parchment/40 last:border-0 hover:bg-cream/40">
                    <td className="px-5 py-3">
                      <Link to={`/tournaments/${t.id}`} className="font-medium text-ink hover:text-flame">
                        {t.name}
                      </Link>
                      {t.totalPrizePool != null && t.totalPrizePool > 0 && (
                        <div className="text-xs text-flame">{t.totalPrizePool.toLocaleString('vi-VN')} ₫</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-stone">
                      {new Date(t.startDate).toLocaleDateString('vi-VN')} — {new Date(t.endDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-3 text-xs text-stone">{t.location || '—'}</td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS[t.status]?.tone ?? 'neutral'}>
                        {STATUS[t.status]?.label ?? t.statusName}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Link to={`/admin/tournaments/${t.id}/edit`}>
                          <Button variant="neutral">Sửa</Button>
                        </Link>
                        {VALID_TRANSITIONS[t.status]?.length > 0 && (
                          <select
                            disabled={actingId === t.id}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v) { changeStatus(t, Number(v)); e.target.value = ''; }
                            }}
                            className="rounded-[var(--radius-input)] border border-bone bg-paper px-2 py-1.5 text-xs outline-none focus:border-flame"
                            defaultValue=""
                          >
                            <option value="" disabled>Đổi trạng thái</option>
                            {VALID_TRANSITIONS[t.status].map(tr => (
                              <option key={tr.value} value={tr.value}>{tr.label}</option>
                            ))}
                          </select>
                        )}
                        {t.status === 0 && (
                          <Button variant="danger" loading={actingId === t.id} onClick={() => remove(t)}>Xóa</Button>
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
