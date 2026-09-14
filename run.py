#!/usr/bin/env python3
"""
TVB Target Company Discovery Agent - CLI Runner
Autonomous lead-discovery agent for non-US tech platforms ($1M-$5M funding/revenue)
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime

# Load .env if present
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

load_env()

MAX_SEARCH_QUERIES = int(os.environ.get('MAX_SEARCH_QUERIES', '5'))
MAX_CANDIDATES = int(os.environ.get('MAX_CANDIDATES', '10'))
REQUEST_TIMEOUT_SECONDS = int(os.environ.get('REQUEST_TIMEOUT_SECONDS', '20'))
SERPAPI_API_KEY = os.environ.get('SERPAPI_API_KEY', '')
HUNTER_API_KEY = os.environ.get('HUNTER_API_KEY', '')

API_BASE = "http://127.0.0.1:3000"

def log(stage, level, msg):
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] [{stage.upper()}] [{level.upper()}] {msg}")

def trigger_run_via_api():
    payload = json.dumps({
        "maxSearchQueries": MAX_SEARCH_QUERIES,
        "maxCandidates": MAX_CANDIDATES,
        "requestTimeoutSeconds": REQUEST_TIMEOUT_SECONDS,
        "serpApiKey": SERPAPI_API_KEY,
        "hunterApiKey": HUNTER_API_KEY
    }).encode('utf-8')

    req = urllib.request.Request(
        f"{API_BASE}/api/run",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            log("init", "info", f"Started run on TVB Agent: {data.get('message')}")
    except Exception as e:
        log("error", "error", f"Could not trigger API at {API_BASE}: {e}")
        return False
    return True

def poll_results():
    last_log_count = 0
    while True:
        try:
            with urllib.request.urlopen(f"{API_BASE}/api/run/status", timeout=10) as resp:
                status = json.loads(resp.read().decode('utf-8'))
                logs = status.get('logs', [])
                if len(logs) > last_log_count:
                    for entry in logs[last_log_count:]:
                        log(entry.get('stage', 'AGENT'), entry.get('level', 'INFO'), entry.get('message', ''))
                    last_log_count = len(logs)

                if not status.get('isRunning', False) and status.get('endTime'):
                    stats = status.get('stats', {})
                    clean_count = len(status.get('cleanCompanies', []))
                    audit_count = len(status.get('auditRecords', []))
                    log("complete", "success", f"Run completed! Discovered {clean_count} matching companies, {audit_count} total audit records.")
                    print("-" * 70)
                    print(f"CSV Output:  output/companies.csv ({clean_count} records)")
                    print(f"Audit Trail: output/audit.json ({audit_count} records)")
                    print("-" * 70)
                    break
        except Exception as e:
            time.sleep(1)
        time.sleep(0.8)

if __name__ == "__main__":
    print("=" * 70)
    print("TVB TARGET COMPANY DISCOVERY AGENT")
    print("Criteria: $1M-$5M USD | Tech Platform | Non-US | Verified CEO Email")
    print(f"Max Queries: {MAX_SEARCH_QUERIES} | Max Candidates: {MAX_CANDIDATES} | Timeout: {REQUEST_TIMEOUT_SECONDS}s")
    print("=" * 70)

    if trigger_run_via_api():
        poll_results()
    else:
        sys.exit(1)
