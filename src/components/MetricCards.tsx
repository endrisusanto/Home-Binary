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
  const targetUrl = portalConfig.baseUrl || 'https://android.qb.sec.samsung.net/history/28905';

  const handleOpenPortal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      try {
        const core = await import('@tauri-apps/api/core');
        await core.invoke('open_browser_url', { url: targetUrl });
        return;
      } catch {}
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 mb-2.5 sm:mb-3.5">
      
      {/* Card 1: TOTAL BUILDS */}
      <div className="bg-white dark:bg-[#0e0e11] rounded-lg p-2.5 sm:p-3.5 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between min-h-[64px] sm:min-h-[84px]">
        <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400 leading-none">
          Total Builds
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight my-0.5 sm:my-1">
          {total}
        </div>
        <div className="text-[9px] sm:text-[11px] text-slate-500 dark:text-neutral-400 font-medium leading-none truncate">
          {total > 0 ? `${total} in queue` : '0 selected'}
        </div>
      </div>

      {/* Card 2: ACTIVE RUNNING */}
      <div className="bg-white dark:bg-[#0e0e11] rounded-lg p-2.5 sm:p-3.5 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between min-h-[64px] sm:min-h-[84px]">
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400 leading-none">
          <span>Active</span>
          {isRunning && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Running" />
          )}
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight my-0.5 sm:my-1 flex items-baseline gap-1.5">
          <span>{running}</span>
          {isRunning && (
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              running
            </span>
          )}
        </div>
        <div className="text-[9px] sm:text-[11px] text-slate-500 dark:text-neutral-400 font-medium leading-none truncate">
          {isRunning ? (summary.activeBuildName || 'Executing...') : 'Idle / Standby'}
        </div>
      </div>

      {/* Card 3: COMPLETED */}
      <div className="bg-white dark:bg-[#0e0e11] rounded-lg p-2.5 sm:p-3.5 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between min-h-[64px] sm:min-h-[84px]">
        <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400 leading-none">
          Completed
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight my-0.5 sm:my-1">
          {success}
        </div>
        <div className="text-[9px] sm:text-[11px] font-medium leading-none flex items-center gap-1 truncate">
          <span className={failed > 0 ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-slate-500 dark:text-neutral-400"}>
            {failed} failed
          </span>
          {failed > 0 && (
            <span className="text-[8px] bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 px-1 py-0.2 rounded font-medium">
              attention
            </span>
          )}
        </div>
      </div>

      {/* Card 4: PROGRESS */}
      <div className="bg-white dark:bg-[#0e0e11] rounded-lg p-2.5 sm:p-3.5 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between min-h-[64px] sm:min-h-[84px]">
        <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400 leading-none">
          Progress
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight my-0.5 sm:my-1 flex items-center justify-between">
          <span>{progressPercent}%</span>
          <div className="w-12 sm:w-16 bg-slate-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="text-[9px] sm:text-[11px] text-slate-500 dark:text-neutral-400 font-medium leading-none truncate">
          {total > 0 ? `${success + failed}/${total} jobs done` : 'Ready to start'}
        </div>
      </div>

      {/* Card 5: PORTAL TARGET */}
      <div 
        onClick={handleOpenPortal}
        className="col-span-2 sm:col-span-1 bg-white dark:bg-[#0e0e11] rounded-lg p-2.5 sm:p-3.5 border border-slate-200 dark:border-neutral-800 hover:border-blue-400 dark:hover:border-blue-500/60 transition-colors flex flex-col justify-between min-h-[64px] sm:min-h-[84px] cursor-pointer group"
        title={`Open QuickBuild portal in browser: ${targetUrl}`}
      >
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400 leading-none">
          <span>Portal Target</span>
          <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
        </div>
        <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate leading-tight my-0.5 sm:my-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={targetUrl}>
          {portalConfig.mock ? 'Mock Mode' : 'QuickBuild'}
        </div>
        <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-neutral-400 font-mono truncate leading-none" title={targetUrl}>
          {targetUrl.replace(/^https?:\/\//, '')}
        </div>
      </div>

    </div>
  );
};
