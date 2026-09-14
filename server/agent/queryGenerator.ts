export interface QueryTemplate {
  template: string;
  category: string;
  focus: string;
}

export class DynamicQueryGenerator {
  private static readonly REGION_TEMPLATES: Record<string, string[]> = {
    all_non_us: [
      '"raised" ("$1M" OR "$2M" OR "$3M" OR "$4M" OR "$5M") ("seed" OR "series A") platform (Europe OR "United Kingdom" OR Germany OR France OR Singapore OR Brazil) -site:wikipedia.org -usa',
      '("1M..5M revenue" OR "ARR $2M" OR "ARR $3M" OR "ARR $4M") B2B SaaS platform ("headquartered in" OR "based in") -US -USA -"San Francisco"',
      '"tech platform" "seed round" ("$1.5M" OR "$2.5M" OR "$3M" OR "$4M") ("founder and CEO" OR "co-founder") (Berlin OR Paris OR London OR Amsterdam OR Tokyo OR Sydney)',
      '"B2B software" ("funding of $2 million" OR "raised $3 million" OR "raised $1.5 million" OR "$4 million seed") "headquarters" -Delaware -California',
      '"startup" "raised $2M" OR "raised $3M" OR "raised $4M" cloud platform "co-founder & CEO" ("UK" OR "EU" OR "Australia" OR "Nordics")',
      'SaaS startup ("annual revenue $1M" OR "revenue of $2M" OR "revenue of $3M" OR "revenue of $4M") "CEO" -USA -"New York"'
    ],
    europe: [
      '"raised" ("$1M" OR "$2M" OR "$3M" OR "$4M" OR "$5M") ("seed" OR "series A") "SaaS platform" ("Germany" OR "France" OR "Netherlands" OR "Sweden" OR "Spain") -USA',
      '"B2B platform" ("€1M" OR "€2M" OR "€3M" OR "€4M" OR "$2M" OR "$3M") funding "CEO" "headquarters in" (Berlin OR Paris OR Stockholm OR Madrid)',
      'European tech startup "annual recurring revenue" ("$1M" OR "$2M" OR "$3M" OR "$4M") "founder" -US'
    ],
    latam: [
      'Latin America "tech platform" ("raised $1M" OR "raised $2M" OR "raised $3M" OR "raised $4M") seed (Brazil OR Mexico OR Colombia OR Chile) -USA',
      '"B2B SaaS" startup ("revenue $1M" OR "raised $2.5M" OR "raised $3M") "fundador" OR "CEO" Latin America'
    ],
    apac: [
      '"Asia Pacific" OR "Singapore" OR "Australia" OR "India" "SaaS platform" ("raised $2M" OR "raised $3M" OR "raised $4M") "co-founder" -USA',
      'Australian B2B platform ("$1.5M" OR "$2M" OR "$3M" OR "$4M" funding) "Sydney" OR "Melbourne" "CEO" -Delaware'
    ],
    uk_nordics: [
      'UK OR Nordic "tech platform" ("raised £1.5M" OR "raised £2M" OR "raised $3M" OR "raised $4M") ("London" OR "Helsinki" OR "Copenhagen" OR "Oslo") "founder & CEO" -USA',
      'Nordic SaaS startup ("ARR $2M" OR "ARR $3M" OR "funding $3M") "headquartered in" -California'
    ]
  };

  public static generateQueries(region: string = 'all_non_us', count: number = 3): string[] {
    const list = this.REGION_TEMPLATES[region] || this.REGION_TEMPLATES.all_non_us;
    // Shuffle and pick requested count
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
}
