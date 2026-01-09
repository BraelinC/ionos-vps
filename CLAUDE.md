# CLAUDE.md - IONOS VPS Agent

## Project Overview

Self-hosted AI coding agent environment on IONOS VPS with VNC browser access via Cloudflare tunnel.

- **Tech Stack**: Ubuntu 24.04 + XFCE4 + TightVNC + noVNC + Cloudflare Tunnel
- **VNC Port**: 5901 (via tunnel: vps.braelin.uk)
- **SSH**: root@74.208.72.227

## Directory Structure

```
ionos-vps/
├── instruction/          # Information layer (SOPs, setup docs)
│   └── vps-setup.md      # Complete VPS setup documentation
├── implementation/       # Implementation layer (executable scripts)
│   └── setup-vps.sh      # Reproducible setup script
├── web/                  # Next.js + Convex web UI
│   ├── src/app/          # React pages
│   ├── convex/           # Backend functions
│   └── package.json
└── CLAUDE.md             # This file
```

## VPS Access

| Method | URL/Command |
|--------|-------------|
| **VNC (Auto-connect)** | https://vps.braelin.uk/vnc.html?password=daytona&autoconnect=true |
| **SSH (tmux)** | `ssh root@74.208.72.227` |
| **VNC Client** | 74.208.72.227:5901 (password: daytona) |

## VPS Specs

| Resource | Value |
|----------|-------|
| Host | 74.208.72.227 |
| OS | Ubuntu 24.04 |
| CPU | 1 vCore |
| RAM | 848MB + 2GB swap |
| Disk | 10GB NVMe |
| Tunnel | vps.braelin.uk |

## What's Installed

- **AI CLI Tools**: Claude Code 2.1.2 (`claude`)
- **Desktop**: XFCE4 + TightVNC + noVNC
- **Terminal**: Terminator (scrollbar), tmux (mouse scroll, 50k history)
- **Browser**: Firefox 146.0.1 + Playwright
- **Tunnel**: Cloudflare permanent tunnel (ionos-vps)

---

## Browser Automation Testing

### Full Documentation

For complete browser automation system documentation:
```
C:\HealthyMama\opencode-runner\instruction\local_browser_automation.md
```

This contains:
- Full architecture diagrams (Windows → WSL → Playwright → Firefox)
- The complete agent loop (NAVIGATE → ANALYZE → DECIDE → ACT → VERIFY → REPEAT)
- DOM change detection system (MutationObserver, significance filtering)
- Tool commands reference (navigate, click, type, press, scroll)
- Coordinate system & element finding strategies
- Decision trees (action selection, verification, error recovery)
- Debugging & troubleshooting guide
- Extension points for custom actions

### Quick Start - VPS Browser Automation

```bash
# On VPS via SSH
cd /root/automation && DISPLAY=:1 node test-firefox.js
```

### Quick Start - Local WSL Browser Agent

```bash
# 1. Navigate to VPS VNC
wsl -d Ubuntu -- bash -c 'source ~/.nvm/nvm.sh && cd ~/browser-automation && node dom_screenshot.js https://vps.braelin.uk/vnc.html?password=daytona&autoconnect=true'

# 2. Copy screenshots for analysis
wsl -d Ubuntu -- cp ~/browser-automation/shot_*.png /mnt/c/HealthyMama/ionos-vps/
```

### Agent Loop

```
1. NAVIGATE → Take initial screenshot + watch DOM
2. ANALYZE  → Read screenshot + changes.json
3. DECIDE   → What action to take (click/type/scroll)
4. ACT      → Execute action, capture DOM changes
5. VERIFY   → Check if goal achieved
6. REPEAT   → Until task complete
```

### Tool Commands

| Action | Command |
|--------|---------|
| Navigate | `node dom_screenshot.js <URL>` |
| Click | `node dom_screenshot.js <URL> click X,Y` |
| Type | `node dom_screenshot.js <URL> type "text"` |
| Press | `node dom_screenshot.js <URL> press Enter` |
| Scroll | `node dom_screenshot.js <URL> scroll 500` |

### DOM Change Verification

After each action, check `changes.json`:
```json
{
  "screenshots": ["./shot_0.png", "./shot_1.png"],
  "totalMutations": 278,
  "timeline": [{
    "file": "shot_1.png",
    "type": "significant_change",
    "mutations": [
      {"type": "childList", "target": ".results", "added": ["div"]},
      {"type": "attributes", "attribute": "aria-expanded", "newValue": "true"}
    ]
  }]
}
```

### Coordinate System

```
(0,0) ───────────────────────► X (1280)
  │
  │    ┌────────────────────┐
  │    │  Browser Viewport  │
  │    │    1280 x 720      │
  │    │      (640,360)     │
  │    │         ●          │
  │    │       center       │
  │    └────────────────────┘
  ▼
  Y (720)
```

---

## The "ii" Framework

### Rule 1: Every workflow has TWO files
- `instruction/[name].md` - The "what" and "why"
- `implementation/[name].py|.sh` - The "how"

### Rule 2: The Loop
```
READ instruction → CODE implementation → EXECUTE → ANNEAL
```

**On failure:** Update instruction with `⚠️ CONSTRAINT: [what failed]`
**On success:** Update instruction with `✅ BEST PRACTICE: [what worked]`

### Rule 3: Never Regress
Before coding any workflow:
1. READ the instruction file first
2. Check for past failures (⚠️ CONSTRAINT markers)
3. Follow established best practices (✅ markers)

---

## SSH + tmux Usage

```bash
# SSH auto-attaches to tmux 'main' session
ssh root@74.208.72.227

# Manual tmux commands
tmux ls                    # List sessions
tmux attach -t main        # Attach to main session
Ctrl+b d                   # Detach from session
```

**Features:**
- Mouse scroll enabled in tmux
- 50,000 line scrollback history
- Persists across reboots

---

## Constraints

⚠️ CONSTRAINT: VPS has only 848MB RAM - always use swap for heavy tasks.

⚠️ CONSTRAINT: 10GB disk (1.7GB free) - monitor with `df -h` before installs.

⚠️ CONSTRAINT: Use DuckDuckGo instead of Google (no CAPTCHA on datacenter IPs).

⚠️ CONSTRAINT: Must source nvm before running node commands in WSL.

⚠️ CONSTRAINT: Each browser command starts fresh - no state persists between commands.

⚠️ CONSTRAINT: Type action doesn't auto-focus - click input first.

## Best Practices

✅ BEST PRACTICE: Use Cloudflare tunnel (vps.braelin.uk) for reliable VNC access.

✅ BEST PRACTICE: SSH auto-attaches to tmux - no need for manual attach.

✅ BEST PRACTICE: Mouse scroll works in tmux with `set -g mouse on`.

✅ BEST PRACTICE: Use Firefox from Mozilla APT, not snap (saves 5GB).

✅ BEST PRACTICE: Verify actions via changes.json, not just screenshots.

✅ BEST PRACTICE: Click center of elements, not edges.

✅ BEST PRACTICE: Break complex tasks into small, verifiable steps.

✅ BEST PRACTICE: Use aria-* attributes from changes.json to verify UI state.

---

## Quick Commands (on VPS)

```bash
# Check resources
free -h && df -h /

# Use Claude Code
claude

# Launch browser for automation
cd /root/automation && DISPLAY=:1 node test-firefox.js

# Restart VNC
systemctl restart vncserver@1

# Check all services
systemctl status vncserver@1 novnc cloudflared tmux-main
```

## Web UI Development

```bash
cd ionos-vps/web
bun install
bun run dev          # Start Next.js dev server
bunx convex dev      # Start Convex backend
```

---

## Reference Documentation

| Document | Location |
|----------|----------|
| **Browser Automation (Complete)** | `C:\HealthyMama\opencode-runner\instruction\local_browser_automation.md` |
| **Project Template** | `C:\HealthyMama\opencode-runner\templates\CLAUDE_BROWSER_TEMPLATE.md` |
| **VPS Setup Details** | `instruction/vps-setup.md` |
| **Setup Script** | `implementation/setup-vps.sh` |
