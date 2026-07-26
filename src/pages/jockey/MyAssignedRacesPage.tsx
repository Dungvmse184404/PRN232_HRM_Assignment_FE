import { useCallback, useEffect, useState } from 'react';
import {
  errorMessage,
  horsesApi,
  jockeyApi,
  type AssignedRaceForJockeyDto,
  type HorseDto,
  type InvitationStatus,
  type PagedResult,
} from '../../lib/api';
import { groupByTournament } from '../../lib/grouping';
import { Alert, Badge, Button, Card, Spinner } from '../../components/ui';
import {
  ClockIcon,
  HorseshoeIcon,
  LeafIcon,
  PaletteIcon,
  RefreshIcon,
  RulerIcon,
  ScaleIcon,
  TrophyIcon,
  type IconComponent,
} from '../../components/icons';

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

function MetaRow({ icon: Icon, label, value }: { icon: IconComponent; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-ash" />
      <span className="text-xs text-ash">{label}:</span>
      <span className="text-sm font-medium text-ink">{value || '-'}</span>
    </div>
  );
}

export default function MyAssignedRacesPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResult<AssignedRaceForJockeyDto> | null>(null);
  // Giống/màu/cân nặng/chiều cao không nằm trong contract gRPC HorseLookup (chỉ có tên), nên tự
  // gọi thêm GET /horse/horses/{id} phía FE cho từng ngựa duy nhất trong trang hiện tại.
  const [horseDetails, setHorseDetails] = useState<Record<string, HorseDto>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await jockeyApi.getMyAssignedRaces({ pageNumber: page, pageSize: PAGE_SIZE });
      setData(result);

      const horseIds = [...new Set(result.items.map((r) => r.horseId))];
      const details = await Promise.all(
        horseIds.map((id) => horsesApi.get(id).then((h) => [id, h] as const).catch(() => null)),
      );
      setHorseDetails(Object.fromEntries(details.filter((d): d is [string, HorseDto] => d !== null)));
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
        <Button variant="neutral" onClick={() => void load()}>
          <RefreshIcon className="h-4 w-4" /> Làm mới
        </Button>
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
        <div className="flex flex-col gap-8">
          {groupByTournament(data?.items ?? []).map((group) => (
            <div key={group.tournamentId} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
                <TrophyIcon className="h-5 w-5 shrink-0 text-flame" /> {group.tournamentName}
                <span className="text-sm font-normal text-ash">({group.items.length} cuộc đua)</span>
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {group.items.map((race) => {
                  const raceDate = new Date(race.raceScheduledStart);
                  const isPast = raceDate < now;
                  const horse = horseDetails[race.horseId];
                  return (
                    <Card key={race.id} className="flex flex-col gap-5 p-6">
                      {/* Race header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-xl font-bold text-ink">{race.raceName}</h3>
                          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-stone">
                            <ClockIcon className="h-4 w-4 shrink-0 text-ash" />
                            {raceDate.toLocaleString('vi-VN')}
                            {isPast && <span className="ml-1 text-xs text-ash italic">(Đã qua)</span>}
                          </p>
                        </div>
                        <Badge tone={STATUS_TONE[race.statusName]}>{STATUS_LABEL[race.statusName]}</Badge>
                      </div>

                      {/* Horse info */}
                      <div className="rounded-xl border border-parchment/60 bg-cream p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-marigold text-ink">
                            <HorseshoeIcon className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="font-semibold text-ink">{race.horseName ?? horse?.name ?? 'Chưa xác định'}</p>
                            <p className="text-xs text-ash">Thông tin ngựa điều khiển</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2">
                          <MetaRow icon={PaletteIcon} label="Màu sắc" value={horse?.color} />
                          <MetaRow icon={LeafIcon} label="Giống" value={horse?.breed} />
                          <MetaRow icon={ScaleIcon} label="Cân nặng" value={horse?.weightKg != null ? `${horse.weightKg} kg` : null} />
                          <MetaRow icon={RulerIcon} label="Chiều cao" value={horse?.heightCm != null ? `${horse.heightCm} cm` : null} />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
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
