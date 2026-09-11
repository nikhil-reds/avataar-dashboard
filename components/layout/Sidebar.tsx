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
  brandName = 'Rubenius',
  localModelName = 'Llama 3.1 8B · local',
}) => {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex-shrink-0 bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)] flex flex-col gap-5 p-[22px_14px] sticky top-0 self-start h-screen select-none border-r border-[var(--sidebar-edge)] transition-colors">
      {/* Brand Header */}
      <div className="flex flex-col gap-0.5 px-2">
        <div className="text-[15px] font-bold tracking-tight text-[var(--sidebar-strong)] flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          {brandName}
        </div>
        <div className="font-mono text-[10px] tracking-wider uppercase text-[var(--sidebar-muted)]">
          avatar commerce · admin
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-1 overflow-y-auto pr-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-fg)] shadow-xs'
                  : 'text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-active-fg)]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                  isActive ? 'bg-indigo-400' : 'bg-[var(--sidebar-dot)]'
                }`}
              />
              <span className="flex-shrink-0 opacity-80">{TAB_ICONS[tab.id]}</span>
              <span className="flex-1 text-left truncate">{tab.label}</span>
              {tab.badge && (
                <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-semibold">
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Inference Status Box */}
      <div className="mt-auto flex flex-col gap-2 p-3 rounded-xl bg-[var(--sidebar-panel)] border border-[var(--sidebar-border)]">
        <div className="font-mono text-[9.5px] tracking-wider uppercase text-[var(--sidebar-muted)] flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-indigo-400" />
          inference route
        </div>
        <div className="text-[13px] font-semibold text-[var(--sidebar-strong)] truncate">
          {localModelName}
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--sidebar-fg)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-3.5" />
          <span>healthy · 12.3 tok/s</span>
        </div>
        <div className="text-[11.5px] text-[var(--sidebar-muted)] border-t border-[var(--sidebar-divider)] pt-2 mt-0.5">
          fallback → Gemini 2.5 Flash
        </div>
      </div>
    </aside>
  );
};
