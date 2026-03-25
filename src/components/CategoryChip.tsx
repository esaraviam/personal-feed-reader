import { forwardRef } from 'react';
import type { UserCategory } from '../domain/types';

interface CategoryChipProps {
  category: UserCategory;
  isActive: boolean;
  articleCount: number;
  onClick: () => void;
}

/**
 * A single horizontal-scroll pill representing one category.
 * Accepts a ref so the parent can call scrollIntoView on the active chip.
 */
export const CategoryChip = forwardRef<HTMLButtonElement, CategoryChipProps>(
  ({ category, isActive, articleCount, onClick }, ref) => (
    <button
      ref={ref}
      onClick={onClick}
      // scroll-snap-align: start — each chip is a snap point
      className={`
        flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium
        flex-shrink-0 snap-start transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
        ${
          isActive
            ? 'text-white shadow-sm'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        }
      `}
      style={isActive ? { backgroundColor: category.color } : undefined}
      aria-pressed={isActive}
    >
      <span className="text-base leading-none">{category.icon}</span>
      <span>{category.name}</span>
      {articleCount > 0 && (
        <span
          className={`
            text-[11px] font-semibold tabular-nums leading-none px-1.5 py-0.5 rounded-full
            ${isActive
              ? 'bg-white/25 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}
          `}
        >
          {articleCount}
        </span>
      )}
    </button>
  ),
);

CategoryChip.displayName = 'CategoryChip';
