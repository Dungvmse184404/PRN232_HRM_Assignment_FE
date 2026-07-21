import MediaFrame from './MediaFrame';
import { DISPLAY_FONT, SECTION_THEME_VARS } from './theme';

interface SeasonEvent {
  title: string;
  status: string;
  state: 'done' | 'live' | 'upcoming';
}

const SEASON_EVENTS: SeasonEvent[] = [
  { title: 'Vòng loại miền Nam', status: 'Đã hoàn thành', state: 'done' },
  { title: 'Cúp Mùa Xuân', status: 'Đang diễn ra', state: 'live' },
  { title: 'Vòng bán kết', status: 'Sắp diễn ra', state: 'upcoming' },
  { title: 'Chung kết mùa giải', status: 'Sắp diễn ra', state: 'upcoming' },
];

function dotClass(state: SeasonEvent['state']) {
  if (state === 'live') return 'bg-[var(--crimson)]';
  if (state === 'done') return 'bg-[var(--dust)]';
  return 'bg-[var(--dust)]/30';
}

function labelClass(state: SeasonEvent['state']) {
  return state === 'live' ? 'text-[var(--crimson)]' : 'text-[var(--dust)]';
}

function titleClass(state: SeasonEvent['state']) {
  return state === 'upcoming' ? 'text-[var(--parchment)]/50' : 'text-[var(--parchment)]';
}

export default function LiveSeasonSection() {
  return (
    <section
      id="mua-giai"
      style={SECTION_THEME_VARS}
      aria-labelledby="live-season-heading"
      className="scroll-mt-24 bg-[var(--obsidian)] px-5 py-20 md:px-8 lg:px-16 lg:py-32"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-12 lg:mb-16">
          <h2
            id="live-season-heading"
            className="text-[40px] leading-[1.1] text-[var(--parchment)] lg:text-[64px]"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            Mùa giải đang diễn ra
          </h2>
          <div className="mt-8 h-px w-full bg-[var(--parchment)]/10 lg:mt-10" />
        </div>

        <MediaFrame
          src="/images/home/season-track.jpg"
          className="aspect-[21/9] w-full"
          imageClassName="object-[50%_42%]"
          label="Mùa giải hiện tại"
          assetPath="/images/home/season-track.jpg"
          alt="Toàn cảnh mùa giải đang diễn ra"
        />

        {/* Desktop: horizontal timeline */}
        <div className="mt-16 hidden lg:block">
          <ol className="relative grid grid-cols-4 gap-8">
            <div aria-hidden="true" className="absolute left-0 right-0 top-1.5 h-px bg-[var(--parchment)]/15" />
            {SEASON_EVENTS.map((event) => (
              <li key={event.title} className="relative text-center">
                <span
                  aria-hidden="true"
                  className={`absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full ${dotClass(event.state)}`}
                />
                <h3 className={`mt-8 text-xl ${titleClass(event.state)}`} style={{ fontFamily: DISPLAY_FONT }}>
                  {event.title}
                </h3>
                <span className={`mt-2 block text-xs font-semibold uppercase tracking-[0.18em] ${labelClass(event.state)}`}>
                  {event.status}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Mobile: real vertical timeline */}
        <div className="mt-12 lg:hidden">
          <ol className="relative flex flex-col gap-10 border-l border-[var(--parchment)]/15 pl-6">
            {SEASON_EVENTS.map((event) => (
              <li key={event.title} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full ${dotClass(event.state)}`}
                />
                <h3 className={`text-xl ${titleClass(event.state)}`} style={{ fontFamily: DISPLAY_FONT }}>
                  {event.title}
                </h3>
                <span className={`mt-1.5 block text-xs font-semibold uppercase tracking-[0.18em] ${labelClass(event.state)}`}>
                  {event.status}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
