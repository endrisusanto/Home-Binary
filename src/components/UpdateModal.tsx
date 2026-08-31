import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowUpCircle, 
  RotateCw, 
  CheckCircle2, 
  ExternalLink, 
  Download, 
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Package,
  HardDrive,
  RefreshCw
} from 'lucide-react';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: string;
}

interface ReleaseInfo {
  version: string;
  tagName: string;
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
  hasUpdate: boolean;
}

type UpdatePhase = 'idle' | 'downloading' | 'verifying' | 'installing' | 'relaunching' | 'completed';

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  currentVersion,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadBytes, setDownloadBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [updatePhase, setUpdatePhase] = useState<UpdatePhase>('idle');
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTriggeringDesktop, setIsTriggeringDesktop] = useState(false);
  const [desktopTriggerSuccess, setDesktopTriggerSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkForUpdates();
    } else {
      setIsInstalling(false);
      setUpdatePhase('idle');
      setDownloadProgress(0);
    }
  }, [isOpen]);

  const compareVersions = (v1: string, v2: string): number => {
    const clean1 = v1.replace(/^v/, '').split('.').map(Number);
    const clean2 = v2.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(clean1.length, clean2.length); i++) {
      const num1 = clean1[i] || 0;
      const num2 = clean2[i] || 0;
      if (num2 > num1) return 1;
      if (num1 > num2) return -1;
    }
    return 0;
  };

  const checkForUpdates = async () => {
    setIsChecking(true);
    setError(null);

    // Try Tauri updater first if in desktop mode
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (update) {
          setReleaseInfo({
            version: update.version,
            tagName: `v${update.version}`,
            name: `Build HomeBinary v${update.version}`,
            body: update.body || 'New improvements and bug fixes.',
            publishedAt: new Date(update.date || Date.now()).toLocaleDateString(),
            htmlUrl: 'https://github.com/endrisusanto/Home-Binary/releases',
            hasUpdate: true,
          });
          setIsChecking(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Tauri updater check fallback to GitHub API:', e);
    }

    // Fallback: Query GitHub Releases API directly
    try {
      let activeVer = currentVersion;
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
          const { getVersion } = await import('@tauri-apps/api/app');
          const v = await getVersion();
          if (v) activeVer = v;
        } catch {}
      }

      const res = await fetch('https://api.github.com/repos/endrisusanto/Home-Binary/releases/latest', {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });

      if (!res.ok) {
        if (res.status === 404) {
          setReleaseInfo({
            version: activeVer,
            tagName: `v${activeVer}`,
            name: `Build HomeBinary v${activeVer}`,
            body: 'No newer public releases published yet.',
            publishedAt: new Date().toLocaleDateString(),
            htmlUrl: 'https://github.com/endrisusanto/Home-Binary/releases',
            hasUpdate: false,
          });
          setIsChecking(false);
          return;
        }
        throw new Error(`GitHub API returned status ${res.status}`);
      }

      const data = await res.json();
      const latestTag = data.tag_name || data.name || '0.0.0';
      const hasUpdate = compareVersions(activeVer, latestTag) > 0;

      setReleaseInfo({
        version: latestTag.replace(/^v/, ''),
        tagName: latestTag,
        name: data.name || `Build HomeBinary ${latestTag}`,
        body: data.body || 'Bug fixes and performance improvements.',
        publishedAt: new Date(data.published_at || Date.now()).toLocaleDateString(),
        htmlUrl: data.html_url || 'https://github.com/endrisusanto/Home-Binary/releases',
        hasUpdate,
      });
    } catch (err: any) {
      setError(`Unable to check for updates: ${err.message || err}`);
    } finally {
      setIsChecking(false);
    }
  };

  const handleInstallUpdate = async () => {
    setIsInstalling(true);
    setError(null);
    setDownloadProgress(5);
    setUpdatePhase('downloading');

    const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);

    if (!isTauri) {
      // Web / Docker Container Remote Update Mode
      try {
        setDownloadProgress(25);
        setUpdatePhase('downloading');
        
        const res = await fetch('/api/system/update', { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        setDownloadProgress(55);
        setUpdatePhase('installing');
        
        // Wait for server to pull, rebuild, and restart container
        await new Promise(r => setTimeout(r, 3000));
        setDownloadProgress(80);
        setUpdatePhase('relaunching');

        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const hRes = await fetch('/api/health');
            if (hRes.ok) {
              clearInterval(pollInterval);
              setDownloadProgress(100);
              setUpdatePhase('completed');
              setTimeout(() => {
                window.location.reload();
              }, 800);
            }
          } catch {}
          if (attempts > 20) {
            clearInterval(pollInterval);
            setIsInstalling(false);
            window.location.reload();
          }
        }, 1500);

        return;
      } catch (err: any) {
        setError(`Remote server update error: ${err.message}`);
        setIsInstalling(false);
        setUpdatePhase('idle');
      }
    }

    try {
      if (isTauri) {
        const { check } = await import('@tauri-apps/plugin-updater');
        const { relaunch } = await import('@tauri-apps/plugin-process');

        const update = await check();
        if (update) {
          setDownloadProgress(10);
          setUpdatePhase('downloading');

          let currentDownloaded = 0;
          let totalContentLength = 0;

          await update.downloadAndInstall((event) => {
            switch (event.event) {
              case 'Started':
                totalContentLength = event.data.contentLength || 15 * 1024 * 1024;
                setTotalBytes(totalContentLength);
                setUpdatePhase('downloading');
                break;
              case 'Progress':
                currentDownloaded += event.data.chunkLength;
                setDownloadBytes(currentDownloaded);
                if (totalContentLength > 0) {
                  const pct = Math.min(92, Math.round((currentDownloaded / totalContentLength) * 90));
                  setDownloadProgress(pct);
                }
                break;
              case 'Finished':
                setDownloadProgress(95);
                setUpdatePhase('installing');
                break;
            }
          });

          setDownloadProgress(100);
          setUpdatePhase('relaunching');
          await new Promise(r => setTimeout(r, 600));
          await relaunch();
          return;
        }
      }
    } catch (e: any) {
      console.warn('Direct installer error:', e);
      setError(`Automatic install notice: ${e.message}. Opening GitHub releases...`);
    }

    // Fallback: open GitHub release download page
    if (releaseInfo?.htmlUrl) {
      window.open(releaseInfo.htmlUrl, '_blank', 'noopener,noreferrer');
    }
    setIsInstalling(false);
    setUpdatePhase('idle');
  };

  const handleTriggerDesktopUpdate = async () => {
    setIsTriggeringDesktop(true);
    setDesktopTriggerSuccess(false);
    setError(null);
    try {
      const res = await fetch('/api/system/trigger-desktop-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: releaseInfo?.version || 'latest' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDesktopTriggerSuccess(true);
      setTimeout(() => setDesktopTriggerSuccess(false), 4000);
    } catch (e: any) {
      setError(`Failed to trigger desktop update: ${e.message}`);
    } finally {
      setIsTriggeringDesktop(false);
    }
  };

  if (!isOpen) return null;

  const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#09090b] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/80 dark:border-blue-800/80">
              <ArrowUpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Software Updates
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-neutral-500">
                Check and install latest Build HomeBinary versions
              </p>
            </div>
          </div>
          {!isInstalling && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* ========================================================================= */}
          {/* LIVE DOWNLOADING / INSTALLING PROGRESS MODAL VIEW */}
          {/* ========================================================================= */}
          {isInstalling ? (
            <div className="py-4 px-3 space-y-5 animate-in fade-in-50 duration-200">
              
              {/* Animated Download Badge & Status */}
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 flex items-center justify-center shadow-lg shadow-blue-500/10">
                    {updatePhase === 'downloading' && (
                      <Download className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-bounce" />
                    )}
                    {updatePhase === 'verifying' && (
                      <ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                    )}
                    {updatePhase === 'installing' && (
                      <Package className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-pulse" />
                    )}
                    {updatePhase === 'relaunching' && (
                      <RefreshCw className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
                    )}
                    {updatePhase === 'completed' && (
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-50" />
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    {updatePhase === 'downloading' && `Downloading Update v${releaseInfo?.version || 'Latest'}`}
                    {updatePhase === 'verifying' && 'Verifying Checksum & Signatures'}
                    {updatePhase === 'installing' && 'Unpacking & Installing Package'}
                    {updatePhase === 'relaunching' && 'Relaunching Application...'}
                    {updatePhase === 'completed' && 'Update Installed Successfully!'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                    {isTauri 
                      ? 'Downloading latest binary asset from GitHub Releases...'
                      : 'Pulling latest git commits, rebuilding frontend & restarting container...'}
                  </p>
                </div>
              </div>

              {/* Progress Bar & Percentage */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-[#121215] border border-slate-200 dark:border-neutral-800 shadow-inner">
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-700 dark:text-neutral-300">
                  <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>
                      {totalBytes > 0 
                        ? `${(downloadBytes / (1024 * 1024)).toFixed(1)} MB / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB` 
                        : (isTauri ? 'Downloading packages...' : 'Building Vite production assets...')}
                    </span>
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {downloadProgress}%
                  </span>
                </div>

                {/* Animated Glowing Progress Bar */}
                <div className="w-full bg-slate-200 dark:bg-neutral-800 h-3 rounded-full overflow-hidden p-0.5 relative">
                  <div 
                    className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-300 relative overflow-hidden shadow-sm"
                    style={{ width: `${downloadProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/25 animate-[shimmer_1.5s_infinite]" />
                  </div>
                </div>

                {/* Checklist steps */}
                <div className="pt-2 border-t border-slate-200/70 dark:border-neutral-800/80 space-y-1.5 text-[10px] sm:text-[11px] font-sans">
                  <div className="flex items-center justify-between text-slate-600 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>Fetch release metadata from GitHub</span>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">Done</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      {downloadProgress >= 90 ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <RotateCw className="w-3 h-3 text-blue-500 animate-spin" />
                      )}
                      <span>Download release binary asset</span>
                    </span>
                    <span className="font-semibold font-mono text-blue-600 dark:text-blue-400">
                      {downloadProgress >= 90 ? 'Done' : `${downloadProgress}%`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      {downloadProgress === 100 ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-slate-300 dark:border-neutral-700 inline-block" />
                      )}
                      <span>Install & Relaunch application</span>
                    </span>
                    <span className="font-semibold font-mono text-slate-400">
                      {downloadProgress === 100 ? 'Relaunching...' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 dark:text-neutral-500">
                Please wait while the auto-installer completes the update process.
              </div>

            </div>
          ) : (
            /* ========================================================================= */
            /* REGULAR UPDATE CHECKER & INFO VIEW */
            /* ========================================================================= */
            <>
              {/* Status Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121215] border border-slate-200/80 dark:border-neutral-800 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500 dark:text-neutral-400">Current Installed:</span>
                  <span className="font-mono bg-slate-200/60 dark:bg-neutral-800 px-2 py-0.5 rounded text-slate-800 dark:text-neutral-200">
                    v{currentVersion}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500 dark:text-neutral-400">Latest Release:</span>
                  <span className="font-mono bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/60">
                    {isChecking ? 'Checking...' : releaseInfo ? `v${releaseInfo.version}` : '—'}
                  </span>
                </div>

                {/* Status Message */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-neutral-800/60 flex items-center gap-2 text-xs">
                  {isChecking ? (
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking GitHub repository...</span>
                    </div>
                  ) : releaseInfo?.hasUpdate ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>New update available (v{releaseInfo.version})!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-neutral-300 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>You are using the latest version.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Remote Update Trigger Box (Shown in Web mode) */}
              {!isTauri && (
                <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      Remote Desktop Trigger
                    </span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                      Windows App
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                    Send an immediate remote command to all running Windows Desktop Tauri apps to auto-download and install the update.
                  </p>
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleTriggerDesktopUpdate}
                      disabled={isTriggeringDesktop}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all shadow-xs shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
                    >
                      <RotateCw className={`w-3 h-3 ${isTriggeringDesktop ? 'animate-spin' : ''}`} />
                      <span>{isTriggeringDesktop ? 'Broadcasting...' : 'Trigger Desktop Auto-Update'}</span>
                    </button>

                    {desktopTriggerSuccess && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Signal sent!
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Changelog / Release Notes */}
              {releaseInfo?.hasUpdate && releaseInfo.body && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400">
                    What's New in v{releaseInfo.version}:
                  </span>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#070709] border border-slate-200/70 dark:border-neutral-800 text-xs font-mono text-slate-700 dark:text-neutral-300 max-h-32 overflow-y-auto whitespace-pre-line leading-relaxed">
                    {releaseInfo.body}
                  </div>
                </div>
              )}

              {/* Error notice */}
              {error && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2">
                <button
                  onClick={checkForUpdates}
                  disabled={isChecking || isInstalling}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>

                <div className="flex items-center gap-2">
                  {releaseInfo?.hasUpdate ? (
                    <button
                      onClick={handleInstallUpdate}
                      disabled={isInstalling}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg shadow-sm shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Update Server & Desktop</span>
                    </button>
                  ) : (
                    <a
                      href="https://github.com/endrisusanto/Home-Binary/releases"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>Releases</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
