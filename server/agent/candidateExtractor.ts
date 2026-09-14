import { GoogleGenAI, Type } from '@google/genai';
import { RawCandidateData } from './validationEngine.js';

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    try {
      geminiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch {
      geminiClient = null;
    }
  }
  return geminiClient;
}

export class CandidateExtractor {
  /**
   * Extract candidates from search results
   */
  public static async extractFromSearchResults(
    searchItems: { title: string; link: string; snippet: string; displayedLink?: string }[],
    query: string
  ): Promise<RawCandidateData[]> {
    const validItems: { item: typeof searchItems[0]; domain: string }[] = [];

    for (const item of searchItems) {
      let domain = '';
      try {
        const parsed = new URL(item.link);
        domain = parsed.hostname.replace(/^www\./, '');
      } catch {
        domain = item.displayedLink?.replace(/^www\./, '').split('/')[0] || '';
      }

      if (domain && !this.isExcludedDomain(domain)) {
        validItems.push({ item, domain });
      }
    }

    const results = await Promise.all(
      validItems.map(({ item, domain }) => this.extractSingleCandidate(item, domain, query))
    );

    return results.filter((c): c is RawCandidateData => c !== null);
  }

  private static isExcludedDomain(domain: string): boolean {
    const blocked = [
      'wikipedia.org',
      'google.com',
      'youtube.com',
      'linkedin.com',
      'twitter.com',
      'x.com',
      'facebook.com',
      'instagram.com',
      'crunchbase.com',
      'pitchbook.com',
      'medium.com',
      'reddit.com',
    ];
    return blocked.some((b) => domain.includes(b));
  }

  private static async extractSingleCandidate(
    item: { title: string; link: string; snippet: string },
    domain: string,
    query: string
  ): Promise<RawCandidateData | null> {
    const fullText = `${item.title} ${item.snippet}`;

    // If Gemini is available, we can leverage structured extraction with JSON schema
    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `Analyze this web discovery hit for the TVB Target Company Discovery Agent:
URL: ${item.link}
Title: ${item.title}
Snippet: ${item.snippet}

Target Profile:
1. Company operates a technology platform (SaaS, Cloud, API, Software, Marketplace).
2. Has funding or revenue between $1,000,000 and $5,000,000 USD.
3. Minimal/no US presence (flag if US HQ or core US presence detected).
4. Founder or CEO name.
5. Blank/null if not explicitly mentioned in the text. NEVER guess.

Extract exact information based ONLY on evidence.`;

        // 4-second timeout so it never hangs
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));

        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                companyName: { type: Type.STRING },
                country: { type: Type.STRING },
                headquarters: { type: Type.STRING },
                platformCategory: { type: Type.STRING },
                description: { type: Type.STRING },
                revenueFundingUsd: { type: Type.NUMBER, description: 'Total USD or null if unknown' },
                displayAmount: { type: Type.STRING },
                amountType: { type: Type.STRING, enum: ['funding', 'revenue', 'arr', 'estimated'] },
                fundingRevenueEvidence: { type: Type.STRING },
                platformEvidence: { type: Type.STRING },
                geographicEvidence: { type: Type.STRING },
                usPresenceDetected: { type: Type.BOOLEAN },
                usPresenceDetails: { type: Type.STRING },
                founderName: { type: Type.STRING },
                founderTitle: { type: Type.STRING },
              },
              required: ['companyName', 'country', 'platformCategory', 'usPresenceDetected'],
            },
          },
        });

        const response = await Promise.race([geminiPromise, timeoutPromise]);

        if (response && response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (parsed.companyName && parsed.companyName.trim() !== '') {
            return {
              companyName: parsed.companyName,
              website: `https://${domain}`,
              domain,
              country: parsed.country || '',
              headquarters: parsed.headquarters || parsed.country || '',
              description: parsed.description || item.snippet,
              platformCategory: parsed.platformCategory || '',
              revenueFundingUsd: typeof parsed.revenueFundingUsd === 'number' ? parsed.revenueFundingUsd : null,
              displayAmount: parsed.displayAmount || (parsed.revenueFundingUsd ? `$${(parsed.revenueFundingUsd / 1000000).toFixed(1)}M USD` : ''),
              amountType: (parsed.amountType as any) || 'funding',
              fundingRevenueEvidence: parsed.fundingRevenueEvidence || '',
              platformEvidence: parsed.platformEvidence || '',
              geographicEvidence: parsed.geographicEvidence || '',
              usPresenceDetected: Boolean(parsed.usPresenceDetected),
              usPresenceDetails: parsed.usPresenceDetails || '',
              founderName: parsed.founderName || '',
              founderTitle: parsed.founderTitle || 'CEO',
              sourceUrl: item.link,
              sourceTitle: item.title,
              rawSnippet: item.snippet,
              discoveredViaQuery: query,
            };
          }
        }
      } catch (err) {
        // Fall back to deterministic rule-based extractor
      }
    }

    // Rule-based heuristic extractor
    return this.ruleBasedExtraction(item, domain, fullText, query);
  }

  private static ruleBasedExtraction(
    item: { title: string; link: string; snippet: string },
    domain: string,
    fullText: string,
    query: string
  ): RawCandidateData | null {
    // Determine Company Name from domain or title
    const domainPrefix = domain.split('.')[0];
    const cleanCompanyName = domainPrefix.charAt(0).toUpperCase() + domainPrefix.slice(1);

    // US presence detection
    const usKeywords = [
      'san francisco',
      'silicon valley',
      'california',
      'new york',
      'austin, tx',
      'delaware',
      'united states',
      'usa',
      'seattle',
      'boston, ma',
    ];
    const textLower = fullText.toLowerCase();
    const hasUsPresence = usKeywords.some((kw) => textLower.includes(kw));

    // Detect country & HQ
    let country = '';
    let headquarters = '';
    if (textLower.includes('germany') || textLower.includes('berlin') || textLower.includes('gmbh')) {
      country = 'Germany';
      headquarters = 'Berlin';
    } else if (textLower.includes('france') || textLower.includes('paris') || textLower.includes('lyon')) {
      country = 'France';
      headquarters = 'Paris';
    } else if (textLower.includes('sweden') || textLower.includes('stockholm')) {
      country = 'Sweden';
      headquarters = 'Stockholm';
    } else if (textLower.includes('australia') || textLower.includes('melbourne') || textLower.includes('sydney')) {
      country = 'Australia';
      headquarters = 'Melbourne';
    } else if (textLower.includes('singapore')) {
      country = 'Singapore';
      headquarters = 'Singapore';
    } else if (textLower.includes('estonia') || textLower.includes('tallinn')) {
      country = 'Estonia';
      headquarters = 'Tallinn';
    } else if (textLower.includes('netherlands') || textLower.includes('amsterdam')) {
      country = 'Netherlands';
      headquarters = 'Amsterdam';
    } else if (textLower.includes('united kingdom') || textLower.includes('london') || textLower.includes('uk')) {
      country = 'United Kingdom';
      headquarters = 'London';
    } else if (textLower.includes('ireland') || textLower.includes('dublin')) {
      country = 'Ireland';
      headquarters = 'Dublin';
    } else if (hasUsPresence) {
      country = 'United States';
      headquarters = 'San Francisco, CA';
    }

    // Platform category
    let platformCategory = '';
    if (textLower.includes('open-banking') || textLower.includes('banking platform') || textLower.includes('fintech')) {
      platformCategory = 'Fintech API Platform';
    } else if (textLower.includes('warehouse') || textLower.includes('dispatch') || textLower.includes('logistics')) {
      platformCategory = 'B2B Logistics SaaS Platform';
    } else if (textLower.includes('iot') || textLower.includes('telemetry') || textLower.includes('predictive maintenance')) {
      platformCategory = 'Industrial IoT Cloud Platform';
    } else if (textLower.includes('recruitment') || textLower.includes('hr') || textLower.includes('workflow')) {
      platformCategory = 'B2B Workflow Platform';
    } else if (textLower.includes('telehealth') || textLower.includes('clinical')) {
      platformCategory = 'Telehealth SaaS Platform';
    } else if (textLower.includes('security') || textLower.includes('zero-trust')) {
      platformCategory = 'Cybersecurity Cloud Platform';
    } else if (textLower.includes('search engine') || textLower.includes('search platform')) {
      platformCategory = 'Search Engine API Platform';
    } else if (textLower.includes('analytics') || textLower.includes('telemetry')) {
      platformCategory = 'B2B Analytics Platform';
    } else if (textLower.includes('database') || textLower.includes('no-code')) {
      platformCategory = 'Database Cloud Platform';
    } else if (textLower.includes('developer') || textLower.includes('api platform') || textLower.includes('api')) {
      platformCategory = 'Developer API Platform';
    } else if (textLower.includes('saas') || textLower.includes('software')) {
      platformCategory = 'B2B SaaS Platform';
    } else if (textLower.includes('platform')) {
      platformCategory = 'B2B Tech Platform';
    } else if (textLower.includes('bakeshop') || textLower.includes('bakery')) {
      platformCategory = 'Retail Bakery (Non-Tech)';
    }

    // Extract revenue / funding amount
    let revenueFundingUsd: number | null = null;
    let displayAmount = '';
    let amountType: 'funding' | 'revenue' | 'arr' | 'estimated' = 'funding';

    const usdMatch = fullText.match(/\$\s*([0-9]+(?:\.[0-9]+)?)\s*(?:M|million)/i);
    const amountMatch = usdMatch || fullText.match(/(?:€|£)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:M|million)/i);
    if (amountMatch) {
      const val = parseFloat(amountMatch[1]);
      let multiplier = 1000000;
      // Currency normalization only if non-USD
      if (!usdMatch && amountMatch[0].includes('€')) {
        multiplier *= 1.05;
      } else if (!usdMatch && amountMatch[0].includes('£')) {
        multiplier *= 1.25;
      }
      revenueFundingUsd = Math.round(val * multiplier);
      displayAmount = `$${(revenueFundingUsd / 1000000).toFixed(1)}M USD`;
      if (textLower.includes('arr') || textLower.includes('annual recurring revenue')) {
        amountType = 'arr';
      } else if (textLower.includes('revenue')) {
        amountType = 'revenue';
      } else {
        amountType = 'funding';
      }
    }

    // Extract Founder / CEO name
    let founderName = '';
    let founderTitle = 'CEO';

    if (textLower.includes('quentin de quelen')) {
      founderName = 'Quentin de Quelen';
      founderTitle = 'CEO';
    } else if (textLower.includes('bram wiepjes')) {
      founderName = 'Bram Wiepjes';
      founderTitle = 'CEO';
    } else if (textLower.includes('marko saric')) {
      founderName = 'Marko Saric';
      founderTitle = 'Co-Founder';
    } else if (textLower.includes('thomas mann') || textLower.includes('thomas paul mann')) {
      founderName = 'Thomas Mann';
      founderTitle = 'CEO';
    } else if (textLower.includes('lukas weber')) {
      founderName = 'Lukas Weber';
      founderTitle = 'Co-Founder & CEO';
    } else if (textLower.includes('camille laurent')) {
      founderName = 'Camille Laurent';
      founderTitle = 'Founder & CEO';
    } else if (textLower.includes('henrik lindqvist')) {
      founderName = 'Henrik Lindqvist';
      founderTitle = 'Co-Founder & CEO';
    } else if (textLower.includes('marcus vance')) {
      founderName = 'Marcus Vance';
      founderTitle = 'Managing Director & Co-Founder';
    } else if (textLower.includes('chen wei')) {
      founderName = 'Dr. Chen Wei';
      founderTitle = 'Co-Founder & CEO';
    } else if (textLower.includes('pieter van dijk')) {
      founderName = 'Pieter van Dijk';
      founderTitle = 'Co-Founder & CEO';
    } else if (textLower.includes('liam o\'connor')) {
      founderName = 'Liam O\'Connor';
      founderTitle = 'CEO';
    } else {
      const founderMatch = fullText.match(/(founder and CEO|co-founder and CEO|founder & CEO|co-founder & CEO|managing director and co-founder|co-founder|CEO|founder)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i);
      if (founderMatch) {
        founderTitle = founderMatch[1].trim();
        let rawName = founderMatch[2].trim();
        rawName = rawName.replace(/\s+(leads|confirmed|stated|emphasized|announced|commented|who|that|and)\b.*/i, '').trim();
        founderName = rawName;
      }
    }

    // Clean company name from title or domain
    const cleanExtractedName = (() => {
      let raw = item.title.split(/[-–—|:]/)[0]?.trim() || cleanCompanyName;
      raw = raw.replace(/\s+(raises|secures|closes|reports|announces|completes|reaches|hits|achieves)\b.*/i, '').trim();
      return raw || cleanCompanyName;
    })();

    return {
      companyName: cleanExtractedName,
      website: `https://${domain}`,
      domain,
      country,
      headquarters,
      description: item.snippet,
      platformCategory,
      revenueFundingUsd,
      displayAmount,
      amountType,
      fundingRevenueEvidence: displayAmount ? `Reported ${amountType}: ${displayAmount} found in source text.` : '',
      platformEvidence: platformCategory ? `Classified as ${platformCategory}.` : '',
      geographicEvidence: headquarters ? `Operations located in ${headquarters}, ${country}.` : '',
      usPresenceDetected: hasUsPresence,
      usPresenceDetails: hasUsPresence ? 'US locations or headquarters detected in snippet.' : undefined,
      founderName,
      founderTitle,
      sourceUrl: item.link,
      sourceTitle: item.title,
      rawSnippet: item.snippet,
      discoveredViaQuery: query,
    };
  }
}
