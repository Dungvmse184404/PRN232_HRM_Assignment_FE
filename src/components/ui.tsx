import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type DragEvent, type InputHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'neutral';

const variants: Record<Variant, string> = {
  primary: 'bg-flame text-white hover:bg-flame-dark shadow-[var(--shadow-soft)]',
  ghost: 'bg-transparent text-flame hover:underline',
  danger: 'bg-transparent text-red-600 border border-red-200 hover:bg-red-50',
  neutral: 'bg-paper text-ink border border-bone hover:border-stone',
};

export function Button({
  variant = 'primary',
  loading,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-input)] px-5 py-2.5 text-sm font-semibold tracking-[0.015em] transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-ash">{hint}</span>}
    </label>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-[var(--radius-input)] border border-bone bg-paper px-4 py-2.5 text-sm text-ink outline-none placeholder:text-driftwood focus:border-flame focus:ring-2 focus:ring-flame/30 ${className}`}
    />
  );
}

/**
 * Dải chip gợi ý xổ xuống như ngăn kéo khi hover vào field cha (cha cần class
 * `group relative`) - dùng cho các nút tính nhanh kiểu "+1 ngày/+3 ngày/+1 tuần".
 * Overlay tuyệt đối (absolute) nên KHÔNG đẩy các phần tử phía dưới; ẩn hẳn lúc
 * đóng (không chiếm chỗ). Quan trọng: không có margin/khoảng hở nào nằm ngoài
 * box của chính component (khoảng cách hiển thị = margin của phần tử BÊN
 * TRONG khung overflow-hidden), để khi rê chuột từ field xuống chip không bị
 * "rớt" ra khỏi vùng hover giữa chừng - đây là lỗi gặp ở bản trước.
 */
export function HoverChips<T extends string | number>({
  options,
  onPick,
  disabled,
}: {
  options: { label: string; value: T }[];
  onPick: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="absolute inset-x-0 top-full z-20 grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out
        group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr]"
    >
      <div className="overflow-hidden">
        <div
          className="mt-1.5 flex -translate-y-1 gap-1.5 rounded-[var(--radius-input)] bg-panel p-1.5 opacity-0 shadow-[var(--shadow-soft)] transition-all duration-200 ease-out
            group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
        >
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              disabled={disabled}
              onClick={() => onPick(opt.value)}
              className="whitespace-nowrap rounded-full border border-bone px-2.5 py-0.5 text-[11px] font-medium text-stone transition hover:border-flame hover:text-flame disabled:cursor-not-allowed disabled:opacity-40"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Ô nhập tự do kèm gợi ý dạng chip (dùng cho các trường ngắn trong form chật
 * chỗ, ví dụ Giống/Màu lông ngựa). Vẫn gõ tay được bình thường.
 *
 * Gợi ý xổ ra như một "drawer" nằm trong luồng layout (đẩy nội dung phía dưới
 * xuống), không phải panel nổi đè lên - và chỉ mở/đóng theo click (bấm mũi
 * tên, hoặc click ra ngoài / Esc để đóng), không theo hover, để có đủ thời
 * gian di chuột vào chọn option.
 */
export function SuggestInput({
  value,
  onChange,
  options,
  className = '',
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef}>
      <div className="relative">
        <Input
          {...props}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pr-8 ${className}`}
        />
        <button
          type="button"
          aria-label={open ? 'Đóng gợi ý' : 'Mở gợi ý'}
          onClick={() => setOpen((o) => !o)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ash transition hover:text-flame"
        >
          <svg viewBox="0 0 20 20" fill="none" className={`h-3.5 w-3.5 transition-transform duration-200 ease-out ${open ? 'rotate-180' : ''}`}>
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {/* grid-template-rows 0fr -> 1fr trick: animates height without a fixed
          max-height, and stays in normal flow so it pushes content below down. */}
      <div className={`grid transition-[grid-template-rows] duration-[250ms] ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="mt-1.5 flex flex-wrap gap-1.5 rounded-[var(--radius-input)] border border-bone bg-panel p-2 shadow-[var(--shadow-soft)]">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="rounded-full border border-bone px-2.5 py-1 text-[11px] font-medium text-stone transition hover:border-flame hover:bg-flame/5 hover:text-flame"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-parchment/60 bg-paper p-8 shadow-[var(--shadow-soft)] backdrop-blur-[14px] ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'red' | 'flame' }) {
  const tones = {
    neutral: 'bg-cream text-stone border-bone',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    flame: 'bg-marigold text-ink border-flame/30',
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

export function Alert({ kind, children }: { kind: 'error' | 'success'; children: ReactNode }) {
  const styles =
    kind === 'error'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-green-50 text-green-700 border-green-200';
  return <div className={`rounded-[var(--radius-input)] border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

/**
 * Danh sách xếp hạng kéo-thả (dùng cho "vị trí về đích"): kéo 1 hàng lên/xuống để
 * đổi thứ hạng, hoặc gõ tay số hạng để "ghim" hàng đó cố định tại hạng đó.
 *
 * Model: mỗi id hoặc được GHIM (`pins[id] = hạng`, cố định tuyệt đối) hoặc nằm
 * trong `unpinnedOrder` (thứ tự tương đối). Hạng hiển thị = lấp các ô còn trống
 * (sau khi đặt các id đã ghim vào đúng ô) bằng `unpinnedOrder` theo thứ tự - nên
 * kéo/ghim một hàng KHÔNG bao giờ làm xê dịch hạng của các hàng đã ghim khác;
 * các hàng chưa ghim tự "chảy" qua/quanh các hàng đã ghim.
 *
 * Kéo một hàng (bất kể đang ghim hay không) luôn bỏ ghim của chính hàng đó.
 */
export function useSortableRanks() {
  const [ids, setIds] = useState<string[]>([]);
  const [pins, setPins] = useState<Record<string, number>>({});
  const [unpinnedOrder, setUnpinnedOrder] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  const reset = useCallback((newIds: string[], initialRanks?: Record<string, number>) => {
    setIds(newIds);
    const p: Record<string, number> = {};
    if (initialRanks) {
      for (const id of newIds) {
        const r = initialRanks[id];
        if (r) p[id] = r;
      }
    }
    setPins(p);
    setUnpinnedOrder(newIds.filter((id) => !(id in p)));
    setDragId(null);
  }, []);

  const n = ids.length;
  // Đặt các id đã ghim vào đúng ô tuyệt đối trước, rồi lấp các ô trống bằng
  // unpinnedOrder theo thứ tự. `used` chặn trùng lặp nếu state lỡ lệch nhịp
  // (2 id cùng ghim 1 hạng, id vừa bị unpin nhưng chưa kịp rời unpinnedOrder...).
  const order: string[] = (() => {
    const used = new Set<string>();
    const slots: (string | null)[] = new Array(n).fill(null);
    for (const [id, rank] of Object.entries(pins)) {
      if (rank >= 1 && rank <= n && !used.has(id) && slots[rank - 1] == null) {
        slots[rank - 1] = id;
        used.add(id);
      }
    }
    let ui = 0;
    for (let i = 0; i < n; i++) {
      if (slots[i] != null) continue;
      while (ui < unpinnedOrder.length && used.has(unpinnedOrder[ui])) ui++;
      if (ui < unpinnedOrder.length) {
        slots[i] = unpinnedOrder[ui];
        used.add(unpinnedOrder[ui]);
        ui++;
      }
    }
    // Fallback phòng hờ: id còn sót lại (chưa dùng) lấp vào ô trống còn lại.
    if (slots.some((s) => s == null)) {
      for (const id of ids) {
        if (used.has(id)) continue;
        const idx = slots.indexOf(null);
        if (idx === -1) break;
        slots[idx] = id;
        used.add(id);
      }
    }
    return slots.filter((s): s is string => s != null);
  })();

  function setManualRank(id: string, rankInput: string) {
    if (!rankInput) {
      setPins((p) => {
        if (!(id in p)) return p;
        const next = { ...p };
        delete next[id];
        return next;
      });
      setUnpinnedOrder((u) => (u.includes(id) ? u : [...u, id]));
      return;
    }
    const rank = Number(rankInput);
    if (!Number.isInteger(rank) || rank < 1 || rank > n) return;
    // Nếu hạng này đã có id khác ghim sẵn, id đó bị "đẩy" về lại dòng chảy tự
    // động (unpinned) để tránh 2 id cùng ghim 1 hạng.
    const bumpedId = Object.entries(pins).find(([k, v]) => k !== id && v === rank)?.[0] ?? null;
    setPins((p) => {
      const next: Record<string, number> = {};
      for (const [k, v] of Object.entries(p)) {
        if (k === id || k === bumpedId) continue;
        next[k] = v;
      }
      next[id] = rank;
      return next;
    });
    setUnpinnedOrder((u) => {
      const filtered = u.filter((x) => x !== id);
      return bumpedId ? [...filtered, bumpedId] : filtered;
    });
  }

  // Kéo tới đâu, các hàng khác "nhường chỗ" ngay tới đó (không đợi thả tay) - tính lại
  // thứ tự ngay trong onDragOver của hàng đang được rê qua, giống Trello/Notion.
  function moveDraggedTo(draggedId: string, targetIndex: number) {
    const fromIndex = order.indexOf(draggedId);
    if (fromIndex === -1 || fromIndex === targetIndex) return;

    let insertAt = 0;
    for (let i = 0; i < targetIndex; i++) {
      const rowId = order[i];
      if (rowId !== draggedId && !(rowId in pins)) insertAt++;
    }

    setPins((p) => {
      if (!(draggedId in p)) return p;
      const next = { ...p };
      delete next[draggedId];
      return next;
    });
    setUnpinnedOrder((u) => {
      const filtered = u.filter((x) => x !== draggedId);
      filtered.splice(insertAt, 0, draggedId);
      return filtered;
    });
  }

  // FLIP: mỗi khi order đổi (do rê chuột qua hàng khác), ghi lại vị trí cũ/mới của từng
  // hàng và animate transform từ cũ -> 0, để các hàng "trượt" vào chỗ mới thay vì giật.
  const rowElsRef = useRef(new Map<string, HTMLElement>());
  const prevRectsRef = useRef(new Map<string, DOMRect>());
  const orderKey = order.join('|');

  useLayoutEffect(() => {
    const newRects = new Map<string, DOMRect>();
    rowElsRef.current.forEach((el, id) => newRects.set(id, el.getBoundingClientRect()));

    rowElsRef.current.forEach((el, id) => {
      const prev = prevRectsRef.current.get(id);
      const next = newRects.get(id);
      if (!prev || !next) return;
      const dy = prev.top - next.top;
      if (Math.abs(dy) < 1) return;
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
      void el.getBoundingClientRect(); // force reflow trước khi animate về 0
      requestAnimationFrame(() => {
        el.style.transition = 'transform 220ms cubic-bezier(0.2, 0, 0, 1)';
        el.style.transform = '';
      });
    });

    prevRectsRef.current = newRects;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey]);

  function rowRef(id: string) {
    return (el: HTMLElement | null) => {
      if (el) rowElsRef.current.set(id, el);
      else rowElsRef.current.delete(id);
    };
  }

  function dragHandlersFor(id: string, index: number) {
    return {
      ref: rowRef(id),
      draggable: true,
      onDragStart: () => setDragId(id),
      onDragOver: (e: DragEvent) => {
        e.preventDefault();
        if (dragId != null && dragId !== id) moveDraggedTo(dragId, index);
      },
      onDragEnd: () => setDragId(null),
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        setDragId(null);
      },
      isDragging: dragId === id,
    };
  }

  return { order, pins, setManualRank, reset, dragHandlersFor };
}
