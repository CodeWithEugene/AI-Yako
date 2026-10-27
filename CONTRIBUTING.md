# Contributing

This repo is a solo entry for **AI Yako, Own Your AI, the QVAC Hackathon** (24 to 31 Oct 2026). It's a one-week sprint, so the workflow is lightweight and optimized for shipping a working, well-documented build before the deadline.

## Ground Rules

- **One Build.** I submit exactly one project on DoraHacks as a solo builder.
- **Main is always demo-able.** `main` must stay in a state we could record the offline demo from at any time. Merge early, merge small.
- **QVAC is mandatory.** The core feature must run on QVAC (`@qvac/sdk`) on a physical device. No cloud AI APIs for the core feature, since that disqualifies the entry. WDK is required if we're in the finance track.
- **Disclose reused work.** Any pre-existing code, boilerplate, or third-party asset must be credited in the README and in `docs/`. The hackathon requires it.
- **No secrets. Ever.** No API keys, seed phrases, passwords, or private customer data in any commit. See `SECURITY.md`.

## Build-Week Cadence (EAT, UTC+3)

| Day | Focus |
|---|---|
| Sat 24 Oct | Kickoff. Lock the track, scope the MVP, set up the repo and dev environments |
| Sun 25 to Tue 27 Oct | Build the core feature on QVAC. Daily check-ins, office hours with Victor at 15:00 EAT on Discord |
| **Wed 28 Oct** | **Mid-week progress and offline testing check.** Demo the core flow offline on a real device |
| Thu 29 Oct | Feature freeze. Polish UX, write docs, start the demo-video script |
| **Fri 30 Oct** | Record the offline demo video, final README pass, **submit on DoraHacks before 17:00 EAT (14:00 UTC)**. Upload early and verify every link |
| Sat 31 Oct | Demo day at Node NBO (or remote demo coordination via Discord) |

## Git Workflow

- Branch per piece of work, like `feat/<thing>`, `fix/<thing>`, `docs/<thing>`.
- Keep commits small and self-reviewed. There is no second reviewer on a solo entry, so read each diff before committing.
- Commit messages should be imperative and specific (e.g. `Add QVAC translate pipeline for Swahili FAQ`).
- Rebase or merge. Either is fine, but don't force-push shared branches.

## Code and Docs Conventions

- Follow the conventions of the stack once scaffolding lands (update this section with formatter, linter, and test commands).
- Document QVAC integration points as you build them. The judges grade meaningful QVAC integration, and the submission requires integration details.
- Keep `docs/5.build.md` updated as a running build log. It makes the final submission write-up trivial.
- When you need help, post in the AI Yako Discord with your **device, OS, SDK version, and the full error message**.

## Definition of Done (per feature)

- Works **offline on a physical device** (airplane-mode test, not just localhost).
- Setup steps reproducible from the README alone, so future-me and any judge can run it cold.
- Any network-using behavior is noted, since we must list every feature that uses the network in the submission.
