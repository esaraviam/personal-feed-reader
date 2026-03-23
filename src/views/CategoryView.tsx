import { useFeedStore } from '../store/feedStore';
import { ArticleCard } from '../components/ArticleCard';
import { StatusBanner } from '../components/StatusBanner';
import type { Category } from '../domain/types';

const CATEGORY_LABELS: Record<Category, string> = {
  chile: '🇨🇱 Chile',
  global: '🌍 Global',
  tech: '💻 Tech',
  custom: '📌 Custom',
};

interface Props {
  category: Category;
}

export function CategoryView({ category }: Props) {
  const { loading, error, feeds, getCategoryArticles } = useFeedStore();
  const articles = getCategoryArticles(category);

  if (loading) return <StatusBanner type="loading" />;
  if (error) return <StatusBanner type="error" message={error} />;

  if (feeds.length === 0) {
    return (
      <StatusBanner
        type="empty"
        message="No feeds yet. Import an OPML file in Settings."
      />
    );
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">
          {CATEGORY_LABELS[category]}
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Top {articles.length} of {articles.length} articles
        </p>
      </div>

      {articles.length === 0 ? (
        <StatusBanner
          type="empty"
          message={`No ${category} articles yet. Try refreshing.`}
        />
      ) : (
        <div>
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
