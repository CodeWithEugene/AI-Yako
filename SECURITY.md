# Security Policy

## Reporting a Vulnerability

If you find a security issue in this project, please **do not open a public issue**. Report it privately to the maintainer, Eugene, via the AI Yako hackathon Discord or the contact link on the [DoraHacks project page](https://dorahacks.io/hackathon/ai-yako/detail), with a description, reproduction steps, and affected versions or commits. I'll acknowledge within 48 hours and coordinate a fix before any public disclosure.

## Secrets and Sensitive Data (Hackathon Rule)

This is a submission for the **AI Yako hackathon**, whose rules require that **no private customer data, passwords, API keys, or wallet secrets** appear in the repository or submission. Because this project may integrate WDK (self-custodial wallets) and QVAC (on-device AI), take this seriously.

- **Never commit** seed phrases, private keys, keystores, API tokens, `.env` files with real values, or user data of any kind.
- `.env` is git-ignored. Only commit `.env.example` with placeholder values.
- Wallet material (WDK) lives only on the user's device, never in source, logs, or demo artifacts.
- Demo data must be synthetic or public. Scrub any real personal data before recording the demo video.
- Judges must be able to build and run the project **without any secret**. Document all required setup in the README.
- If a secret is ever committed by accident, treat it as compromised. Rotate it immediately and purge it from git history.

## Scope

This policy covers all code and docs in this repository through the hackathon period (24 to 31 Oct 2026) and beyond while the project is maintained.
