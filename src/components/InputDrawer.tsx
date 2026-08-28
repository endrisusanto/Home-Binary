import React, { useState } from 'react';
import { X, Sparkles, Plus, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { BatchItem } from '../types/batch';

interface InputDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (newItems: Omit<BatchItem, 'id' | 'index' | 'status'>[]) => void;
}

const SAMPLE_TEMPLATES = [
  {
    name: 'Sample 1: Tab-Delimited (Spreadsheet format)',
    data: `SM-G525F_SEA_14_XSA\tG525FXXU4CVI1\tG525FOLE4CVI1\tG525FXXU4CVI1\nSM-X810_OXM_14_FZHH\tX810XXU6FZHH\tX810OXM6FZHH\tX810XXU6FZF1\nSM-S928B_OXM_14_BWK2\tS928BXXU1BWK2\tS928BOXM1BWK2\tS928BXXU1BWK2`,
  },
  {
    name: 'Sample 2: Key-Value format',
    data: `buildFingerprintName: SM-G525F_SEA_14_XSA
pdaVersion: G525FXXU4CVI1
cscVersion: G525FOLE4CVI1
basebandVersion: G525FXXU4CVI1
---
buildFingerprintName: SM-X810_OXM_14_FZHH
pdaVersion: X810XXU6FZHH
cscVersion: X810OXM6FZHH
basebandVersion: X810XXU6FZF1`,
  },
  {
    name: 'Sample 3: Comma-Separated (CSV)',
    data: `SM-A546B_EUX_14_AWK1, A546BXXU5BWK1, A546BOXM5BWK1, A546BXXU5BWK1\nSM-F946B_OXM_14_BWK7, F946BXXU1BWK7, F946BOXM1BWK7, F946BXXU1BWK7`,
  },
];

export const InputDrawer: React.FC<InputDrawerProps> = ({
  isOpen,
  onClose,
  onAddItems,
}) => {
  const [rawText, setRawText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseRawText = (text: string): Omit<BatchItem, 'id' | 'index' | 'status'>[] => {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const results: Omit<BatchItem, 'id' | 'index' | 'status'>[] = [];

    // Check if format is Key-Value block format
    if (trimmed.toLowerCase().includes('buildfingerprintname:') || trimmed.toLowerCase().includes('pdaversion:')) {
      const blocks = trimmed.split(/\n\s*---\s*\n|\n\s*===\s*\n/);
      for (const block of blocks) {
        if (!block.trim()) continue;
        const lines = block.split('\n');
        let buildId = '';
        let fingerprint = '';
        let pda = '';
        let csc = '';
        let baseband = '';

        for (const line of lines) {
          const colonIdx = line.indexOf(':');
          if (colonIdx === -1) continue;
          const key = line.slice(0, colonIdx).trim().toLowerCase();
          const val = line.slice(colonIdx + 1).trim();

          if (key === 'buildid' || key === 'id') {
            buildId = val;
          } else if (key.includes('fingerprint') || key.includes('name') || key.includes('build')) {
            fingerprint = val;
          } else if (key.includes('pda')) {
            pda = val;
          } else if (key.includes('csc')) {
            csc = val;
          } else if (key.includes('baseband') || key.includes('phone') || key.includes('modem')) {
            baseband = val;
          }
        }

        if (fingerprint || pda) {
          results.push({
            buildId: buildId || undefined,
            buildFingerprintName: fingerprint || pda,
            pdaVersion: pda,
            cscVersion: csc,
            basebandVersion: baseband,
          });
        }
      }
      return results;
    }

    const cleanBasebandToken = (val?: string): string => {
      if (!val) return '';
      const t = val.trim();
      if (
        t === '-' ||
        t === '—' ||
        t === '.' ||
        t.toLowerCase() === 'none' ||
        t.toLowerCase() === 'n/a' ||
        t.toLowerCase() === 'null' ||
        t.toLowerCase() === 'empty' ||
        t.toLowerCase() === 'no'
      ) {
        return '';
      }
      return t;
    };

    // Line by line parser for TSV / CSV / Space delimited
    const lines = trimmed.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) continue;

      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t').map(s => s.trim()).filter(Boolean);
      } else if (line.includes(',')) {
        parts = line.split(',').map(s => s.trim()).filter(Boolean);
      } else if (line.includes('|')) {
        parts = line.split('|').map(s => s.trim()).filter(Boolean);
      } else {
        parts = line.split(/\s+/).map(s => s.trim()).filter(Boolean);
      }

      if (parts.length >= 1) {
        // Skip header lines
        if (parts[0].toLowerCase().includes('fingerprint') || parts[0].toLowerCase().includes('build id')) {
          continue;
        }

        // If first column is numeric (like 114001506), treat as Build ID
        if (/^\d{6,10}$/.test(parts[0]) && parts.length >= 2) {
          results.push({
            buildId: parts[0],
            buildFingerprintName: parts[1] || '',
            pdaVersion: parts[2] || parts[1] || '',
            cscVersion: parts[3] || '',
            basebandVersion: cleanBasebandToken(parts[4]),
          });
        } else {
          // Standard: [0] Fingerprint, [1] PDA, [2] CSC, [3] Baseband (optional / can be -)
          results.push({
            buildFingerprintName: parts[0] || '',
            pdaVersion: parts[1] || parts[0] || '',
            cscVersion: parts[2] || '',
            basebandVersion: cleanBasebandToken(parts[3]),
          });
        }
      }
    }

    return results;
  };

  const parsedItems = parseRawText(rawText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedItems.length === 0) {
      setParseError('No valid build specifications could be parsed from the provided input.');
      return;
    }

    onAddItems(parsedItems);
    setRawText('');
    setParseError(null);
    onClose();
  };

  const handleLoadSample = (template: typeof SAMPLE_TEMPLATES[0]) => {
    setRawText(template.data);
    setParseError(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 dark:bg-black/80 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full sm:max-w-xl md:max-w-2xl bg-white dark:bg-[#09090b] h-full shadow-2xl border-l border-slate-200 dark:border-neutral-800 flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="px-3 py-3 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Add Batch Builds
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 dark:text-neutral-500">
                Paste raw TSV, CSV, or Key-Value build data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 flex flex-col">
          
          {/* Sample Template Quick Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Templates:
            </span>
            {SAMPLE_TEMPLATES.map((tmpl, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => handleLoadSample(tmpl)}
                className="text-[9px] sm:text-[11px] px-1.5 py-0.5 sm:px-2 sm:py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
              >
                {tmpl.name.split(':')[0]}
              </button>
            ))}
          </div>

          {/* Main Multi-line Textarea */}
          <div className="flex-1 flex flex-col space-y-1 sm:space-y-1.5">
            <label className="text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Paste Build Specifications</span>
              <span className="text-[9px] sm:text-[11px] font-normal text-slate-400">
                Fingerprint, PDA, CSC, Baseband
              </span>
            </label>
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                if (parseError) setParseError(null);
              }}
              placeholder={`Example:\nSM-G525F_SEA_14_XSA\tG525FXXU4CVI1\tG525FOLE4CVI1\tG525FXXU4CVI1\nSM-X810_OXM_14_FZHH\tX810XXU6FZHH\tX810OXM6FZHH\tX810XXU6FZF1`}
              className="w-full flex-1 min-h-[140px] sm:min-h-[220px] p-2.5 sm:p-3 text-[10px] sm:text-xs font-mono bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Validation Feedback / Live Preview */}
          {parseError && (
            <div className="p-2 sm:p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {parsedItems.length > 0 && (
            <div className="p-2.5 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1 sm:gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {parsedItems.length} Build{parsedItems.length > 1 ? 's' : ''} Detected
                </span>
                <span className="text-[9px] sm:text-[11px] font-normal text-slate-400">
                  Preview:
                </span>
              </div>
              <div className="space-y-1 max-h-32 sm:max-h-36 overflow-y-auto">
                {parsedItems.slice(0, 3).map((item, i) => (
                  <div key={i} className="text-[9px] sm:text-[11px] font-mono bg-white dark:bg-slate-900 p-1.5 sm:p-2 rounded border border-slate-200/60 dark:border-slate-700/60 flex flex-col">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {i + 1}. {item.buildFingerprintName}
                    </span>
                    <span className="text-slate-400 text-[8px] sm:text-[10px] truncate">
                      PDA: {item.pdaVersion} | CSC: {item.cscVersion} | Baseband: {item.basebandVersion}
                    </span>
                  </div>
                ))}
                {parsedItems.length > 3 && (
                  <div className="text-[9px] sm:text-[10px] text-slate-400 text-center py-0.5 sm:py-1 font-medium">
                    + {parsedItems.length - 3} more items in queue
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Drawer Actions */}
          <div className="pt-2 sm:pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={parsedItems.length === 0}
              className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs shadow-blue-500/20 transition-all"
            >
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Add {parsedItems.length > 0 ? `(${parsedItems.length})` : ''} to Queue</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
