import MediaFrame from './MediaFrame';
import { DISPLAY_FONT, SECTION_THEME_VARS } from './theme';

interface MosaicMedia {
  key: string;
  caption: string;
  assetPath: string;
  isVideo?: boolean;
  objectPosition?: string;
}

// Real filenames as they exist in public/images/home/ (verified with `ls`, not guessed).
const TRACK_PULSE_MEDIA: MosaicMedia[] = [
  { key: 'start', caption: 'Khu vực xuất phát', assetPath: '/images/home/race-start.jpg', objectPosition: 'object-[50%_70%]' },
  { key: 'referee', caption: 'Khu vực trọng tài', assetPath: '/images/home/media-referee.jpg', objectPosition: 'object-[42%_50%]' },
  { key: 'jockey', caption: 'Jockey cận cảnh', assetPath: '/images/home/media-jockey-close.jpg', objectPosition: 'object-[68%_35%]' },
  { key: 'paddock', caption: 'Khu vực Paddock', assetPath: '/images/home/media-paddock.jpg', objectPosition: 'object-[50%_78%]' },
  { key: 'finish', caption: 'Vạch đích', assetPath: '/images/home/media-finish-line.jpg', isVideo: true, objectPosition: 'object-[50%_68%]' },
  { key: 'aerial', caption: 'Toàn cảnh trường đua', assetPath: '/images/home/media-track-aerial.jpg', objectPosition: 'object-[64%_58%]' },
];

function findMedia(key: string): MosaicMedia {
  const item = TRACK_PULSE_MEDIA.find((m) => m.key === key);
  if (!item) throw new Error(`Unknown track pulse media key: ${key}`);
  return item;
}

function MosaicTile({ item, aspect }: { item: MosaicMedia; aspect: string }) {
  return (
    <figure className="group">
      <div className={`overflow-hidden ${aspect}`}>
        <MediaFrame
          src={item.assetPath}
          className="h-full w-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.02]"
          imageClassName={item.objectPosition}
          label={item.caption}
          assetPath={item.assetPath}
          alt={item.caption}
          isVideo={item.isVideo}
        />
      </div>
      <figcaption className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--dust)]">{item.caption}</figcaption>
    </figure>
  );
}

export default function TrackPulseSection() {
  return (
    <section
      style={SECTION_THEME_VARS}
      aria-labelledby="track-pulse-heading"
      className="bg-[var(--obsidian)] px-5 py-20 md:px-8 lg:px-16 lg:py-32"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-12 lg:mb-16">
          <h2
            id="track-pulse-heading"
            className="text-[40px] leading-[1.1] text-[var(--parchment)] lg:text-[64px]"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            Nhịp đập trường đua
          </h2>
          <div className="mt-8 h-px w-full bg-[var(--parchment)]/10 lg:mt-10" />
        </div>

        {/* Desktop mosaic - 6 media, asymmetric editorial grid */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4">
          <div className="lg:col-span-8">
            <MosaicTile item={findMedia('start')} aspect="aspect-[2/1]" />
          </div>
          <div className="lg:col-span-4">
            <MosaicTile item={findMedia('referee')} aspect="aspect-[3/4]" />
          </div>
          <div className="lg:col-span-3">
            <MosaicTile item={findMedia('jockey')} aspect="aspect-square" />
          </div>
          <div className="lg:col-span-3">
            <MosaicTile item={findMedia('paddock')} aspect="aspect-square" />
          </div>
          <div className="lg:col-span-6">
            <MosaicTile item={findMedia('finish')} aspect="aspect-[2/1]" />
          </div>
          <div className="lg:col-span-12">
            <MosaicTile item={findMedia('aerial')} aspect="aspect-[4/1]" />
          </div>
        </div>

        {/* Mobile stack - same 6 media, fixed order */}
        <div className="flex flex-col gap-8 lg:hidden">
          <MosaicTile item={findMedia('start')} aspect="aspect-[4/3]" />
          <div className="flex gap-4">
            <div className="w-1/2">
              <MosaicTile item={findMedia('jockey')} aspect="aspect-square" />
            </div>
            <div className="w-1/2">
              <MosaicTile item={findMedia('paddock')} aspect="aspect-square" />
            </div>
          </div>
          <MosaicTile item={findMedia('referee')} aspect="aspect-[3/4]" />
          <MosaicTile item={findMedia('finish')} aspect="aspect-video" />
          <MosaicTile item={findMedia('aerial')} aspect="aspect-[21/9]" />
        </div>
      </div>
    </section>
  );
}
