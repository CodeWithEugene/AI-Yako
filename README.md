# AI Yako. Own Your AI

Team project for **AI Yako, Own Your AI, the QVAC Hackathon**, hosted with **Node NBO** in Nairobi, **24 to 31 October 2026**.

**AI Yako** (Swahili for *"Your AI"*) is a one-week hackathon about building useful applications on **QVAC**, Tether's local AI stack. The AI runs on hardware you control, not in someone else's data center.

- **Hackathon page and submission portal:** https://dorahacks.io/hackathon/ai-yako/detail
- **Full researched details.** See [`docs/1.all-info.md`](docs/1.all-info.md)

---

## Project

| Field | Value |
|---|---|
| Project name | **TBD** |
| Track | **TBD**. Offline AI apps, Cloud to Pocket migration, or Offline-first finance |
| Team members | **TBD** (solo or up to 3 people) |
| One-line pitch | **TBD** |

## Hackathon Quick Facts

- **Dates.** Build from 24 to 30 Oct 2026. Submission deadline **Fri 30 Oct, 17:00 EAT (14:00 UTC)**. Demo day Sat 31 Oct at Node NBO, and remote entries are fully eligible.
- **Prize pool.** 3,500 USDt split across Overall best (1,500), Cloud to Pocket (900), Offline AI (700), and Offline-first finance (400).
- **Mandatory tech.** **QVAC** must power the core feature (`npm install @qvac/sdk`, Node.js 22.17 or newer, and it runs on a **physical device only**, no emulator). **WDK** (`@tetherto/wdk`) is required for the finance track. **Pears** is welcome for device-to-device features.
- **Disqualifier.** Using a cloud AI API for the core feature. AI processing must run locally.
- **Judging.** Real user value, meaningful QVAC integration, working implementation, usability, and clarity and reproducibility of the offline demo.
- **Submission is** a public repo, a **recorded offline demo video** (device visible in airplane or offline mode), QVAC integration notes, test device, OS and RAM, and a list of features that use the network. A Luma RSVP is **not** a submission. Submit on DoraHacks.

## Repository Layout

```
.
├── README.md               you are here
├── CONTRIBUTING.md         team workflow during build week
├── CODE-OF-CONDUCT.md      community standards
├── SECURITY.md             vulnerability reporting and secrets policy
├── LICENSE
└── docs/
    ├── 1.all-info.md       complete hackathon research (rules, tracks, stack, links)
    ├── 2.problem.md        problem statement
    ├── 3.research.md       solution research and prior art
    ├── 4.solution.md       solution design
    └── 5.build.md          build log and implementation notes
```

## Submission Checklist

- [ ] Repo is public and shows QVAC powering the core feature (no cloud AI APIs)
- [ ] README documents setup, usage, QVAC integration, and demo steps
- [ ] Offline demo video recorded (device in airplane or offline mode, in one continuous take)
- [ ] Test device, OS, and memory listed
- [ ] Features that use the network (and why) listed
- [ ] Pre-existing and third-party code disclosed and credited
- [ ] No secrets, customer data, or credentials committed
- [ ] Build submitted on DoraHacks **before Fri 30 Oct, 17:00 EAT**. Upload early and verify every link

## Key Links

- Hackathon (DoraHacks) at https://dorahacks.io/hackathon/ai-yako/detail
- Event updates (Luma) at https://luma.com/tv34ngtp
- QVAC at https://qvac.tether.io/ and docs at https://docs.qvac.tether.io/
- WDK at https://wdk.tether.io/
- Pears at https://pears.com/ and docs at https://docs.pears.com/
- Node NBO at https://nodenbo.com/
