import { useCallback, useEffect, useState } from 'react';
import {
  errorMessage,
  jockeyApi,
  type AssignedRaceForJockeyDto,
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
  Confirmed: 'Đã xác nhận – Tham gia',
};

const STATUS_TONE: Record<InvitationStatus, 'neutral' | 'green' | 'red' | 'flame'> = {
  Pending: 'flame',
  Accepted: 'flame',
  Declined: 'red',
  Cancelled: 'neutral',
  Confirmed: 'green',
};

function MetaRow({ icon, label, value }: { icon: string; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base">{icon}</span>
      <span className="text-xs text-ash">{label}:</span>
      <span className="text-sm font-medium text-ink">{value || '—'}</span>
    </div>
  );
}

export default function MyAssignedRacesPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResult<AssignedRaceForJockeyDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await jockeyApi.getMyAssignedRaces({ pageNumber: page, pageSize: PAGE_SIZE }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Cuộc đua của tôi</h1>
          <p className="mt-1 text-stone">
            Danh sách cuộc đua được phân công và thông tin ngựa bạn sẽ điều khiển (FR-21).
          </p>
        </div>
        <Button variant="neutral" onClick={() => void load()}>🔄 Làm mới</Button>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-stone">
          <Spinner /><span className="ml-2">Đang tải…</span>
        </div>
      ) : data?.items.length === 0 ? (
        <Card className="py-16 text-center text-stone">
          Bạn chưa được phân công vào cuộc đua nào.
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {data?.items.map((race) => {
            const raceDate = new Date(race.scheduledStart);
            const isPast = raceDate < now;
            return (
              <Card key={race.invitationId} className="flex flex-col gap-5 p-6">
                {/* Race header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-bold text-ink">{race.raceName}</h3>
                    <p className="mt-0.5 text-sm text-stone">
                      🕐 {raceDate.toLocaleString('vi-VN')}
                      {isPast && <span className="ml-2 text-xs text-ash italic">(Đã qua)</span>}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[race.status]}>{STATUS_LABEL[race.status]}</Badge>
                </div>

                {/* Horse info */}
                <div className="rounded-xl border border-parchment/60 bg-cream p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-marigold text-lg">🐴</span>
                    <div>
                      <p className="font-semibold text-ink">{race.horseName ?? 'Chưa xác định'}</p>
                      <p className="text-xs text-ash">Thông tin ngựa điều khiển</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2">
                    <MetaRow icon="🎨" label="Màu sắc" value={race.horseColor} />
                    <MetaRow icon="🌿" label="Giống" value={race.horseBreed} />
                    <MetaRow icon="⚖️" label="Cân nặng" value={race.horseWeightKg != null ? `${race.horseWeightKg} kg` : null} />
                    <MetaRow icon="📏" label="Chiều cao" value={race.horseHeightCm != null ? `${race.horseHeightCm} cm` : null} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-stone">
          <span>Tổng {data.totalCount} cuộc đua · Trang {data.pageNumber}/{data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="neutral" disabled={!data.hasPrevious} onClick={() => setPage((p) => p - 1)}>Trước</Button>
            <Button variant="neutral" disabled={!data.hasNext} onClick={() => setPage((p) => p + 1)}>Sau</Button>
          </div>
        </div>
      )}
    </div>
  );
}
