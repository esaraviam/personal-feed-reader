import { useState } from 'react';
import type { DigestCluster } from '../domain/digestTypes';
import { useTranslation } from '../i18n/LanguageContext';

// ── Topic color palette ────────────────────────────────────────────────────────

const TOPIC_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  AI:            { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  Technology:    { bg: 'bg-blue-50 dark:bg-blue-950/40',    text: 'text-blue-700 dark:text-blue-300',    dot: 'bg-blue-500'   },
  Finance:       { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  Politics:      { bg: 'bg-rose-50 dark:bg-rose-950/40',    text: 'text-rose-700 dark:text-rose-300',    dot: 'bg-rose-500'   },
  Health:        { bg: 'bg-pink-50 dark:bg-pink-950/40',    text: 'text-pink-700 dark:text-pink-300',    dot: 'bg-pink-500'   },
  Science:       { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500' },
  Sports:        { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  Entertainment: { bg: 'bg-amber-50 dark:bg-amber-950/40',  text: 'text-amber-700 dark:text-amber-300',  dot: 'bg-amber-500'  },
  General:       { bg: 'bg-slate-50 dark:bg-slate-800/40',  text: 'text-slate-600 dark:text-slate-400',  dot: 'bg-slate-400'  },
};

function topicStyle(topic: string) {
  return TOPIC_STYLES[topic] ?? TOPIC_STYLES['General'];
}

function safeHref(url: string): string {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? url : '#';
  } catch {
    return '#';
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  cluster: DigestCluster;
}

const ARTICLES_INITIALLY_SHOWN = 3;

export function ClusterCard({ cluster }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const style = topicStyle(cluster.topic);
  const hasLLM = Boolean(cluster.headline);
  const visibleArticles = expanded
    ? cluster.articles
    : cluster.articles.slice(0, ARTICLES_INITIALLY_SHOWN);
  const hiddenCount = cluster.articles.length - ARTICLES_INITIALLY_SHOWN;

  return (
    <article className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-none overflow-hidden mb-3">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        {/* Topic + Region chips */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
            {cluster.topic}
          </span>
          {cluster.region !== 'Global' && (
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/50">
              {cluster.region}
            </span>
          )}
          <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {t.digest.stories(cluster.clusterSize)}
          </span>
        </div>

        {/* Headline */}
        <h3 className={`text-[15px] font-semibold leading-snug tracking-tight mb-1 ${
          hasLLM
            ? 'text-slate-900 dark:text-slate-50'
            : 'text-slate-700 dark:text-slate-300'
        }`}>
          {cluster.headline ?? cluster.articles[0]?.title ?? t.digest.unnamedCluster}
        </h3>

        {/* LLM insights */}
        {cluster.insights && cluster.insights.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {cluster.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-slate-600 dark:text-slate-400 leading-snug">
                <span className={`w-1 h-1 rounded-full flex-shrink-0 mt-[6px] ${style.dot}`} />
                {insight}
              </li>
            ))}
          </ul>
        )}

        {/* LLM impact */}
        {cluster.impact && (
          <p className="mt-2.5 text-[12px] text-slate-400 dark:text-slate-500 italic leading-snug border-l-2 border-slate-200 dark:border-slate-700 pl-2.5">
            {cluster.impact}
          </p>
        )}
      </div>

      {/* ── Article list ──────────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 dark:border-slate-700/50">
        {visibleArticles.map((article, i) => (
          <a
            key={article.id}
            href={safeHref(article.link)}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 active:bg-slate-100 dark:active:bg-slate-700/50 active:scale-[0.99] transition-all duration-75 ${
              i < visibleArticles.length - 1 || (hiddenCount > 0 && !expanded)
                ? 'border-b border-slate-100 dark:border-slate-700/50'
                : ''
            }`}
          >
            {/* Rank */}
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 text-[10px] font-semibold flex items-center justify-center tabular-nums mt-0.5">
              {i + 1}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                  {article.source}
                </span>
                <span className="text-slate-300 dark:text-slate-600 text-[10px]">·</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums flex-shrink-0">
                  {timeAgo(article.publishedAt)}
                </span>
              </div>
              <p className="text-[13.5px] font-medium text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white leading-snug line-clamp-2 tracking-tight">
                {article.title}
              </p>
            </div>

            <svg className="flex-shrink-0 w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 mt-1.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        ))}

        {/* Expand / collapse */}
        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-full px-4 py-2.5 text-[12px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-center"
          >
            {expanded
              ? t.digest.showLess
              : t.digest.showMore(hiddenCount)}
          </button>
        )}
      </div>
    </article>
  );
}
