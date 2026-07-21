import MediaFrame from './MediaFrame';
import { DISPLAY_FONT, SECTION_THEME_VARS } from './theme';

interface TimelineItem {
  time: string;
  title: string;
  status: string;
  state: 'done' | 'live' | 'upcoming';
}

const OPERATIONS_TIMELINE: TimelineItem[] = [
  { time: '08:30', title: 'Kiểm tra đăng ký', status: 'Hoàn thành', state: 'done' },
  { time: '10:00', title: 'Vòng loại bắt đầu', status: 'Đang diễn ra', state: 'live' },
  { time: '14:30', title: 'Báo cáo trọng tài', status: 'Sắp diễn ra', state: 'upcoming' },
  { time: '17:00', title: 'Công bố kết quả', status: 'Sắp diễn ra', state: 'upcoming' },
];

export default function CommandCenterSection() {
  return (
    <section
      style={SECTION_THEME_VARS}
      aria-labelledby="command-center-heading"
      className="bg-[var(--obsidian)] px-5 py-20 md:px-8 lg:px-16 lg:py-32"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-12 max-w-2xl lg:mb-16">
          <h2
            id="command-center-heading"
            className="text-[40px] leading-[1.1] text-[var(--parchment)] lg:text-[64px]"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            Trung tâm điều hành mùa giải
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--dust)] lg:mt-6 lg:text-lg">
            Từ đăng ký ngựa và jockey đến công bố kết quả, mọi hoạt động của giải đấu được theo dõi trong một
            luồng vận hành thống nhất
          </p>
          <div className="mt-8 h-px w-full bg-[var(--parchment)]/10 lg:mt-10" />
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-8">
            <MediaFrame
              src="/images/home/command-center.jpg"
              className="aspect-[4/5] w-full lg:aspect-[16/9]"
              imageClassName="object-[50%_58%]"
              label="Trung tâm điều hành"
              assetPath="/images/home/command-center.jpg"
              alt="Trung tâm điều hành mùa giải"
            />
          </div>

          <div className="lg:col-span-4 lg:flex lg:flex-col lg:justify-center">
            <ol className="relative flex flex-col gap-10 border-l border-[var(--parchment)]/15 pl-6">
              {OPERATIONS_TIMELINE.map((item) => (
                <li key={item.time} className="relative">
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[27px] top-1.5 h-2 w-2 rounded-full ${
                      item.state === 'live'
                        ? 'bg-[var(--crimson)]'
                        : item.state === 'done'
                          ? 'bg-[var(--dust)]'
                          : 'bg-[var(--dust)]/30'
                    }`}
                  />
                  <div
                    className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                      item.state === 'live' ? 'text-[var(--crimson)]' : 'text-[var(--dust)]'
                    }`}
                  >
                    {item.time} · {item.status}
                  </div>
                  <h3
                    className={`mt-1.5 text-xl ${item.state === 'upcoming' ? 'text-[var(--parchment)]/50' : 'text-[var(--parchment)]'}`}
                    style={{ fontFamily: DISPLAY_FONT }}
                  >
                    {item.title}
                  </h3>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
