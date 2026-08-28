import React, { useState } from 'react';
import { X, Settings, Globe, RotateCcw, Check, ArrowUpCircle } from 'lucide-react';
import { PortalConfig } from '../types/batch';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PortalConfig;
  onSaveConfig: (newConfig: PortalConfig) => void;
  onOpenUpdateModal?: () => void;
  appVersion?: string;
}

const DEFAULT_CONFIG: PortalConfig = {
  baseUrl: 'https://android.qb.sec.samsung.net/overview/28905',
  formUrl: 'https://android.qb.sec.samsung.net/wicket/page?6',
  headless: true,
  delayMs: 1000,
  timeoutMs: 30000,
  mock: false,
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onOpenUpdateModal,
  appVersion,
}) => {
  const [formData, setFormData] = useState<PortalConfig>(config);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 400);
  };

  const handleResetDefaults = () => {
    setFormData(DEFAULT_CONFIG);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#09090b] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Portal & Engine Configuration
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-neutral-500">
                Samsung QB endpoints & browser execution settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Target Base URL */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              Overview Portal URL
            </label>
            <input
              type="text"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:border-blue-500 outline-none"
              placeholder="https://android.qb.sec.samsung.net/overview/..."
            />
          </div>

          {/* Form Endpoint URL */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              Wicket Form URL
            </label>
            <input
              type="text"
              value={formData.formUrl}
              onChange={(e) => setFormData({ ...formData, formUrl: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:border-blue-500 outline-none"
              placeholder="https://android.qb.sec.samsung.net/wicket/page?..."
            />
          </div>

          {/* SSO Authentication Credentials */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070709] border border-slate-200/80 dark:border-neutral-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-neutral-200">
                SSO Auto-Login Credentials
              </span>
              <span className="text-[10px] text-slate-400 font-mono">SecSSO / ADFS</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
                  Username / ID
                </label>
                <input
                  type="text"
                  value={formData.username || ''}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-neutral-800 rounded-lg outline-none focus:border-blue-500"
                  placeholder="endri.s"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-neutral-800 rounded-lg outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {/* Automation & Browser Toggles */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            
            {/* Headless Toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Headless Browser Mode
                </span>
                <span className="text-[11px] text-slate-400">
                  Run Chromium invisibly without opening a GUI window (disable for manual SSO)
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.headless}
                onChange={(e) => setFormData({ ...formData, headless: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>

            {/* Mock Mode Toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  Simulation / Mock Mode
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded">
                    TESTING
                  </span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Simulate form submission without connecting to external Samsung intranet
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.mock}
                onChange={(e) => setFormData({ ...formData, mock: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>

            {/* Track Progress Toggle */}
            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#070709] border border-slate-200/80 dark:border-neutral-800/80 cursor-pointer">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Track Build Progress (Dashboard Polling)
                </span>
                <span className="text-[10px] text-slate-400">
                  Submits all forms first, then polls Dashboard every 60s to track & fetch completed Build IDs
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.trackProgress ?? true}
                onChange={(e) => setFormData({ ...formData, trackProgress: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>

          </div>

          {/* Delays and Timeouts */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Delay Between Requests (ms)
              </label>
              <input
                type="number"
                min="0"
                step="250"
                value={formData.delayMs}
                onChange={(e) => setFormData({ ...formData, delayMs: Number(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Navigation Timeout (ms)
              </label>
              <input
                type="number"
                min="5000"
                step="5000"
                value={formData.timeoutMs}
                onChange={(e) => setFormData({ ...formData, timeoutMs: Number(e.target.value) || 30000 })}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
              />
            </div>
          </div>

          {/* App Version & Updater Section */}
          <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                Application Version
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Build HomeBinary v{appVersion || '0.1.0'}
              </span>
            </div>
            {onOpenUpdateModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUpdateModal();
                }}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg border border-blue-200/80 dark:border-blue-800/80 transition-colors"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                <span>Check Updates</span>
              </button>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                {savedNotice ? <Check className="w-3.5 h-3.5" /> : null}
                <span>Save Configuration</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
