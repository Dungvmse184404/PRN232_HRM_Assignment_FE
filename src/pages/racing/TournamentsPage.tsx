import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { errorMessage, tournamentsApi, type PagedResult, type TournamentDto } from '../../lib/api';
import { Alert, Badge, Button, Card, Input, Spinner } from '../../components/ui';

const PAGE_SIZE = 12;

const STATUS_MAP: Record<number, { label: string; tone: 'neutral' | 'green' | 'red' | 'flame' }> = {
  0: { label: 'Bản nháp', tone: 'neutral' },
  1: { label: 'Đã công bố', tone: 'green' },
  2: { label: 'Đang diễn ra', tone: 'flame' },
  3: { label: 'Đã kết thúc', tone: 'neutral' },
  4: { label: 'Đã hủy', tone: 'red' },
};

export default function TournamentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<PagedResult<TournamentDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const status = searchParams.get('status') ?? '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await tournamentsApi.list({
        search: search || undefined,
        status: status ? Number(status) : undefined,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      });
      setData(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => { void load(); }, [load]);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    if (key !== 'page') p.delete('page');
    setSearchParams(p);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Giải đấu</h1>
        <p className="mt-1 text-stone">Danh sách các giải đua ngựa trong hệ thống.</p>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Tìm kiếm</span>
            <Input value={search} onChange={(e) => setParam('search', e.target.value)} placeholder="Tên giải đấu..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Trạng thái</span>
            <select
              value={status}
              onChange={(e) => setParam('status', e.target.value)}
              className="rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2.5 text-sm outline-none focus:border-flame"
            >
              <option value="">Tất cả</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}

      {loading && (
        <div className="flex justify-center py-16"><Spinner /> <span className="ml-3 text-stone">Đang tải...</span></div>
      )}

      {!loading && data && data.items.length === 0 && (
        <Card className="py-16 text-center text-stone">Chưa có giải đấu nào.</Card>
      )}

      {!loading && data && data.items.length > 0 && (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((t) => (
              <Link key={t.id} to={`/tournaments/${t.id}`} className="group">
                <Card className="h-full p-6 transition hover:shadow-[var(--shadow-glow)] hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-ink group-hover:text-flame transition-colors">{t.name}</h3>
                    <Badge tone={STATUS_MAP[t.status]?.tone ?? 'neutral'}>{STATUS_MAP[t.status]?.label ?? t.statusName}</Badge>
                  </div>
                  {t.description && <p className="mt-2 text-sm text-stone line-clamp-2">{t.description}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ash">
                    {t.location && <span>{t.location}</span>}
                    <span>{new Date(t.startDate).toLocaleDateString('vi-VN')} — {new Date(t.endDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                  {t.totalPrizePool != null && t.totalPrizePool > 0 && (
                    <div className="mt-3 text-sm font-semibold text-flame">
                      {t.totalPrizePool.toLocaleString('vi-VN')} VND
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>

          {data.totalCount > 0 && (
            <div className="flex items-center justify-between text-sm text-stone">
              <span>Tổng {data.totalCount} giải đấu · Trang {data.pageNumber}/{data.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="neutral" disabled={!data.hasPrevious} onClick={() => setParam('page', String(page - 1))}>Trước</Button>
                <Button variant="neutral" disabled={!data.hasNext} onClick={() => setParam('page', String(page + 1))}>Sau</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
