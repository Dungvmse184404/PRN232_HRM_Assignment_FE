import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { errorMessage, racesApi, tournamentsApi, tracksApi, type TournamentDto, type TrackDto } from '../../lib/api';
import { Alert, Button, Card, Field, HoverChips, Input } from '../../components/ui';

const RACE_DRAFT_KEY = 'admin-race-draft';

interface RoundItem {
  key: number;
  roundNumber: number;
  name: string;
  scheduledTime: string;
}

let roundKey = 0;
function newRound(n: number, scheduledTime = ''): RoundItem {
  return { key: ++roundKey, roundNumber: n, name: '', scheduledTime };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Format a Date as a `datetime-local` input value in local time (no TZ conversion). */
function toLocalInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Add N days to a `datetime-local` string, correctly rolling over month/year boundaries. */
function addDays(dtLocal: string, days: number): string {
  if (!dtLocal) return '';
  const d = new Date(dtLocal);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return toLocalInputValue(d);
}

export default function AdminRacePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [tournament, setTournament] = useState<TournamentDto | null>(null);
  const [tracks, setTracks] = useState<TrackDto[]>([]);
  const restoredDraftRef = useRef(false);
  const [form, setForm] = useState({
    tournamentId: searchParams.get('tournamentId') ?? '',
    trackId: '',
    name: '',
    scheduledStart: '',
    scheduledEnd: '',
    distanceM: '1200',
    maxHorses: '8',
    registrationDeadline: '',
  });
  const [rounds, setRounds] = useState<RoundItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(isEdit);

  // Fetch race data for edit mode
  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await racesApi.getById(id);
      setForm({
        tournamentId: r.tournamentId,
        trackId: r.trackId,
        name: r.name,
        scheduledStart: r.scheduledStart.slice(0, 16),
        scheduledEnd: r.scheduledEnd?.slice(0, 16) ?? '',
        distanceM: String(r.distanceM),
        maxHorses: String(r.maxHorses),
        registrationDeadline: r.registrationDeadline?.slice(0, 16) ?? '',
      });
      if (r.rounds.length > 0) {
        setRounds(r.rounds.map((rr) => ({
          key: ++roundKey,
          roundNumber: rr.roundNumber,
          name: rr.name ?? '',
          scheduledTime: rr.scheduledTime?.slice(0, 16) ?? '',
        })));
      }
      // Cần ngày bắt đầu/kết thúc giải đấu để ràng buộc thời gian cuộc đua.
      tournamentsApi.getById(r.tournamentId).then(setTournament).catch(() => {});
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setFetching(false);
    }
  }, [id]);

  // Fetch tournament (tên + khoảng thời gian) cho chế độ tạo mới
  useEffect(() => {
    if (isEdit) {
      load();
    } else if (form.tournamentId) {
      tournamentsApi.getById(form.tournamentId).then(setTournament).catch(() => {});
    }
  }, [isEdit, form.tournamentId, load]);

  // Danh sách đường đua cho dropdown. Chế độ sửa: kèm cả track đã ngừng hoạt động để vẫn hiển thị được track hiện tại.
  useEffect(() => {
    tracksApi.list({ includeInactive: isEdit }).then(setTracks).catch(() => {});
  }, [isEdit]);

  // Khôi phục dữ liệu đã điền trước khi rời sang trang "Tạo đường đua mới" (xem goCreateTrack),
  // và tự chọn đường đua vừa tạo nếu quay lại kèm ?newTrackId=.
  useEffect(() => {
    if (isEdit || restoredDraftRef.current) return;
    restoredDraftRef.current = true;
    const newTrackId = searchParams.get('newTrackId');
    const draftRaw = sessionStorage.getItem(RACE_DRAFT_KEY);
    if (draftRaw) {
      sessionStorage.removeItem(RACE_DRAFT_KEY);
      try {
        const draft = JSON.parse(draftRaw) as { form: typeof form; rounds: RoundItem[] };
        setForm({ ...draft.form, trackId: newTrackId || draft.form.trackId });
        if (draft.rounds?.length) {
          setRounds(draft.rounds.map((r) => ({ ...r, key: ++roundKey })));
        }
      } catch {
        // draft hỏng - bỏ qua, giữ nguyên form mặc định
      }
    } else if (newTrackId) {
      setForm((f) => ({ ...f, trackId: newTrackId }));
    }
    if (newTrackId) {
      const next = new URLSearchParams(searchParams);
      next.delete('newTrackId');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goCreateTrack() {
    sessionStorage.setItem(RACE_DRAFT_KEY, JSON.stringify({ form, rounds }));
    navigate(`/admin/tracks/new?returnTo=${encodeURIComponent('/admin/races/new')}`);
  }

  // Khoảng ngày hợp lệ theo giải đấu, dùng cho thuộc tính min/max của input datetime-local
  const tournamentBounds = useMemo(() => {
    if (!tournament) return null;
    return { min: `${tournament.startDate.slice(0, 10)}T00:00`, max: `${tournament.endDate.slice(0, 10)}T23:59` };
  }, [tournament]);

  function upd(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addEndFromStart(days: number) {
    if (!form.scheduledStart) return;
    setForm((f) => ({ ...f, scheduledEnd: addDays(f.scheduledStart, days) }));
  }

  // Hạn đăng ký phải TRƯỚC thời gian bắt đầu, nên trừ ngày (không cộng như addEndFromStart).
  function addDeadlineFromStart(days: number) {
    if (!form.scheduledStart) return;
    setForm((f) => ({ ...f, registrationDeadline: addDays(f.scheduledStart, -days) }));
  }

  function addRound() {
    const next = rounds.length > 0 ? Math.max(...rounds.map(r => r.roundNumber)) + 1 : 1;
    const last = rounds[rounds.length - 1];
    // Gợi ý thời gian vòng mới = vòng trước + 1 ngày (tự nhảy tháng/năm nếu cần); nếu chưa có vòng nào, dùng giờ bắt đầu cuộc đua.
    const prefill = last?.scheduledTime ? addDays(last.scheduledTime, 1) : form.scheduledStart;
    setRounds((prev) => [...prev, newRound(next, prefill)]);
  }

  function validate(): string | null {
    if (!isEdit && !form.tournamentId) {
      return 'Thiếu thông tin giải đấu - vui lòng vào từ trang chi tiết giải đấu và bấm "Tạo cuộc đua mới".';
    }
    const b = tournamentBounds;
    if (b && form.scheduledStart && (form.scheduledStart < b.min || form.scheduledStart > b.max)) {
      return `Thời gian bắt đầu phải nằm trong thời hạn giải đấu (${tournament!.startDate} - ${tournament!.endDate}).`;
    }
    if (b && form.scheduledEnd && (form.scheduledEnd < b.min || form.scheduledEnd > b.max)) {
      return `Thời gian kết thúc phải nằm trong thời hạn giải đấu (${tournament!.startDate} - ${tournament!.endDate}).`;
    }
    if (form.scheduledStart && form.scheduledEnd && form.scheduledEnd < form.scheduledStart) {
      return 'Thời gian kết thúc phải sau thời gian bắt đầu.';
    }
    if (form.scheduledStart && form.registrationDeadline && form.registrationDeadline >= form.scheduledStart) {
      return 'Hạn đăng ký phải trước thời gian bắt đầu cuộc đua.';
    }
    for (const r of rounds) {
      if (!r.scheduledTime) continue;
      if (form.scheduledStart && r.scheduledTime < form.scheduledStart) {
        return `Thời gian vòng #${r.roundNumber} phải sau thời gian bắt đầu cuộc đua.`;
      }
      if (form.scheduledEnd && r.scheduledTime > form.scheduledEnd) {
        return `Thời gian vòng #${r.roundNumber} phải trước thời gian kết thúc cuộc đua.`;
      }
    }
    return null;
  }

  function removeRound(key: number) {
    setRounds((prev) => {
      const filtered = prev.filter((r) => r.key !== key);
      // Re-index round numbers
      return filtered.map((r, i) => ({ ...r, roundNumber: i + 1 }));
    });
  }

  function updateRound(key: number, field: keyof RoundItem, value: string | number) {
    setRounds((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        tournamentId: form.tournamentId,
        trackId: form.trackId,
        name: form.name,
        scheduledStart: new Date(form.scheduledStart).toISOString(),
        scheduledEnd: form.scheduledEnd ? new Date(form.scheduledEnd).toISOString() : undefined,
        distanceM: Number(form.distanceM),
        maxHorses: Number(form.maxHorses),
        registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : undefined,
        rounds: rounds.map((r) => ({
          roundNumber: r.roundNumber,
          name: r.name || undefined,
          scheduledTime: r.scheduledTime ? new Date(r.scheduledTime).toISOString() : undefined,
        })),
      };

      if (isEdit) {
        await racesApi.update(id!, {
          name: payload.name,
          scheduledStart: payload.scheduledStart,
          scheduledEnd: payload.scheduledEnd,
          distanceM: payload.distanceM,
          maxHorses: payload.maxHorses,
          registrationDeadline: payload.registrationDeadline,
        });
        navigate(`/races/${id}`, { replace: true });
      } else {
        const r = await racesApi.create(payload);
        navigate(`/races/${r.id}`, { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (fetching) return <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-flame border-t-transparent" /></div>;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-semibold tracking-tight">{isEdit ? `Sửa cuộc đua${tournament ? ` - ${tournament.name}` : ''}` : 'Tạo cuộc đua mới'}</h1>
      <Card className="mt-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          {error && <Alert kind="error">{error}</Alert>}

          <Field label="Giải đấu">
            <Input readOnly disabled value={form.tournamentId} placeholder="Chưa xác định giải đấu" />
            {tournament ? (
              <span className="mt-1 text-xs text-stone">
                Giải: {tournament.name} · {tournament.startDate} - {tournament.endDate}
              </span>
            ) : (
              <span className="mt-1 text-xs text-red-500">
                Không xác định được giải đấu - hãy vào trang chi tiết giải đấu và bấm "Tạo cuộc đua mới".
              </span>
            )}
          </Field>
          <Field label="Đường đua">
            <div className="flex gap-2">
              <select
                required
                disabled={isEdit}
                value={form.trackId}
                onChange={(e) => upd('trackId', e.target.value)}
                className="w-full rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-flame focus:ring-2 focus:ring-flame/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">-- Chọn đường đua --</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.lengthM}m{t.location ? ` · ${t.location}` : ''}{!t.isActive ? ' (ngừng hoạt động)' : ''}
                  </option>
                ))}
              </select>
              {!isEdit && (
                <Button type="button" variant="neutral" className="whitespace-nowrap" onClick={goCreateTrack}>
                  + Tạo đường đua
                </Button>
              )}
            </div>
            {!isEdit && tracks.length === 0 && (
              <span className="mt-1 text-xs text-ash">Chưa có đường đua nào - bấm "+ Tạo đường đua" để thêm mới.</span>
            )}
          </Field>
          <Field label="Tên cuộc đua">
            <Input required value={form.name} onChange={(e) => upd('name', e.target.value)} placeholder="Chung kết 1200m" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Khoảng cách (m)">
              <Input type="number" required min={1} value={form.distanceM} onChange={(e) => upd('distanceM', e.target.value)} />
            </Field>
            <Field label="Số ngựa tối đa">
              <Input type="number" required min={2} max={20} value={form.maxHorses} onChange={(e) => upd('maxHorses', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Thời gian bắt đầu"
              hint={tournamentBounds ? `Trong thời hạn giải đấu (${tournament!.startDate} - ${tournament!.endDate})` : undefined}
            >
              <Input
                type="datetime-local" required value={form.scheduledStart}
                min={tournamentBounds?.min} max={tournamentBounds?.max}
                onChange={(e) => upd('scheduledStart', e.target.value)}
              />
            </Field>
            <Field label="Thời gian kết thúc (dự kiến)">
              <div className="group relative">
                <Input
                  type="datetime-local" value={form.scheduledEnd}
                  min={form.scheduledStart || tournamentBounds?.min} max={tournamentBounds?.max}
                  onChange={(e) => upd('scheduledEnd', e.target.value)}
                />
                <HoverChips
                  options={[{ label: '+1 ngày', value: 1 }, { label: '+3 ngày', value: 3 }, { label: '+1 tuần', value: 7 }]}
                  onPick={addEndFromStart}
                  disabled={!form.scheduledStart}
                />
              </div>
            </Field>
          </div>
          <Field label="Hạn đăng ký" hint="Phải trước thời gian bắt đầu cuộc đua.">
            <div className="group relative">
              <Input
                type="datetime-local" value={form.registrationDeadline}
                max={form.scheduledStart || tournamentBounds?.max}
                onChange={(e) => upd('registrationDeadline', e.target.value)}
              />
              <HoverChips
                options={[{ label: '-1 ngày', value: 1 }, { label: '-3 ngày', value: 3 }, { label: '-1 tuần', value: 7 }]}
                onPick={addDeadlineFromStart}
                disabled={!form.scheduledStart}
              />
            </div>
          </Field>

          <div className="border-t border-parchment/60 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">Vòng đua ({rounds.length})</span>
              <Button type="button" variant="neutral" onClick={addRound}>+ Thêm vòng</Button>
            </div>
            {rounds.length > 0 && (
              <div className="mt-3 space-y-3">
                {rounds.map((r) => (
                  <div key={r.key} className="grid grid-cols-[3.5rem_1fr_1fr_auto] items-end gap-2 rounded-[var(--radius-input)] border border-bone bg-cream/40 p-3">
                    <div className="min-w-0">
                      <span className="text-xs text-ash">Vòng #</span>
                      <input type="number" min={1} value={r.roundNumber} readOnly
                        className="w-full rounded-[var(--radius-input)] border border-bone bg-paper/50 px-3 py-2.5 text-sm text-stone outline-none" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-ash">Tên (tuỳ chọn)</span>
                      <Input className="w-full" value={r.name} onChange={(e) => updateRound(r.key, 'name', e.target.value)} placeholder="Bán kết" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-ash">Thời gian</span>
                      <Input
                        type="datetime-local" className="w-full" value={r.scheduledTime}
                        min={form.scheduledStart} max={form.scheduledEnd || tournamentBounds?.max}
                        onChange={(e) => updateRound(r.key, 'scheduledTime', e.target.value)}
                      />
                    </div>
                    <Button type="button" variant="danger" onClick={() => removeRound(r.key)}>X</Button>
                  </div>
                ))}
              </div>
            )}
            {rounds.length === 0 && (
              <p className="mt-2 text-xs text-ash">Chưa có vòng đua nào. Thêm vòng để xếp lịch thi đấu.</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="neutral" type="button" onClick={() => navigate(-1)}>Hủy</Button>
            <Button type="submit" loading={loading}>{isEdit ? 'Lưu' : 'Tạo'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
