import { useRef, useState, type KeyboardEvent } from 'react';
import MediaFrame from './MediaFrame';
import { DISPLAY_FONT, SECTION_THEME_VARS } from './theme';

type RoleKey = 'horseOwner' | 'jockey' | 'referee' | 'spectator' | 'admin';

interface RoleTab {
  key: RoleKey;
  label: string;
  heading: string;
  description: string;
  assetPath: string;
  /** Left undefined when the real asset on disk isn't safe to publish yet - see RolesSection notes. */
  src?: string;
  objectPosition?: string;
}

const ROLES: RoleTab[] = [
  {
    key: 'horseOwner',
    label: 'Chủ ngựa',
    heading: 'Chủ ngựa',
    description: 'Quản lý hồ sơ và theo dõi thành tích',
    assetPath: '/images/home/role-horse-owner.jpg',
    src: '/images/home/role-horse-owner.jpg',
    objectPosition: 'object-[55%_58%]',
  },
  {
    key: 'jockey',
    label: 'Jockey',
    heading: 'Jockey',
    description: 'Xem lịch thi đấu và hiệu suất cá nhân',
    assetPath: '/images/home/role-jockey.jpg',
    src: '/images/home/role-jockey.jpg',
    objectPosition: 'object-[50%_30%]',
  },
  {
    key: 'referee',
    label: 'Trọng tài',
    heading: 'Trọng tài',
    description: 'Ghi nhận báo cáo và xác nhận kết quả',
    assetPath: '/images/home/role-referee.jpg',
    src: '/images/home/role-referee.jpg',
    objectPosition: 'object-[42%_45%]',
  },
  {
    key: 'spectator',
    label: 'Khán giả',
    heading: 'Khán giả',
    description: 'Theo dõi lịch, kết quả và bảng xếp hạng',
    assetPath: '/images/home/role-spectator.jpg',
    src: '/images/home/role-spectator.jpg',
    objectPosition: 'object-[50%_38%]',
  },
  {
    key: 'admin',
    label: 'Admin',
    heading: 'Admin',
    description: 'Điều hành toàn bộ mùa giải',
    assetPath: '/images/home/role-admin.jpg',
    src: '/images/home/role-admin.jpg',
    objectPosition: 'object-[45%_38%]',
  },
];

export default function RolesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = ROLES[activeIndex];

  function focusTab(index: number) {
    const next = (index + ROLES.length) % ROLES.length;
    setActiveIndex(next);
    tabRefs.current[next]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusTab(index + 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusTab(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusTab(0);
        break;
      case 'End':
        event.preventDefault();
        focusTab(ROLES.length - 1);
        break;
    }
  }

  return (
    <section
      style={SECTION_THEME_VARS}
      aria-labelledby="roles-heading"
      className="bg-[var(--obsidian)] px-5 py-20 md:px-8 lg:px-16 lg:py-32"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-12 text-center lg:mb-16">
          <h2
            id="roles-heading"
            className="text-[40px] leading-[1.1] text-[var(--parchment)] lg:text-[64px]"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            5 vai trò, một hệ thống
          </h2>
          <div className="mx-auto mt-8 h-px w-24 bg-[var(--parchment)]/20 lg:mt-10" />
        </div>

        <div
          role="tablist"
          aria-label="Chọn vai trò để xem"
          className="flex flex-nowrap gap-8 overflow-x-auto pb-3 lg:justify-center lg:overflow-visible"
        >
          {ROLES.map((role, index) => {
            const selected = index === activeIndex;
            return (
              <button
                key={role.key}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                id={`role-tab-${role.key}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`role-panel-${role.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveIndex(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={`flex shrink-0 items-center whitespace-nowrap border-b-2 py-3 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                  selected
                    ? 'border-[var(--gold)] text-[var(--gold)]'
                    : 'border-transparent text-[var(--dust)] hover:text-[var(--parchment)]'
                }`}
              >
                {role.label}
              </button>
            );
          })}
        </div>

        <div
          id={`role-panel-${active.key}`}
          role="tabpanel"
          aria-labelledby={`role-tab-${active.key}`}
          tabIndex={0}
          className="mt-10 lg:mt-12"
        >
          <MediaFrame
            src={active.src}
            className="aspect-[4/3] w-full sm:aspect-[16/9] lg:aspect-[21/9]"
            imageClassName={active.objectPosition}
            label={active.label}
            assetPath={active.assetPath}
            alt={active.heading}
          />
          <div className="mt-6">
            <h3 className="text-2xl text-[var(--parchment)]" style={{ fontFamily: DISPLAY_FONT }}>
              {active.heading}
            </h3>
            <p className="mt-2 max-w-2xl text-base text-[var(--dust)]">{active.description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
