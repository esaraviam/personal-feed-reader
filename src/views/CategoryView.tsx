import { useFeedStore } from '../store/feedStore';
import { ArticleCard } from '../components/ArticleCard';
import { StatusBanner } from '../components/StatusBanner';
import type { Category } from '../domain/types';

const CATEGORY_META: Record<Category, { label: string; icon: string; gradient: string; text: string }> = {
  chile:  { label: 'Chile',  icon: '🇨🇱', gradient: 'from-rose-500 to-rose-600',   text: 'text-rose-600' },
  global: { label: 'Global', icon: '🌍', gradient: 'from-blue-500 to-blue-600',   text: 'text-blue-600' },
  tech:   { label: 'Tech',   icon: '💻', gradient: 'from-violet-500 to-violet-600', text: 'text-violet-600' },
  custom: { label: 'Custom', icon: '📌', gradient: 'from-amber-500 to-amber-600',  text: 'text-amber-600' },
};

interface Props {
  category: Category;
}

export function CategoryView({ category }: Props) {
  const { loading, error, feeds, getCategoryArticles } = useFeedStore();
  const articles = getCategoryArticles(category);
  const meta = CATEGORY_META[category];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) return <StatusBanner type="error" message={error} />;

  if (feeds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center gap-3">
        <span className="text-4xl">📡</span>
        <p className="text-sm text-slate-400">No feeds yet. Import an OPML file in Settings.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-50">
      {/* Category header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-lg shadow-sm`}>
          {meta.icon}
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">{meta.label}</h2>
          <p className="text-[11px] text-slate-400">{articles.length} articles</p>
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <p className="text-sm text-slate-400">No {meta.label} articles yet. Try refreshing from Brief.</p>
        </div>
      ) : (
        <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
