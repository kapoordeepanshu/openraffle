# Contributing to OpenRaffle

Thanks for helping! Bug fixes, features, docs and translations are all welcome.

## Getting started

```bash
npm install
cp .env.example .env   # set AUTH_SECRET and ADMIN_PASSWORD
npm run setup
npm run dev
```

Read [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md) first. It explains checkout, webhooks, ticket allocation and the draw.

## Before opening a pull request

```bash
npm run typecheck
npm run lint
npm test
```

- Keep pull requests focused on one change.
- Add or update tests for anything touching orders, payments or the draw (`tests/`).
- Money is stored as integer pence. Never use floats for amounts.
- Never trust the browser: re-check prices, limits and eligibility on the server.
- UI should stay accessible: labels on inputs, visible focus states, 44px touch targets and `prefers-reduced-motion` respected.

## Reporting bugs

Open an issue with steps to reproduce, what you expected and what happened. For security problems, see [SECURITY.md](SECURITY.md).
