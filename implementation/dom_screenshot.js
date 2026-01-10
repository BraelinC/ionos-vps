/**
 * DOM Change Screenshot - Playwright + Firefox
 * With detailed mutation logging for agentic control
 *
 * Outputs:
 *   - shot_0.png to shot_N.png (screenshots)
 *   - changes.json (metadata for each screenshot)
 *   - Console logs of all DOM mutations
 *
 * Usage: node dom_screenshot.js <url> [action] [actionArg]
 */

const { firefox } = require('playwright');
const fs = require('fs');

const MAX_SCREENSHOTS = 10;
const TIMEOUT_MS = 2000;
const DEBOUNCE_MS = 100;

async function setupMutationObserver(page) {
    await page.evaluate(() => {
        window.__mutations = [];
        window.__mutationCount = 0;
        window.__significantChange = false;

        // Attributes that indicate meaningful UI changes
        const SIGNIFICANT_ATTRS = [
            'aria-expanded', 'aria-hidden', 'aria-selected', 'aria-checked',
            'hidden', 'disabled', 'checked', 'selected', 'open',
            'display', 'visibility', 'src', 'href', 'value'
        ];

        // Skip these trivial style changes
        const TRIVIAL_PATTERNS = [
            'caret-color', 'cursor', 'outline'
        ];

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                const target = m.target;
                const selector = target.id
                    ? `#${target.id}`
                    : target.className
                        ? `.${target.className.toString().split(' ')[0]}`
                        : target.tagName?.toLowerCase() || 'unknown';

                let detail = {
                    type: m.type,
                    target: selector,
                    timestamp: Date.now(),
                    significant: false
                };

                if (m.type === 'childList') {
                    // Elements added/removed = SIGNIFICANT
                    if (m.addedNodes.length > 0) {
                        const added = Array.from(m.addedNodes)
                            .filter(n => n.nodeType === 1)
                            .map(n => n.tagName?.toLowerCase() || 'text')
                            .slice(0, 3);
                        if (added.length) {
                            detail.added = added;
                            detail.significant = true;
                        }
                    }
                    if (m.removedNodes.length > 0) {
                        const removed = Array.from(m.removedNodes)
                            .filter(n => n.nodeType === 1)
                            .map(n => n.tagName?.toLowerCase() || 'text')
                            .slice(0, 3);
                        if (removed.length) {
                            detail.removed = removed;
                            detail.significant = true;
                        }
                    }
                } else if (m.type === 'attributes') {
                    detail.attribute = m.attributeName;
                    detail.newValue = target.getAttribute?.(m.attributeName)?.slice(0, 50);

                    // Check if significant attribute
                    if (SIGNIFICANT_ATTRS.includes(m.attributeName)) {
                        detail.significant = true;
                    }
                    // Check if trivial style change
                    if (m.attributeName === 'style') {
                        const val = detail.newValue || '';
                        if (TRIVIAL_PATTERNS.some(p => val.includes(p))) {
                            detail.significant = false;
                        } else if (val.includes('display') || val.includes('visibility')) {
                            detail.significant = true;
                        }
                    }
                } else if (m.type === 'characterData') {
                    detail.text = m.target.textContent?.slice(0, 50);
                    detail.significant = true; // Text changes are significant
                }

                window.__mutations.push(detail);
                window.__mutationCount++;

                // Only mark significant if:
                // 1. Elements added/removed (childList with actual elements)
                // 2. Text content changed
                // Skip single attribute toggles (like .csi display)
                if (detail.added || detail.removed || detail.text) {
                    window.__significantChange = true;
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        });
    });
}

async function getMutations(page) {
    return await page.evaluate(() => {
        const mutations = window.__mutations || [];
        window.__mutations = [];
        return mutations;
    });
}

async function captureWithLogging(page, outputDir = '.') {
    const results = {
        screenshots: [],
        totalMutations: 0,
        significantMutations: 0,
        timeline: []
    };

    // Initial screenshot
    const initialPath = `${outputDir}/shot_0.png`;
    await page.screenshot({ path: initialPath });

    const initialEntry = {
        file: 'shot_0.png',
        time_ms: 0,
        type: 'initial',
        mutations: []
    };
    results.screenshots.push(initialPath);
    results.timeline.push(initialEntry);

    console.log(`\n[0ms] shot_0.png (initial state)`);

    const startTime = Date.now();
    let count = 1;

    while (Date.now() - startTime < TIMEOUT_MS && count < MAX_SCREENSHOTS) {
        await page.waitForTimeout(DEBOUNCE_MS);

        // Only screenshot if SIGNIFICANT change happened
        const hasSignificant = await page.evaluate(() => {
            const sig = window.__significantChange;
            window.__significantChange = false;
            return sig;
        });

        if (hasSignificant) {
            const elapsed = Date.now() - startTime;
            const mutations = await getMutations(page);

            const path = `${outputDir}/shot_${count}.png`;
            await page.screenshot({ path: path });

            // Filter to significant mutations for logging
            const significant = mutations.filter(m => m.significant);
            const trivial = mutations.length - significant.length;

            console.log(`\n[${elapsed}ms] shot_${count}.png (${significant.length} significant, ${trivial} trivial):`);
            significant.forEach(m => {
                let desc = `  ★ ${m.type}: ${m.target}`;
                if (m.added) desc += ` +[${m.added.join(', ')}]`;
                if (m.removed) desc += ` -[${m.removed.join(', ')}]`;
                if (m.attribute) desc += ` @${m.attribute}="${m.newValue || ''}"`;
                if (m.text) desc += ` "${m.text}"`;
                console.log(desc);
            });

            const entry = {
                file: `shot_${count}.png`,
                time_ms: elapsed,
                type: 'significant_change',
                significantCount: significant.length,
                trivialCount: trivial,
                mutations: significant  // Only save significant ones
            };

            results.screenshots.push(path);
            results.timeline.push(entry);
            results.totalMutations += mutations.length;
            results.significantMutations += significant.length;

            count++;
        }
    }

    return results;
}

async function run() {
    const url = process.argv[2] || 'https://example.com';
    const action = process.argv[3];
    const actionArg = process.argv[4];

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Browser Agent - DOM Change Capture`);
    console.log(`${'='.repeat(50)}`);
    console.log(`URL: ${url}`);
    console.log(`Action: ${action || 'navigate only'}`);
    console.log(`Max: ${MAX_SCREENSHOTS} screenshots / ${TIMEOUT_MS}ms`);

    const browser = await firefox.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate
    console.log(`\n> Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Setup observer AFTER initial load
    await setupMutationObserver(page);

    // Perform action
    if (action === 'click' && actionArg) {
        const [x, y] = actionArg.split(',').map(Number);
        console.log(`> Clicking at (${x}, ${y})...`);
        await page.mouse.click(x, y);
    } else if (action === 'type' && actionArg) {
        console.log(`> Typing: "${actionArg}"...`);
        await page.keyboard.type(actionArg);
    } else if (action === 'scroll') {
        const amount = parseInt(actionArg) || 500;
        console.log(`> Scrolling ${amount}px...`);
        await page.mouse.wheel(0, amount);
    } else if (action === 'press' && actionArg) {
        console.log(`> Pressing key: ${actionArg}...`);
        await page.keyboard.press(actionArg);
    }

    // Capture screenshots on DOM changes
    console.log(`\n> Monitoring DOM changes...`);
    const results = await captureWithLogging(page, '.');

    await browser.close();

    // Save metadata
    fs.writeFileSync('changes.json', JSON.stringify(results, null, 2));

    console.log(`\n${'='.repeat(50)}`);
    console.log(`SUMMARY`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Screenshots: ${results.screenshots.length}`);
    console.log(`Total DOM mutations: ${results.totalMutations}`);
    console.log(`Files: shot_0.png - shot_${results.screenshots.length - 1}.png`);
    console.log(`Metadata: changes.json`);
    console.log(`${'='.repeat(50)}\n`);

    return results;
}

run().catch(console.error);
