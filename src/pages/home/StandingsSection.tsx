import { Link } from 'react-router-dom';
import MediaFrame from './MediaFrame';
import { DISPLAY_FONT, SECTION_THEME_VARS } from './theme';

interface StandingRow {
  rank: number;
  horse: string;
  jockey: string;
  races: number;
  points: number;
}

const STANDINGS: StandingRow[] = [
  { rank: 1, horse: 'Thunder Crown', jockey: 'Nguyễn Văn A', races: 12, points: 98 },
  { rank: 2, horse: 'Royal Flame', jockey: 'Trần Bình', races: 10, points: 91 },
  { rank: 3, horse: 'Silver Wind', jockey: 'Lê Tùng', races: 8, points: 87 },
  { rank: 4, horse: 'Midnight Star', jockey: 'Phạm Hòa', races: 12, points: 82 },
  { rank: 5, horse: 'Golden Boy', jockey: 'Đỗ Thành', races: 9, points: 75 },
];

export default function StandingsSection() {
  return (
    <section
      id="ket-qua"
      style={SECTION_THEME_VARS}
      aria-labelledby="standings-heading"
      className="scroll-mt-24 bg-[var(--obsidian)] px-5 py-20 md:px-8 lg:px-16 lg:py-32"
    >
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <MediaFrame
            src="/images/home/standings-horse.jpg"
            className="aspect-[4/5] w-full lg:aspect-auto lg:h-[600px]"
            imageClassName="object-[42%_28%]"
            label="Kết quả & xếp hạng"
            assetPath="/images/home/standings-horse.jpg"
            alt="Ngựa dẫn đầu bảng xếp hạng"
          />
        </div>

        <div className="lg:col-span-7 lg:flex lg:flex-col lg:justify-center">
          <h2
            id="standings-heading"
            className="text-[40px] leading-[1.1] text-[var(--parchment)] lg:text-[64px]"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            Kết quả &amp; bảng xếp hạng
          </h2>
          <div className="mt-8 h-px w-24 bg-[var(--parchment)]/20 lg:mt-10" />

          {/* Desktop: real table */}
          <table className="mt-10 hidden w-full text-left lg:table">
            <caption className="sr-only">Top 5 bảng xếp hạng mùa giải hiện tại</caption>
            <thead>
              <tr className="border-b border-[var(--parchment)]/15 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dust)]">
                <th scope="col" className="pb-4 pr-4 font-semibold">
                  Hạng
                </th>
                <th scope="col" className="pb-4 pr-4 font-semibold">
                  Ngựa
                </th>
                <th scope="col" className="pb-4 pr-4 font-semibold">
                  Jockey
                </th>
                <th scope="col" className="pb-4 pr-4 text-right font-semibold">
                  Số cuộc đua
                </th>
                <th scope="col" className="pb-4 text-right font-semibold">
                  Điểm
                </th>
              </tr>
            </thead>
            <tbody>
              {STANDINGS.map((row) => (
                <tr key={row.rank} className="border-b border-[var(--parchment)]/10">
                  <td
                    className={`py-5 pr-4 text-2xl ${row.rank === 1 ? 'text-[var(--gold)]' : 'text-[var(--parchment)]/60'}`}
                    style={{ fontFamily: DISPLAY_FONT }}
                  >
                    {row.rank}
                  </td>
                  <td className="py-5 pr-4 text-lg text-[var(--parchment)]" style={{ fontFamily: DISPLAY_FONT }}>
                    {row.horse}
                  </td>
                  <td className="py-5 pr-4 text-sm text-[var(--dust)]">{row.jockey}</td>
                  <td className="py-5 pr-4 text-right text-sm text-[var(--dust)]">{row.races}</td>
                  <td
                    className={`py-5 text-right text-lg ${row.rank === 1 ? 'text-[var(--gold)]' : 'text-[var(--parchment)]'}`}
                    style={{ fontFamily: DISPLAY_FONT }}
                  >
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile: compact list */}
          <ol className="mt-10 flex flex-col lg:hidden">
            {STANDINGS.map((row) => (
              <li key={row.rank} className="flex items-center gap-4 border-b border-[var(--parchment)]/10 py-4">
                <span
                  className={`w-7 shrink-0 text-lg ${row.rank === 1 ? 'text-[var(--gold)]' : 'text-[var(--dust)]'}`}
                  style={{ fontFamily: DISPLAY_FONT }}
                >
                  {row.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="truncate text-base text-[var(--parchment)]" style={{ fontFamily: DISPLAY_FONT }}>
                      {row.horse}
                    </h3>
                    <span
                      className={`shrink-0 text-base ${row.rank === 1 ? 'text-[var(--gold)]' : 'text-[var(--parchment)]'}`}
                      style={{ fontFamily: DISPLAY_FONT }}
                    >
                      {row.points}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[var(--dust)]">
                    {row.jockey} · {row.races} cuộc đua
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10">
            <Link
              to="/racing-results"
              className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--parchment)] transition hover:text-[var(--gold)]"
            >
              Xem toàn bộ kết quả →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
