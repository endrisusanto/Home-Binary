import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Trash2, 
  Clock, 
  Play,
  CheckCircle, 
  AlertTriangle, 
  RotateCcw,
  RotateCw,
  ExternalLink,
  Check,
  Timer
} from 'lucide-react';
import { BatchItem } from '../types/batch';

interface ExecutionSectionsProps {
  items: BatchItem[];
  isRunning: boolean;
  onRemoveItem: (id: string) => void;
  onRetryItem: (id: string) => void;
  onClearSection: (status: 'pending' | 'completed' | 'failed') => void;
  onRunItem: (item: BatchItem) => void;
  onSelectAllPending?: () => void;
  onFetchPendingAll?: () => void;
  onRecheckItem?: (item: BatchItem) => void;
  onRecheckFailedAll?: () => void;
  onRetryFailedAll?: () => void;
  onRunSelectedItems?: (selectedItems: BatchItem[]) => void;
  onFetchSelectedItems?: (selectedItems: BatchItem[]) => void;
  searchQuery: string;
  isLogsOpen?: boolean;
}

async function openSystemBrowser(url: string) {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    try {
      const core = await import('@tauri-apps/api/core');
      await core.invoke('open_browser_url', { url });
      return;
    } catch {}
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

// Interactive Build ID Component with Left-click (redirect) and Right-click (copy)
const BuildIdCell: React.FC<{ buildId?: string; isCompletedSection?: boolean }> = ({ buildId, isCompletedSection }) => {
  const [copied, setCopied] = useState(false);

  if (!buildId) {
    if (isCompletedSection) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider select-none shadow-xs whitespace-nowrap"
          title="Build is currently executing on QuickBuild server. Use 'Fetch Build ID' on toolbar to update."
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Building
        </span>
      );
    }
    return <span className="text-slate-400 dark:text-neutral-600 font-mono text-[9px] sm:text-[11px] whitespace-nowrap">-</span>;
  }

  const buildUrl = `https://android.qb.sec.samsung.net/build/${buildId}`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openSystemBrowser(buildUrl);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(buildUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative inline-flex items-center whitespace-nowrap">
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        title="Left-click: Open Build in Browser | Right-click: Copy URL to clipboard"
        className={`inline-flex items-center justify-center gap-1 font-mono text-[9px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 min-w-[65px] sm:min-w-[94px] rounded-md font-semibold whitespace-nowrap transition-all cursor-pointer select-none active:scale-95 ${
          copied
            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
            : 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/80 border border-blue-200/80 dark:border-blue-800/80 hover:border-blue-300 dark:hover:border-blue-600 shadow-xs'
        }`}
      >
        {copied ? (
          <>
            <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-50" />
            <span className="text-[8px] sm:text-[10px]">Copied!</span>
          </>
        ) : (
          <>
            <span className="whitespace-nowrap">{buildId}</span>
            <ExternalLink className="w-2 h-2 sm:w-2.5 sm:h-2.5 opacity-60 group-hover:opacity-100" />
          </>
        )}
      </button>
    </div>
  );
};

// Interactive Expired Remaining Component (4-Day QuickBuild Retention Calculator)
const ExpiredRemainingCell: React.FC<{ item: BatchItem }> = ({ item }) => {
  const dateStr = item.buildDate;

  if (item.status === 'pending') {
    return <span className="text-slate-400 dark:text-neutral-600 font-mono text-[8px] sm:text-[10px] whitespace-nowrap">-</span>;
  }

  if (item.status === 'running') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200/50 dark:border-blue-900/40 whitespace-nowrap">
        <Clock className="w-2.5 h-2.5 animate-spin" />
        <span>Active</span>
      </span>
    );
  }

  if (!dateStr) {
    if (item.status === 'failed' && (item.message?.includes('Build expired') || item.error?.includes('Build expired'))) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold font-mono text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900/60 whitespace-nowrap"
          title="Build has exceeded the 4-day QuickBuild retention window."
        >
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>Expired</span>
        </span>
      );
    }
    return <span className="text-slate-400 dark:text-neutral-600 font-mono text-[8px] sm:text-[10px] whitespace-nowrap">-</span>;
  }

  const buildTimestamp = Date.parse(dateStr.replace(' ', 'T'));
  if (isNaN(buildTimestamp)) {
    return <span className="text-slate-400 dark:text-neutral-600 font-mono text-[8px] sm:text-[10px] whitespace-nowrap">-</span>;
  }

  const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
  const expiryTimestamp = buildTimestamp + FOUR_DAYS_MS;
  const remainingMs = expiryTimestamp - Date.now();

  if (remainingMs <= 0 || item.message?.includes('Build expired') || item.error?.includes('Build expired')) {
    return (
      <span 
        className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold font-mono text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900/60 whitespace-nowrap"
        title={`Built on ${dateStr} (> 4 days ago) -> Retention period ended.`}
      >
        <AlertTriangle className="w-2.5 h-2.5" />
        <span>Expired</span>
      </span>
    );
  }

  const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  let timeText = '';
  if (days > 0) {
    timeText = `${days}d ${hours}h`;
  } else if (hours > 0) {
    timeText = `${hours}h ${minutes}m`;
  } else {
    timeText = `${minutes}m`;
  }

  let badgeStyle = 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80';
  if (days < 1) {
    badgeStyle = 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/80';
  } else if (days < 2) {
    badgeStyle = 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80';
  }

  return (
    <span 
      className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[8px] sm:text-[10px] font-semibold font-mono border whitespace-nowrap shadow-2xs ${badgeStyle}`}
      title={`Built on: ${dateStr} | Expires in: ${timeText} (4-day retention limit)`}
    >
      <Timer className="w-2.5 h-2.5 opacity-75" />
      <span>{timeText}</span>
    </span>
  );
};

export const ExecutionSections: React.FC<ExecutionSectionsProps> = ({
  items,
  isRunning,
  onRemoveItem,
  onRetryItem,
  onClearSection,
  onRunItem,
  onFetchPendingAll,
  onRecheckItem,
  onRecheckFailedAll,
  onRetryFailedAll,
  onRunSelectedItems,
  onFetchSelectedItems,
  searchQuery = '',
  isLogsOpen = false,
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    pending: true,
    running: true,
    completed: true,
    failed: true,
  });

  // ponytail: item selection state for batch re-run / execution
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectSection = (sectionItems: BatchItem[], forceSelect?: boolean) => {
    const allSelected = sectionItems.length > 0 && sectionItems.every((it) => selectedIds.has(it.id));
    const shouldSelect = forceSelect !== undefined ? forceSelect : !allSelected;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      sectionItems.forEach((it) => {
        if (shouldSelect) next.add(it.id);
        else next.delete(it.id);
      });
      return next;
    });
  };

  const handleRunSelected = (itemsToRun?: BatchItem[]) => {
    const targets = itemsToRun || items.filter((it) => selectedIds.has(it.id));
    if (targets.length === 0 || isRunning) return;
    if (onRunSelectedItems) {
      onRunSelectedItems(targets);
    } else {
      targets.forEach((it) => onRunItem(it));
    }
    // Clear selection for executed targets
    setSelectedIds((prev) => {
      const next = new Set(prev);
      targets.forEach((it) => next.delete(it.id));
      return next;
    });
  };

  const handleFetchSelected = (itemsToFetch?: BatchItem[]) => {
    const targets = itemsToFetch || items.filter((it) => selectedIds.has(it.id));
    if (targets.length === 0 || isRunning) return;
    if (onFetchSelectedItems) {
      onFetchSelectedItems(targets);
    }
    // Clear selection for fetched targets
    setSelectedIds((prev) => {
      const next = new Set(prev);
      targets.forEach((it) => next.delete(it.id));
      return next;
    });
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (it) =>
        it.buildFingerprintName.toLowerCase().includes(q) ||
        it.pdaVersion.toLowerCase().includes(q) ||
        it.cscVersion.toLowerCase().includes(q) ||
        (it.buildId && it.buildId.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const pendingItems = filteredItems.filter((i) => i.status === 'pending');
  const runningItems = filteredItems.filter((i) => i.status === 'running');
  const completedItems = filteredItems.filter((i) => i.status === 'success');
  const failedItems = filteredItems.filter((i) => i.status === 'failed');

  const selectedPending = pendingItems.filter((i) => selectedIds.has(i.id));
  const selectedCompleted = completedItems.filter((i) => selectedIds.has(i.id));
  const selectedFailed = failedItems.filter((i) => selectedIds.has(i.id));

  return (
    <div className="space-y-2 sm:space-y-3 relative">
      
      {/* 1. FETCHED / QUEUED BUILDS */}
      <div className="bg-white dark:bg-[#0c0c0e] rounded-lg sm:rounded-xl border border-slate-200/90 dark:border-neutral-800/90 shadow-xs overflow-hidden transition-all">
        <div 
          onClick={() => toggleSection('pending')}
          className="flex items-center justify-between px-2.5 py-2 sm:px-4 sm:py-3 bg-slate-50/70 dark:bg-[#121215] hover:bg-slate-50 dark:hover:bg-[#18181c] border-b border-slate-200/70 dark:border-neutral-800 cursor-pointer select-none"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            {openSections.pending ? (
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            )}
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              Fetched builds
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2" onClick={e => e.stopPropagation()}>
            {selectedPending.length > 0 && (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={() => handleRunSelected(selectedPending)}
                  disabled={isRunning}
                  className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 rounded-md border border-emerald-300 dark:border-emerald-700 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                  title="Submit fresh build forms for selected pending builds"
                >
                  <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
                  <span>Run Selected ({selectedPending.length})</span>
                </button>
                <button
                  onClick={() => handleFetchSelected(selectedPending)}
                  disabled={isRunning}
                  className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 hover:bg-amber-100 dark:hover:bg-amber-900/80 rounded-md border border-amber-300 dark:border-amber-800 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                  title="Fetch and check Build IDs from Dashboard for selected pending builds"
                >
                  <RotateCw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>Fetch IDs Selected ({selectedPending.length})</span>
                </button>
              </div>
            )}
            {pendingItems.length > 0 && selectedPending.length === 0 && (
              <div className="flex items-center gap-1 sm:gap-1.5">
                {onFetchPendingAll && (
                  <button
                    onClick={onFetchPendingAll}
                    disabled={isRunning}
                    className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-md border border-amber-300 dark:border-amber-800 transition-colors disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-amber-500 cursor-pointer"
                    title="Fetch and check existing Build IDs for pending builds from QuickBuild Dashboard"
                  >
                    <RotateCw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>Fetch IDs ({pendingItems.filter(i => !i.buildId).length})</span>
                  </button>
                )}
                <button
                  onClick={() => onClearSection('pending')}
                  className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-[11px] font-medium text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Clear pending queue"
                >
                  <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>Clear</span>
                </button>
              </div>
            )}
            <span className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[8px] sm:text-[10px] font-bold rounded-full bg-slate-200/80 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
              {pendingItems.length}
            </span>
          </div>
        </div>

        {openSections.pending && (
          <div className="p-0">
            {pendingItems.length === 0 ? (
              <div className="px-3 py-4 sm:px-5 sm:py-6 text-[10px] sm:text-xs text-slate-400 dark:text-neutral-500 font-medium">
                No fetched builds. Click <strong className="text-blue-500 cursor-pointer">+ New Batch</strong> above to paste build specs.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[9px] sm:text-xs border-collapse select-text">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-[#070709] text-slate-400 dark:text-neutral-500 border-b border-slate-100 dark:border-neutral-800/80">
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-3 font-semibold w-12 sm:w-16 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>#</span>
                          <input
                            type="checkbox"
                            checked={pendingItems.length > 0 && pendingItems.every(i => selectedIds.has(i.id))}
                            onChange={(e) => toggleSelectSection(pendingItems, e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            title="Select all fetched builds"
                          />
                        </div>
                      </th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold">Build Fingerprint</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold font-mono">PDA</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold font-mono">CSC</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold font-mono">Baseband</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold text-center w-24 sm:w-32 whitespace-nowrap">Expired Remaining</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold text-center w-16 sm:w-24">Status</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold text-right w-16 sm:w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 font-sans select-text">
                    {pendingItems.map((item, idx) => (
                      <tr 
                        key={item.id}
                        className={`transition-colors group select-text ${
                          selectedIds.has(item.id)
                            ? 'bg-blue-50/50 dark:bg-blue-950/20'
                            : 'hover:bg-slate-50/80 dark:hover:bg-[#151518]'
                        }`}
                      >
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-3 text-slate-400 font-mono text-center text-[9px] sm:text-[11px] whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                            <span className="select-text cursor-text">{idx + 1}</span>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectItem(item.id);
                              }}
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-slate-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-medium text-slate-800 dark:text-neutral-200 select-text cursor-text">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{item.buildFingerprintName}</span>
                            {item.buildId && <BuildIdCell buildId={item.buildId} />}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-mono text-slate-600 dark:text-neutral-400 text-[8px] sm:text-[11px] whitespace-nowrap select-text cursor-text">
                          {item.pdaVersion || '-'}
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-mono text-slate-600 dark:text-neutral-400 text-[8px] sm:text-[11px] whitespace-nowrap select-text cursor-text">
                          {item.cscVersion || '-'}
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-mono text-slate-600 dark:text-neutral-400 text-[8px] sm:text-[11px] whitespace-nowrap select-text cursor-text">
                          {item.basebandVersion || '-'}
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 text-center whitespace-nowrap">
                          <ExpiredRemainingCell item={item} />
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 text-center">
                          <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[8px] sm:text-[10px] font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-700 whitespace-nowrap">
                            <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                            Pending
                          </span>
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                            {onRecheckItem && !item.buildId && (
                              <button
                                onClick={() => onRecheckItem(item)}
                                disabled={isRunning}
                                className="p-0.5 sm:p-1 text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded transition-colors disabled:opacity-30 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
                                title="Fetch Build ID for this build from Dashboard"
                              >
                                <RotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => onRunItem(item)}
                              disabled={isRunning}
                              className="p-0.5 sm:p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded transition-colors disabled:opacity-30 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-500"
                              title="Submit this build only"
                            >
                              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                            </button>
                            <button
                              onClick={() => onRemoveItem(item.id)}
                              className="p-0.5 sm:p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-rose-500"
                              title="Remove item"
                            >
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. IN-PROGRESS SUBMISSIONS */}
      <div className="bg-white dark:bg-[#0c0c0e] rounded-lg sm:rounded-xl border border-slate-200/90 dark:border-neutral-800/90 shadow-xs overflow-hidden transition-all">
        <div 
          onClick={() => toggleSection('running')}
          className="flex items-center justify-between px-2.5 py-2 sm:px-4 sm:py-3 bg-slate-50/70 dark:bg-[#121215] hover:bg-slate-50 dark:hover:bg-[#18181c] border-b border-slate-200/70 dark:border-neutral-800 cursor-pointer select-none"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            {openSections.running ? (
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            )}
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              In-progress submissions
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2" onClick={e => e.stopPropagation()}>
            <span className={`w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[8px] sm:text-[10px] font-bold rounded-full ${
              runningItems.length > 0
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200/80 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300'
            }`}>
              {runningItems.length}
            </span>
          </div>
        </div>

        {openSections.running && (
          <div className="p-2 sm:p-3">
            {runningItems.length === 0 ? (
              <div className="px-2 py-3 sm:px-2 sm:py-4 text-[10px] sm:text-xs text-slate-400 dark:text-neutral-500 font-medium">
                No in-progress submissions currently running.
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2.5">
                {runningItems.map((item) => (
                  <div 
                    key={item.id}
                    className="p-2 sm:p-3.5 rounded-lg bg-emerald-50/60 dark:bg-[#062419] border border-emerald-300/70 dark:border-emerald-700/60 transition-all flex flex-col gap-1.5 sm:gap-2.5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex items-start gap-1.5 sm:gap-2.5">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[9px] sm:text-xs mt-0.5">
                          {item.index + 1}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            {item.buildId ? (
                              <span className="inline-flex items-center gap-1 text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Build In Progress
                              </span>
                            ) : (
                              <span className="text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-semibold uppercase border border-amber-300 dark:border-amber-800">
                                Submitting Form...
                              </span>
                            )}
                          </div>
                          <span className="text-[8px] sm:text-[11px] text-emerald-800/80 dark:text-emerald-300/80 font-mono mt-0.5">
                            PDA: {item.pdaVersion} &bull; CSC: {item.cscVersion} &bull; Baseband: {item.basebandVersion}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white/80 dark:hover:bg-neutral-800 rounded-md transition-colors"
                          title="Cancel this submission"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-0.5 sm:space-y-1">
                      <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                        <span className="truncate">{item.message || 'Populating form & submitting...'}</span>
                        <span className="ml-1">{item.progressPercent ?? 75}%</span>
                      </div>
                      <div className="w-full bg-emerald-200/60 dark:bg-emerald-950/90 h-1.5 sm:h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300 relative overflow-hidden"
                          style={{ width: `${item.progressPercent ?? 75}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. SUBMISSIONS COMPLETED */}
      <div className="bg-white dark:bg-[#0c0c0e] rounded-lg sm:rounded-xl border border-slate-200/90 dark:border-neutral-800/90 shadow-xs overflow-hidden transition-all">
        <div 
          onClick={() => toggleSection('completed')}
          className="flex items-center justify-between px-2.5 py-2 sm:px-4 sm:py-3 bg-slate-50/70 dark:bg-[#121215] hover:bg-slate-50 dark:hover:bg-[#18181c] border-b border-slate-200/70 dark:border-neutral-800 cursor-pointer select-none"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            {openSections.completed ? (
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            )}
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              Submissions completed
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2" onClick={e => e.stopPropagation()}>
            {selectedCompleted.length > 0 && (
              <button
                onClick={() => handleRunSelected(selectedCompleted)}
                disabled={isRunning}
                className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 rounded-md border border-emerald-300 dark:border-emerald-700 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="Re-run selected completed builds"
              >
                <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Re-run Selected ({selectedCompleted.length})</span>
              </button>
            )}
            {completedItems.length > 0 && (
              <button
                onClick={() => onClearSection('completed')}
                className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-[11px] font-medium text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                title="Clear completed submissions"
              >
                <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Clear</span>
              </button>
            )}
            <span className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[8px] sm:text-[10px] font-bold rounded-full bg-slate-200/80 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
              {completedItems.length}
            </span>
          </div>
        </div>

        {openSections.completed && (
          <div className="p-0">
            {completedItems.length === 0 ? (
              <div className="px-3 py-4 sm:px-5 sm:py-6 text-[10px] sm:text-xs text-slate-400 dark:text-neutral-500 font-medium">
                No submissions completed yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[9px] sm:text-xs border-collapse select-text">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-[#070709] text-slate-400 dark:text-neutral-500 border-b border-slate-100 dark:border-neutral-800/80">
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-3 font-semibold w-12 sm:w-16 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>#</span>
                          <input
                            type="checkbox"
                            checked={completedItems.length > 0 && completedItems.every(i => selectedIds.has(i.id))}
                            onChange={(e) => toggleSelectSection(completedItems, e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            title="Select all completed submissions"
                          />
                        </div>
                      </th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold w-24 sm:w-32 whitespace-nowrap">Build ID</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold whitespace-nowrap">Build Fingerprint</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold font-mono whitespace-nowrap">PDA</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold font-mono whitespace-nowrap">CSC</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold font-mono whitespace-nowrap">Baseband</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold text-center w-24 sm:w-32 whitespace-nowrap">Expired Remaining</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold text-right w-20 sm:w-28 whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 font-sans select-text">
                    {completedItems.map((item, idx) => (
                      <tr 
                        key={item.id}
                        className={`transition-colors select-text ${
                          selectedIds.has(item.id)
                            ? 'bg-blue-50/50 dark:bg-blue-950/20'
                            : 'hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20'
                        }`}
                      >
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-3 font-mono text-slate-400 text-center text-[8px] sm:text-[11px] whitespace-nowrap select-text">
                          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                            <span className="select-text cursor-text">{idx + 1}</span>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectItem(item.id);
                              }}
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-slate-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 whitespace-nowrap">
                          <BuildIdCell buildId={item.buildId} isCompletedSection={true} />
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-medium text-slate-800 dark:text-neutral-200 select-text cursor-text">
                          {item.buildFingerprintName}
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-mono text-slate-500 text-[8px] sm:text-[11px] whitespace-nowrap select-text cursor-text">
                          {item.pdaVersion}
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-mono text-slate-500 text-[8px] sm:text-[11px] whitespace-nowrap select-text cursor-text">
                          {item.cscVersion}
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-mono text-slate-500 text-[8px] sm:text-[11px] whitespace-nowrap select-text cursor-text">
                          {item.basebandVersion}
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 text-center whitespace-nowrap">
                          <ExpiredRemainingCell item={item} />
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[8px] sm:text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-800/80">
                            <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500" />
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. SUBMISSIONS FAILED */}
      <div className="bg-white dark:bg-[#0c0c0e] rounded-lg sm:rounded-xl border border-slate-200/90 dark:border-neutral-800/90 shadow-xs overflow-hidden transition-all">
        <div 
          onClick={() => toggleSection('failed')}
          className="flex items-center justify-between px-2.5 py-2 sm:px-4 sm:py-3 bg-slate-50/70 dark:bg-[#121215] hover:bg-slate-50 dark:hover:bg-[#18181c] border-b border-slate-200/70 dark:border-neutral-800 cursor-pointer select-none"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            {openSections.failed ? (
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            )}
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              Submissions failed
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2" onClick={e => e.stopPropagation()}>
            {selectedFailed.length > 0 && (
              <button
                onClick={() => handleRunSelected(selectedFailed)}
                disabled={isRunning}
                className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 hover:bg-amber-100 dark:hover:bg-amber-900/80 rounded-md border border-amber-300 dark:border-amber-700 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="Retry / Re-run selected failed builds"
              >
                <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Retry Selected ({selectedFailed.length})</span>
              </button>
            )}
            {failedItems.length > 0 && (
              <div className="flex items-center gap-1 sm:gap-1.5">
                {onRecheckFailedAll && (
                  <button
                    onClick={onRecheckFailedAll}
                    disabled={isRunning}
                    className="flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-md border border-blue-200/80 dark:border-blue-900/80 transition-colors disabled:opacity-40"
                    title="Fetch and re-check Build IDs for all failed submissions from Dashboard"
                  >
                    <RotateCw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>Re-check all</span>
                  </button>
                )}
                {onRetryFailedAll && (
                  <button
                    onClick={onRetryFailedAll}
                    disabled={isRunning}
                    className="flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-md border border-amber-200/80 dark:border-amber-900/80 transition-colors disabled:opacity-40"
                    title="Move all failed items back to queue and retry submission"
                  >
                    <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>Retry all</span>
                  </button>
                )}
                <button
                  onClick={() => onClearSection('failed')}
                  className="flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-[11px] font-medium text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Clear failed submissions"
                >
                  <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>Clear</span>
                </button>
              </div>
            )}
            <span className={`w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[8px] sm:text-[10px] font-bold rounded-full ${
              failedItems.length > 0
                ? 'bg-rose-500 text-white'
                : 'bg-slate-200/80 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300'
            }`}>
              {failedItems.length}
            </span>
          </div>
        </div>

        {openSections.failed && (
          <div className="p-0">
            {failedItems.length === 0 ? (
              <div className="px-3 py-4 sm:px-5 sm:py-6 text-[10px] sm:text-xs text-slate-400 dark:text-neutral-500 font-medium">
                No failed submissions.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[9px] sm:text-xs border-collapse select-text">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-[#070709] text-slate-400 dark:text-neutral-500 border-b border-slate-100 dark:border-neutral-800/80">
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-3 font-semibold w-12 sm:w-16 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>#</span>
                          <input
                            type="checkbox"
                            checked={failedItems.length > 0 && failedItems.every(i => selectedIds.has(i.id))}
                            onChange={(e) => toggleSelectSection(failedItems, e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            title="Select all failed submissions"
                          />
                        </div>
                      </th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold w-24 sm:w-32 whitespace-nowrap">Build ID</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold whitespace-nowrap">Build Fingerprint</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-mono whitespace-nowrap">PDA</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-mono whitespace-nowrap">CSC</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-mono whitespace-nowrap">Baseband</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-semibold text-center w-24 sm:w-32 whitespace-nowrap">Expired Remaining</th>
                      <th className="py-1.5 px-2 sm:py-2.5 sm:px-4 text-right w-28 sm:w-44 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 font-sans select-text">
                    {failedItems.map((item, idx) => (
                      <tr 
                        key={item.id}
                        className={`transition-colors select-text ${
                          selectedIds.has(item.id)
                            ? 'bg-blue-50/50 dark:bg-blue-950/20'
                            : 'hover:bg-rose-50/40 dark:hover:bg-rose-950/20'
                        }`}
                      >
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-3 font-mono text-slate-400 text-center text-[8px] sm:text-[11px] whitespace-nowrap select-text">
                          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                            <span className="select-text cursor-text">{idx + 1}</span>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectItem(item.id);
                              }}
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-slate-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 whitespace-nowrap">
                          <BuildIdCell buildId={item.buildId} />
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-medium text-slate-800 dark:text-neutral-200 select-text cursor-text">
                          <div className="flex flex-col select-text">
                            <span className="select-text cursor-text">{item.buildFingerprintName}</span>
                            {item.error && (
                              <span className="text-[8px] sm:text-[11px] text-rose-500 font-mono mt-0.5 whitespace-normal select-text cursor-text">
                                &rarr; {item.error}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-mono text-slate-500 text-[8px] sm:text-[11px] whitespace-nowrap select-text cursor-text">
                          {item.pdaVersion}
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-mono text-slate-500 text-[8px] sm:text-[11px] whitespace-nowrap select-text cursor-text">
                          {item.cscVersion}
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 font-mono text-slate-500 text-[8px] sm:text-[11px] whitespace-nowrap select-text cursor-text">
                          {item.basebandVersion}
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 text-center whitespace-nowrap">
                          <ExpiredRemainingCell item={item} />
                        </td>
                        <td className="py-1.5 px-2 sm:py-2.5 sm:px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                            {onRecheckItem && (
                              <button
                                onClick={() => onRecheckItem(item)}
                                disabled={isRunning}
                                className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-[8px] sm:text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md border border-blue-200/60 dark:border-blue-900/60 transition-colors flex items-center gap-0.5 sm:gap-1 disabled:opacity-40"
                                title="Re-check Build ID for this item from Dashboard"
                              >
                                <RotateCw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <span>Re-check</span>
                              </button>
                            )}
                            <button
                              onClick={() => onRetryItem(item.id)}
                              disabled={isRunning}
                              className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-[8px] sm:text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-md border border-amber-200/60 dark:border-amber-900/60 transition-colors flex items-center gap-0.5 sm:gap-1 disabled:opacity-40"
                              title="Retry submission"
                            >
                              <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span>Retry</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Bar for Selected Builds (ponytail: fixed z-50 floating safely above footer logs) */}
      {selectedIds.size > 0 && (
        <div 
          className={`fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] sm:w-auto min-w-[300px] sm:min-w-[440px] max-w-xl flex items-center justify-between gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-900/95 dark:bg-[#10141f]/95 text-white backdrop-blur-md rounded-xl shadow-2xl border border-slate-700/80 dark:border-neutral-700 transition-all duration-200 animate-in slide-in-from-bottom-2 select-none ${
            isLogsOpen ? 'bottom-52 sm:bottom-68' : 'bottom-11 sm:bottom-12'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-semibold whitespace-nowrap">
              {selectedIds.size} selected
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => handleRunSelected()}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
              title="Submit fresh build forms / re-run for all selected items"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{selectedCompleted.length > 0 && selectedPending.length === 0 ? 'Rebuild Selected' : 'Run Selected'} ({selectedIds.size})</span>
            </button>
            <button
              onClick={() => handleFetchSelected()}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold bg-amber-600/90 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
              title="Query and fetch Build IDs from Dashboard for selected items"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Fetch IDs ({selectedIds.size})</span>
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
