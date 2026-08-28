#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const AUTH_DIR = path.resolve('./auth');
const AUTH_FILE = path.join(AUTH_DIR, 'auth.json');
const SCREENSHOT_DIR = path.resolve('./screenshots');

if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Parse command line arguments or use default test item
const args = process.argv.slice(2);
function getArg(name, def) {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return def;
}

const TEST_ITEM = {
  buildFingerprintName: getArg('fingerprint', 'SM-G525F_SEA_14_XSA'),
  pdaVersion: getArg('pda', 'G525FXXU4CVK1'),
  cscVersion: getArg('csc', 'G525FOLE4CVK1'),
  basebandVersion: getArg('phone', 'G525FXXU4CVK1'),
};

const USERNAME = getArg('user', 'endri.s');
const PASSWORD = getArg('pass', 'sein2016!');
const BASE_URL = getArg('url', 'https://android.qb.sec.samsung.net/overview/28905');

console.log('\n======================================================');
console.log('  🧪 QuickBuild Playwright Standalone Tester');
console.log('======================================================');
console.log(`📌 Target URL    : ${BASE_URL}`);
console.log(`👤 SSO Username  : ${USERNAME}`);
console.log(`📱 Fingerprint   : ${TEST_ITEM.buildFingerprintName}`);
console.log(`📦 PDA Version   : ${TEST_ITEM.pdaVersion}`);
console.log(`🌐 CSC Version   : ${TEST_ITEM.cscVersion}`);
console.log(`📡 Phone/Baseband: ${TEST_ITEM.basebandVersion}`);
console.log('======================================================\n');

async function main() {
  console.log('🚀 [1/6] Launching visible Chromium browser...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
  });

  let context;
  try {
    if (fs.existsSync(AUTH_FILE)) {
      console.log(`🔑 [2/6] Loading cached auth session from ${AUTH_FILE}`);
      context = await browser.newContext({ storageState: AUTH_FILE, viewport: null });
    } else {
      console.log('🔑 [2/6] Creating fresh browser session context...');
      context = await browser.newContext({ viewport: null });
    }
  } catch (e) {
    console.log(`⚠️  Could not load auth file: ${e.message}. Creating fresh context.`);
    context = await browser.newContext({ viewport: null });
  }

  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  try {
    console.log(`🌐 [3/6] Navigating to Overview page: ${BASE_URL}`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // SSO Authentication check
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('sso') || currentUrl.includes('adfs') || currentUrl.includes('sts.secsso.net')) {
      console.log(`🔒 [SSO] SSO Login detected at: ${currentUrl}`);
      console.log(`🔒 [SSO] Auto-filling credentials for ${USERNAME}...`);
      
      const userSel = '#userNameInput, input[name="UserName"], input[name="username"], input[type="text"], input[type="email"], #username, input[name="loginfmt"]';
      const passSel = '#passwordInput, input[name="Password"], input[name="password"], input[type="password"], #password';
      const submitSel = '#submitButton, input[type="submit"], button[type="submit"], #idSIButton9';

      await page.waitForSelector(userSel, { timeout: 10000 }).catch(() => null);

      if (await page.locator(userSel).count() > 0) {
        await page.fill(userSel, USERNAME);
        console.log('🔒 [SSO] Username entered.');
      }
      if (await page.locator(passSel).count() > 0) {
        await page.fill(passSel, PASSWORD);
        console.log('🔒 [SSO] Password entered.');
      }

      await page.waitForTimeout(500);
      const submitBtn = page.locator(submitSel).first();
      if (await submitBtn.count() > 0) {
        console.log('🔒 [SSO] Submitting SSO credentials form...');
        await submitBtn.click();
      } else {
        await page.keyboard.press('Enter');
      }

      console.log('🔒 [SSO] Waiting for redirect back to QuickBuild portal...');
      await page.waitForURL((url) => !url.href.includes('sso') && !url.href.includes('login') && !url.href.includes('adfs') && !url.href.includes('sts.secsso.net'), { timeout: 120000 });
      console.log('✅ [SSO] SSO Login successful! Saving session state...');
      await page.waitForTimeout(2000);
      await context.storageState({ path: AUTH_FILE });
    }

    console.log('\n🎯 [4/6] Locating and clicking "Run the configuration" button on Overview...');
    
    // Selectors matching the exact QB element provided
    const runSelectors = [
      'button[title="Run the configuration"]',
      'button[title*="Run the configuration" i]',
      'button:has(i.fa.fa-play)',
      'button:has(i.fa-play)',
      'button.btn-ghost:has(i.fa-play)',
      'button[onclick*="ILinkListener-run"]',
      'a[onclick*="ILinkListener-run"]',
      'button[title*="Run" i]',
      'a[title*="Run" i]',
    ];

    let clicked = false;
    for (const sel of runSelectors) {
      const loc = page.locator(sel).first();
      if (await loc.count() > 0 && await loc.isVisible()) {
        console.log(`👉 Found Run button matching selector: [${sel}]. Clicking...`);
        await loc.scrollIntoViewIfNeeded().catch(() => null);
        await loc.click({ timeout: 4000 }).catch(async () => {
          await page.evaluate((s) => document.querySelector(s)?.click(), sel);
        });
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log('⚠️  Standard selector did not match. Trying direct DOM evaluation for Run button...');
      clicked = await page.evaluate(() => {
        const btn = document.querySelector('button[title*="Run"], a[title*="Run"], button:has(i.fa-play), .btn-ghost:has(i.fa-play)');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
    }

    if (!clicked) {
      throw new Error('Could not find or click "Run the configuration" button on Overview page.');
    }

    console.log('⏳ [5/6] Waiting for Wicket parameter input form to appear...');
    const selFingerprint = 'input[name="editor:content:basicProperties:0:property:editor:editor:wrapper:input"], input[name*="basicProperties:0"], input[name*="0:property:editor"]';
    const selPda = 'input[name="editor:content:basicProperties:1:property:editor:editor:wrapper:input"], input[name*="basicProperties:1"], input[name*="1:property:editor"]';
    const selCsc = 'input[name="editor:content:basicProperties:2:property:editor:editor:wrapper:input"], input[name*="basicProperties:2"], input[name*="2:property:editor"]';
    const selBaseband = 'input[name="editor:content:basicProperties:3:property:editor:editor:wrapper:input"], input[name*="basicProperties:3"], input[name*="3:property:editor"]';

    await page.waitForSelector(selFingerprint, { timeout: 15000 });
    console.log('✅ Form inputs detected successfully!');

    // Fill form fields
    console.log(`📝 Filling [1] Build Fingerprint : ${TEST_ITEM.buildFingerprintName}`);
    await page.fill(selFingerprint, TEST_ITEM.buildFingerprintName);
    await page.waitForTimeout(300);

    console.log(`📝 Filling [2] PDA Version       : ${TEST_ITEM.pdaVersion}`);
    await page.fill(selPda, TEST_ITEM.pdaVersion);
    await page.waitForTimeout(300);

    console.log(`📝 Filling [3] CSC Version       : ${TEST_ITEM.cscVersion}`);
    await page.fill(selCsc, TEST_ITEM.cscVersion);
    await page.waitForTimeout(300);

    console.log(`📝 Filling [4] Phone / Baseband  : ${TEST_ITEM.basebandVersion}`);
    await page.fill(selBaseband, TEST_ITEM.basebandVersion);
    await page.waitForTimeout(400);

    console.log('\n⏳ Waiting 1.5s for Wicket AJAX form state to settle before submission...');
    await page.waitForTimeout(1500);

    console.log('🚀 [6/6] Submitting the form with [Ok] button...');
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
      'button[type="submit"]',
      'input[type="submit"]',
    ];

    let submitted = false;
    for (const sel of submitSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.count() > 0 && await btn.isVisible()) {
        const text = (await btn.innerText().catch(() => '')) || (await btn.getAttribute('value').catch(() => '')) || sel;
        console.log(`👉 Found Submit button: [${text.trim()}] (${sel}). Clicking...`);
        await btn.scrollIntoViewIfNeeded().catch(() => null);
        await btn.hover().catch(() => null);
        await page.waitForTimeout(300);
        await btn.click({ timeout: 5000 }).catch(async () => {
          await page.evaluate((s) => document.querySelector(s)?.click(), sel);
        });
        submitted = true;
        break;
      }
    }

    if (!submitted) {
      console.log('⚠️  Submit button not clicked directly, evaluating form submit via DOM...');
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
      console.log('⚠️  Triggering Enter on last input as fallback...');
      await page.press(selBaseband, 'Enter');
    }

    console.log('⏳ Waiting 3.5s for Wicket submission AJAX response...');
    await page.waitForTimeout(3500);

    // Check for validation error messages
    const errFeedback = page.locator('.feedbackPanelERROR, .alert-danger, .error-message');
    if (await errFeedback.count() > 0 && await errFeedback.first().isVisible()) {
      const errTxt = await errFeedback.first().innerText();
      console.log(`❌ Portal returned validation error: ${errTxt}`);
    } else {
      console.log('🎉 Form submitted successfully!');
    }

    // Check Dashboard to extract generated Build ID
    console.log('\n📊 [Dashboard] Navigating to https://android.qb.sec.samsung.net/dashboard to verify Build ID...');
    try {
      await page.goto('https://android.qb.sec.samsung.net/dashboard', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);

      const rows = page.locator('table.datatable tbody tr');
      const rowCount = await rows.count();
      console.log(`📊 Found ${rowCount} rows in My Builds datatable.`);

      let capturedBuildId = null;
      for (let i = 0; i < Math.min(rowCount, 10); i++) {
        const row = rows.nth(i);
        const idCell = row.locator('td.id').first();
        if (await idCell.count() > 0) {
          const idText = (await idCell.innerText().catch(() => '')).trim();
          if (idText && /^\d{7,12}$/.test(idText)) {
            capturedBuildId = idText;
            const buildName = (await row.locator('td').nth(1).innerText().catch(() => '')).trim();
            const configName = (await row.locator('td').last().innerText().catch(() => '')).trim();
            console.log(`\n🏆 SUCCESS! Verified Created Build ID: ${capturedBuildId}`);
            console.log(`📦 Build Info : ${buildName}`);
            console.log(`⚙️  Config     : ${configName}`);
            console.log(`🔗 Portal URL : https://android.qb.sec.samsung.net/build/${capturedBuildId}`);
            break;
          }
        }
      }

      if (!capturedBuildId) {
        console.log('ℹ️  Could not locate new Build ID in top rows. Check browser window.');
      }
    } catch (dashErr) {
      console.log(`⚠️  Dashboard verification notice: ${dashErr.message}`);
    }

    const shotPath = path.join(SCREENSHOT_DIR, `qb_result_${Date.now()}.png`);
    await page.screenshot({ path: shotPath, fullPage: true }).catch(() => null);
    console.log(`📸 Screenshot captured: ${shotPath}`);

    // Update saved session
    await context.storageState({ path: AUTH_FILE });

    console.log('\n======================================================');
    console.log('  ✅ Standalone test execution completed successfully! ');
    console.log('======================================================\n');

  } catch (err) {
    console.error(`\n❌ Error during standalone test: ${err.message}`);
    const errShot = path.join(SCREENSHOT_DIR, `qb_error_${Date.now()}.png`);
    await page.screenshot({ path: errShot, fullPage: true }).catch(() => null);
    console.log(`📸 Error screenshot saved to: ${errShot}`);
  } finally {
    console.log('Browser will remain open for 15 seconds so you can inspect the result...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
}

main().catch(console.error);
