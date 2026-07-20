import { useCallback, useEffect, useState } from 'react';
import {
  errorMessage,
  jockeyApi,
  type JockeyDto,
  type JockeyStatus,
  type PagedResult,
} from '../../lib/api';
import { Alert, Badge, Button, Card, Input, Spinner } from '../../components/ui';

const PAGE_SIZE = 15;

const STATUS_LABEL: Record<JockeyStatus, string> = {
  Active: 'Hoạt động',
  Suspended: 'Đình chỉ',
  Retired: 'Giải nghệ',
};

const STATUS_TONE: Record<JockeyStatus, 'neutral' | 'green' | 'red' | 'flame'> = {
  Active: 'green',
  Suspended: 'red',
  Retired: 'neutral',
};

const NEXT_STATUS: Record<JockeyStatus, { label: string; value: JockeyStatus }[]> = {
  Active: [
    { label: '⛔ Đình chỉ', value: 'Suspended' },
    { label: '🚪 Giải nghệ', value: 'Retired' },
  ],
  Suspended: [
    { label: '✅ Kích hoạt', value: 'Active' },
    { label: '🚪 Giải nghệ', value: 'Retired' },
  ],
  Retired: [
    { label: '✅ Kích hoạt', value: 'Active' },
  ],
};

export default function JockeysPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JockeyStatus | ''>('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PagedResult<JockeyDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await jockeyApi.getAllJockeys({
        search: search || undefined,
        status: statusFilter || undefined,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(jockey: JockeyDto, newStatus: JockeyStatus) {
    setUpdating(jockey.userId);
    setError(null);
    setActionMsg(null);
    try {
      await jockeyApi.updateJockeyStatus(jockey.userId, newStatus);
      setActionMsg(`Đã cập nhật trạng thái jockey "${jockey.fullName}" thành ${STATUS_LABEL[newStatus]}.`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Quản lý Jockey</h1>
        <p className="mt-1 text-stone">
          Xem toàn bộ jockey và cập nhật trạng thái hoạt động (FR-22).
        </p>
      </div>

      {/* Filters */}
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Tìm kiếm</span>
            <Input
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="Tên, email jockey…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(e) => { setPage(1); setStatusFilter(e.target.value as JockeyStatus | ''); }}
              className="rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-flame"
            >
              <option value="">Tất cả</option>
              {(Object.keys(STATUS_LABEL) as JockeyStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <Button variant="neutral" onClick={() => void load()}>🔄 Làm mới</Button>
        </div>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}
      {actionMsg && <Alert kind="success">{actionMsg}</Alert>}

      {/* Stats summary */}
      {data && (
        <div className="text-sm text-stone">
          Tổng cộng <strong className="text-ink">{data.totalCount}</strong> jockey
          {statusFilter ? ` có trạng thái "${STATUS_LABEL[statusFilter]}"` : ''}.
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-stone">
          <Spinner /><span className="ml-2">Đang tải…</span>
        </div>
      ) : data?.items.length === 0 ? (
        <Card className="py-16 text-center text-stone">
          Không tìm thấy jockey nào.
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-parchment/60 bg-cream">
                <tr>
                  <th className="px-5 py-3.5 text-left font-semibold text-ash">Jockey</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-ash">Email</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-ash">Điện thoại</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-ash">Số cuộc đua</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-ash">Trạng thái</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-ash">Ngày tham gia</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-ash">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((j) => (
                  <tr key={j.userId} className="border-b border-parchment/40 transition hover:bg-cream/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-marigold text-base font-bold text-ink">
                          {j.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-ink">{j.fullName}</p>
                          <p className="text-xs text-ash font-mono">{j.userId.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-stone">{j.email}</td>
                    <td className="px-5 py-4 text-stone">{j.phone ?? '—'}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-cream px-3 py-0.5 text-xs font-medium text-stone border border-bone">
                        🏇 {j.totalRaces} cuộc đua
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={STATUS_TONE[j.statusName]}>{STATUS_LABEL[j.statusName]}</Badge>
                    </td>
                    <td className="px-5 py-4 text-stone whitespace-nowrap">
                      {new Date(j.createdAtUtc).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {NEXT_STATUS[j.statusName].map((action) => (
                          <Button
                            key={action.value}
                            variant="neutral"
                            loading={updating === j.userId}
                            onClick={() => {
                              if (confirm(`Đổi trạng thái "${j.fullName}" thành "${STATUS_LABEL[action.value]}"?`)) {
                                void changeStatus(j, action.value);
                              }
                            }}
                          >
                            {action.label}
                          </Button>
                        ))}
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
          <span>Tổng {data.totalCount} jockey · Trang {data.pageNumber}/{data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="neutral" disabled={!data.hasPrevious} onClick={() => setPage((p) => p - 1)}>Trước</Button>
            <Button variant="neutral" disabled={!data.hasNext} onClick={() => setPage((p) => p + 1)}>Sau</Button>
          </div>
        </div>
      )}
    </div>
  );
}
