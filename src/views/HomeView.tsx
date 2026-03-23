import { useFeedStore } from '../store/feedStore';
import { ArticleCard } from '../components/ArticleCard';
import { StatusBanner } from '../components/StatusBanner';

function formatSyncTime(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(ts));
}

export function HomeView() {
  const { loading, error, lastSync, feeds, getBriefArticles, refresh } = useFeedStore();
  const articles = getBriefArticles();

  if (loading) return <StatusBanner type="loading" message="Fetching your daily brief…" />;
  if (error) return <StatusBanner type="error" message={error} />;

  if (feeds.length === 0) {
    return (
      <StatusBanner
        type="empty"
        message="No feeds yet. Import an OPML file in Settings to get started."
      />
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Daily Brief</h2>
          {lastSync && (
            <p className="text-xs text-gray-400 mt-0.5">
              Updated {formatSyncTime(lastSync)}
            </p>
          )}
        </div>
        <button
          onClick={() => void refresh()}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Articles */}
      {articles.length === 0 ? (
        <StatusBanner type="empty" message="No articles yet. Try refreshing." />
      ) : (
        <div>
          {articles.map((article, i) => (
            <ArticleCard key={article.id} article={article} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
