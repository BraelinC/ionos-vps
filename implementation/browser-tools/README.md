# Browser Automation Tools

Playwright-based browser automation tools for headless Firefox control.

## Setup

```bash
cd ~/browser-automation
npm init -y
npm install playwright
npx playwright install firefox
```

## Tools

### browser.js - Persistent Browser Control

Single script for all browser operations with persistent state.

```bash
# Start browser server (run in background)
node browser.js &

# Commands (while server is running)
node browser.js goto https://example.com
node browser.js click 500,300
node browser.js type "hello world"
node browser.js press Enter
node browser.js shot my_screenshot
node browser.js url
node browser.js stop
```

### dom_screenshot.js - DOM Change Detection

Stateless tool that captures DOM mutations (good for debugging).

```bash
# Navigate only
node dom_screenshot.js https://example.com

# With action
node dom_screenshot.js https://example.com click 500,300
node dom_screenshot.js https://example.com type "hello"
node dom_screenshot.js https://example.com press Enter
node dom_screenshot.js https://example.com scroll 500

# Sequence of actions
node dom_screenshot.js https://example.com sequence "click,500,300|type,hello|press,Enter"
```

Outputs:
- `shot_0.png`, `shot_1.png`, ... (screenshots on DOM changes)
- `changes.json` (mutation timeline)

### login_vercel.js - Vercel Login

```bash
# Step 1: Enter email (sends verification code)
node login_vercel.js your@email.com

# Step 2: Enter code from email
node login_vercel.js your@email.com 123456
```

Outputs:
- Screenshots at each step
- `vercel_cookies.json` (for session reuse)

## Architecture

```
Bash → Node.js → Playwright → Firefox (headless)
```

- **Node.js**: JavaScript runtime
- **Playwright**: Browser automation library
- **Firefox**: Browser engine (headless mode)

## Coordinate System

```
(0,0) ────────────────────► X (1280)
  │
  │    ┌──────────────────┐
  │    │  Viewport        │
  │    │  1280 x 720      │
  │    │     (640,360)    │
  │    │        ●         │
  │    └──────────────────┘
  ▼
  Y (720)
```

## Tips

- Use DuckDuckGo instead of Google (no CAPTCHA on datacenter IPs)
- Click center of elements, not edges
- Take screenshots after actions to verify state
- Use DOM debugging (dom_screenshot.js) for tricky interactions
