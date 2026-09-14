import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Copy, Check, Filter, ArrowDown, Trash2, AlertCircle } from 'lucide-react';
import { AgentLogEntry } from '../types';

interface TerminalLogsProps {
  logs: AgentLogEntry[];
  isRunning: boolean;
  onClearLogs?: () => void;
}

export const TerminalLogs: React.FC<TerminalLogsProps> = ({
  logs,
  isRunning,
  onClearLogs,
}) => {
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (stageFilter !== 'all' && log.stage !== stageFilter) return false;
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    return true;
  });

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.stage.toUpperCase()}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'query':
        return 'bg-purple-900/50 text-purple-300 border-purple-700/60';
      case 'search':
        return 'bg-sky-900/50 text-sky-300 border-sky-700/60';
      case 'extract':
        return 'bg-blue-900/50 text-blue-300 border-blue-700/60';
      case 'validate':
        return 'bg-amber-900/50 text-amber-300 border-amber-700/60';
      case 'enrich':
        return 'bg-indigo-900/50 text-indigo-300 border-indigo-700/60';
      case 'verify':
        return 'bg-emerald-900/50 text-emerald-300 border-emerald-700/60';
      case 'output':
        return 'bg-teal-900/50 text-teal-300 border-teal-700/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-emerald-400 font-medium';
      case 'warn':
        return 'text-amber-300';
      case 'error':
        return 'text-rose-400 font-semibold';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[650px] font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-300">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-xs tracking-tight text-white">
            Autonomous Execution Console
          </span>
          {isRunning && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              STREAM ACTIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-md px-2 py-1 text-[11px] focus:outline-hidden"
          >
            <option value="all">All Stages</option>
            <option value="query">Query Generator</option>
            <option value="search">SerpApi Search</option>
            <option value="extract">Extraction</option>
            <option value="validate">Validation</option>
            <option value="verify">Hunter Deliverability</option>
            <option value="output">Output</option>
          </select>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-md px-2 py-1 text-[11px] focus:outline-hidden"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warn">Warnings / Drops</option>
            <option value="error">Errors</option>
          </select>

          {/* Controls */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-md border text-[11px] transition-colors ${
              autoScroll
                ? 'bg-slate-800 border-slate-700 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-md transition-colors disabled:opacity-40"
            title="Copy Logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {onClearLogs && (
            <button
              onClick={onClearLogs}
              disabled={isRunning || logs.length === 0}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-400 rounded-md transition-colors disabled:opacity-40"
              title="Clear Logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Log Feed */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-2 text-slate-300 selection:bg-emerald-900 selection:text-white"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 text-center py-20">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <div>No logs recorded yet.</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Start an agent run to stream SerpApi HTTP queries, candidate evaluations, and Hunter.io verification events.
            </div>
          </div>
        ) : (
          filteredLogs.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-2.5 leading-relaxed hover:bg-slate-900/50 p-1 rounded-sm transition-colors"
            >
              <span className="text-slate-600 select-none text-[10px] pt-0.5 shrink-0">
                {entry.timestamp.split('T')[1]?.slice(0, 8)}
              </span>

              <span
                className={`uppercase text-[9px] font-bold px-1.5 py-0.5 rounded-xs border shrink-0 ${getStageBadge(
                  entry.stage
                )}`}
              >
                {entry.stage}
              </span>

              <span className={`flex-1 break-words ${getLevelColor(entry.level)}`}>
                {entry.message}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Terminal Footer */}
      <div className="bg-slate-900/90 px-4 py-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span>Entries: {filteredLogs.length}</span>
          <span>•</span>
          <span>SerpApi Status Visible: True</span>
          <span>•</span>
          <span>Blank Fields Preferred: True</span>
        </div>
        <div className="text-slate-500">TVB Discovery v1.0.0</div>
      </div>
    </div>
  );
};
