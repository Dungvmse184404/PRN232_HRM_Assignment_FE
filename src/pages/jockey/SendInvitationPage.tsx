import { useCallback, useEffect, useState } from 'react';
import {
  errorMessage,
  jockeyApi,
  racingApi,
  type RaceDto,
  type RaceEntryDto,
  type PagedResult,
  type UserDto,
} from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { Alert, Badge, Button, Card, Field, Input, Spinner } from '../../components/ui';
import {
  ClockIcon,
  HorseshoeIcon,
  MapPinIcon,
  RulerIcon,
  SendIcon,
} from '../../components/icons';

const JOCKEY_SEARCH_DEBOUNCE_MS = 300;

export default function SendInvitationPage() {
  const { user } = useAuth();
  const [races, setRaces] = useState<RaceDto[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [raceId, setRaceId] = useState('');
  const [horseId, setHorseId] = useState('');
  // Ngựa của TÔI đã đăng ký (RaceEntry) cho cuộc đua đang chọn - chỉ những ngựa này mới mời jockey được,
  // vì BE yêu cầu phải có RaceEntry(raceId, horseId) tồn tại trước (RaceEntry.NotFound nếu chưa đăng ký).
  const [myEntries, setMyEntries] = useState<RaceEntryDto[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [jockeyQuery, setJockeyQuery] = useState('');
  const [jockeyResults, setJockeyResults] = useState<UserDto[]>([]);
  const [jockeySearching, setJockeySearching] = useState(false);
  const [selectedJockey, setSelectedJockey] = useState<UserDto | null>(null);
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInit = useCallback(async () => {
    setLoadingInit(true);
    try {
      const raceData: PagedResult<RaceDto> = await racingApi.listRaces({ pageSize: 100 });
      setRaces(raceData.items);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingInit(false);
    }
  }, []);

  useEffect(() => { void loadInit(); }, [loadInit]);

  // Khi đổi cuộc đua: tải các lượt đăng ký (RaceEntry) của chính mình cho cuộc đua đó, làm nguồn cho dropdown Ngựa.
  useEffect(() => {
    setHorseId('');
    if (!raceId) { setMyEntries([]); return; }
    let cancelled = false;
    setEntriesLoading(true);
    (async () => {
      try {
        const res = await racingApi.listEntries({ raceId, pageSize: 100 });
        if (cancelled) return;
        const mine = res.items.filter((e) =>
          e.ownerUserId === user?.userId && e.statusName !== 'Withdrawn' && e.statusName !== 'Rejected');
        setMyEntries(mine);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setEntriesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [raceId, user?.userId]);

  // Tìm jockey gần đúng theo tên/email/SĐT (vai trò Jockey do BE khóa cứng — xem jockeyApi.searchJockeys).
  useEffect(() => {
    if (selectedJockey) return;
    const q = jockeyQuery.trim();
    if (!q) {
      setJockeyResults([]);
      setJockeySearching(false);
      return;
    }
    let cancelled = false;
    setJockeySearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await jockeyApi.searchJockeys({ search: q, pageSize: 8 });
        if (!cancelled) setJockeyResults(res.items);
      } catch {
        if (!cancelled) setJockeyResults([]);
      } finally {
        if (!cancelled) setJockeySearching(false);
      }
    }, JOCKEY_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jockeyQuery, selectedJockey]);

  function pickJockey(u: UserDto) {
    setSelectedJockey(u);
    setJockeyResults([]);
  }

  function clearJockeySelection() {
    setSelectedJockey(null);
    setJockeyQuery('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!raceId || !horseId || !selectedJockey) {
      setError('Vui lòng chọn cuộc đua, ngựa và tìm chọn jockey.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await jockeyApi.sendInvitation({
        raceId,
        horseId,
        jockeyUserId: selectedJockey.id,
        message: message.trim() || null,
      });
      setSuccess('Đã gửi lời mời tới jockey thành công!');
      clearJockeySelection();
      setMessage('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedRace = races.find((r) => r.id === raceId);
  const selectedEntry = myEntries.find((en) => en.horseId === horseId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Gửi lời mời Jockey</h1>
        <p className="mt-1 text-stone">
          Thuê / chọn jockey điều khiển ngựa của bạn trong một cuộc đua (FR-16).
        </p>
      </div>

      {loadingInit ? (
        <div className="flex items-center justify-center py-20 text-stone">
          <Spinner />
          <span className="ml-2">Đang tải dữ liệu…</span>
        </div>
      ) : (
        <Card className="p-8">
          <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-col gap-5">
            {/* Race */}
            <Field label="Cuộc đua *">
              <select
                value={raceId}
                onChange={(e) => setRaceId(e.target.value)}
                className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-flame focus:ring-2 focus:ring-flame/30"
                required
              >
                <option value="">- Chọn cuộc đua -</option>
                {races.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.tournamentName} · {new Date(r.scheduledStart).toLocaleDateString('vi-VN')}
                  </option>
                ))}
              </select>
            </Field>

            {selectedRace && (
              <div className="rounded-xl border border-marigold/60 bg-marigold/10 p-4 text-sm">
                <p className="font-medium text-ink">{selectedRace.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-stone">
                  <span className="flex items-center gap-1.5">
                    <MapPinIcon className="h-4 w-4 shrink-0 text-ash" /> {selectedRace.trackName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <RulerIcon className="h-4 w-4 shrink-0 text-ash" /> {selectedRace.distanceM} m
                  </span>
                  <span className="flex items-center gap-1.5">
                    <HorseshoeIcon className="h-4 w-4 shrink-0 text-ash" /> Tối đa {selectedRace.maxHorses} ngựa
                  </span>
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-stone">
                  <ClockIcon className="h-4 w-4 shrink-0 text-ash" />
                  {new Date(selectedRace.scheduledStart).toLocaleString('vi-VN')}
                </p>
              </div>
            )}

            {/* Horse - chỉ liệt kê ngựa CỦA TÔI đã đăng ký (RaceEntry) cho cuộc đua đang chọn */}
            <Field
              label="Ngựa tham dự *"
              hint={raceId && !entriesLoading && myEntries.length === 0
                ? 'Bạn chưa đăng ký ngựa nào cho cuộc đua này - hãy đăng ký trước khi mời jockey.'
                : undefined}
            >
              <select
                value={horseId}
                onChange={(e) => setHorseId(e.target.value)}
                className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-flame focus:ring-2 focus:ring-flame/30"
                required
                disabled={!raceId || entriesLoading || myEntries.length === 0}
              >
                <option value="">
                  {!raceId ? '- Chọn cuộc đua trước -' : entriesLoading ? 'Đang tải…' : '- Chọn ngựa -'}
                </option>
                {myEntries.map((en) => (
                  <option key={en.horseId} value={en.horseId}>
                    {en.horseName ?? `Ngựa ${en.horseId.slice(0, 8)}…`} · {en.statusName}
                  </option>
                ))}
              </select>
            </Field>

            {selectedEntry && (
              <div className="flex items-center gap-3 rounded-xl border border-parchment/60 bg-cream p-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-marigold text-ink">
                  <HorseshoeIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-ink">{selectedEntry.horseName ?? 'Ngựa của bạn'}</p>
                  <p className="text-xs text-ash">
                    {selectedEntry.laneNo != null ? `Làn ${selectedEntry.laneNo}` : 'Chưa xếp làn'}
                    {selectedEntry.jockeyId ? ' · Đã có jockey' : ''}
                  </p>
                </div>
                <Badge tone={selectedEntry.jockeyId ? 'flame' : 'green'}>{selectedEntry.statusName}</Badge>
              </div>
            )}

            {/* Jockey */}
            <Field label="Jockey *" hint="Tìm theo tên, email hoặc số điện thoại (chỉ tài khoản có vai trò Jockey).">
              {selectedJockey ? (
                <div className="flex items-center justify-between gap-2 rounded-[var(--radius-input)] border border-flame/60 bg-flame/5 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{selectedJockey.fullName}</div>
                    <div className="truncate text-xs text-stone">
                      {selectedJockey.email}{selectedJockey.phone ? ` · ${selectedJockey.phone}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearJockeySelection}
                    className="shrink-0 text-xs font-medium text-flame hover:underline"
                  >
                    Đổi
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    value={jockeyQuery}
                    onChange={(e) => setJockeyQuery(e.target.value)}
                    placeholder="VD: Nguyễn Văn A, a@gmail.com hoặc 09xxxxxxxx"
                    required
                  />
                  {jockeyQuery.trim().length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-[var(--radius-input)] border border-bone bg-paper shadow-[var(--shadow-soft)]">
                      {jockeySearching && (
                        <div className="flex items-center gap-2 px-4 py-3 text-xs text-stone">
                          <Spinner /> Đang tìm…
                        </div>
                      )}
                      {!jockeySearching && jockeyResults.length === 0 && (
                        <div className="px-4 py-3 text-xs text-stone">Không tìm thấy jockey phù hợp.</div>
                      )}
                      {!jockeySearching && jockeyResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => pickJockey(u)}
                          className="block w-full px-4 py-2.5 text-left text-sm transition hover:bg-cream/60"
                        >
                          <div className="font-medium text-ink">{u.fullName}</div>
                          <div className="text-xs text-stone">
                            {u.email}{u.phone ? ` · ${u.phone}` : ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Field>

            {/* Message */}
            <Field label="Lời nhắn (tuỳ chọn)">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Gửi lời nhắn đến jockey..."
                className="rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm text-ink outline-none placeholder:text-driftwood focus:border-flame focus:ring-2 focus:ring-flame/30 resize-none"
              />
            </Field>

            {error && <Alert kind="error">{error}</Alert>}
            {success && <Alert kind="success">{success}</Alert>}

            <div className="flex justify-end">
              <Button type="submit" loading={submitting}>
                <SendIcon className="h-4 w-4" /> Gửi lời mời
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
