# TVB Target Company Discovery Agent

An autonomous lead-discovery and qualification agent designed to find, filter, and verify high-potential non-US tech platform companies matching strict venture capital investment criteria.

---

## 🎯 Core Qualification Criteria

Every company discovered by the agent is evaluated against five mandatory criteria:

1. **Financial Traction ($1M – $5M USD):**
   - Annual Recurring Revenue (ARR) or reported seed/early-stage funding within the $1,000,000 to $5,000,000 USD range.
   - Values in EUR (€) or GBP (£) are normalized to USD equivalents.
2. **Technology Platform Archetype:**
   - Must be a scalable technology platform (B2B SaaS, cloud infrastructure, developer APIs, database platforms, analytics engines, workflow automation).
   - Excludes non-tech traditional retail, agencies, consulting, and service firms.
3. **Non-US Geographic Footprint:**
   - Headquartered outside the United States (e.g. Europe, UK, Nordics, APAC, Latin America).
   - Must have zero or minimal US physical presence. Companies with primary US headquarters or Silicon Valley offices are rejected.
4. **Verified Founder / CEO Work Email:**
   - Live email discovery and deliverability verification via Hunter.io.
   - Validated email address with deliverability score ≥ 80%.
   - Catch-all / `accept_all` domains and unverified addresses are flagged and rejected.
5. **Strict Blank Preference:**
   - The agent never guesses, halluncinates, or fabricates missing information. Fields lacking verified source citations are left blank or the entity is rejected.

---

## 🏗️ System Architecture

The project consists of three core tiers: a modular Node.js/TypeScript backend agent engine, an interactive React frontend dashboard, and a Python CLI runner.

```
├── output/                     # Generated artifacts
│   ├── companies.csv           # Clean, qualified leads spreadsheet
│   └── audit.json              # Full audit log with criteria evaluations & evidence
│
├── server/                     # Agent Execution Engine & Services
│   └── agent/
│       ├── queryGenerator.ts   # Targeted Boolean search query builder
│       ├── searchProvider.ts   # SerpApi integration with search fallbacks
│       ├── candidateExtractor.ts # Entity parsing (funding, HQ, founders, platform)
│       ├── validationEngine.ts # 5-stage rule filter & citation verifier
│       ├── hunterProvider.ts   # Hunter.io email verification & scoring client
│       ├── agentRunner.ts      # Pipeline orchestrator, event bus, and CSV/JSON exporter
│       └── types.ts            # Shared TypeScript data models
│
├── src/                        # Interactive Frontend (React + Vite + Tailwind CSS)
│   ├── components/
│   │   ├── AuditInspectorModal.tsx  # Modal inspecting individual filter audit trails
│   │   ├── CompaniesTable.tsx       # Interactive table of verified target leads
│   │   ├── ConfigPanel.tsx          # Execution parameters & API keys setup
│   │   ├── CriteriaBadge.tsx        # Visual status chips for criteria checks
│   │   ├── PipelineVisualizer.tsx   # Live step-by-step pipeline status
│   │   └── RealtimeLogs.tsx         # Live streaming console via Server-Sent Events
│   ├── App.tsx                 # Main dashboard component & polling/SSE manager
│   ├── main.tsx                # Client entry point
│   └── types.ts                # Frontend type definitions
│
├── server.ts                   # Express server mounting API routes & Vite middleware
├── run.py                      # Standalone Python CLI runner
├── package.json                # Node.js project manifest & dependencies
└── vite.config.ts              # Vite bundler configuration
```

### Agent Pipeline Flow

```
[1. Query Generation] ➔ Generates search matrices (financial range + geography + tech platform)
         │
[2. Search Provider]  ➔ Executes search queries via SerpApi (Google Search) with fallback sources
         │
[3. Extraction]       ➔ Extracts companies, funding/ARR amounts, countries, founder/CEO names
         │
[4. Validation Engine]➔ Evaluates candidates against all 5 hard rules:
         │               • $1M-$5M USD filter
         │               • Tech platform category check
         │               • Non-US location & absence of US HQ
         │
[5. Hunter.io Check]  ➔ Queries Hunter.io API for verified work email & deliverability score
         │
[6. Output Generation]➔ Exports qualified records to CSV & comprehensive audit trail to JSON
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Python**: 3.8+ (optional, only needed for the CLI runner `run.py`)

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd <repository-directory>

# Install Node.js dependencies
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Set your configuration values inside `.env`:

```env
# Required for live email verification
HUNTER_API_KEY="your_hunter_api_key_here"

# Optional: For live Google Search results via SerpApi
# If omitted or invalid, the engine uses web discovery sources
SERPAPI_API_KEY="your_serpapi_key_here"

# Agent Execution Defaults
MAX_SEARCH_QUERIES=5
MAX_CANDIDATES=10
REQUEST_TIMEOUT_SECONDS=30
```

> **API Keys Note:** You can obtain a free API key from [Hunter.io](https://hunter.io) for email verification and [SerpApi](https://serpapi.com) for search indexing.

---

## 💻 How to Run

### Option A: Interactive Web Application (Recommended)

Start the full-stack development server (Express + Vite on port 3000):

```bash
npm run dev
```

Open your browser to:
```
http://localhost:3000
```

From the web UI, you can:
- Adjust search limits, candidate quotas, and timeout settings.
- Trigger agent runs with the **"Start Discovery Run"** button.
- Monitor execution in real time via live streaming logs (Server-Sent Events).
- View discovered companies with founder details and deliverability badges.
- Click **"Inspect Audit"** on any candidate to view exact citations, filter decisions, and raw API responses.
- Download `output/companies.csv` and `output/audit.json` with a single click.

---

### Option B: Standalone Python CLI Runner

If you prefer running the discovery pipeline from the terminal or in an automated CI/cron script, use `run.py`:

1. Ensure the backend server is running in the background:
   ```bash
   npm run dev &
   ```
2. Run the CLI tool:
   ```bash
   python3 run.py
   ```

The script will trigger the run, stream timestamped logs directly to stdout, and summarize results upon completion:

```
[2026-09-14 09:03:50] [INIT] [INFO] Started run on TVB Agent: TVB Target Company Discovery Agent started.
[2026-09-14 09:03:51] [SEARCH] [INFO] [Query 1/5] Executing target search...
[2026-09-14 09:03:54] [VALIDATE] [INFO] Screening: "Meilisearch" (France)
[2026-09-14 09:03:54] [VERIFY] [SUCCESS] Hunter email check: Quentin de Quelen (valid, 98% score)
[2026-09-14 09:03:56] [COMPLETE] [SUCCESS] Discovered 4 matching companies.
----------------------------------------------------------------------
CSV Output:  output/companies.csv (4 records)
Audit Trail: output/audit.json (6 records)
----------------------------------------------------------------------
```

---

## 📊 Output Files

Execution outputs are automatically written to the `output/` directory:

### 1. `output/companies.csv`
Contains all qualified candidates that successfully passed all five criteria:
- **Company Name**: Official entity name
- **Website**: Domain URL
- **Country & Headquarters**: Verified non-US city and country
- **Revenue / Funding (USD)**: Verified traction amount ($1M–$5M)
- **Platform Category**: Evaluated platform archetype
- **Founder / CEO Name**: Extracted executive name
- **Verified Work Email**: Hunter-verified deliverable email
- **Deliverability Score**: 0–100% confidence metric

### 2. `output/audit.json`
Comprehensive audit trail recording both passed and rejected companies. For every candidate evaluated, it logs:
- Exact URL sources and text snippets where evidence was found.
- Individual filter determinations (boolean pass/fail with reasoning).
- Rejection reasons for non-qualifying entities (e.g. US presence detected, out-of-range funding, catch-all email).
- Raw Hunter.io API verification payloads.

---

## 🛠️ Development & Testing

- **Lint and Typecheck**:
  ```bash
  npm run lint
  ```
- **Production Build**:
  ```bash
  npm run build
  ```
- **Start Production Server**:
  ```bash
  npm run start
  ```

---

## 🛡️ Key Architectural Principles

- **Zero Hallucination Policy:** If a company's revenue, location, or CEO email cannot be conclusively verified from source text or Hunter.io API responses, the candidate is either rejected or recorded strictly with verified fields.
- **Fail-Safe Search Graceful Fallback:** If the external search provider experiences rate limits or invalid credentials, the system automatically falls back to curated discovery feeds while maintaining real Hunter email verification.
- **Defensive API Boundary:** All backend routes (`/api/*`) guarantee structured JSON responses with explicit error statuses, preventing frontend parser faults.
