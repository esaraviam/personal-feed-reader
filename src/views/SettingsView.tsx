import { useRef } from 'react';
import { useFeedStore } from '../store/feedStore';
import { StatusBanner } from '../components/StatusBanner';
import type { Category } from '../domain/types';

const CATEGORY_LABELS: Record<Category, string> = {
  chile: '🇨🇱 Chile',
  global: '🌍 Global',
  tech: '💻 Tech',
  custom: '📌 Custom',
};

export function SettingsView() {
  const { feeds, loading, error, importOPML, toggleFeed } = useFeedStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void importOPML(file);
    // Reset input so same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const activeCount = feeds.filter((f) => f.active).length;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Settings</h2>
      </div>

      {error && <StatusBanner type="error" message={error} />}

      {/* OPML Import */}
      <div className="p-4 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-700 mb-1">Import Feeds</p>
        <p className="text-xs text-gray-400 mb-3">
          Upload an OPML file to add RSS feeds. Categories are inferred from folder names.
        </p>
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
          {loading ? 'Importing…' : 'Import OPML'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".opml,text/x-opml,application/xml,text/xml"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Feed List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">
            Feeds{' '}
            <span className="text-gray-400 font-normal">
              ({activeCount} of {feeds.length} active)
            </span>
          </p>
        </div>

        {feeds.length === 0 ? (
          <p className="text-sm text-gray-400">No feeds imported yet.</p>
        ) : (
          <ul className="space-y-2">
            {feeds.map((feed) => (
              <li
                key={feed.id}
                className="flex items-center justify-between gap-3 p-3 bg-white border border-gray-100 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{feed.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 truncate max-w-[180px]">
                      {feed.url}
                    </span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-500">
                      {CATEGORY_LABELS[feed.category]}
                    </span>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => void toggleFeed(feed.id)}
                  role="switch"
                  aria-checked={feed.active}
                  aria-label={`${feed.active ? 'Disable' : 'Enable'} ${feed.name}`}
                  className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors ${
                    feed.active ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      feed.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
