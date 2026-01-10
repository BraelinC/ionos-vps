# Local Browser Automation - Complete Agent System

## Table of Contents

1. [Overview](#overview)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [The Agent Loop](#the-agent-loop)
4. [DOM Change Detection System](#dom-change-detection-system)
5. [Tool Commands Reference](#tool-commands-reference)
6. [Coordinate System & Element Finding](#coordinate-system--element-finding)
7. [Working with Local Dev Servers](#working-with-local-dev-servers)
8. [Project Setup Guide](#project-setup-guide)
9. [Common Scenarios](#common-scenarios)
10. [Decision Trees](#decision-trees)
11. [Debugging & Troubleshooting](#debugging--troubleshooting)
12. [Extending the System](#extending-the-system)
13. [Constraints & Best Practices](#constraints--best-practices)

---

## Overview

A headless browser automation system using **Playwright + Firefox** with **intelligent DOM change detection**. Designed for agentic control where Claude:

1. Takes screenshots to see the page
2. Analyzes visual content and DOM structure
3. Decides what action to take
4. Executes actions (click, type, scroll)
5. Verifies success through DOM mutations
6. Repeats until task is complete

### Why This Architecture?

| Approach | Pros | Cons |
|----------|------|------|
| Selenium/WebDriver | Industry standard | Requires session management, complex setup |
| Puppeteer + Chromium | Fast, good DevTools | Chromium in WSL has rendering issues |
| **Playwright + Firefox** | Reliable headless, cross-platform | Slightly slower than Chrome |
| Cloud sandboxes | Full desktop access | Cost, latency, complexity |

This system optimizes for **reliability** and **simplicity** - each command is stateless, making it resilient to failures.

---

## Architecture Deep Dive

### System Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WINDOWS HOST                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     Claude Code CLI                             │ │
│  │                                                                 │ │
│  │  1. Analyze task requirements                                   │ │
│  │  2. Construct WSL command                                       │ │
│  │  3. Execute via subprocess                                      │ │
│  │  4. Read screenshot files                                       │ │
│  │  5. Parse changes.json                                          │ │
│  │  6. Decide next action                                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              │ wsl -d Ubuntu -- bash -c "..."        │
│                              ▼                                       │
├─────────────────────────────────────────────────────────────────────┤
│                         WSL2 UBUNTU                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                  ~/browser-automation/                          │ │
│  │                                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │                 dom_screenshot.js                         │  │ │
│  │  │                                                           │  │ │
│  │  │  1. Launch Firefox (headless)                             │  │ │
│  │  │  2. Navigate to URL                                       │  │ │
│  │  │  3. Inject MutationObserver                               │  │ │
│  │  │  4. Execute action (if specified)                         │  │ │
│  │  │  5. Monitor DOM for 2 seconds                             │  │ │
│  │  │  6. Screenshot on significant changes                     │  │ │
│  │  │  7. Write changes.json                                    │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                              │                                  │ │
│  │                              ▼                                  │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │                    Playwright                             │  │ │
│  │  │                        │                                  │  │ │
│  │  │                        ▼                                  │  │ │
│  │  │  ┌────────────────────────────────────────────────────┐  │  │ │
│  │  │  │              Firefox (Headless)                    │  │  │ │
│  │  │  │                                                    │  │  │ │
│  │  │  │  ┌──────────────────────────────────────────────┐ │  │  │ │
│  │  │  │  │            Target Web Page                   │ │  │  │ │
│  │  │  │  │                                              │ │  │  │ │
│  │  │  │  │  ┌────────────────────────────────────────┐ │ │  │  │ │
│  │  │  │  │  │         MutationObserver               │ │ │  │  │ │
│  │  │  │  │  │                                        │ │ │  │  │ │
│  │  │  │  │  │  Watches: childList, attributes,      │ │ │  │  │ │
│  │  │  │  │  │           characterData               │ │ │  │  │ │
│  │  │  │  │  │                                        │ │ │  │  │ │
│  │  │  │  │  │  Stores: window.__mutations           │ │ │  │  │ │
│  │  │  │  │  │          window.__significantChange   │ │ │  │  │ │
│  │  │  │  │  └────────────────────────────────────────┘ │ │  │  │ │
│  │  │  │  └──────────────────────────────────────────────┘ │  │  │ │
│  │  │  └────────────────────────────────────────────────────┘  │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                                                                 │ │
│  │  Output Files:                                                  │ │
│  │  ├── shot_0.png    (initial state)                              │ │
│  │  ├── shot_1.png    (after significant change)                   │ │
│  │  ├── shot_N.png    (max 10 screenshots)                         │ │
│  │  └── changes.json  (mutation timeline)                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              │ cp to /mnt/c/...                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Windows Filesystem (accessible to Claude)          │ │
│  │                                                                 │ │
│  │  C:\YourProject\shot_0.png                                      │ │
│  │  C:\YourProject\shot_1.png                                      │ │
│  │  C:\YourProject\changes.json                                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Claude constructs command:
   "wsl -d Ubuntu -- bash -c 'source ~/.nvm/nvm.sh && cd ~/browser-automation && node dom_screenshot.js http://example.com click 500,300'"

2. WSL executes dom_screenshot.js:
   - Launches Firefox headless
   - Navigates to http://example.com
   - Waits for networkidle
   - Injects MutationObserver into page
   - Takes shot_0.png (initial state)
   - Executes click at (500, 300)
   - Monitors DOM for 2 seconds
   - On significant change → takes shot_N.png
   - Writes changes.json with mutation log

3. Claude reads outputs:
   - Uses Read tool on shot_N.png (vision)
   - Parses changes.json for DOM verification

4. Claude decides next action based on:
   - Visual analysis of screenshot
   - DOM mutations (did expected changes occur?)
   - Task progress (goal achieved?)
```

---

## The Agent Loop

### Complete Loop Diagram

```
                    ┌─────────────────┐
                    │   START TASK    │
                    └────────┬────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  ┌──────────────┐                                                  │
│  │  1. NAVIGATE │ ◄─────────────────────────────────────────────┐  │
│  └──────┬───────┘                                               │  │
│         │                                                       │  │
│         │  • Execute: node dom_screenshot.js <URL> [action]     │  │
│         │  • Outputs: shot_0.png, changes.json                  │  │
│         │                                                       │  │
│         ▼                                                       │  │
│  ┌──────────────┐                                               │  │
│  │  2. ANALYZE  │                                               │  │
│  └──────┬───────┘                                               │  │
│         │                                                       │  │
│         │  • Read screenshot with vision                        │  │
│         │  • Parse changes.json mutations                       │  │
│         │  • Identify: current state, available actions         │  │
│         │                                                       │  │
│         ▼                                                       │  │
│  ┌──────────────┐                                               │  │
│  │  3. DECIDE   │                                               │  │
│  └──────┬───────┘                                               │  │
│         │                                                       │  │
│         │  Questions:                                           │  │
│         │  • Is the goal achieved? ──────────► YES ──► EXIT     │  │
│         │  • What element to interact with?                     │  │
│         │  • What action type? (click/type/scroll/press)        │  │
│         │  • What coordinates/value?                            │  │
│         │                                                       │  │
│         ▼                                                       │  │
│  ┌──────────────┐                                               │  │
│  │   4. ACT     │                                               │  │
│  └──────┬───────┘                                               │  │
│         │                                                       │  │
│         │  • Construct command with action                      │  │
│         │  • Execute: node dom_screenshot.js <URL> <action>     │  │
│         │  • Captures DOM changes automatically                 │  │
│         │                                                       │  │
│         ▼                                                       │  │
│  ┌──────────────┐                                               │  │
│  │  5. VERIFY   │                                               │  │
│  └──────┬───────┘                                               │  │
│         │                                                       │  │
│         │  Check changes.json:                                  │  │
│         │  • Expected elements added? (childList)               │  │
│         │  • Expected text changed? (characterData)             │  │
│         │  • Expected state changed? (aria-*, display)          │  │
│         │  • Any error states visible?                          │  │
│         │                                                       │  │
│         │  If verification fails:                               │  │
│         │  • Retry with adjusted coordinates                    │  │
│         │  • Try alternative approach                           │  │
│         │  • Report failure to user                             │  │
│         │                                                       │  │
│         └───────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   TASK DONE     │
                    └─────────────────┘
```

### Loop Implementation Pattern

```python
# Pseudocode for the agent loop

def browser_agent_loop(task: str, url: str, max_iterations: int = 10):
    """
    Execute browser automation task using agent loop.
    """

    for iteration in range(max_iterations):

        # 1. NAVIGATE - Execute current action
        if iteration == 0:
            execute_browser_command(url)  # Initial navigation
        else:
            execute_browser_command(url, action, action_arg)

        # 2. ANALYZE - Read outputs
        screenshot = read_screenshot("shot_0.png")  # or latest shot_N.png
        changes = parse_json("changes.json")

        # 3. DECIDE - Determine next action
        analysis = analyze_screenshot_and_changes(screenshot, changes, task)

        if analysis.goal_achieved:
            return Success(analysis.summary)

        if analysis.error_detected:
            return Failure(analysis.error)

        # 4. ACT - Prepare next action
        action = analysis.next_action  # "click", "type", "scroll", "press"
        action_arg = analysis.action_argument  # "500,300", "hello", "500", "Enter"

        # 5. VERIFY happens in next iteration's ANALYZE phase

    return Failure("Max iterations reached")
```

---

## DOM Change Detection System

### How the MutationObserver Works

The `dom_screenshot.js` script injects a MutationObserver into the page after navigation:

```javascript
// Injected into the page via page.evaluate()

// Storage for mutations
window.__mutations = [];
window.__mutationCount = 0;
window.__significantChange = false;

// Attributes that indicate meaningful UI changes
const SIGNIFICANT_ATTRS = [
    'aria-expanded', 'aria-hidden', 'aria-selected', 'aria-checked',
    'hidden', 'disabled', 'checked', 'selected', 'open',
    'display', 'visibility', 'src', 'href', 'value'
];

// Trivial changes to ignore
const TRIVIAL_PATTERNS = [
    'caret-color',  // Cursor blink
    'cursor',       // Cursor style
    'outline'       // Focus outline
];

const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
        // Build mutation detail object
        let detail = {
            type: m.type,
            target: getSelector(m.target),
            timestamp: Date.now(),
            significant: false
        };

        // Analyze mutation type
        if (m.type === 'childList') {
            // Elements added = SIGNIFICANT
            if (m.addedNodes.length > 0) {
                detail.added = getElementNames(m.addedNodes);
                detail.significant = true;
            }
            // Elements removed = SIGNIFICANT
            if (m.removedNodes.length > 0) {
                detail.removed = getElementNames(m.removedNodes);
                detail.significant = true;
            }
        }
        else if (m.type === 'attributes') {
            detail.attribute = m.attributeName;
            detail.newValue = m.target.getAttribute(m.attributeName);

            // Check if significant attribute
            if (SIGNIFICANT_ATTRS.includes(m.attributeName)) {
                detail.significant = true;
            }
            // Check for trivial style changes
            if (m.attributeName === 'style') {
                if (TRIVIAL_PATTERNS.some(p => detail.newValue?.includes(p))) {
                    detail.significant = false;
                } else if (detail.newValue?.includes('display') ||
                           detail.newValue?.includes('visibility')) {
                    detail.significant = true;
                }
            }
        }
        else if (m.type === 'characterData') {
            // Text content changes = SIGNIFICANT
            detail.text = m.target.textContent?.slice(0, 50);
            detail.significant = true;
        }

        window.__mutations.push(detail);
        window.__mutationCount++;

        // Only flag for screenshot if truly significant
        if (detail.added || detail.removed || detail.text) {
            window.__significantChange = true;
        }
    });
});

// Start observing
observer.observe(document.body, {
    childList: true,      // Watch for added/removed elements
    subtree: true,        // Watch entire DOM tree
    attributes: true,     // Watch attribute changes
    characterData: true   // Watch text content changes
});
```

### Significance Classification

| Mutation Type | Significant? | Triggers Screenshot? | Examples |
|---------------|--------------|---------------------|----------|
| `childList` + elements added | YES | YES | Dropdown opens, search results appear, modal shows |
| `childList` + elements removed | YES | YES | Modal closes, item deleted, content hidden |
| `characterData` (text change) | YES | YES | Input value changes, label updates, counter increments |
| `aria-expanded` change | YES | NO* | Accordion state, dropdown state |
| `aria-selected` change | YES | NO* | Tab selection, list selection |
| `aria-hidden` change | YES | NO* | Visibility toggle |
| `display` style change | YES | NO* | Show/hide via CSS |
| `visibility` style change | YES | NO* | Visibility toggle |
| `caret-color` style | NO | NO | Cursor blink animation |
| `cursor` style | NO | NO | Mouse cursor change |
| `outline` style | NO | NO | Focus ring |
| `class` (animation classes) | DEPENDS | NO | CSS transitions |

*These are logged but don't trigger screenshots alone - they're paired with childList changes

### changes.json Schema

```json
{
  "screenshots": [
    "./shot_0.png",
    "./shot_1.png"
  ],
  "totalMutations": 278,
  "significantMutations": 12,
  "timeline": [
    {
      "file": "shot_0.png",
      "time_ms": 0,
      "type": "initial",
      "mutations": []
    },
    {
      "file": "shot_1.png",
      "time_ms": 105,
      "type": "significant_change",
      "significantCount": 5,
      "trivialCount": 8,
      "mutations": [
        {
          "type": "characterData",
          "target": ".header-title",
          "text": "Week of Jan 9",
          "timestamp": 1704812345678,
          "significant": true
        },
        {
          "type": "attributes",
          "target": "#radix-:r0:-trigger-week",
          "attribute": "aria-selected",
          "newValue": "true",
          "timestamp": 1704812345680,
          "significant": true
        },
        {
          "type": "childList",
          "target": ".calendar-container",
          "removed": ["div"],
          "timestamp": 1704812345682,
          "significant": true
        },
        {
          "type": "childList",
          "target": ".calendar-container",
          "added": ["div"],
          "timestamp": 1704812345685,
          "significant": true
        }
      ]
    }
  ]
}
```

### Using changes.json for Verification

```javascript
// Example: Verify that clicking "Week" tab worked

// Expected mutations after clicking Week tab:
// 1. aria-selected changed on tab trigger
// 2. Text changed from "January 2024" to "Week of Jan 9"
// 3. Old view removed (childList with removed)
// 4. New view added (childList with added)

function verifyTabSwitch(changes) {
    const mutations = changes.timeline[1]?.mutations || [];

    const hasAriaChange = mutations.some(m =>
        m.attribute === 'aria-selected' && m.newValue === 'true'
    );

    const hasTextChange = mutations.some(m =>
        m.type === 'characterData' && m.text?.includes('Week')
    );

    const hasViewSwap = mutations.some(m => m.added) &&
                        mutations.some(m => m.removed);

    return hasAriaChange && hasTextChange && hasViewSwap;
}
```

---

## Tool Commands Reference

### Command Syntax

```bash
wsl -d Ubuntu -- bash -c 'source ~/.nvm/nvm.sh && cd ~/browser-automation && node dom_screenshot.js <URL> [ACTION] [ARG]'
```

### Actions

#### Navigate Only (Default)
```bash
node dom_screenshot.js https://example.com
```
- Navigates to URL
- Waits for `networkidle`
- Takes initial screenshot
- Monitors DOM for 2 seconds

#### Click
```bash
node dom_screenshot.js https://example.com click 500,300
```
- Navigates to URL
- Clicks at coordinates (500, 300)
- Monitors for DOM changes

**Click Variants:**
- Left click: default
- Coordinates: `x,y` (no spaces)

#### Type
```bash
node dom_screenshot.js https://example.com type "hello world"
```
- Types text at current focus
- Use after clicking an input field
- Supports special characters

**Note:** Type doesn't click first - ensure focus is set with a click action before typing.

#### Press Key
```bash
node dom_screenshot.js https://example.com press Enter
```

**Available Keys:**
| Key | Usage |
|-----|-------|
| `Enter` | Submit form, confirm |
| `Tab` | Move to next field |
| `Escape` | Close modal, cancel |
| `Backspace` | Delete character |
| `ArrowDown` | Navigate dropdown |
| `ArrowUp` | Navigate dropdown |
| `ArrowLeft` | Text cursor / slider |
| `ArrowRight` | Text cursor / slider |
| `Space` | Toggle checkbox, click button |
| `Home` | Start of input |
| `End` | End of input |

#### Scroll
```bash
node dom_screenshot.js https://example.com scroll 500
```
- Scrolls down by 500 pixels
- Negative values scroll up: `scroll -500`

### Full Command Examples

```bash
# Navigate to Google
wsl -d Ubuntu -- bash -c 'source ~/.nvm/nvm.sh && cd ~/browser-automation && node dom_screenshot.js https://google.com'

# Click search box (approximate center)
wsl -d Ubuntu -- bash -c 'source ~/.nvm/nvm.sh && cd ~/browser-automation && node dom_screenshot.js https://google.com click 640,340'

# Type search query
wsl -d Ubuntu -- bash -c 'source ~/.nvm/nvm.sh && cd ~/browser-automation && node dom_screenshot.js https://google.com type "playwright browser automation"'

# Press Enter to search
wsl -d Ubuntu -- bash -c 'source ~/.nvm/nvm.sh && cd ~/browser-automation && node dom_screenshot.js https://google.com press Enter'

# Scroll down results
wsl -d Ubuntu -- bash -c 'source ~/.nvm/nvm.sh && cd ~/browser-automation && node dom_screenshot.js https://google.com/search?q=test scroll 500'
```

### Copying Output Files

```bash
# Copy all screenshots
wsl -d Ubuntu -- cp ~/browser-automation/shot_*.png /mnt/c/YourProject/

# Copy changes.json
wsl -d Ubuntu -- cp ~/browser-automation/changes.json /mnt/c/YourProject/

# Copy everything
wsl -d Ubuntu -- bash -c 'cp ~/browser-automation/shot_*.png ~/browser-automation/changes.json /mnt/c/YourProject/'
```

---

## Coordinate System & Element Finding

### Viewport Coordinate System

```
(0,0)                                                    (1280,0)
  ┌────────────────────────────────────────────────────────┐
  │                                                        │
  │                    Browser Viewport                    │
  │                      1280 x 720                        │
  │                                                        │
  │                                                        │
  │                                                        │
  │                        (640,360)                       │
  │                           ●                            │
  │                        center                          │
  │                                                        │
  │                                                        │
  │                                                        │
  │                                                        │
  └────────────────────────────────────────────────────────┘
(0,720)                                                (1280,720)

X-axis: 0 (left) → 1280 (right)
Y-axis: 0 (top) → 720 (bottom)
```

### Finding Element Coordinates

#### Method 1: Visual Estimation

```
┌─────────────────────────────────────────────────────────┐
│  Logo    [Home] [About] [Contact]              [Login]  │  ← y ≈ 30-50
├─────────────────────────────────────────────────────────┤
│                                                         │
│          ┌─────────────────────────────┐                │
│          │      Search Box             │                │  ← y ≈ 300
│          └─────────────────────────────┘                │
│                                                         │
│              [Search Button]                            │  ← y ≈ 360
│                                                         │
└─────────────────────────────────────────────────────────┘

Common positions:
- Top navigation: y = 20-60
- Main content start: y = 100-150
- Page center: x = 640, y = 360
- Right-aligned elements: x = 1100-1250
- Left sidebar: x = 50-200
```

#### Method 2: Grid-Based Estimation

Most UIs use 8px or 16px grids. Common breakpoints:

```
X positions (1280px viewport):
├── 0-200:    Left sidebar / margin
├── 200-400:  Left content area
├── 400-600:  Center-left
├── 600-680:  Center
├── 680-880:  Center-right
├── 880-1080: Right content area
└── 1080-1280: Right sidebar / margin

Y positions (720px viewport):
├── 0-60:     Header / navigation
├── 60-120:   Sub-navigation / breadcrumbs
├── 120-200:  Hero / title area
├── 200-500:  Main content
├── 500-650:  Secondary content
└── 650-720:  Footer
```

#### Method 3: Iterative Refinement

```
1. Take screenshot
2. Estimate coordinates
3. Click and observe
4. If wrong element clicked:
   - Check changes.json for what was actually clicked
   - Adjust coordinates
   - Retry
```

### Element Size Reference

| Element Type | Typical Width | Typical Height |
|--------------|---------------|----------------|
| Button (small) | 60-100px | 28-36px |
| Button (medium) | 100-150px | 36-44px |
| Button (large) | 150-250px | 44-56px |
| Input field | 200-400px | 36-44px |
| Icon button | 32-48px | 32-48px |
| Tab | 80-150px | 36-48px |
| Dropdown item | Full width | 36-44px |
| Card | 250-400px | 150-300px |
| Modal | 400-600px | 300-500px |

### Click Targeting Strategy

```
For a button at visual position (x1, y1) to (x2, y2):

Click target = center of element
             = ((x1 + x2) / 2, (y1 + y2) / 2)

Example:
- Button appears to span x: 500-620, y: 200-240
- Click at: ((500+620)/2, (200+240)/2) = (560, 220)
```

---

## Working with Local Dev Servers

### The WSL-Windows Network Problem

```
┌─────────────────────────────────────────────────────────┐
│                      WINDOWS                             │
│                                                         │
│    Dev Server: localhost:5173                           │
│         │                                               │
│         │  ✓ Accessible from Windows browser            │
│         │  ✗ NOT accessible from WSL as "localhost"     │
│         │                                               │
│         ▼                                               │
│    Network Interface: 172.22.80.1                       │
│         │                                               │
│         │  ✓ Accessible from WSL                        │
│         │                                               │
├─────────┼───────────────────────────────────────────────┤
│         │              WSL2                             │
│         │                                               │
│         ▼                                               │
│    Firefox: http://172.22.80.1:5173  ✓                  │
│    Firefox: http://localhost:5173     ✗                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Finding Windows Host IP

```bash
# Method 1: From /etc/resolv.conf
wsl -d Ubuntu -- cat /etc/resolv.conf | grep nameserver
# Output: nameserver 172.22.80.1

# Method 2: Using ip route
wsl -d Ubuntu -- ip route | grep default
# Output: default via 172.22.80.1 dev eth0
```

### Configuring Dev Servers

#### Vite
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    host: true,        // Bind to all interfaces (0.0.0.0)
    // OR
    host: '0.0.0.0',   // Explicit binding
  }
});
```

#### Next.js
```json
// package.json
{
  "scripts": {
    "dev": "next dev -H 0.0.0.0"
  }
}
```

#### Create React App
```json
// package.json
{
  "scripts": {
    "start": "HOST=0.0.0.0 react-scripts start"
  }
}
```

#### Express/Node
```javascript
app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on 0.0.0.0:3000');
});
```

### Testing Connectivity

```bash
# From WSL, test if dev server is reachable
wsl -d Ubuntu -- curl -I http://172.22.80.1:5173

# Expected output:
# HTTP/1.1 200 OK
# Content-Type: text/html
# ...
```

---

## Project Setup Guide

### For Any New Project

#### Step 1: WSL Prerequisites (One-Time)

```bash
# Run in WSL Ubuntu terminal

# 1. Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 2. Reload shell
source ~/.bashrc

# 3. Install Node.js LTS
nvm install --lts

# 4. Create browser automation workspace
mkdir -p ~/browser-automation
cd ~/browser-automation

# 5. Initialize npm project
npm init -y

# 6. Install Playwright
npm install playwright

# 7. Install Firefox
npx playwright install firefox

# 8. Verify installation
node -e "require('playwright'); console.log('Playwright OK')"
```

#### Step 2: Copy Automation Script

```bash
# Copy dom_screenshot.js to WSL workspace
# From Windows, this is a one-time setup

wsl -d Ubuntu -- cp /mnt/c/HealthyMama/opencode-runner/tools/dom_screenshot.js ~/browser-automation/
```

#### Step 3: Configure Your Project

Create a CLAUDE.md in your project with:

```markdown
# CLAUDE.md - [Project Name]

## Browser Agent Testing

### Access URL from WSL
\`\`\`
http://172.22.80.1:[PORT]
\`\`\`

### Dev Server Configuration
[Document any host binding needed]

### Auth Bypass (if applicable)
[Document how to bypass auth for testing]

### Key UI Elements
| Element | Coordinates | Notes |
|---------|-------------|-------|
| Login button | (1150, 40) | Top-right |
| Search box | (640, 300) | Center |
| Submit button | (640, 400) | Below search |

### Browser Agent Commands
\`\`\`bash
# Navigate
wsl -d Ubuntu -- bash -c 'source ~/.nvm/nvm.sh && cd ~/browser-automation && node dom_screenshot.js http://172.22.80.1:[PORT]'

# Copy screenshots
wsl -d Ubuntu -- cp ~/browser-automation/shot_*.png /mnt/c/[PROJECT_PATH]/
\`\`\`
```

#### Step 4: Configure Dev Server

Add host binding to your dev server config (see "Configuring Dev Servers" section above).

#### Step 5: Test the Setup

```bash
# 1. Start your dev server (in project directory)
npm run dev

# 2. Test browser automation
wsl -d Ubuntu -- bash -c 'source ~/.nvm/nvm.sh && cd ~/browser-automation && node dom_screenshot.js http://172.22.80.1:5173'

# 3. Check output
wsl -d Ubuntu -- ls -la ~/browser-automation/shot_*.png
```

---

## Common Scenarios

### Scenario 1: Login Flow

```
Task: Log into application

1. Navigate to app
   → Screenshot shows login form

2. Click email input (estimate: 640, 300)
   → changes.json shows: focus event on input

3. Type email
   → changes.json shows: characterData change with email value

4. Click password input (estimate: 640, 360)
   → changes.json shows: focus change

5. Type password
   → changes.json shows: characterData change (may be obscured)

6. Click login button (estimate: 640, 420)
   → changes.json shows:
     - Form submission
     - childList: navigation elements added
     - characterData: welcome message

7. Verify: Look for dashboard/home content in screenshot
```

### Scenario 2: Form Submission

```
Task: Fill and submit a form

1. Navigate to form page
   → Identify all form fields from screenshot

2. For each field:
   a. Click the field
   b. Type the value
   c. Verify via changes.json

3. Click submit button
   → changes.json shows:
     - childList: success message added, OR
     - childList: error messages added

4. Verify outcome from screenshot
```

### Scenario 3: Navigation/Tabs

```
Task: Switch between views (e.g., Month/Week tabs)

1. Navigate to page
   → Identify tab positions from screenshot

2. Click target tab
   → changes.json shows:
     - aria-selected changes
     - childList: old view removed, new view added
     - characterData: header text change

3. Verify: New view content visible in screenshot
```

### Scenario 4: Search and Results

```
Task: Search for content

1. Navigate to page with search
   → Identify search input position

2. Click search input
   → changes.json: focus event

3. Type search query
   → changes.json: characterData

4. Press Enter OR click search button
   → changes.json shows:
     - childList: results added
     - characterData: result count

5. Verify: Results visible in screenshot
```

### Scenario 5: Modal/Dialog Interaction

```
Task: Open modal, interact, close

1. Click trigger button
   → changes.json shows:
     - childList: modal elements added
     - aria-hidden: false (or aria-modal: true)
     - Overlay element added

2. Interact with modal content
   → Standard click/type operations

3. Click close button OR press Escape
   → changes.json shows:
     - childList: modal elements removed
     - aria-hidden: true
```

### Scenario 6: Dropdown/Select

```
Task: Select option from dropdown

1. Click dropdown trigger
   → changes.json shows:
     - aria-expanded: true
     - childList: option list added

2. Click desired option (may need to scroll within dropdown)
   → changes.json shows:
     - aria-selected: true on chosen option
     - aria-expanded: false
     - childList: option list removed
     - characterData: selected value displayed

3. Verify: Selected value shown in trigger
```

---

## Decision Trees

### Action Selection Decision Tree

```
                    ┌─────────────────────┐
                    │ What do I need to   │
                    │ interact with?      │
                    └──────────┬──────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
     ┌──────────┐       ┌──────────┐       ┌──────────┐
     │  Button  │       │  Input   │       │  Content │
     │  Link    │       │  Field   │       │  Area    │
     │  Tab     │       │          │       │          │
     └────┬─────┘       └────┬─────┘       └────┬─────┘
          │                  │                  │
          ▼                  │                  ▼
    ┌──────────┐             │           ┌──────────┐
    │  CLICK   │             │           │  SCROLL  │
    │ at (x,y) │             │           │ by pixels│
    └──────────┘             │           └──────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │ Is field focused?   │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
               ┌─────────┐           ┌─────────┐
               │   NO    │           │   YES   │
               └────┬────┘           └────┬────┘
                    │                     │
                    ▼                     ▼
              ┌──────────┐          ┌──────────┐
              │  CLICK   │          │   TYPE   │
              │  first   │          │  "text"  │
              └──────────┘          └──────────┘
```

### Verification Decision Tree

```
                    ┌─────────────────────┐
                    │ Check changes.json  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Any significant     │
                    │ mutations?          │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
               ┌─────────┐           ┌─────────┐
               │   NO    │           │   YES   │
               └────┬────┘           └────┬────┘
                    │                     │
                    ▼                     ▼
     ┌──────────────────────┐  ┌──────────────────────┐
     │ Action may have      │  │ Check mutation types │
     │ failed:              │  └──────────┬───────────┘
     │ - Wrong coordinates  │             │
     │ - Element not ready  │    ┌────────┼────────┐
     │ - Page still loading │    │        │        │
     └──────────────────────┘    ▼        ▼        ▼
                            childList  charData  attrs
                               │        │        │
                               ▼        ▼        ▼
                           Elements   Text     State
                           added/     changed  changed
                           removed            (aria-*)
                               │        │        │
                               └────────┴────────┘
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │ Matches expected    │
                              │ outcome?            │
                              └──────────┬──────────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                              ▼                     ▼
                         ┌─────────┐           ┌─────────┐
                         │   YES   │           │   NO    │
                         └────┬────┘           └────┬────┘
                              │                     │
                              ▼                     ▼
                      ┌──────────────┐    ┌──────────────────┐
                      │   SUCCESS    │    │ Investigate:     │
                      │   Continue   │    │ - Check screenshot│
                      │   to next    │    │ - Wrong element? │
                      │   action     │    │ - Error state?   │
                      └──────────────┘    └──────────────────┘
```

### Error Recovery Decision Tree

```
                    ┌─────────────────────┐
                    │   Action Failed     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ What type of        │
                    │ failure?            │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
  ┌───────────┐         ┌───────────┐         ┌───────────┐
  │ Wrong     │         │ Element   │         │ Page      │
  │ element   │         │ not found │         │ error     │
  │ clicked   │         │           │         │           │
  └─────┬─────┘         └─────┬─────┘         └─────┬─────┘
        │                     │                     │
        ▼                     ▼                     ▼
  ┌───────────┐         ┌───────────┐         ┌───────────┐
  │ Adjust    │         │ Check if: │         │ Report    │
  │ coords by │         │ - Scrolled│         │ error to  │
  │ ±20-50px  │         │ - Hidden  │         │ user      │
  │ and retry │         │ - Loading │         │           │
  └───────────┘         └─────┬─────┘         └───────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
              ┌───────────┐       ┌───────────┐
              │ Scroll to │       │ Wait and  │
              │ element   │       │ retry     │
              └───────────┘       └───────────┘
```

---

## Debugging & Troubleshooting

### Common Issues and Solutions

#### Issue: Script fails with no output

**Diagnosis:**
```bash
# Check if nvm is working
wsl -d Ubuntu -- bash -c "source ~/.nvm/nvm.sh && node -v"
```

**Solutions:**
1. Ensure nvm is sourced: Add `source ~/.nvm/nvm.sh` to command
2. Check if Node is installed: `nvm install --lts`
3. Check if Playwright is installed: `npm install playwright`

#### Issue: Can't reach localhost from WSL

**Diagnosis:**
```bash
# Check Windows host IP
wsl -d Ubuntu -- cat /etc/resolv.conf | grep nameserver

# Test connectivity
wsl -d Ubuntu -- curl -I http://172.22.80.1:5173
```

**Solutions:**
1. Use Windows host IP instead of localhost
2. Add `host: true` to dev server config
3. Check firewall isn't blocking the port

#### Issue: Screenshots are blank/black

**Diagnosis:**
```bash
# Run with verbose output
wsl -d Ubuntu -- bash -c 'source ~/.nvm/nvm.sh && cd ~/browser-automation && node dom_screenshot.js http://example.com 2>&1'
```

**Solutions:**
1. Wait for page load: page might not be ready
2. Check if page requires JavaScript: some pages need hydration time
3. Verify URL is correct and accessible

#### Issue: Click hits wrong element

**Diagnosis:**
- Check changes.json for what was actually clicked
- Compare screenshot before/after

**Solutions:**
1. Adjust coordinates by small amounts (±10-50px)
2. Check if element has moved due to scroll
3. Check for overlapping elements (modals, tooltips)
4. Try clicking center of element, not edge

#### Issue: Type command doesn't enter text

**Diagnosis:**
- Check if any input has focus
- Look for focus indicators in screenshot

**Solutions:**
1. Click input field first, then type
2. Check if field is disabled
3. Check if field is readonly

#### Issue: No DOM changes detected

**Diagnosis:**
- Action might have failed silently
- Page might be static

**Solutions:**
1. Verify action was correct (coordinates, key name)
2. Some pages don't update DOM on certain actions
3. Check if element is interactive

### Debug Mode

To get more verbose output, modify `dom_screenshot.js`:

```javascript
// Add at start of run() function:
console.log('DEBUG: Starting browser automation');
console.log('DEBUG: URL:', url);
console.log('DEBUG: Action:', action);
console.log('DEBUG: ActionArg:', actionArg);

// Add after navigation:
console.log('DEBUG: Page title:', await page.title());
console.log('DEBUG: Page URL:', page.url());

// Add after action:
console.log('DEBUG: Action completed');
```

### Log File Analysis

```bash
# Save output to log file
wsl -d Ubuntu -- bash -c 'source ~/.nvm/nvm.sh && cd ~/browser-automation && node dom_screenshot.js http://example.com 2>&1' | tee /mnt/c/debug.log
```

---

## Extending the System

### Adding New Actions

Edit `dom_screenshot.js` to add new action types:

```javascript
// In the run() function, add new action handler:

} else if (action === 'doubleclick' && actionArg) {
    const [x, y] = actionArg.split(',').map(Number);
    console.log(`> Double-clicking at (${x}, ${y})...`);
    await page.mouse.dblclick(x, y);

} else if (action === 'rightclick' && actionArg) {
    const [x, y] = actionArg.split(',').map(Number);
    console.log(`> Right-clicking at (${x}, ${y})...`);
    await page.mouse.click(x, y, { button: 'right' });

} else if (action === 'hover' && actionArg) {
    const [x, y] = actionArg.split(',').map(Number);
    console.log(`> Hovering at (${x}, ${y})...`);
    await page.mouse.move(x, y);

} else if (action === 'drag' && actionArg) {
    // Format: startX,startY,endX,endY
    const [sx, sy, ex, ey] = actionArg.split(',').map(Number);
    console.log(`> Dragging from (${sx}, ${sy}) to (${ex}, ${ey})...`);
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(ex, ey);
    await page.mouse.up();

} else if (action === 'select' && actionArg) {
    // Select text in input
    console.log(`> Selecting all text...`);
    await page.keyboard.press('Control+a');

} else if (action === 'wait') {
    const ms = parseInt(actionArg) || 1000;
    console.log(`> Waiting ${ms}ms...`);
    await page.waitForTimeout(ms);
}
```

### Customizing Screenshot Behavior

```javascript
// In dom_screenshot.js, modify constants:

const MAX_SCREENSHOTS = 10;    // Max screenshots per action
const TIMEOUT_MS = 2000;       // Total monitoring time
const DEBOUNCE_MS = 100;       // Time between checks
const VIEWPORT_WIDTH = 1280;   // Browser width
const VIEWPORT_HEIGHT = 720;   // Browser height

// For full-page screenshots:
await page.screenshot({
    path: path,
    fullPage: true  // Captures entire scrollable area
});

// For element-specific screenshots:
const element = await page.$('.target-element');
await element.screenshot({ path: 'element.png' });
```

### Adding Custom Mutation Filters

```javascript
// In setupMutationObserver, customize significance rules:

// Add custom significant attributes
const SIGNIFICANT_ATTRS = [
    // Standard
    'aria-expanded', 'aria-hidden', 'aria-selected',
    // Custom for your app
    'data-state', 'data-active', 'data-loading'
];

// Add custom ignore patterns
const TRIVIAL_PATTERNS = [
    'caret-color', 'cursor', 'outline',
    // Custom ignores
    'animation', 'transition', 'transform'
];

// Custom significance logic
if (m.attributeName === 'class') {
    // Check for specific class changes
    const newClasses = m.target.className;
    if (newClasses.includes('active') ||
        newClasses.includes('selected') ||
        newClasses.includes('error')) {
        detail.significant = true;
    }
}
```

### Parallel Actions

For more complex scenarios, you can extend to support multiple actions:

```javascript
// In run(), support action sequences:

} else if (action === 'sequence') {
    // actionArg: "click,500,300|type,hello|press,Enter"
    const steps = actionArg.split('|');
    for (const step of steps) {
        const [act, ...args] = step.split(',');
        console.log(`> Sequence step: ${act} ${args.join(',')}`);

        if (act === 'click') {
            await page.mouse.click(parseInt(args[0]), parseInt(args[1]));
        } else if (act === 'type') {
            await page.keyboard.type(args.join(','));
        } else if (act === 'press') {
            await page.keyboard.press(args[0]);
        }

        await page.waitForTimeout(100); // Brief pause between actions
    }
}
```

---

## Constraints & Best Practices

### Hard Constraints

⚠️ **CONSTRAINT**: Must source nvm before running node commands in WSL.
```bash
source ~/.nvm/nvm.sh  # ALWAYS include this
```

⚠️ **CONSTRAINT**: WSL cannot access Windows `localhost` - use Windows host IP (172.x.x.1).

⚠️ **CONSTRAINT**: Each command starts fresh - no browser state persists between commands.

⚠️ **CONSTRAINT**: Coordinates are viewport-relative - scrolling changes what's at a given coordinate.

⚠️ **CONSTRAINT**: Max 10 screenshots per action (configurable in script).

⚠️ **CONSTRAINT**: 2-second monitoring window per action (configurable).

⚠️ **CONSTRAINT**: Type action doesn't auto-focus - click input first.

### Best Practices

✅ **BEST PRACTICE**: Always verify actions via changes.json, not just screenshots.

✅ **BEST PRACTICE**: Document element coordinates in project's CLAUDE.md for reuse.

✅ **BEST PRACTICE**: Add auth bypass flags for testing authenticated apps.

✅ **BEST PRACTICE**: Use `host: true` in dev server config before testing.

✅ **BEST PRACTICE**: Click center of elements, not edges.

✅ **BEST PRACTICE**: Break complex tasks into small, verifiable steps.

✅ **BEST PRACTICE**: Check for error states in both screenshot and DOM changes.

✅ **BEST PRACTICE**: After scrolling, re-take screenshot to get new coordinates.

✅ **BEST PRACTICE**: Use aria-* attributes from changes.json to verify UI state.

✅ **BEST PRACTICE**: Keep project-specific coordinates in that project's CLAUDE.md.

### Anti-Patterns to Avoid

❌ **AVOID**: Clicking without verifying the click target exists.

❌ **AVOID**: Typing without first clicking the input field.

❌ **AVOID**: Assuming coordinates are correct without visual verification.

❌ **AVOID**: Ignoring changes.json - it contains verification data.

❌ **AVOID**: Long action sequences without intermediate verification.

❌ **AVOID**: Hardcoding coordinates that might change with different content.

❌ **AVOID**: Forgetting to copy screenshots back to Windows for analysis.

---

## Quick Reference Card

### Command Template
```bash
wsl -d Ubuntu -- bash -c 'source ~/.nvm/nvm.sh && cd ~/browser-automation && node dom_screenshot.js <URL> [ACTION] [ARG]'
```

### Actions
| Action | Syntax | Example |
|--------|--------|---------|
| Navigate | `<URL>` | `http://example.com` |
| Click | `click X,Y` | `click 500,300` |
| Type | `type "text"` | `type "hello world"` |
| Press | `press KEY` | `press Enter` |
| Scroll | `scroll N` | `scroll 500` |

### Copy Commands
```bash
# Screenshots
wsl -d Ubuntu -- cp ~/browser-automation/shot_*.png /mnt/c/PROJECT/

# All outputs
wsl -d Ubuntu -- bash -c 'cp ~/browser-automation/shot_*.png ~/browser-automation/changes.json /mnt/c/PROJECT/'
```

### Viewport
- Size: 1280 x 720
- Center: (640, 360)
- Origin: Top-left (0, 0)

### Windows Host IP
```bash
wsl -d Ubuntu -- cat /etc/resolv.conf | grep nameserver
# Usually: 172.22.80.1
```
