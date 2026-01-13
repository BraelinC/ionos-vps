/**
 * Debug Browser - Comprehensive debugging tool for web applications
 *
 * Captures:
 * - Console logs (log, warn, error, info)
 * - JavaScript errors (uncaught exceptions, promise rejections)
 * - Network failures (failed requests, 4xx/5xx responses)
 * - Page state (empty body, empty root, error elements)
 *
 * Usage:
 *   node debug_browser.js <url>
 *   node debug_browser.js http://localhost:5173
 *
 * Output:
 *   - debug_screenshot.png
 *   - debug_results.json
 */

const { firefox } = require('playwright');
const fs = require('fs');

async function debugPage(url, options = {}) {
  const results = {
    url,
    timestamp: new Date().toISOString(),
    console: [],
    errors: [],
    network: { requests: [], failed: [] },
    pageState: {},
    screenshots: []
  };

  console.log('\n' + '='.repeat(60));
  console.log('DEBUG BROWSER - Web Application Debugger');
  console.log('='.repeat(60));
  console.log(`URL: ${url}`);
  console.log(`Time: ${results.timestamp}`);
  console.log('');

  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  // 1. CONSOLE CAPTURE
  page.on('console', msg => {
    const entry = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    };
    results.console.push(entry);

    // Print errors immediately
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  // 2. ERROR CAPTURE
  page.on('pageerror', err => {
    const entry = {
      type: 'pageerror',
      message: err.message,
      stack: err.stack
    };
    results.errors.push(entry);
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  // 3. NETWORK MONITORING
  page.on('requestfailed', req => {
    const entry = {
      url: req.url(),
      method: req.method(),
      failure: req.failure()?.errorText
    };
    results.network.failed.push(entry);
    console.log(`[NETWORK FAILED] ${req.method()} ${req.url()} - ${entry.failure}`);
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      const entry = {
        url: res.url(),
        status: res.status(),
        statusText: res.statusText()
      };
      results.network.requests.push(entry);
      console.log(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  // Navigate
  console.log('\n> Navigating...');
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('> Page loaded');
  } catch (err) {
    console.log(`> Navigation error: ${err.message}`);
    results.errors.push({
      type: 'navigation',
      message: err.message
    });
  }

  // Wait for any async rendering
  await page.waitForTimeout(2000);

  // 4. PAGE STATE DETECTION
  console.log('\n> Analyzing page state...');
  results.pageState = await page.evaluate(() => {
    const body = document.body;
    const root = document.getElementById('root');

    return {
      title: document.title,
      url: window.location.href,
      bodyEmpty: !body || body.innerHTML.trim() === '',
      bodyLength: body?.innerHTML?.length || 0,
      bodyText: body?.innerText?.slice(0, 500) || '',
      rootExists: !!root,
      rootEmpty: root ? root.innerHTML.trim() === '' : null,
      rootLength: root?.innerHTML?.length || 0,
      hasErrorClass: !!document.querySelector('[class*="error"]'),
      hasErrorText: body?.innerText?.toLowerCase().includes('error') || false,
      scripts: Array.from(document.scripts).map(s => s.src).filter(Boolean).slice(0, 5),
      stylesheets: Array.from(document.styleSheets).length
    };
  });

  // Screenshot
  const screenshotPath = options.outputDir
    ? `${options.outputDir}/debug_screenshot.png`
    : 'debug_screenshot.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  results.screenshots.push(screenshotPath);
  console.log(`> Screenshot saved: ${screenshotPath}`);

  await browser.close();

  // Save results
  const resultsPath = options.outputDir
    ? `${options.outputDir}/debug_results.json`
    : 'debug_results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`> Results saved: ${resultsPath}`);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('DEBUG SUMMARY');
  console.log('='.repeat(60));
  console.log(`Console messages: ${results.console.length}`);
  console.log(`  - Errors: ${results.console.filter(c => c.type === 'error').length}`);
  console.log(`  - Warnings: ${results.console.filter(c => c.type === 'warning').length}`);
  console.log(`JavaScript errors: ${results.errors.length}`);
  console.log(`Failed network requests: ${results.network.failed.length}`);
  console.log(`HTTP error responses: ${results.network.requests.length}`);
  console.log('');
  console.log('Page State:');
  console.log(`  - Title: "${results.pageState.title}"`);
  console.log(`  - Body empty: ${results.pageState.bodyEmpty}`);
  console.log(`  - Body length: ${results.pageState.bodyLength} chars`);
  console.log(`  - Root exists: ${results.pageState.rootExists}`);
  console.log(`  - Root empty: ${results.pageState.rootEmpty}`);
  console.log(`  - Has error class: ${results.pageState.hasErrorClass}`);
  console.log(`  - Has error text: ${results.pageState.hasErrorText}`);

  // Diagnosis
  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSIS');
  console.log('='.repeat(60));

  const issues = [];

  if (results.errors.length > 0) {
    issues.push('JavaScript errors detected - check debug_results.json for stack traces');
    console.log('\nJavaScript Errors:');
    results.errors.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.message}`);
    });
  }

  if (results.console.filter(c => c.type === 'error').length > 0) {
    issues.push('Console errors detected');
    console.log('\nConsole Errors:');
    results.console.filter(c => c.type === 'error').forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.text.slice(0, 200)}`);
    });
  }

  if (results.pageState.rootEmpty) {
    issues.push('React root element is empty - app failed to render');
  }

  if (results.pageState.bodyEmpty) {
    issues.push('Page body is empty - critical render failure');
  }

  if (results.network.failed.length > 0) {
    issues.push(`${results.network.failed.length} network requests failed`);
  }

  if (issues.length === 0) {
    console.log('\nNo obvious issues detected. Check screenshot for visual inspection.');
  } else {
    console.log(`\nFound ${issues.length} potential issue(s):`);
    issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
  }

  console.log('\n' + '='.repeat(60) + '\n');

  return results;
}

// CLI
const url = process.argv[2] || 'http://localhost:5173';
debugPage(url).catch(err => {
  console.error('Debug failed:', err.message);
  process.exit(1);
});
