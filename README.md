# Hoorspel

A Progressive Web App that turns authentic Dutch audio into structured listening-and-speaking lessons for English speakers.

**Live:** [plykov.github.io/hoorspel](https://plykov.github.io/hoorspel/)

Install it, pick a clip from the shelf, or import your own recording. Trim to the span that matters, get a disfluency-preserving transcript, then practise with dictation, gap-fill, shadowing, word order, and an FSRS review queue that keeps the original audio on every card.

## Features

- Curated shelf of licence-cleared everyday Dutch dialogue
- Import from file, in-app recording, direct media URL, or the OS share sheet (Web Share Target)
- Client-side trim, speech-energy check, and EU / on-device / fastest residency choice
- Word-aligned transcript with disfluencies kept on purpose
- Constrained lesson generation with span, lexicon, and answer-key validators
- Offline review: imported audio is mirrored into Cache Storage
- Attribution packs and licence lines rendered from each clip’s provenance

## Hosting

The app is a static SPA on [GitHub Pages](https://plykov.github.io/hoorspel/). Pushes to `main` build and deploy via `.github/workflows/pages.yml`. Progress and imported clips live on the device (IndexedDB + Cache Storage). There is no account layer in this tree.

## Develop

Node 22+.

```bash
npm install
npm run dev
```

`npm run build:pages` produces the GitHub Pages output in `.output/public`. `npm run typecheck` is the TypeScript gate.

## Licence

Application source is yours as published in this repository. Shelf clips carry their own licence (CC-BY, GPLv2/IFADV, and so on) — the app renders that on every playback and export surface and does not relicense the audio.
