# AI Yako. Own Your AI

Solo project for **AI Yako, Own Your AI, the QVAC Hackathon**, hosted with **Node NBO** in Nairobi, **24 to 31 October 2026**.

**AI Yako** (Swahili for _"Your AI"_) is a one-week hackathon about building useful applications on **QVAC**, Tether's local AI stack. The AI runs on hardware you control, not in someone else's data center.

- **Hackathon page and submission portal:** https://dorahacks.io/hackathon/ai-yako/detail
- **Full researched details.** See [`docs/1.all-info.md`](docs/1.all-info.md)

---

## Project

| Field          | Value                                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project name   | **Yako**                                                                                                                                                             |
| Track          | **Track 1, Offline AI apps**                                                                                                                                         |
| Participant    | **Solo** (one builder)                                                                                                                                               |
| Demo device    | **Apple Silicon Mac** (arm64, 16 GB RAM, macOS 27). Android documented as the deployment target                                                                      |
| One-line pitch | **Yako is a translator that lives entirely on your device. It hears English and Swahili, translates between them, and speaks back, with the internet switched off.** |

## Demo Video

**Watch the offline demo.** [demo/Yako-Demo-Final.mp4](demo/Yako-Demo-Final.mp4)

One continuous take. The header badge flips from Online to Offline, and Yako keeps translating and speaking between English and Swahili with the network off. Narration, captions, and music are produced locally with OpenMontage.

## Hackathon Quick Facts

- **Dates.** Build from 24 to 30 Oct 2026. Submission deadline **Fri 30 Oct, 17:00 EAT (14:00 UTC)**. Demo day Sat 31 Oct at Node NBO, and remote entries are fully eligible.
- **Prize pool.** 3,500 USDt split across Overall best (1,500), Cloud to Pocket (900), Offline AI apps (700), and On-device agentic finance (400).
- **Mandatory tech.** **QVAC** must power the core feature (`npm install @qvac/sdk`, Node.js 22.17 or newer, and it runs on a **physical device only**, no emulator). **WDK** (`@tetherto/wdk`) is required for the finance track. **Pears** is welcome for device-to-device features.
- **Disqualifier.** Using a cloud AI API for the core feature. AI processing must run locally.
- **Judging.** Real user value, meaningful QVAC integration, working implementation, usability, and clarity and reproducibility of the offline demo.
- **Submission is** a public repo, a **recorded offline demo video** (device visible in airplane or offline mode), QVAC integration notes, test device, OS and RAM, and a list of features that use the network. A Luma RSVP is **not** a submission. Submit on DoraHacks.

## Setup

Requirements. Node.js 22.17 or newer and npm. One-time internet access to download the models. After setup the app runs fully offline.

```bash
npm install
npm run build
npm run setup   # one-time, downloads 6 models (about 2.1 GB)
npm start       # serves the app at http://localhost:4173
```

`npm run setup` downloads and verifies every model before it reports success. Open http://localhost:4173 in a browser, allow microphone access for the voice path, and switch the network off. The app keeps working.

## Usage

- **Text.** Type a sentence and press Translate (or Cmd/Ctrl + Enter). Yako shows the translation and can speak it aloud.
- **Voice.** Press and hold the mic, speak, and release. Yako transcribes, translates, and speaks the reply in the other language.
- **Swap.** The arrow button flips the direction between English and Swahili.
- **Offline proof.** The header badge shows the device connectivity in real time and stays functional with the network off.

## QVAC Integration

Yako runs every stage of the pipeline on device through `@qvac/sdk`. No cloud AI API is used for any feature. Six models load into a single QVAC worker process and stay resident.

| Stage           | Model                              | Size   | Role                                    |
| --------------- | ---------------------------------- | ------ | --------------------------------------- |
| Translation     | TranslatePsy AfriSLM 0.8B (Q4_K_M) | 672 MB | English to Swahili and back (llama.cpp) |
| Speech to text  | Whisper tiny multilingual (Q8_0)   | 44 MB  | Transcribes spoken English and Swahili  |
| Voice activity  | Silero VAD 5.1.2                   | 1 MB   | Detects speech boundaries in the mic    |
| English voice   | Supertonic English TTS (Q8_0)      | 252 MB | Speaks the English translation          |
| Swahili voice   | Chatterbox T3 multilingual (Q4_0)  | 345 MB | Speaks the Swahili translation          |
| Swahili vocoder | Chatterbox S3GEN (Q4_0)            | 788 MB | Renders the Swahili waveform            |

Total model store is about 2.1 GB. Translation runs through the QVAC llama.cpp completion backend with greedy decoding, transcription through the QVAC Whisper streaming session with Silero VAD, and speech through the QVAC GGML text to speech engines. All calls are serialized on one in-process lock because the completion backend runs one job at a time.

## Performance on the Demo Device

Measured on an Apple M4, 16 GB RAM, macOS 27, with models warm. Cold figures include the one-time model load on first use.

| Operation                       | Warm               | Cold (first call) |
| ------------------------------- | ------------------ | ----------------- |
| App cold start to ready         | 2 to 4 ms          | 2 to 4 ms         |
| Text translation (round trip)   | 130 to 315 ms      | about 2.8 s       |
| Speech to text (short phrase)   | about 240 ms       | adds model load   |
| English voice (Supertonic)      | 66 to 120 ms       | about 0.6 s       |
| Swahili voice (Chatterbox)      | 5.3 to 7.9 s       | about 1.1 s load  |
| Memory with all models resident | about 1.0 GB total |                   |

The Swahili voice is the heaviest stage because Chatterbox is a larger two-model pipeline (T3 plus the S3GEN vocoder). Translation and English speech are fast enough to feel instant.

## Network Usage

The core translation, transcription, and speech features use **no network** and run entirely on device. The only network access in the project is the one-time `npm run setup` download of the model files. There are no analytics, no telemetry, and no external calls at runtime.

## Repository Layout

```
.
├── README.md               you are here
├── demo/                   offline demo video (Yako-Demo-Final.mp4)
├── CONTRIBUTING.md         build-week workflow and conventions
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
- [x] Offline demo video recorded (device in airplane or offline mode, in one continuous take)
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
