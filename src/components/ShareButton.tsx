/**
 * ShareButton — universal share component.
 *
 * On mobile (iOS/Android): uses the native Web Share API which opens the OS
 * share sheet, letting the user pick WhatsApp, Instagram, Telegram, etc.
 *
 * On desktop (no native share): shows a small popover with copy-link and
 * direct deep-links to WhatsApp web, Telegram, and X/Twitter.
 *
 * Must be used inside an interactive parent (e.g. <a>) — always calls
 * e.preventDefault() + e.stopPropagation() to avoid bubbling.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n/LanguageContext';

interface Props {
  title: string;
  url: string;
  /** Visual size variant — 'sm' for article cards, 'md' for cluster headers */
  size?: 'sm' | 'md';
}

function safeUrl(url: string): string {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? url : '';
  } catch {
    return '';
  }
}

export function ShareButton({ title, url, size = 'sm' }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const safe = safeUrl(url);

  // Native share (iOS/Android PWA, Chrome Android, Safari iOS)
  const canNativeShare =
    typeof navigator !== 'undefined' &&
    'share' in navigator &&
    // Desktop Chrome exposes navigator.share but most users expect the popover there
    !/Macintosh|Windows|Linux/.test(navigator.userAgent);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!safe) return;

    if (canNativeShare) {
      try {
        await navigator.share({ title, url: safe });
      } catch {
        // User cancelled or API unavailable — silent
      }
      return;
    }

    setOpen((v) => !v);
  }

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(safe);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1400);
    } catch {
      // Clipboard unavailable
    }
  }

  function handleSocial(e: React.MouseEvent) {
    e.stopPropagation();
    setTimeout(() => setOpen(false), 120);
  }

  // Close on outside click / escape
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const enc = {
    url: encodeURIComponent(safe),
    text: encodeURIComponent(title),
  };

  const socials = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${enc.text}%20${enc.url}`,
      color: 'text-emerald-600 dark:text-emerald-400',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
    },
    {
      id: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${enc.url}&text=${enc.text}`,
      color: 'text-sky-500 dark:text-sky-400',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
    },
    {
      id: 'twitter',
      label: 'X / Twitter',
      href: `https://twitter.com/intent/tweet?url=${enc.url}&text=${enc.text}`,
      color: 'text-slate-800 dark:text-slate-200',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
  ];

  const iconSize = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const btnPad = size === 'md' ? 'p-2' : 'p-1.5';

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={handleClick}
        aria-label={t.share.share}
        className={`${btnPad} rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 active:bg-slate-200 dark:active:bg-slate-700 transition-colors`}
      >
        <svg
          className={iconSize}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
      </button>

      {/* Fallback popover (desktop) */}
      {open && (
        <div
          className="absolute right-0 bottom-full mb-2 z-50 w-44 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg shadow-slate-200/60 dark:shadow-black/40 overflow-hidden"
          role="menu"
        >
          {/* Copy link */}
          <button
            type="button"
            onClick={handleCopy}
            role="menuitem"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            {copied ? (
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
            <span className={copied ? 'text-emerald-600 dark:text-emerald-400' : ''}>
              {copied ? t.share.copied : t.share.copyLink}
            </span>
          </button>

          <div className="h-px bg-slate-100 dark:bg-slate-700/60 mx-1" />

          {/* Social links */}
          {socials.map((s) => (
            <a
              key={s.id}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={handleSocial}
              className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <span className={`flex-shrink-0 ${s.color}`}>{s.icon}</span>
              {s.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
