import type { Article } from '../domain/types';

const CATEGORY_COLORS: Record<string, string> = {
  chile: 'bg-red-100 text-red-700',
  global: 'bg-blue-100 text-blue-700',
  tech: 'bg-purple-100 text-purple-700',
  custom: 'bg-gray-100 text-gray-600',
};

function timeAgo(publishedAt: number): string {
  const diffMs = Date.now() - publishedAt;
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) {
    const diffM = Math.floor(diffMs / (1000 * 60));
    return diffM <= 1 ? 'just now' : `${diffM}m ago`;
  }
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

interface Props {
  article: Article;
  rank?: number;
}

export function ArticleCard({ article, rank }: Props) {
  const badgeClass = CATEGORY_COLORS[article.category] ?? CATEGORY_COLORS.custom;

  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 p-4 bg-white hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
    >
      {rank !== undefined && (
        <span className="flex-shrink-0 w-6 h-6 mt-0.5 rounded-full bg-gray-100 text-gray-400 text-xs font-medium flex items-center justify-center">
          {rank}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 leading-snug line-clamp-2">
          {article.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-gray-400">{article.source}</span>
          <span className="text-gray-200 text-xs">·</span>
          <span className="text-xs text-gray-400">{timeAgo(article.publishedAt)}</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${badgeClass}`}
          >
            {article.category}
          </span>
        </div>
      </div>

      <svg
        className="flex-shrink-0 w-4 h-4 text-gray-300 group-hover:text-blue-400 mt-0.5 transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}
