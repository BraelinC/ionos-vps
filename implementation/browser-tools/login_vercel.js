/**
 * Vercel Login Script
 *
 * Usage:
 *   node login_vercel.js <email> <verification_code>
 *
 * Example:
 *   node login_vercel.js user@example.com 123456
 *
 * Note: Vercel uses email verification codes, not passwords.
 *       Run without code first, check your email, then run again with code.
 */

const { firefox } = require('playwright');

const VERCEL_LOGIN_URL = 'https://vercel.com/login';

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function loginVercel(email, code) {
    console.log('Starting Vercel login...');

    const browser = await firefox.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    try {
        // Navigate to login
        console.log('1. Navigating to Vercel login...');
        await page.goto(VERCEL_LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
        await page.screenshot({ path: 'vercel_1_login_page.png' });

        // Click email field and type email
        console.log(`2. Entering email: ${email}`);
        await page.click('input[type="email"], input[name="email"], input[placeholder*="Email"]');
        await page.keyboard.type(email);
        await page.screenshot({ path: 'vercel_2_email_entered.png' });

        // Click Continue with Email
        console.log('3. Clicking Continue with Email...');
        await page.click('button:has-text("Continue with Email")');
        await sleep(2000);
        await page.screenshot({ path: 'vercel_3_verification_page.png' });

        // Check if we need to enter code
        const url = page.url();
        if (url.includes('verify') || await page.locator('text=Verification').count() > 0) {
            if (!code) {
                console.log('\n=== VERIFICATION CODE NEEDED ===');
                console.log(`Check your email (${email}) for the 6-digit code.`);
                console.log('Then run again with: node login_vercel.js <email> <code>');
                await browser.close();
                return false;
            }

            // Enter verification code
            console.log(`4. Entering verification code: ${code}`);
            await page.keyboard.type(code);
            await sleep(3000);
            await page.screenshot({ path: 'vercel_4_after_code.png' });
        }

        // Check if logged in
        const finalUrl = page.url();
        if (finalUrl.includes('/dashboard') || finalUrl.includes('/~')) {
            console.log('\n=== LOGIN SUCCESSFUL ===');
            console.log(`Final URL: ${finalUrl}`);
            await page.screenshot({ path: 'vercel_5_dashboard.png' });

            // Save cookies for future use
            const cookies = await context.cookies();
            require('fs').writeFileSync('vercel_cookies.json', JSON.stringify(cookies, null, 2));
            console.log('Cookies saved to: vercel_cookies.json');

            await browser.close();
            return true;
        } else {
            console.log('\n=== LOGIN STATUS UNKNOWN ===');
            console.log(`Current URL: ${finalUrl}`);
            await page.screenshot({ path: 'vercel_final.png' });
        }

    } catch (err) {
        console.error('Error:', err.message);
        await page.screenshot({ path: 'vercel_error.png' });
    }

    await browser.close();
    return false;
}

// Main
const email = process.argv[2];
const code = process.argv[3];

if (!email) {
    console.log('Usage: node login_vercel.js <email> [verification_code]');
    console.log('');
    console.log('Step 1: node login_vercel.js your@email.com');
    console.log('Step 2: Check email for code');
    console.log('Step 3: node login_vercel.js your@email.com 123456');
    process.exit(1);
}

loginVercel(email, code).then(success => {
    process.exit(success ? 0 : 1);
});
