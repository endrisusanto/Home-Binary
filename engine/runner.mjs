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
  try {
    process.stdout.write(JSON.stringify(payload) + '\n');
  } catch {}
}

function emitProgress(id, index, status, message, error = null, buildId = null, progressPercent = null, pdaVersion = null, cscVersion = null) {
  const payload = {
    type: 'progress',
    id: id || '',
    index: typeof index === 'number' ? index : 0,
    buildId: buildId ? String(buildId) : null,
    build_id: buildId ? String(buildId) : null,
    pdaVersion: pdaVersion || null,
    cscVersion: cscVersion || null,
    status,
    progressPercent,
    message,
    error,
    timestamp: new Date().toLocaleTimeString()
  };
  try {
    process.stdout.write(JSON.stringify(payload) + '\n');
  } catch {}
}

function emitDone(total, successCount, failedCount) {
  const payload = {
    type: 'done',
    total,
    successCount,
    failedCount,
    timestamp: new Date().toLocaleTimeString()
  };
  try {
    process.stdout.write(JSON.stringify(payload) + '\n');
  } catch {}
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
    emitLog('info', `Filling inputs for ${item.buildFingerprintName} (PDA: ${item.pdaVersion}, CSC: ${item.cscVersion}, Phone: ${item.basebandVersion || '[EMPTY - Wi-Fi]'})`);
    
    await new Promise((r) => setTimeout(r, Math.max(delayMs / 2, 400)));
    
    const shouldFail = item.buildFingerprintName.toUpperCase().includes('FAIL');
    if (shouldFail) {
      failedCount++;
      emitProgress(item.id, item.index ?? i, 'failed', `Simulated failure for ${item.buildFingerprintName}`, 'Validation error: invalid fingerprint format');
      emitLog('error', `Submission failed for item ${item.buildFingerprintName}`);
    } else {
      successCount++;
      const buildId = item.buildId || `11400${1500 + i}`;
      emitProgress(item.id, item.index ?? i, 'success', `Successfully submitted ${item.buildFingerprintName}`, null, buildId, 100);
      emitLog('success', `Form submitted & confirmed for ${item.buildFingerprintName} -> Build ID: ${buildId}`);
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

    await page.waitForTimeout(1000);

    // Click the QuickBuild "Run the configuration" button to launch the parameter form
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

    await page.waitForTimeout(1200);
  }

  // Final wait attempt for inputs in case already present
  await page.waitForSelector(selFingerprint, { timeout: 12000 });
  return { selFingerprint, selPda, selCsc, selBaseband };
}

async function triggerFormSubmission(page, selBaseband, delayMs = 1000) {
  // Settle delay for AJAX validation
  const settleDelay = Math.max(delayMs, 1200);
  emitLog('info', `Waiting ${settleDelay}ms for Wicket form state to settle...`);
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
        await page.waitForTimeout(200);
        
        await btn.click({ timeout: 4000 }).catch(async () => {
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

  // Wait for submission request to dispatch
  const postSubmitWait = Math.max(delayMs * 1.5, 2000);
  await page.waitForTimeout(postSubmitWait);
}

// --------------------------------------------------------------------------
// PHASE 2: BATCH PROGRESS POLLING ON DASHBOARD
// --------------------------------------------------------------------------
async function trackBatchProgressOnDashboard(page, items, maxWaitMs = 1800000, isFetchOnly = false) {
  const dashboardUrl = 'https://android.qb.sec.samsung.net/dashboard';
  emitLog('info', `Navigating to Dashboard (${dashboardUrl}) to track build progress for all ${items.length} builds...`);

  const pollIntervalMs = 60000; // 1 minute per cycle
  const startTime = Date.now();
  const completedMap = new Map(); // itemId -> { success: boolean, buildId: string, error?: string }

  while (Date.now() - startTime < maxWaitMs) {
    try {
      emitLog('info', `Inspecting Dashboard build queue (Checking status of active builds)...`);
      await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Wait for Wicket AJAX to populate My Builds gadget
      emitLog('info', 'Waiting for My Builds dashboard gadget to render...');
      await page.waitForSelector('table.datatable, .summary table, a[href*="/build/"], a[title="More"]', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Expand "My Builds" gadget by clicking "More" link if available
      try {
        const moreLink = page.locator('a[title="More"], a:text-is("More"), a[href*="myBuildsContainer-more"]');
        if (await moreLink.count() > 0 && await moreLink.first().isVisible()) {
          emitLog('info', 'Found "More" button. Expanding My Builds rows...');
          try {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {}),
              moreLink.first().click({ timeout: 5000 }).catch(() => {}),
            ]);
          } catch {}
          await page.waitForSelector('table.datatable, .summary table, a[href*="/build/"]', { timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(1500);
        }
      } catch (clickErr) {
        emitLog('warn', `Click "More" notice: ${clickErr.message}`);
      }

      // Fast native browser DOM evaluation to extract all build entries directly
      const tableData = await page.evaluate(() => {
        const buildLinks = Array.from(document.querySelectorAll('a[href*="/build/"]'));
        const results = [];
        const seenIds = new Set();

        for (const link of buildLinks) {
          const href = link.getAttribute('href') || '';
          const m = href.match(/\/build\/(\d+)/);
          if (!m) continue;
          const idText = m[1];
          if (seenIds.has(idText)) continue;
          seenIds.add(idText);

          const tr = link.closest('tr');
          const fullRowText = tr ? tr.innerText.trim() : link.innerText.trim();
          const trHtml = tr ? tr.innerHTML.toLowerCase() : '';
          const buildInfoText = link.innerText.trim();

          const stepLink = tr ? tr.querySelector('a[href*="step_status"], a[href*="overview"]') : null;
          const stepText = stepLink ? stepLink.innerText.trim() : '';

          const durationEl = tr ? tr.querySelector('td:nth-child(4), td.id:nth-child(4)') : null;
          const durationText = durationEl ? durationEl.innerText.trim() : '';

          const isFailed = 
            trHtml.includes('build is failed') || 
            trHtml.includes('text-danger') || 
            trHtml.includes('octicon-x-circle-fill') || 
            link.classList.contains('failed') || 
            (tr && tr.classList.contains('failed')) || 
            stepText.toLowerCase().includes('failed') || 
            fullRowText.toLowerCase().includes('failed') || 
            fullRowText.toLowerCase().includes('cancelled');

          const isSuccessful = !isFailed && (
            link.classList.contains('successful') || 
            trHtml.includes('build is successful') || 
            trHtml.includes('text-success') || 
            trHtml.includes('octicon-check-circle-fill') || 
            (tr && tr.classList.contains('successful')) ||
            fullRowText.toLowerCase().includes('completed')
          );

          const isRunning = !isFailed && !isSuccessful && (
            stepText.includes('MAKE_HOME_BINARY') || 
            fullRowText.includes('MAKE_HOME_BINARY') ||
            link.classList.contains('running') || 
            trHtml.includes('build is running') || 
            trHtml.includes('fontawesome-spinner') || 
            trHtml.includes('fa-spin') || 
            trHtml.includes('running')
          );

          // Progress percentage
          let pct = null;
          if (tr) {
            const pctEl = tr.querySelector('.progress-percentage');
            if (pctEl) {
              const p = parseInt(pctEl.innerText.replace('%', '').trim(), 10);
              if (!isNaN(p)) pct = p;
            }
            if (pct === null) {
              const filler = tr.querySelector('.progress-filler');
              if (filler && filler.style && filler.style.width) {
                const p = parseInt(filler.style.width.replace('%', '').trim(), 10);
                if (!isNaN(p)) pct = p;
              }
            }
          }

          results.push({
            idText,
            buildInfoText,
            fullRowText,
            durationText,
            stepText,
            isSuccessful,
            isFailed,
            isRunning,
            progressPercent: pct ?? (isSuccessful ? 100 : (isRunning ? 50 : 20))
          });
        }
        return results;
      });

      emitLog('info', `Found ${tableData.length} build entries on Dashboard.`);

      // Match against active items (picking the latest / topmost build for each item)
      for (const item of items) {
        if (completedMap.has(item.id)) continue;

        // Match by exact ID if previously captured, or by PDA / CSC in row text
        const matched = tableData.find(row => {
          if (item.buildId && row.idText === item.buildId) return true;
          const matchPda = item.pdaVersion && (row.buildInfoText.includes(item.pdaVersion) || row.fullRowText.includes(item.pdaVersion));
          const matchCsc = item.cscVersion && (row.buildInfoText.includes(item.cscVersion) || row.fullRowText.includes(item.cscVersion));
          return matchPda || matchCsc;
        });

        if (matched) {
          item.buildId = matched.idText || item.buildId;

          if (matched.isFailed) {
            completedMap.set(item.id, { success: false, buildId: item.buildId, error: `Build failed on QuickBuild (${matched.durationText || 'Failed'})` });
            emitProgress(item.id, item.index, 'failed', `Build #${item.buildId} failed on QuickBuild`, `Build #${item.buildId} is failed on QuickBuild`, item.buildId, 100, item.pdaVersion, item.cscVersion);
            emitLog('error', `[FAILED] Build #${item.buildId} for ${item.buildFingerprintName} is marked as FAILED on QuickBuild!`);
          } else if (matched.isSuccessful) {
            completedMap.set(item.id, { success: true, buildId: item.buildId });
            emitProgress(item.id, item.index, 'success', `Completed: ${item.buildFingerprintName}`, null, item.buildId, 100, item.pdaVersion, item.cscVersion);
            emitLog('success', `[SUCCESS] Matched Build #${item.buildId} for ${item.buildFingerprintName}! (Duration: ${matched.durationText || 'Finished'})`);
          } else {
            // Still in progress
            const pct = matched.progressPercent || 50;
            emitProgress(
              item.id,
              item.index,
              'running',
              `Build #${item.buildId} running on server (${pct}%, step: ${matched.stepText || 'MAKE_HOME_BINARY'})...`,
              null,
              item.buildId,
              pct,
              item.pdaVersion,
              item.cscVersion
            );
            emitLog('info', `Build #${item.buildId} (${item.buildFingerprintName}) is running (${pct}%, ${matched.durationText || 'running'})...`);
          }
        } else {
          emitProgress(item.id, item.index, 'running', `Build triggered, waiting for Dashboard task...`, null, item.buildId, 25);
        }
      }

      // Check if all items are finished
      if (completedMap.size >= items.length) {
        emitLog('success', `All ${items.length} builds finished processing on QuickBuild!`);
        break;
      }

    } catch (err) {
      emitLog('warn', `Dashboard progress tracking warning: ${err.message}`);
    }

    // If in fetchOnly mode, finish after 1 dashboard inspection cycle
    if (isFetchOnly) {
      break;
    }

    const sleepInterval = 5000;
    const totalIterations = pollIntervalMs / sleepInterval;
    for (let s = 0; s < totalIterations; s++) {
      await new Promise((r) => setTimeout(r, sleepInterval));
    }
  }

  // Any items that were not yet found on dashboard
  for (const item of items) {
    if (!completedMap.has(item.id)) {
      emitLog('info', `Build ID for ${item.buildFingerprintName} is not yet available on Dashboard.`);
    }
  }
}

// --------------------------------------------------------------------------
// MAIN BATCH CONTROLLER
// --------------------------------------------------------------------------
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
  const trackProgress = portal.trackProgress !== false; // Default true, toggleable from toolbar
  const username = portal.username || 'endri.s';
  const password = portal.password || 'sein2016!';
  const useMock = isDryRun || portal.mock === true;

  if (useMock) {
    await runMockSimulation(items, delayMs);
    process.exit(0);
  }

  emitLog('info', `Initializing Playwright browser (Headless: ${headless}, Track Progress: ${trackProgress})...`);
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

    // =========================================================================
    // SPECIAL: FETCH BUILD ID ONLY (HEADLESS DASHBOARD SCRAPE)
    // =========================================================================
    if (portal.fetchOnly === true) {
      emitLog('info', `=== [FETCH BUILD ID ONLY] Querying Dashboard for ${items.length} builds (Headless) ===`);
      try {
        await trackBatchProgressOnDashboard(page, items, 120000, true);
      } catch (fetchErr) {
        emitLog('error', `Fetch Build ID error: ${fetchErr.message}`);
      } finally {
        try {
          await browser.close();
        } catch {}
        emitDone(items.length, items.length, 0);
        process.exit(0);
      }
    }

    // =========================================================================
    // PHASE 1: CONCURRENT FORM SUBMISSION TRIGGER FOR ALL BATCH ITEMS
    // =========================================================================
    const concurrency = Math.max(1, Math.min(Number(portal.concurrency) || 3, 8));
    emitLog('info', `=== [PHASE 1] Triggering form submissions for ${items.length} build(s) (Concurrency: ${concurrency} parallel tabs) ===`);

    async function submitSingleItem(item, i) {
      if (isCancelled) return;
      const itemIndex = item.index ?? i;
      emitProgress(item.id, itemIndex, 'running', `Triggering submission: ${item.buildFingerprintName}`, null, null, 25);
      emitLog('info', `[Tab #${(i % concurrency) + 1}] Starting parallel submission: ${item.buildFingerprintName}`);

      let itemPage = null;
      try {
        itemPage = await context.newPage();
        itemPage.setDefaultTimeout(timeoutMs);

        const { selFingerprint, selPda, selCsc, selBaseband } = await navigateAndLocateForm(itemPage, baseUrl, timeoutMs);

        // Fill all 4 input fields with deliberate entry
        emitProgress(item.id, itemIndex, 'running', `Populating form fields...`, null, null, 40);
        await itemPage.fill(selFingerprint, item.buildFingerprintName || '');
        await itemPage.waitForTimeout(150);

        await itemPage.fill(selPda, item.pdaVersion || '');
        await itemPage.waitForTimeout(150);

        await itemPage.fill(selCsc, item.cscVersion || '');
        await itemPage.waitForTimeout(150);

        // Clean Baseband: Empty string if model is Wi-Fi only / dash value
        const rawBaseband = (item.basebandVersion || '').trim();
        const isNoBaseband = !rawBaseband || rawBaseband === '-' || rawBaseband === '—' || rawBaseband.toLowerCase() === 'none' || rawBaseband.toLowerCase() === 'n/a';
        const cleanBaseband = isNoBaseband ? '' : rawBaseband;

        await itemPage.fill(selBaseband, cleanBaseband);
        await itemPage.waitForTimeout(200);

        emitLog('info', `[Tab #${(i % concurrency) + 1}] Populated: Fingerprint=${item.buildFingerprintName}, PDA=${item.pdaVersion}, CSC=${item.cscVersion}, Phone=${cleanBaseband || '[EMPTY - Wi-Fi Only]'}`);

        // Trigger Submit with .submits button:has-text("Ok")
        emitProgress(item.id, itemIndex, 'running', `Submitting form...`, null, null, 75);
        await triggerFormSubmission(itemPage, selBaseband, delayMs);

        // Check for error feedback panels
        const errorFeedback = itemPage.locator('.feedbackPanelERROR, .alert-danger, .error-message');
        if (await errorFeedback.count() > 0 && await errorFeedback.first().isVisible()) {
          const errText = await errorFeedback.first().innerText();
          throw new Error(`Portal validation error: ${errText.trim()}`);
        }

        emitLog('success', `[Tab #${(i % concurrency) + 1}] Form triggered successfully for ${item.buildFingerprintName}!`);
        successCount++;
        emitProgress(item.id, itemIndex, 'success', `Form submitted: ${item.buildFingerprintName}`, null, item.buildId || null, 100);

      } catch (itemErr) {
        failedCount++;
        emitProgress(item.id, itemIndex, 'failed', `Error: ${itemErr.message}`, itemErr.message);
        emitLog('error', `Failed submitting form for ${item.buildFingerprintName}: ${itemErr.message}`);
      } finally {
        if (itemPage) {
          try {
            await itemPage.close();
          } catch {}
        }
      }
    }

    // Run concurrent worker pool with staggered start for smooth streaming UI
    let currentIndex = 0;
    const workerCount = Math.min(concurrency, items.length);
    const workerPromises = Array.from({ length: workerCount }, async (_, workerIdx) => {
      if (workerIdx > 0) {
        await new Promise(r => setTimeout(r, workerIdx * 300));
      }
      while (currentIndex < items.length && !isCancelled) {
        const itemIdx = currentIndex++;
        await submitSingleItem(items[itemIdx], itemIdx);
        if (delayMs > 0 && currentIndex < items.length) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
    });

    await Promise.all(workerPromises);

    // =========================================================================
    // PHASE 2: BATCH PROGRESS POLLING ON DASHBOARD
    // =========================================================================
    if (trackProgress && !isCancelled) {
      emitLog('info', `=== [PHASE 2] All forms triggered! Starting Dashboard progress tracking (every 60s) ===`);
      const validItems = items.filter(x => x.status !== 'failed');
      if (validItems.length > 0) {
        await trackBatchProgressOnDashboard(page, validItems, 1800000);
      }
    } else if (!trackProgress) {
      emitLog('info', `=== [FAST COMPLETE] Progress tracking disabled. All batch submissions complete ===`);
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
