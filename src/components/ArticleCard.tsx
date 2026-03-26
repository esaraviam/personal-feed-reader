import type { Article } from '../domain/types';
import { useTranslation } from '../i18n/LanguageContext';
import { useFeedStore } from '../store/feedStore';

/** Convert a hex color to a Tailwind-compatible inline style accent */
function hexToAccentStyle(hex: string): { backgroundColor: string } {
  return { backgroundColor: hex };
}

/** Darken a hex color slightly for text use */
function hexToTextColor(hex: string): { color: string } {
  return { color: hex };
}

/**
 * Only allow http/https links from RSS feeds.
 * Blocks javascript:, data:, vbscript:, and other dangerous URI schemes.
 */
function safeHref(url: string): string {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? url : '#';
  } catch {
    return '#';
  }
}

interface Props {
  article: Article;
  rank?: number;
}

export function ArticleCard({ article, rank }: Props) {
  const { t } = useTranslation();
  const getCategoryById = useFeedStore((s) => s.getCategoryById);
  const category = getCategoryById(article.categoryId);
  const categoryColor = category?.color ?? '#94a3b8'; // slate-400 fallback

  function timeAgo(publishedAt: number): string {
    const diffMs = Date.now() - publishedAt;
    const diffM = Math.floor(diffMs / 60000);
    if (diffM < 1) return t.timeAgo.justNow;
    if (diffM < 60) return t.timeAgo.minutes(diffM);
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return t.timeAgo.hours(diffH);
    return t.timeAgo.days(Math.floor(diffH / 24));
  }

  return (
    <a
      href={safeHref(article.link)}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-stretch bg-white dark:bg-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700 active:scale-[0.98] transition-all duration-100 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0"
    >
      {/* Category accent bar */}
      <span className="w-[3px] flex-shrink-0 opacity-80" style={hexToAccentStyle(categoryColor)} />

      <div className="flex items-start gap-3 px-4 py-3.5 flex-1 min-w-0">
        {/* Rank badge */}
        {rank !== undefined && (
          <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 text-[10px] font-semibold flex items-center justify-center tabular-nums">
            {rank}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide leading-none" style={hexToTextColor(categoryColor)}>
              {article.source}
            </span>
            <span className="text-slate-300 dark:text-slate-600 text-[10px] leading-none">·</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 leading-none tabular-nums">
              {timeAgo(article.publishedAt)}
            </span>
          </div>

          <p className="text-[14.5px] font-medium text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-slate-100 leading-snug line-clamp-2 tracking-tight">
            {article.title}
          </p>
        </div>

        <svg
          className="flex-shrink-0 w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 mt-1 transition-colors"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  );
}
