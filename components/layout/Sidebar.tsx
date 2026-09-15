'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  MessagesSquare,
} from 'lucide-react';

interface SidebarProps {
  tabs: NavTab[];
  activeTab?: TabId;
  onSelectTab?: (id: TabId) => void;
  brandName?: string; // We will default this or ignore it, but keep the prop just in case
}

const TAB_ICONS: Record<TabId, React.ReactNode> = {
  dash: <LayoutDashboard className="w-[18px] h-[18px]" />,
  logs: <Activity className="w-[18px] h-[18px]" />,
  conversations: <MessagesSquare className="w-[18px] h-[18px]" />,
  catalogue: <Database className="w-[18px] h-[18px]" />,
  ingest: <FileUp className="w-[18px] h-[18px]" />,
  manual: <FileEdit className="w-[18px] h-[18px]" />,
  avatar: <Video className="w-[18px] h-[18px]" />,
  memory: <Brain className="w-[18px] h-[18px]" />,
};

export const Sidebar: React.FC<SidebarProps> = ({
  tabs,
  activeTab,
  onSelectTab,
  brandName = 'TR Fastenings',
}) => {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 flex flex-col gap-6 p-5 sticky top-0 self-start h-screen select-none border-r border-zinc-200 dark:border-zinc-800 shadow-[2px_0_8px_rgba(0,0,0,0.02)] dark:shadow-none transition-colors duration-200">
      {/* Brand Header */}
      <div className="flex flex-col gap-2 px-1 pt-1 mb-2 pb-6 border-b border-zinc-300 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <Image src="/logo.jpg" alt={`${brandName} Logo`} width={32} height={32} className="rounded-md object-cover shadow-sm bg-white" />
          <div className="text-[17px] font-bold tracking-tight text-zinc-900 dark:text-white">
            {brandName}
          </div>
        </div>
        <div className="font-mono text-[10.5px] tracking-widest uppercase text-zinc-500 dark:text-zinc-400 font-medium">
          avatar commerce · admin
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-1.5 overflow-y-auto pr-1 mb-auto">
        {tabs.map((tab) => {
          const isActive = activeTab
            ? tab.id === activeTab
            : tab.href
            ? pathname === tab.href || pathname.startsWith(tab.href + '/')
            : false;

          const content = (
            <>
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-200 ${
                  isActive ? 'bg-indigo-500 shadow-sm' : 'bg-transparent'
                }`}
              />
              <span
                className={`flex-shrink-0 transition-colors ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {TAB_ICONS[tab.id]}
              </span>
              <span className={`flex-1 text-left truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
              {tab.badge && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold shadow-sm">
                  {tab.badge}
                </span>
              )}
            </>
          );

          const className = `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-all duration-200 cursor-pointer ${
            isActive
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/60 dark:border-zinc-700/60'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white border border-transparent'
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

      {/* Footer / Copyright */}
      <div className="mt-auto pt-6 px-1 pb-2 flex items-center gap-3 border-t border-zinc-300 dark:border-zinc-700">
        <Image src="/logo.jpg" alt={`${brandName} Logo`} width={24} height={24} className="rounded object-cover opacity-80 bg-white" />
        <div className="flex flex-col gap-0.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
          <div>&copy; {new Date().getFullYear()} {brandName}.</div>
          <div>All rights reserved.</div>
        </div>
      </div>
    </aside>
  );
};
