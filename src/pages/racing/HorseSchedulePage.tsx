import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { entriesApi, errorMessage, horsesApi, type HorseDto, type PagedResult, type RaceEntryDto } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { Alert, Badge, Button, Card, Spinner } from '../../components/ui';

const PAGE_SIZE = 15;

const ENTRY_STATUS: Record<number, { label: string; tone: 'neutral' | 'green' | 'red' | 'flame' }> = {
  0: { label: 'Đã đăng ký', tone: 'neutral' },
  1: { label: 'Chờ duyệt', tone: 'flame' },
  2: { label: 'Đã duyệt', tone: 'green' },
  3: { label: 'Đã xác nhận', tone: 'green' },
  4: { label: 'Từ chối', tone: 'red' },
  5: { label: 'Đã rút', tone: 'neutral' },
};

export default function HorseSchedulePage() {
  const { user } = useAuth();
  const [data, setData] = useState<PagedResult<RaceEntryDto> | null>(null);
  const [horseId, setHorseId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [horses, setHorses] = useState<HorseDto[]>([]);

  const isHorseOwner = user?.roles.includes('HorseOwner');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await entriesApi.list({
        horseId: horseId || undefined,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      });
      setData(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [horseId, page]);

  useEffect(() => { void load(); }, [load]);

  // Load horses for dropdown filter
  useEffect(() => {
    if (!isHorseOwner) return;
    horsesApi.list({ pageSize: 100 }).then(r => setHorses(r.items)).catch(() => {});
  }, [isHorseOwner]);

  async function confirm(id: string) {
    setActing(id);
    setError(null);
    try {
      await entriesApi.confirm(id);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setActing(null);
    }
  }

  async function withdraw(id: string) {
    if (!window.confirm('Bạn có chắc muốn rút ngựa khỏi cuộc đua này?')) return;
    setActing(id);
    setError(null);
    try {
      await entriesApi.withdraw(id);
      await load();
    } catch (err) {
      const msg = errorMessage(err);
      // Nếu BE chưa có endpoint withdraw (404) thì báo "Chức năng chưa khả dụng"
      setError(msg.includes('404') || msg.toLowerCase().includes('not found') ? 'Chức năng chưa khả dụng.' : msg);
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Lịch thi đấu của ngựa</h1>
        <p className="mt-1 text-stone">Xem các cuộc đua ngựa của bạn đã đăng ký và xác nhận tham gia.</p>
      </div>

      {!isHorseOwner && (
        <Card className="py-10 text-center text-sm text-stone">
          Bạn cần vai trò <strong>Horse Owner</strong> để xem lịch thi đấu của ngựa.
        </Card>
      )}

      {isHorseOwner && (
        <>
          <Card className="p-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <span className="text-xs font-medium text-ash">Lọc theo ngựa (để trống để xem tất cả)</span>
                <select
                  value={horseId}
                  onChange={(e) => { setPage(1); setHorseId(e.target.value); }}
                  className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-flame focus:ring-2 focus:ring-flame/30 w-full"
                >
                  <option value="">-- Tất cả ngựa --</option>
                  {horses.map(h => (
                    <option key={h.id} value={h.id}>{h.name} ({h.breed || 'N/A'} · {h.genderName})</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {error && <Alert kind="error">{error}</Alert>}

          {loading && <div className="flex justify-center py-16"><Spinner /></div>}

          {!loading && data && data.items.length === 0 && (
            <Card className="py-12 text-center text-stone">Chưa có đăng ký tham gia nào.</Card>
          )}

          {!loading && data && data.items.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-parchment/60 bg-cream/60 text-xs uppercase tracking-wide text-ash">
                    <tr>
                      <Th>Cuộc đua</Th>
                      <Th>Ngựa ID</Th>
                      <Th>Đăng ký lúc</Th>
                      <Th>Trạng thái</Th>
                      <Th className="text-right">Hành động</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((e) => {
                      const isRegistered = e.status === 0;
                      const isApproved = e.status === 2; // Approved
                      const isConfirmed = e.status === 3;
                      const canWithdraw = isRegistered || isApproved;
                      return (
                        <tr key={e.id} className="border-b border-parchment/40 last:border-0 hover:bg-cream/40">
                          <td className="px-5 py-3">
                            <Link to={`/races/${e.raceId}`} className="font-medium text-ink hover:text-flame transition-colors">
                              {e.raceName}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-xs text-stone">
                            {e.horseName ? (
                              <span className="font-medium text-ink">{e.horseName}</span>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-xs text-stone">{new Date(e.registeredAtUtc).toLocaleString('vi-VN')}</td>
                          <td className="px-5 py-3">
                            <Badge tone={ENTRY_STATUS[e.status]?.tone ?? 'neutral'}>{ENTRY_STATUS[e.status]?.label ?? e.statusName}</Badge>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              {isApproved && (
                                <Button loading={acting === e.id} onClick={() => confirm(e.id)}>
                                  Xác nhận tham gia
                                </Button>
                              )}
                              {canWithdraw && (
                                <Button variant="danger" loading={acting === e.id} onClick={() => withdraw(e.id)}>
                                  Rút tham gia
                                </Button>
                              )}
                              {isConfirmed && (
                                <span className="text-xs text-ash">Đã xác nhận</span>
                              )}
                              {!canWithdraw && !isConfirmed && (
                                <span className="text-xs text-stone">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
        </>
      )}
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-5 py-3 font-semibold ${className}`}>{children}</th>;
}
