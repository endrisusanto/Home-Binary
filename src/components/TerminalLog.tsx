import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Trash2, 
  Copy, 
  Check, 
  ArrowDown, 
  ChevronUp, 
  ChevronDown,
  Maximize2, 
  Minimize2
} from 'lucide-react';
import { LogEntry } from '../types/batch';

interface TerminalLogProps {
  isOpen: boolean;
  onToggle: () => void;
  logs: LogEntry[];
  onClearLogs: () => void;
  isRunning: boolean;
}

export const TerminalLog: React.FC<TerminalLogProps> = ({
  isOpen,
  onToggle,
  logs,
  onClearLogs,
  isRunning,
}) => {
  const [filter, setFilter] = useState<'all' | 'info' | 'success' | 'warn' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isOpen]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;

  const handleCopyLogs = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClearLogs();
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-emerald-600 dark:text-emerald-400 font-semibold';
      case 'error': return 'text-rose-600 dark:text-rose-400 font-semibold';
      case 'warn': return 'text-amber-600 dark:text-amber-400 font-medium';
      default: return 'text-slate-700 dark:text-slate-300';
    }
  };

  const getBadgeColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'error': return 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'warn': return 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      default: return 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <footer 
      className={`fixed inset-x-0 bottom-0 z-40 bg-white dark:bg-[#090d16] text-slate-800 dark:text-slate-200 border-t border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-200 flex flex-col ${
        !isOpen 
          ? 'h-8 sm:h-9' 
          : isMaximized 
            ? 'h-[360px] sm:h-[440px]' 
            : 'h-48 sm:h-64'
      }`}
    >
      {/* Footer Header Bar (Always visible & Clickable to Collapse/Expand) */}
      <div 
        onClick={onToggle}
        className="h-8 sm:h-9 px-2 sm:px-3.5 bg-slate-100/90 dark:bg-[#0f1422] hover:bg-slate-200/80 dark:hover:bg-[#141b2e] border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between select-none cursor-pointer transition-colors"
      >
        {/* Left: Terminal Icon + Title + Count + Live latest log preview */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-hidden flex-1 mr-1.5 sm:mr-3">
          <div className="flex items-center gap-1 sm:gap-1.5 font-mono text-[10px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0">
            <Terminal className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden xs:inline">Process Logs</span>
            <span className="xs:hidden">Logs</span>
            {isRunning && (
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-ping ml-0.5" />
            )}
            {logs.length > 0 && (
              <span className="px-1 py-0.2 rounded-full text-[8px] sm:text-[9px] font-bold bg-blue-100 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30">
                {logs.length}
              </span>
            )}
          </div>

          {/* Collapsed Snippet Preview */}
          {!isOpen && latestLog && (
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate opacity-90">
              <span className="text-slate-300 dark:text-slate-600 shrink-0">|</span>
              <span className={`truncate ${getLevelColor(latestLog.level)}`}>
                [{latestLog.timestamp}] {latestLog.message}
              </span>
            </div>
          )}

          {/* Expanded Filter Pills */}
          {isOpen && (
            <div className="flex items-center gap-0.5 sm:gap-1 ml-1 sm:ml-2" onClick={e => e.stopPropagation()}>
              {(['all', 'info', 'success', 'warn', 'error'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilter(lvl)}
                  className={`text-[8px] sm:text-[9px] font-mono uppercase px-1 sm:px-2 py-0.5 rounded transition-colors ${
                    filter === lvl
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Controls & Expand/Collapse Icon */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {isOpen && (
            <>
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`flex items-center gap-1 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono rounded transition-colors ${
                  autoScroll 
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-transparent font-medium' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
                title="Toggle Auto-Scroll"
              >
                <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden md:inline">Scroll</span>
              </button>

              <button
                onClick={handleCopyLogs}
                disabled={logs.length === 0}
                className="p-0.5 sm:p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded transition-colors disabled:opacity-30"
                title="Copy logs"
              >
                {copied ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              </button>

              <button
                onClick={handleClear}
                disabled={logs.length === 0}
                className="p-0.5 sm:p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded transition-colors disabled:opacity-30"
                title="Clear logs"
              >
                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>

              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-0.5 sm:p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded transition-colors"
                title={isMaximized ? "Restore Height" : "Maximize Height"}
              >
                {isMaximized ? <Minimize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              </button>
            </>
          )}

          {/* Toggle Expand / Collapse Button */}
          <button
            onClick={onToggle}
            className="p-0.5 sm:p-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded transition-colors flex items-center gap-0.5 font-mono text-[9px] sm:text-[11px]"
            title={isOpen ? "Collapse Process Logs" : "Expand Process Logs"}
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Terminal Output Area */}
      {isOpen && (
        <div 
          ref={scrollRef}
          className="flex-1 p-2 sm:p-3 font-mono text-[9px] sm:text-[11px] leading-relaxed overflow-y-auto space-y-0.5 sm:space-y-1 bg-slate-50 dark:bg-[#070a12] text-slate-800 dark:text-slate-200"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-slate-400 dark:text-slate-600 select-none py-6 sm:py-8 text-center">
              [No logs captured yet. Execute a batch to stream live output.]
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-1 sm:gap-2 hover:bg-slate-200/60 dark:hover:bg-slate-900/60 px-1 py-0.2 sm:py-0.5 rounded transition-colors">
                <span className="text-slate-400 dark:text-slate-500 select-none shrink-0 text-[8px] sm:text-[11px]">
                  {log.timestamp}
                </span>
                <span className={`px-1 py-0.2 rounded text-[7px] sm:text-[9px] uppercase border select-none shrink-0 ${getBadgeColor(log.level)}`}>
                  {log.level}
                </span>
                <span className={`flex-1 break-all ${getLevelColor(log.level)}`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </footer>
  );
};
