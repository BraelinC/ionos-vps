# Claude Code Dispatch - Instruction

## Goal
Run Claude Code on projects via tmux, with automatic notification back to Clawdbot when done.

## Architecture

```
Clawdbot (me)
    │
    │ tmux send-keys
    ▼
Claude Code (in tmux session)
    │
    │ works on project...
    │
    │ Stop hook fires
    ▼
notify-clawdbot.sh
    │
    │ curl POST /hooks/agent
    ▼
Clawdbot receives notification
    │
    ▼
Discord message: "✅ Claude Code completed in project-name"
```

## How Clawdbot Dispatches

```bash
# 1. Create tmux session for project
tmux new-session -d -s claude-PROJECT -c ~/path/to/project

# 2. Start Claude Code
tmux send-keys -t claude-PROJECT "claude" Enter

# 3. Wait for startup, send task
sleep 2
tmux send-keys -t claude-PROJECT "Build a REST API for users" Enter

# 4. Monitor progress (optional)
tmux capture-pane -p -t claude-PROJECT -S -50

# 5. Send follow-up instructions (optional)
tmux send-keys -t claude-PROJECT "Now add authentication" Enter
```

## How Claude Code Notifies Back

Plugin: `~/.claude/plugins/clawdbot-notify/`

On Stop event:
1. Hook reads reason (complete/error/cancelled)
2. Sends POST to `http://localhost:18789/hooks/agent`
3. Clawdbot delivers message to Discord

## Constraints

⚠️ CONSTRAINT: Always use tmux, not background mode — multi-step tasks need interaction

⚠️ CONSTRAINT: Wait ~2s after starting claude before sending task

⚠️ CONSTRAINT: One tmux session per project to avoid conflicts

## Best Practices

✅ BEST PRACTICE: Name sessions `claude-PROJECTNAME` for clarity

✅ BEST PRACTICE: Use `capture-pane -S -50` to read recent output

✅ BEST PRACTICE: Kill old sessions before starting new ones: `tmux kill-session -t claude-PROJECT`

## Implementation

- Clawdbot config: `~/.clawdbot/clawdbot.json` (hooks enabled)
- Claude Code plugin: `~/.claude/plugins/clawdbot-notify/`
- Hook script: `~/.claude/plugins/clawdbot-notify/hooks/notify-clawdbot.sh`
