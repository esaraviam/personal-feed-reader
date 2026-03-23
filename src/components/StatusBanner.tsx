interface Props {
  type: 'loading' | 'error' | 'empty';
  message?: string;
}

export function StatusBanner({ type, message }: Props) {
  if (type === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-sm">{message ?? 'Loading…'}</span>
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {message ?? 'Something went wrong.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
      <span className="text-3xl">📭</span>
      <span className="text-sm">{message ?? 'Nothing here yet.'}</span>
    </div>
  );
}
