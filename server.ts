import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { AgentRunner } from './server/agent/agentRunner.js';
import { AgentRunConfig } from './server/agent/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory session key overrides
let sessionSerpApiKey = process.env.SERPAPI_API_KEY || '';
let sessionHunterApiKey = process.env.HUNTER_API_KEY || '';

// API Routes FIRST

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: 'TVB Target Company Discovery Agent',
    timestamp: new Date().toISOString(),
  });
});

// 2. Configuration & API Key status
app.get('/api/config', (req, res) => {
  res.json({
    hasSerpApiKey: Boolean(sessionSerpApiKey && sessionSerpApiKey.trim().length > 0),
    hasHunterApiKey: Boolean(sessionHunterApiKey && sessionHunterApiKey.trim().length > 0),
    hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
    serpApiKeyMasked: sessionSerpApiKey ? `${sessionSerpApiKey.slice(0, 4)}...${sessionSerpApiKey.slice(-4)}` : '',
    hunterApiKeyMasked: sessionHunterApiKey ? `${sessionHunterApiKey.slice(0, 4)}...${sessionHunterApiKey.slice(-4)}` : '',
    defaultMaxQueries: parseInt(process.env.MAX_SEARCH_QUERIES || '5', 10),
    defaultMaxCandidates: parseInt(process.env.MAX_CANDIDATES || '10', 10),
    defaultTimeout: parseInt(process.env.REQUEST_TIMEOUT_SECONDS || '20', 10),
  });
});

app.post('/api/config', (req, res) => {
  const { serpApiKey, hunterApiKey } = req.body;
  if (typeof serpApiKey === 'string') {
    sessionSerpApiKey = serpApiKey.trim();
  }
  if (typeof hunterApiKey === 'string') {
    sessionHunterApiKey = hunterApiKey.trim();
  }
  res.json({
    success: true,
    hasSerpApiKey: Boolean(sessionSerpApiKey),
    hasHunterApiKey: Boolean(sessionHunterApiKey),
  });
});

// 3. Trigger Agent Run (POST /api/run as requested in spec)
app.post('/api/run', async (req, res) => {
  const {
    maxSearchQueries = parseInt(process.env.MAX_SEARCH_QUERIES || '5', 10),
    maxCandidates = parseInt(process.env.MAX_CANDIDATES || '10', 10),
    requestTimeoutSeconds = parseInt(process.env.REQUEST_TIMEOUT_SECONDS || '20', 10),
    targetRegion = 'all_non_us',
    serpApiKey = sessionSerpApiKey,
    hunterApiKey = sessionHunterApiKey,
  } = req.body;

  const config: AgentRunConfig = {
    maxSearchQueries: Number(maxSearchQueries),
    maxCandidates: Number(maxCandidates),
    requestTimeoutSeconds: Number(requestTimeoutSeconds),
    targetRegion,
    serpApiKey: serpApiKey || sessionSerpApiKey,
    hunterApiKey: hunterApiKey || sessionHunterApiKey,
  };

  const currentState = AgentRunner.getState();
  if (currentState.isRunning) {
    return res.status(409).json({
      error: 'An agent discovery run is already in progress.',
      state: currentState,
    });
  }

  // Start run asynchronously and return immediate 202
  AgentRunner.startRun(config).catch((err) => {
    console.error('Agent run execution failed:', err);
  });

  res.status(202).json({
    message: 'TVB Target Company Discovery Agent started.',
    config,
    initialState: AgentRunner.getState(),
  });
});

// 4. Stop Agent Run
app.post('/api/run/stop', (req, res) => {
  AgentRunner.stopRun();
  res.json({
    message: 'Stop signal dispatched to agent.',
    state: AgentRunner.getState(),
  });
});

// 5. Get current state & results
app.get('/api/run/status', (req, res) => {
  res.json(AgentRunner.getState());
});

// 6. Server-Sent Events (SSE) log stream for live terminal
app.get('/api/run/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send current state first
  res.write(`data: ${JSON.stringify({ type: 'init', state: AgentRunner.getState() })}\n\n`);

  const removeListener = AgentRunner.addLogListener((logEntry) => {
    res.write(`data: ${JSON.stringify({ type: 'log', log: logEntry })}\n\n`);
  });

  req.on('close', () => {
    removeListener();
  });
});

// 7. Clean CSV Export (output/companies.csv)
app.get('/api/export/csv', (req, res) => {
  const state = AgentRunner.getState();
  const csvContent = AgentRunner.generateCleanCsv(state.cleanCompanies);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="companies.csv"');
  res.send(csvContent);
});

// 8. Full Audit JSON Export (output/audit.json)
app.get('/api/export/audit', (req, res) => {
  const state = AgentRunner.getState();
  const auditData = {
    agent: 'TVB Target Company Discovery Agent',
    exportTime: new Date().toISOString(),
    runId: state.runId,
    stats: state.stats,
    totalRecords: state.auditRecords.length,
    passedRecords: state.cleanCompanies.length,
    rejectedRecords: state.stats.candidatesRejected,
    auditRecords: state.auditRecords,
  };

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="audit.json"');
  res.send(JSON.stringify(auditData, null, 2));
});

// Fallback 404 for unhandled API routes so they NEVER return HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.path}`,
  });
});

// Vite middleware / static asset serving
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TVB Target Company Discovery Agent running at http://0.0.0.0:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
