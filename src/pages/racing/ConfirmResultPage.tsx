import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  errorMessage,
  racingApi,
  type RaceDto,
  type RaceEntryDto,
  type RaceResultDto,
  type RaceRoundResultsDto,
  type PagedResult,
} from '../../lib/api';
import { Alert, Badge, Button, Card, Input, Spinner } from '../../components/ui';
import ConfirmResultModal from '../../components/racing/ConfirmResultModal';

const PAGE_SIZE = 10;

const RESULT_STATUS_TONE: Record<string, 'neutral' | 'green' | 'flame'> = {
  Pending: 'neutral',
  RefereeConfirmed: 'flame',
  Published: 'green',
};

// Chỉ để preview điểm phía FE khi nhập - điểm thật do BE tính (RoundPoints), giữ đồng bộ thủ công.
const ROUND_POINTS: Record<number, number> = { 1: 100, 2: 50, 3: 25, 4: 15, 5: 10 };

function shortId(id: string) {
  return `${id.slice(0, 8)}…`;
}

export default function ConfirmResultPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [races, setRaces] = useState<PagedResult<RaceDto> | null>(null);
  // Vào thẳng trang này từ nút "Chốt kết quả" ở chi tiết cuộc đua (?raceId=...) - cuộc đua đó có thể
  // không nằm trong trang danh sách hiện tại, nên tải riêng và "ghim" vào để dropdown hiển thị đúng tên.
  const [selectedRaceId, setSelectedRaceId] = useState(() => searchParams.get('raceId') ?? '');
  const [pinnedRace, setPinnedRace] = useState<RaceDto | null>(null);

  useEffect(() => {
    const raceId = searchParams.get('raceId');
    if (!raceId) return;
    racingApi.getRace(raceId).then(setPinnedRace).catch(() => {});
    // Xoá query param khỏi URL sau khi đã dùng, để không tải lại pinnedRace mỗi lần điều hướng.
    setSearchParams((prev) => { prev.delete('raceId'); return prev; }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kết quả đã ghi nhận (nếu có) - có Id thật để xác nhận từng dòng.
  const [raceResults, setRaceResults] = useState<RaceResultDto[]>([]);
  // Các lượt đăng ký đã Confirmed - chỉ cần khi CHƯA có kết quả (để ghi nhận lần đầu).
  const [entries, setEntries] = useState<RaceEntryDto[]>([]);
  const [ranks, setRanks] = useState<Record<string, string>>({});
  const [times, setTimes] = useState<Record<string, string>>({});

  // Kết quả theo vòng đua (khi cuộc đua có rounds) + form nhập cho vòng đang chọn.
  const [roundResultsData, setRoundResultsData] = useState<RaceRoundResultsDto | null>(null);
  const [activeRoundId, setActiveRoundId] = useState('');
  const [roundRanks, setRoundRanks] = useState<Record<string, string>>({});
  const [roundSubmitting, setRoundSubmitting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmForResultId, setConfirmForResultId] = useState<string | null>(null);

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

  const loadDetail = useCallback(async (raceId: string, hasRounds: boolean) => {
    setDetailLoading(true);
    setError(null);
    try {
      const results = await racingApi.getRaceResultsForReferee(raceId);
      setRaceResults(results);

      // Danh sách đăng ký đã Confirmed - cần cho form nhập tay (không rounds) VÀ form nhập theo vòng.
      const entriesData = await racingApi.listEntries({ raceId, status: 'Confirmed', pageSize: 50 });
      setEntries(entriesData.items);
      if (results.length === 0) { setRanks({}); setTimes({}); }

      if (hasRounds) {
        setRoundResultsData(await racingApi.getRoundResults(raceId));
      } else {
        setRoundResultsData(null);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const selectedRace = races?.items.find((r) => r.id === selectedRaceId)
    ?? (pinnedRace?.id === selectedRaceId ? pinnedRace : undefined);
  const hasRounds = (selectedRace?.rounds.length ?? 0) > 0;
  const sortedRounds = [...(selectedRace?.rounds ?? [])].sort((a, b) => a.roundNumber - b.roundNumber);

  useEffect(() => {
    if (selectedRaceId) void loadDetail(selectedRaceId, hasRounds);
    else { setEntries([]); setRaceResults([]); setRoundResultsData(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRaceId, hasRounds, loadDetail]);

  // Chọn vòng đang xem/nhập mặc định là vòng đầu tiên khi đổi cuộc đua.
  useEffect(() => {
    if (sortedRounds.length === 0) { setActiveRoundId(''); return; }
    setActiveRoundId((prev) => (sortedRounds.some((r) => r.id === prev) ? prev : sortedRounds[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRaceId, sortedRounds.length]);

  // Prefill form nhập của vòng đang chọn từ dữ liệu đã ghi nhận (nếu có), để referee/admin có thể SỬA.
  useEffect(() => {
    if (!activeRoundId) { setRoundRanks({}); return; }
    const group = roundResultsData?.rounds.find((g) => g.roundId === activeRoundId);
    const next: Record<string, string> = {};
    for (const row of group?.rows ?? []) next[row.raceEntryId] = String(row.finishPosition);
    setRoundRanks(next);
  }, [activeRoundId, roundResultsData]);

  async function onSubmitResults(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const items = entries.map((en) => ({
      raceEntryId: en.id,
      finishPosition: Number(ranks[en.id]),
      finishTimeMs: times[en.id] ? Number(times[en.id]) : undefined,
    }));

    if (items.some((i) => !i.finishPosition || i.finishPosition < 1)) {
      setError('Vui lòng nhập vị trí về đích (số nguyên dương) cho tất cả các ngựa.');
      return;
    }
    const positions = items.map((i) => i.finishPosition);
    if (new Set(positions).size !== positions.length) {
      setError('Vị trí về đích không được trùng nhau.');
      return;
    }

    setSubmitting(true);
    try {
      await racingApi.recordResults(selectedRaceId, items);
      setSuccess('Đã ghi nhận kết quả cuộc đua.');
      await loadDetail(selectedRaceId, hasRounds);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitRoundResults(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!activeRoundId) return;

    const items = entries.map((en) => ({
      raceEntryId: en.id,
      finishPosition: Number(roundRanks[en.id]),
    }));

    if (items.some((i) => !i.finishPosition || i.finishPosition < 1)) {
      setError('Vui lòng nhập vị trí về đích (số nguyên dương) cho tất cả các ngựa trong vòng này.');
      return;
    }
    const positions = items.map((i) => i.finishPosition);
    if (new Set(positions).size !== positions.length) {
      setError('Vị trí về đích trong vòng không được trùng nhau.');
      return;
    }

    setRoundSubmitting(true);
    try {
      await racingApi.recordRoundResults(selectedRaceId, activeRoundId, items);
      setSuccess('Đã ghi nhận kết quả vòng đua.');
      await loadDetail(selectedRaceId, true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRoundSubmitting(false);
    }
  }

  const sortedResults = [...raceResults].sort((a, b) => {
    if (a.finishPosition == null) return 1;
    if (b.finishPosition == null) return -1;
    return a.finishPosition - b.finishPosition;
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Ghi nhận & xác nhận kết quả</h1>
        <p className="mt-1 text-stone">
          Sau khi cuộc đua kết thúc: ghi nhận vị trí về đích cho từng ngựa, rồi xác nhận từng kết quả.
        </p>
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
              {pinnedRace && !races?.items.some((r) => r.id === pinnedRace.id) && (
                <option value={pinnedRace.id}>{pinnedRace.name}</option>
              )}
              {races?.items.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {loading ? (
        <div className="py-16 text-center text-stone"><Spinner /> Đang tải…</div>
      ) : !selectedRaceId ? (
        <Card className="py-16 text-center text-stone">Chọn cuộc đua để ghi nhận/xác nhận kết quả.</Card>
      ) : detailLoading ? (
        <div className="py-12 text-center text-stone"><Spinner /> Đang tải chi tiết…</div>
      ) : selectedRace && selectedRace.statusName !== 'Finished' && raceResults.length === 0 ? (
        <Card className="py-16 text-center text-stone">
          Cuộc đua chưa kết thúc (trạng thái hiện tại: {selectedRace.statusName}) — chỉ ghi nhận kết quả sau khi cuộc đua đã Finished.
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {hasRounds && (
            <Card className="overflow-hidden p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-parchment/60 px-5 py-3">
                <span className="font-semibold">{selectedRace?.name ?? 'Cuộc đua'} — Kết quả theo vòng đua</span>
                <div className="flex flex-wrap gap-2">
                  {sortedRounds.map((round) => (
                    <button
                      key={round.id}
                      type="button"
                      onClick={() => setActiveRoundId(round.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        activeRoundId === round.id ? 'bg-flame text-white' : 'bg-cream text-stone hover:bg-cream/80'
                      }`}
                    >
                      {round.name || `Vòng ${round.roundNumber}`}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={onSubmitRoundResults}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-parchment/60 bg-cream/60 text-xs uppercase tracking-wide text-ash">
                      <tr>
                        <Th>Làn</Th>
                        <Th>Ngựa</Th>
                        <Th>Mã jockey</Th>
                        <Th>Vị trí về đích (vòng này) *</Th>
                        <Th className="text-right">Điểm vòng</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.length === 0 && (
                        <tr><td colSpan={5} className="px-5 py-10 text-center text-stone">Chưa có lượt đăng ký nào ở trạng thái Confirmed cho cuộc đua này.</td></tr>
                      )}
                      {entries.map((en) => {
                        const pos = roundRanks[en.id] ? Number(roundRanks[en.id]) : null;
                        return (
                          <tr key={en.id} className="border-b border-parchment/40 last:border-0">
                            <td className="px-5 py-3">{en.laneNo ?? '-'}</td>
                            <td className="px-5 py-3">
                              <div className="font-medium text-ink">{en.horseName ?? `Ngựa ${shortId(en.horseId)}`}</div>
                            </td>
                            <td className="px-5 py-3 font-mono text-xs text-stone">{en.jockeyId ? shortId(en.jockeyId) : '-'}</td>
                            <td className="px-5 py-3">
                              <input
                                type="number"
                                min={1}
                                required
                                value={roundRanks[en.id] ?? ''}
                                onChange={(e) => setRoundRanks((prev) => ({ ...prev, [en.id]: e.target.value }))}
                                className="w-20 rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2 text-sm outline-none focus:border-flame"
                                placeholder="1"
                              />
                            </td>
                            <td className="px-5 py-3 text-right text-stone">{pos ? ROUND_POINTS[pos] ?? 0 : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {entries.length > 0 && (
                  <div className="flex justify-end px-5 py-3">
                    <Button type="submit" loading={roundSubmitting}>Ghi nhận kết quả vòng này</Button>
                  </div>
                )}
              </form>

              {roundResultsData && roundResultsData.totals.length > 0 && (
                <div className="border-t border-parchment/60">
                  <div className="px-5 py-3 font-semibold">Kết quả tổng (cộng dồn điểm các vòng)</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-parchment/60 bg-cream/60 text-xs uppercase tracking-wide text-ash">
                        <tr>
                          <Th>Hạng cuộc đua</Th>
                          <Th>Mã ngựa</Th>
                          <Th>Mã jockey</Th>
                          <Th className="text-right">Tổng điểm</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...roundResultsData.totals]
                          .sort((a, b) => (a.raceFinishPosition ?? 999) - (b.raceFinishPosition ?? 999))
                          .map((t) => (
                            <tr key={t.raceEntryId} className="border-b border-parchment/40 last:border-0">
                              <td className="px-5 py-3 font-medium">{t.raceFinishPosition ?? '-'}</td>
                              <td className="px-5 py-3 font-mono text-xs text-stone">{shortId(t.horseId)}</td>
                              <td className="px-5 py-3 font-mono text-xs text-stone">{t.jockeyId ? shortId(t.jockeyId) : '-'}</td>
                              <td className="px-5 py-3 text-right font-semibold">{t.totalPoints}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          )}

          {raceResults.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-parchment/60 px-5 py-3">
            <span className="font-semibold">{selectedRace?.name ?? 'Cuộc đua'} — Kết quả đã ghi nhận</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-parchment/60 bg-cream/60 text-xs uppercase tracking-wide text-ash">
                <tr>
                  <Th>Hạng</Th>
                  <Th>Mã ngựa</Th>
                  <Th>Mã jockey</Th>
                  <Th>Thời gian về đích</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">Hành động</Th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r) => (
                  <tr key={r.id} className="border-b border-parchment/40 last:border-0 hover:bg-cream/40">
                    <td className="px-5 py-3 font-medium">{r.finishPosition ?? '-'}</td>
                    <td className="px-5 py-3 font-mono text-xs text-stone">{shortId(r.horseId)}</td>
                    <td className="px-5 py-3 font-mono text-xs text-stone">{r.jockeyId ? shortId(r.jockeyId) : '-'}</td>
                    <td className="px-5 py-3">{r.finishTimeMs != null ? `${(r.finishTimeMs / 1000).toFixed(2)}s` : '-'}</td>
                    <td className="px-5 py-3">
                      <Badge tone={RESULT_STATUS_TONE[r.statusName] ?? 'neutral'}>{r.statusName}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        {r.statusName === 'Pending' ? (
                          <Button variant="neutral" onClick={() => setConfirmForResultId(r.id)}>Xác nhận</Button>
                        ) : (
                          <span className="text-xs text-ash">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : hasRounds ? (
        <Card className="py-12 text-center text-stone">
          Cuộc đua này ghi nhận kết quả theo từng vòng đua ở trên — hãy ghi nhận đủ tất cả các vòng để có kết quả tổng.
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-parchment/60 px-5 py-3">
            <span className="font-semibold">{selectedRace?.name ?? 'Cuộc đua'} — Ghi nhận vị trí về đích</span>
          </div>
          <form onSubmit={onSubmitResults}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-parchment/60 bg-cream/60 text-xs uppercase tracking-wide text-ash">
                  <tr>
                    <Th>Làn</Th>
                    <Th>Ngựa</Th>
                    <Th>Mã jockey</Th>
                    <Th>Vị trí về đích *</Th>
                    <Th>Thời gian (ms)</Th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-stone">Chưa có lượt đăng ký nào ở trạng thái Confirmed cho cuộc đua này.</td></tr>
                  )}
                  {entries.map((en) => (
                    <tr key={en.id} className="border-b border-parchment/40 last:border-0">
                      <td className="px-5 py-3">{en.laneNo ?? '-'}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-ink">{en.horseName ?? `Ngựa ${shortId(en.horseId)}`}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-stone">{en.jockeyId ? shortId(en.jockeyId) : '-'}</td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min={1}
                          required
                          value={ranks[en.id] ?? ''}
                          onChange={(e) => setRanks((prev) => ({ ...prev, [en.id]: e.target.value }))}
                          className="w-20 rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2 text-sm outline-none focus:border-flame"
                          placeholder="1"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min={1}
                          value={times[en.id] ?? ''}
                          onChange={(e) => setTimes((prev) => ({ ...prev, [en.id]: e.target.value }))}
                          className="w-28 rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2 text-sm outline-none focus:border-flame"
                          placeholder="Tuỳ chọn"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {entries.length > 0 && (
              <div className="flex justify-end px-5 py-3">
                <Button type="submit" loading={submitting}>Ghi nhận kết quả</Button>
              </div>
            )}
          </form>
        </Card>
      )}
        </div>
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

      {confirmForResultId && (
        <ConfirmResultModal
          resultId={confirmForResultId}
          onClose={() => setConfirmForResultId(null)}
          onSaved={async () => { setConfirmForResultId(null); if (selectedRaceId) await loadDetail(selectedRaceId, hasRounds); }}
          onError={setError}
        />
      )}
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-5 py-3 font-semibold ${className}`}>{children}</th>;
}
