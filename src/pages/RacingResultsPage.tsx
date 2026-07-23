import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  errorMessage,
  horsesApi,
  jockeyPerformanceApi,
  ownerResultsApi,
  racesApi,
  racingResultsApi,
  type HorseDto,
  type HorseResultsDto,
  type JockeyPerformanceDto,
  type RaceDto,
  type RaceLiveStatusDto,
  type RaceResultsSummaryDto,
  type TournamentStandingRowDto,
} from '../lib/api';
import { Alert, Badge, Button, Card, Spinner } from '../components/ui';

const selectClass = 'rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2.5 text-sm outline-none focus:border-flame';

function shortId(id: string) {
  return id.slice(0, 8);
}

function formatFinishTime(ms: number | null) {
  if (ms == null) return '-';
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function RacingResultsPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('Admin');
  const isReferee = user?.roles.includes('RaceReferee');
  const isHorseOwner = user?.roles.includes('HorseOwner');
  const isJockey = user?.roles.includes('Jockey');

  // ---- B. Chọn cuộc đua ----
  const [races, setRaces] = useState<RaceDto[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [raceDataLoading, setRaceDataLoading] = useState(false);
  const [raceResults, setRaceResults] = useState<RaceResultsSummaryDto | null>(null);
  const [liveStatus, setLiveStatus] = useState<RaceLiveStatusDto | null>(null);
  const [standings, setStandings] = useState<TournamentStandingRowDto[]>([]);
  const [horseNameMap, setHorseNameMap] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedRace = races.find((r) => r.id === selectedRaceId) ?? null;

  // ---- G. FR31: Kết quả ngựa của tôi ----
  const [ownerHorses, setOwnerHorses] = useState<HorseDto[]>([]);
  const [selectedHorseId, setSelectedHorseId] = useState('');
  const [horseResults, setHorseResults] = useState<HorseResultsDto | null>(null);
  const [horseResultsLoading, setHorseResultsLoading] = useState(false);

  // ---- H. FR32: Hiệu suất Jockey ----
  const [jockeyPerf, setJockeyPerf] = useState<JockeyPerformanceDto | null>(null);
  const [jockeyLoading, setJockeyLoading] = useState(false);

  const loadHorseNames = useCallback(async (horseIds: string[]) => {
    const uniqueIds = Array.from(new Set(horseIds));
    const results = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const horse = await horsesApi.get(id);
          return [id, horse.name] as const;
        } catch {
          return null;
        }
      }),
    );
    const newMap: Record<string, string> = {};
    for (const entry of results) {
      if (entry) newMap[entry[0]] = entry[1];
    }
    setHorseNameMap((prev) => ({ ...prev, ...newMap }));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const result = await racesApi.list({ pageNumber: 1, pageSize: 100 });
        setRaces(result.items);
      } catch (err) {
        setError(errorMessage(err));
      }
    })();
  }, []);

  useEffect(() => {
    if (!isHorseOwner) return;
    (async () => {
      try {
        const result = await horsesApi.list({ pageNumber: 1, pageSize: 100 });
        setOwnerHorses(result.items);
      } catch (err) {
        setError(errorMessage(err));
      }
    })();
  }, [isHorseOwner]);

  const loadJockeyPerformance = useCallback(async () => {
    setJockeyLoading(true);
    setError(null);
    try {
      const perf = await jockeyPerformanceApi.getMyPerformance();
      setJockeyPerf(perf);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setJockeyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isJockey) void loadJockeyPerformance();
  }, [isJockey, loadJockeyPerformance]);

  const loadRaceData = useCallback(
    async (race: RaceDto) => {
      setRaceDataLoading(true);
      setError(null);
      try {
        const [results, status, standingsResult] = await Promise.all([
          racingResultsApi.getRaceResults(race.id),
          racingResultsApi.getRaceLiveStatus(race.id),
          racingResultsApi.getTournamentStandings(race.tournamentId),
        ]);
        setRaceResults(results);
        setLiveStatus(status);
        setStandings(standingsResult);
        const horseIds = [
          ...results.results.map((r) => r.horseId),
          ...standingsResult.map((r) => r.horseId),
        ];
        await loadHorseNames(horseIds);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setRaceDataLoading(false);
      }
    },
    [loadHorseNames],
  );

  async function handleSelectRace(raceId: string) {
    setSelectedRaceId(raceId);
    setSuccess(null);
    setRaceResults(null);
    setLiveStatus(null);
    setStandings([]);
    if (!raceId) return;
    const race = races.find((r) => r.id === raceId);
    if (!race) return;
    await loadRaceData(race);
  }

  async function handlePublish() {
    if (!selectedRace) return;
    if (!window.confirm('Bạn có chắc muốn công bố kết quả cuộc đua này?')) return;
    setPublishing(true);
    setError(null);
    setSuccess(null);
    try {
      await racingResultsApi.publishRaceResults(selectedRace.id, { prizes: [] });
      setSuccess('Công bố kết quả thành công!');
      await loadRaceData(selectedRace);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  async function handleSelectHorse(horseId: string) {
    setSelectedHorseId(horseId);
    setHorseResults(null);
    if (!horseId) return;
    setHorseResultsLoading(true);
    setError(null);
    try {
      const result = await ownerResultsApi.getHorseResults(horseId);
      setHorseResults(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setHorseResultsLoading(false);
    }
  }

  const raceStatusTone = (s: string): 'green' | 'red' | 'neutral' | 'flame' => {
    switch (s) {
      case 'Finished': return 'green';
      case 'Cancelled': return 'red';
      case 'Ongoing': return 'flame';
      default: return 'neutral';
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ---- A. Header ---- */}
      <div>
        <h1 className="text-3xl font-semibold">Kết quả cuộc đua</h1>
        <p className="mt-1 text-stone">
          Xem kết quả, bảng xếp hạng, trạng thái cuộc đua và hiệu suất cá nhân.
        </p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {/* ---- B. Chọn cuộc đua ---- */}
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Chọn cuộc đua</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Cuộc đua</span>
            <select
              value={selectedRaceId}
              onChange={(e) => void handleSelectRace(e.target.value)}
              className={selectClass}
            >
              <option value="">-- Chọn cuộc đua --</option>
              {races.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          {(isAdmin || isReferee) && selectedRace && (
            <Button onClick={handlePublish} loading={publishing} disabled={raceDataLoading}>
              Chốt kết quả
            </Button>
          )}
        </div>
      </Card>

      {raceDataLoading && (
        <div className="py-10 text-center text-stone">
          <Spinner /> Đang tải dữ liệu cuộc đua...
        </div>
      )}

      {!raceDataLoading && selectedRace && (
        <>
          {/* ---- E. Trạng thái cuộc đua ---- */}
          {liveStatus && (
            <Card className="p-5">
              <h2 className="mb-4 text-lg font-semibold">Trạng thái cuộc đua</h2>
              <dl className="grid grid-cols-2 gap-y-3 text-sm sm:grid-cols-4">
                <dt className="text-ash">Trạng thái</dt>
                <dd className="font-medium text-ink">
                  <Badge tone={raceStatusTone(liveStatus.raceStatusName)}>{liveStatus.raceStatusName}</Badge>
                </dd>
                <dt className="text-ash">Kết quả tạm thời</dt>
                <dd className="font-medium text-ink">
                  <Badge tone={liveStatus.hasUnofficialResults ? 'flame' : 'neutral'}>
                    {liveStatus.hasUnofficialResults ? 'Có' : 'Chưa có'}
                  </Badge>
                </dd>
                <dt className="text-ash">Số vi phạm</dt>
                <dd className="font-medium text-ink">{liveStatus.violationCount}</dd>
                <dt className="text-ash">Biên bản đua</dt>
                <dd className="font-medium text-ink">
                  <Badge tone={liveStatus.hasRaceReport ? 'green' : 'neutral'}>
                    {liveStatus.hasRaceReport ? 'Đã có' : 'Chưa có'}
                  </Badge>
                </dd>
              </dl>
            </Card>
          )}

          {/* ---- C. Kết quả cuộc đua ---- */}
          {raceResults && (
            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Kết quả cuộc đua</h2>
                <div className="flex items-center gap-2">
                  <Badge tone={raceResults.isOfficial ? 'green' : 'neutral'}>
                    {raceResults.isOfficial ? 'Chính thức' : 'Chưa chính thức'}
                  </Badge>
                  <Badge tone="neutral">{raceResults.resultStatusName}</Badge>
                </div>
              </div>
              {raceResults.results.length === 0 ? (
                <p className="py-8 text-center text-stone">Chưa có kết quả.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-parchment/60 text-xs font-medium uppercase tracking-wider text-ash">
                        <th className="py-2 pr-4">Hạng</th>
                        <th className="py-2 pr-4">Ngựa</th>
                        <th className="py-2 pr-4">Nài ngựa</th>
                        <th className="py-2 pr-4">Thời gian về đích</th>
                        <th className="py-2 pr-4">Điểm</th>
                        <th className="py-2">Tiền thưởng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {raceResults.results.map((item) => (
                        <tr key={item.horseId} className="border-b border-parchment/30">
                          <td className="py-2.5 pr-4 font-medium">{item.rank}</td>
                          <td className="py-2.5 pr-4">
                            {horseNameMap[item.horseId] ?? `Ngựa ${shortId(item.horseId)}`}
                          </td>
                          <td className="py-2.5 pr-4 text-xs text-stone">
                            {item.jockeyId ? shortId(item.jockeyId) : '-'}
                          </td>
                          <td className="py-2.5 pr-4">{formatFinishTime(item.finishTimeMs)}</td>
                          <td className="py-2.5 pr-4">{item.points}</td>
                          <td className="py-2.5">{item.prizeAmount ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* ---- D. Bảng xếp hạng giải đấu ---- */}
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Bảng xếp hạng giải đấu</h2>
            {standings.length === 0 ? (
              <p className="py-8 text-center text-stone">Chưa có dữ liệu xếp hạng.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-parchment/60 text-xs font-medium uppercase tracking-wider text-ash">
                      <th className="py-2 pr-4">Hạng</th>
                      <th className="py-2 pr-4">Ngựa</th>
                      <th className="py-2 pr-4">Tổng điểm</th>
                      <th className="py-2 pr-4">Số trận thắng</th>
                      <th className="py-2 pr-4">Top 3</th>
                      <th className="py-2">Tổng thưởng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => (
                      <tr key={row.horseId} className="border-b border-parchment/30">
                        <td className="py-2.5 pr-4 font-medium">{row.rank}</td>
                        <td className="py-2.5 pr-4">
                          {horseNameMap[row.horseId] ?? `Ngựa ${shortId(row.horseId)}`}
                        </td>
                        <td className="py-2.5 pr-4">{row.totalPoints}</td>
                        <td className="py-2.5 pr-4">{row.wins}</td>
                        <td className="py-2.5 pr-4">{row.top3Count}</td>
                        <td className="py-2.5">{row.totalPrize}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ---- G. FR31: Kết quả ngựa của tôi ---- */}
      {isHorseOwner && (
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Kết quả ngựa của tôi</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium text-ash">Ngựa</span>
              <select
                value={selectedHorseId}
                onChange={(e) => void handleSelectHorse(e.target.value)}
                className={selectClass}
              >
                <option value="">-- Chọn ngựa --</option>
                {ownerHorses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {horseResultsLoading && (
            <div className="py-8 text-center text-stone">
              <Spinner /> Đang tải kết quả...
            </div>
          )}

          {!horseResultsLoading && horseResults && (
            <div className="mt-4 rounded-[var(--radius-input)] border border-parchment/60 bg-cream/40 p-4">
              <dl className="grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-4">
                <dt className="text-ash">Tổng số cuộc đua</dt>
                <dd className="font-medium text-ink">{horseResults.totalRaces}</dd>
                <dt className="text-ash">Số trận thắng</dt>
                <dd className="font-medium text-ink">{horseResults.wins}</dd>
                <dt className="text-ash">Top 3</dt>
                <dd className="font-medium text-ink">{horseResults.top3Count}</dd>
                <dt className="text-ash">Tổng điểm</dt>
                <dd className="font-medium text-ink">{horseResults.totalPoints}</dd>
                <dt className="text-ash">Tổng thưởng</dt>
                <dd className="font-medium text-ink">{horseResults.totalPrize}</dd>
              </dl>

              {horseResults.results.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-parchment/60 text-xs font-medium uppercase tracking-wider text-ash">
                        <th className="py-2 pr-4">Hạng</th>
                        <th className="py-2 pr-4">Điểm</th>
                        <th className="py-2 pr-4">Thời gian về đích</th>
                        <th className="py-2">Tiền thưởng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {horseResults.results.map((item, idx) => (
                        <tr key={idx} className="border-b border-parchment/30">
                          <td className="py-2.5 pr-4 font-medium">{item.rank}</td>
                          <td className="py-2.5 pr-4">{item.points}</td>
                          <td className="py-2.5 pr-4">{formatFinishTime(item.finishTimeMs)}</td>
                          <td className="py-2.5">{item.prizeAmount ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ---- H. FR32: Hiệu suất Jockey ---- */}
      {isJockey && (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Hiệu suất của tôi</h2>
            <Button variant="neutral" onClick={() => void loadJockeyPerformance()} loading={jockeyLoading}>
              Tải hiệu suất của tôi
            </Button>
          </div>

          {jockeyLoading && !jockeyPerf && (
            <div className="py-8 text-center text-stone">
              <Spinner /> Đang tải...
            </div>
          )}

          {jockeyPerf && (
            <dl className="grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-3">
              <dt className="text-ash">Tổng số cuộc đua</dt>
              <dd className="font-medium text-ink">{jockeyPerf.totalRaces}</dd>
              <dt className="text-ash">Số trận thắng</dt>
              <dd className="font-medium text-ink">{jockeyPerf.wins}</dd>
              <dt className="text-ash">Top 3</dt>
              <dd className="font-medium text-ink">{jockeyPerf.top3Count}</dd>
              <dt className="text-ash">Hạng trung bình</dt>
              <dd className="font-medium text-ink">{jockeyPerf.averageRank.toFixed(2)}</dd>
              <dt className="text-ash">Tỷ lệ thắng</dt>
              <dd className="font-medium text-ink">{jockeyPerf.winRate}%</dd>
              <dt className="text-ash">Tổng thưởng</dt>
              <dd className="font-medium text-ink">{jockeyPerf.totalPrize}</dd>
            </dl>
          )}
        </Card>
      )}
    </div>
  );
}
