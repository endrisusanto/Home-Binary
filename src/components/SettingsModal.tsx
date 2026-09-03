import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Globe, 
  RotateCcw, 
  Check, 
  ArrowUpCircle, 
  Monitor, 
  Cpu, 
  RefreshCw, 
  Radio, 
  CheckCircle2, 
  AlertCircle,
  Wifi,
  WifiOff,
  ScanFace,
  KeyRound
} from 'lucide-react';
import { PortalConfig, ConnectedClient } from '../types/batch';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PortalConfig;
  onSaveConfig: (newConfig: PortalConfig) => void;
  onOpenUpdateModal?: () => void;
  appVersion?: string;
  connectedClients?: ConnectedClient[];
  isDesktopConnected?: boolean;
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
  connectedClients = [],
  isDesktopConnected = false,
}) => {
  const [formData, setFormData] = useState<PortalConfig>(config);
  const [savedNotice, setSavedNotice] = useState(false);
  const [clientsList, setClientsList] = useState<ConnectedClient[]>(connectedClients);
  const [isRefreshingClients, setIsRefreshingClients] = useState(false);

  // Sync internal client list when prop updates
  useEffect(() => {
    if (connectedClients && connectedClients.length > 0) {
      setClientsList(connectedClients);
    }
  }, [connectedClients]);

  // Fetch latest clients list from API when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchClientsList();
    }
  }, [isOpen]);

  const fetchClientsList = async () => {
    setIsRefreshingClients(true);
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        if (data.clients && Array.isArray(data.clients)) {
          setClientsList(data.clients);
        }
      }
    } catch {}
    finally {
      setIsRefreshingClients(false);
    }
  };

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

  const desktopClients = clientsList.filter((c) => c.isDesktop || c.clientType === 'desktop');
  const webClients = clientsList.filter((c) => !c.isDesktop && c.clientType !== 'desktop');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#09090b] w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Settings & Tauri Desktop Entities
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-neutral-500">
                Connected desktop nodes, version telemetry & portal engine config
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          
          {/* 1. TAURI DESKTOP CONNECTED ENTITIES & VERSIONS SECTION */}
          <div className="p-3 sm:p-4 rounded-xl bg-slate-50/80 dark:bg-[#0c0c0f] border border-slate-200 dark:border-neutral-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 uppercase tracking-wider">
                  Online Tauri Desktop Entities
                </span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono ${
                  desktopClients.length > 0
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${desktopClients.length > 0 ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                  {desktopClients.length > 0 ? `${desktopClients.length} Desktop Active` : '0 Desktop Connected'}
                </span>
              </div>

              <button
                type="button"
                onClick={fetchClientsList}
                disabled={isRefreshingClients}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-neutral-800/80 rounded-md border border-slate-200 dark:border-neutral-700 transition-all disabled:opacity-50"
                title="Refresh connected entities"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isRefreshingClients ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Desktop Entities Table */}
            {desktopClients.length === 0 ? (
              <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[10px] sm:text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  <p className="font-semibold">No Windows Desktop (Tauri) app currently connected.</p>
                  <p className="text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                    When you run a batch from this Web interface, the server container will automatically execute it in headless mode. Open the Tauri Desktop App on Windows to enable execution with your local browser SSO session.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#070709]">
                <table className="w-full text-left text-[10px] sm:text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-[#121215] text-slate-500 dark:text-neutral-400 border-b border-slate-200 dark:border-neutral-800 font-semibold">
                      <th className="py-1.5 px-2.5">Entity / Node</th>
                      <th className="py-1.5 px-2.5">Actual Version</th>
                      <th className="py-1.5 px-2.5 font-mono">IP Address</th>
                      <th className="py-1.5 px-2.5">Connected</th>
                      <th className="py-1.5 px-2.5 text-right">Execution Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 font-sans">
                    {desktopClients.map((client, idx) => (
                      <tr key={client.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-neutral-900/40 transition-colors">
                        <td className="py-2 px-2.5 font-medium text-slate-800 dark:text-neutral-200 flex items-center gap-1.5 whitespace-nowrap">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Windows Desktop #{idx + 1}</span>
                          <span className="text-[9px] font-mono text-slate-400">({client.id})</span>
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            v{client.version || appVersion || '0.5.6'}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-600 dark:text-neutral-400 whitespace-nowrap text-[9px] sm:text-[10px]">
                          {client.ip || '127.0.0.1'}
                        </td>
                        <td className="py-2 px-2.5 text-slate-500 dark:text-neutral-400 whitespace-nowrap text-[9px] sm:text-[10px]">
                          {client.connectedAt ? new Date(client.connectedAt).toLocaleTimeString() : 'Active'}
                        </td>
                        <td className="py-2 px-2.5 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <Cpu className="w-2.5 h-2.5" />
                            Primary Runner
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total Connected Summary Footer */}
            <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 dark:text-neutral-500 pt-1">
              <span>WebSocket Relay: <strong className="font-mono text-slate-600 dark:text-neutral-300">wss://homebinary.endrisusanto.my.id/ws</strong></span>
              <span>Total Active Web Sessions: <strong className="text-blue-500 font-mono">{webClients.length}</strong></span>
            </div>
          </div>

          {/* 2. TARGET BASE URL */}
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

          {/* 3. SSO AUTHENTICATION & LOGIN METHOD */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070709] border border-slate-200/80 dark:border-neutral-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ScanFace className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                  SSO Login Method
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">SecSSO / Knox / ADFS</span>
            </div>

            {/* Method Choice: Face ID (Main) vs Manual Input (Alternative) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Option 1: Face ID (Main Option) */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, ssoAuthMethod: 'face_id' })}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                  (formData.ssoAuthMethod ?? 'face_id') === 'face_id'
                    ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-500/80 shadow-xs text-blue-900 dark:text-blue-200 ring-1 ring-blue-500/30'
                    : 'bg-white dark:bg-[#0c0c0e] border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 text-slate-600 dark:text-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <ScanFace className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Face ID
                  </span>
                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-blue-600 text-white uppercase tracking-wider">
                    Main
                  </span>
                </div>
                <span className="text-[9px] text-slate-500 dark:text-neutral-400 leading-tight">
                  Primary option: Camera recognition on Samsung SSO portal
                </span>
              </button>

              {/* Option 2: Manual Input (Alternative) */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, ssoAuthMethod: 'manual' })}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                  formData.ssoAuthMethod === 'manual'
                    ? 'bg-amber-50/90 dark:bg-amber-950/60 border-amber-500/80 shadow-xs text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/30'
                    : 'bg-white dark:bg-[#0c0c0e] border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 text-slate-600 dark:text-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Manual Input
                  </span>
                  <span className="text-[8px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                    Alt
                  </span>
                </div>
                <span className="text-[9px] text-slate-500 dark:text-neutral-400 leading-tight">
                  Alternative: Auto-fill username and password fields
                </span>
              </button>
            </div>

            {/* Credentials fields for Manual Input or fallback */}
            <div className="pt-1 space-y-1.5">
              <div className="text-[10px] font-medium text-slate-500 dark:text-neutral-400 flex items-center justify-between">
                <span>{formData.ssoAuthMethod === 'manual' ? 'Manual Credentials (Active)' : 'Alternative Fallback Credentials'}</span>
                <span className="text-[9px] text-slate-400">(Optional)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 dark:text-neutral-400">
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
                  <label className="text-[10px] text-slate-500 dark:text-neutral-400">
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
          </div>

          {/* 4. AUTOMATION & BROWSER TOGGLES */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            
            {/* Headless Toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Headless Browser Mode
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-400">
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
                <span className="text-[10px] sm:text-[11px] text-slate-400">
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

          {/* 5. DELAYS AND TIMEOUTS */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Parallel Tabs
              </label>
              <input
                type="number"
                min="1"
                max="8"
                step="1"
                value={formData.concurrency ?? 3}
                onChange={(e) => setFormData({ ...formData, concurrency: Math.max(1, Math.min(8, Number(e.target.value) || 1)) })}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Delay / Stagger (ms)
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
              <label className="text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Timeout (ms)
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

          {/* 6. APP VERSION & UPDATER SECTION */}
          <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                Web App Version
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Build HomeBinary v{appVersion || '0.5.6'}
              </span>
            </div>
            {onOpenUpdateModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUpdateModal();
                }}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg border border-blue-200/80 dark:border-blue-800/80 transition-colors cursor-pointer"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                <span>Check Updates</span>
              </button>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
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
