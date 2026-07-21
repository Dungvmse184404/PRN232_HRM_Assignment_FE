import { useCallback, useEffect, useState } from 'react';
import { errorMessage, racingApi, type AssignedRaceDto, type RaceDto, type PagedResult } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { Alert, Badge, Button, Card, Input, Spinner } from '../../components/ui';
import AssignRefereeModal from '../../components/racing/AssignRefereeModal';

const PAGE_SIZE = 10;

export default function AssignRefereePage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [races, setRaces] = useState<PagedResult<RaceDto> | null>(null);
  const [assigned, setAssigned] = useState<AssignedRaceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignFor, setAssignFor] = useState<RaceDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [racesData, assignedData] = await Promise.all([
        racingApi.listRaces({ search: search || undefined, pageNumber: page, pageSize: PAGE_SIZE }),
        racingApi.getAssignedRaces(),
      ]);
      setRaces(racesData);
      setAssigned(assignedData);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { void load(); }, [load]);

  function isAssigned(raceId: string) {
    return assigned.some((a) => a.raceId === raceId);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Phân công Trọng tài</h1>
          <p className="mt-1 text-stone">Gán trọng tài vào cuộc đua (FR-23).</p>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Tìm theo tên cuộc đua</span>
            <Input
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="vd: Grand Prix"
            />
          </div>
        </div>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-parchment/60 bg-cream/60 text-xs uppercase tracking-wide text-ash">
              <tr>
                <Th>Cuộc đua</Th>
                <Th>Giải đấu</Th>
                <Th>Bắt đầu</Th>
                <Th>Trạng thái</Th>
                <Th className="text-right">Hành động</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-stone"><Spinner /> Đang tải…</td></tr>
              )}
              {!loading && races?.items.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-stone">Không có cuộc đua nào.</td></tr>
              )}
              {!loading && races?.items.map((r) => (
                <tr key={r.id} className="border-b border-parchment/40 last:border-0 hover:bg-cream/40">
                  <td className="px-5 py-3">
                    <div className="font-medium text-ink">{r.name}</div>
                    <div className="text-xs text-ash">{r.distanceM} m · Tối đa {r.maxHorses} ngựa</div>
                  </td>
                  <td className="px-5 py-3 text-stone">{r.tournamentName}</td>
                  <td className="px-5 py-3 text-xs text-stone">
                    {new Date(r.scheduledStart).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge name={r.statusName} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {isAssigned(r.id)
                        ? <Badge tone="green">Đã phân công</Badge>
                        : isAdmin
                          ? <Button variant="neutral" onClick={() => setAssignFor(r)}>Phân công</Button>
                          : <span className="text-xs text-ash">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {races && races.totalCount > 0 && (
          <div className="flex items-center justify-between border-t border-parchment/60 px-5 py-3 text-sm text-stone">
            <span>Tổng {races.totalCount} cuộc đua · Trang {races.pageNumber}/{races.totalPages}</span>
            <div className="flex gap-2">
              <Button variant="neutral" disabled={!races.hasPrevious} onClick={() => setPage((p) => p - 1)}>Trước</Button>
              <Button variant="neutral" disabled={!races.hasNext} onClick={() => setPage((p) => p + 1)}>Sau</Button>
            </div>
          </div>
        )}
      </Card>

      {assignFor && (
        <AssignRefereeModal
          race={assignFor}
          onClose={() => setAssignFor(null)}
          onSaved={async () => { setAssignFor(null); await load(); }}
          onError={setError}
        />
      )}
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-5 py-3 font-semibold ${className}`}>{children}</th>;
}

function StatusBadge({ name }: { name: string }) {
  const tone = name === 'Ongoing' ? 'flame'
    : name === 'Finished' ? 'green'
    : name === 'Cancelled' ? 'red'
    : 'neutral';
  const label: Record<string, string> = {
    Scheduled: 'Đã lên lịch',
    RegistrationOpen: 'Mở đăng ký',
    RegistrationClosed: 'Đóng đăng ký',
    Ongoing: 'Đang chạy',
    Finished: 'Hoàn thành',
    Cancelled: 'Đã hủy',
  };
  return <Badge tone={tone}>{label[name] ?? name}</Badge>;
}
