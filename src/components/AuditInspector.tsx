import React, { useState } from 'react';
import { Download, CheckCircle2, XCircle, ExternalLink, ShieldCheck, AlertTriangle, Search, Filter } from 'lucide-react';
import { AuditRecord } from '../types';

interface AuditInspectorProps {
  auditRecords: AuditRecord[];
  isRunning: boolean;
}

export const AuditInspector: React.FC<AuditInspectorProps> = ({
  auditRecords,
  isRunning,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'passed' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);

  const filtered = auditRecords.filter((rec) => {
    if (filterMode === 'passed' && !rec.overallPassed) return false;
    if (filterMode === 'rejected' && rec.overallPassed) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        rec.companyName.toLowerCase().includes(q) ||
        rec.domain.toLowerCase().includes(q) ||
        rec.rejectReasons.some((r) => r.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleDownloadAudit = () => {
    window.location.href = '/api/export/audit';
  };

  return (
    <div className="space-y-4">
      {/* Top QA Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Audit & Verification Evidence Trail ({filtered.length})
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              audit.json QA Queue
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Full cross-source validation audit with explicit failure reasons, raw sources, and Hunter payloads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({auditRecords.length})
            </button>
            <button
              onClick={() => setFilterMode('passed')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterMode === 'passed' ? 'bg-emerald-600 text-white font-semibold' : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              Passed ({auditRecords.filter((r) => r.overallPassed).length})
            </button>
            <button
              onClick={() => setFilterMode('rejected')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterMode === 'rejected' ? 'bg-rose-600 text-white font-semibold' : 'text-rose-700 hover:text-rose-900'
              }`}
            >
              Rejected ({auditRecords.filter((r) => !r.overallPassed).length})
            </button>
          </div>

          <button
            onClick={handleDownloadAudit}
            disabled={auditRecords.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs disabled:opacity-40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download audit.json</span>
          </button>
        </div>
      </div>

      {/* Audit List */}
      {auditRecords.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <AlertTriangle className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-semibold text-slate-800">No audit records generated yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Once you run the discovery agent, every candidate evaluated will be recorded here with hard-filter results and source citations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((record) => (
            <div
              key={record.id}
              className={`p-4 rounded-xl border transition-all ${
                record.overallPassed
                  ? 'bg-white border-emerald-200 hover:border-emerald-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  {record.overallPassed ? (
                    <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="p-1 rounded-full bg-rose-100 text-rose-700">
                      <XCircle className="w-4 h-4" />
                    </span>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{record.companyName}</h4>
                      <a
                        href={record.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-0.5"
                      >
                        {record.domain}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      record.overallPassed
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {record.overallPassed ? 'ALL FILTERS PASSED' : 'CANDIDATE REJECTED'}
                  </span>
                </div>
              </div>

              {/* 4 Hard Filters Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 my-3 text-xs">
                {/* 1. Revenue / Funding */}
                <div
                  className={`p-2.5 rounded-lg border ${
                    record.filters.revenueOrFunding.passed
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold mb-1">
                    <span className="text-slate-700">1. $1M-$5M USD</span>
                    {record.filters.revenueOrFunding.passed ? (
                      <span className="text-emerald-700">✓ Pass</span>
                    ) : (
                      <span className="text-rose-700">✗ Fail</span>
                    )}
                  </div>
                  <div className="font-medium text-slate-900">
                    {record.filters.revenueOrFunding.value?.displayAmount || 'Missing'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {record.filters.revenueOrFunding.evidence}
                  </div>
                </div>

                {/* 2. Tech Platform */}
                <div
                  className={`p-2.5 rounded-lg border ${
                    record.filters.techPlatform.passed
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold mb-1">
                    <span className="text-slate-700">2. Tech Platform</span>
                    {record.filters.techPlatform.passed ? (
                      <span className="text-emerald-700">✓ Pass</span>
                    ) : (
                      <span className="text-rose-700">✗ Fail</span>
                    )}
                  </div>
                  <div className="font-medium text-slate-900 truncate">
                    {record.filters.techPlatform.value?.category || 'Not Tech'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {record.filters.techPlatform.evidence}
                  </div>
                </div>

                {/* 3. Non-US Presence */}
                <div
                  className={`p-2.5 rounded-lg border ${
                    record.filters.nonUsPresence.passed
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold mb-1">
                    <span className="text-slate-700">3. Non-US Presence</span>
                    {record.filters.nonUsPresence.passed ? (
                      <span className="text-emerald-700">✓ Pass</span>
                    ) : (
                      <span className="text-rose-700">✗ Fail</span>
                    )}
                  </div>
                  <div className="font-medium text-slate-900">
                    {record.filters.nonUsPresence.value?.country || 'Unknown Country'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {record.filters.nonUsPresence.evidence}
                  </div>
                </div>

                {/* 4. Verified Founder Email */}
                <div
                  className={`p-2.5 rounded-lg border ${
                    record.filters.verifiedFounderEmail.passed
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold mb-1">
                    <span className="text-slate-700">4. Verified CEO Email</span>
                    {record.filters.verifiedFounderEmail.passed ? (
                      <span className="text-emerald-700">✓ Pass</span>
                    ) : (
                      <span className="text-rose-700">✗ Fail</span>
                    )}
                  </div>
                  <div className="font-medium text-slate-900 truncate">
                    {record.filters.verifiedFounderEmail.value?.email ||
                      `Hunter: ${record.filters.verifiedFounderEmail.value?.hunterStatus || 'missing'}`}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {record.filters.verifiedFounderEmail.evidence}
                  </div>
                </div>
              </div>

              {/* Rejection Reasons if Failed */}
              {!record.overallPassed && record.rejectReasons.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-xs text-rose-800 mb-3">
                  <div className="font-bold mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wider text-rose-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Drop Reasons (Hard Filter Enforced)
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-700 text-xs">
                    {record.rejectReasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Discovered Sources Citations */}
              <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-700 block mb-1">
                  Discovered Sources & Evidence Snippets ({record.sources.length}):
                </span>
                {record.sources.map((src, i) => (
                  <div key={i} className="space-y-0.5">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                    >
                      {src.title || src.url}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <p className="text-slate-500 italic">"{src.snippet}"</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
