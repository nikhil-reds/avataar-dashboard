'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavTab, TabId } from '../../types';
import {
  LayoutDashboard,
  Activity,
  Database,
  FileUp,
  FileEdit,
  Video,
  Brain,
  Cpu,
} from 'lucide-react';

interface SidebarProps {
  tabs: NavTab[];
  activeTab?: TabId;
  onSelectTab?: (id: TabId) => void;
  brandName?: string;
  localModelName?: string;
}

const TAB_ICONS: Record<TabId, React.ReactNode> = {
  dash: <LayoutDashboard className="w-4 h-4" />,
  logs: <Activity className="w-4 h-4" />,
  catalogue: <Database className="w-4 h-4" />,
  ingest: <FileUp className="w-4 h-4" />,
  manual: <FileEdit className="w-4 h-4" />,
  avatar: <Video className="w-4 h-4" />,
  memory: <Brain className="w-4 h-4" />,
};

export const Sidebar: React.FC<SidebarProps> = ({
  tabs,
  activeTab,
  onSelectTab,
  brandName = 'Rubenius',
  localModelName = 'Llama 3.1 8B · local',
}) => {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex-shrink-0 bg-[oklch(0.24_0.012_255)] text-[oklch(0.96_0.004_90)] flex flex-col gap-5 p-[22px_14px] sticky top-0 self-start h-screen select-none border-r border-zinc-800/40">
      {/* Brand Header */}
      <div className="flex flex-col gap-0.5 px-2">
        <div className="text-[15px] font-bold tracking-tight text-white flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          {brandName}
        </div>
        <div className="font-mono text-[10px] tracking-wider uppercase text-[oklch(0.72_0.02_255)]">
          avatar commerce · admin
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-1 overflow-y-auto pr-1">
        {tabs.map((tab) => {
          const isActive = activeTab
            ? tab.id === activeTab
            : tab.href
            ? pathname === tab.href
            : false;

          const content = (
            <>
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                  isActive ? 'bg-indigo-400' : 'bg-[oklch(0.42_0.014_255)]'
                }`}
              />
              <span className="flex-shrink-0 opacity-80">{TAB_ICONS[tab.id]}</span>
              <span className="flex-1 text-left truncate">{tab.label}</span>
              {tab.badge && (
                <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                  {tab.badge}
                </span>
              )}
            </>
          );

          const className = `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 cursor-pointer ${
            isActive
              ? 'bg-[oklch(0.33_0.016_255)] text-white shadow-xs'
              : 'text-[oklch(0.83_0.012_255)] hover:bg-[oklch(0.28_0.014_255)] hover:text-white'
          }`;

          if (onSelectTab) {
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={className}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={tab.id}
              href={tab.href || '#'}
              aria-current={isActive ? 'page' : undefined}
              className={className}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      {/* Inference Status Box */}
      <div className="mt-auto flex flex-col gap-2 p-3 rounded-xl bg-[oklch(0.29_0.014_255)] border border-white/5">
        <div className="font-mono text-[9.5px] tracking-wider uppercase text-[oklch(0.74_0.02_255)] flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-indigo-400" />
          inference route
        </div>
        <div className="text-[13px] font-semibold text-white truncate">
          {localModelName}
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] text-[oklch(0.82_0.015_255)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-3.5" />
          <span>healthy · 12.3 tok/s</span>
        </div>
        <div className="text-[11.5px] text-[oklch(0.74_0.02_255)] border-t border-[oklch(0.36_0.014_255)] pt-2 mt-0.5">
          fallback → Gemini 2.5 Flash
        </div>
      </div>
    </aside>
  );
};
