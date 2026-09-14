import React, { useState } from 'react';
import { Key, Shield, Search, Check, AlertCircle } from 'lucide-react';
import { ApiConfigStatus } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  configStatus: ApiConfigStatus | null;
  onSaveKeys: (serpApiKey: string, hunterApiKey: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  configStatus,
  onSaveKeys,
}) => {
  const [serpKey, setSerpKey] = useState('');
  const [hunterKey, setHunterKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveKeys(serpKey, hunterKey);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-xs space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-slate-800" />
            <h3 className="text-sm font-bold text-slate-900">
              Provider API Credentials
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            ✕
          </button>
        </div>

        <p className="text-slate-500 leading-relaxed text-xs">
          Provide your API keys to enable live SerpApi web discovery searches and Hunter.io email deliverability verification. If left blank, the agent runs in high-fidelity sandbox mode.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          {/* SerpApi Key */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                SERPAPI_API_KEY
              </span>
              <span className="text-[10px] text-slate-400">
                {configStatus?.hasSerpApiKey
                  ? `Active (${configStatus.serpApiKeyMasked})`
                  : 'Sandbox Active'}
              </span>
            </label>
            <input
              type="password"
              placeholder={configStatus?.hasSerpApiKey ? 'Enter new key to update...' : 'Enter SerpApi Key...'}
              value={serpKey}
              onChange={(e) => setSerpKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
            />
            <p className="text-[10px] text-slate-400">
              Used to discover fresh web sources rather than using a fixed company list.
            </p>
          </div>

          {/* Hunter.io Key */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                HUNTER_API_KEY
              </span>
              <span className="text-[10px] text-slate-400">
                {configStatus?.hasHunterApiKey
                  ? `Active (${configStatus.hunterApiKeyMasked})`
                  : 'Sandbox Active'}
              </span>
            </label>
            <input
              type="password"
              placeholder={configStatus?.hasHunterApiKey ? 'Enter new key to update...' : 'Enter Hunter API Key...'}
              value={hunterKey}
              onChange={(e) => setHunterKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-hidden"
            />
            <p className="text-[10px] text-slate-400">
              Used to find professional founder emails and verify strict deliverability (valid only).
            </p>
          </div>

          {savedSuccess && (
            <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>API credentials saved successfully!</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-slate-600 hover:text-slate-800 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
