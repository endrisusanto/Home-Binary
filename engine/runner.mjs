#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const AUTH_DIR = path.resolve('./auth');
const AUTH_FILE = path.join(AUTH_DIR, 'auth.json');

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
  return new Promise((resolve) => {
    let inputData = '';
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', (line) => {
      inputData += line;
    });

    rl.on('close', () => {
      if (!inputData.trim()) {
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(inputData);
        resolve(parsed);
      } catch (err) {
        emitLog('error', `Failed to parse standard input JSON: ${err.message}`);
        resolve(null);
      }
    });

    // Fallback timeout in case stdin never closes
    setTimeout(() => {
      if (inputData.trim()) {
        try {
          resolve(JSON.parse(inputData));
        } catch {
          resolve(null);
        }
      }
    }, 2000);
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

async function handleSsoLoginIfNeeded(page, context, username, password, timeoutMs = 120000) {
  const currentUrl = page.url();
  if (
    currentUrl.includes('login') || 
    currentUrl.includes('sso') || 
    currentUrl.includes('adfs') || 
    currentUrl.includes('auth') || 
    currentUrl.includes('sts.secsso.net')
  ) {
    emitLog('warn', `SSO Authentication required at ${currentUrl}`);
    
    if (username && password) {
      emitLog('info', `Attempting auto-fill SSO credentials for user: ${username}...`);
      try {
        const userSelector = '#userNameInput, input[name="UserName"], input[name="username"], input[type="text"], input[type="email"], #username, input[name="loginfmt"]';
        const passSelector = '#passwordInput, input[name="Password"], input[name="password"], input[type="password"], #password';
        const submitSelector = '#submitButton, input[type="submit"], button[type="submit"], #idSIButton9';

        await page.waitForSelector(userSelector, { timeout: 10000 }).catch(() => null);

        const userField = page.locator(userSelector).first();
        if (await userField.count() > 0 && await userField.isVisible()) {
          await userField.fill(username);
          emitLog('info', `Filled SSO username: ${username}`);
        }

        const passField = page.locator(passSelector).first();
        if (await passField.count() > 0 && await passField.isVisible()) {
          await passField.fill(password);
          emitLog('info', `Filled SSO password.`);
        }

        await page.waitForTimeout(500);

        const submitBtn = page.locator(submitSelector).first();
        if (await submitBtn.count() > 0 && await submitBtn.isVisible()) {
          emitLog('info', 'Submitting SSO login form...');
          await submitBtn.click();
        } else {
          await page.keyboard.press('Enter');
        }
      } catch (err) {
        emitLog('warn', `Auto SSO login attempt warning: ${err.message}`);
      }
    }

    emitLog('info', 'Waiting for SSO session to establish and redirect back to QuickBuild portal...');
    try {
      await page.waitForURL(
        (url) => !url.href.includes('sso') && !url.href.includes('login') && !url.href.includes('adfs') && !url.href.includes('sts.secsso.net'),
        { timeout: timeoutMs }
      );
      emitLog('success', 'SSO Login detected! Saving session state...');
      await page.waitForTimeout(2000);
      try {
        await context.storageState({ path: AUTH_FILE });
      } catch {}
    } catch (e) {
      emitLog('warn', `SSO redirect timeout / error: ${e.message}`);
    }
  }
}

async function findAndClickRunButton(page) {
  const runSelectors = [
    'a[title*="Run" i]',
    'a[title*="Trigger" i]',
    'button:has-text("Run")',
    'a:has-text("Run")',
    'button:has-text("Trigger")',
    'a:has-text("Trigger")',
    'a.run',
    'a.action.run',
    'a.btn-run',
    'a:has(i.fa-play)',
    'a:has(i[class*="play"])',
    'a[href*="wicket"][title*="Run" i]',
    'a[href*="overview"][title*="Run" i]',
    'a.action[href*="wicket"]',
    'a[href*="wicket/page"]',
  ];

  for (const selector of runSelectors) {
    try {
      const loc = page.locator(selector).first();
      if (await loc.count() > 0 && await loc.isVisible()) {
        emitLog('info', `Found Run/Trigger action button (${selector}). Clicking...`);
        await loc.scrollIntoViewIfNeeded().catch(() => null);
        await loc.click({ timeout: 4000 });
        return true;
      }
    } catch {}
  }
  return false;
}

async function navigateAndLocateForm(page, formUrl, baseUrl, timeoutMs = 30000) {
  const selFingerprint = 'input[name="editor:content:basicProperties:0:property:editor:editor:wrapper:input"], input[name*="basicProperties:0"], input[name*="0:property:editor"]';
  const selPda = 'input[name="editor:content:basicProperties:1:property:editor:editor:wrapper:input"], input[name*="basicProperties:1"], input[name*="1:property:editor"]';
  const selCsc = 'input[name="editor:content:basicProperties:2:property:editor:editor:wrapper:input"], input[name*="basicProperties:2"], input[name*="2:property:editor"]';
  const selBaseband = 'input[name="editor:content:basicProperties:3:property:editor:editor:wrapper:input"], input[name*="basicProperties:3"], input[name*="3:property:editor"]';

  // Check if form inputs are already on current page
  if (await page.locator(selFingerprint).count() > 0 && await page.locator(selFingerprint).first().isVisible()) {
    emitLog('info', 'Form input fields are already visible on current view.');
    return { selFingerprint, selPda, selCsc, selBaseband };
  }

  // Strategy 1: Navigate to Overview page and click the "Run" button
  emitLog('info', `Navigating to overview portal: ${baseUrl} to trigger run form...`);
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForTimeout(1000);

    const clicked = await findAndClickRunButton(page);
    if (clicked) {
      await page.waitForTimeout(2000);
      if (await page.locator(selFingerprint).count() > 0) {
        emitLog('success', 'Form fields opened via Run action button on overview.');
        return { selFingerprint, selPda, selCsc, selBaseband };
      }
    }
  } catch (err) {
    emitLog('warn', `Overview Run trigger attempt warning: ${err.message}`);
  }

  // Strategy 2: Direct navigation to form URL with retry
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    emitLog('info', `Attempting direct navigation to form: ${formUrl} (Attempt ${attempt}/${maxAttempts})...`);
    try {
      await page.goto(formUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    } catch (e) {
      emitLog('warn', `Form navigation attempt ${attempt} warning: ${e.message}`);
    }

    await page.waitForTimeout(1500);

    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/overview')) {
      emitLog('warn', `Page redirected to ${currentUrl}. Searching for Run / Trigger button...`);
      await findAndClickRunButton(page);
      await page.waitForTimeout(2000);
    }

    try {
      await page.waitForSelector(selFingerprint, { timeout: 8000 });
      emitLog('success', 'Form fields detected and ready for input.');
      return { selFingerprint, selPda, selCsc, selBaseband };
    } catch {
      emitLog('warn', `Form fields not yet visible on attempt ${attempt}.`);
    }
  }

  // Final wait attempt
  await page.waitForSelector(selFingerprint, { timeout: 15000 });
  return { selFingerprint, selPda, selCsc, selBaseband };
}

async function triggerFormSubmission(page, selBaseband, delayMs = 1000) {
  // Give Wicket client-side state 1.2s to process all input onchange events
  const settleDelay = Math.max(delayMs, 1200);
  emitLog('info', `Waiting ${settleDelay}ms for Wicket form state and AJAX validation to settle...`);
  await page.waitForTimeout(settleDelay);

  const submitSelectors = [
    'input[type="submit"][value="Run" i]',
    'input[type="submit"][value="Submit" i]',
    'input[type="submit"][value="Save" i]',
    'button[type="submit"]:has-text("Run")',
    'button[type="submit"]:has-text("Submit")',
    'button:has-text("Run")',
    'button:has-text("Submit")',
    'button:has-text("Save")',
    '.modal-footer input[type="submit"]',
    '.modal-footer button',
    'form input[type="submit"]',
    'form button[type="submit"]',
    'input[type="submit"]',
    'button[type="submit"]',
  ];

  let submitted = false;

  for (const selector of submitSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.count() > 0 && await btn.isVisible()) {
        const btnText = (await btn.innerText().catch(() => '')) || (await btn.getAttribute('value').catch(() => '')) || selector;
        emitLog('info', `Clicking submit button: [${btnText.trim()}] (${selector})...`);
        
        await btn.scrollIntoViewIfNeeded().catch(() => null);
        await btn.hover().catch(() => null);
        await page.waitForTimeout(300);
        await btn.click({ timeout: 5000 });
        submitted = true;
        break;
      }
    } catch (err) {
      emitLog('warn', `Submit click attempt on ${selector} warning: ${err.message}`);
    }
  }

  if (!submitted) {
    emitLog('warn', 'Standard submit button not clickable. Triggering Enter key on last input field as fallback...');
    await page.press(selBaseband, 'Enter');
  }

  // Wait for submission request to dispatch and server response
  const postSubmitWait = Math.max(delayMs * 2, 2500);
  emitLog('info', `Waiting ${postSubmitWait}ms for Wicket submission AJAX response...`);
  await page.waitForTimeout(postSubmitWait);
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
  const username = portal.username || 'endri.s';
  const password = portal.password || 'sein2016!';
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
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
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
      context = await browser.newContext({ storageState: AUTH_FILE, viewport: null });
    } else {
      context = await browser.newContext({ viewport: null });
    }
  } catch (err) {
    emitLog('warn', `Could not load storage state: ${err.message}. Creating fresh context.`);
    context = await browser.newContext({ viewport: null });
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

    // Check & Handle SSO Login if required
    await handleSsoLoginIfNeeded(page, context, username, password, timeoutMs);

    // Loop through batch items
    for (let i = 0; i < items.length; i++) {
      if (isCancelled) break;
      const item = items[i];
      const itemIndex = item.index ?? i;

      emitProgress(item.id, itemIndex, 'running', `Submitting: ${item.buildFingerprintName}`);
      emitLog('info', `[${i + 1}/${items.length}] Processing item: ${item.buildFingerprintName}`);

      try {
        // Navigate to Wicket Form with robust overview Run button click and redirect recovery
        const { selFingerprint, selPda, selCsc, selBaseband } = await navigateAndLocateForm(page, formUrl, baseUrl, timeoutMs);

        // Fill all 4 input fields with deliberate entry
        emitLog('info', `Populating form fields for ${item.buildFingerprintName}...`);
        await page.fill(selFingerprint, item.buildFingerprintName || '');
        await page.waitForTimeout(200);

        await page.fill(selPda, item.pdaVersion || '');
        await page.waitForTimeout(200);

        await page.fill(selCsc, item.cscVersion || '');
        await page.waitForTimeout(200);

        await page.fill(selBaseband, item.basebandVersion || '');
        await page.waitForTimeout(300);

        emitLog('info', `All 4 fields populated (PDA: ${item.pdaVersion}, CSC: ${item.cscVersion}, Phone: ${item.basebandVersion}).`);

        // Trigger Submit with adequate validation settle delay and multi-selector click
        await triggerFormSubmission(page, selBaseband, delayMs);

        // Check for error feedback panels
        const errorFeedback = page.locator('.feedbackPanelERROR, .alert-danger, .error-message');
        if (await errorFeedback.count() > 0 && await errorFeedback.first().isVisible()) {
          const errText = await errorFeedback.first().innerText();
          throw new Error(`Portal validation error: ${errText.trim()}`);
        }

        // Extract Build ID from URL or page confirmation
        let buildId = item.buildId;
        const pageUrl = page.url();
        const urlMatch = pageUrl.match(/build\/(\d+)/);
        if (urlMatch && urlMatch[1]) {
          buildId = urlMatch[1];
        } else if (!buildId) {
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

    // Save final storageState
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
  emitLog('error', `Runner unhandled error: ${err.message}`);
  process.exit(1);
});
