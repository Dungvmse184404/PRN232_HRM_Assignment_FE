import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  adminPredictionsApi,
  entriesApi,
  errorMessage,
  horsesApi,
  predictionsApi,
  racesApi,
  type HorseDto,
  type PendingBetsSummaryDto,
  type RaceDto,
  type RaceEntryDto,
  type RaceForecastDto,
  type RaceStatus,
} from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { Alert, Badge, Button, Card, Field, Spinner } from '../../components/ui';

const RACE_STATUS: Record<number, { label: string; tone: 'neutral' | 'green' | 'red' | 'flame' }> = {
  0: { label: 'Đã lên lịch', tone: 'neutral' },
  1: { label: 'Mở đăng ký', tone: 'green' },
  2: { label: 'Đóng đăng ký', tone: 'neutral' },
  3: { label: 'Đang diễn ra', tone: 'flame' },
  4: { label: 'Đã kết thúc', tone: 'neutral' },
  5: { label: 'Đã hủy', tone: 'red' },
};

const ENTRY_STATUS_TONE: Record<string, 'neutral' | 'green' | 'red' | 'flame'> = {
  Registered: 'neutral',
  PendingApproval: 'neutral',
  Approved: 'flame',
  Confirmed: 'green',
  Rejected: 'red',
  Withdrawn: 'neutral',
};

// Chuyển trạng thái cuộc đua (Admin). Race.ChangeStatus() không ràng buộc thứ tự ở domain,
// nhưng FE chỉ gợi ý các bước "tiến" hợp lý + hủy, tránh admin bấm nhầm lùi trạng thái.
const NEXT_RACE_STATUS: Record<number, { label: string; value: RaceStatus }[]> = {
  0: [{ label: 'Mở đăng ký', value: 'RegistrationOpen' }, { label: 'Hủy cuộc đua', value: 'Cancelled' }],
  1: [{ label: 'Đóng đăng ký', value: 'RegistrationClosed' }, { label: 'Hủy cuộc đua', value: 'Cancelled' }],
  2: [{ label: 'Bắt đầu chạy', value: 'Ongoing' }, { label: 'Hủy cuộc đua', value: 'Cancelled' }],
  3: [{ label: 'Kết thúc cuộc đua', value: 'Finished' }, { label: 'Hủy cuộc đua', value: 'Cancelled' }],
  4: [],
  5: [],
};

export default function RaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const [race, setRace] = useState<RaceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Register horse form
  const [myHorses, setMyHorses] = useState<HorseDto[]>([]);
  const [selectedHorseId, setSelectedHorseId] = useState('');
  const [registering, setRegistering] = useState(false);
  const [regMsg, setRegMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Ngựa của TÔI đã đăng ký (RaceEntry) cho cuộc đua này - hiện danh sách để chủ ngựa theo dõi.
  const [myEntries, setMyEntries] = useState<RaceEntryDto[]>([]);
  const [myEntriesLoading, setMyEntriesLoading] = useState(false);

  // Đổi trạng thái cuộc đua (Admin)
  const [changingStatus, setChangingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  // Cược chưa hoàn tiền của race đã Cancelled (bước hoàn tiền lỗi giữa chừng) - xem mục 14
  // trong PREDICTION_BETTING_PLAN.md (Prediction service là service khác, tự query riêng).
  const [pendingRefund, setPendingRefund] = useState<PendingBetsSummaryDto | null>(null);
  const [refunding, setRefunding] = useState(false);

  // Dự đoán AI (xác suất top-1 mỗi ngựa) - chức năng tách biệt với betting. Mọi role xem được;
  // Admin tạo/cập nhật + thấy tỉ lệ cược gợi ý. Tên ngựa lấy từ race entries để map theo horseId.
  const [forecast, setForecast] = useState<RaceForecastDto | null>(null);
  const [horseNames, setHorseNames] = useState<Record<string, string>>({});
  const [forecastLoading, setForecastLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [forecastMsg, setForecastMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  const isHorseOwner = user?.roles.includes('HorseOwner');
  const isRefereeOrAdmin = isAdmin || user?.roles.includes('RaceReferee');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setRace(await racesApi.getById(id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  // Race đã Cancelled (status 5) - kiểm tra còn cược Submitted chưa hoàn tiền không (vd bước
  // refund lỗi lần trước). Không chặn trang nếu Prediction service tạm lỗi - chỉ bỏ qua banner.
  const checkPendingRefund = useCallback(async () => {
    if (!id) return;
    try {
      const res = await adminPredictionsApi.getPendingBetsSummary(id);
      const summary = res.data ?? null;
      setPendingRefund(summary && summary.pendingCount > 0 ? summary : null);
    } catch {
      setPendingRefund(null);
    }
  }, [id]);

  useEffect(() => {
    if (race?.status === 5) void checkPendingRefund();
    else setPendingRefund(null);
  }, [race?.status, checkPendingRefund]);

  // Tải dự đoán AI + map tên ngựa (từ entries). Prediction service là service riêng - nếu chưa có
  // forecast (404) hoặc service tạm lỗi thì chỉ ẩn phần này, không chặn trang.
  const loadForecast = useCallback(async () => {
    if (!id) return;
    setForecastLoading(true);
    try {
      const [fRes, entries] = await Promise.all([
        predictionsApi.getRaceForecast(id).catch(() => null),
        entriesApi.list({ raceId: id, pageSize: 100 }).catch(() => null),
      ]);
      if (entries) {
        const map: Record<string, string> = {};
        for (const e of entries.items) map[e.horseId] = e.horseName ?? '';
        setHorseNames(map);
      }
      setForecast(fRes?.success ? fRes.data : null);
    } finally {
      setForecastLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadForecast(); }, [loadForecast]);

  const generateForecast = useCallback(async () => {
    if (!id) return;
    setGenerating(true);
    setForecastMsg(null);
    try {
      const res = await adminPredictionsApi.generateRaceForecast(id, true);
      if (res.success && res.data) {
        setForecast(res.data);
        setForecastMsg({ kind: 'success', text: 'Đã tạo dự đoán AI.' });
      } else {
        setForecastMsg({ kind: 'error', text: res.message ?? 'Tạo dự đoán AI thất bại.' });
      }
    } catch (err) {
      setForecastMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setGenerating(false);
    }
  }, [id]);

  const loadMyEntries = useCallback(async () => {
    if (!id || !user?.userId) { setMyEntries([]); return; }
    setMyEntriesLoading(true);
    try {
      const res = await entriesApi.list({ raceId: id, pageSize: 100 });
      setMyEntries(res.items.filter((e) => e.ownerUserId === user.userId));
    } catch {
      setMyEntries([]);
    } finally {
      setMyEntriesLoading(false);
    }
  }, [id, user?.userId]);

  useEffect(() => { void loadMyEntries(); }, [loadMyEntries]);

  async function openRegisterForm() {
    setShowForm(true);
    setRegMsg(null);
    try {
      const result = await horsesApi.list({ pageSize: 50 });
      setMyHorses(result.items);
    } catch {
      setMyHorses([]);
    }
  }

  async function changeRaceStatus(status: RaceStatus, label: string) {
    if (!id) return;

    // Hủy cuộc đua ảnh hưởng tới tiền cược bên Prediction service - xử lý riêng để hiện popup
    // "sẽ hoàn X điểm cho Y người" trước khi xác nhận (mục 14, PREDICTION_BETTING_PLAN.md).
    if (status === 'Cancelled') {
      await handleCancelRace(label);
      return;
    }

    if (!window.confirm(`Đổi trạng thái cuộc đua thành "${label}"?`)) return;
    setChangingStatus(true);
    setStatusMsg(null);
    try {
      await racesApi.changeStatus(id, status);
      setStatusMsg({ kind: 'success', text: `Đã đổi trạng thái thành "${label}".` });
      await load();
    } catch (err) {
      setStatusMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleCancelRace(label: string) {
    if (!id) return;

    // Xem trước tác động hoàn tiền (không chặn hủy nếu Prediction service tạm lỗi - chỉ mất
    // phần số liệu trong popup xác nhận).
    let pending: PendingBetsSummaryDto | null = null;
    try {
      const res = await adminPredictionsApi.getPendingBetsSummary(id);
      pending = res.data ?? null;
    } catch {
      pending = null;
    }

    const confirmMsg = pending && pending.pendingCount > 0
      ? `Cuộc đua này có ${pending.pendingCount} lượt dự đoán, tổng ${pending.totalStake.toLocaleString()} điểm sẽ được HOÀN LẠI cho người dự đoán. Xác nhận hủy cuộc đua?`
      : `Đổi trạng thái cuộc đua thành "${label}"?`;
    if (!window.confirm(confirmMsg)) return;

    setChangingStatus(true);
    setStatusMsg(null);
    try {
      await racesApi.changeStatus(id, 'Cancelled');

      if (pending && pending.pendingCount > 0) {
        try {
          await adminPredictionsApi.cancelRacePredictions(id);
          setStatusMsg({
            kind: 'success',
            text: `Đã hủy cuộc đua và hoàn ${pending.totalStake.toLocaleString()} điểm cho ${pending.pendingCount} người dự đoán.`,
          });
        } catch (refundErr) {
          // Race đã Cancelled thành công nhưng bước hoàn tiền lỗi - phân biệt rõ với lỗi đổi
          // trạng thái để admin biết cần bấm "Hoàn tiền ngay" (banner bên dưới), không phải thử
          // hủy race lại từ đầu.
          setStatusMsg({
            kind: 'error',
            text: `Đã hủy cuộc đua nhưng HOÀN TIỀN THẤT BẠI: ${errorMessage(refundErr)}. Vui lòng dùng nút "Hoàn tiền ngay" bên dưới.`,
          });
        }
      } else {
        setStatusMsg({ kind: 'success', text: `Đã đổi trạng thái thành "${label}".` });
      }
      await load();
    } catch (err) {
      setStatusMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleRetryRefund() {
    if (!id) return;
    setRefunding(true);
    setStatusMsg(null);
    try {
      await adminPredictionsApi.cancelRacePredictions(id);
      setStatusMsg({ kind: 'success', text: 'Đã hoàn tiền cho người dự đoán.' });
      await checkPendingRefund();
    } catch (err) {
      setStatusMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setRefunding(false);
    }
  }

  async function registerHorse() {
    if (!id || !selectedHorseId) return;
    setRegistering(true);
    setRegMsg(null);
    try {
      await entriesApi.register(id, selectedHorseId);
      setRegMsg({ kind: 'success', text: 'Đăng ký thành công!' });
      setSelectedHorseId('');
      setShowForm(false);
      await Promise.all([load(), loadMyEntries()]);
    } catch (err) {
      setRegMsg({ kind: 'error', text: errorMessage(err) });
    } finally {
      setRegistering(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!race) return <Alert kind="error">Không tìm thấy cuộc đua.</Alert>;

  const canRegister = race.status === 0 || race.status === 1;
  const notFull = race.entryCount < race.maxHorses;
  const registeredHorseIds = new Set(myEntries.map((e) => e.horseId));
  const registrableHorses = myHorses.filter((h) => !registeredHorseIds.has(h.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to={`/tournaments/${race.tournamentId}`} className="text-sm text-flame hover:underline">
          &larr; {race.tournamentName}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{race.name}</h1>
            <p className="mt-1 text-stone">{race.trackName} · {race.distanceM}m</p>
          </div>
          <Badge tone={RACE_STATUS[race.status]?.tone ?? 'neutral'}>
            {RACE_STATUS[race.status]?.label ?? race.statusName}
          </Badge>
        </div>
        {isRefereeOrAdmin && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <Link to={`/admin/races/${race.id}/edit`}><Button variant="neutral">Sửa cuộc đua</Button></Link>
                {NEXT_RACE_STATUS[race.status]?.map((opt) => (
                  <Button
                    key={opt.value}
                    variant="neutral"
                    loading={changingStatus}
                    onClick={() => void changeRaceStatus(opt.value, opt.label)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </>
            )}
            <Link to={`/racing/confirm-result?raceId=${race.id}`}><Button>Ghi nhận kết quả</Button></Link>
          </div>
        )}
        {isAdmin && statusMsg && (
          <div className="mt-3"><Alert kind={statusMsg.kind}>{statusMsg.text}</Alert></div>
        )}
        {isAdmin && pendingRefund && (
          <div className="mt-3">
            <Alert kind="error">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  Cuộc đua này đã hủy nhưng còn {pendingRefund.pendingCount} lượt dự đoán
                  ({pendingRefund.totalStake.toLocaleString()} điểm) CHƯA ĐƯỢC HOÀN TIỀN.
                </span>
                <Button variant="danger" loading={refunding} onClick={handleRetryRefund}>
                  Hoàn tiền ngay
                </Button>
              </div>
            </Alert>
          </div>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ash">Thông tin</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Khoảng cách" value={`${race.distanceM}m`} />
            <Row label="Số ngựa tối đa" value={`${race.maxHorses}`} />
            <Row label="Đã đăng ký" value={
              <span className={race.entryCount >= race.maxHorses ? 'text-red-600 font-semibold' : ''}>
                {race.entryCount}/{race.maxHorses}
                {race.entryCount >= race.maxHorses && ' (đầy)'}
              </span>
            } />
            <Row label="Bắt đầu" value={new Date(race.scheduledStart).toLocaleString('vi-VN')} />
            {race.scheduledEnd && <Row label="Kết thúc" value={new Date(race.scheduledEnd).toLocaleString('vi-VN')} />}
            {race.registrationDeadline && (
              <Row label="Hạn đăng ký" value={new Date(race.registrationDeadline).toLocaleString('vi-VN')} />
            )}
          </dl>
        </Card>

        {race.rounds.length > 0 && (
          <Card className="p-5 md:col-span-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ash">Vòng đua ({race.rounds.length})</h3>
            <div className="mt-3 divide-y divide-parchment/40">
              {race.rounds.sort((a, b) => a.roundNumber - b.roundNumber).map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-ink">Vòng {r.roundNumber}</span>
                    {r.name && <span className="ml-2 text-stone">- {r.name}</span>}
                  </div>
                  <div className="text-xs text-ash">
                    {r.scheduledTime ? new Date(r.scheduledTime).toLocaleString('vi-VN') : 'Chưa có lịch'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Register Horse - Horse Owner only */}
      {isHorseOwner && (
        <Card>
          <h3 className="text-lg font-semibold">Đăng ký ngựa tham gia</h3>

          {/* Danh sách ngựa của TÔI đã đăng ký cho cuộc đua này */}
          {myEntriesLoading ? (
            <p className="mt-3 text-sm text-stone">Đang tải danh sách ngựa đã đăng ký…</p>
          ) : myEntries.length > 0 ? (
            <div className="mt-3 divide-y divide-parchment/40 rounded-[var(--radius-input)] border border-parchment/60">
              {myEntries.map((en) => (
                <div key={en.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-ink">{en.horseName ?? '-'}</span>
                    {en.laneNo != null && <span className="ml-2 text-xs text-ash">Làn {en.laneNo}</span>}
                    {en.jockeyId && <span className="ml-2 text-xs text-ash">· Đã có jockey</span>}
                  </div>
                  <Badge tone={ENTRY_STATUS_TONE[en.statusName] ?? 'neutral'}>{en.statusName}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-ash">Bạn chưa đăng ký ngựa nào cho cuộc đua này.</p>
          )}

          {regMsg && <div className="mt-3"><Alert kind={regMsg.kind}>{regMsg.text}</Alert></div>}

          {!canRegister && (
            <p className="mt-2 text-sm text-ash">Cuộc đua đã kết thúc đăng ký hoặc không mở đăng ký.</p>
          )}
          {canRegister && !notFull && (
            <p className="mt-2 text-sm text-red-600">Cuộc đua đã đầy, không thể đăng ký thêm.</p>
          )}

          {canRegister && notFull && !showForm && (
            <div className="mt-4">
              <Button onClick={openRegisterForm}>Đăng ký ngựa tham gia</Button>
            </div>
          )}

          {canRegister && notFull && showForm && (
            <div className="mt-4 flex flex-col gap-3">
              <Field label="Chọn ngựa của bạn">
                {registrableHorses.length === 0 ? (
                  <div className="rounded-[var(--radius-input)] border border-bone bg-cream/40 px-4 py-2.5 text-sm text-stone">
                    {myHorses.length === 0 ? (
                      <>Bạn chưa có ngựa nào.{' '}<Link to="/horses" className="text-flame hover:underline">Tạo ngựa mới</Link></>
                    ) : (
                      'Tất cả ngựa của bạn đã được đăng ký cho cuộc đua này.'
                    )}
                  </div>
                ) : (
                  <select
                    value={selectedHorseId}
                    onChange={(e) => setSelectedHorseId(e.target.value)}
                    className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-flame focus:ring-2 focus:ring-flame/30 w-full"
                  >
                    <option value="">-- Chọn ngựa --</option>
                    {registrableHorses.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.breed || 'N/A'} · {h.genderName})
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <div className="flex gap-2">
                <Button loading={registering} disabled={!selectedHorseId} onClick={registerHorse}>Xác nhận đăng ký</Button>
                <Button variant="neutral" onClick={() => setShowForm(false)}>Hủy</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Dự đoán AI - xác suất top-1 mỗi ngựa. Xem: mọi role. Tạo + xem odds: Admin. */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Dự đoán AI</h3>
            {forecast && (
              <Badge tone="flame">
                {forecast.horses.length} ngựa · {new Date(forecast.generatedAtUtc).toLocaleString('vi-VN')}
              </Badge>
            )}
          </div>
          {isAdmin && (
            <Button loading={generating} onClick={generateForecast}>
              {forecast ? 'Tạo lại dự đoán' : 'Tạo dự đoán AI'}
            </Button>
          )}
        </div>

        {forecastMsg && <div className="mt-3"><Alert kind={forecastMsg.kind}>{forecastMsg.text}</Alert></div>}

        {forecastLoading && !forecast ? (
          <p className="mt-3 text-sm text-stone">Đang tải dự đoán AI…</p>
        ) : forecast ? (
          <div className="mt-4 overflow-hidden rounded-[var(--radius-input)] border border-parchment/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream/50 text-xs uppercase tracking-wide text-ash">
                  <th className="px-4 py-2 text-left font-semibold">#</th>
                  <th className="px-4 py-2 text-left font-semibold">Ngựa</th>
                  <th className="px-4 py-2 text-left font-semibold">Xác suất thắng</th>
                  {isAdmin && <th className="px-4 py-2 text-right font-semibold">Tỉ lệ gợi ý</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-parchment/40">
                {[...forecast.horses]
                  .sort((a, b) => b.winProbability - a.winProbability)
                  .map((h, i) => (
                    <tr key={h.horseId} className="align-top">
                      <td className="px-4 py-2.5 text-ash">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-ink">{horseNames[h.horseId] || h.horseId.slice(0, 8)}</div>
                        {h.reasoning && (
                          <div className="mt-0.5 text-xs text-ash">{h.reasoning}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-parchment/50">
                            <div
                              className="h-full rounded-full bg-flame"
                              style={{ width: `${Math.round(h.winProbability * 100)}%` }}
                            />
                          </div>
                          <span className="font-semibold text-ink">{(h.winProbability * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-right font-medium text-ink">
                          {h.suggestedOdds != null ? h.suggestedOdds.toFixed(2) : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ash">
            Chưa có dự đoán AI cho cuộc đua này.{isAdmin ? ' Bấm "Tạo dự đoán AI" để sinh.' : ''}
          </p>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ash">{label}</dt>
      <dd className="font-medium text-ink text-right">{value}</dd>
    </div>
  );
}
