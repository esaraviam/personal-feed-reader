import type { Article } from '../domain/types';

const ACCENT: Record<string, string> = {
  chile:  'bg-rose-500',
  global: 'bg-blue-500',
  tech:   'bg-violet-500',
  custom: 'bg-amber-500',
};

const SOURCE_COLOR: Record<string, string> = {
  chile:  'text-rose-500',
  global: 'text-blue-500',
  tech:   'text-violet-500',
  custom: 'text-amber-500',
};

function timeAgo(publishedAt: number): string {
  const diffMs = Date.now() - publishedAt;
  const diffM = Math.floor(diffMs / 60000);
  if (diffM < 1) return 'just now';
  if (diffM < 60) return `${diffM}m`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}

interface Props {
  article: Article;
  rank?: number;
}

export function ArticleCard({ article, rank }: Props) {
  const accent = ACCENT[article.category] ?? ACCENT.custom;
  const sourceColor = SOURCE_COLOR[article.category] ?? SOURCE_COLOR.custom;

  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-stretch bg-white hover:bg-slate-50/80 active:bg-slate-100 transition-colors duration-150 border-b border-slate-100 last:border-b-0"
    >
      {/* Category accent bar */}
      <span className={`w-[3px] flex-shrink-0 ${accent} opacity-80`} />

      <div className="flex items-start gap-3 px-4 py-3.5 flex-1 min-w-0">
        {/* Rank badge */}
        {rank !== undefined && (
          <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-slate-100 text-slate-400 text-[10px] font-semibold flex items-center justify-center tabular-nums">
            {rank}
          </span>
        )}

        <div className="flex-1 min-w-0">
          {/* Source + time row */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-[11px] font-semibold uppercase tracking-wide leading-none ${sourceColor}`}>
              {article.source}
            </span>
            <span className="text-slate-300 text-[10px] leading-none">·</span>
            <span className="text-[11px] text-slate-400 leading-none tabular-nums">
              {timeAgo(article.publishedAt)}
            </span>
          </div>

          {/* Title */}
          <p className="text-[14.5px] font-medium text-slate-800 group-hover:text-slate-900 leading-snug line-clamp-2 tracking-tight">
            {article.title}
          </p>
        </div>

        {/* Arrow */}
        <svg
          className="flex-shrink-0 w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 mt-1 transition-colors"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  );
}
