import { useFeedStore } from '../store/feedStore';
import { ArticleCard } from '../components/ArticleCard';
import { StatusBanner } from '../components/StatusBanner';

function formatSyncTime(ts: number): string {
  const diffM = Math.floor((Date.now() - ts) / 60000);
  if (diffM < 1) return 'just now';
  if (diffM < 60) return `${diffM}m ago`;
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
}

export function HomeView() {
  const { loading, error, lastSync, feeds, getBriefArticles, refresh } = useFeedStore();
  const articles = getBriefArticles();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Fetching your brief…</p>
      </div>
    );
  }

  if (error) return <StatusBanner type="error" message={error} />;

  if (feeds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center gap-3">
        <span className="text-4xl">📡</span>
        <p className="text-sm font-medium text-slate-700">No feeds yet</p>
        <p className="text-sm text-slate-400">Head to Settings to import an OPML file, or use Discover to find feeds.</p>
      </div>
    );
  }

  const activeCount = feeds.filter(f => f.active).length;

  return (
    <div className="flex flex-col min-h-full bg-slate-50">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-slate-400">
            Top Stories
          </h2>
          {lastSync && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeCount} feeds · updated {formatSyncTime(lastSync)}
            </p>
          )}
        </div>
        <button
          onClick={() => void refresh()}
          className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-slate-400">No articles yet. Try refreshing.</p>
        </div>
      ) : (
        <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          {articles.map((article, i) => (
            <ArticleCard key={article.id} article={article} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
