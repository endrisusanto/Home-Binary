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
  Globe
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
  appVersion = '0.5.1',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0c0c0e] w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50/50 dark:bg-[#121215]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                Toolbar & Tools Menu
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-neutral-500">
                Quick actions for Build HomeBinary
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 space-y-3">
          
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

          {/* Grid Menu Actions */}
          <div className="grid grid-cols-2 gap-2">
            
            {/* 1. New Batch */}
            <button
              onClick={() => {
                onClose();
                onOpenInputDrawer();
              }}
              className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex flex-col items-start gap-1 transition-all text-left group"
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
                className="p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 flex flex-col items-start gap-1 transition-all text-left"
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
                className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all text-left ${
                  totalItems > 0
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                    : 'bg-slate-50 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Run Batch
                </span>
                <span className="text-[9px] text-emerald-700/70 dark:text-emerald-300/70 leading-tight">
                  Submit all queued builds
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
              className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all text-left relative ${
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
                  className="w-3.5 h-3.5 accent-blue-600 rounded"
                />
              </div>
              <span className="text-[9px] text-slate-500 dark:text-neutral-400 leading-tight">
                {trackProgress ? 'Poll dashboard active' : 'Fast trigger mode'}
              </span>
            </div>

            {/* 5. Software Updates */}
            <button
              onClick={() => {
                onClose();
                onOpenUpdateModal();
              }}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800/80 flex flex-col items-start gap-1 transition-all text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-xs">
                <ArrowUpCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                Updates (v{appVersion})
              </span>
              <span className="text-[9px] text-slate-500 dark:text-neutral-400 leading-tight">
                1-Click remote upgrade
              </span>
            </button>

            {/* 6. Settings */}
            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800/80 flex flex-col items-start gap-1 transition-all text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center shadow-xs">
                <Settings className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                Settings
              </span>
              <span className="text-[9px] text-slate-500 dark:text-neutral-400 leading-tight">
                SSO & server options
              </span>
            </button>

            {/* 7. Toggle Theme */}
            <button
              onClick={onToggleDarkMode}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800/80 flex flex-col items-start gap-1 transition-all text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-xs">
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
              <span className="text-[9px] text-slate-500 dark:text-neutral-400 leading-tight">
                Switch visual theme
              </span>
            </button>

            {/* 8. Reset Queue */}
            <button
              onClick={() => {
                onClose();
                onResetQueue();
              }}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800/80 flex flex-col items-start gap-1 transition-all text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 flex items-center justify-center shadow-xs">
                <RotateCcw className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                Reset Queue
              </span>
              <span className="text-[9px] text-slate-500 dark:text-neutral-400 leading-tight">
                Load sample builds
              </span>
            </button>

          </div>

          {/* Cloudflare Public Sync Domain Badge */}
          <div className="p-2.5 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200/60 dark:border-cyan-900/60 flex items-center gap-2 text-[10px] text-cyan-800 dark:text-cyan-300">
            <Globe className="w-3.5 h-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
            <span className="truncate font-mono">
              https://homebinary.endrisusanto.my.id
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
