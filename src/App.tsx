import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { RunConfigBar } from './components/RunConfigBar';
import { CompaniesTable } from './components/CompaniesTable';
import { TerminalLogs } from './components/TerminalLogs';
import { AuditInspector } from './components/AuditInspector';
import { CriteriaBlueprint } from './components/CriteriaBlueprint';
import { SettingsModal } from './components/SettingsModal';
import { AgentRunState, ApiConfigStatus, AgentLogEntry } from './types';
import { FileSpreadsheet, Terminal, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AgentRunState>({
    isRunning: false,
    runId: null,
    startTime: null,
    endTime: null,
    stats: {
      queriesExecuted: 0,
      sourcesDiscovered: 0,
      candidatesExtracted: 0,
      candidatesPassed: 0,
      candidatesRejected: 0,
      emailsVerified: 0,
    },
    logs: [],
    cleanCompanies: [],
    auditRecords: [],
  });

  const [configStatus, setConfigStatus] = useState<ApiConfigStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'companies' | 'terminal' | 'audit' | 'blueprint'>('companies');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Run parameters
  const [maxQueries, setMaxQueries] = useState<number>(2);
  const [maxCandidates, setMaxCandidates] = useState<number>(10);
  const [timeout, setTimeout] = useState<number>(60);
  const [targetRegion, setTargetRegion] = useState<string>('all_non_us');

  // Safe JSON fetch helper to guard against unexpected HTML/proxy responses
  const fetchSafeJson = async <T,>(url: string): Promise<T | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return null;
      const text = await res.text();
      if (!text || text.trim().startsWith('<')) return null;
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  };

  // Fetch initial config
  const fetchConfig = async () => {
    const data = await fetchSafeJson<ApiConfigStatus>('/api/config');
    if (data) {
      setConfigStatus(data);
      if (data.defaultMaxQueries) setMaxQueries(data.defaultMaxQueries);
      if (data.defaultMaxCandidates) setMaxCandidates(data.defaultMaxCandidates);
      if (data.defaultTimeout) setTimeout(data.defaultTimeout);
    }
  };

  // Poll status periodically
  const fetchStatus = async () => {
    const data = await fetchSafeJson<AgentRunState>('/api/run/status');
    if (data && typeof data === 'object' && 'stats' in data) {
      setState(data);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchStatus();

    // Setup SSE stream for live real-time logs
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/run/logs/stream');
      eventSource.onmessage = (event) => {
        try {
          if (!event.data || event.data.trim().startsWith('<')) return;
          const payload = JSON.parse(event.data);
          if (payload.type === 'init' && payload.state) {
            setState(payload.state);
          } else if (payload.type === 'log' && payload.log) {
            setState((prev) => {
              // Avoid duplicates
              if (prev.logs.some((l) => l.id === payload.log.id)) return prev;
              return {
                ...prev,
                logs: [...prev.logs, payload.log],
              };
            });
          }
        } catch {
          // Gracefully ignore SSE parsing glitches
        }
      };
      eventSource.onerror = () => {
        // Browser automatically attempts reconnect for SSE
      };
    } catch (e) {
      console.warn('Could not connect SSE stream, polling fallback active.');
    }

    const interval = setInterval(fetchStatus, 3000);
    return () => {
      clearInterval(interval);
      eventSource?.close();
    };
  }, []);

  const handleStartRun = async () => {
    try {
      // Auto-switch to terminal tab to watch live execution
      setActiveTab('terminal');

      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxSearchQueries: maxQueries,
          maxCandidates,
          requestTimeoutSeconds: timeout,
          targetRegion,
        }),
      });

      if (res.ok) {
        fetchStatus();
      } else {
        const text = await res.text();
        let errorMsg = 'Failed to start agent run.';
        try {
          const errData = JSON.parse(text);
          errorMsg = errData.error || errorMsg;
        } catch {}
        alert(errorMsg);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleStopRun = async () => {
    try {
      await fetch('/api/run/stop', { method: 'POST' });
      fetchStatus();
    } catch (err) {
      console.error('Failed to stop run:', err);
    }
  };

  const handleReset = () => {
    setState({
      isRunning: false,
      runId: null,
      startTime: null,
      endTime: null,
      stats: {
        queriesExecuted: 0,
        sourcesDiscovered: 0,
        candidatesExtracted: 0,
        candidatesPassed: 0,
        candidatesRejected: 0,
        emailsVerified: 0,
      },
      logs: [],
      cleanCompanies: [],
      auditRecords: [],
    });
  };

  const handleSaveKeys = async (serpApiKey: string, hunterApiKey: string) => {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serpApiKey, hunterApiKey }),
    });
    if (res.ok) {
      await fetchConfig();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Header */}
      <Header
        state={state}
        onStartRun={handleStartRun}
        onStopRun={handleStopRun}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onReset={handleReset}
      />

      {/* Configuration Strip */}
      <RunConfigBar
        maxQueries={maxQueries}
        setMaxQueries={setMaxQueries}
        maxCandidates={maxCandidates}
        setMaxCandidates={setMaxCandidates}
        timeout={timeout}
        setTimeout={setTimeout}
        targetRegion={targetRegion}
        setTargetRegion={setTargetRegion}
        configStatus={configStatus}
        isRunning={state.isRunning}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Navigation Sub-header / Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <nav className="flex items-center gap-1 sm:gap-2 -mb-px text-xs font-semibold">
            <button
              onClick={() => setActiveTab('companies')}
              className={`inline-flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors ${
                activeTab === 'companies'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Discovered Companies</span>
              {state.cleanCompanies.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                  {state.cleanCompanies.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('terminal')}
              className={`inline-flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors ${
                activeTab === 'terminal'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Terminal className="w-4 h-4 text-sky-600" />
              <span>Live Execution Terminal</span>
              {state.isRunning && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`inline-flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors ${
                activeTab === 'audit'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <span>Audit & QA Queue</span>
              {state.auditRecords.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                  {state.auditRecords.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('blueprint')}
              className={`inline-flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors ${
                activeTab === 'blueprint'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Cpu className="w-4 h-4 text-slate-500" />
              <span>Criteria Blueprint</span>
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
            <span>Clean Output: <code className="text-slate-800 font-mono text-[11px]">output/companies.csv</code></span>
            <span>•</span>
            <span>QA Audit: <code className="text-slate-800 font-mono text-[11px]">output/audit.json</code></span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'companies' && (
          <CompaniesTable
            companies={state.cleanCompanies}
            isRunning={state.isRunning}
          />
        )}

        {activeTab === 'terminal' && (
          <TerminalLogs
            logs={state.logs}
            isRunning={state.isRunning}
            onClearLogs={() => setState((prev) => ({ ...prev, logs: [] }))}
          />
        )}

        {activeTab === 'audit' && (
          <AuditInspector
            auditRecords={state.auditRecords}
            isRunning={state.isRunning}
          />
        )}

        {activeTab === 'blueprint' && <CriteriaBlueprint />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>TVB Target Company Discovery Agent</strong> — Autonomous lead-discovery for $1M-$5M tech platforms with verified CEO work emails.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>SerpApi Engine</span>
            <span>•</span>
            <span>Hunter.io Deliverability</span>
            <span>•</span>
            <span>RFC-4180 CSV</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        configStatus={configStatus}
        onSaveKeys={handleSaveKeys}
      />
    </div>
  );
}
