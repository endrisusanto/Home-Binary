import { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Trash2, 
  Copy, 
  Check, 
  ArrowDown, 
  Maximize2, 
  Minimize2,
  X
} from 'lucide-react';
import { LogEntry } from '../types/batch';

interface TerminalLogProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  onClearLogs: () => void;
  isRunning: boolean;
}

export const TerminalLog: React.FC<TerminalLogProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  isRunning,
}) => {
  const [filter, setFilter] = useState<'all' | 'info' | 'success' | 'warn' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-emerald-400 font-semibold';
      case 'error': return 'text-rose-400 font-semibold';
      case 'warn': return 'text-amber-400';
      default: return 'text-slate-300';
    }
  };

  const getBadgeColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'error': return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'warn': return 'bg-amber-950 text-amber-300 border-amber-800';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className={`fixed z-40 bg-[#0b0f19] text-slate-200 border-t border-slate-800 shadow-2xl transition-all duration-200 flex flex-col ${
      isExpanded 
        ? 'inset-x-0 bottom-0 top-16' 
        : 'inset-x-0 bottom-0 h-80'
    }`}>
      
      {/* Terminal Toolbar */}
      <div className="h-10 px-4 bg-[#111726] border-b border-slate-800 flex items-center justify-between select-none">
        
        {/* Left Status & Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-200">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>Process Logs</span>
            {isRunning && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
            )}
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Filter Pills */}
          <div className="flex items-center gap-1">
            {(['all', 'info', 'success', 'warn', 'error'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilter(lvl)}
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded transition-colors ${
                  filter === lvl
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Right Console Actions */}
        <div className="flex items-center gap-1.5">
          
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
              autoScroll ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Auto-Scroll"
          >
            <ArrowDown className="w-3 h-3" />
            <span>Scroll</span>
          </button>

          <button
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors disabled:opacity-30"
            title="Copy logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors disabled:opacity-30"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Close log console"
          >
            <X className="w-4 h-4" />
          </button>

        </div>

      </div>

      {/* Terminal Output Area */}
      <div 
        ref={scrollRef}
        className="flex-1 p-4 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-1 bg-[#0a0d16]"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 select-none py-8 text-center">
            [No logs captured yet. Execute a batch to stream live output.]
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2.5 hover:bg-slate-900/60 px-1 py-0.5 rounded">
              <span className="text-slate-500 select-none shrink-0">
                {log.timestamp}
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase border select-none shrink-0 ${getBadgeColor(log.level)}`}>
                {log.level}
              </span>
              <span className={`flex-1 break-all ${getLevelColor(log.level)}`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
