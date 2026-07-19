import { useCallback, useEffect, useState } from 'react';
import {
  errorMessage,
  racingApi,
  type RaceDto,
  type RaceEntryDto,
  type PagedResult,
} from '../../lib/api';
import { Alert, Badge, Button, Card, Input, Spinner } from '../../components/ui';
import ConfirmResultModal from '../../components/racing/ConfirmResultModal';

const PAGE_SIZE = 10;

export default function ConfirmResultPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [races, setRaces] = useState<PagedResult<RaceDto> | null>(null);
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [entries, setEntries] = useState<RaceEntryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmForEntryId, setConfirmForEntryId] = useState<string | null>(null);

  const loadRaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRaces(await racingApi.listRaces({
        search: search || undefined,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { void loadRaces(); }, [loadRaces]);

  async function loadDetail(raceId: string) {
    setDetailLoading(true);
    setError(null);
    try {
      const entriesData = await racingApi.listEntries({ raceId, pageSize: 50 });
      setEntries(entriesData.items as RaceEntryDto[]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (selectedRaceId) void loadDetail(selectedRaceId);
    else { setEntries([]); }
  }, [selectedRaceId]);

  const selectedRace = races?.items.find((r) => r.id === selectedRaceId);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Xác nhận kết quả</h1>
        <p className="mt-1 text-stone">Xác nhận kết quả chính thức của cuộc đua (FR-27).</p>
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
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Cuộc đua</span>
            <select
              value={selectedRaceId}
              onChange={(e) => setSelectedRaceId(e.target.value)}
              className="rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2.5 text-sm outline-none focus:border-flame"
            >
              <option value="">-- Chọn cuộc đua --</option>
              {races?.items.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}

      {loading ? (
        <div className="py-16 text-center text-stone"><Spinner /> Đang tải…</div>
      ) : !selectedRaceId ? (
        <Card className="py-16 text-center text-stone">Chọn cuộc đua để xem và xác nhận kết quả.</Card>
      ) : detailLoading ? (
        <div className="py-12 text-center text-stone"><Spinner /> Đang tải chi tiết…</div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-parchment/60 px-5 py-3">
            <span className="font-semibold">{selectedRace?.name ?? 'Cuộc đua'} — Danh sách tham dự</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-parchment/60 bg-cream/60 text-xs uppercase tracking-wide text-ash">
                <tr>
                  <Th>Làn</Th>
                  <Th>Mã ngựa</Th>
                  <Th>Mã jockey</Th>
                  <Th>Trạng thái đăng ký</Th>
                  <Th className="text-right">Xác nhận kết quả</Th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-stone">Chưa có ngựa nào đăng ký cuộc đua này.</td></tr>
                )}
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-parchment/40 last:border-0 hover:bg-cream/40">
                    <td className="px-5 py-3">{e.laneNo ?? '—'}</td>
                    <td className="px-5 py-3 font-mono text-xs text-stone">{e.horseId.slice(0, 8)}…</td>
                    <td className="px-5 py-3 font-mono text-xs text-stone">{e.jockeyId ? e.jockeyId.slice(0, 8) + '…' : '—'}</td>
                    <td className="px-5 py-3">
                      <Badge tone={e.statusName === 'Confirmed' ? 'green' : e.statusName === 'Rejected' ? 'red' : 'neutral'}>
                        {e.statusName}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <Button
                          variant="neutral"
                          onClick={() => setConfirmForEntryId(e.id)}
                        >
                          Xác nhận kết quả
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {races && races.totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-stone">
          <span>Tổng {races.totalCount} cuộc đua · Trang {races.pageNumber}/{races.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="neutral" disabled={!races.hasPrevious} onClick={() => setPage((p) => p - 1)}>Trước</Button>
            <Button variant="neutral" disabled={!races.hasNext} onClick={() => setPage((p) => p + 1)}>Sau</Button>
          </div>
        </div>
      )}

      {confirmForEntryId && (
        <ConfirmResultModal
          resultId={confirmForEntryId}
          onClose={() => setConfirmForEntryId(null)}
          onSaved={async () => { setConfirmForEntryId(null); await loadRaces(); if (selectedRaceId) await loadDetail(selectedRaceId); }}
          onError={setError}
        />
      )}
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-5 py-3 font-semibold ${className}`}>{children}</th>;
}
