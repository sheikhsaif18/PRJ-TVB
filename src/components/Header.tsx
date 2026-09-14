import React from 'react';
import { Play, Square, Settings, RefreshCw, Sparkles, Building2, CheckCircle, XCircle } from 'lucide-react';
import { AgentRunState } from '../types';

interface HeaderProps {
  state: AgentRunState;
  onStartRun: () => void;
  onStopRun: () => void;
  onOpenSettings: () => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  onStartRun,
  onStopRun,
  onOpenSettings,
  onReset,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Mission */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold tracking-wider shadow-xs">
            TVB
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Target Company Discovery Agent
              </h1>
              {state.isRunning ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Running Discovery
                </span>
              ) : state.endTime ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Run Completed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  Ready
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Autonomous search & screening for non-US tech platforms ($1M-$5M USD) with verified CEO emails
            </p>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
            <span className="text-slate-500">Screened:</span>
            <span className="font-semibold text-slate-800">{state.stats.candidatesExtracted}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200 text-emerald-700">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Passed:</span>
            <span className="font-bold">{state.stats.candidatesPassed}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-md border border-rose-200 text-rose-700">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Rejected:</span>
            <span className="font-semibold">{state.stats.candidatesRejected}</span>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-2">
          {state.isRunning ? (
            <button
              onClick={onStopRun}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Agent
            </button>
          ) : (
            <button
              onClick={onStartRun}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Discovery Run
            </button>
          )}

          <button
            onClick={onReset}
            disabled={state.isRunning}
            title="Reset Agent State"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 disabled:opacity-40 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSettings}
            title="Configure API Keys (SerpApi & Hunter.io)"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>API Keys</span>
          </button>
        </div>
      </div>
    </header>
  );
};
