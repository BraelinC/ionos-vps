# CLAUDE.md - IONOS VPS for Claude Code

> Self-hosted AI coding environment on IONOS VPS with browser automation.

---

## Quick Reference for Claude Code

### SSH Access (tmux auto-attaches)
```bash
ssh root@74.208.72.227
```

### VNC Access (view desktop via browser)
```
https://vps.braelin.uk/vnc.html?password=daytona&autoconnect=true
```

### VPS Specs
| Resource | Value |
|----------|-------|
| Host | 74.208.72.227 |
| OS | Ubuntu 24.04 |
| RAM | 848MB + 2GB swap |
| Disk | 10GB NVMe (watch free space!) |

---

## Tools Available to Claude Code

### 1. Persistent Browser (`browser.js`)

**Use when:** You need to keep browser state across multiple commands (login sessions, multi-step forms).

```bash
# Start persistent browser (runs in background)
cd ~/ionos-vps/implementation/browser-tools && node browser.js &

# Commands (all maintain state)
node browser.js goto https://example.com
node browser.js click 500,300
node browser.js type "hello world"
node browser.js press Enter
node browser.js shot label_name
node browser.js stop
```

**Output:** `shot_N_label.png` in current directory

### 2. Stateless Browser (`dom_screenshot.js`)

**Use when:** Single-action verification, DOM mutation analysis, or debugging.

```bash
cd ~/ionos-vps/implementation/browser-tools

# Navigate only
node dom_screenshot.js https://example.com

# With action
node dom_screenshot.js https://example.com click 500,300
node dom_screenshot.js https://example.com type "search query"
node dom_screenshot.js https://example.com press Enter
node dom_screenshot.js https://example.com scroll 500

# Sequence of actions
node dom_screenshot.js https://example.com sequence "click,500,300|type,hello|press,Enter"
```

**Output:**
- `shot_0.png` through `shot_N.png` (screenshots on DOM changes)
- `changes.json` (mutation timeline with significance markers)

### 3. Desktop Control (`desktop_control.js`)

**Use when:** Controlling native apps in VNC, not just browsers.

```bash
cd ~/ionos-vps/implementation/browser-tools

# Screenshot VNC display
node desktop_control.js screenshot /tmp/desktop.png

# Mouse/keyboard
node desktop_control.js click 500,300
node desktop_control.js move 640,360
node desktop_control.js press Enter
node desktop_control.js scroll 300
node desktop_control.js hotkey Ctrl c
```

---

## Decision Tree: Which Tool to Use

```
┌─────────────────────────────────────┐
│ What are you automating?            │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌─────────┐         ┌─────────────┐
│ Browser │         │ Desktop App │
│ (Web)   │         │ (Native)    │
└────┬────┘         └──────┬──────┘
     │                     │
     │                     ▼
     │              ┌─────────────────┐
     │              │ desktop_control │
     │              │ .js             │
     │              └─────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ Do you need state between commands? │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌─────────┐         ┌─────────┐
│  YES    │         │   NO    │
└────┬────┘         └────┬────┘
     │                   │
     ▼                   ▼
┌─────────────┐   ┌─────────────────┐
│ browser.js  │   │ dom_screenshot  │
│ (persistent)│   │ .js (stateless) │
└─────────────┘   └─────────────────┘
```

---

## Workflow Examples

### Example 1: Login to a Site (Persistent Browser)

```bash
# Start browser
cd ~/ionos-vps/implementation/browser-tools
node browser.js &

# Navigate to login
node browser.js goto https://app.example.com/login

# Screenshot to see form
node browser.js shot login_page

# Click email field, type, click password, type
node browser.js click 640,300
node browser.js type "user@example.com"
node browser.js click 640,360
node browser.js type "password123"

# Submit
node browser.js click 640,420
node browser.js shot after_login

# Continue using session...
node browser.js goto https://app.example.com/dashboard

# When done
node browser.js stop
```

### Example 2: Verify UI Behavior (Stateless + DOM Analysis)

```bash
cd ~/ionos-vps/implementation/browser-tools

# Click a tab and capture DOM changes
node dom_screenshot.js https://app.example.com click 500,100

# Check changes.json for:
# - aria-selected changes
# - childList mutations (new content added)
# - characterData changes (text updated)
cat changes.json | jq '.timeline[1].mutations'
```

### Example 3: Take Screenshot for Claude Vision

```bash
# Take screenshot of any URL
cd ~/ionos-vps/implementation/browser-tools
node dom_screenshot.js https://news.ycombinator.com

# Screenshot saved as shot_0.png
# Read it back for vision analysis
```

---

## Understanding changes.json

After running `dom_screenshot.js`, check `changes.json` for DOM mutations:

```json
{
  "screenshots": ["./shot_0.png", "./shot_1.png"],
  "totalMutations": 278,
  "significantMutations": 12,
  "timeline": [
    {
      "file": "shot_0.png",
      "type": "initial"
    },
    {
      "file": "shot_1.png", 
      "type": "significant_change",
      "mutations": [
        {"type": "childList", "target": ".results", "added": ["div"]},
        {"type": "attributes", "attribute": "aria-expanded", "newValue": "true"},
        {"type": "characterData", "text": "Results loaded"}
      ]
    }
  ]
}
```

### What's Significant?
| Mutation | Significant? | Meaning |
|----------|--------------|---------|
| `childList` + added | ✓ | New elements appeared (dropdown, modal, results) |
| `childList` + removed | ✓ | Elements gone (modal closed, item deleted) |
| `characterData` | ✓ | Text changed |
| `aria-expanded` | ✓ | Accordion/dropdown toggled |
| `aria-selected` | ✓ | Tab/option selected |
| Cursor/outline changes | ✗ | Trivial (animations, focus) |

---

## Coordinate System

```
(0,0)                                          (1280,0)
  ┌────────────────────────────────────────────┐
  │              VIEWPORT 1280×720             │
  │                                            │
  │     Top nav: y ≈ 30-60                     │
  │                                            │
  │     Main content: y ≈ 200-500              │
  │                                            │
  │              Center: (640, 360)            │
  │                                            │
  │     Footer: y ≈ 650-720                    │
  └────────────────────────────────────────────┘
(0,720)                                       (1280,720)
```

### Click Targeting
- **Buttons**: Click center, not edges
- **Input fields**: Click center, then type
- **If click misses**: Adjust by ±20-50px and retry

---

## Constraints & Best Practices

### ⚠️ Constraints
- **848MB RAM** — always use swap for heavy tasks
- **10GB disk** — run `df -h` before installs
- **No Google** — use DuckDuckGo (datacenter IPs get CAPTCHA'd)
- **Stateless per command** — `dom_screenshot.js` starts fresh each time
- **Type needs focus** — click input first, then type

### ✅ Best Practices
- Use `browser.js` for multi-step flows requiring login/state
- Use `dom_screenshot.js` for verification and DOM analysis
- Verify actions via `changes.json`, not just screenshots
- Break complex tasks into small, verifiable steps
- Use `aria-*` attributes from changes.json to verify UI state

---

## Service Management

```bash
# Check all services
systemctl status vncserver@1 novnc cloudflared tmux-main

# Restart VNC if display issues
systemctl restart vncserver@1

# Resource check
free -h && df -h /
```

---

## Directory Structure

```
ionos-vps/
├── CLAUDE.md                              # This file
├── instruction/                           # Documentation
│   ├── vps-setup.md                       # VPS setup notes
│   └── local_browser_automation.md        # Full automation docs
└── implementation/                        
    ├── browser-tools/                     # Main tools
    │   ├── browser.js                     # Persistent browser
    │   ├── dom_screenshot.js              # Stateless + DOM capture
    │   ├── desktop_control.js             # VNC desktop control
    │   └── debug_browser.js               # Console/network debug
    └── dom_screenshot.js                  # (legacy copy)
```

---

## The "ii" Framework

Every workflow has two files:

```
instruction/[name].md    →    The "what" and "why"
implementation/[name].*  →    The "how" (executable)
```

**Loop:**
1. **READ** instruction (check for ⚠️ CONSTRAINT markers)
2. **CODE** implementation
3. **EXECUTE** 
4. **ANNEAL** — update instruction with learnings:
   - On failure: Add `⚠️ CONSTRAINT: [what failed]`
   - On success: Add `✅ BEST PRACTICE: [what worked]`
