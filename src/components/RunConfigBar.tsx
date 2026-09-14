import React from 'react';
import { Sliders, Globe, Shield, Zap, Search, Key } from 'lucide-react';
import { ApiConfigStatus } from '../types';

interface RunConfigBarProps {
  maxQueries: number;
  setMaxQueries: (v: number) => void;
  maxCandidates: number;
  setMaxCandidates: (v: number) => void;
  timeout: number;
  setTimeout: (v: number) => void;
  targetRegion: string;
  setTargetRegion: (v: string) => void;
  configStatus: ApiConfigStatus | null;
  isRunning: boolean;
  onOpenSettings: () => void;
}

export const RunConfigBar: React.FC<RunConfigBarProps> = ({
  maxQueries,
  setMaxQueries,
  maxCandidates,
  setMaxCandidates,
  timeout,
  setTimeout,
  targetRegion,
  setTargetRegion,
  configStatus,
  isRunning,
  onOpenSettings,
}) => {
  return (
    <div className="bg-slate-50 border-b border-slate-200 py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium text-slate-700">Region Focus:</span>
            <select
              disabled={isRunning}
              value={targetRegion}
              onChange={(e) => setTargetRegion(e.target.value)}
              className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-slate-400 focus:outline-hidden disabled:opacity-50"
            >
              <option value="all_non_us">Global Non-US (Europe, LatAm, APAC)</option>
              <option value="europe">European Union (DACH, France, Benelux)</option>
              <option value="uk_nordics">UK & Nordics</option>
              <option value="latam">Latin America (Brazil, Mexico, Colombia)</option>
              <option value="apac">Asia-Pacific (Singapore, Australia, Japan)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Max Queries:</span>
            <select
              disabled={isRunning}
              value={maxQueries}
              onChange={(e) => setMaxQueries(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-slate-400 focus:outline-hidden disabled:opacity-50"
            >
              <option value={1}>1 query (fast test)</option>
              <option value={2}>2 queries</option>
              <option value={3}>3 queries</option>
              <option value={5}>5 queries</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Max Candidates:</span>
            <select
              disabled={isRunning}
              value={maxCandidates}
              onChange={(e) => setMaxCandidates(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-slate-400 focus:outline-hidden disabled:opacity-50"
            >
              <option value={5}>5 candidates</option>
              <option value={10}>10 candidates</option>
              <option value={20}>20 candidates</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Timeout:</span>
            <select
              disabled={isRunning}
              value={timeout}
              onChange={(e) => setTimeout(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-slate-400 focus:outline-hidden disabled:opacity-50"
            >
              <option value={20}>20s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
              <option value={120}>120s</option>
              {![20, 30, 60, 120].includes(timeout) && (
                <option value={timeout}>{timeout}s</option>
              )}
            </select>
          </div>
        </div>

        {/* Live Providers Status */}
        <div className="flex items-center gap-2.5 text-xs">
          <span className="text-slate-400">Providers:</span>
          
          <button
            onClick={onOpenSettings}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-medium transition-colors ${
              configStatus?.hasSerpApiKey
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Search className="w-3 h-3" />
            <span>SerpApi: {configStatus?.hasSerpApiKey ? 'Connected' : 'Sandbox Fallback'}</span>
          </button>

          <button
            onClick={onOpenSettings}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-medium transition-colors ${
              configStatus?.hasHunterApiKey
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>Hunter.io: {configStatus?.hasHunterApiKey ? 'Connected' : 'Sandbox Fallback'}</span>
          </button>

          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-medium ${
              configStatus?.hasGeminiApiKey
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Gemini Schema: Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
