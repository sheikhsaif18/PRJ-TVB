import React, { useState } from 'react';
import { Download, Copy, Check, ExternalLink, ShieldCheck, Mail, Building2, Search, Filter } from 'lucide-react';
import { CleanCompanyRecord } from '../types';

interface CompaniesTableProps {
  companies: CleanCompanyRecord[];
  onSelectCompany?: (company: CleanCompanyRecord) => void;
  isRunning: boolean;
}

export const CompaniesTable: React.FC<CompaniesTableProps> = ({
  companies,
  onSelectCompany,
  isRunning,
}) => {
  const [copied, setCopied] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<CleanCompanyRecord | null>(null);

  const filtered = companies.filter((c) => {
    const q = filterText.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.platformCategory.toLowerCase().includes(q) ||
      c.founderCeoName.toLowerCase().includes(q) ||
      c.verifiedWorkEmail.toLowerCase().includes(q)
    );
  });

  const handleDownloadCsv = () => {
    window.location.href = '/api/export/csv';
  };

  const handleCopyCsv = () => {
    fetch('/api/export/csv')
      .then((res) => res.text())
      .then((text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Discovered Target Companies ({filtered.length})
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Clean CSV View
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strictly validated candidates meeting all 4 criteria with Hunter-verified CEO emails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search companies, countries, CEO..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-hidden w-56 sm:w-64"
            />
          </div>

          <button
            onClick={handleCopyCsv}
            disabled={companies.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg disabled:opacity-40 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied CSV' : 'Copy CSV'}</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={companies.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs disabled:opacity-40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download companies.csv</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      {companies.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            {isRunning ? 'Discovery agent is screening candidates...' : 'No validated companies emitted yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {isRunning
              ? 'Evaluating $1M-$5M funding/revenue, tech platform classification, minimal US presence, and Hunter deliverability.'
              : 'Click "Start Discovery Run" above to initiate the autonomous search and screening pipeline.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Funding / Revenue</th>
                  <th className="py-3 px-4">Platform Type</th>
                  <th className="py-3 px-4">Founder / CEO</th>
                  <th className="py-3 px-4">Verified Work Email</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((company, idx) => (
                  <tr
                    key={company.website || idx}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => setSelectedRecord(company)}
                  >
                    {/* Company Name & Domain */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        {company.companyName}
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-400 hover:text-slate-700 inline-flex items-center"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {company.website.replace(/^https?:\/\//, '')}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{company.country}</div>
                      <div className="text-[11px] text-slate-400">{company.headquarters}</div>
                    </td>

                    {/* Funding / Revenue */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {company.revenueFundingUsd}
                      </span>
                    </td>

                    {/* Platform Category */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{company.platformCategory}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">
                        {company.description}
                      </div>
                    </td>

                    {/* Founder / CEO */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{company.founderCeoName}</div>
                      <div className="text-[11px] text-slate-500">{company.founderTitle}</div>
                    </td>

                    {/* Verified Email */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-slate-900 font-medium text-[11px]">
                        <Mail className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{company.verifiedWorkEmail}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-xs text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Hunter: {company.verificationStatus} ({company.deliverabilityScore}%)
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(company);
                        }}
                        className="text-xs text-slate-600 hover:text-slate-900 font-medium underline underline-offset-2"
                      >
                        Inspect Evidence
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Candidate Inspector Drawer / Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 text-xs space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  {selectedRecord.companyName}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Verified Lead
                  </span>
                </h3>
                <a
                  href={selectedRecord.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 text-xs mt-0.5"
                >
                  {selectedRecord.website}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 text-[11px] block">Location</span>
                <span className="font-semibold text-slate-800">
                  {selectedRecord.headquarters}, {selectedRecord.country}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Funding / Revenue</span>
                <span className="font-semibold text-blue-700">
                  {selectedRecord.revenueFundingUsd}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Platform Category</span>
                <span className="font-semibold text-slate-800">
                  {selectedRecord.platformCategory}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">US Presence Evidence</span>
                <span className="font-semibold text-emerald-700">
                  None Detected (Explicit Non-US)
                </span>
              </div>
            </div>

            <div className="border border-emerald-200 bg-emerald-50/50 p-3 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Verified Founder Contact
                </span>
                <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                  Hunter: {selectedRecord.verificationStatus} ({selectedRecord.deliverabilityScore}%)
                </span>
              </div>
              <div className="text-slate-800">
                <strong>{selectedRecord.founderCeoName}</strong> — {selectedRecord.founderTitle}
              </div>
              <div className="font-mono text-emerald-900 font-semibold bg-white p-2 rounded-md border border-emerald-200 flex items-center justify-between">
                <span>{selectedRecord.verifiedWorkEmail}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedRecord.verifiedWorkEmail);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-slate-500 hover:text-slate-800 p-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block mb-1">Company Description</span>
              <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                {selectedRecord.description}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
