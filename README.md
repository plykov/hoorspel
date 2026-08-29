# Hoorspel

A Progressive Web App that turns authentic Dutch audio into structured listening-and-speaking lessons for English speakers.

**Live:** [plykov.github.io/hoorspel](https://plykov.github.io/hoorspel/)

Install it, pick a clip from the shelf, or import your own recording. Trim to the span that matters, get a disfluency-preserving transcript, then practise with dictation, gap-fill, a speed ladder, shadowing, role-play, free production, word order, and an FSRS review queue that keeps the original audio on every card.

## Features

- Curated shelf of licence-cleared everyday Dutch dialogue, filterable by level, length, speakers, setting, speed and licence
- Line-by-line listen, a 0.75× → 1.0× → 1.25× speed ladder, then a comprehension check
- Shadowing with a 0.75× → 1.0× → speak ladder, waveform comparison, and role-play (you answer as the other speaker)
- Free production that must use at least two target words from the clip
- Import from file, in-app recording, subtitles (.srt/.vtt), direct media URL, or the OS share sheet (Web Share Target)
- After transcribe: karaoke check — tap a word to hear it in the recording, hold to correct
- Client-side trim, speech-energy check, and EU / on-device / fastest residency choice
- Automatic Dutch transcription in the browser (Whisper) — first use downloads a speech model, then it stays on the device; cloud STT is used when a server is present
- Word-aligned transcript with disfluencies kept on purpose
- Constrained lesson generation with span, lexicon, and answer-key validators
- Offline review: imported audio is mirrored into Cache Storage
- Attribution packs and licence lines rendered from each clip’s provenance

## Hosting

The app is a static SPA on [GitHub Pages](https://plykov.github.io/hoorspel/). Source lives on `main`; the published site is the `gh-pages` branch. Progress and imported clips live on the device (IndexedDB + Cache Storage). There is no account layer in this tree.

## Develop

Node 22+.

```bash
npm install
npm run dev
```

`npm run build:pages` produces the GitHub Pages output in `.output/public`. `npm run typecheck` is the TypeScript gate.

## Licence

Application source is yours as published in this repository. Shelf clips carry their own licence (CC-BY, GPLv2/IFADV, and so on) — the app renders that on every playback and export surface and does not relicense the audio.
