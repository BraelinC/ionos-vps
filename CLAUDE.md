# CLAUDE.md - IONOS VPS Agent

## The "ii" Framework (Instruction + Implementation)

Every workflow has TWO files that evolve together:

```
instruction/[name].md    →    The "what" and "why" (plan, constraints, learnings)
implementation/[name].*  →    The "how" (executable code/scripts)
```

### The Loop

```
READ instruction  ──►  CODE implementation  ──►  EXECUTE
      ▲                                            │
      │                                            │
      └────────────────  ANNEAL  ◄─────────────────┘
```

1. **READ** — Check instruction for `⚠️ CONSTRAINT` and `✅ BEST PRACTICE` markers
2. **CODE** — Write/update implementation
3. **EXECUTE** — Run it
4. **ANNEAL** — Update instruction with learnings:
   - Failure → Add `⚠️ CONSTRAINT: [what failed]`
   - Success → Add `✅ BEST PRACTICE: [what worked]`

### Rules

| Rule | Description |
|------|-------------|
| Never Code Blind | Always read instruction first |
| Never Regress | Respect existing constraints |
| Always Anneal | Update instruction after every run |
| Instructions Win | If they disagree, fix the code |

---

## How to Structure an Instruction File

```markdown
# [Name] - Instruction

## Goal
One sentence: what this does and why.

## Steps
1. First thing
2. Second thing
3. Third thing

## Constraints
⚠️ CONSTRAINT: [learned the hard way]

## Best Practices  
✅ BEST PRACTICE: [what works]

## Implementation
Points to: `implementation/[name].*`
```

---

## Current ii Pairs

| Instruction | Implementation | Status |
|-------------|----------------|--------|
| `instruction/vps-setup.md` | VPS is live | ✅ Done |
| `instruction/browser-tools.md` | `implementation/browser-tools/` | ✅ Done |
| `instruction/[next-task].md` | `implementation/[next-task].*` | 🔲 Todo |

---

## Quick Access

| What | Where |
|------|-------|
| VNC | https://vps.braelin.uk/vnc.html?password=daytona&autoconnect=true |
| SSH | `ssh root@74.208.72.227` |
| VPS | Ubuntu 24.04, 848MB RAM, 10GB disk |
