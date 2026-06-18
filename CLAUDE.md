# CLAUDE.md

## Project Overview

**One-line:** <!-- e.g., "A Next.js SaaS dashboard for tracking ad campaign performance, used by marketing teams." -->

**Purpose:** <!-- What problem does this solve? Who uses it? -->

**Architecture:** <!-- e.g., "React frontend → Node/Express API → PostgreSQL. Auth via Clerk. Background jobs via BullMQ." -->

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | <!-- TypeScript --> | <!-- 5.4 --> |
| Framework | <!-- Next.js --> | <!-- 14.2 --> |
| Styling | <!-- Tailwind CSS --> | <!-- 3.4 --> |
| Database | <!-- PostgreSQL --> | <!-- 16 --> |
| Runtime | <!-- Node.js --> | <!-- 20 LTS --> |
| Package manager | <!-- pnpm --> | <!-- 9 --> |

**Constraints:** <!-- e.g., "Static export only", "No file system writes (Lambda)" -->

---

## Commands

```bash
pnpm dev           # Dev server
pnpm build         # Production build
pnpm typecheck     # tsc --noEmit
pnpm lint          # ESLint
pnpm format        # Prettier
pnpm test          # Unit tests (Vitest)
pnpm test:e2e      # E2E (Playwright)
pnpm db:migrate    # Run migrations
pnpm db:seed       # Seed dev data
```

> Always use `pnpm`. Never `npm` or `yarn`.

---

## Project Structure

```
/
├── src/
│   ├── app/          # Next.js App Router pages & layouts
│   ├── components/   # Shared UI components  →  @.claude/rules/frontend.md
│   ├── lib/          # Utilities & third-party wrappers
│   ├── server/       # Server actions & API handlers  →  @.claude/rules/backend.md
│   └── types/        # Shared TypeScript types
├── public/           # Static assets
├── tests/            # E2E tests (Playwright)
└── prisma/           # Schema & migrations
```

---

## Critical Rules

- **Never commit secrets or API keys.** Use `.env.local` (gitignored). Keys live in Vercel/CI env vars.
- **Plan before coding.** For tasks touching > 2 files, write a short bullet-point plan first.
- **Verify changes work.** After editing, confirm the dev server starts and the feature behaves correctly.
- **No unused code.** Delete dead imports, variables, and files — don't comment them out.
- **No `any`.** Use `unknown` + narrowing or proper types. `any` is banned.
- **Validate at boundaries.** Trust internal code; validate all user input and external API responses.

---

## Rules (detailed)

@.claude/rules/code-style.md
@.claude/rules/frontend.md
@.claude/rules/backend.md
@.claude/rules/testing.md
