import { useTranslation } from '../i18n/LanguageContext';

interface Props {
  type: 'loading' | 'error' | 'empty';
  message?: string;
}

export function StatusBanner({ type, message }: Props) {
  const { t } = useTranslation();

  if (type === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400 dark:text-slate-500">
        <div className="w-8 h-8 border-2 border-gray-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-sm">{message ?? t.common.loading}</span>
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div className="mx-4 mt-4 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 text-sm">
        {message ?? t.common.error}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400 dark:text-slate-500">
      <span className="text-3xl">📭</span>
      <span className="text-sm">{message ?? t.common.empty}</span>
    </div>
  );
}
