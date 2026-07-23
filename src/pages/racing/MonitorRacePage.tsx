import { useCallback, useEffect, useState } from 'react';
import {
  errorMessage,
  racingApi,
  type RaceDto,
  type RaceEntryDto,
  type PagedResult,
  type RaceStatus,
} from '../../lib/api';
import { Alert, Badge, Button, Card, Input, Spinner } from '../../components/ui';

const PAGE_SIZE = 20;
const STATUS_LABEL: Record<string, string> = {
  Scheduled: 'Đã lên lịch',
  RegistrationOpen: 'Mở đăng ký',
  RegistrationClosed: 'Đóng đăng ký',
  Ongoing: 'Đang chạy',
  Finished: 'Hoàn thành',
  Cancelled: 'Đã hủy',
};
const ENTRY_STATUS_LABEL: Record<string, string> = {
  Registered: 'Đã đăng ký',
  PendingApproval: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Confirmed: 'Đã xác nhận',
  Rejected: 'Bị từ chối',
  Withdrawn: 'Đã rút',
};

export default function MonitorRacePage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RaceStatus | ''>('');
  const [page, setPage] = useState(1);
  const [races, setRaces] = useState<PagedResult<RaceDto> | null>(null);
  const [selected, setSelected] = useState<RaceDto | null>(null);
  const [entries, setEntries] = useState<PagedResult<RaceEntryDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRaces(await racingApi.listRaces({
        search: search || undefined,
        status: status || undefined,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => { void loadRaces(); }, [loadRaces]);

  async function selectRace(race: RaceDto) {
    setSelected(race);
    setDetailLoading(true);
    setError(null);
    try {
      const [raceDetail, entriesData] = await Promise.all([
        racingApi.getRace(race.id),
        racingApi.listEntries({ raceId: race.id, pageSize: 50 }),
      ]);
      setSelected(raceDetail);
      setEntries(entriesData);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  }

  async function refresh() {
    if (!selected) return;
    await selectRace(selected);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Giám sát cuộc đua</h1>
          <p className="mt-1 text-stone">Theo dõi trạng thái và danh sách tham dự.</p>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Tìm theo tên cuộc đua / giải đấu</span>
            <Input
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="vd: Grand Prix"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Trạng thái</span>
            <select
              value={status}
              onChange={(e) => { setPage(1); setStatus(e.target.value as RaceStatus | ''); }}
              className="rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2.5 text-sm outline-none focus:border-flame"
            >
              <option value="">Tất cả</option>
              <option value="Scheduled">Đã lên lịch</option>
              <option value="RegistrationOpen">Mở đăng ký</option>
              <option value="RegistrationClosed">Đóng đăng ký</option>
              <option value="Ongoing">Đang chạy</option>
              <option value="Finished">Hoàn thành</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </div>
        </div>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}

      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="py-12 text-center text-stone"><Spinner /> Đang tải…</div>
          ) : races?.items.length === 0 ? (
            <Card className="py-12 text-center text-stone">Không có cuộc đua nào.</Card>
          ) : (
            races?.items.map((r) => (
              <div
                key={r.id}
                className={`cursor-pointer rounded-[var(--radius-card)] border border-parchment/60 bg-paper p-5 transition hover:border-flame/40 ${selected?.id === r.id ? 'border-flame' : ''}`}
                onClick={() => selectRace(r)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="mt-0.5 text-xs text-ash">{r.tournamentName}</div>
                  </div>
                  <StatusBadge name={r.statusName} />
                </div>
                <div className="mt-2 text-xs text-stone">
                  {new Date(r.scheduledStart).toLocaleString('vi-VN')} · {r.entryCount}/{r.maxHorses} ngựa
                </div>
              </div>
            ))
          )}

          {races && races.totalCount > 0 && (
            <div className="flex items-center justify-between text-sm text-stone">
              <span>Trang {races.pageNumber}/{races.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="neutral" disabled={!races.hasPrevious} onClick={() => setPage((p) => p - 1)}>Trước</Button>
                <Button variant="neutral" disabled={!races.hasNext} onClick={() => setPage((p) => p + 1)}>Sau</Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {!selected ? (
            <Card className="py-20 text-center text-stone">← Chọn một cuộc đua để xem chi tiết.</Card>
          ) : detailLoading ? (
            <div className="py-16 text-center text-stone"><Spinner /> Đang tải chi tiết…</div>
          ) : (
            <>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{selected.name}</h2>
                    <p className="mt-0.5 text-sm text-stone">{selected.tournamentName} · {selected.trackName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge name={selected.statusName} />
                    <Button variant="neutral" onClick={refresh}>↻ Làm mới</Button>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-3">
                  <Meta label="Bắt đầu" value={new Date(selected.scheduledStart).toLocaleString('vi-VN')} />
                  <Meta label="Kết thúc" value={selected.scheduledEnd ? new Date(selected.scheduledEnd).toLocaleString('vi-VN') : '-'} />
                  <Meta label="Cự li" value={`${selected.distanceM} m`} />
                  <Meta label="Ngựa tham gia" value={`${selected.entryCount} / ${selected.maxHorses}`} />
                  <Meta label="Hạn đăng ký" value={selected.registrationDeadline ? new Date(selected.registrationDeadline).toLocaleString('vi-VN') : '-'} />
                </dl>
              </Card>

              {selected.rounds.length > 0 && (
                <Card className="overflow-hidden p-0">
                  <div className="border-b border-parchment/60 px-5 py-3 font-semibold">Vòng đua</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-parchment/60 bg-cream/60 text-xs uppercase tracking-wide text-ash">
                        <tr>
                          <Th>Vòng</Th>
                          <Th>Tên</Th>
                          <Th>Giờ dự kiến</Th>
                          <Th>Trạng thái</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.rounds.map((rd) => (
                          <tr key={rd.id} className="border-b border-parchment/40 last:border-0 hover:bg-cream/40">
                            <td className="px-5 py-3 font-medium">{rd.roundNumber}</td>
                            <td className="px-5 py-3 text-stone">{rd.name ?? '-'}</td>
                            <td className="px-5 py-3 text-xs text-stone">{rd.scheduledTime ? new Date(rd.scheduledTime).toLocaleString('vi-VN') : '-'}</td>
                            <td className="px-5 py-3">
                              <Badge tone={rd.statusName === 'Ongoing' ? 'flame' : rd.statusName === 'Finished' ? 'green' : 'neutral'}>
                                {rd.statusName === 'Pending' ? 'Chờ' : rd.statusName === 'Ongoing' ? 'Đang chạy' : 'Hoàn thành'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {entries && (
                <Card className="overflow-hidden p-0">
                  <div className="border-b border-parchment/60 px-5 py-3 font-semibold">Ngựa tham gia ({entries.totalCount})</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-parchment/60 bg-cream/60 text-xs uppercase tracking-wide text-ash">
                        <tr>
                          <Th>Làn</Th>
                          <Th>Ngựa</Th>
                          <Th>Jockey</Th>
                          <Th>Trạng thái</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.items.length === 0 && (
                          <tr><td colSpan={4} className="px-5 py-8 text-center text-stone">Chưa có ngựa nào đăng ký.</td></tr>
                        )}
                        {entries.items.map((e) => (
                          <tr key={e.id} className="border-b border-parchment/40 last:border-0 hover:bg-cream/40">
                            <td className="px-5 py-3">{e.laneNo ?? '-'}</td>
                            <td className="px-5 py-3 text-stone">{e.horseName ?? `${e.horseId.slice(0, 8)}…`}</td>
                            <td className="px-5 py-3 text-stone">{e.jockeyId ? e.jockeyId.slice(0, 8) + '…' : '-'}</td>
                            <td className="px-5 py-3">
                              <Badge tone={e.statusName === 'Confirmed' ? 'green' : e.statusName === 'Rejected' ? 'red' : 'neutral'}>
                                {ENTRY_STATUS_LABEL[e.statusName] ?? e.statusName}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-5 py-3 font-semibold ${className}`}>{children}</th>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-ash">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </>
  );
}

function StatusBadge({ name }: { name: string }) {
  const tone = name === 'Ongoing' ? 'flame'
    : name === 'Finished' ? 'green'
    : name === 'Cancelled' ? 'red'
    : 'neutral';
  return <Badge tone={tone}>{STATUS_LABEL[name] ?? name}</Badge>;
}
