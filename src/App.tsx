import { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { ExecutionSections } from './components/ExecutionSections';
import { InputDrawer } from './components/InputDrawer';
import { SettingsModal } from './components/SettingsModal';
import { TerminalLog } from './components/TerminalLog';
import { UpdateModal } from './components/UpdateModal';
import { BatchItem, PortalConfig, LogEntry, BatchSummary } from './types/batch';

async function getTauri() {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    try {
      const core = await import('@tauri-apps/api/core');
      const event = await import('@tauri-apps/api/event');
      return { core, event };
    } catch {
      return null;
    }
  }
  return null;
}

const INITIAL_PORTAL_CONFIG: PortalConfig = {
  baseUrl: 'https://android.qb.sec.samsung.net/overview/28905',
  formUrl: 'https://android.qb.sec.samsung.net/wicket/page?6',
  headless: true,
  delayMs: 1000,
  timeoutMs: 30000,
  mock: false,
};

const INITIAL_ITEMS: BatchItem[] = [];

export function App() {
  // State
  const [items, setItems] = useState<BatchItem[]>(() => {
    const saved = localStorage.getItem('hb_items');
    return saved ? JSON.parse(saved) : INITIAL_ITEMS;
  });

  const [portalConfig, setPortalConfig] = useState<PortalConfig>(() => {
    const saved = localStorage.getItem('hb_portal_config');
    return saved ? JSON.parse(saved) : INITIAL_PORTAL_CONFIG;
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('hb_dark_mode');
    if (saved !== null) return saved === 'true';
    return true; // Default to sleek dark mode
  });

  // Modals & Drawers
  const [isInputDrawerOpen, setIsInputDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const APP_VERSION = '0.1.0';

  // Sync dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('hb_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Persist items
  useEffect(() => {
    localStorage.setItem('hb_items', JSON.stringify(items));
  }, [items]);

  // Persist config
  useEffect(() => {
    localStorage.setItem('hb_portal_config', JSON.stringify(portalConfig));
  }, [portalConfig]);

  const addLog = useCallback((level: LogEntry['level'], message: string, index?: number) => {
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      index,
    };
    setLogs((prev) => [...prev.slice(-499), newEntry]);
  }, []);

  // Listen to Tauri events
  useEffect(() => {
    let unlistenLog: any;
    let unlistenStatus: any;
    let unlistenFinished: any;

    async function setupListeners() {
      const tauri = await getTauri();
      if (!tauri || !tauri.event) return;

      unlistenLog = await tauri.event.listen('task-log', (event: any) => {
        const payload = event.payload;
        if (payload) {
          addLog(payload.level || 'info', payload.message || '', payload.index);
        }
      });

      unlistenStatus = await tauri.event.listen('item-status-update', (event: any) => {
        const payload = event.payload;
        if (!payload) return;

        setItems((prev) => {
          const next = [...prev];
          const target = next.find((item) => item.id === payload.id || item.index === payload.index);
          if (target) {
            target.status = payload.status as any;
            target.message = payload.message;
            target.error = payload.error;
            if (payload.buildId || payload.build_id) {
              target.buildId = payload.buildId || payload.build_id;
            }
            target.progressPercent = payload.status === 'success' ? 100 : 75;
          }
          return next;
        });
      });

      unlistenFinished = await tauri.event.listen('task-finished', (event: any) => {
        const payload = event.payload;
        setIsRunning(false);
        if (payload?.cancelled) {
          addLog('warn', 'Batch execution was halted.');
        } else {
          addLog('success', `Batch complete. Success: ${payload?.success_count ?? 0}, Failed: ${payload?.failed_count ?? 0}`);
        }
      });
    }

    setupListeners();

    return () => {
      if (unlistenLog) unlistenLog();
      if (unlistenStatus) unlistenStatus();
      if (unlistenFinished) unlistenFinished();
    };
  }, [addLog]);

  // Summary calculation
  const summary: BatchSummary = useMemo(() => {
    const total = items.length;
    const pending = items.filter((i) => i.status === 'pending').length;
    const running = items.filter((i) => i.status === 'running').length;
    const success = items.filter((i) => i.status === 'success').length;
    const failed = items.filter((i) => i.status === 'failed').length;

    const completedCount = success + failed;
    const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const activeItem = items.find((i) => i.status === 'running');

    return {
      total,
      pending,
      running,
      success,
      failed,
      progressPercent,
      activeBuildName: activeItem?.buildFingerprintName,
    };
  }, [items]);

  // Queue actions
  const handleAddItems = (newRawItems: Omit<BatchItem, 'id' | 'index' | 'status'>[]) => {
    setItems((prev) => {
      const startIndex = prev.length;
      const created: BatchItem[] = newRawItems.map((item, idx) => ({
        ...item,
        id: `build-${Date.now()}-${idx}`,
        index: startIndex + idx,
        status: 'pending',
      }));
      return [...prev, ...created];
    });
    addLog('info', `Added ${newRawItems.length} build(s) to queue.`);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleRetryItem = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'pending', error: undefined, message: undefined } : i))
    );
  };

  const handleClearSection = (status: 'pending' | 'completed' | 'failed') => {
    const targetStatus = status === 'completed' ? 'success' : status;
    setItems((prev) => prev.filter((i) => i.status !== targetStatus));
  };

  const handleResetQueue = () => {
    if (isRunning) return;
    setItems(INITIAL_ITEMS);
    addLog('info', 'Queue reset to sample build specifications.');
  };

  // Start Batch Execution
  const handleStartBatch = async () => {
    const queueToRun = items.filter((i) => i.status === 'pending' || i.status === 'failed');
    if (queueToRun.length === 0) {
      addLog('warn', 'No pending or failed builds to run.');
      return;
    }

    setIsRunning(true);
    setIsLogsOpen(true);
    addLog('info', `Starting execution for ${queueToRun.length} build(s)...`);

    const tauri = await getTauri();
    if (tauri && tauri.core) {
      try {
        await tauri.core.invoke('start_batch_runner', {
          payload: {
            portal: portalConfig,
            items: queueToRun,
          },
        });
      } catch (err: any) {
        addLog('error', `Tauri invoke error: ${err?.message || err}`);
        setIsRunning(false);
      }
    } else {
      // Browser fallback simulation
      addLog('info', '[Browser Preview Mode] Simulating Playwright submission steps...');
      for (let i = 0; i < queueToRun.length; i++) {
        const item = queueToRun[i];
        setItems((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, status: 'running', message: 'Populating Wicket form fields...' } : x))
        );
        addLog('info', `[${i + 1}/${queueToRun.length}] Navigating to ${portalConfig.formUrl}`);
        await new Promise((r) => setTimeout(r, portalConfig.delayMs || 1000));

        const generatedBuildId = item.buildId || `11400${1500 + i}`;
        setItems((prev) =>
          prev.map((x) =>
            x.id === item.id
              ? {
                  ...x,
                  status: 'success',
                  buildId: generatedBuildId,
                  progressPercent: 100,
                  message: 'Form submitted & Wicket AJAX confirmed',
                }
              : x
          )
        );
        addLog('success', `Submitted build: ${item.buildFingerprintName} -> Build ID: ${generatedBuildId}`);
      }
      setIsRunning(false);
      addLog('success', `All ${queueToRun.length} simulated builds completed!`);
    }
  };

  // Run Single Item
  const handleRunSingleItem = async (item: BatchItem) => {
    if (isRunning) return;
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: 'pending' } : x)));
    setIsRunning(true);
    setIsLogsOpen(true);
    addLog('info', `Starting single submission: ${item.buildFingerprintName}`);

    const tauri = await getTauri();
    if (tauri && tauri.core) {
      try {
        await tauri.core.invoke('start_batch_runner', {
          payload: {
            portal: portalConfig,
            items: [item],
          },
        });
      } catch (err: any) {
        addLog('error', `Tauri invoke error: ${err?.message || err}`);
        setIsRunning(false);
      }
    } else {
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: 'running' } : x)));
      await new Promise((r) => setTimeout(r, 1200));
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: 'success' } : x)));
      addLog('success', `Submitted build: ${item.buildFingerprintName}`);
      setIsRunning(false);
    }
  };

  // Cancel Batch Execution
  const handleCancelBatch = async () => {
    addLog('warn', 'Sending cancellation request to automation runner...');
    const tauri = await getTauri();
    if (tauri && tauri.core) {
      try {
        await tauri.core.invoke('cancel_batch_runner');
      } catch (err: any) {
        addLog('error', `Cancellation failed: ${err?.message || err}`);
      }
    }
    setIsRunning(false);
    setItems((prev) =>
      prev.map((x) => (x.status === 'running' ? { ...x, status: 'pending', message: 'Cancelled' } : x))
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] dark:bg-[#000000] text-slate-800 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-150">
      
      {/* Top Navigation Bar */}
      <Header
        onOpenInputDrawer={() => setIsInputDrawerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
        onToggleLogs={() => setIsLogsOpen(!isLogsOpen)}
        isLogsOpen={isLogsOpen}
        logsCount={logs.length}
        isRunning={isRunning}
        onStartBatch={handleStartBatch}
        onCancelBatch={handleCancelBatch}
        onResetQueue={handleResetQueue}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalItems={items.length}
        appVersion={APP_VERSION}
      />

      {/* Main Body Content (Full Width Compact Layout) */}
      <main className="flex-1 w-full px-3 py-3">
        
        {/* Top 5 Metric Cards */}
        <MetricCards
          summary={summary}
          portalConfig={portalConfig}
          isRunning={isRunning}
        />

        {/* Sectioned Accordion Progress Tables */}
        <ExecutionSections
          items={items}
          isRunning={isRunning}
          onRemoveItem={handleRemoveItem}
          onRetryItem={handleRetryItem}
          onClearSection={handleClearSection}
          onRunItem={handleRunSingleItem}
          searchQuery={searchQuery}
        />

      </main>

      {/* Modals & Drawers */}
      <InputDrawer
        isOpen={isInputDrawerOpen}
        onClose={() => setIsInputDrawerOpen(false)}
        onAddItems={handleAddItems}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={portalConfig}
        appVersion={APP_VERSION}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
        onSaveConfig={(newConfig) => {
          setPortalConfig(newConfig);
          addLog('info', 'Portal settings updated.');
        }}
      />

      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        currentVersion={APP_VERSION}
      />

      <TerminalLog
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        logs={logs}
        onClearLogs={() => setLogs([])}
        isRunning={isRunning}
      />

    </div>
  );
}

export default App;
