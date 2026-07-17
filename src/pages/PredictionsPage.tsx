import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  errorMessage,
  predictionsApi,
  type MyPredictionDto,
  type PredictionRewardDto,
} from '../lib/api';
import { Alert, Badge, Button, Card, Input, Spinner } from '../components/ui';

export default function PredictionsPage() {
  const { user } = useAuth();
  const isSpectator = user?.roles.includes('Spectator');

  // ---- Form state ----
  const [raceId, setRaceId] = useState('');
  const [horseId, setHorseId] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    if (isSpectator) void load();
  }, [isSpectator, load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!raceId.trim() || !horseId.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await predictionsApi.submit({
        raceId: raceId.trim(),
        predictedWinnerHorseId: horseId.trim(),
      });
      setSuccess('Gửi dự đoán thành công!');
      setRaceId('');
      setHorseId('');
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
            <span className="text-xs font-medium text-ash">Race ID</span>
            <Input
              value={raceId}
              onChange={(e) => setRaceId(e.target.value)}
              placeholder="vd: 09721800-95aa-4e11-9658-1b2142c28eda"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-ash">Horse ID (dự đoán thắng)</span>
            <Input
              value={horseId}
              onChange={(e) => setHorseId(e.target.value)}
              placeholder="vd: 6e4a6d2f-f5c3-4846-9724-87480aed4cd4"
            />
          </div>
          <Button type="submit" loading={submitting}>
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
