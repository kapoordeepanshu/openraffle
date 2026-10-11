# Security policy

OpenRaffle handles payments and personal data, so security reports are taken seriously.

## Reporting a vulnerability

Please **don't open a public issue**. Email **deepanshukapoor756@gmail.com** with:

- a description of the issue and its impact
- steps to reproduce or a proof of concept
- the version or commit you tested

You'll get an acknowledgement within 72 hours. Fixes for confirmed issues are prioritised and credited in the release notes if you'd like.

## Operator checklist

- Use a long, unique `ADMIN_PASSWORD` and a random 32+ character `AUTH_SECRET`.
- Changing `AUTH_SECRET` signs everyone out and makes Stripe keys saved in the admin unreadable; re-enter them afterwards.
- Always serve the site over HTTPS.
- Use Stripe restricted keys where possible.
- Keep dependencies up to date (`npm audit`).
