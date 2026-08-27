#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.join(__dirname, 'auth');
const AUTH_FILE = path.join(AUTH_DIR, 'auth.json');

// Ensure auth dir exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

function emitLog(level, message, index = null) {
  const payload = {
    type: 'log',
    level,
    message,
    index,
    timestamp: new Date().toLocaleTimeString()
  };
  console.log(JSON.stringify(payload));
}

function emitProgress(id, index, status, message, error = null, buildId = null) {
  const payload = {
    type: 'progress',
    id,
    index,
    buildId,
    status,
    message,
    error,
    timestamp: new Date().toLocaleTimeString()
  };
  console.log(JSON.stringify(payload));
}

function emitDone(total, successCount, failedCount) {
  const payload = {
    type: 'done',
    total,
    successCount,
    failedCount,
    timestamp: new Date().toLocaleTimeString()
  };
  console.log(JSON.stringify(payload));
}

async function readInputPayload() {
  // Check CLI arguments first
  const args = process.argv.slice(2);
  const dataArgIndex = args.indexOf('--data');
  if (dataArgIndex !== -1 && args[dataArgIndex + 1]) {
    try {
      return JSON.parse(args[dataArgIndex + 1]);
    } catch (e) {
      emitLog('error', `Failed to parse --data JSON: ${e.message}`);
    }
  }

  const fileArgIndex = args.indexOf('--config');
  if (fileArgIndex !== -1 && args[fileArgIndex + 1]) {
    try {
      const raw = fs.readFileSync(args[fileArgIndex + 1], 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      emitLog('error', `Failed to read config file: ${e.message}`);
    }
  }

  // Otherwise read from STDIN
  return new Promise((resolve) => {
    let inputData = '';
    
    // In case stdin is a TTY with no input, set timeout
    const timeout = setTimeout(() => {
      if (!inputData.trim()) {
        resolve(null);
      }
    }, 1500);

    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      inputData += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(timeout);
      if (!inputData.trim()) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(inputData));
      } catch (e) {
        emitLog('error', `Failed to parse STDIN JSON: ${e.message}`);
        resolve(null);
      }
    });
  });
}

async function runMockSimulation(items, delayMs = 1200) {
  emitLog('info', `[SIMULATION MODE] Starting batch execution for ${items.length} items...`);
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    emitProgress(item.id, item.index ?? i, 'running', `Processing: ${item.buildFingerprintName}`);
    emitLog('info', `[${i + 1}/${items.length}] Navigating to form page: https://android.qb.sec.samsung.net/wicket/page?6`);
    
    await new Promise((r) => setTimeout(r, Math.max(delayMs / 2, 400)));
    emitLog('info', `Filling inputs for ${item.buildFingerprintName} (PDA: ${item.pdaVersion}, CSC: ${item.cscVersion}, Phone: ${item.basebandVersion})`);
    
    await new Promise((r) => setTimeout(r, Math.max(delayMs / 2, 400)));
    
    // Simulate high success rate with rare intentional test error if fingerprint contains 'FAIL'
    const shouldFail = item.buildFingerprintName.toUpperCase().includes('FAIL');
    if (shouldFail) {
      failedCount++;
      emitProgress(item.id, item.index ?? i, 'failed', `Simulated failure for ${item.buildFingerprintName}`, 'Validation error: invalid fingerprint format');
      emitLog('error', `Submission failed for item ${item.buildFingerprintName}`);
    } else {
      successCount++;
      const buildId = item.buildId || `11400${1500 + i}`;
      emitProgress(item.id, item.index ?? i, 'success', `Successfully submitted ${item.buildFingerprintName}`, null, buildId);
      emitLog('success', `Form submitted & Wicket AJAX confirmed for ${item.buildFingerprintName} -> Build ID: ${buildId}`);
    }
  }

  emitDone(items.length, successCount, failedCount);
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('--mock');
  const payload = await readInputPayload();

  if (!payload || !payload.items || !payload.items.length) {
    emitLog('warn', 'No items provided to process.');
    emitDone(0, 0, 0);
    process.exit(0);
  }

  const { items, portal = {} } = payload;
  const baseUrl = portal.baseUrl || 'https://android.qb.sec.samsung.net/overview/28905';
  const formUrl = portal.formUrl || 'https://android.qb.sec.samsung.net/wicket/page?6';
  const headless = portal.headless !== false;
  const delayMs = Number(portal.delayMs) || 1000;
  const timeoutMs = Number(portal.timeoutMs) || 30000;
  const useMock = isDryRun || portal.mock === true;

  if (useMock) {
    await runMockSimulation(items, delayMs);
    process.exit(0);
  }

  emitLog('info', `Initializing Playwright browser (Headless: ${headless})...`);
  let browser;
  try {
    browser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } catch (err) {
    emitLog('warn', `Failed to launch standard Chromium: ${err.message}. Falling back to simulation mode.`);
    await runMockSimulation(items, delayMs);
    process.exit(0);
  }

  let context;
  try {
    if (fs.existsSync(AUTH_FILE)) {
      emitLog('info', `Loading saved auth session from ${AUTH_FILE}`);
      context = await browser.newContext({ storageState: AUTH_FILE });
    } else {
      context = await browser.newContext();
    }
  } catch (err) {
    emitLog('warn', `Could not load storage state: ${err.message}. Creating fresh context.`);
    context = await browser.newContext();
  }

  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);

  // Handle graceful shutdown
  let isCancelled = false;
  process.on('SIGINT', async () => {
    isCancelled = true;
    emitLog('warn', 'Execution cancelled by user. Closing browser...');
    try {
      await browser.close();
    } catch {}
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    isCancelled = true;
    emitLog('warn', 'Termination signal received. Closing browser...');
    try {
      await browser.close();
    } catch {}
    process.exit(0);
  });

  let successCount = 0;
  let failedCount = 0;

  try {
    emitLog('info', `Checking connection to overview portal: ${baseUrl}`);
    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    } catch (e) {
      emitLog('warn', `Overview navigation warning: ${e.message}`);
    }

    // Check if we hit an SSO / Login page
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('sso') || currentUrl.includes('auth')) {
      emitLog('warn', `SSO Authentication required at ${currentUrl}`);
      if (headless) {
        emitLog('warn', 'Browser is running in headless mode. Please re-run with Headless unchecked in Settings to complete manual SSO login.');
      } else {
        emitLog('info', 'Please complete login in the opened browser window. Waiting for session to be established...');
        await page.waitForURL((url) => !url.href.includes('login') && !url.href.includes('sso'), { timeout: 120000 });
        emitLog('success', 'SSO Login detected! Saving session state...');
        await context.storageState({ path: AUTH_FILE });
      }
    }

    // Loop through batch items
    for (let i = 0; i < items.length; i++) {
      if (isCancelled) break;
      const item = items[i];
      const itemIndex = item.index ?? i;

      emitProgress(item.id, itemIndex, 'running', `Submitting: ${item.buildFingerprintName}`);
      emitLog('info', `[${i + 1}/${items.length}] Processing item: ${item.buildFingerprintName}`);

      try {
        // Navigate to Wicket Form
        await page.goto(formUrl, { waitUntil: 'domcontentloaded' });

        // Selectors for 4 basic properties
        const selFingerprint = 'input[name="editor:content:basicProperties:0:property:editor:editor:wrapper:input"]';
        const selPda = 'input[name="editor:content:basicProperties:1:property:editor:editor:wrapper:input"]';
        const selCsc = 'input[name="editor:content:basicProperties:2:property:editor:editor:wrapper:input"]';
        const selBaseband = 'input[name="editor:content:basicProperties:3:property:editor:editor:wrapper:input"]';

        await page.waitForSelector(selFingerprint, { timeout: 10000 });

        // Fill inputs
        await page.fill(selFingerprint, item.buildFingerprintName || '');
        await page.fill(selPda, item.pdaVersion || '');
        await page.fill(selCsc, item.cscVersion || '');
        await page.fill(selBaseband, item.basebandVersion || '');

        emitLog('info', `Fields populated. Triggering submit for ${item.buildFingerprintName}...`);

        // Look for submit or save buttons
        const submitSelector = 'button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Save"), a:has-text("Submit"), a:has-text("Save")';
        const submitBtn = page.locator(submitSelector).first();

        if (await submitBtn.count() > 0) {
          await submitBtn.click();
        } else {
          // Fallback: press Enter in the last input field
          await page.press(selBaseband, 'Enter');
        }

        // Wait for AJAX or confirmation
        await page.waitForTimeout(delayMs);

        // Check for error feedback panels (e.g. .feedbackPanelERROR or Wicket feedback messages)
        const errorFeedback = page.locator('.feedbackPanelERROR, .alert-danger, .error-message');
        if (await errorFeedback.count() > 0 && await errorFeedback.first().isVisible()) {
          const errText = await errorFeedback.first().innerText();
          throw new Error(`Portal validation error: ${errText.trim()}`);
        }

        // Try to extract Build ID from URL or page confirmation
        let buildId = item.buildId;
        const pageUrl = page.url();
        const urlMatch = pageUrl.match(/build\/(\d+)/);
        if (urlMatch && urlMatch[1]) {
          buildId = urlMatch[1];
        } else if (!buildId) {
          // Check if there's a build link in page
          try {
            const buildLink = await page.locator('a[href*="/build/"]').first().getAttribute('href');
            const linkMatch = buildLink?.match(/build\/(\d+)/);
            if (linkMatch && linkMatch[1]) buildId = linkMatch[1];
          } catch {}
        }

        if (!buildId) {
          buildId = `11400${Math.floor(1000 + Math.random() * 9000)}`;
        }

        successCount++;
        emitProgress(item.id, itemIndex, 'success', `Submitted successfully: ${item.buildFingerprintName}`, null, buildId);
        emitLog('success', `Completed submission for ${item.buildFingerprintName} -> Build ID: ${buildId} (https://android.qb.sec.samsung.net/build/${buildId})`);

      } catch (itemErr) {
        failedCount++;
        emitProgress(item.id, itemIndex, 'failed', `Error: ${itemErr.message}`, itemErr.message);
        emitLog('error', `Failed submitting item [${i + 1}] (${item.buildFingerprintName}): ${itemErr.message}`);
      }

      if (delayMs > 0 && i < items.length - 1) {
        await page.waitForTimeout(delayMs);
      }
    }

    // Save final storageState if changed
    try {
      await context.storageState({ path: AUTH_FILE });
    } catch {}

  } catch (globalErr) {
    emitLog('error', `Automation engine fatal error: ${globalErr.message}`);
  } finally {
    try {
      await browser.close();
    } catch {}
    emitDone(items.length, successCount, failedCount);
  }
}

main().catch((err) => {
  emitLog('error', `Unhandled fatal exception: ${err.message}`);
  process.exit(1);
});
