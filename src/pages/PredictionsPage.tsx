import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  entriesApi,
  errorMessage,
  horsesApi,
  predictionsApi,
  racesApi,
  tournamentsApi,
  type MyPredictionDto,
  type PredictionRewardDto,
  type RaceDto,
  type RaceEntryDto,
  type TournamentDto,
  type WalletDto,
} from '../lib/api';
import { Alert, Badge, Button, Card, Input, Spinner } from '../components/ui';

const selectClass =
  'rounded-[var(--radius-input)] border border-bone bg-paper px-3 py-2.5 text-sm outline-none transition focus:border-flame focus:ring-2 focus:ring-flame/30 disabled:cursor-not-allowed disabled:bg-cream disabled:text-driftwood';

/** Nhãn bước có số thứ tự (1 Giải → 2 Cuộc đua → 3 Ngựa → 4 Số điểm) để form dễ theo dõi hơn. */
function StepField({
  step,
  label,
  hint,
  children,
}: {
  step: number;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ash">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-flame/10 text-[10px] font-bold text-flame">
          {step}
        </span>
        {label}
      </span>
      {children}
      {hint && <span className="text-[11px] text-driftwood">{hint}</span>}
    </div>
  );
}

export default function PredictionsPage() {
  const { user } = useAuth();
  const isSpectator = user?.roles.includes('Spectator');

  // ---- Form state (chọn Giải trước, rồi Cuộc đua trong giải đó) ----
  const [tournamentId, setTournamentId] = useState('');
  const [raceId, setRaceId] = useState('');
  const [horseId, setHorseId] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ---- Wallet state ----
  const [wallet, setWallet] = useState<WalletDto | null>(null);

  // ---- Tournament/Race/Horse option data ----
  const [tournaments, setTournaments] = useState<TournamentDto[]>([]);
  const [tournamentRaces, setTournamentRaces] = useState<RaceDto[]>([]);
  const [tournamentRacesLoading, setTournamentRacesLoading] = useState(false);
  // Tên cuộc đua cho bảng "Dự đoán của tôi" - lấy riêng theo từng raceId xuất hiện trong lịch sử
  // dự đoán (có thể thuộc giải khác với giải đang chọn trong form), giống pattern horseNameMap.
  const [raceNameMap, setRaceNameMap] = useState<Record<string, string>>({});
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
      const [preds, rews, walletRes] = await Promise.all([
        predictionsApi.getMine(),
        predictionsApi.getMyRewards(),
        predictionsApi.getMyWallet(),
      ]);
      // Handle both direct array and ApiResponse-wrapped shapes
      const predsArr = Array.isArray(preds) ? preds : ((preds as unknown as { data: MyPredictionDto[] }).data ?? []);
      setPredictions(predsArr);
      setRewards(Array.isArray(rews) ? rews : ((rews as unknown as { data: PredictionRewardDto[] }).data ?? []));
      setWallet(walletRes.data ?? null);
      // Resolve horse names for the predicted horses so the table shows names instead of ids.
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
      // Resolve race names cho bảng lịch sử - độc lập với danh sách race trong form (form chỉ
      // load race của 1 giải đang chọn, còn lịch sử có thể trải trên nhiều giải khác nhau).
      const predRaceIds = Array.from(new Set(predsArr.map((p) => p.raceId)));
      const raceNameEntries = await Promise.all(
        predRaceIds.map(async (id) => {
          try { return [id, (await racesApi.getById(id)).name] as const; } catch { return null; }
        }),
      );
      setRaceNameMap((prev) => {
        const next = { ...prev };
        for (const e of raceNameEntries) if (e) next[e[0]] = e[1];
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
      const tournamentResult = await tournamentsApi.list({ pageNumber: 1, pageSize: 100 });
      setTournaments(tournamentResult.items);
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

  async function handleTournamentChange(newTournamentId: string) {
    setTournamentId(newTournamentId);
    setRaceId('');
    setHorseId('');
    setEntries([]);
    setTournamentRaces([]);
    if (!newTournamentId) return;
    setTournamentRacesLoading(true);
    try {
      const result = await racesApi.list({ tournamentId: newTournamentId, pageNumber: 1, pageSize: 100 });
      setTournamentRaces(result.items);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setTournamentRacesLoading(false);
    }
  }

  async function handleRaceChange(newRaceId: string) {
    setRaceId(newRaceId);
    setHorseId('');
    setEntries([]);
    if (!newRaceId) return;
    setEntriesLoading(true);
    try {
      const result = await entriesApi.list({ raceId: newRaceId, pageNumber: 1, pageSize: 100 });
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
    const stake = Number(stakeAmount);
    if (!raceId || !horseId || !stake || stake <= 0) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await predictionsApi.submit({
        raceId,
        predictedWinnerHorseId: horseId,
        stakeAmount: stake,
      });
      setSuccess('Gửi dự đoán thành công!');
      setTournamentId('');
      setRaceId('');
      setHorseId('');
      setStakeAmount('');
      setEntries([]);
      setTournamentRaces([]);
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
      case 'Refunded': return 'flame';
      default: return 'neutral';
    }
  };

  const statusLabel = (s: string): string => {
    switch (s) {
      case 'Correct': return 'Đúng';
      case 'Wrong': return 'Sai';
      case 'Pending': return 'Chờ kết quả';
      case 'Refunded': return 'Đã hoàn điểm';
      default: return s;
    }
  };

  const canSubmit = !!raceId && !!horseId && !!stakeAmount && Number(stakeAmount) > 0;

  // Chỉ cho chọn giải đấu CHƯA bắt đầu (TournamentStatus bên Racing: Draft=0, Published=1 -
  // chưa bắt đầu; Ongoing=2, Finished=3, Cancelled=4 - đã/đang diễn ra hoặc kết thúc).
  // Giải đã bắt đầu thì không cho gửi dự đoán mới nữa.
  const availableTournaments = tournaments.filter((t) => t.status < 2);

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Dự đoán kết quả</h1>
        <p className="mt-1 text-stone">
          Dự đoán ngựa về nhất, góp điểm vào quỹ chung và nhận thưởng chia theo tỷ lệ nếu đoán đúng.
        </p>
      </div>

      {/* ---- Alerts ---- */}
      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {/* ---- Wallet balance (hero) ---- */}
      <Card className="relative overflow-hidden border-marigold/60 bg-gradient-to-br from-cream via-paper to-marigold/25 p-6 shadow-[var(--shadow-glow)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ash">Số dư ví điểm</p>
            <p className="mt-1.5 text-4xl font-bold text-flame">
              {wallet ? wallet.balance.toLocaleString() : '--'}
              <span className="ml-2 text-base font-medium text-stone">điểm</span>
            </p>
          </div>
          <Badge tone="flame">Ví dự đoán</Badge>
        </div>
      </Card>

      {/* ---- Submit form (stepper: Giải → Cuộc đua → Ngựa → Số điểm) ---- */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-ink">Gửi dự đoán mới</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <StepField
              step={1}
              label="Giải đấu"
              hint="Chỉ hiện giải chưa bắt đầu - giải đã bắt đầu sẽ không nhận dự đoán mới"
            >
              <select
                value={tournamentId}
                onChange={(e) => void handleTournamentChange(e.target.value)}
                className={selectClass}
              >
                <option value="">-- Chọn giải đấu --</option>
                {availableTournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </StepField>
            <StepField step={2} label="Cuộc đua">
              <select
                value={raceId}
                onChange={(e) => void handleRaceChange(e.target.value)}
                className={selectClass}
                disabled={!tournamentId || tournamentRacesLoading}
              >
                <option value="">
                  {tournamentRacesLoading ? 'Đang tải...' : !tournamentId ? 'Chọn giải trước' : '-- Chọn cuộc đua --'}
                </option>
                {tournamentRaces.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </StepField>
            <StepField step={3} label="Ngựa dự đoán thắng">
              <select
                value={horseId}
                onChange={(e) => setHorseId(e.target.value)}
                className={selectClass}
                disabled={!raceId || entriesLoading}
              >
                <option value="">
                  {entriesLoading ? 'Đang tải...' : !raceId ? 'Chọn cuộc đua trước' : '-- Chọn ngựa --'}
                </option>
                {entries.map((entry) => {
                  const name = horseNameMap[entry.horseId] ?? '-';
                  return (
                    <option key={entry.id} value={entry.horseId}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </StepField>
            <StepField step={4} label="Số điểm dự đoán" hint="Điểm sẽ trừ ngay vào ví">
              <Input
                type="number"
                min={1}
                step="1"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="vd: 100"
                className="w-full sm:w-36"
              />
            </StepField>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-parchment/50 pt-4">
            <Button type="submit" loading={submitting} disabled={!canSubmit}>
              Gửi dự đoán
            </Button>
          </div>
        </form>
      </Card>

      {/* ---- Loading ---- */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-stone">
          <Spinner /> Đang tải...
        </div>
      )}

      {/* ---- My Predictions Table ---- */}
      {!loading && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-ink">
            Dự đoán của tôi{predictions.length > 0 && <span className="ml-2 text-sm font-normal text-ash">({predictions.length})</span>}
          </h2>
          {predictions.length === 0 ? (
            <p className="py-8 text-center text-stone">Chưa có dự đoán nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-parchment/60 text-xs font-medium uppercase tracking-wider text-ash">
                    <th className="py-2 pr-4">Cuộc đua</th>
                    <th className="py-2 pr-4">Ngựa</th>
                    <th className="py-2 pr-4">Điểm dự đoán</th>
                    <th className="py-2 pr-4">Trạng thái</th>
                    <th className="py-2 pr-4">Nhận được</th>
                    <th className="py-2 pr-4">Phần thưởng</th>
                    <th className="py-2">Ngày gửi</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => (
                    <tr key={p.id} className="border-b border-parchment/30 last:border-0">
                      <td className="py-2.5 pr-4">{raceNameMap[p.raceId] ?? '-'}</td>
                      <td className="py-2.5 pr-4">{horseNameMap[p.predictedWinnerHorseId] ?? '-'}</td>
                      <td className="py-2.5 pr-4 font-medium text-ink">{p.stakeAmount.toLocaleString()}</td>
                      <td className="py-2.5 pr-4">
                        <Badge tone={statusTone(p.status)}>{statusLabel(p.status)}</Badge>
                      </td>
                      <td className="py-2.5 pr-4">
                        {p.payoutAmount != null ? p.payoutAmount.toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 pr-4">
                        {p.reward ? (
                          <span className="text-xs">
                            {p.reward.rewardType} - {p.reward.amount ?? '-'}{' '}
                            <Badge tone={statusTone(p.reward.status)}>{p.reward.status}</Badge>
                          </span>
                        ) : (
                          <span className="text-xs text-ash">-</span>
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
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-ink">Thông báo thưởng</h2>
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
                    <tr key={r.id} className="border-b border-parchment/30 last:border-0">
                      <td className="py-2.5 pr-4">{r.rewardType}</td>
                      <td className="py-2.5 pr-4">{r.amount ?? '-'}</td>
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
                            onClick={() => handleMarkNotified(r.id)}
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
