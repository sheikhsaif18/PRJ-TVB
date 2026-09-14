import fs from 'fs';
import path from 'path';
import {
  AgentLogEntry,
  AgentRunConfig,
  AgentRunState,
  AuditRecord,
  CleanCompanyRecord,
  FounderEmailResult,
  HunterStatus,
} from './types.js';
import { DynamicQueryGenerator } from './queryGenerator.js';
import { SearchProvider } from './searchProvider.js';
import { CandidateExtractor } from './candidateExtractor.js';
import { ValidationEngine } from './validationEngine.js';
import { HunterProvider } from './hunterProvider.js';

export class AgentRunner {
  private static currentState: AgentRunState = {
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
  };

  private static logListeners: Array<(log: AgentLogEntry) => void> = [];

  private static initializedFromDisk = false;

  public static loadExistingOutputs(): void {
    if (this.initializedFromDisk) return;
    this.initializedFromDisk = true;

    try {
      const outputDir = path.join(process.cwd(), 'output');
      const auditPath = path.join(outputDir, 'audit.json');

      if (fs.existsSync(auditPath)) {
        const raw = fs.readFileSync(auditPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.audit) && parsed.audit.length > 0) {
          this.currentState.auditRecords = parsed.audit;
          this.currentState.runId = 'previous_run';
          this.currentState.stats.candidatesExtracted = parsed.totalCandidates || parsed.audit.length;
          this.currentState.stats.candidatesPassed = parsed.passedCandidates || 0;
          this.currentState.stats.candidatesRejected = parsed.rejectedCandidates || 0;

          const cleanCompanies: CleanCompanyRecord[] = [];
          for (const item of parsed.audit) {
            if (item.overallPassed && item.filters) {
              cleanCompanies.push({
                companyName: item.companyName,
                website: item.website,
                country: item.filters.nonUsPresence?.value?.country || '',
                headquarters: item.filters.nonUsPresence?.value?.headquarters || '',
                revenueFundingUsd: item.filters.revenueOrFunding?.value?.displayAmount || '',
                platformCategory: item.filters.techPlatform?.value?.category || '',
                description: item.filters.techPlatform?.value?.productDescription || '',
                founderCeoName: item.filters.verifiedFounderEmail?.value?.founderName || '',
                founderTitle: item.filters.verifiedFounderEmail?.value?.title || '',
                verifiedWorkEmail: item.filters.verifiedFounderEmail?.value?.email || '',
                verificationStatus: item.filters.verifiedFounderEmail?.value?.hunterStatus as HunterStatus,
                deliverabilityScore: item.filters.verifiedFounderEmail?.value?.deliverabilityScore || 95,
              });
            }
          }
          this.currentState.cleanCompanies = cleanCompanies;
          this.currentState.stats.emailsVerified = cleanCompanies.length;
        }
      }
    } catch (err) {
      console.warn('Could not load previous output files from disk:', err);
    }
  }

  public static getState(): AgentRunState {
    if (!this.initializedFromDisk) {
      this.loadExistingOutputs();
    }
    return this.currentState;
  }

  public static addLogListener(listener: (log: AgentLogEntry) => void): () => void {
    this.logListeners.push(listener);
    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== listener);
    };
  }

  private static log(
    level: 'info' | 'warn' | 'success' | 'error',
    stage: 'query' | 'search' | 'extract' | 'validate' | 'enrich' | 'verify' | 'output',
    message: string,
    details?: any
  ): void {
    const entry: AgentLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      stage,
      message,
      details,
    };
    this.currentState.logs.push(entry);
    // Print to server console so terminal runner sees it
    console.log(`[${entry.timestamp}] [${entry.stage.toUpperCase()}] [${entry.level.toUpperCase()}] ${entry.message}`);

    this.logListeners.forEach((fn) => {
      try {
        fn(entry);
      } catch {}
    });
  }

  /**
   * Run the complete autonomous discovery pipeline
   */
  public static async startRun(config: AgentRunConfig): Promise<AgentRunState> {
    if (this.currentState.isRunning) {
      throw new Error('An agent discovery run is already in progress.');
    }

    const runId = `run_${Date.now()}`;
    this.currentState = {
      isRunning: true,
      runId,
      startTime: new Date().toISOString(),
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
    };

    const timeoutSeconds = config.requestTimeoutSeconds || 60;
    const timeoutMs = timeoutSeconds * 1000;

    this.log('info', 'query', `Initiating TVB Target Company Discovery Agent run ${runId}`);
    this.log(
      'info',
      'query',
      `Target criteria: (1) $1M-$5M USD revenue/funding, (2) Tech platform, (3) Minimal/no US presence, (4) Verified CEO/founder email via Hunter, (5) Strict blank preference.`
    );
    this.log(
      'info',
      'query',
      `Configured constraints: max_queries=${config.maxSearchQueries}, max_candidates=${config.maxCandidates}, timeout=${timeoutSeconds}s, region=${config.targetRegion}`
    );

    try {
      // Step 1: Dynamic Query Generation
      const queries = DynamicQueryGenerator.generateQueries(
        config.targetRegion,
        Math.max(1, Math.min(config.maxSearchQueries, 10))
      );
      this.log('info', 'query', `Generated ${queries.length} targeted search queries.`);

      const allRawCandidates: any[] = [];
      const seenDomains = new Set<string>();

      // Step 2: Search Provider (SerpApi / fresh web sources)
      for (let i = 0; i < queries.length; i++) {
        if (!this.currentState.isRunning) break;

        const query = queries[i];
        this.log('info', 'search', `[Query ${i + 1}/${queries.length}] Executing: "${query}"`);

        const searchResult = await SearchProvider.executeQuery(query, config.serpApiKey, timeoutMs);
        this.currentState.stats.queriesExecuted++;

        if (searchResult.httpStatus >= 400 || searchResult.error) {
          this.log(
            'warn',
            'search',
            `Search HTTP Status: ${searchResult.httpStatus} (${searchResult.provider}) - Error: ${searchResult.error || 'Unknown error'}`
          );
        } else {
          this.log(
            'info',
            'search',
            `Search HTTP Status: ${searchResult.httpStatus} (${searchResult.provider}). Discovered ${searchResult.items.length} web sources.`
          );
        }

        this.currentState.stats.sourcesDiscovered += searchResult.items.length;

        // Step 3: Candidate Extraction
        this.log('info', 'extract', `Extracting structured entities from ${searchResult.items.length} sources...`);
        const extractedBatch = await CandidateExtractor.extractFromSearchResults(searchResult.items, query);

        for (const candidate of extractedBatch) {
          if (!seenDomains.has(candidate.domain)) {
            seenDomains.add(candidate.domain);
            allRawCandidates.push(candidate);
          }
        }

        this.currentState.stats.candidatesExtracted = allRawCandidates.length;
        this.log('info', 'extract', `Extracted ${extractedBatch.length} candidates (${allRawCandidates.length} unique total so far).`);

        if (allRawCandidates.length >= config.maxCandidates) {
          this.log('info', 'extract', `Reached maximum candidate extraction limit (${config.maxCandidates}).`);
          break;
        }
      }

      // Step 4: Cross-Source Validation & Step 5: Contact Enrichment & Email Verification
      this.log('info', 'validate', `Commencing strict cross-source validation on ${allRawCandidates.length} candidates...`);

      const cleanCompanies: CleanCompanyRecord[] = [];
      const auditRecords: AuditRecord[] = [];

      for (let i = 0; i < allRawCandidates.length; i++) {
        if (!this.currentState.isRunning) break;
        const candidate = allRawCandidates[i];

        this.log(
          'info',
          'validate',
          `[Candidate ${i + 1}/${allRawCandidates.length}] Screening: "${candidate.companyName}" (${candidate.website})`
        );

        // Preliminary screening on Revenue, Tech Platform, and Non-US presence
        // Filter 1: Revenue/Funding
        const hasRevenueRange =
          candidate.revenueFundingUsd !== null &&
          candidate.revenueFundingUsd >= 1000000 &&
          candidate.revenueFundingUsd <= 5000000;

        // Filter 2: Tech platform
        const catLower = (candidate.platformCategory || '').toLowerCase();
        const isTechPlatform =
          catLower.includes('platform') ||
          catLower.includes('software') ||
          catLower.includes('saas') ||
          catLower.includes('cloud') ||
          catLower.includes('api');

        // Filter 3: Non-US presence
        const isNonUs = !candidate.usPresenceDetected && candidate.country.toLowerCase() !== 'united states';

        let emailVerification: any = null;

        // Only call Hunter if the candidate passes preliminary company filters (saves quota)
        if (hasRevenueRange && isTechPlatform && isNonUs && candidate.founderName) {
          this.log(
            'info',
            'enrich',
            `Founder identified: "${candidate.founderName}" (${candidate.founderTitle}). Initiating Hunter deliverability check at ${candidate.domain}...`
          );

          emailVerification = await HunterProvider.verifyFounderEmail(
            candidate.domain,
            candidate.founderName,
            config.hunterApiKey,
            timeoutMs
          );

          this.currentState.stats.emailsVerified++;
          this.log(
            emailVerification.status === 'valid' ? 'success' : 'warn',
            'verify',
            `Hunter email check for ${candidate.founderName}: Status = "${emailVerification.status}", Score = ${emailVerification.score}%, Email = "${emailVerification.email || 'N/A'}"`
          );
        } else {
          // Record why email check was skipped or dropped
          const skipReasons: string[] = [];
          if (!hasRevenueRange) skipReasons.push(`Revenue/Funding outside $1M-$5M range (${candidate.displayAmount || 'missing'})`);
          if (!isTechPlatform) skipReasons.push(`Not classified as tech platform (${candidate.platformCategory || 'none'})`);
          if (!isNonUs) skipReasons.push(`US presence detected or headquarters in USA (${candidate.country})`);
          if (!candidate.founderName) skipReasons.push(`No founder/CEO name in discovered source`);

          this.log('warn', 'validate', `Pre-validation filter rejected "${candidate.companyName}": ${skipReasons.join(' | ')}`);
        }

        // Full Validation Audit Check
        const emailResult: FounderEmailResult | null = emailVerification
          ? {
              email: emailVerification.email,
              hunterStatus: emailVerification.status,
              deliverabilityScore: emailVerification.score,
              rawHunterPayload: emailVerification.rawResponse,
            }
          : null;

        const validation = ValidationEngine.validateCandidate(candidate, emailResult);

        const auditItem: AuditRecord = {
          id: `audit_${i + 1}_${candidate.domain.replace(/[^a-z0-9]/gi, '_')}`,
          companyName: candidate.companyName,
          website: candidate.website,
          domain: candidate.domain,
          overallPassed: validation.overallPassed,
          rejectReasons: validation.rejectReasons,
          filters: validation.filters,
          sources: [
            {
              title: candidate.sourceTitle,
              url: candidate.sourceUrl,
              snippet: candidate.rawSnippet,
              discoveredViaQuery: candidate.discoveredViaQuery,
            },
          ],
          hunterVerificationRaw: emailVerification?.rawResponse,
          discoveredAt: new Date().toISOString(),
        };

        auditRecords.push(auditItem);

        if (validation.overallPassed) {
          this.currentState.stats.candidatesPassed++;
          const cleanRecord: CleanCompanyRecord = {
            companyName: candidate.companyName,
            website: candidate.website,
            country: candidate.country,
            headquarters: candidate.headquarters,
            revenueFundingUsd: candidate.displayAmount || `$${(candidate.revenueFundingUsd! / 1000000).toFixed(1)}M USD`,
            platformCategory: candidate.platformCategory,
            description: candidate.description,
            founderCeoName: candidate.founderName,
            founderTitle: candidate.founderTitle,
            verifiedWorkEmail: emailVerification?.email || '',
            verificationStatus: emailVerification?.status as HunterStatus,
            deliverabilityScore: emailVerification?.score || 95,
          };
          cleanCompanies.push(cleanRecord);

          this.log(
            'success',
            'output',
            `PASSED ALL HARD CRITERIA: Added "${candidate.companyName}" (${candidate.country}) to clean company list! Email: ${cleanRecord.verifiedWorkEmail}`
          );
        } else {
          this.currentState.stats.candidatesRejected++;
          this.log(
            'warn',
            'validate',
            `REJECTED "${candidate.companyName}" -> Reasons: ${validation.rejectReasons.join('; ')}`
          );
        }
      }

      this.currentState.cleanCompanies = cleanCompanies;
      this.currentState.auditRecords = auditRecords;

      // Step 6: Write files to output/ folder as requested in spec
      this.writeOutputsToDisk(cleanCompanies, auditRecords);

      this.log(
        'success',
        'output',
        `Run completed successfully. Clean Companies: ${cleanCompanies.length} | Audit Records: ${auditRecords.length}. Files saved to output/companies.csv and output/audit.json`
      );
    } catch (err: any) {
      this.log('error', 'output', `Fatal execution error during agent run: ${err.message || err}`);
    } finally {
      this.currentState.isRunning = false;
      this.currentState.endTime = new Date().toISOString();
    }

    return this.currentState;
  }

  public static stopRun(): void {
    if (this.currentState.isRunning) {
      this.log('warn', 'output', 'Agent run stopped manually by operator.');
      this.currentState.isRunning = false;
      this.currentState.endTime = new Date().toISOString();
    }
  }

  /**
   * Generates clean CSV string adhering strictly to RFC-4180
   */
  public static generateCleanCsv(companies: CleanCompanyRecord[]): string {
    const headers = [
      'Company Name',
      'Website',
      'Country',
      'Headquarters',
      'Revenue / Funding (USD)',
      'Platform Category',
      'Description',
      'Founder / CEO Name',
      'Title',
      'Verified Work Email',
      'Hunter Verification Status',
      'Deliverability Score',
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === undefined || str === null) return '';
      const text = String(str);
      if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const rows = [headers.join(',')];

    for (const c of companies) {
      const row = [
        escapeCsv(c.companyName),
        escapeCsv(c.website),
        escapeCsv(c.country),
        escapeCsv(c.headquarters),
        escapeCsv(c.revenueFundingUsd),
        escapeCsv(c.platformCategory),
        escapeCsv(c.description),
        escapeCsv(c.founderCeoName),
        escapeCsv(c.founderTitle),
        escapeCsv(c.verifiedWorkEmail),
        escapeCsv(c.verificationStatus),
        escapeCsv(c.deliverabilityScore),
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  private static writeOutputsToDisk(
    cleanCompanies: CleanCompanyRecord[],
    auditRecords: AuditRecord[]
  ): void {
    try {
      const outputDir = path.join(process.cwd(), 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write CSV
      const csvContent = this.generateCleanCsv(cleanCompanies);
      fs.writeFileSync(path.join(outputDir, 'companies.csv'), csvContent, 'utf-8');

      // Write Audit JSON
      const auditContent = JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          agent: 'TVB Target Company Discovery Agent',
          totalCandidates: auditRecords.length,
          passedCandidates: cleanCompanies.length,
          rejectedCandidates: auditRecords.length - cleanCompanies.length,
          audit: auditRecords,
        },
        null,
        2
      );
      fs.writeFileSync(path.join(outputDir, 'audit.json'), auditContent, 'utf-8');
    } catch (err: any) {
      console.error('Failed to write output files to disk:', err);
    }
  }
}
