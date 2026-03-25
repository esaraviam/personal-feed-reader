import { useRef, useState } from 'react';
import { useFeedStore } from '../store/feedStore';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useExport } from '../hooks/useExport';
import { StatusBanner } from '../components/StatusBanner';
import { validateFeed, buildFeedSource } from '../services/feedValidator';
import { CategoryManager } from '../components/CategoryManager';
import type { CategoryId } from '../domain/types';
import { toast } from 'sonner';
import { useTranslation } from '../i18n/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Category list is now dynamic — populated from the store below

type SettingsView = 'main' | 'categories';

export function SettingsView() {
  const { feeds, categories, loading, error, importOPML, toggleFeed, addFeed, removeFeed, updateFeedCategory, refresh } = useFeedStore();
  const { t } = useTranslation();
  const { reset: resetOnboarding } = useOnboarding();
  const { exportOPML, exportJSON, hasFeeds } = useExport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<SettingsView>('main');

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
  const defaultCategoryId: CategoryId = sortedCategories[0]?.id ?? 'custom';

  const [addUrl, setAddUrl] = useState('');
  const [addCategory, setAddCategory] = useState<CategoryId>(defaultCategoryId);
  const [addLoading, setAddLoading] = useState(false);

  async function handleAddFeed(e: React.FormEvent) {
    e.preventDefault();
    if (!addUrl.trim()) return;
    setAddLoading(true);
    try {
      const validated = await validateFeed(addUrl);
      const feed = buildFeedSource(validated, addCategory);
      await addFeed(feed);
      toast.success(`Added "${validated.name}"`);
      setAddUrl('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAddLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void importOPML(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const activeCount = feeds.filter((f) => f.active).length;

  if (view === 'categories') {
    return (
      <div className="flex flex-col bg-white dark:bg-slate-900 min-h-full">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
          <button
            onClick={() => setView('main')}
            className="p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
            aria-label="Back"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{t.categoryManager.title}</h2>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">{t.categoryManager.sectionDesc}</p>
          <CategoryManager />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 min-h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{t.settings.title}</h2>
        <button
          onClick={() => void refresh()}
          disabled={loading || feeds.length === 0}
          className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 disabled:opacity-40 transition-colors"
        >
          <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t.common.refresh}
        </button>
      </div>

      {error && <StatusBanner type="error" message={error} />}

      {/* OPML Import */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800">
        <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t.settings.importTitle}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">{t.settings.importDesc}</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          )}
          {loading ? t.settings.importing : t.settings.importBtn}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".opml,text/x-opml,application/xml,text/xml"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Export Feeds */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800">
        <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t.settings.exportTitle}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">{t.settings.exportDesc}</p>
        <div className="flex gap-2">
          <button
            onClick={exportOPML}
            disabled={!hasFeeds}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t.settings.exportOpml}
          </button>
          <button
            onClick={exportJSON}
            disabled={!hasFeeds}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t.settings.exportJson}
          </button>
        </div>
      </div>

      {/* Manage Categories */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800">
        <button
          onClick={() => setView('categories')}
          className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🗂️</span>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{t.categoryManager.manageBtn}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{categories.length} categories</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Add Feed */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800">
        <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t.settings.addTitle}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">{t.settings.addDesc}</p>
        <form onSubmit={(e) => void handleAddFeed(e)} className="flex flex-col gap-2">
          <input
            type="text"
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder={t.settings.addPlaceholder}
            className="w-full px-3 py-2 text-base border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
          />
          <div className="flex gap-2">
            <Select value={addCategory} onValueChange={(v) => setAddCategory(v as CategoryId)}>
              <SelectTrigger className="flex-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortedCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="submit"
              disabled={addLoading || !addUrl.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {addLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {addLoading ? t.settings.checking : t.settings.add}
            </button>
          </div>
        </form>
      </div>

      {/* Replay tutorial */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800">
        <button
          onClick={resetOnboarding}
          className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">👋</span>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{t.onboarding.replayTitle}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{t.onboarding.replayDesc}</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Feed List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
            {t.settings.feedsTitle(activeCount, feeds.length)}
          </p>
        </div>

        {feeds.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500">{t.settings.noFeeds}</p>
        ) : (
          <ul className="space-y-2">
            {feeds.map((feed) => (
              <li
                key={feed.id}
                className="flex items-start justify-between gap-3 p-3 bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{feed.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">{feed.url}</p>
                  {/* Category selector */}
                  <Select
                    value={feed.categoryId}
                    onValueChange={(v) => void updateFeedCategory(feed.id, v as CategoryId)}
                  >
                    <SelectTrigger className="mt-2 h-7 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.icon} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                  {/* Toggle */}
                  <Switch
                    checked={feed.active}
                    onCheckedChange={() => void toggleFeed(feed.id)}
                    aria-label={feed.name}
                  />
                  {/* Remove */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        aria-label={`Remove ${feed.name}`}
                        className="p-1 text-gray-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.settings.removeDialog.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t.settings.removeDialog.description(feed.name)}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.settings.removeDialog.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void removeFeed(feed.id)}>
                          {t.settings.removeDialog.confirm}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
