import { useCallback, useEffect, useState } from 'react';
import {
  errorMessage,
  jockeyApi,
  type InvitationDto,
  type InvitationStatus,
  type PagedResult,
} from '../../lib/api';
import { Alert, Badge, Button, Card, Spinner } from '../../components/ui';
import {
  CalendarIcon,
  ChatIcon,
  CheckCircleIcon,
  CheckIcon,
  CloseIcon,
  FlagIcon,
  HorseshoeIcon,
  RefreshIcon,
  TrophyIcon,
  UserIcon,
} from '../../components/icons';

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

export default function MyInvitationsPage() {
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | ''>('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PagedResult<InvitationDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null); // which invitation id

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await jockeyApi.getMyInvitations({
        status: statusFilter || undefined,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { void load(); }, [load]);

  async function respond(id: string, response: 'Accepted' | 'Declined') {
    setActing(id);
    setError(null);
    setActionMsg(null);
    try {
      await jockeyApi.respondInvitation(id, response);
      setActionMsg(response === 'Accepted' ? 'Đã chấp nhận lời mời!' : 'Đã từ chối lời mời.');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Lời mời điều khiển ngựa</h1>
        <p className="mt-1 text-stone">
          Xem và phản hồi các lời mời từ chủ ngựa.
        </p>
      </div>

      {/* Filter */}
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Trạng thái</span>
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
          <Button variant="neutral" onClick={() => void load()}>
            <RefreshIcon className="h-4 w-4" /> Làm mới
          </Button>
        </div>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}
      {actionMsg && <Alert kind="success">{actionMsg}</Alert>}

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-stone">
          <Spinner /><span className="ml-2">Đang tải…</span>
        </div>
      ) : data?.items.length === 0 ? (
        <Card className="py-16 text-center text-stone">
          Không có lời mời nào.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {data?.items.map((inv) => (
            <Card key={inv.id} className="flex flex-col gap-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Left info */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <FlagIcon className="h-5 w-5 shrink-0 text-flame" />
                    <h3 className="text-lg font-semibold text-ink">{inv.raceName}</h3>
                    <Badge tone={STATUS_TONE[inv.statusName]}>{STATUS_LABEL[inv.statusName]}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-stone">
                    <span className="flex items-center gap-1.5">
                      <HorseshoeIcon className="h-4 w-4 shrink-0 text-ash" />
                      Ngựa: <strong className="text-ink">{inv.horseName ?? '-'}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <UserIcon className="h-4 w-4 shrink-0 text-ash" />
                      Từ: <strong className="text-ink">{inv.jockeyName ?? 'Chủ ngựa'}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarIcon className="h-4 w-4 shrink-0 text-ash" />
                      Ngày gửi: <strong className="text-ink">{new Date(inv.sentAtUtc).toLocaleDateString('vi-VN')}</strong>
                    </span>
                  </div>
                  {inv.message && (
                    <div className="mt-2 flex items-start gap-2 rounded-xl border border-parchment/60 bg-cream p-3 text-sm text-stone italic">
                      <ChatIcon className="mt-0.5 h-4 w-4 shrink-0 text-ash" />
                      <span>"{inv.message}"</span>
                    </div>
                  )}
                </div>

                {/* Actions – FR-19 */}
                {inv.statusName === 'Pending' && (
                  <div className="flex gap-2">
                    <Button
                      loading={acting === inv.id}
                      onClick={() => void respond(inv.id, 'Accepted')}
                    >
                      <CheckIcon className="h-4 w-4" /> Chấp nhận
                    </Button>
                    <Button
                      variant="danger"
                      loading={acting === inv.id}
                      onClick={() => {
                        if (confirm('Từ chối lời mời này?')) {
                          void respond(inv.id, 'Declined');
                        }
                      }}
                    >
                      <CloseIcon className="h-4 w-4" /> Từ chối
                    </Button>
                  </div>
                )}

                {inv.statusName === 'Accepted' && (
                  <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm text-green-700 border border-green-200">
                    <CheckCircleIcon className="h-4 w-4 shrink-0" /> Đã chấp nhận – Chờ chủ ngựa xác nhận
                  </div>
                )}

                {inv.statusName === 'Confirmed' && (
                  <div className="flex items-center gap-2 rounded-full bg-marigold/30 px-4 py-2 text-sm text-ink border border-flame/30">
                    <TrophyIcon className="h-4 w-4 shrink-0 text-flame" /> Đã được xác nhận tham gia
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-stone">
          <span>Tổng {data.totalCount} lời mời · Trang {data.pageNumber}/{data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="neutral" disabled={!data.hasPrevious} onClick={() => setPage((p) => p - 1)}>Trước</Button>
            <Button variant="neutral" disabled={!data.hasNext} onClick={() => setPage((p) => p + 1)}>Sau</Button>
          </div>
        </div>
      )}
    </div>
  );
}
