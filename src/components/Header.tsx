import React from 'react';
import { 
  Search, 
  Plus, 
  RotateCcw, 
  Terminal, 
  Settings, 
  Sun, 
  Moon, 
  Play, 
  Square,
  ArrowUpCircle
} from 'lucide-react';

interface HeaderProps {
  onOpenInputDrawer: () => void;
  onOpenSettings: () => void;
  onOpenUpdateModal: () => void;
  onToggleLogs: () => void;
  isLogsOpen: boolean;
  logsCount: number;
  isRunning: boolean;
  onStartBatch: () => void;
  onCancelBatch: () => void;
  onResetQueue: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalItems: number;
  trackProgress: boolean;
  onToggleTrackProgress: (checked: boolean) => void;
  onlineStatus?: string;
  appVersion?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenInputDrawer,
  onOpenSettings,
  onOpenUpdateModal,
  onToggleLogs,
  isLogsOpen,
  logsCount,
  isRunning,
  onStartBatch,
  onCancelBatch,
  onResetQueue,
  isDarkMode,
  onToggleDarkMode,
  searchQuery,
  onSearchChange,
  totalItems,
  trackProgress,
  onToggleTrackProgress,
  onlineStatus = 'Online',
  appVersion = '0.1.0',
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#09090b]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-neutral-800 transition-colors duration-150">
      <div className="w-full px-3 h-13 flex items-center justify-between gap-3">
        
        {/* Left Branding */}
        <div className="flex items-center gap-3 min-w-max">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center p-0.5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-neutral-900 dark:to-neutral-800 shadow-sm border border-slate-200/60 dark:border-neutral-800">
            <img 
              src="/logo.svg" 
              alt="Build HomeBinary" 
              className="w-7 h-7 object-contain hover:rotate-6 transition-transform duration-300"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[17px] tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-white dark:via-neutral-100 dark:to-neutral-300 bg-clip-text text-transparent">
                Build HomeBinary
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/90 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
                QB 2.0
              </span>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-neutral-500 font-medium">
              Samsung QuickBuild Submitter
            </span>
          </div>
        </div>

        {/* Center Search / Quick Input bar */}
        <div className="flex-1 max-w-xl hidden md:flex items-center">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500" />
            <input 
              type="text"
              placeholder="Search builds by ID, Fingerprint, PDA, or CSC..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-100/90 dark:bg-[#121215] hover:bg-slate-100 dark:hover:bg-[#18181c] focus:bg-white dark:focus:bg-[#121215] rounded-full border border-slate-200/80 dark:border-neutral-800 focus:border-blue-500 dark:focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-slate-700 dark:text-neutral-200 shadow-inner"
            />
          </div>
        </div>

        {/* Right Action Icons & Controls */}
        <div className="flex items-center gap-2">
          
          {/* Track Build Progress Checkbox Toggle */}
          <label 
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer bg-slate-100 hover:bg-slate-200/80 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 select-none transition-colors"
            title="When checked: Submits all build forms first, then monitors Samsung QuickBuild Dashboard for progress (>50% & completion). When unchecked: Submits triggers immediately without waiting for dashboard polling."
          >
            <input 
              type="checkbox"
              checked={trackProgress}
              onChange={(e) => onToggleTrackProgress(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
            />
            <span className="text-[11px] font-semibold">Track Progress</span>
          </label>

          {/* Main Action Buttons */}
          <button
            onClick={onOpenInputDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-sm shadow-blue-500/20 transition-all"
            title="Paste & Parse raw build specs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Batch</span>
          </button>

          {isRunning ? (
            <button
              onClick={onCancelBatch}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-lg shadow-sm shadow-rose-500/20 transition-all animate-pulse"
              title="Stop current execution"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Cancel</span>
            </button>
          ) : (
            <button
              onClick={onStartBatch}
              disabled={totalItems === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                totalItems > 0
                  ? 'text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-sm shadow-emerald-500/20'
                  : 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed border border-slate-200 dark:border-slate-700'
              }`}
              title={totalItems > 0 ? "Execute batch submission" : "Add items to queue first"}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Batch</span>
            </button>
          )}

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

          {/* Quick Refresh */}
          <button
            onClick={onResetQueue}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Reset queue"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Logs Console Toggle */}
          <button
            onClick={onToggleLogs}
            className={`relative p-2 rounded-lg transition-colors ${
              isLogsOpen 
                ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800' 
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle Live Console Logs"
          >
            <Terminal className="w-4 h-4" />
            {logsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold bg-blue-600 text-white rounded-full flex items-center justify-center">
                {logsCount > 99 ? '99+' : logsCount}
              </span>
            )}
          </button>

          {/* Check Updates Modal Toggle */}
          <button
            onClick={onOpenUpdateModal}
            className="p-2 text-slate-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            title={`Check for Updates (v${appVersion})`}
          >
            <ArrowUpCircle className="w-4 h-4" />
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            title="Portal & SSO Configuration"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Online status badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isRunning ? 'Running' : onlineStatus}</span>
          </div>

        </div>

      </div>
    </header>
  );
};
