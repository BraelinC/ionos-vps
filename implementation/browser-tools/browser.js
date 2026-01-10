/**
 * Persistent Browser - Single process that stays running
 *
 * Usage:
 *   node browser.js                    # Start browser
 *   node browser.js goto <url>         # Navigate
 *   node browser.js click <x>,<y>      # Click
 *   node browser.js type <text>        # Type
 *   node browser.js press <key>        # Press key
 *   node browser.js shot [label]       # Screenshot
 *   node browser.js stop               # Stop browser
 */

const { firefox } = require('playwright');
const fs = require('fs');
const net = require('net');

const SOCKET_PATH = '/tmp/browser_automation.sock';
const SHOT_DIR = process.cwd();

let browser = null;
let page = null;
let shotCount = 0;

async function handleCommand(cmd) {
    const parts = cmd.trim().split(/\s+/);
    const action = parts[0];
    const arg = parts.slice(1).join(' ');

    switch (action) {
        case 'goto':
            await page.goto(arg, { waitUntil: 'networkidle', timeout: 30000 });
            return `Navigated to: ${page.url()}`;

        case 'click':
            const [x, y] = arg.split(',').map(Number);
            await page.mouse.click(x, y);
            await page.waitForTimeout(200);
            return `Clicked (${x}, ${y})`;

        case 'type':
            await page.keyboard.type(arg);
            return `Typed: "${arg}"`;

        case 'press':
            await page.keyboard.press(arg);
            await page.waitForTimeout(200);
            return `Pressed: ${arg}`;

        case 'shot':
            const label = arg || 'shot';
            const filename = `${SHOT_DIR}/shot_${shotCount}_${label}.png`;
            await page.screenshot({ path: filename });
            shotCount++;
            return `Screenshot: shot_${shotCount - 1}_${label}.png`;

        case 'url':
            return `URL: ${page.url()}`;

        case 'stop':
            return 'STOP';

        default:
            return `Unknown: ${action}`;
    }
}

async function startServer() {
    // Clean up old socket
    if (fs.existsSync(SOCKET_PATH)) {
        fs.unlinkSync(SOCKET_PATH);
    }

    console.log('Starting browser...');
    browser = await firefox.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    page = await context.newPage();
    console.log('Browser ready.');

    const server = net.createServer((socket) => {
        socket.on('data', async (data) => {
            const cmd = data.toString().trim();
            try {
                const result = await handleCommand(cmd);
                if (result === 'STOP') {
                    socket.write('Stopping browser...\n');
                    socket.end();
                    await browser.close();
                    server.close();
                    fs.unlinkSync(SOCKET_PATH);
                    process.exit(0);
                }
                socket.write(result + '\n');
            } catch (err) {
                socket.write(`Error: ${err.message}\n`);
            }
            socket.end();
        });
    });

    server.listen(SOCKET_PATH, () => {
        console.log(`Listening on ${SOCKET_PATH}`);
        console.log('Send commands with: node browser.js <command>');
    });

    process.on('SIGINT', async () => {
        console.log('\nShutting down...');
        await browser.close();
        server.close();
        if (fs.existsSync(SOCKET_PATH)) fs.unlinkSync(SOCKET_PATH);
        process.exit(0);
    });
}

async function sendCommand(cmd) {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection(SOCKET_PATH, () => {
            socket.write(cmd);
        });

        let response = '';
        socket.on('data', (data) => {
            response += data.toString();
        });

        socket.on('end', () => {
            resolve(response.trim());
        });

        socket.on('error', (err) => {
            reject(new Error('Browser not running. Start with: node browser.js'));
        });
    });
}

// Main
(async () => {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // Start server
        await startServer();
    } else {
        // Send command
        const cmd = args.join(' ');
        try {
            const result = await sendCommand(cmd);
            console.log(result);
        } catch (err) {
            console.error(err.message);
            process.exit(1);
        }
    }
})();
