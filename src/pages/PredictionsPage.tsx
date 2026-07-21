import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  errorMessage,
  horsesApi,
  predictionsApi,
  raceEntriesApi,
  racesApi,
  type MyPredictionDto,
  type PredictionRewardDto,
  type RaceDto,
  type RaceEntryDto,
} from '../lib/api';
import { Alert, Badge, Button, Card, Spinner } from '../components/ui';

const selectClass = 'rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2.5 text-sm outline-none focus:border-flame';

export default function PredictionsPage() {
  const { user } = useAuth();
  const isSpectator = user?.roles.includes('Spectator');

  // ---- Form state ----
  const [raceId, setRaceId] = useState('');
  const [horseId, setHorseId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ---- Race/Horse option data ----
  const [races, setRaces] = useState<RaceDto[]>([]);
  const [horseNameMap, setHorseNameMap] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<RaceEntryDto[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // ---- Data state ----
  const [predictions, setPredictions] = useState<MyPredictionDto[]>([]);
  const [rewards, setRewards] = useState<PredictionRewardDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [preds, rews] = await Promise.all([
        predictionsApi.getMine(),
        predictionsApi.getMyRewards(),
      ]);
      // Handle both direct array and ApiResponse-wrapped shapes
      setPredictions(Array.isArray(preds) ? preds : ((preds as unknown as { data: MyPredictionDto[] }).data ?? []));
      setRewards(Array.isArray(rews) ? rews : ((rews as unknown as { data: PredictionRewardDto[] }).data ?? []));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      const raceResult = await racesApi.list({ pageNumber: 1, pageSize: 100 });
      setRaces(raceResult.items);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  const loadHorseNames = useCallback(async (raceEntries: RaceEntryDto[]) => {
    const uniqueHorseIds = Array.from(new Set(raceEntries.map((entry) => entry.horseId)));
    const results = await Promise.all(
      uniqueHorseIds.map(async (id) => {
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
    if (isSpectator) {
      void load();
      void loadOptions();
    }
  }, [isSpectator, load, loadOptions]);

  async function handleRaceChange(newRaceId: string) {
    setRaceId(newRaceId);
    setHorseId('');
    setEntries([]);
    if (!newRaceId) return;
    setEntriesLoading(true);
    try {
      const result = await raceEntriesApi.list({ raceId: newRaceId, pageNumber: 1, pageSize: 100 });
      setEntries(result.items);
      await loadHorseNames(result.items);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setEntriesLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!raceId || !horseId) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await predictionsApi.submit({
        raceId,
        predictedWinnerHorseId: horseId,
      });
      setSuccess('Gửi dự đoán thành công!');
      setRaceId('');
      setHorseId('');
      setEntries([]);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkNotified(rewardId: string) {
    setError(null);
    setSuccess(null);
    try {
      await predictionsApi.markRewardNotified(rewardId);
      setSuccess('Đã đánh dấu nhận thông báo thưởng.');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  // ---- Access guard ----
  if (!isSpectator) {
    return (
      <Card className="py-16 text-center text-stone">
        Chức năng này dành cho tài khoản Spectator.
      </Card>
    );
  }

  const statusTone = (s: string): 'green' | 'red' | 'neutral' | 'flame' => {
    switch (s) {
      case 'Correct': return 'green';
      case 'Wrong': return 'red';
      case 'Pending': return 'flame';
      default: return 'neutral';
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-3xl font-semibold">Dự đoán kết quả</h1>
        <p className="mt-1 text-stone">
          Gửi dự đoán, xem kết quả và nhận thưởng (FR33-FR35).
        </p>
      </div>

      {/* ---- Alerts ---- */}
      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {/* ---- Submit form ---- */}
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Gửi dự đoán mới</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Cuộc đua</span>
            <select
              value={raceId}
              onChange={(e) => void handleRaceChange(e.target.value)}
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
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Ngựa (dự đoán thắng)</span>
            <select
              value={horseId}
              onChange={(e) => setHorseId(e.target.value)}
              className={selectClass}
              disabled={!raceId || entriesLoading}
            >
              <option value="">
                {entriesLoading ? 'Đang tải...' : '-- Chọn ngựa --'}
              </option>
              {entries.map((entry) => {
                const name = horseNameMap[entry.horseId] ?? `Horse ${entry.horseId.slice(0, 8)}`;
                return (
                  <option key={entry.id} value={entry.horseId}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>
          <Button type="submit" loading={submitting} disabled={!raceId || !horseId}>
            Gửi dự đoán
          </Button>
        </form>
      </Card>

      {/* ---- Loading ---- */}
      {loading && (
        <div className="py-16 text-center text-stone">
          <Spinner /> Đang tải...
        </div>
      )}

      {/* ---- My Predictions Table ---- */}
      {!loading && (
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Dự đoán của tôi</h2>
          {predictions.length === 0 ? (
            <p className="py-8 text-center text-stone">Chưa có dự đoán nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-parchment/60 text-xs font-medium uppercase tracking-wider text-ash">
                    <th className="py-2 pr-4">Race ID</th>
                    <th className="py-2 pr-4">Horse ID</th>
                    <th className="py-2 pr-4">Trạng thái</th>
                    <th className="py-2 pr-4">Phần thưởng</th>
                    <th className="py-2">Ngày gửi</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => (
                    <tr key={p.predictionId} className="border-b border-parchment/30">
                      <td className="py-2.5 pr-4 font-mono text-xs">{p.raceId}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{p.predictedWinnerHorseId}</td>
                      <td className="py-2.5 pr-4">
                        <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                      </td>
                      <td className="py-2.5 pr-4">
                        {p.reward ? (
                          <span className="text-xs">
                            {p.reward.rewardType} — {p.reward.amount ?? '—'}{' '}
                            <Badge tone={statusTone(p.reward.status)}>{p.reward.status}</Badge>
                          </span>
                        ) : (
                          <span className="text-xs text-ash">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-xs text-stone">
                        {new Date(p.createdAtUtc).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ---- Rewards section ---- */}
      {!loading && (
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Thông báo thưởng</h2>
          {rewards.length === 0 ? (
            <p className="py-8 text-center text-stone">Chưa có thông báo thưởng nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-parchment/60 text-xs font-medium uppercase tracking-wider text-ash">
                    <th className="py-2 pr-4">Loại thưởng</th>
                    <th className="py-2 pr-4">Số lượng</th>
                    <th className="py-2 pr-4">Trạng thái</th>
                    <th className="py-2 pr-4">Ngày tạo</th>
                    <th className="py-2">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((r) => (
                    <tr key={r.rewardId} className="border-b border-parchment/30">
                      <td className="py-2.5 pr-4">{r.rewardType}</td>
                      <td className="py-2.5 pr-4">{r.amount ?? '—'}</td>
                      <td className="py-2.5 pr-4">
                        <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-stone">
                        {new Date(r.createdAtUtc).toLocaleString()}
                      </td>
                      <td className="py-2.5">
                        {r.status === 'Pending' && (
                          <Button
                            variant="neutral"
                            onClick={() => handleMarkNotified(r.rewardId)}
                          >
                            Đánh dấu đã nhận
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
