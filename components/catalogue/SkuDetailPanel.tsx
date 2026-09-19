'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Package, Quote, Info } from 'lucide-react';
import type { SkuDetail } from '../../types';

interface SkuDetailPanelProps {
  sku: SkuDetail;
  /** Where the close button, the backdrop and Escape all lead: the list without a selection. */
  closeHref: string;
}

const BADGE =
  'text-[10.5px] font-bold px-2 py-0.5 rounded-full inline-block text-center capitalize';

function badgeStyle(state: SkuDetail['state']): string {
  switch (state) {
    case 'LIVE':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
    case 'REVIEW':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
    default:
      return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
  }
}

const Field: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({
  label,
  value,
  mono = false,
}) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <span className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
      {label}
    </span>
    <span
      className={`text-xs text-zinc-800 dark:text-zinc-200 break-words ${
        mono ? 'font-mono' : 'font-medium'
      }`}
    >
      {value}
    </span>
  </div>
);

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <section className="flex flex-col gap-3">
    <h3 className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
      <span className="text-indigo-500">{icon}</span>
      {title}
    </h3>
    {children}
  </section>
);

export const SkuDetailPanel: React.FC<SkuDetailPanelProps> = ({ sku, closeHref }) => {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') router.push(closeHref, { scroll: false });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router, closeHref]);

  // The page behind must not scroll under the open panel, on a phone especially,
  // where the drawer covers the viewport.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const em = '—';

  return (
    <>
      {/* Below the navigation drawer's z-50, so opening the menu still covers this. */}
      <Link
        href={closeHref}
        scroll={false}
        aria-label="Close product details"
        className="fixed inset-0 z-30 bg-zinc-950/40 backdrop-blur-[1px]"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${sku.name} details`}
        className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] h-dvh flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl"
      >
        <header className="shrink-0 px-4 sm:px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 flex items-start gap-3">
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] font-semibold text-zinc-500">
                {sku.sku}
              </span>
              <span className={`${BADGE} ${badgeStyle(sku.state)}`}>
                {sku.state.toLowerCase()}
              </span>
            </div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug">
              {sku.name}
            </h2>
          </div>

          <Link
            href={closeHref}
            scroll={false}
            aria-label="Close"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </Link>
        </header>

        <div className="flex-1 min-h-0 overflow-y-scroll panel-scroll px-4 sm:px-5 py-5 flex flex-col gap-6">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 p-4 flex items-baseline justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
                price
              </span>
              <span className="text-lg font-bold font-mono text-zinc-900 dark:text-white">
                {sku.price}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 text-right">
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
                stock on hand
              </span>
              <span
                className={`text-lg font-bold font-mono ${
                  sku.stock === 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-zinc-900 dark:text-white'
                }`}
              >
                {sku.stock}
              </span>
            </div>
          </div>

          <Section icon={<Package className="w-3.5 h-3.5" />} title="Product">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <Field label="category" value={sku.category} />
              <Field label="supplier" value={sku.supplier || em} />
              <Field label="weight" value={sku.weight || em} />
              <Field label="making charge" value={sku.makingCharge || em} />
            </div>
          </Section>

          <Section icon={<Quote className="w-3.5 h-3.5" />} title="Avatar talking points">
            {sku.talkingPoints.length === 0 ? (
              <p className="text-xs text-zinc-400">
                None recorded. The avatar has nothing scripted to say about this product.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sku.talkingPoints.map((point, position) => (
                  <li
                    key={`${position}-${point.slice(0, 24)}`}
                    className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 border-l-2 border-indigo-200 dark:border-indigo-900 pl-3"
                  >
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section icon={<Info className="w-3.5 h-3.5" />} title="Record">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <Field label="source" value={sku.source} />
              <Field label="state" value={sku.state.toLowerCase()} />
              <Field label="added" value={sku.createdAt} mono />
              <Field label="last updated" value={sku.updatedAt} mono />
            </div>
            <Field label="record id" value={sku.id} mono />
          </Section>
        </div>
      </aside>
    </>
  );
};
