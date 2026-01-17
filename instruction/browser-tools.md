# Browser Tools - Instruction

## Goal
Automate browser actions on the VPS for AI agent control.

## Tools

| Tool | Use When |
|------|----------|
| `browser.js` | Need state between commands (login, multi-step) |
| `dom_screenshot.js` | Single action + DOM mutation analysis |
| `desktop_control.js` | Control native apps (not just browser) |

## Steps (Persistent Browser)

1. Start: `node browser.js &`
2. Navigate: `node browser.js goto <url>`
3. Act: `node browser.js click 500,300` / `type "text"` / `press Enter`
4. Screenshot: `node browser.js shot label`
5. Stop: `node browser.js stop`

## Steps (Stateless + DOM Analysis)

1. Run: `node dom_screenshot.js <url> [action] [arg]`
2. Check: `shot_*.png` for visuals
3. Check: `changes.json` for DOM mutations

## Constraints

⚠️ CONSTRAINT: `type` doesn't auto-focus — click input first

⚠️ CONSTRAINT: Each `dom_screenshot.js` run starts fresh — no state

⚠️ CONSTRAINT: Use DuckDuckGo not Google (datacenter IPs get CAPTCHA'd)

## Best Practices

✅ BEST PRACTICE: Click center of elements, not edges

✅ BEST PRACTICE: Verify via `changes.json`, not just screenshots

✅ BEST PRACTICE: Break complex tasks into small steps

## Implementation

`implementation/browser-tools/`
- `browser.js` — persistent browser server
- `dom_screenshot.js` — stateless with mutation capture  
- `desktop_control.js` — VNC display control
