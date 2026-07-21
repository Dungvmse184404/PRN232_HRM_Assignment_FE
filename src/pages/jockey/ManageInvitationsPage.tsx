import { useCallback, useEffect, useState } from 'react';
import {
  errorMessage,
  horsesApi,
  jockeyApi,
  type HorseDto,
  type InvitationDto,
  type InvitationStatus,
  type PagedResult,
} from '../../lib/api';
import { Alert, Badge, Button, Card, Spinner } from '../../components/ui';

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<InvitationStatus, string> = {
  Pending: 'Chờ phản hồi',
  Accepted: 'Đã chấp nhận',
  Declined: 'Từ chối',
  Cancelled: 'Đã hủy',
  Confirmed: 'Đã xác nhận',
};

const STATUS_TONE: Record<InvitationStatus, 'neutral' | 'green' | 'red' | 'flame'> = {
  Pending: 'flame',
  Accepted: 'green',
  Declined: 'red',
  Cancelled: 'neutral',
  Confirmed: 'green',
};

export default function ManageInvitationsPage() {
  const [horses, setHorses] = useState<HorseDto[]>([]);
  const [selectedHorse, setSelectedHorse] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | ''>('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PagedResult<InvitationDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Load horse list for filter
  useEffect(() => {
    horsesApi.list({ pageSize: 100, status: 'Active' })
      .then((r) => setHorses(r.items))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await jockeyApi.getHorseInvitations({
        horseId: selectedHorse || undefined,
        status: statusFilter || undefined,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [selectedHorse, statusFilter, page]);

  useEffect(() => { void load(); }, [load]);

  async function act(fn: () => Promise<unknown>, msg: string) {
    setError(null);
    setActionMsg(null);
    try {
      await fn();
      setActionMsg(msg);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Quản lý lời mời Jockey</h1>
          <p className="mt-1 text-stone">
            Xem, hủy lời mời (FR-17) và xác nhận jockey tham gia cuộc đua (FR-20).
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Lọc theo ngựa</span>
            <select
              value={selectedHorse}
              onChange={(e) => { setPage(1); setSelectedHorse(e.target.value); }}
              className="rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-flame"
            >
              <option value="">Tất cả ngựa</option>
              {horses.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Trạng thái lời mời</span>
            <select
              value={statusFilter}
              onChange={(e) => { setPage(1); setStatusFilter(e.target.value as InvitationStatus | ''); }}
              className="rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-flame"
            >
              <option value="">Tất cả</option>
              {(Object.keys(STATUS_LABEL) as InvitationStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <Button variant="neutral" onClick={() => void load()}>🔄 Làm mới</Button>
        </div>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}
      {actionMsg && <Alert kind="success">{actionMsg}</Alert>}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-stone">
          <Spinner /><span className="ml-2">Đang tải…</span>
        </div>
      ) : data?.items.length === 0 ? (
        <Card className="py-16 text-center text-stone">
          Chưa có lời mời nào.
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-parchment/60 bg-cream">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-ash">Cuộc đua</th>
                  <th className="px-5 py-3 text-left font-semibold text-ash">Ngựa</th>
                  <th className="px-5 py-3 text-left font-semibold text-ash">Jockey</th>
                  <th className="px-5 py-3 text-left font-semibold text-ash">Lời nhắn</th>
                  <th className="px-5 py-3 text-left font-semibold text-ash">Trạng thái</th>
                  <th className="px-5 py-3 text-left font-semibold text-ash">Ngày gửi</th>
                  <th className="px-5 py-3 text-left font-semibold text-ash">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((inv) => (
                  <tr key={inv.id} className="border-b border-parchment/40 transition hover:bg-cream/50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ink">{inv.raceName}</p>
                    </td>
                    <td className="px-5 py-3.5 text-stone">{inv.horseName ?? '—'}</td>
                    <td className="px-5 py-3.5 text-stone">{inv.jockeyName ?? inv.jockeyId.slice(0, 8) + '…'}</td>
                    <td className="max-w-[180px] px-5 py-3.5 text-stone">
                      <p className="truncate">{inv.message || '—'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={STATUS_TONE[inv.statusName]}>
                        {STATUS_LABEL[inv.statusName]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-stone whitespace-nowrap">
                      {new Date(inv.sentAtUtc).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {/* FR-17: Hủy lời mời khi còn Pending */}
                        {inv.statusName === 'Pending' && (
                          <Button
                            variant="danger"
                            onClick={() => {
                              if (confirm('Hủy lời mời này?')) {
                                void act(() => jockeyApi.cancelInvitation(inv.id), 'Đã hủy lời mời.');
                              }
                            }}
                          >
                            Hủy
                          </Button>
                        )}
                        {/* FR-20: Xác nhận jockey khi đã Accepted */}
                        {inv.statusName === 'Accepted' && (
                          <Button
                            onClick={() => {
                              if (confirm(`Xác nhận jockey tham gia cuộc đua "${inv.raceName}"?`)) {
                                void act(() => jockeyApi.confirmJockey(inv.id), 'Đã xác nhận jockey tham gia cuộc đua.');
                              }
                            }}
                          >
                            ✅ Xác nhận
                          </Button>
                        )}
                        {(inv.statusName === 'Declined' || inv.statusName === 'Cancelled' || inv.statusName === 'Confirmed') && (
                          <span className="text-xs text-ash italic">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {data && data.totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-stone">
          <span>Tổng {data.totalCount} lời mời · Trang {data.pageNumber}/{data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="neutral" disabled={!data.hasPrevious} onClick={() => setPage((p) => p - 1)}>
              Trước
            </Button>
            <Button variant="neutral" disabled={!data.hasNext} onClick={() => setPage((p) => p + 1)}>
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
