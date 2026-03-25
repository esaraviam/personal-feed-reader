import { useRef, useEffect } from 'react';
import { CategoryChip } from './CategoryChip';
import type { CategoryId, UserCategory } from '../domain/types';

interface CategoryTabsProps {
  categories: UserCategory[];
  activeCategoryId: CategoryId;
  getArticleCount: (id: CategoryId) => number;
  onSelect: (id: CategoryId) => void;
  onOpenAll: () => void;
}

/**
 * Horizontal scrollable category strip with:
 *  - scroll-snap-type: x mandatory  → chips snap into position
 *  - mask-image gradient             → right-edge fade signals more content
 *  - auto-scroll active chip         → scrollIntoView on activeCategoryId change
 *  - "All" button pinned outside     → always accessible, never hidden by overflow
 */
export function CategoryTabs({
  categories,
  activeCategoryId,
  getArticleCount,
  onSelect,
  onOpenAll,
}: CategoryTabsProps) {
  const activeChipRef = useRef<HTMLButtonElement>(null);

  // Scroll the active chip into the visible center whenever it changes
  useEffect(() => {
    activeChipRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeCategoryId]);

  return (
    <div className="flex items-center gap-1">
      {/*
        Scroll container
        ─────────────────
        overflow-x: auto          — horizontal scroll
        scroll-snap-type: x       — chips snap (via snap-start on each chip)
        -webkit-overflow-scrolling — momentum scroll on iOS
        mask-image                 — right-edge gradient fade = "more content" affordance
        no-scrollbar               — hides native scrollbar without disabling scroll
      */}
      <div
        className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          maskImage:
            'linear-gradient(to right, transparent 0%, black 4%, black 78%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, black 4%, black 78%, transparent 100%)',
        }}
      >
        {/* Leading spacer — keeps first chip in the opaque zone */}
        <span className="flex-shrink-0 w-2" aria-hidden />

        {categories.map((cat) => (
          <CategoryChip
            key={cat.id}
            ref={activeCategoryId === cat.id ? activeChipRef : undefined}
            category={cat}
            isActive={activeCategoryId === cat.id}
            articleCount={getArticleCount(cat.id)}
            onClick={() => onSelect(cat.id)}
          />
        ))}

        {/*
          Trailing spacer — creates breathing room before the fade begins,
          so the last chip is never obscured by the gradient.
        */}
        <span className="flex-shrink-0 w-14" aria-hidden />
      </div>

      {/*
        "All" button — sits OUTSIDE the scroll container so it is always
        visible regardless of how many categories exist or how far the user
        has scrolled. Acts as the guaranteed escape hatch to the full list.
      */}
      <button
        onClick={onOpenAll}
        className="
          flex-shrink-0 flex items-center gap-1.5 mr-1
          px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700
          bg-white dark:bg-slate-800
          text-slate-500 dark:text-slate-400
          hover:bg-slate-50 dark:hover:bg-slate-700
          hover:border-slate-300 dark:hover:border-slate-600
          text-[12px] font-medium transition-colors
        "
        aria-label="View all categories"
        aria-haspopup="dialog"
      >
        {/* Grid icon */}
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
        All
      </button>
    </div>
  );
}
