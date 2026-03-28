#!/usr/bin/env node
/**
 * Run searchJobList and write full JSON for manual verification.
 *
 * Usage (from server/mcp-jobs, after npm run build):
 *   node scripts/export-search-result.cjs
 *
 * Env overrides: KEYWORD, CITY, PAGE, SALARY, WORK_YEAR, OUT_FILE
 * Default keyword is Agent开发 (agent / LLM job search smoke test).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const outFile =
  process.env.OUT_FILE ||
  path.join(__dirname, '..', 'verification-output.json');

async function main() {
  const { searchJobList } = require('../dist/index.js');

  const searchParams = {
    keyword: process.env.KEYWORD || 'Agent开发',
    city: process.env.CITY || '北京',
    page: Number(process.env.PAGE || '1') || 1,
    salary: process.env.SALARY || undefined,
    workYear: process.env.WORK_YEAR || '1-3年',
  };

  const t0 = Date.now();
  const { jobs, bySite, siteDiagnostics } = await searchJobList(searchParams);
  const elapsedMs = Date.now() - t0;

  const payload = {
    generatedAt: new Date().toISOString(),
    elapsedMs,
    searchParams,
    bySite,
    ...(siteDiagnostics && Object.keys(siteDiagnostics).length > 0
      ? { siteDiagnostics }
      : {}),
    notes: [
      'zhipin (BOSS) often returns count 0 under headless automation: site redirects to verify/login. Set CRAWLER_STORAGE_STATE to a Playwright storage file after logging in at m.zhipin.com, and/or CRAWLER_HEADLESS=false — see .env.example.',
    ],
    totalJobs: jobs.length,
    jobs,
  };

  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), 'utf8');
  console.error(
    `[export-search-result] wrote ${jobs.length} jobs to ${outFile} (${elapsedMs}ms)`
  );
  console.error(`[export-search-result] bySite: ${JSON.stringify(bySite)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
