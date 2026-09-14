export type HunterStatus =
  | 'valid'
  | 'invalid'
  | 'accept_all'
  | 'unknown'
  | 'webmail_rejected'
  | 'generic_rejected'
  | 'missing';

export interface FilterCheck<T = any> {
  passed: boolean;
  value?: T;
  evidence: string;
  sourceUrl?: string;
  failureReason?: string;
}

export interface CandidateFilters {
  revenueOrFunding: FilterCheck<{
    amountUsd: number | null;
    displayAmount: string;
    type: 'funding' | 'revenue' | 'arr' | 'estimated';
  }>;
  techPlatform: FilterCheck<{
    category: string;
    productDescription: string;
  }>;
  nonUsPresence: FilterCheck<{
    country: string;
    headquarters: string;
    usPresenceEvidence?: string;
  }>;
  verifiedFounderEmail: FilterCheck<{
    founderName: string;
    title: string;
    email: string;
    hunterStatus: HunterStatus;
    deliverabilityScore?: number;
  }>;
}

export interface CleanCompanyRecord {
  companyName: string;
  website: string;
  country: string;
  headquarters: string;
  revenueFundingUsd: string;
  platformCategory: string;
  description: string;
  founderCeoName: string;
  founderTitle: string;
  verifiedWorkEmail: string;
  verificationStatus: HunterStatus;
  deliverabilityScore: number;
}

export interface AuditRecord {
  id: string;
  companyName: string;
  website: string;
  domain: string;
  overallPassed: boolean;
  rejectReasons: string[];
  filters: CandidateFilters;
  sources: {
    title: string;
    url: string;
    snippet: string;
    discoveredViaQuery: string;
  }[];
  hunterVerificationRaw?: any;
  discoveredAt: string;
}

export interface AgentLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'success' | 'error';
  stage: 'query' | 'search' | 'extract' | 'validate' | 'enrich' | 'verify' | 'output';
  message: string;
  details?: any;
}

export interface AgentRunState {
  isRunning: boolean;
  runId: string | null;
  startTime: string | null;
  endTime: string | null;
  stats: {
    queriesExecuted: number;
    sourcesDiscovered: number;
    candidatesExtracted: number;
    candidatesPassed: number;
    candidatesRejected: number;
    emailsVerified: number;
  };
  logs: AgentLogEntry[];
  cleanCompanies: CleanCompanyRecord[];
  auditRecords: AuditRecord[];
}

export interface ApiConfigStatus {
  hasSerpApiKey: boolean;
  hasHunterApiKey: boolean;
  hasGeminiApiKey: boolean;
  serpApiKeyMasked: string;
  hunterApiKeyMasked: string;
  defaultMaxQueries: number;
  defaultMaxCandidates: number;
  defaultTimeout: number;
}
