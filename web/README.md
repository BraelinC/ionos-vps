# IONOS VPS Agent Web UI

Next.js + Convex web interface for controlling IONOS VPS with AI coding agents.

## Features

- **VNC Desktop**: Embedded VNC viewer via Cloudflare tunnel (vps.braelin.uk)
- **SSH Access**: Copy SSH command for terminal access with tmux
- **Automation**: Gemini Live Vision agent for browser control

## Setup

1. Install dependencies:
```bash
bun install
```

2. Create `.env.local`:
```bash
cp .env.example .env.local
# Edit with your Convex URL and Gemini API key
```

3. Start development:
```bash
# In one terminal
bun run dev

# In another terminal
bunx convex dev
```

## Deploy

### Vercel

```bash
vercel
```

### Convex

```bash
bunx convex deploy
```

## Architecture

```
web/
├── src/
│   ├── app/
│   │   ├── page.tsx      # Main UI with tabs (VNC, SSH, Automation)
│   │   ├── layout.tsx    # Root layout with Convex provider
│   │   └── globals.css   # Tailwind styles
│   └── components/
│       └── ConvexClientProvider.tsx
├── convex/
│   ├── schema.ts         # Database schema
│   └── automation.ts     # Automation task functions
└── package.json
```

## VPS Access URLs

| Method | URL |
|--------|-----|
| VNC (Auto-connect) | https://vps.braelin.uk/vnc.html?password=daytona&autoconnect=true |
| SSH | `ssh root@74.208.72.227` |
