import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  entriesApi,
  errorMessage,
  jockeyApi,
  predictionsApi,
  racesApi,
  racingApi,
  racingResultsApi,
  tournamentsApi,
  type RaceDto,
} from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { Alert, Button, Card, Spinner } from '../../components/ui';
import {
  AlertTriangleIcon,
  CalendarIcon,
  ClockIcon,
  FlagIcon,
  HorseshoeIcon,
  MapPinIcon,
  TrophyIcon,
} from '../../components/icons';
import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Quan hệ giữa người dùng hiện tại và một cuộc đua (dùng để highlight).
// ---------------------------------------------------------------------------
type Relation = 'jockey' | 'owner' | 'referee' | 'spectator' | 'violation';

const REL_LABEL: Record<Relation, string> = {
  jockey: 'Nài (Jockey)',
  owner: 'Chủ ngựa',
  referee: 'Trọng tài',
  spectator: 'Đặt cược',
  violation: 'Có vi phạm',
};

// Màu chữ / ánh sáng cho từng vai trò (hex, hợp nền tối).
const REL_TEXT: Record<Relation, string> = {
  jockey: '#fbbf24',
  owner: '#34d399',
  referee: '#818cf8',
  spectator: '#a78bfa',
  violation: '#f87171',
};

// Thứ tự ưu tiên khi 1 cuộc đua có nhiều quan hệ (quyết định màu chip chính).
const REL_PRIORITY: Relation[] = ['violation', 'jockey', 'referee', 'owner', 'spectator'];

// Màu LED cho mốc bắt đầu / kết thúc giải (hex để dùng trong gradient inline trên nền tối).
const TOUR_COLORS = ['#38bdf8', '#fbbf24', '#34d399', '#fb7185', '#a78bfa', '#2dd4bf'];

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

interface CalRace {
  raceId: string;
  tournamentId: string;
  name: string;
  tournamentName?: string | null;
  trackName?: string | null;
  start: Date;
  end: Date | null;
  statusName: string;
  relations: Set<Relation>; // rỗng = cuộc đua trong giải liên quan nhưng mình không động tới (hiển thị mờ)
  horses: Set<string>;
  conflict: boolean; // trùng giờ với cuộc đua khác CÙNG GIẢI mà mình cũng tham gia
}

interface Tour {
  id: string;
  name: string;
  start: Date;
  end: Date;
  colorIndex: number;
}

// ---------------------------------------------------------------------------
// Tiện ích ngày tháng.
// ---------------------------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// Tuần bắt đầu từ Thứ Hai.
function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  const dow = (s.getDay() + 6) % 7;
  return addDays(s, -dow);
}

// Khoảng thời gian của cuộc đua (thiếu giờ kết thúc => giả định 1 giờ) - dùng để phát hiện trùng giờ.
function interval(r: CalRace): [number, number] {
  const s = r.start.getTime();
  const e = r.end ? r.end.getTime() : s + 60 * 60 * 1000;
  return [s, e];
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function RaceCalendarPage() {
  const { user, isAdmin } = useAuth();
  const roles = user?.roles ?? [];
  const isJockey = roles.includes('Jockey');
  const isOwner = roles.includes('HorseOwner');
  const isReferee = roles.includes('RaceReferee');
  const isSpectator = roles.includes('Spectator');

  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [races, setRaces] = useState<Map<string, CalRace>>(new Map());
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Nạp dữ liệu.
  // -------------------------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Toàn bộ cuộc đua (để biết tournamentId, giờ, trường đua) + toàn bộ giải.
      const [masterList, tourList] = await Promise.all([
        racesApi.list({ pageSize: 500 }).then((r) => r.items).catch(() => [] as RaceDto[]),
        tournamentsApi.list({ pageSize: 200 }).then((r) => r.items).catch(() => []),
      ]);
      const master = new Map<string, RaceDto>();
      masterList.forEach((r) => master.set(r.id, r));
      const tourMeta = new Map(tourList.map((t) => [t.id, t]));

      // 2) Các cuộc đua mình THỰC SỰ động tới (theo vai trò).
      const touched = new Map<string, { relations: Set<Relation>; horses: Set<string> }>();
      const relatedTourIds = new Set<string>();
      const addTouch = (raceId: string, rel: Relation, horse?: string | null, tournamentId?: string) => {
        let t = touched.get(raceId);
        if (!t) {
          t = { relations: new Set(), horses: new Set() };
          touched.set(raceId, t);
        }
        t.relations.add(rel);
        if (horse) t.horses.add(horse);
        const tid = tournamentId ?? master.get(raceId)?.tournamentId;
        if (tid) relatedTourIds.add(tid);
      };

      const tasks: Promise<void>[] = [];
      if (isJockey) {
        tasks.push(
          jockeyApi.getMyAssignedRaces({ pageSize: 100 }).then((r) =>
            r.items.forEach((it) => addTouch(it.raceId, 'jockey', it.horseName)),
          ),
        );
      }
      if (isOwner) {
        tasks.push(
          entriesApi.list({ pageSize: 200 }).then((r) =>
            r.items.forEach((e) => addTouch(e.raceId, 'owner', e.horseName)),
          ),
        );
      }
      if (isReferee) {
        tasks.push(
          racingApi.getAssignedRaces().then((list) =>
            list.forEach((a) => addTouch(a.raceId, 'referee', null, a.tournamentId)),
          ),
        );
      }
      if (isSpectator) {
        tasks.push(predictionsApi.getMine().then((list) => list.forEach((p) => addTouch(p.raceId, 'spectator'))));
      }
      await Promise.all(tasks);

      // 3) Admin: liên quan tới TẤT CẢ các giải (không tham gia trực tiếp, highlight vi phạm sau).
      if (isAdmin) {
        tourList.forEach((t) => relatedTourIds.add(t.id));
        master.forEach((m) => relatedTourIds.add(m.tournamentId));
      }

      // 4) Dựng CalRace cho MỌI cuộc đua thuộc giải liên quan (đầy đủ lịch trình giải).
      const map = new Map<string, CalRace>();
      master.forEach((m) => {
        if (!relatedTourIds.has(m.tournamentId)) return;
        const t = touched.get(m.id);
        map.set(m.id, {
          raceId: m.id,
          tournamentId: m.tournamentId,
          name: m.name,
          tournamentName: m.tournamentName,
          trackName: m.trackName,
          start: new Date(m.scheduledStart),
          end: m.scheduledEnd ? new Date(m.scheduledEnd) : null,
          statusName: m.statusName,
          relations: t ? t.relations : new Set(),
          horses: t ? t.horses : new Set(),
          conflict: false,
        });
      });

      // 5) Danh sách giải để vẽ thanh (bar). Ưu tiên ngày từ metadata giải, thiếu thì suy từ các cuộc đua.
      const tourObjs: Tour[] = Array.from(relatedTourIds)
        .map((id) => {
          const meta = tourMeta.get(id);
          if (meta) {
            return { id, name: meta.name, start: new Date(meta.startDate), end: new Date(meta.endDate) };
          }
          const rs = Array.from(map.values()).filter((r) => r.tournamentId === id);
          if (rs.length === 0) return null;
          const starts = rs.map((r) => r.start.getTime());
          return {
            id,
            name: rs[0].tournamentName ?? 'Giải đua',
            start: new Date(Math.min(...starts)),
            end: new Date(Math.max(...rs.map((r) => (r.end ?? r.start).getTime()))),
          };
        })
        .filter((t): t is Omit<Tour, 'colorIndex'> => t !== null)
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .map((t, i) => ({ ...t, colorIndex: i % TOUR_COLORS.length }));

      // 6) Trùng lịch: CHỈ khi 2 cuộc đua CÙNG GIẢI, trùng giờ và mình tham gia cả hai.
      const mine = Array.from(map.values()).filter((r) => r.relations.size > 0);
      for (let i = 0; i < mine.length; i++) {
        for (let j = i + 1; j < mine.length; j++) {
          if (mine[i].tournamentId !== mine[j].tournamentId) continue; // khác giải trùng nhau là bình thường
          const [s1, e1] = interval(mine[i]);
          const [s2, e2] = interval(mine[j]);
          if (s1 < e2 && s2 < e1) {
            mine[i].conflict = true;
            mine[j].conflict = true;
          }
        }
      }

      setTours(tourObjs);
      setRaces(map);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isJockey, isOwner, isReferee, isSpectator, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  // -------------------------------------------------------------------------
  // Khoảng ngày đang xem.
  // -------------------------------------------------------------------------
  const visibleDays = useMemo(() => {
    if (viewMode === 'week') {
      const s = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(s, i));
    }
    const first = startOfWeek(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    return Array.from({ length: 42 }, (_, i) => addDays(first, i));
  }, [viewMode, cursor]);

  // -------------------------------------------------------------------------
  // Admin: nạp trạng thái vi phạm cho cuộc đua trong khoảng đang xem (lazy).
  // -------------------------------------------------------------------------
  const [violationChecked, setViolationChecked] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!isAdmin || races.size === 0) return;
    const rangeStart = visibleDays[0].getTime();
    const rangeEnd = visibleDays[visibleDays.length - 1].getTime() + DAY_MS;
    const toCheck = Array.from(races.values()).filter(
      (r) => !violationChecked.has(r.raceId) && r.start.getTime() >= rangeStart && r.start.getTime() < rangeEnd,
    );
    if (toCheck.length === 0) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        toCheck.map((r) =>
          racingResultsApi
            .getRaceLiveStatus(r.raceId)
            .then((s) => ({ id: r.raceId, hit: (s.violationCount ?? 0) > 0 }))
            .catch(() => ({ id: r.raceId, hit: false })),
        ),
      );
      if (cancelled) return;
      setRaces((prev) => {
        const next = new Map(prev);
        results.forEach(({ id, hit }) => {
          const r = next.get(id);
          if (r && hit) r.relations.add('violation');
        });
        return next;
      });
      setViolationChecked((prev) => {
        const next = new Set(prev);
        toCheck.forEach((r) => next.add(r.raceId));
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, races, visibleDays, violationChecked]);

  // -------------------------------------------------------------------------
  // Gom cuộc đua theo ngày.
  // -------------------------------------------------------------------------
  const byDay = useMemo(() => {
    const m = new Map<string, CalRace[]>();
    races.forEach((r) => {
      const k = dayKey(r.start);
      const list = m.get(k) ?? [];
      list.push(r);
      m.set(k, list);
    });
    m.forEach((list) => list.sort((a, b) => a.start.getTime() - b.start.getTime()));
    return m;
  }, [races]);

  const today = startOfDay(new Date());
  const monthLabel = cursor.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  const weekLabel = (() => {
    const s = startOfWeek(cursor);
    const e = addDays(s, 6);
    return `${s.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} – ${e.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  })();

  const shift = (dir: -1 | 1) =>
    setCursor((c) => (viewMode === 'week' ? addDays(startOfWeek(c), dir * 7) : addMonths(c, dir)));

  const activeRoleLegend: Relation[] = REL_PRIORITY.filter((rel) => {
    if (rel === 'jockey') return isJockey;
    if (rel === 'owner') return isOwner;
    if (rel === 'referee') return isReferee;
    if (rel === 'spectator') return isSpectator;
    if (rel === 'violation') return isAdmin;
    return false;
  });

  return (
    <div className="flex flex-col gap-6">
      <style>{`@keyframes calpop{from{opacity:0;transform:translateY(-6px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <CalendarIcon className="h-7 w-7 text-flame" /> Lịch đua
          </h1>
          <p className="mt-1 text-stone">
            Giải đua bạn liên quan hiện đầy đủ lịch trình. Ngày bắt đầu / kết thúc giải có hiệu ứng đèn hắt ra từ vách
            ngăn; ngày có cuộc đua được tô sáng nhẹ. Di chuột vào cuộc đua để xem chi tiết.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-bone bg-paper p-1 text-sm">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`rounded-full px-3 py-1 font-medium transition ${viewMode === 'month' ? 'bg-marigold text-ink' : 'text-stone hover:text-ink'}`}
          >
            Tháng
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`rounded-full px-3 py-1 font-medium transition ${viewMode === 'week' ? 'bg-marigold text-ink' : 'text-stone hover:text-ink'}`}
          >
            Tuần
          </button>
        </div>
      </div>

      {/* Chú thích */}
      {activeRoleLegend.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone">
          {activeRoleLegend.map((rel) => (
            <span key={rel} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: REL_TEXT[rel] }} />
              {REL_LABEL[rel]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-6 rounded-sm"
              style={{ background: `linear-gradient(90deg, ${rgba('#38bdf8', 0.7)}, transparent)` }}
            />
            Mốc bắt đầu / kết thúc giải
          </span>
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangleIcon className="h-3.5 w-3.5 text-red-500" /> Trùng giờ cùng giải
          </span>
        </div>
      )}

      {error && <Alert kind="error">{error}</Alert>}

      {/* Điều hướng */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="neutral" onClick={() => shift(-1)}>‹</Button>
          <Button variant="neutral" onClick={() => setCursor(startOfDay(new Date()))}>Hôm nay</Button>
          <Button variant="neutral" onClick={() => shift(1)}>›</Button>
        </div>
        <div className="text-lg font-semibold capitalize text-ink">
          {viewMode === 'month' ? monthLabel : weekLabel}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : races.size === 0 ? (
        <Card className="py-12 text-center text-stone">
          Bạn chưa liên quan tới giải đua nào để hiển thị trên lịch.
        </Card>
      ) : viewMode === 'month' ? (
        <MonthGrid
          days={visibleDays}
          cursorMonth={cursor.getMonth()}
          today={today}
          byDay={byDay}
          tours={tours}
          hovered={hovered}
          setHovered={setHovered}
        />
      ) : (
        <WeekGrid days={visibleDays} today={today} byDay={byDay} tours={tours} hovered={hovered} setHovered={setHovered} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function primaryRelation(r: CalRace): Relation | null {
  for (const rel of REL_PRIORITY) if (r.relations.has(rel)) return rel;
  return null;
}
const timeLabel = (d: Date) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

// Ánh sáng hắt ra từ vách ngăn ở ngày BẮT ĐẦU (mép trái) / KẾT THÚC (mép phải) giải.
// Hover: ánh sáng dài thêm + trượt ra 1 ngăn kéo thông tin (frosted).
function CellGlows({ day, tours }: { day: Date; tours: Tour[] }) {
  const starts = tours.filter((t) => isSameDay(t.start, day));
  const ends = tours.filter((t) => isSameDay(t.end, day));
  return (
    <>
      {starts.map((t) => (
        <Milestone key={`s-${t.id}`} tour={t} side="start" />
      ))}
      {ends.map((t) => (
        <Milestone key={`e-${t.id}`} tour={t} side="end" />
      ))}
    </>
  );
}

function Milestone({ tour, side }: { tour: Tour; side: 'start' | 'end' }) {
  const hex = TOUR_COLORS[tour.colorIndex];
  const isStart = side === 'start';
  const date = isStart ? tour.start : tour.end;
  const grad = `linear-gradient(${isStart ? 90 : 270}deg, ${rgba(hex, 0.55)} 0%, ${rgba(hex, 0.15)} 45%, transparent 100%)`;
  return (
    <div className={`group/ms pointer-events-none absolute inset-y-0 w-1/2 ${isStart ? 'left-0' : 'right-0'}`}>
      {/* ánh sáng - kéo dài thêm khi hover (nằm dưới nội dung ngày) */}
      <div
        className={`pointer-events-none absolute inset-y-0 z-0 h-full w-full opacity-80 transition-all duration-500 group-hover/ms:opacity-100 group-hover/ms:scale-x-125 ${
          isStart ? 'left-0 origin-left' : 'right-0 origin-right'
        }`}
        style={{ background: grad }}
      />
      {/* vùng bắt hover: cả nửa ô (nằm dưới nội dung nên chip vẫn hover được) */}
      <div className="pointer-events-auto absolute inset-0 z-0" />
      {/* ngăn kéo thông tin mốc thời gian (nền đục) */}
      <div
        className={`pointer-events-none absolute top-1/2 z-30 w-48 -translate-y-1/2 rounded-lg border border-parchment bg-panel p-2.5 opacity-0 shadow-xl transition-all duration-300 group-hover/ms:opacity-100 ${
          isStart ? 'left-3 -translate-x-2 group-hover/ms:translate-x-1' : 'right-3 translate-x-2 group-hover/ms:-translate-x-1'
        }`}
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: hex }}>
          <CalendarIcon className="h-3.5 w-3.5" />
          {isStart ? 'Bắt đầu giải' : 'Kết thúc giải'}
        </div>
        <div className="mt-1 text-sm font-medium text-ink">{tour.name}</div>
        <div className="mt-0.5 text-xs text-stone">
          {date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function RaceChip({
  race,
  hovered,
  setHovered,
  detailed = false,
}: {
  race: CalRace;
  hovered: string | null;
  setHovered: (id: string | null) => void;
  detailed?: boolean;
}) {
  const rel = primaryRelation(race);
  const touched = race.relations.size > 0;
  const color = rel ? REL_TEXT[rel] : null; // màu chữ + ánh sáng theo vai trò
  const glow = color ?? '#b8863b'; // cuộc đua không tham gia: ánh sáng vàng nhạt
  const isOpen = hovered === race.raceId;

  return (
    <div
      className="group/race relative"
      onMouseEnter={() => setHovered(race.raceId)}
      onMouseLeave={() => setHovered(null)}
    >
      {/* ánh sáng "sáng lên" khi hover (không còn ô nền) */}
      <div
        className="pointer-events-none absolute -inset-x-1.5 -inset-y-0.5 z-0 rounded opacity-0 blur-[6px] transition-opacity duration-300 group-hover/race:opacity-100"
        style={{ background: rgba(glow, 0.5) }}
      />
      {/* chỉ còn tên cuộc đua */}
      <div className="relative z-10 flex items-center gap-1 truncate text-[11px] font-medium" style={{ color: color ?? undefined }}>
        {race.conflict && <AlertTriangleIcon className="h-3 w-3 shrink-0 text-red-500" />}
        {detailed && <span className="tabular-nums opacity-60">{timeLabel(race.start)}</span>}
        <span className={`truncate ${touched ? '' : 'text-ash'}`}>{race.name}</span>
      </div>

      {/* ngăn thông tin (frosted, icon đường nét) */}
      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-lg border border-parchment bg-panel p-3 text-left shadow-xl"
          style={{ animation: 'calpop 0.16s ease-out' }}
        >
          <Link to={`/races/${race.raceId}`} className="block font-semibold text-ink hover:text-flame">
            {race.name}
          </Link>
          <div className="mt-1.5 space-y-1 text-xs text-stone">
            <InfoRow icon={ClockIcon}>{race.start.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}</InfoRow>
            {race.tournamentName && <InfoRow icon={TrophyIcon}>{race.tournamentName}</InfoRow>}
            {race.trackName && <InfoRow icon={MapPinIcon}>{race.trackName}</InfoRow>}
            {race.statusName && <InfoRow icon={FlagIcon}>{race.statusName}</InfoRow>}
            {race.horses.size > 0 && <InfoRow icon={HorseshoeIcon}>{Array.from(race.horses).join(', ')}</InfoRow>}
            {!touched && <div className="italic text-ash">Bạn không tham gia cuộc đua này.</div>}
          </div>
          {touched && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Array.from(race.relations).map((r) => (
                <span key={r} className="inline-flex items-center gap-1 rounded-full border border-parchment px-2 py-0.5 text-[10px] font-medium text-stone">
                  <span className="h-2 w-2 rounded-full" style={{ background: REL_TEXT[r] }} />
                  {REL_LABEL[r]}
                </span>
              ))}
            </div>
          )}
          {race.conflict && (
            <div className="mt-2 flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700">
              <AlertTriangleIcon className="h-3.5 w-3.5" /> Trùng giờ với cuộc đua khác cùng giải
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, children }: { icon: (p: { className?: string }) => ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-ash" />
      <span className="truncate">{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
function MonthGrid({
  days,
  cursorMonth,
  today,
  byDay,
  tours,
  hovered,
  setHovered,
}: {
  days: Date[];
  cursorMonth: number;
  today: Date;
  byDay: Map<string, CalRace[]>;
  tours: Tour[];
  hovered: string | null;
  setHovered: (id: string | null) => void;
}) {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <Card className="overflow-visible p-0">
      <div className="grid grid-cols-7 border-b border-parchment/60 bg-cream/60 text-center text-xs font-semibold uppercase tracking-wide text-ash">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-parchment/40 last:border-b-0">
          {week.map((day, di) => {
            const list = byDay.get(dayKey(day)) ?? [];
            const inMonth = day.getMonth() === cursorMonth;
            const isToday = isSameDay(day, today);
            const hasRace = list.length > 0;
            // Ngày có cuộc đua: nền sáng hơn 1 chút so với ngày ngoài tháng.
            const bg = hasRace ? (inMonth ? 'bg-cream/70' : 'bg-cream/40') : inMonth ? '' : 'bg-cream/30';
            return (
              <div
                key={di}
                className={`relative min-h-[104px] border-r border-parchment/40 p-1.5 last:border-r-0 ${bg} ${!inMonth ? 'text-ash' : ''}`}
              >
                <CellGlows day={day} tours={tours} />
                <div className="relative z-10">
                  <div className="mb-1">
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                        isToday ? 'bg-flame text-white' : inMonth ? 'text-ink' : 'text-ash'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {list.slice(0, 3).map((r) => (
                      <RaceChip key={r.raceId} race={r} hovered={hovered} setHovered={setHovered} />
                    ))}
                    {list.length > 3 && <span className="pl-1 text-[10px] text-stone">+{list.length - 3} nữa</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </Card>
  );
}

// ---------------------------------------------------------------------------
function WeekGrid({
  days,
  today,
  byDay,
  tours,
  hovered,
  setHovered,
}: {
  days: Date[];
  today: Date;
  byDay: Map<string, CalRace[]>;
  tours: Tour[];
  hovered: string | null;
  setHovered: (id: string | null) => void;
}) {
  return (
    <Card className="overflow-visible p-0">
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const list = byDay.get(dayKey(day)) ?? [];
          const isToday = isSameDay(day, today);
          const hasRace = list.length > 0;
          return (
            <div
              key={i}
              className={`relative min-h-[320px] border-r border-parchment/40 p-2 last:border-r-0 ${hasRace ? 'bg-cream/70' : ''}`}
            >
              <CellGlows day={day} tours={tours} />
              <div className="relative z-10">
                <div className="mb-2 text-center">
                  <div className="text-[11px] uppercase tracking-wide text-ash">{WEEKDAYS[i]}</div>
                  <span
                    className={`mt-0.5 inline-grid h-7 w-7 place-items-center rounded-full text-sm font-semibold ${
                      isToday ? 'bg-flame text-white' : 'text-ink'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {list.map((r) => (
                    <RaceChip key={r.raceId} race={r} hovered={hovered} setHovered={setHovered} detailed />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
