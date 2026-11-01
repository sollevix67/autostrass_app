# Project Configuration — autostrass_app

This file configures the [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) plugin for the autostrass_app project.

## Installation

Run the following Claude Code slash commands (one at a time) to install oh-my-claudecode:

```
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
```

## Project

**autostrass_app** — Application React + Express + MariaDB pour la gestion commerciale et logistique.

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express 5 + TypeScript
- **Database**: MariaDB with Drizzle ORM
- **API port**: 3001 (HTTP), 3443 (HTTPS)
- **Health check**: `GET /api/health`

## Existing Custom Skills

The following custom skills are defined in `.github/skills/` and `.github/prompts/`:

| Skill | Location | Purpose |
|-------|----------|---------|
| code-documenter | `.github/skills/code-documenter/SKILL.md` | Generates, formats, and validates technical documentation |
| code-reviewer | `.github/skills/code-reviewer/SKILL.md` | Analyzes code diffs for bugs, security, code smells |
| debugging-wizard | `.github/skills/debugging-wizard/SKILL.md` | Parses errors, traces execution flow, identifies root causes |
| fullstack-guardian | `.github/skills/fullstack-guardian/SKILL.md` | Security-focused full-stack web application development |
| react-expert | `.github/skills/react-expert/SKILL.md` | React 18+ applications, Next.js App Router, custom hooks |
| test-master | `.github/skills/test-master/SKILL.md` | Generates test files, creates mocking strategies, analyzes coverage |
| typescript-pro | `.github/skills/typescript-pro/SKILL.md` | Advanced TypeScript type systems, custom type guards |
| ui-ux-pro-max | `.github/skills/ui-ux-pro-max/SKILL.md` | UI/UX design intelligence for web, mobile, desktop |

Prompts (skill-like configurations):

| Prompt | Location | Purpose |
|--------|----------|---------|
| banner-design | `.github/prompts/banner-design/SKILL.md` | Banner design system |
| brand | `.github/prompts/brand/SKILL.md` | Brand guidelines and visual identity |
| design | `.github/prompts/design/SKILL.md` | Design system and UI/UX |
| design-system | `.github/prompts/design-system/SKILL.md` | Token architecture, component specs |
| slides | `.github/prompts/slides/SKILL.md` | Slide/presentation generation |
| ui-styling | `.github/prompts/ui-styling/SKILL.md` | shadcn/ui + Tailwind styling |

## Project Structure

```
autostrass_app/
├── .claude/                 # oh-my-claudecode project config
│   └── CLAUDE.md            # This file
├── .github/
│   ├── prompts/             # Prompt-based skills
│   └── skills/              # Custom skill SKILL.md files
├── server/                  # Express backend
│   ├── db/                  # Drizzle schema, client, migrations
│   ├── middleware/          # Auth, resource routes, etc.
│   ├── repositories/        # Data access layer
│   ├── services/            # Business logic
│   └── types/               # Shared types
├── src/                     # React frontend
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API service layer
│   ├── views/               # Page views
│   └── types/               # Frontend types
├── database/                # SQL schema, seeds, migrations
├── archives/                # Archived data exports
├── config/                  # SSL certificates, app config
├── public/                  # Static assets
├── scripts/                 # Migration, seed, test scripts
└── specs/                   # Feature specifications
```

## oh-my-claudecode Usage

Once installed, the following slash commands are available:

| Command | Description |
|---------|-------------|
| `/oh-my-claudecode:autopilot` | Autonomous task execution |
| `/oh-my-claudecode:ralph` | Task planning and decomposition |
| `/oh-my-claudecode:execute` | Command execution |
| `/oh-my-claudecode:team` | Multi-agent collaboration |

Use `/oh-my-claudecode:omc-setup --local` to reconfigure this project-scoped CLAUDE.md.

## npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `concurrently "tsx server/index.ts" "vite"` | Start dev server (API + Vite) |
| `build` | `npx tsc -b && npx tsc -p tsconfig.server.json --noEmit && vite build` | Build for production |
| `lint` | `oxlint` | Run linter |
| `db:generate` | `drizzle-kit generate` | Generate Drizzle migrations |
| `db:migrate` | `tsx scripts/migrate.ts` | Apply database migrations |
| `test:api` | `tsx scripts/test-api.ts` | Run API tests |
| `test:security` | `tsx scripts/test-security.ts` | Run security tests |

## Configuration Precedence

This `./.claude/CLAUDE.md` applies only to the autostrass_app project. It works alongside your global CLAUDE.md without overriding it.
