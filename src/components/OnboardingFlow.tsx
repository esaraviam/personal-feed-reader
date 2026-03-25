import { useState } from 'react';
import { useTranslation } from '../i18n/LanguageContext';

// ─── Step illustrations ────────────────────────────────────────────────────────
// Each renders a pixel-accurate miniature of the real app UI so users
// immediately recognise the patterns when they encounter them for real.

function WelcomeIllustration() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 h-full">
      {/* App icon — matches the header in App.tsx exactly */}
      <div className="relative">
        <div className="absolute inset-0 scale-150 rounded-2xl bg-blue-400/10 blur-xl" />
        <div className="absolute inset-0 scale-125 rounded-2xl bg-blue-400/15 blur-md" />
        <div className="relative w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/30">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {['📰 News', '⚡ Fast', '🎯 Focused'].map((label) => (
          <span
            key={label}
            className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[12px] font-medium"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function CategoriesIllustration() {
  const { t } = useTranslation();
  const [activeIdx, setActiveIdx] = useState(0);

  // Demo categories — icon and name are illustrative, not translated
  const cats = [
    { icon: '🌎', name: 'Global', count: 24, color: '#3b82f6', headline: 'Global markets rally as tech sector leads gains' },
    { icon: '💻', name: 'Tech',   count: 18, color: '#8b5cf6', headline: 'New AI model rewrites how we search the web' },
    { icon: '🇨🇱', name: 'Chile', count: 12, color: '#22c55e', headline: 'Chile announces landmark renewable energy milestone' },
    { icon: '⚙️', name: 'Custom', count: 5,  color: '#f97316', headline: 'How to curate your perfect RSS reading list' },
  ];

  return (
    <div className="flex flex-col gap-3 w-full px-4">
      {/* Mini pill strip */}
      <div className="flex gap-2 overflow-hidden">
        {cats.map((cat, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={cat.name}
              onClick={() => setActiveIdx(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all duration-200 ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
              style={isActive ? { backgroundColor: cat.color } : undefined}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              {isActive && (
                <span className="text-[10px] bg-white/25 px-1 py-0.5 rounded-full tabular-nums">
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mini article card that changes with the active category */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-3">
        <div className="text-[10px] font-medium mb-1.5" style={{ color: cats[activeIdx].color }}>
          {cats[activeIdx].icon} {cats[activeIdx].name} · just now
        </div>
        <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">
          {cats[activeIdx].headline}
        </div>
      </div>

      <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
        {t.onboarding.tapHint}
      </p>
    </div>
  );
}

function ReadingIllustration() {
  const articles = [
    { source: 'TechCrunch', time: '1h', color: '#3b82f6', title: 'AI startup raises $120M to rethink how we read news' },
    { source: 'Hacker News', time: '3h', color: '#f97316', title: "The open web is making a comeback — here's why" },
    { source: 'The Verge',   time: '5h', color: '#8b5cf6', title: 'A new era for RSS: quiet, powerful, and still here' },
  ];
  return (
    <div className="flex flex-col gap-2 w-full px-4">
      {articles.map((a, i) => (
        <div
          key={a.title}
          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm px-3.5 py-3"
          style={{ opacity: 1 - i * 0.2, transform: `scale(${1 - i * 0.025})` }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-semibold" style={{ color: a.color }}>{a.source}</span>
            <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">{a.time}</span>
          </div>
          <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">{a.title}</p>
        </div>
      ))}
    </div>
  );
}

function FeedsIllustration() {
  const { t } = useTranslation();
  const { onboarding: o } = t;

  const cards = [
    {
      label: o.feedsImportLabel,
      desc: o.feedsImportDesc,
      bg: 'bg-blue-50 dark:bg-blue-950/50',
      color: 'text-blue-500',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
    },
    {
      label: o.feedsDiscoverLabel,
      desc: o.feedsDiscoverDesc,
      bg: 'bg-purple-50 dark:bg-purple-950/50',
      color: 'text-purple-500',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      label: o.feedsPasteLabel,
      desc: o.feedsPasteDesc,
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      color: 'text-emerald-500',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-2.5 w-full px-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-3.5 flex items-center gap-3"
        >
          <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0 ${card.color}`}>
            {card.icon}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{card.label}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{card.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5" role="tablist" aria-label="Onboarding progress">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          role="tab"
          aria-selected={i === current}
          aria-label={`Step ${i + 1}`}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'w-5 h-1.5 bg-blue-600'
              : 'w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  onComplete: () => void;
}

// Illustrations are stable — defined outside to avoid re-creating on each render
const ILLUSTRATIONS = [
  <WelcomeIllustration />,
  <CategoriesIllustration />,
  <ReadingIllustration />,
  <FeedsIllustration />,
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { t } = useTranslation();
  const { onboarding: o } = t;

  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  const steps = o.steps;
  const total = steps.length;
  const isLast = step === total - 1;
  const current = steps[step];

  function advance() {
    if (animating) return;
    if (isLast) { onComplete(); return; }
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setAnimating(false);
    }, 180);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-950"
      role="dialog"
      aria-modal="true"
      aria-label="App introduction"
    >
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
          {o.step(step + 1, total)}
        </span>
        <button
          onClick={onComplete}
          className="text-[13px] font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 px-2 py-1 rounded-lg transition-colors"
        >
          {o.skip}
        </button>
      </div>

      {/* ── Illustration ──────────────────────────────────────────────────── */}
      <div
        className={`flex-1 flex items-center justify-center min-h-0 transition-all duration-[180ms] ${
          animating ? 'opacity-0 translate-x-3' : 'opacity-100 translate-x-0'
        }`}
      >
        <div className="w-full max-w-sm">
          <div className="mx-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 py-7 flex items-center justify-center min-h-[220px]">
            {ILLUSTRATIONS[step]}
          </div>
        </div>
      </div>

      {/* ── Text + CTA ────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pb-10 pt-4 max-w-sm mx-auto w-full">
        <div
          className={`text-center mb-7 transition-all duration-[180ms] ${
            animating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          <h2 className="text-[22px] font-bold text-slate-900 dark:text-slate-50 leading-tight mb-2 whitespace-pre-line">
            {current.title}
          </h2>
          <p className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {current.subtitle}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <ProgressDots total={total} current={step} />

          <button
            onClick={advance}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[15px] font-semibold transition-colors shadow-md shadow-blue-600/20"
          >
            {current.cta}
          </button>

          {step === 0 && (
            <button
              onClick={onComplete}
              className="text-[13px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-1"
            >
              {o.skipIntro}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
