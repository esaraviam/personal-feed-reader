import type { CategoryId, UserCategory } from '../domain/types';
import { useTranslation } from '../i18n/LanguageContext';

interface CategorySelectorSheetProps {
  open: boolean;
  categories: UserCategory[];
  activeCategoryId: CategoryId;
  getArticleCount: (id: CategoryId) => number;
  onSelect: (id: CategoryId) => void;
  onClose: () => void;
}

/**
 * Full-list category picker rendered as a bottom sheet.
 *
 * Design decisions:
 *  - Vertical list (not grid) — names are readable, touch targets are tall
 *  - max-h-[65vh] with overflow-y-auto — handles 50+ categories gracefully
 *  - CSS transform transition — slide-up / slide-down, no JS animation lib
 *  - Backdrop tap closes the sheet (standard mobile pattern)
 *  - Active category shows a colored tint row + category-color name + checkmark
 */
export function CategorySelectorSheet({
  open,
  categories,
  activeCategoryId,
  getArticleCount,
  onSelect,
  onClose,
}: CategorySelectorSheetProps) {
  const { t } = useTranslation();
  const title = t.feeds.allCategories;

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────── */}
      <div
        className={`
          fixed inset-0 z-40 bg-black/50
          transition-opacity duration-300
          ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Sheet panel ───────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-white dark:bg-slate-900
          rounded-t-2xl shadow-2xl
          transition-transform duration-300 ease-out
          ${open ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </p>
          <button
            onClick={onClose}
            className="
              p-1.5 rounded-lg
              text-slate-400 dark:text-slate-500
              hover:text-slate-600 dark:hover:text-slate-300
              hover:bg-slate-100 dark:hover:bg-slate-800
              transition-colors
            "
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable category list ──────────────────────────── */}
        <ul
          className="overflow-y-auto max-h-[65vh] divide-y divide-slate-50 dark:divide-slate-800/60 pb-safe"
          role="listbox"
          aria-label={title}
        >
          {categories.map((cat) => {
            const isActive = activeCategoryId === cat.id;
            const count = getArticleCount(cat.id);

            return (
              <li key={cat.id} role="option" aria-selected={isActive}>
                <button
                  onClick={() => onSelect(cat.id)}
                  className={`
                    w-full flex items-center gap-3.5 px-4 py-3.5 transition-colors
                    ${isActive
                      ? 'dark:bg-slate-800/60'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }
                  `}
                  style={isActive ? { backgroundColor: cat.color + '14' } : undefined}
                >
                  {/* Category icon badge */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: cat.color }}
                  >
                    <span className="text-xl leading-none">{cat.icon}</span>
                  </div>

                  {/* Name + article count */}
                  <div className="flex-1 min-w-0 text-left">
                    <p
                      className={`
                        text-[14px] font-medium truncate leading-snug
                        ${isActive ? '' : 'text-slate-800 dark:text-slate-100'}
                      `}
                      style={isActive ? { color: cat.color } : undefined}
                    >
                      {cat.name}
                    </p>
                    <p className="text-[12px] text-slate-400 dark:text-slate-500 tabular-nums mt-0.5">
                      {t.feeds.articles(count)}
                    </p>
                  </div>

                  {/* Active checkmark */}
                  {isActive ? (
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      style={{ color: cat.color }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    /* Invisible placeholder preserves alignment */
                    <span className="w-4 flex-shrink-0" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
