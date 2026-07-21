import { useCallback, useEffect, useState } from 'react';
import { entriesApi, errorMessage, type PagedResult, type RaceEntryDto } from '../../lib/api';
import { Alert, Badge, Button, Card, Spinner } from '../../components/ui';

const ENTRY_STATUS: Record<number, { label: string; tone: 'neutral' | 'green' | 'red' | 'flame' }> = {
  0: { label: 'Chờ duyệt', tone: 'flame' },
  1: { label: 'Chờ duyệt', tone: 'flame' },
  2: { label: 'Đã duyệt', tone: 'green' },
  3: { label: 'Đã xác nhận', tone: 'green' },
  4: { label: 'Từ chối', tone: 'red' },
  5: { label: 'Đã rút', tone: 'neutral' },
};

const PAGE_SIZE = 20;

export default function AdminEntriesPage() {
  const [data, setData] = useState<PagedResult<RaceEntryDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<number>(0); // Default = Registered (pending)
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await entriesApi.list({
        status: statusFilter >= 0 ? statusFilter : undefined,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      });
      setData(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { void load(); }, [load]);

  async function approve(id: string) {
    setActing(id);
    setError(null);
    try {
      await entriesApi.approve(id);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Duyệt đăng ký tham gia</h1>
        <p className="mt-1 text-stone">Xem và duyệt các yêu cầu đăng ký ngựa tham gia cuộc đua.</p>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-ink">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => { setPage(1); setStatusFilter(Number(e.target.value)); }}
            className="rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2 text-sm outline-none focus:border-flame"
          >
            <option value={0}>Chờ duyệt (Registered)</option>
            <option value={2}>Đã duyệt (Approved)</option>
            <option value={3}>Đã xác nhận (Confirmed)</option>
            <option value={-1}>Tất cả</option>
          </select>
        </div>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}

      {loading && <div className="flex justify-center py-16"><Spinner /></div>}

      {!loading && data && data.items.length === 0 && (
        <Card className="py-12 text-center text-stone">Không có đăng ký nào.</Card>
      )}

      {!loading && data && data.items.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-parchment/60 bg-cream/60 text-xs uppercase tracking-wide text-ash">
                <tr>
                  <Th>Cuộc đua</Th>
                  <Th>Ngựa ID</Th>
                  <Th>Chủ sở hữu</Th>
                  <Th>Đăng ký lúc</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">Hành động</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.id} className="border-b border-parchment/40 last:border-0 hover:bg-cream/40">
                    <td className="px-5 py-3">
                      <div className="font-medium text-ink">{e.raceName}</div>
                      <div className="text-xs text-ash font-mono">{e.raceId.slice(0, 8)}...</div>
                    </td>
                    <td className="px-5 py-3 text-xs text-stone font-mono">{e.horseId.slice(0, 8)}...</td>
                    <td className="px-5 py-3 text-xs text-stone font-mono">{e.ownerUserId.slice(0, 8)}...</td>
                    <td className="px-5 py-3 text-xs text-stone">{new Date(e.registeredAtUtc).toLocaleString('vi-VN')}</td>
                    <td className="px-5 py-3">
                      <Badge tone={ENTRY_STATUS[e.status]?.tone ?? 'neutral'}>{ENTRY_STATUS[e.status]?.label ?? e.statusName}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {e.status === 0 ? (
                        <Button loading={acting === e.id} onClick={() => approve(e.id)}>Duyệt</Button>
                      ) : e.status === 2 ? (
                        <span className="text-xs text-green-700">Đã duyệt</span>
                      ) : e.status === 3 ? (
                        <span className="text-xs text-green-700">Đã xác nhận</span>
                      ) : (
                        <span className="text-xs text-ash">—</span>
                      )}
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
                <Button variant="neutral" disabled={!data.hasPrevious} onClick={() => setPage((p) => p - 1)}>Trước</Button>
                <Button variant="neutral" disabled={!data.hasNext} onClick={() => setPage((p) => p + 1)}>Sau</Button>
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
