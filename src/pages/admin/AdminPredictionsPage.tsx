import { useCallback, useEffect, useState } from 'react';
import {
  adminPredictionsApi,
  errorMessage,
  type AdminPredictionDto,
  type PredictionConfigDto,
  type RewardType,
} from '../../lib/api';
import { Alert, Badge, Button, Card, Input, Spinner } from '../../components/ui';

const REWARD_TYPES: RewardType[] = ['Points', 'Voucher', 'Cash'];

interface GradeResult {
  totalPredictions: number;
  correctCount: number;
  wrongCount: number;
  rewardCreatedCount: number;
}

export default function AdminPredictionsPage() {
  // ---- Config form state ----
  const [cfgRaceId, setCfgRaceId] = useState('');
  const [cfgRules, setCfgRules] = useState('');
  const [cfgRewardType, setCfgRewardType] = useState<RewardType>('Points');
  const [cfgRewardValue, setCfgRewardValue] = useState('');
  const [cfgDeadline, setCfgDeadline] = useState('');
  const [cfgSaving, setCfgSaving] = useState(false);

  // ---- Grade form state ----
  const [gradeRaceId, setGradeRaceId] = useState('');
  const [gradeHorseId, setGradeHorseId] = useState('');
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);

  // ---- Data state ----
  const [configs, setConfigs] = useState<PredictionConfigDto[]>([]);
  const [predictions, setPredictions] = useState<AdminPredictionDto[]>([]);
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
      setPredictions(Array.isArray(preds) ? preds : ((preds as unknown as { data: AdminPredictionDto[] }).data ?? []));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      });
      setSuccess('Tao cau hinh thanh cong!');
      setCfgRaceId('');
      setCfgRules('');
      setCfgRewardType('Points');
      setCfgRewardValue('');
      setCfgDeadline('');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCfgSaving(false);
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
      setSuccess('Cham ket qua thanh cong!');
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
      default: return 'neutral';
    }
  };

  const selectClass = 'rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2.5 text-sm outline-none focus:border-flame';

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-3xl font-semibold">Quan ly du doan</h1>
        <p className="mt-1 text-stone">
          Tao cau hinh, cham ket qua va xem danh sach du doan (FR-33..36 Admin).
        </p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {/* ======== A. Create prediction config ======== */}
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Tao cau hinh du doan</h2>
        <form onSubmit={handleCreateConfig} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ash">Race ID</span>
              <Input
                value={cfgRaceId}
                onChange={(e) => setCfgRaceId(e.target.value)}
                placeholder="vd: 09721800-95aa-4e11-9658-1b2142c28eda"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ash">Rules</span>
              <Input
                value={cfgRules}
                onChange={(e) => setCfgRules(e.target.value)}
                placeholder="vd: Chon ngua thang"
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
          </div>
          <div className="pt-1">
            <Button type="submit" loading={cfgSaving}>
              Luu cau hinh
            </Button>
          </div>
        </form>
      </Card>

      {/* ======== B. Configs table ======== */}
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Danh sach cau hinh</h2>
        {loading ? (
          <div className="py-8 text-center text-stone"><Spinner /> Loading...</div>
        ) : configs.length === 0 ? (
          <p className="py-8 text-center text-stone">Chua co cau hinh nao.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-parchment/60 text-xs font-medium uppercase tracking-wider text-ash">
                  <th className="py-2 pr-4">Config ID</th>
                  <th className="py-2 pr-4">Race ID</th>
                  <th className="py-2 pr-4">Reward Type</th>
                  <th className="py-2 pr-4">Reward Value</th>
                  <th className="py-2 pr-4">Deadline</th>
                  <th className="py-2 pr-4">Trang thai</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((c) => (
                  <tr key={c.configId} className="border-b border-parchment/30">
                    <td className="py-2.5 pr-4 font-mono text-xs">{c.configId}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">{c.raceId}</td>
                    <td className="py-2.5 pr-4">{c.rewardType}</td>
                    <td className="py-2.5 pr-4">{c.rewardValue ?? '--'}</td>
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
                        <Button variant="danger" onClick={() => toggleConfig(c.configId, true)}>
                          Disable
                        </Button>
                      ) : (
                        <Button variant="neutral" onClick={() => toggleConfig(c.configId, false)}>
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
        <h2 className="mb-4 text-lg font-semibold">Cham ket qua du doan</h2>
        <form onSubmit={handleGrade} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Race ID</span>
            <Input
              value={gradeRaceId}
              onChange={(e) => setGradeRaceId(e.target.value)}
              placeholder="vd: 09721800-95aa-4e11-9658-1b2142c28eda"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Winning Horse ID</span>
            <Input
              value={gradeHorseId}
              onChange={(e) => setGradeHorseId(e.target.value)}
              placeholder="vd: 6e4a6d2f-f5c3-4846-9724-87480aed4cd4"
            />
          </div>
          <Button type="submit" loading={grading}>
            Cham ket qua
          </Button>
        </form>

        {gradeResult && (
          <div className="mt-4 rounded-[var(--radius-input)] border border-parchment/60 bg-cream/40 p-4">
            <h3 className="mb-2 text-sm font-semibold">Ket qua cham diem:</h3>
            <dl className="grid grid-cols-2 gap-y-1 text-sm sm:grid-cols-4">
              <dt className="text-ash">Total Predictions</dt>
              <dd className="font-medium text-ink">{gradeResult.totalPredictions}</dd>
              <dt className="text-ash">Correct</dt>
              <dd className="font-medium text-green-700">{gradeResult.correctCount}</dd>
              <dt className="text-ash">Wrong</dt>
              <dd className="font-medium text-red-600">{gradeResult.wrongCount}</dd>
              <dt className="text-ash">Rewards Created</dt>
              <dd className="font-medium text-ink">{gradeResult.rewardCreatedCount}</dd>
            </dl>
          </div>
        )}
      </Card>

      {/* ======== D. All predictions table ======== */}
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Danh sach du doan</h2>
        {loading ? (
          <div className="py-8 text-center text-stone"><Spinner /> Loading...</div>
        ) : predictions.length === 0 ? (
          <p className="py-8 text-center text-stone">Chua co du doan nao.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-parchment/60 text-xs font-medium uppercase tracking-wider text-ash">
                  <th className="py-2 pr-4">Prediction ID</th>
                  <th className="py-2 pr-4">Race ID</th>
                  <th className="py-2 pr-4">Spectator ID</th>
                  <th className="py-2 pr-4">Horse ID</th>
                  <th className="py-2 pr-4">Trang thai</th>
                  <th className="py-2">Created At</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p) => (
                  <tr key={p.predictionId} className="border-b border-parchment/30">
                    <td className="py-2.5 pr-4 font-mono text-xs">{p.predictionId}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">{p.raceId}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">{p.spectatorUserId}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">{p.predictedWinnerHorseId}</td>
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
