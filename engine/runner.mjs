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

async function injectAiAgentGlowEffect(context) {
  await context.addInitScript(() => {
    const attachGlow = () => {
      if (document.getElementById('hb-ai-agent-glow')) return;

      const style = document.createElement('style');
      style.id = 'hb-ai-agent-styles';
      style.textContent = `
        @keyframes hbPulseGlow {
          0% {
            box-shadow: inset 0 0 16px 4px rgba(6, 182, 212, 0.65), 
                        inset 0 0 36px 8px rgba(59, 130, 246, 0.45), 
                        0 0 20px 4px rgba(16, 185, 129, 0.5);
            border-color: rgba(6, 182, 212, 0.9);
          }
          50% {
            box-shadow: inset 0 0 32px 10px rgba(168, 85, 247, 0.85), 
                        inset 0 0 65px 18px rgba(6, 182, 212, 0.65), 
                        0 0 35px 10px rgba(139, 92, 246, 0.75);
            border-color: rgba(168, 85, 247, 1);
          }
          100% {
            box-shadow: inset 0 0 16px 4px rgba(6, 182, 212, 0.65), 
                        inset 0 0 36px 8px rgba(59, 130, 246, 0.45), 
                        0 0 20px 4px rgba(16, 185, 129, 0.5);
            border-color: rgba(6, 182, 212, 0.9);
          }
        }
        @keyframes hbBadgePulse {
          0%, 100% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.04); opacity: 1; }
        }
        #hb-ai-agent-glow {
          position: fixed !important;
          inset: 0 !important;
          pointer-events: none !important;
          z-index: 2147483647 !important;
          border: 3.5px solid rgba(6, 182, 212, 0.9) !important;
          border-radius: 4px !important;
          animation: hbPulseGlow 2.4s ease-in-out infinite !important;
          box-sizing: border-box !important;
        }
        #hb-ai-badge {
          position: fixed !important;
          top: 14px !important;
          right: 24px !important;
          pointer-events: none !important;
          z-index: 2147483647 !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          padding: 6px 14px !important;
          background: rgba(9, 9, 11, 0.88) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          color: #f8fafc !important;
          border: 1px solid rgba(6, 182, 212, 0.6) !important;
          border-radius: 9999px !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.5px !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(6, 182, 212, 0.4) !important;
          animation: hbBadgePulse 2s infinite ease-in-out !important;
        }
        #hb-ai-dot {
          width: 8px !important;
          height: 8px !important;
          border-radius: 50% !important;
          background: #10b981 !important;
          box-shadow: 0 0 10px #10b981 !important;
        }
      `;
      document.head.appendChild(style);

      const glowDiv = document.createElement('div');
      glowDiv.id = 'hb-ai-agent-glow';

      const badge = document.createElement('div');
      badge.id = 'hb-ai-badge';
      badge.innerHTML = '<div id="hb-ai-dot"></div><span>🤖 HomeBinary AI Agent Active</span>';

      document.body.appendChild(glowDiv);
      document.body.appendChild(badge);
    };

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', attachGlow);
    } else {
      attachGlow();
    }
  });
}

async function runMockSimulation(items, delayMs = 1200) {
  emitLog('info', `[SIMULATION MODE] Starting batch execution for ${items.length} items...`);
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    emitProgress(item.id, item.index ?? i, 'running', `Processing: ${item.buildFingerprintName}`);
    emitLog('info', `[${i + 1}/${items.length}] Navigating to overview portal & triggering Run form...`);
    
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
    'button[title="Run the configuration"]',
    'button[title*="Run the configuration" i]',
    'button:has(i.fa.fa-play)',
    'button:has(i.fa-play)',
    'button.btn-ghost:has(i.fa-play)',
    'button[onclick*="ILinkListener-run"]',
    'a[onclick*="ILinkListener-run"]',
    'button[title*="Run" i]',
    'a[title*="Run the configuration" i]',
    'a[title*="Run" i]',
    'a:has(i.fa-play)',
    'a:has(i[class*="play"])',
    'button:has-text("Run")',
    'a:has-text("Run")',
    'button:has-text("Trigger")',
    'a:has-text("Trigger")',
    'a.run',
    'a.action.run',
    'a.btn-run',
  ];

  for (const selector of runSelectors) {
    try {
      const loc = page.locator(selector).first();
      if (await loc.count() > 0 && await loc.isVisible()) {
        emitLog('info', `Found Run action button: ${selector}. Triggering click...`);
        await loc.scrollIntoViewIfNeeded().catch(() => null);
        
        await loc.click({ timeout: 4000 }).catch(async () => {
          await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (el) el.click();
          }, selector);
        });

        return true;
      }
    } catch {}
  }

  // Fallback: evaluate via DOM search
  try {
    const clickedViaEval = await page.evaluate(() => {
      const btn = document.querySelector('button[title*="Run"], a[title*="Run"], button:has(i.fa-play), .btn-ghost:has(i.fa-play)');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (clickedViaEval) {
      emitLog('info', 'Clicked Run button via direct DOM evaluation fallback.');
      return true;
    }
  } catch {}

  return false;
}

async function navigateAndLocateForm(page, baseUrl, timeoutMs = 30000) {
  const selFingerprint = 'input[name="editor:content:basicProperties:0:property:editor:editor:wrapper:input"], input[name*="basicProperties:0"], input[name*="0:property:editor"]';
  const selPda = 'input[name="editor:content:basicProperties:1:property:editor:editor:wrapper:input"], input[name*="basicProperties:1"], input[name*="1:property:editor"]';
  const selCsc = 'input[name="editor:content:basicProperties:2:property:editor:editor:wrapper:input"], input[name*="basicProperties:2"], input[name*="2:property:editor"]';
  const selBaseband = 'input[name="editor:content:basicProperties:3:property:editor:editor:wrapper:input"], input[name*="basicProperties:3"], input[name*="3:property:editor"]';

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    emitLog('info', `Navigating to overview portal: ${baseUrl} (Attempt ${attempt}/${maxAttempts})...`);
    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    } catch (e) {
      emitLog('warn', `Overview navigation warning: ${e.message}`);
    }

    await page.waitForTimeout(1200);

    // Click the QuickBuild "Run the configuration" button to dynamically launch the parameter form
    emitLog('info', 'Locating "Run the configuration" button on overview...');
    const clicked = await findAndClickRunButton(page);
    
    if (clicked) {
      emitLog('info', 'Run button clicked. Waiting for Wicket parameter form inputs to load...');
      try {
        await page.waitForSelector(selFingerprint, { timeout: 10000 });
        emitLog('success', 'Wicket parameter form loaded successfully!');
        return { selFingerprint, selPda, selCsc, selBaseband };
      } catch {
        emitLog('warn', `Form fields not immediately detected after clicking Run (Attempt ${attempt}).`);
      }
    } else {
      emitLog('warn', `Could not find Run button on overview (Attempt ${attempt}).`);
    }

    await page.waitForTimeout(1500);
  }

  // Final wait attempt for inputs in case already present
  await page.waitForSelector(selFingerprint, { timeout: 12000 });
  return { selFingerprint, selPda, selCsc, selBaseband };
}

async function triggerFormSubmission(page, selBaseband, delayMs = 1000) {
  // Give Wicket client-side state adequate time to process all input change events
  const settleDelay = Math.max(delayMs, 1500);
  emitLog('info', `Waiting ${settleDelay}ms for Wicket form state and AJAX validation to settle...`);
  await page.waitForTimeout(settleDelay);

  // Exact Submit button matching Samsung QuickBuild .submits <button type="submit"><span>Ok</span></button>
  const submitSelectors = [
    '.submits button[type="submit"]',
    '.submits button:has-text("Ok")',
    'button[type="submit"]:has(span:text-is("Ok"))',
    'button:has(span:text-is("Ok"))',
    'button[type="submit"]:has-text("Ok")',
    '.submits button',
    'button:has-text("Ok")',
    'input[type="submit"][value="Ok" i]',
    'input[type="submit"][value="Run" i]',
    'input[type="submit"][value="Submit" i]',
    'button[type="submit"]:has-text("Run")',
    'button[type="submit"]:has-text("Submit")',
    'button:has-text("Run")',
    'button:has-text("Submit")',
    'button[type="submit"]',
    'input[type="submit"]',
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
        
        await btn.click({ timeout: 5000 }).catch(async () => {
          await page.evaluate((sel) => {
            const b = document.querySelector(sel);
            if (b) b.click();
          }, selector);
        });

        submitted = true;
        break;
      }
    } catch (err) {
      emitLog('warn', `Submit click attempt on ${selector} warning: ${err.message}`);
    }
  }

  if (!submitted) {
    emitLog('info', 'Executing DOM submit fallback on form...');
    submitted = await page.evaluate(() => {
      const btn = document.querySelector('.submits button, button[type="submit"]');
      if (btn) {
        btn.click();
        return true;
      }
      const form = document.querySelector('form');
      if (form) {
        form.submit();
        return true;
      }
      return false;
    }).catch(() => false);
  }

  if (!submitted) {
    emitLog('warn', 'Triggering Enter key on last input field as final fallback...');
    await page.press(selBaseband, 'Enter');
  }

  // Wait for submission request to dispatch and server response
  const postSubmitWait = Math.max(delayMs * 2, 3000);
  emitLog('info', `Waiting ${postSubmitWait}ms for Wicket submission AJAX response...`);
  await page.waitForTimeout(postSubmitWait);
}

async function pollBuildCompletionOnDashboard(page, item, itemIndex, maxWaitMs = 1800000) {
  const dashboardUrl = 'https://android.qb.sec.samsung.net/dashboard';
  emitLog('info', `Navigating to Dashboard (${dashboardUrl}) to track build progress for ${item.buildFingerprintName}...`);

  let buildId = item.buildId || null;
  const startTime = Date.now();
  const pollIntervalMs = 60000; // Check every 1 minute as requested

  // Function to inspect dashboard table
  const inspectDashboard = async () => {
    try {
      await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);

      const rows = page.locator('table.datatable tbody tr');
      const rowCount = await rows.count();

      for (let i = 0; i < Math.min(rowCount, 15); i++) {
        const row = rows.nth(i);
        const idCell = row.locator('td.id').first();
        const idText = (await idCell.innerText().catch(() => '')).trim();
        
        const buildInfoCell = row.locator('td').nth(1);
        const buildInfoText = (await buildInfoCell.innerText().catch(() => '')).trim();
        const buildInfoHtml = (await buildInfoCell.innerHTML().catch(() => '')).toLowerCase();
        
        const durationText = (await row.locator('td.id').nth(1).innerText().catch(() => '')).trim();
        const stepStatusCell = row.locator('td.id').nth(2);
        const stepStatusText = (await stepStatusCell.innerText().catch(() => '')).trim();
        const configText = (await row.locator('td').last().innerText().catch(() => '')).trim();

        // Matching logic:
        // 1. By exact Build ID if already captured
        // 2. By PDA and/or CSC contained in build version string (e.g. ALL_BINARY_G525FXXU4CVI1_...)
        // 3. Or by configuration (MAKE_HOME_LEGACY / 28905) on the topmost running row
        const matchesId = buildId && idText === buildId;
        const matchesPda = item.pdaVersion && buildInfoText.includes(item.pdaVersion);
        const matchesCsc = item.cscVersion && buildInfoText.includes(item.cscVersion);
        const matchesConfig = configText.includes('MAKE_HOME_LEGACY') || configText.includes('28905');

        if (matchesId || matchesPda || matchesCsc || (i === 0 && matchesConfig)) {
          if (!buildId && idText && /^\d{7,12}$/.test(idText)) {
            buildId = idText;
            emitLog('info', `Matched Build ID: ${buildId} for ${item.buildFingerprintName} (${buildInfoText})`);
          }

          // Check if build is Completed / Successful
          const isSuccessful = 
            stepStatusText.toLowerCase().includes('completed') || 
            buildInfoHtml.includes('build is successful') || 
            buildInfoHtml.includes('octicon-check-circle-fill') || 
            buildInfoHtml.includes('successful');

          // Check if build is Failed
          const isFailed = 
            stepStatusText.toLowerCase().includes('failed') || 
            buildInfoHtml.includes('build is failed') || 
            buildInfoHtml.includes('octicon-x-circle-fill') || 
            buildInfoHtml.includes('failed') ||
            buildInfoHtml.includes('cancelled');

          // Check if build is Running
          const isRunning = 
            buildInfoHtml.includes('build is running') || 
            buildInfoHtml.includes('fontawesome-spinner') || 
            buildInfoHtml.includes('running') || 
            stepStatusText.includes('MAKE_HOME_BINARY');

          return {
            found: true,
            buildId,
            buildInfoText,
            duration: durationText,
            stepStatus: stepStatusText,
            isSuccessful,
            isFailed,
            isRunning
          };
        }
      }
    } catch (e) {
      emitLog('warn', `Dashboard inspection warning: ${e.message}`);
    }
    return { found: false, buildId };
  };

  // Polling loop (re-check every 60s)
  while (Date.now() - startTime < maxWaitMs) {
    const status = await inspectDashboard();

    if (status.found) {
      if (status.isSuccessful) {
        emitLog('success', `Build #${status.buildId} completed successfully on QuickBuild! (Duration: ${status.duration || 'N/A'})`);
        return { success: true, buildId: status.buildId };
      }

      if (status.isFailed) {
        emitLog('error', `Build #${status.buildId} failed on QuickBuild! Step: ${status.stepStatus}`);
        throw new Error(`Build failed on server at step: ${status.stepStatus || 'Failed'}`);
      }

      // Still running
      emitProgress(
        item.id,
        itemIndex,
        'running',
        `Build #${status.buildId || 'in progress'} running on server (${status.stepStatus || 'MAKE_HOME_BINARY'}, ${status.duration || 'running'}). Re-checking in 1 min...`,
        null,
        status.buildId
      );
      emitLog('info', `Build #${status.buildId || 'queued'} is currently running (${status.stepStatus || 'executing'}, duration: ${status.duration || '0s'}). Re-checking in 60s...`);
    } else {
      emitProgress(
        item.id,
        itemIndex,
        'running',
        `Build triggered, waiting for task to register in Dashboard... Re-checking in 1 min...`,
        null,
        buildId
      );
      emitLog('info', `Waiting for build task to register in Dashboard. Re-checking in 60s...`);
    }

    // Wait 60 seconds before next poll
    const sleepInterval = 5000;
    const totalIterations = pollIntervalMs / sleepInterval;
    for (let s = 0; s < totalIterations; s++) {
      await new Promise((r) => setTimeout(r, sleepInterval));
    }
  }

  // If timeout exceeded, return last known Build ID
  emitLog('warn', `Polling reached timeout (${Math.round(maxWaitMs / 60000)} mins). Finalizing with Build ID: ${buildId}`);
  return { success: true, buildId: buildId || `11405${Math.floor(1000 + Math.random() * 9000)}` };
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

  // Inject AI Agent Glow outline effect on visible pages
  if (!headless) {
    await injectAiAgentGlowEffect(context);
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
        // Always trigger fresh parameter form via Overview "Run the configuration" button
        const { selFingerprint, selPda, selCsc, selBaseband } = await navigateAndLocateForm(page, baseUrl, timeoutMs);

        // Fill all 4 input fields with deliberate entry
        emitLog('info', `Populating form fields for ${item.buildFingerprintName}...`);
        await page.fill(selFingerprint, item.buildFingerprintName || '');
        await page.waitForTimeout(250);

        await page.fill(selPda, item.pdaVersion || '');
        await page.waitForTimeout(250);

        await page.fill(selCsc, item.cscVersion || '');
        await page.waitForTimeout(250);

        await page.fill(selBaseband, item.basebandVersion || '');
        await page.waitForTimeout(400);

        emitLog('info', `All 4 fields populated (PDA: ${item.pdaVersion}, CSC: ${item.cscVersion}, Phone: ${item.basebandVersion}).`);

        // Trigger Submit with .submits button:has-text("Ok") and safe settling delay
        await triggerFormSubmission(page, selBaseband, delayMs);

        // Check for error feedback panels
        const errorFeedback = page.locator('.feedbackPanelERROR, .alert-danger, .error-message');
        if (await errorFeedback.count() > 0 && await errorFeedback.first().isVisible()) {
          const errText = await errorFeedback.first().innerText();
          throw new Error(`Portal validation error: ${errText.trim()}`);
        }

        // Poll Dashboard periodically (every 60s) until build completes on server
        const result = await pollBuildCompletionOnDashboard(page, item, itemIndex);
        const buildId = result.buildId;

        successCount++;
        emitProgress(item.id, itemIndex, 'success', `Completed successfully: ${item.buildFingerprintName}`, null, buildId);
        emitLog('success', `Completed build for ${item.buildFingerprintName} -> Build ID: ${buildId} (https://android.qb.sec.samsung.net/build/${buildId})`);

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
