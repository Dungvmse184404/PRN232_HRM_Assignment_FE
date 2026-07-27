import { useCallback, useEffect, useState } from 'react';
import {
  adminPredictionsApi,
  entriesApi,
  errorMessage,
  horsesApi,
  racesApi,
  usersApi,
  type AdminPredictionDto,
  type PredictionConfigDto,
  type RaceDto,
  type RaceEntryDto,
  type RewardType,
  type UserDto,
} from '../../lib/api';
import { Alert, Badge, Button, Card, Input, Spinner } from '../../components/ui';

const REWARD_TYPES: RewardType[] = ['Points', 'Voucher', 'Cash'];
const QUICK_ADJUST_AMOUNT = 1000;

interface GradeResult {
  totalPredictions: number;
  correctCount: number;
  wrongCount: number;
  refundedCount: number;
  rewardCreatedCount: number;
  totalPool: number;
  houseCut: number;
  distributablePool: number;
}

export default function AdminPredictionsPage() {
  // ---- Config form state ----
  const [cfgRaceId, setCfgRaceId] = useState('');
  const [cfgRules, setCfgRules] = useState('');
  const [cfgRewardType, setCfgRewardType] = useState<RewardType>('Points');
  const [cfgRewardValue, setCfgRewardValue] = useState('');
  const [cfgDeadline, setCfgDeadline] = useState('');
  const [cfgMinStake, setCfgMinStake] = useState('');
  const [cfgMaxStake, setCfgMaxStake] = useState('');
  const [cfgHouseCutPercent, setCfgHouseCutPercent] = useState('');
  const [cfgSaving, setCfgSaving] = useState(false);

  // ---- Wallet adjust ("cộng điểm cho spectator") state ----
  const [spectators, setSpectators] = useState<UserDto[]>([]);
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState(String(QUICK_ADJUST_AMOUNT));
  const [adjusting, setAdjusting] = useState(false);
  const [adjustedBalance, setAdjustedBalance] = useState<number | null>(null);

  // ---- Grade form state ----
  const [gradeRaceId, setGradeRaceId] = useState('');
  const [gradeHorseId, setGradeHorseId] = useState('');
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [gradeEntries, setGradeEntries] = useState<RaceEntryDto[]>([]);
  const [gradeEntriesLoading, setGradeEntriesLoading] = useState(false);

  // ---- Data state ----
  const [configs, setConfigs] = useState<PredictionConfigDto[]>([]);
  const [predictions, setPredictions] = useState<AdminPredictionDto[]>([]);
  const [races, setRaces] = useState<RaceDto[]>([]);
  const [horseNameMap, setHorseNameMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfgs, preds] = await Promise.all([
        adminPredictionsApi.getConfigs(),
        adminPredictionsApi.getAllPredictions(),
      ]);
      setConfigs(Array.isArray(cfgs) ? cfgs : ((cfgs as unknown as { data: PredictionConfigDto[] }).data ?? []));
      const predsArr = Array.isArray(preds) ? preds : ((preds as unknown as { data: AdminPredictionDto[] }).data ?? []);
      setPredictions(predsArr);
      // Resolve horse names for predicted horses so the table shows names instead of ids.
      const predHorseIds = Array.from(new Set(predsArr.map((p) => p.predictedWinnerHorseId)));
      const nameEntries = await Promise.all(
        predHorseIds.map(async (id) => {
          try { return [id, (await horsesApi.get(id)).name] as const; } catch { return null; }
        }),
      );
      setHorseNameMap((prev) => {
        const next = { ...prev };
        for (const e of nameEntries) if (e) next[e[0]] = e[1];
        return next;
      });
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
    try {
      const userResult = await usersApi.list({ role: 'Spectator', pageNumber: 1, pageSize: 200 });
      setSpectators(userResult.items);
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
    void load();
    void loadOptions();
  }, [load, loadOptions]);

  async function handleGradeRaceChange(newRaceId: string) {
    setGradeRaceId(newRaceId);
    setGradeHorseId('');
    setGradeEntries([]);
    if (!newRaceId) return;
    setGradeEntriesLoading(true);
    try {
      const result = await entriesApi.list({ raceId: newRaceId, pageNumber: 1, pageSize: 100 });
      setGradeEntries(result.items);
      await loadHorseNames(result.items);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setGradeEntriesLoading(false);
    }
  }

  // ---- Create config ----
  async function handleCreateConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!cfgRaceId.trim()) return;
    setCfgSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await adminPredictionsApi.createConfig({
        raceId: cfgRaceId.trim(),
        rules: cfgRules.trim() || null,
        rewardType: cfgRewardType,
        rewardValue: cfgRewardValue ? Number(cfgRewardValue) : null,
        predictionDeadline: cfgDeadline || null,
        minStake: cfgMinStake ? Number(cfgMinStake) : null,
        maxStake: cfgMaxStake ? Number(cfgMaxStake) : null,
        // Người dùng nhập % (vd 7 = 7%); backend nhận tỷ lệ 0..1 nên chia 100.
        // Để trống = dùng mặc định server-side (7%, xem PREDICTION_BETTING_PLAN.md mục 11.2).
        houseCutPercent: cfgHouseCutPercent ? Number(cfgHouseCutPercent) / 100 : null,
      });
      setSuccess('Tạo cấu hình thành công!');
      setCfgRaceId('');
      setCfgRules('');
      setCfgRewardType('Points');
      setCfgRewardValue('');
      setCfgDeadline('');
      setCfgMinStake('');
      setCfgMaxStake('');
      setCfgHouseCutPercent('');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCfgSaving(false);
    }
  }

  // ---- Adjust spectator wallet ----
  async function handleAdjustWallet(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(adjustAmount);
    if (!adjustUserId || !amount) return;
    setAdjusting(true);
    setError(null);
    setSuccess(null);
    setAdjustedBalance(null);
    try {
      const result = await adminPredictionsApi.adjustWallet(adjustUserId, {
        amount,
        note: 'Admin cộng điểm thủ công (UI)',
      });
      setAdjustedBalance(result.data?.balance ?? null);
      setSuccess('Đã cộng điểm cho spectator!');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAdjusting(false);
    }
  }

  // ---- Toggle config ----
  async function toggleConfig(configId: string, isActive: boolean) {
    setError(null);
    setSuccess(null);
    try {
      if (isActive) {
        await adminPredictionsApi.disableConfig(configId);
      } else {
        await adminPredictionsApi.enableConfig(configId);
      }
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  // ---- Grade race ----
  async function handleGrade(e: React.FormEvent) {
    e.preventDefault();
    if (!gradeRaceId.trim() || !gradeHorseId.trim()) return;
    setGrading(true);
    setError(null);
    setSuccess(null);
    setGradeResult(null);
    try {
      const result = await adminPredictionsApi.gradeRace(gradeRaceId.trim(), {
        winningHorseId: gradeHorseId.trim(),
      });
      // Handle both direct and ApiResponse-wrapped shapes
      const data = (result as { data?: GradeResult }).data ?? result;
      setGradeResult(data as GradeResult);
      setSuccess('Chấm kết quả thành công!');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setGrading(false);
    }
  }

  const statusTone = (s: string): 'green' | 'red' | 'neutral' | 'flame' => {
    switch (s) {
      case 'Correct': return 'green';
      case 'Wrong': return 'red';
      case 'Submitted': return 'flame';
      case 'Refunded': return 'flame';
      default: return 'neutral';
    }
  };

  const selectClass = 'rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2.5 text-sm outline-none focus:border-flame';

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-3xl font-semibold">Quản lý dự đoán</h1>
        <p className="mt-1 text-stone">
          Tạo cấu hình, chấm kết quả và xem danh sách dự đoán.
        </p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {/* ======== A. Create prediction config ======== */}
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Tạo cấu hình dự đoán</h2>
        <form onSubmit={handleCreateConfig} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ash">Cuộc đua</span>
              <select
                value={cfgRaceId}
                onChange={(e) => setCfgRaceId(e.target.value)}
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
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ash">Rules</span>
              <Input
                value={cfgRules}
                onChange={(e) => setCfgRules(e.target.value)}
                placeholder="vd: Chọn ngựa thắng"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ash">Reward Type</span>
              <select
                value={cfgRewardType}
                onChange={(e) => setCfgRewardType(e.target.value as RewardType)}
                className={selectClass}
              >
                {REWARD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ash">Reward Value</span>
              <Input
                type="number"
                value={cfgRewardValue}
                onChange={(e) => setCfgRewardValue(e.target.value)}
                placeholder="vd: 100"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ash">Prediction Deadline</span>
              <Input
                type="datetime-local"
                value={cfgDeadline}
                onChange={(e) => setCfgDeadline(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ash">Min Stake (điểm)</span>
              <Input
                type="number"
                value={cfgMinStake}
                onChange={(e) => setCfgMinStake(e.target.value)}
                placeholder="Không giới hạn"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ash">Max Stake (điểm)</span>
              <Input
                type="number"
                value={cfgMaxStake}
                onChange={(e) => setCfgMaxStake(e.target.value)}
                placeholder="Không giới hạn"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ash">House Cut (%)</span>
              <Input
                type="number"
                value={cfgHouseCutPercent}
                onChange={(e) => setCfgHouseCutPercent(e.target.value)}
                placeholder="Mặc định 7%"
              />
            </div>
          </div>
          <div className="pt-1">
            <Button type="submit" loading={cfgSaving}>
              Lưu cấu hình
            </Button>
          </div>
        </form>
      </Card>

      {/* ======== A2. Cộng điểm cho spectator (FR-43) ======== */}
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Cộng điểm cho Spectator (Dev)</h2>
        <form onSubmit={handleAdjustWallet} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Spectator</span>
            <select
              value={adjustUserId}
              onChange={(e) => setAdjustUserId(e.target.value)}
              className={selectClass}
            >
              <option value="">-- Chọn spectator --</option>
              {spectators.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Số điểm (âm = trừ)</span>
            <Input
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              className="w-32"
            />
          </div>
          <Button type="submit" loading={adjusting} disabled={!adjustUserId || !Number(adjustAmount)}>
            {Number(adjustAmount) ? `Cộng ${Number(adjustAmount).toLocaleString()} điểm` : 'Cộng điểm'}
          </Button>
        </form>
        {adjustedBalance != null && (
          <p className="mt-3 text-sm text-stone">
            Số dư mới của spectator: <span className="font-semibold text-ink">{adjustedBalance.toLocaleString()}</span> điểm
          </p>
        )}
      </Card>

      {/* ======== B. Configs table ======== */}
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Danh sách cấu hình</h2>
        {loading ? (
          <div className="py-8 text-center text-stone"><Spinner /> Loading...</div>
        ) : configs.length === 0 ? (
          <p className="py-8 text-center text-stone">Chưa có cấu hình nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-parchment/60 text-xs font-medium uppercase tracking-wider text-ash">
                  <th className="py-2 pr-4">Cuộc đua</th>
                  <th className="py-2 pr-4">Reward Type</th>
                  <th className="py-2 pr-4">Reward Value</th>
                  <th className="py-2 pr-4">Stake Min/Max</th>
                  <th className="py-2 pr-4">House Cut</th>
                  <th className="py-2 pr-4">Deadline</th>
                  <th className="py-2 pr-4">Trạng thái</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((c) => (
                  <tr key={c.id} className="border-b border-parchment/30">
                    <td className="py-2.5 pr-4">{races.find((r) => r.id === c.raceId)?.name ?? '-'}</td>
                    <td className="py-2.5 pr-4">{c.rewardType}</td>
                    <td className="py-2.5 pr-4">{c.rewardValue ?? '--'}</td>
                    <td className="py-2.5 pr-4 text-xs">
                      {c.minStake ?? '--'} / {c.maxStake ?? '--'}
                    </td>
                    <td className="py-2.5 pr-4 text-xs">{(c.houseCutPercent * 100).toFixed(0)}%</td>
                    <td className="py-2.5 pr-4 text-xs text-stone">
                      {c.predictionDeadline ? new Date(c.predictionDeadline).toLocaleString() : '--'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={c.isActive ? 'green' : 'red'}>
                        {c.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="py-2.5">
                      {c.isActive ? (
                        <Button variant="danger" onClick={() => toggleConfig(c.id, true)}>
                          Disable
                        </Button>
                      ) : (
                        <Button variant="neutral" onClick={() => toggleConfig(c.id, false)}>
                          Enable
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

      {/* ======== C. Grade race predictions ======== */}
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Chấm kết quả dự đoán</h2>
        <form onSubmit={handleGrade} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Cuộc đua</span>
            <select
              value={gradeRaceId}
              onChange={(e) => void handleGradeRaceChange(e.target.value)}
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
            <span className="text-xs font-medium text-ash">Ngựa thắng</span>
            <select
              value={gradeHorseId}
              onChange={(e) => setGradeHorseId(e.target.value)}
              className={selectClass}
              disabled={!gradeRaceId || gradeEntriesLoading}
            >
              <option value="">
                {gradeEntriesLoading ? 'Đang tải...' : '-- Chọn ngựa --'}
              </option>
              {gradeEntries.map((entry) => {
                const name = horseNameMap[entry.horseId] ?? '-';
                return (
                  <option key={entry.id} value={entry.horseId}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>
          <Button type="submit" loading={grading} disabled={!gradeRaceId || !gradeHorseId}>
            Chấm kết quả
          </Button>
        </form>

        {gradeResult && (
          <div className="mt-4 rounded-[var(--radius-input)] border border-parchment/60 bg-cream/40 p-4">
            <h3 className="mb-2 text-sm font-semibold">Kết quả chấm điểm (parimutuel):</h3>
            <dl className="grid grid-cols-2 gap-y-1 text-sm sm:grid-cols-4">
              <dt className="text-ash">Total Predictions</dt>
              <dd className="font-medium text-ink">{gradeResult.totalPredictions}</dd>
              <dt className="text-ash">Correct</dt>
              <dd className="font-medium text-green-700">{gradeResult.correctCount}</dd>
              <dt className="text-ash">Wrong</dt>
              <dd className="font-medium text-red-600">{gradeResult.wrongCount}</dd>
              <dt className="text-ash">Refunded (no winner)</dt>
              <dd className="font-medium text-ink">{gradeResult.refundedCount}</dd>
              <dt className="text-ash">Total Pool</dt>
              <dd className="font-medium text-ink">{gradeResult.totalPool.toLocaleString()}</dd>
              <dt className="text-ash">House Cut</dt>
              <dd className="font-medium text-ink">{gradeResult.houseCut.toLocaleString()}</dd>
              <dt className="text-ash">Distributed to winners</dt>
              <dd className="font-medium text-ink">{gradeResult.distributablePool.toLocaleString()}</dd>
              <dt className="text-ash">Rewards Created</dt>
              <dd className="font-medium text-ink">{gradeResult.rewardCreatedCount}</dd>
            </dl>
          </div>
        )}
      </Card>

      {/* ======== D. All predictions table ======== */}
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Danh sách dự đoán</h2>
        {loading ? (
          <div className="py-8 text-center text-stone"><Spinner /> Loading...</div>
        ) : predictions.length === 0 ? (
          <p className="py-8 text-center text-stone">Chưa có dự đoán nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-parchment/60 text-xs font-medium uppercase tracking-wider text-ash">
                  <th className="py-2 pr-4">Cuộc đua</th>
                  <th className="py-2 pr-4">Ngựa dự đoán</th>
                  <th className="py-2 pr-4">Điểm dự đoán</th>
                  <th className="py-2 pr-4">Nhận được</th>
                  <th className="py-2 pr-4">Trạng thái</th>
                  <th className="py-2">Created At</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p) => (
                  <tr key={p.id} className="border-b border-parchment/30">
                    <td className="py-2.5 pr-4">{races.find((r) => r.id === p.raceId)?.name ?? '-'}</td>
                    <td className="py-2.5 pr-4">{horseNameMap[p.predictedWinnerHorseId] ?? '-'}</td>
                    <td className="py-2.5 pr-4">{p.stakeAmount.toLocaleString()}</td>
                    <td className="py-2.5 pr-4">{p.payoutAmount != null ? p.payoutAmount.toLocaleString() : '-'}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={statusTone(p.status)}>{p.status}</Badge>
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
    </div>
  );
}
