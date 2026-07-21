import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getSearchItems, normalizeForSearch, scrollToAnchor, scrollToTop, type AnchorId, type SearchItem } from './navigation';

interface HomeSearchDialogProps {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  isSpectator: boolean;
}

/** Quick navigation search — filters only the static nav list, no API calls. Portalled to document.body. */
export default function HomeSearchDialog({ open, onClose, isAuthenticated, isSpectator }: HomeSearchDialogProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const allItems = useMemo(() => getSearchItems(isSpectator, isAuthenticated), [isSpectator, isAuthenticated]);
  const results = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    if (!q) return allItems;
    return allItems.filter((item) => normalizeForSearch(item.label).includes(q));
  }, [allItems, query]);

  useEffect(() => {
    setActiveIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((i) => (results.length === 0 ? -1 : Math.min(i + 1, results.length - 1)));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((i) => (results.length === 0 ? -1 : Math.max(i - 1, 0)));
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) activate(results[activeIndex]);
        return;
      }
      if (event.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>('input, button:not([disabled])');
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, results, activeIndex]);

  if (!open) return null;

  function activate(item: SearchItem) {
    onClose();
    navigate(item.href);
    if (item.href === '/') {
      requestAnimationFrame(() => scrollToTop());
    } else if (item.isAnchor) {
      const id = item.href.replace('/#', '') as AnchorId;
      requestAnimationFrame(() => scrollToAnchor(id));
    }
  }

  const activeId = activeIndex >= 0 ? results[activeIndex]?.id : undefined;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <style>{`
        @keyframes homeSearchFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes homeSearchRiseIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .home-search-backdrop { animation: homeSearchFadeIn 200ms ease both; }
        .home-search-panel { animation: homeSearchRiseIn 220ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .home-search-backdrop, .home-search-panel { animation: none; }
        }
      `}</style>
      <div aria-hidden="true" onClick={onClose} className="home-search-backdrop fixed inset-0 bg-[#14100C]/80 backdrop-blur-sm" />

      <div className="relative flex min-h-full items-start justify-center p-0 sm:p-4 sm:pt-[15vh]">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Tìm kiếm điều hướng"
          id="home-search-dialog"
          className="home-search-panel flex h-dvh w-full flex-col border-[#F3E9D8]/12 bg-[#14100C] sm:h-auto sm:max-h-[70vh] sm:w-full sm:max-w-[560px] sm:rounded-[4px] sm:border"
        >
          <div className="flex items-center gap-3 border-b border-[#F3E9D8]/12 px-5 py-4">
            <SearchGlyph />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded="true"
              aria-controls="home-search-listbox"
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm trang, mục hoặc chức năng…"
              className="flex-1 bg-transparent text-base text-[#F3E9D8] outline-none placeholder:text-[#B9AC97]/60"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng tìm kiếm"
              className="-m-1 flex h-11 w-11 items-center justify-center bg-transparent p-0 text-[#B9AC97] transition hover:text-[#F3E9D8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8863B]"
            >
              <CloseGlyph />
            </button>
          </div>

          <ul id="home-search-listbox" role="listbox" aria-label="Kết quả tìm kiếm" className="flex-1 overflow-y-auto py-2">
            {results.length === 0 ? (
              <li className="px-5 py-6 text-sm text-[#B9AC97]">Không tìm thấy mục nào.</li>
            ) : (
              results.map((item, index) => (
                <li
                  key={item.id}
                  id={item.id}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => activate(item)}
                  className={`flex min-h-[44px] cursor-pointer items-center px-5 text-base transition-colors ${
                    index === activeIndex ? 'bg-[#F3E9D8]/8 text-[#B8863B]' : 'text-[#F3E9D8]/85'
                  }`}
                >
                  {item.label}
                </li>
              ))
            )}
          </ul>

          <div className="hidden items-center justify-between border-t border-[#F3E9D8]/10 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-[#B9AC97]/60 sm:flex">
            <span>↑↓ chọn · Enter mở · Esc đóng</span>
            <span>Ctrl K</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SearchGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-[#B9AC97]">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
