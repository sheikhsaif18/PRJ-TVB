import { CandidateFilters, HunterStatus } from './types.js';

export interface RawCandidateData {
  companyName: string;
  website: string;
  domain: string;
  country: string;
  headquarters: string;
  description: string;
  platformCategory: string;
  revenueFundingUsd: number | null;
  displayAmount: string;
  amountType: 'funding' | 'revenue' | 'arr' | 'estimated';
  fundingRevenueEvidence: string;
  platformEvidence: string;
  geographicEvidence: string;
  usPresenceDetected: boolean;
  usPresenceDetails?: string;
  founderName: string;
  founderTitle: string;
  sourceUrl: string;
  sourceTitle: string;
  rawSnippet: string;
  discoveredViaQuery: string;
}

export class ValidationEngine {
  /**
   * Validate all 4 hard criteria
   */
  public static validateCandidate(
    candidate: RawCandidateData,
    emailResult?: {
      email: string;
      hunterStatus: HunterStatus;
      deliverabilityScore?: number;
      verificationDetails?: any;
    }
  ): {
    overallPassed: boolean;
    rejectReasons: string[];
    filters: CandidateFilters;
  } {
    const rejectReasons: string[] = [];

    // Filter 1: Revenue or Funding between $1M and $5M USD
    let revenuePassed = false;
    let revenueFailReason: string | undefined;

    if (candidate.revenueFundingUsd === null) {
      revenuePassed = false;
      revenueFailReason = 'Missing verified revenue or funding data (blank preferred over guessed values).';
      rejectReasons.push(revenueFailReason);
    } else if (candidate.revenueFundingUsd < 1000000) {
      revenuePassed = false;
      revenueFailReason = `Amount ($${(candidate.revenueFundingUsd / 1000000).toFixed(2)}M) is below minimum threshold of $1.0M USD.`;
      rejectReasons.push(revenueFailReason);
    } else if (candidate.revenueFundingUsd > 5000000) {
      revenuePassed = false;
      revenueFailReason = `Amount ($${(candidate.revenueFundingUsd / 1000000).toFixed(2)}M) exceeds maximum threshold of $5.0M USD.`;
      rejectReasons.push(revenueFailReason);
    } else {
      revenuePassed = true;
    }

    const revenueOrFunding = {
      passed: revenuePassed,
      value: {
        amountUsd: candidate.revenueFundingUsd,
        displayAmount: candidate.displayAmount,
        type: candidate.amountType,
      },
      evidence: candidate.fundingRevenueEvidence || 'No direct citation found.',
      sourceUrl: candidate.sourceUrl,
      failureReason: revenueFailReason,
    };

    // Filter 2: Operates a technology-related platform
    let platformPassed = false;
    let platformFailReason: string | undefined;

    const validCategories = [
      'saas',
      'b2b software',
      'cloud platform',
      'api platform',
      'developer tools',
      'fintech platform',
      'iot telemetry platform',
      'enterprise software',
      'telehealth platform',
      'cybersecurity software',
      'workflow automation',
      'logistics software'
    ];

    const catLower = (candidate.platformCategory || '').toLowerCase();
    const isTech = validCategories.some((cat) => catLower.includes(cat)) ||
      catLower.includes('platform') ||
      catLower.includes('software') ||
      catLower.includes('saas');

    if (!isTech || !candidate.platformCategory) {
      platformPassed = false;
      platformFailReason = `Entity is not classified as a technology platform (found: "${candidate.platformCategory || 'unknown'}").`;
      rejectReasons.push(platformFailReason);
    } else {
      platformPassed = true;
    }

    const techPlatform = {
      passed: platformPassed,
      value: {
        category: candidate.platformCategory,
        productDescription: candidate.description,
      },
      evidence: candidate.platformEvidence || candidate.description || 'No direct platform evidence cited.',
      sourceUrl: candidate.sourceUrl,
      failureReason: platformFailReason,
    };

    // Filter 3: Minimal/no US presence based on explicit evidence found in discovered sources
    let nonUsPassed = false;
    let nonUsFailReason: string | undefined;

    if (candidate.usPresenceDetected) {
      nonUsPassed = false;
      nonUsFailReason = `US presence detected: ${candidate.usPresenceDetails || 'US HQ, offices, or core US operations identified in source'}.`;
      rejectReasons.push(nonUsFailReason);
    } else if (
      !candidate.country ||
      candidate.country.toLowerCase() === 'united states' ||
      candidate.country.toLowerCase() === 'usa' ||
      candidate.country.toLowerCase() === 'us'
    ) {
      nonUsPassed = false;
      nonUsFailReason = `Company country is United States (${candidate.headquarters || 'USA'}).`;
      rejectReasons.push(nonUsFailReason);
    } else {
      nonUsPassed = true;
    }

    const nonUsPresence = {
      passed: nonUsPassed,
      value: {
        country: candidate.country,
        headquarters: candidate.headquarters,
        usPresenceEvidence: candidate.usPresenceDetails,
      },
      evidence: candidate.geographicEvidence || `Headquartered in ${candidate.headquarters}, ${candidate.country}.`,
      sourceUrl: candidate.sourceUrl,
      failureReason: nonUsFailReason,
    };

    // Filter 4: CEO/co-founder professional email can be found and verified
    let emailPassed = false;
    let emailFailReason: string | undefined;

    const email = emailResult?.email || '';
    const status: HunterStatus = (emailResult as any)?.hunterStatus || (emailResult as any)?.status || 'missing';
    const score = (emailResult as any)?.deliverabilityScore ?? (emailResult as any)?.score ?? 0;

    if (!candidate.founderName || candidate.founderName.trim() === '') {
      emailPassed = false;
      emailFailReason = 'Founder / CEO identity not confirmed in source data.';
      rejectReasons.push(emailFailReason);
    } else if (!email || email.trim() === '' || status === 'missing') {
      emailPassed = false;
      emailFailReason = 'No professional founder email found.';
      rejectReasons.push(emailFailReason);
    } else if (status === 'webmail_rejected') {
      emailPassed = false;
      emailFailReason = 'Rejected: Public webmail inbox (e.g. Gmail/Yahoo) is not acceptable for B2B executive contact.';
      rejectReasons.push(emailFailReason);
    } else if (status === 'generic_rejected') {
      emailPassed = false;
      emailFailReason = 'Rejected: Generic role inbox (e.g. info@, contact@) is not a founder/CEO personal work email.';
      rejectReasons.push(emailFailReason);
    } else if (status === 'accept_all') {
      emailPassed = false;
      emailFailReason = 'Hunter status "accept_all": Domain accepts all incoming mail, deliverability cannot be strictly verified.';
      rejectReasons.push(emailFailReason);
    } else if (status === 'unknown') {
      emailPassed = false;
      emailFailReason = 'Hunter status "unknown": Mail server timed out or bounced deliverability check.';
      rejectReasons.push(emailFailReason);
    } else if (status === 'invalid') {
      emailPassed = false;
      emailFailReason = 'Hunter status "invalid": Mailbox does not exist or bounces.';
      rejectReasons.push(emailFailReason);
    } else if (status === 'valid') {
      emailPassed = true;
    }

    const verifiedFounderEmail = {
      passed: emailPassed,
      value: {
        founderName: candidate.founderName,
        title: candidate.founderTitle,
        email: emailPassed ? email : '',
        hunterStatus: status,
        deliverabilityScore: score,
      },
      evidence: emailPassed
        ? `Verified Deliverable (${score}% score via Hunter.io) for ${candidate.founderName} (${candidate.founderTitle}).`
        : (emailFailReason || 'Verification check failed.'),
      sourceUrl: candidate.sourceUrl,
      failureReason: emailFailReason,
    };

    const overallPassed = revenuePassed && platformPassed && nonUsPassed && emailPassed;

    return {
      overallPassed,
      rejectReasons,
      filters: {
        revenueOrFunding,
        techPlatform,
        nonUsPresence,
        verifiedFounderEmail,
      },
    };
  }
}
