import React from 'react';
import { ExternalLink } from 'lucide-react';
import { BatchSummary, PortalConfig } from '../types/batch';

interface MetricCardsProps {
  summary: BatchSummary;
  portalConfig: PortalConfig;
  isRunning: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  summary,
  portalConfig,
  isRunning,
}) => {
  const { total, running, success, failed, progressPercent } = summary;
  const targetUrl = portalConfig.baseUrl || 'https://android.qb.sec.samsung.net/overview/28905';

  const handleOpenPortal = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-3.5">
      
      {/* ========================================================================= */}
      {/* Card 1: BUILDS (Blue Ambient - Top-Left Glow) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden bg-white dark:bg-[#0c0c0e] rounded-xl p-3.5 border border-slate-200/90 dark:border-neutral-800/90 shadow-xs hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all flex flex-col justify-between group min-h-[84px]">
        {/* Radial Glow - Top-Left Corner Only */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.26),transparent_65%)] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-blue-500/40 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative z-10 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400 leading-none">
          Builds
        </div>
        <div className="relative z-10 text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight my-1">
          {total}
        </div>
        <div className="relative z-10 text-[11px] text-slate-500 dark:text-neutral-400 font-medium leading-none truncate">
          {total > 0 ? `${total} in queue` : '0 selected'}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Card 2: ACTIVE (Emerald Ambient - Top-Left Glow) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden bg-white dark:bg-[#0c0c0e] rounded-xl p-3.5 border border-slate-200/90 dark:border-neutral-800/90 shadow-xs hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all flex flex-col justify-between group min-h-[84px]">
        {/* Radial Glow - Top-Left Corner Only */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.28),transparent_65%)] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-emerald-500/40 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative z-10 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400 leading-none">
          <span>Active</span>
          {isRunning && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          )}
        </div>
        <div className="relative z-10 text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight my-1 flex items-baseline gap-2">
          <span>{running}</span>
          {isRunning && (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
              running
            </span>
          )}
        </div>
        <div className="relative z-10 text-[11px] text-slate-500 dark:text-neutral-400 font-medium leading-none truncate">
          {isRunning ? (summary.activeBuildName || 'Executing...') : 'Idle / Standby'}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Card 3: COMPLETED (Amber/Gold Ambient - Top-Left Glow) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden bg-white dark:bg-[#0c0c0e] rounded-xl p-3.5 border border-slate-200/90 dark:border-neutral-800/90 shadow-xs hover:border-amber-500/40 dark:hover:border-amber-500/40 transition-all flex flex-col justify-between group min-h-[84px]">
        {/* Radial Glow - Top-Left Corner Only */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.26),transparent_65%)] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-amber-500/40 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative z-10 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400 leading-none">
          Completed
        </div>
        <div className="relative z-10 text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight my-1">
          {success}
        </div>
        <div className="relative z-10 text-[11px] font-medium leading-none flex items-center gap-1.5 truncate">
          <span className={failed > 0 ? "text-rose-500 font-semibold" : "text-slate-500 dark:text-neutral-400"}>
            {failed} failed
          </span>
          {failed > 0 && (
            <span className="text-[8px] bg-rose-100 dark:bg-rose-950/90 text-rose-600 dark:text-rose-400 px-1 rounded font-bold">
              Alert
            </span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Card 4: TOTAL PROGRESS (Purple Ambient - Top-Left Glow) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden bg-white dark:bg-[#0c0c0e] rounded-xl p-3.5 border border-slate-200/90 dark:border-neutral-800/90 shadow-xs hover:border-purple-500/40 dark:hover:border-purple-500/40 transition-all flex flex-col justify-between group min-h-[84px]">
        {/* Radial Glow - Top-Left Corner Only */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.18),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.26),transparent_65%)] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-purple-500/40 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative z-10 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400 leading-none">
          Total Progress
        </div>
        <div className="relative z-10 text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight my-1 flex items-center justify-between">
          <span>{progressPercent}%</span>
          <div className="w-20 bg-slate-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden border border-transparent dark:border-neutral-700/50">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="relative z-10 text-[11px] text-slate-500 dark:text-neutral-400 font-medium leading-none truncate">
          {total > 0 ? `${success + failed} / ${total} jobs completed` : 'Ready to start'}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Card 5: PORTAL TARGET (Cyan Ambient - Clickable Link) */}
      {/* ========================================================================= */}
      <div 
        onClick={handleOpenPortal}
        className="relative overflow-hidden bg-white dark:bg-[#0c0c0e] rounded-xl p-3.5 border border-slate-200/90 dark:border-neutral-800/90 shadow-xs hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all flex flex-col justify-between group min-h-[84px] cursor-pointer"
        title={`Click to open QuickBuild portal in browser: ${targetUrl}`}
      >
        {/* Radial Glow - Top-Left Corner Only */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.26),transparent_65%)] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-500/40 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative z-10 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400 leading-none">
          <span>Portal Target</span>
          <ExternalLink className="w-3 h-3 text-cyan-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
        <div className="relative z-10 text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate leading-tight my-1 group-hover:text-cyan-500 transition-colors" title={targetUrl}>
          {portalConfig.mock ? 'Mock Mode' : 'QuickBuild'}
        </div>
        <div className="relative z-10 text-[11px] text-cyan-600 dark:text-cyan-400 group-hover:underline font-mono truncate leading-none flex items-center gap-1" title={targetUrl}>
          {targetUrl}
        </div>
      </div>

    </div>
  );
};
