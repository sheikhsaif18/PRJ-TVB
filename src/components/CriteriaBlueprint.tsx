import React from 'react';
import { ShieldAlert, CheckCircle, Search, Database, Mail, Globe, Cpu, ArrowRight } from 'lucide-react';

export const CriteriaBlueprint: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* 5 Core Mandates */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-1">
          Agent Mandate: 5 Hard Screening Criteria
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          The autonomous discovery agent strictly rejects any company that fails any of these 5 principles.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                1
              </span>
              $1M - $5M USD Revenue/Funding
            </div>
            <p className="text-slate-600 leading-relaxed">
              Total funding or annual recurring revenue must be strictly verified between $1,000,000 and $5,000,000 USD. Below $1M is too early; above $5M is out-of-scope.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                2
              </span>
              Technology-Related Platform
            </div>
            <p className="text-slate-600 leading-relaxed">
              Target must operate a technology platform (B2B SaaS, Cloud infrastructure, API platform, developer software, workflow automation, marketplaces).
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                3
              </span>
              Minimal / No US Presence
            </div>
            <p className="text-slate-600 leading-relaxed">
              Explicit evidence of headquarters and core operations outside the United States. Immediate drop if US headquarters, Delaware C-corp operating in US, or core US presence is detected.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                4
              </span>
              CEO / Founder Verified Email
            </div>
            <p className="text-slate-600 leading-relaxed">
              Professional email deliverability verified via Hunter.io. Strict requirement: ONLY <code className="bg-slate-200 px-1 py-0.5 rounded-xs">valid</code> status is accepted. Accept-all, unknown, invalid, webmail, and generic roles are rejected.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                5
              </span>
              Anti-Hallucination: Blank Fields Preferred Over Guessed Values
            </div>
            <p className="text-slate-600 leading-relaxed">
              The agent does not invent missing revenue/funding, US presence, founders, or emails. If evidence cannot be proven from discovered sources, the company is either emitted with exact blanks or dropped into the audit QA log.
            </p>
          </div>
        </div>
      </div>

      {/* Architecture Flow */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-1">
          Pipeline Architecture
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          Search engine &rarr; dynamic query generator &rarr; candidate extraction &rarr; cross-source validation &rarr; contact enrichment &rarr; email verification &rarr; CSV/JSON output.
        </p>

        <div className="flex flex-col lg:flex-row items-stretch gap-2 text-xs">
          {[
            { step: '1', title: 'Dynamic Query Gen', desc: 'Synthesizes targeted boolean search strings for non-US regions & funding rounds' },
            { step: '2', title: 'SerpApi Search', desc: 'Discovers fresh web sources and organic search results in real time' },
            { step: '3', title: 'Candidate Extraction', desc: 'Parses domain, company entity, financial evidence, and executive mentions' },
            { step: '4', title: 'Hard Filter Validation', desc: 'Strict screening of $1M-$5M, tech platform, and minimal US presence' },
            { step: '5', title: 'Hunter Deliverability', desc: 'Verifies founder work email; drops accept_all, unknown, and webmail' },
            { step: '6', title: 'CSV & Audit Output', desc: 'Emits clean companies.csv and comprehensive audit.json QA log' },
          ].map((item, i) => (
            <div
              key={i}
              className="flex-1 p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-between"
            >
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Stage {item.step}
                </div>
                <div className="font-bold text-slate-900 mb-1">{item.title}</div>
                <div className="text-[11px] text-slate-500 leading-snug">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Production Upgrades */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Roadmap & Production Upgrades
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Page Fetching & HTML Extraction:</strong> Deep source-level evidence verification.</span>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>LLM Structured Extraction:</strong> JSON schema output using Gemini 3.8 Flash.</span>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Deduplication Engine:</strong> Cross-run persistence preventing re-processing existing domains.</span>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Discovery Providers:</strong> Unified SearchProvider interface supporting SerpApi, Bing, Exa, and Tavily.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
