import React from 'react';
import { 
  Search, 
  Plus, 
  RotateCcw, 
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
  onOpenMobileMenu: () => void;
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
  onlineStatus?: string;
  appVersion?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenInputDrawer,
  onOpenSettings,
  onOpenUpdateModal,
  onOpenMobileMenu,
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
  appVersion = '0.5.15',
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md border-b border-slate-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 h-12 sm:h-14 flex items-center justify-between gap-1.5 sm:gap-4">
        
        {/* Left Branding / Title */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="font-bold text-xs sm:text-[17px] tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-white dark:via-neutral-100 dark:to-neutral-300 bg-clip-text text-transparent">
                Build HomeBinary
              </span>
              <span className="text-[8px] sm:text-[10px] uppercase font-semibold px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/90 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
                v{appVersion}
              </span>
            </div>
            <span className="text-[8px] sm:text-[11px] text-slate-400 dark:text-neutral-500 font-medium hidden xs:inline">
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
        <div className="flex items-center gap-1 sm:gap-2">
          
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
            className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-md sm:rounded-lg shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
            title="Paste & Parse raw build specs"
          >
            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">New Batch</span>
            <span className="xs:hidden">New</span>
          </button>

          {isRunning ? (
            <button
              onClick={onCancelBatch}
              className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-md sm:rounded-lg shadow-xs shadow-rose-500/20 transition-all animate-pulse cursor-pointer"
              title="Stop current execution"
            >
              <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
              <span>Cancel</span>
            </button>
          ) : (
            <button
              onClick={onStartBatch}
              disabled={totalItems === 0}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-md sm:rounded-lg transition-all cursor-pointer ${
                totalItems > 0
                  ? 'text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-xs shadow-emerald-500/20'
                  : 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed border border-slate-200 dark:border-slate-700'
              }`}
              title={totalItems > 0 ? "Execute batch submission" : "Add items to queue first"}
            >
              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
              <span>Run</span>
            </button>
          )}

          {/* Fetch Build ID button for building completed items (Desktop) */}
          <button
            onClick={onFetchBuildIds}
            disabled={isRunning || completedBuildingCount === 0}
            className={`hidden md:flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-md sm:rounded-lg transition-all cursor-pointer ${
              completedBuildingCount > 0 && !isRunning
                ? 'text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-xs shadow-indigo-500/20'
                : 'text-slate-400 bg-slate-100 dark:bg-neutral-800/80 cursor-not-allowed border border-slate-200 dark:border-neutral-800'
            }`}
            title={
              completedBuildingCount > 0
                ? `Fetch Build IDs from Dashboard for ${completedBuildingCount} submitted build(s) currently marked as Building (runs Headless)`
                : "No completed builds currently missing Build IDs"
            }
          >
            <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">Fetch ID</span>
            {completedBuildingCount > 0 && (
              <span className="px-1 py-0.2 text-[8px] sm:text-[9px] font-bold rounded-full bg-indigo-400 dark:bg-indigo-500 text-white">
                {completedBuildingCount}
              </span>
            )}
          </button>

          {/* Desktop Toolbar Icons */}
          <div className="hidden sm:flex items-center gap-1">
            <div className="h-4 sm:h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 sm:mx-1" />

            <button
              onClick={onResetQueue}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Reset queue to sample items"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenUpdateModal}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title={`Check for Updates (v${appVersion})`}
            >
              <ArrowUpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenSettings}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Portal & SSO Configuration"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleDarkMode}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Mobile Grid Menu Trigger Button */}
          <button
            onClick={onOpenMobileMenu}
            className="sm:hidden p-1.5 text-slate-700 dark:text-neutral-200 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-md transition-colors flex items-center justify-center relative"
            title="Open Quick Actions Menu"
          >
            <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
              <span className="w-1.5 h-1.5 bg-current rounded-xs" />
              <span className="w-1.5 h-1.5 bg-current rounded-xs" />
              <span className="w-1.5 h-1.5 bg-current rounded-xs" />
              <span className="w-1.5 h-1.5 bg-current rounded-xs" />
            </div>
            {completedBuildingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-indigo-500 absolute -top-0.5 -right-0.5" />
            )}
          </button>

        </div>

      </div>
    </header>
  );
};
