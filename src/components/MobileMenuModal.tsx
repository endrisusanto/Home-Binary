import React from 'react';
import { 
  X, 
  Plus, 
  Play, 
  Square, 
  RotateCcw, 
  Settings, 
  ArrowUpCircle, 
  Sun, 
  Moon, 
  Search,
  Activity,
  Layers,
  Globe,
  Zap
} from 'lucide-react';

interface MobileMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInputDrawer: () => void;
  onOpenSettings: () => void;
  onOpenUpdateModal: () => void;
  isRunning: boolean;
  onStartBatch: () => void;
  onCancelBatch: () => void;
  onResetQueue: () => void;
  onFetchBuildIds?: () => void;
  completedBuildingCount?: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalItems: number;
  trackProgress: boolean;
  onToggleTrackProgress: (checked: boolean) => void;
  appVersion?: string;
  fetchOnlyMode?: boolean;
  onToggleFetchOnlyMode?: (fetchOnly: boolean) => void;
}

export const MobileMenuModal: React.FC<MobileMenuModalProps> = ({
  isOpen,
  onClose,
  onOpenInputDrawer,
  onOpenSettings,
  onOpenUpdateModal,
  isRunning,
  onStartBatch,
  onCancelBatch,
  onResetQueue,
  onFetchBuildIds,
  completedBuildingCount = 0,
  isDarkMode,
  onToggleDarkMode,
  searchQuery,
  onSearchChange,
  totalItems,
  trackProgress,
  onToggleTrackProgress,
  appVersion = '0.5.13',
  fetchOnlyMode = false,
  onToggleFetchOnlyMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="bg-white dark:bg-[#09090b] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 uppercase tracking-wider">
              Control Menu Actions
            </span>
            <span className="text-[9px] font-mono text-slate-400">v{appVersion}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 space-y-3 max-h-[80vh] overflow-y-auto">
          
          {/* Quick Search */}
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search builds in queue..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-[#151518] rounded-lg border border-slate-200 dark:border-neutral-800 outline-none text-slate-800 dark:text-neutral-200 focus:border-blue-500"
            />
          </div>

          {/* Execution Mode Selector Card */}
          {onToggleFetchOnlyMode && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c0c0f] border border-slate-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-neutral-300">
                <span className="flex items-center gap-1.5">
                  {fetchOnlyMode ? <Search className="w-3.5 h-3.5 text-indigo-500" /> : <Zap className="w-3.5 h-3.5 text-blue-500" />}
                  Execution Mode
                </span>
                <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400">
                  {fetchOnlyMode ? 'Fetch IDs Only' : 'Submit Builds'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-slate-200/70 dark:bg-neutral-900 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => onToggleFetchOnlyMode(false)}
                  className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    !fetchOnlyMode
                      ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 dark:text-neutral-400'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>Submit Builds</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleFetchOnlyMode(true)}
                  className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    fetchOnlyMode
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-neutral-400'
                  }`}
                >
                  <Search className="w-3 h-3" />
                  <span>Fetch IDs Only</span>
                </button>
              </div>
            </div>
          )}

          {/* Grid Menu Actions */}
          <div className="grid grid-cols-2 gap-2">
            
            {/* 1. New Batch */}
            <button
              onClick={() => {
                onClose();
                onOpenInputDrawer();
              }}
              className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex flex-col items-start gap-1 transition-all text-left group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                + New Batch
              </span>
              <span className="text-[9px] text-blue-700/70 dark:text-blue-300/70 leading-tight">
                Paste raw build specs
              </span>
            </button>

            {/* 2. Run / Cancel Batch */}
            {isRunning ? (
              <button
                onClick={() => {
                  onClose();
                  onCancelBatch();
                }}
                className="p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 flex flex-col items-start gap-1 transition-all text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs animate-pulse">
                  <Square className="w-4 h-4 fill-current" />
                </div>
                <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  Cancel Run
                </span>
                <span className="text-[9px] text-rose-700/70 dark:text-rose-300/70 leading-tight">
                  Stop active execution
                </span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  onStartBatch();
                }}
                disabled={totalItems === 0}
                className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all text-left cursor-pointer ${
                  totalItems > 0
                    ? fetchOnlyMode
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-900/60 hover:bg-indigo-100'
                      : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                    : 'bg-slate-50 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg text-white flex items-center justify-center shadow-xs ${fetchOnlyMode ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                  {fetchOnlyMode ? <Search className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </div>
                <span className={`text-xs font-bold ${fetchOnlyMode ? 'text-indigo-900 dark:text-indigo-200' : 'text-emerald-900 dark:text-emerald-200'}`}>
                  {fetchOnlyMode ? 'Scan IDs' : 'Run Batch'}
                </span>
                <span className={`text-[9px] leading-tight ${fetchOnlyMode ? 'text-indigo-700/70 dark:text-indigo-300/70' : 'text-emerald-700/70 dark:text-emerald-300/70'}`}>
                  {fetchOnlyMode ? 'Scan Dashboard for existing IDs' : 'Submit all queued builds'}
                </span>
              </button>
            )}

            {/* 3. Fetch Build ID */}
            <button
              onClick={() => {
                if (onFetchBuildIds) {
                  onClose();
                  onFetchBuildIds();
                }
              }}
              disabled={isRunning || completedBuildingCount === 0}
              className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all text-left relative cursor-pointer ${
                completedBuildingCount > 0 && !isRunning
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-900/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                  : 'bg-slate-50 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 opacity-50 cursor-not-allowed'
              }`}
            >
              {completedBuildingCount > 0 && (
                <span className="absolute top-2 right-2 px-1.5 py-0.2 text-[8px] font-bold rounded-full bg-indigo-500 text-white">
                  {completedBuildingCount}
                </span>
              )}
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <RotateCcw className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                Fetch Build ID
              </span>
              <span className="text-[9px] text-indigo-700/70 dark:text-indigo-300/70 leading-tight">
                Update missing build IDs
              </span>
            </button>

            {/* 4. Track Progress Toggle */}
            <div 
              onClick={() => onToggleTrackProgress(!trackProgress)}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800/80 flex flex-col items-start gap-1 transition-all text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                  Track Progress
                </span>
                <input 
                  type="checkbox"
                  checked={trackProgress}
                  onChange={(e) => onToggleTrackProgress(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
                />
              </div>
              <span className="text-[9px] text-slate-500 dark:text-neutral-400 leading-tight">
                Dashboard polling 60s
              </span>
            </div>

            {/* 5. Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800/80 flex flex-col items-start gap-1 transition-all text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-700 dark:bg-neutral-700 text-white flex items-center justify-center shadow-xs">
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-200" />}
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
              <span className="text-[9px] text-slate-500 dark:text-neutral-400 leading-tight">
                Toggle color theme
              </span>
            </button>

            {/* 6. Settings & Config */}
            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800/80 flex flex-col items-start gap-1 transition-all text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-700 dark:bg-neutral-700 text-white flex items-center justify-center shadow-xs">
                <Settings className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                Settings
              </span>
              <span className="text-[9px] text-slate-500 dark:text-neutral-400 leading-tight">
                Endpoints & SSO credentials
              </span>
            </button>

            {/* 7. Check Updates */}
            <button
              onClick={() => {
                onClose();
                onOpenUpdateModal();
              }}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800/80 flex flex-col items-start gap-1 transition-all text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <ArrowUpCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                Software Updates
              </span>
              <span className="text-[9px] text-slate-500 dark:text-neutral-400 leading-tight">
                Check latest releases
              </span>
            </button>

            {/* 8. Reset Sample Queue */}
            <button
              onClick={() => {
                onClose();
                onResetQueue();
              }}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800/80 flex flex-col items-start gap-1 transition-all text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-700 dark:bg-neutral-700 text-white flex items-center justify-center shadow-xs">
                <RotateCcw className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                Reset Queue
              </span>
              <span className="text-[9px] text-slate-500 dark:text-neutral-400 leading-tight">
                Load sample specs
              </span>
            </button>

          </div>

        </div>

      </div>
    </div>
  );
};
