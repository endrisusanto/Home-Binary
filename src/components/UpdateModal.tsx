import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowUpCircle, 
  RotateCw, 
  CheckCircle2, 
  ExternalLink, 
  Download, 
  Sparkles,
  AlertCircle
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

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  currentVersion,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compareVersions = (v1: string, v2: string): number => {
    // Return 1 if v2 > v1, -1 if v1 > v2, 0 if equal
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

  useEffect(() => {
    if (isOpen) {
      checkForUpdates();
    }
  }, [isOpen]);

  const handleInstallUpdate = async () => {
    setIsInstalling(true);
    setError(null);
    setDownloadProgress(25);

    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const { check } = await import('@tauri-apps/plugin-updater');
        const { relaunch } = await import('@tauri-apps/plugin-process');

        const update = await check();
        if (update) {
          setDownloadProgress(50);
          let downloaded = 0;
          let contentLength = 0;

          await update.downloadAndInstall((event) => {
            switch (event.event) {
              case 'Started':
                contentLength = event.data.contentLength || 100;
                break;
              case 'Progress':
                downloaded += event.data.chunkLength;
                if (contentLength > 0) {
                  setDownloadProgress(Math.round(50 + (downloaded / contentLength) * 45));
                }
                break;
              case 'Finished':
                setDownloadProgress(100);
                break;
            }
          });

          await relaunch();
          return;
        }
      }
    } catch (e: any) {
      console.warn('Direct installer error:', e);
      setError(`Automatic install error: ${e.message}. Opening GitHub releases...`);
    }

    // Fallback: open GitHub release download page
    if (releaseInfo?.htmlUrl) {
      window.open(releaseInfo.htmlUrl, '_blank', 'noopener,noreferrer');
    }
    setIsInstalling(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#09090b] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ArrowUpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Software Updates
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-neutral-500">
                Check and install latest Build HomeBinary versions
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

        {/* Content */}
        <div className="p-5 space-y-4">
          
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

          {/* Download progress */}
          {isInstalling && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-blue-600 dark:text-blue-400">
                <span>Downloading update package...</span>
                <span>{downloadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <div className="flex items-center gap-2">
              {releaseInfo?.hasUpdate ? (
                <button
                  onClick={handleInstallUpdate}
                  disabled={isInstalling}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg shadow-sm shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isInstalling ? 'Installing...' : 'Update Now'}</span>
                </button>
              ) : (
                <a
                  href="https://github.com/endrisusanto/Home-Binary/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                >
                  <span>Releases</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
