# HOORSPEL — Adjudicated Scope & Research Document

**A Progressive Web App that turns authentic Dutch audio and video into structured listening-and-speaking lessons for English-speaking learners**

| | |
|---|---|
| **Document version** | 2.0 — 28 August 2026 (supersedes v1.0) |
| **Status** | Adjudicated merge of three independent scopes, ready for build decision |
| **Sources merged** | **Draft A** "Dutch Dialogue Lab" · **Draft B** "DutchDialogue PWA" · **Draft C** "Hoorspel v1.0" |
| **Prepared for** | Pavel Lykov |
| **What is new in 2.0** | A claims audit of all three drafts (§1), six corrected factual errors, a real Dutch conversational WER datapoint, EU data-residency and attribution as first-class features, an explicit trim/validation stage, and a worked demonstration of why lesson output needs machine validation |

---

## 0. How to read this document

Sections 1–2 **adjudicate**: what the three drafts claimed, which claims survive checking, and what the merged position is. Sections 3–9 are the **scope**. Sections 10–14 are **execution**.

**Confidence markers are load-bearing and used throughout:**

- **[Verified]** — checked against a primary source during this pass; linked in §14.
- **[Reported]** — a vendor or secondary claim found but not independently validated.
- **[Assumption]** — inference or design judgement, not fact. Each names what would falsify it.
- **[Unresolved]** — a question that materially affects the build and has no answer yet (collected in §13).
- **[Corrected]** — a claim in Draft A or B that checking showed to be wrong or misleading.

Two conventions from the source drafts have been deliberately dropped. First, **opaque citation tokens**: Draft B cites everything as `【turn2fetch0】`, `【turn0search11】` and similar. Those are internal tool references with no resolvable target, so a reader cannot check a single claim in that document. Every source in this version is a URL. Second, **fabricated illustrative content**: §9 uses strict placeholders only, for reasons §1.3 makes uncomfortably concrete.

---

## 1. Adjudication of the three drafts

### 1.1 What the three drafts are

| | **Draft A — "Dutch Dialogue Lab"** | **Draft B — "DutchDialogue PWA"** | **Draft C — "Hoorspel v1.0"** |
|---|---|---|---|
| **Shape** | Short executive brief | Long conventional scope document | Long scope document with confidence markers |
| **Strongest at** | Build sequencing; treating licence gating, attribution and ASR-residency choice as features; a real shortlist of Dutch-specialist ASR | Concrete UI surface: trimming, codec matrix, client-side validation, export/share, curation packs, per-item Europeana rights handling | Source-register analysis; legal blockers; the deterministic-detection / constrained-generation split; validation gates; unit economics |
| **Weakest at** | Asserts the YouTube CC path is usable in-app without testing it against platform terms; no validation of generated output; sources not enumerated | Several load-bearing factual errors; a sample lesson containing fabricated Dutch; unresolvable citations; SM-2 and fixed intervals; recogniser confidence mistaken for pronunciation feedback | Under-specified on the intake UI (no trim stage, thin codec/validation detail); no data-residency treatment; no attribution-pack concept |
| **Missed entirely** | IFADV; speaker privacy; cost model; forced alignment | IFADV; the register problem with heritage archives; output validation; cost model | Trimming; EU residency; Dutch-specialist ASR vendors; the disfluency insight |

All three converge on the same skeleton — two intake paths, one pipeline, editable lesson, practice plus SRS — which is reassuring. They diverge on exactly the questions that decide whether the thing works.

### 1.2 Claims audit

| # | Claim | From | Verdict | Evidence |
|---|---|---|---|---|
| C1 | CC-licensed YouTube (`videoLicense=creativeCommon`) is usable as an in-app clip source | A, B | **Rejected [Corrected]** | YouTube API Services Developer Policies prohibit clients from "download, import, backup, cache, or store copies of YouTube audiovisual content without YouTube's prior written approval" and from making content available offline; API data retention is capped at 30 days **[Verified]**. Draft B's own mitigation — embed the player, keep only metadata — does not rescue the feature, because the pipeline needs the *soundtrack* to transcribe. An embed you may not extract audio from cannot feed an ASR stage. See §3.2.1 |
| C2 | Azure pronunciation assessment does not yet support Dutch ("once Dutch is supported") | B | **Rejected [Corrected]** | `nl-NL` is present in Azure's pronunciation-assessment locale table **[Verified]**. This removes the need for SpeechAce/SpeechSuper as the default and changes the speaking module's build order. Feature-level support per locale (prosody, content assessment) remains undocumented **[Unresolved]** |
| C3 | Open Beelden / Europeana are strong sources for *everyday dialogue* | A, B | **Partly rejected [Corrected]** | Both are correctly described as openly licensed with usable APIs **[Verified]**. But they are heritage archives: newsreels, documentaries, oral history, institutional film. Register is narration and interview, not everyday conversation. They belong in the catalogue as *cultural* and *advanced-listening* material, not as the everyday-dialogue backbone. Draft B's "often contain everyday speech" is optimistic **[Assumption]** |
| C4 | Common Voice and Spoken Wikipedia are usable in-app clip sources | A | **Rejected for lessons, accepted for other uses** | Both are read-aloud speech: Common Voice is prompted sentences (CC0) **[Verified]**; Spoken Wikipedia is encyclopedia prose read aloud. Neither is dialogue. Listing them under "usable in-app" for a product about *everyday dialogue* is a register error. Keep Common Voice as ASR benchmark and pronunciation reference |
| C5 | CGN is licence-restricted and unusable as a consumer clip library | A, B | **Accepted, with a correction** | Correct that a signed licence is required and commercial terms are separate **[Verified]**. But both drafts under-rate it: CGN is 900 hours including spontaneous conversation **[Verified]** and is the single highest-value asset in the field. "Useful later for ASR fine-tuning" understates it — the licence conversation should start in week one, not later |
| C6 | Whisper "Dutch is in the higher-accuracy tier" / large-v3 shows strong WER | B | **Unsupported as stated** | The Open ASR Leaderboard's multilingual track currently benchmarks five languages and Dutch is not among them **[Verified]**; ElevenLabs publishes per-language figures for English and Italian, not Dutch **[Verified]**. Where Dutch figures exist they are on **read** speech (FLEURS, Common Voice), which is the easy case. Draft B's claim is a plausible inference presented as a finding |
| C7 | Dutch-specialist ASR exists and is worth shortlisting: Groq Whisper turbo, Juvoly, Murmel, `whisper-large-v3-ft-nl`, `whisperd-nl` | A | **Accepted, and upgraded** | All five are real **[Verified]**. Groq serves `whisper-large-v3-turbo` **[Verified]**; Juvoly is a Dutch ASR company (clinical domain) that publicly claims to beat Whisper on Dutch **[Reported]**; Murmel is a Dutch model from The AI Factory marketed on EU hosting and a v2 accuracy improvement **[Reported — the specific figures are not published on the page checked]**. Draft A's best single contribution. See C8 |
| C8 | `whisperd-nl` is a Dutch Whisper variant worth using | A | **Accepted, and it is more important than Draft A realised** | It is `whisper-large-v3` fine-tuned on CGN to tag **disfluencies, speakers and non-speech events**, MIT-licensed, reporting **WER 16.42 on the CGN test set** **[Verified]**. Two consequences: (a) this is the only *conversational* Dutch WER datapoint any of the three drafts surfaced; (b) a disfluency-*preserving* model is pedagogically superior here — see §3.4.3 |
| C9 | SM-2–style scheduling with 1/3/7/14-day intervals | B | **Rejected** | Fixed intervals are not spaced repetition, they are a fixed ladder. FSRS-6 (`ts-fsrs`, client-side, open) supersedes SM-2 **[Verified]**, and is already the scheduler in the adjacent `plykov/Nederlands` scope. Using SM-2 here would be a deliberate regression |
| C10 | Use ASR recogniser confidence as pronunciation feedback ("highlight words with low confidence") | B | **Rejected on method** | A recogniser is trained to be *robust* to accent — it normalises away exactly the deviations a learner needs flagged, and its confidence also drops on noise, rare words and fast speech. Low confidence is a weak, confounded proxy for mispronunciation. Use a purpose-built assessor (Azure `nl-NL`) or forced-alignment GOP scoring **[Assumption, strongly held]** |
| C11 | Web Speech API is a suitable Dutch "speak and check" engine | B | **Accepted narrowly** | Fine for a lightweight "did you say roughly the right words" check. Not a pronunciation scorer (C10), availability varies by browser, and in Chrome it is a network service — which conflicts with the offline-first and residency positions taken elsewhere in the same document |
| C12 | Whisper's native word-level timestamps are sufficient for click-to-hear and dictation | B (implied) | **Insufficient** | Whisper's own word timings drift. Forced alignment (WhisperX, wav2vec2-based) is the standard fix and also supplies diarization **[Verified]**. Word-level alignment is a hard requirement, not a nice-to-have, because four exercise types depend on it |
| C13 | Licence gating, attribution packs and user-chosen ASR provider/residency are product features, not afterthoughts | A | **Accepted and adopted** | The strongest framing in any of the three drafts. Adopted as F9 and F10 in §4 |
| C14 | Freeze the lesson JSON schema and review UI on fixture transcripts before wiring ASR | A | **Accepted and adopted** | Better first step than Draft C's "vertical slice", because it decouples the two hardest unknowns. Adopted as step 1 of the roadmap (§12) |
| C15 | Start from a small manually curated set of clips before automating sourcing | A, B, C | **Accepted — all three agree** | Adopted: a static shelf of ~50 cleared items ships before any live multi-source search |
| C16 | The generated sample lesson demonstrates the output format | B | **Rejected — it demonstrates the opposite** | See §1.3 |

### 1.3 The sample lesson is the argument for validation gates

Draft B's §6 is a worked example of the failure mode this product exists to avoid. The brief asked for placeholder content; Draft B instead generated authentic-looking Dutch and annotated it. Six defects in roughly twelve lines, all of which a reader without Dutch would accept:

**1. A fabricated word, then glossed.** The transcript contains *"mag ik ook een zakij met appelkoek?"*. **`zakij` is not a Dutch word.** The intended form is `zakje` (a small bag). The vocabulary list then confidently glosses it: *"een zakij – a bag (colloquial)"* — a non-existent lexeme given an invented register label. A learner would memorise it.

**2. A grammar point citing text that is not there.** Grammar rule 3 explains: *"Pronominal adverb: 'er' in 'er ook nog iets anders' …"*. The transcript line is *"Wil je ook nog iets anders?"* — **there is no `er` anywhere in the transcript.** The explanation analyses a span the source does not contain. This is precisely what a verbatim-span check catches, in one line of code.

**3. A grammar point analysing an ungrammatical sentence.** Rule 2 illustrates verb-second with *"Ik zou graag twee bruine broden … [verb]"* — and the trailing `[verb]` is the generator half-noticing that the sentence has no main verb. Standard Dutch needs *"Ik zou graag … willen hebben"* or *"Ik wil graag …"*. The rule is correct; the evidence for it is broken.

**4. An answer key that contradicts its own transcript.** The order totals €8.50, the customer pays €10, the transcript says *"En vijftig cent terug"* (fifty cents back), and the comprehension answer says *"receives 1.50 euros change"*. Three mutually inconsistent numbers in one exercise.

**5. Idioms that are not idioms.** *"Wat wil je graag?"* is presented as a phraseological unit with a literal gloss (*"What do you want gladly?"*), and *"Natuurlijk"* is listed as an idiom. The first is an ordinary question — and not what a Dutch baker says (*"Zegt u het maar"*, *"Wie mag ik helpen?"*, *"Wat mag het zijn?"*); the second is an adverb. Neither survives a non-compositionality test: if a word-by-word gloss reproduces the meaning, it is not an idiom.

**6. Register incoherence presented as a cultural observation.** The exchange mixes `je`/`jij` with `alstublieft` and `u`-flavoured politeness, and the cultural note then *explains* the informal register as though it were an observed property of authentic speech. It is an artefact of the generator describing its own output.

**The root cause is structural, not stylistic.** The generator invented the transcript, so nothing anchored the annotations to a real text. In production the transcript comes from ASR on real audio — but the same unconstrained generator, given a real transcript, will invent glosses, cite absent spans and mis-score answers in exactly these proportions. Every one of the six defects is caught by a mechanical check that costs nothing to run (§7.3). None is caught by "review the prompt output carefully".

This is why v2.0 keeps the three-layer architecture and hardens it, and why §9 uses strict placeholders.

### 1.4 What each draft contributed to the merge

**From Draft A (adopted):** schema-first sequencing; the ~50-item static shelf before live search; licence gating and attribution packs as features; user-controlled ASR provider and EU data residency; the Dutch-specialist ASR shortlist; the disfluency-preserving model insight (elevated from a footnote to a design principle); meaning-first-then-form-in-context pedagogy.

**From Draft B (adopted):** the explicit trim stage (30–120 s selection) as a first-class pipeline step; the browser codec matrix for playback; cheap client-side validation (audio-track presence via `loadedmetadata`, RMS speech-energy probe) folded into the ingest gates; curation packs and topic chips; Europeana `reusability=open` plus per-item `edm:rights` inspection; per-lesson CEFR estimate; lesson export and read-only share (with licence constraints attached).

**From Draft C (retained):** IFADV as the seed corpus; the register analysis of open sources; the YouTube legal blocker; the deterministic-detection / constrained-generation / validation split; the G1–G12 rule bank targeting English-L1 failure modes; the ASR benchmark harness with an acceptance gate; unit economics; speaker privacy; engine reuse across the Dutch, Italian and Russian-L1 scopes.

**Added in adjudication (in none of the three):** the claims audit itself; the corrected Azure position; the `whisperd-nl` conversational WER datapoint; disfluency preservation as pedagogy; the mapping of Draft B's six lesson defects onto specific validation gates (§7.3); the residency-versus-accuracy tension in ASR selection.

### 1.5 The synthesis principle

Where the drafts disagreed, the tie-break was: **which position survives being tested?** Draft A's YouTube claim does not survive reading the terms. Draft B's Azure claim does not survive reading the locale table. Draft B's sample lesson does not survive being read by someone who speaks Dutch. Draft C's "no Dutch conversational WER exists" does not survive Draft A's model list. Every surviving claim in this document names the test it passed, or is marked as an assumption with the test that would break it.

---

## 2. Executive summary

### 2.1 The product in one paragraph

Hoorspel is an installable PWA with two equal intake paths into one pipeline. A learner either picks a short piece of everyday spoken Dutch from a curated, licence-cleared shelf inside the app, or imports their own audio/video. They trim to the 30–120 seconds that matter. The app transcribes with speaker-attributed, word-aligned output that **keeps** the hesitations and false starts; runs a deterministic Dutch linguistic analysis; then lets an LLM, constrained by that analysis and checked by seven validators, write the lesson — glossed vocabulary, the two or three grammar points the clip actually demonstrates, the chunks and modal particles that make it sound native, cultural notes. The learner reviews and corrects. Then they practise: dictation and gap-fill on the real audio, shadowing with pronunciation scoring, and an FSRS queue built from the clip's own language, with the original audio attached to every card.

### 2.2 The eight decisive calls

**1. No live web-wide media search. A curated pre-cleared shelf plus user import.**
The intersection of "everyday spontaneous Dutch dialogue" and "licence permitting download, storage and derivative processing" is thin, and the largest apparent source is closed by platform terms rather than copyright (§3.2.1). All three drafts independently reached the "curate first" conclusion; v2.0 makes it permanent for v1 rather than a staging step. *Changed by:* a licensed content partnership with a broadcaster or NT2 publisher.

**2. Cut YouTube entirely from the ingest path. Link out only.** [Corrected from Drafts A and B]
Not a risk to manage — a feature that cannot be built as specified. See C1 and §3.2.1.

**3. Seed with IFADV; grow with commissioned recordings; open the CGN conversation now.**
IFADV is 20 × 15-minute spontaneous face-to-face Dutch conversations with video, under GPLv2 **[Verified]** — five hours, enough for 60–80 lessons, and the only openly licensed source found that is *actually* everyday dialogue. Commissioned native-speaker pairs are cheaper and cleaner than any scraping strategy. CGN has a long licence lead time; start it in week one.

**4. Benchmark Dutch conversational ASR before choosing an engine — and shortlist the Dutch specialists.**
There is now exactly one public conversational datapoint: `whisperd-nl` reports **WER 16.42 on the CGN test set** **[Verified]**. That is a floor to beat, not a number to trust for other systems. Run Whisper large-v3 via WhisperX, `whisperd-nl`, Groq turbo, Murmel and one hosted API against a 90-minute in-house Dutch test set before committing (§3.4.4).

**5. Preserve disfluencies. Do not clean the transcript.** [New in v2.0]
Draft B's pipeline implicitly aims at a tidy transcript. For this product that is backwards: `eh`, repairs, false starts, overlaps and reductions are *the thing the learner cannot hear*. A model that tags them (`whisperd-nl`) turns them into teachable content. Clean transcripts are for subtitles; this is a listening trainer.

**6. Constrain the LLM with deterministic detection, then validate mechanically.**
Detection and explanation are different machines, and the explainer may only speak about what the detector found. §1.3 is the empirical case; §7 is the design.

**7. Make licence gating, attribution and data residency product features.** [Adopted from Draft A]
Every clip carries a licence object the UI renders; every export carries an attribution pack; the learner chooses whether their audio goes to an EU-hosted or a US-hosted recogniser, or stays on the device. In a Dutch/EU consumer product this is a differentiator, not compliance overhead.

**8. Optimise for the phenomena English speakers actually fail on.**
V2 and verb-final order, separable verbs, `de`/`het`, `er`, and modal particles (`even`, `nou`, `toch`, `maar`, `hoor`, `eens`). Authentic dialogue is saturated with these and textbooks under-serve them.

### 2.3 What this is not

Not a course or a tutor replacement. Not an NT2/inburgering exam product (different scope, different content obligations — though the adjacent `plykov/Nederlands` work covers that). Not a media library users can redistribute. Not a subtitle generator.

---

## 3. Research findings

### 3.1 Source inventory

Ordered by fitness for the actual requirement — everyday spoken dialogue, openly licensed, processable.

| Source | What it is | Register | Volume (Dutch) | Licence | Verdict |
|---|---|---|---|---|---|
| **IFA Dialog Video corpus (IFADV)** | 20 unscripted 15-min face-to-face conversations between friends, relatives and long-time colleagues; video + audio + annotations | **Everyday spontaneous dialogue** | ~5 hours | GPLv2 **[Verified]**; maintainers warn publishing may separately engage privacy and reputation law **[Verified]** | **Primary seed corpus.** The only openly licensed source found that is genuinely on-target. Missed by Drafts A and B |
| **Commissioned recordings** | Paid native-speaker pairs recording unscripted everyday scenes to a brief | **Exactly on target** | As funded | Owned outright, or released CC-BY by choice | **The scalable answer.** ~€40–80 per usable 3-minute scene **[Assumption]** |
| **Corpus Gesproken Nederlands (CGN)** | The reference corpus of contemporary spoken Dutch: spontaneous conversation, phone calls, interviews, broadcast, read speech | Mixed, incl. spontaneous | 900 hours / ~9M words **[Verified]** | Free download after a signed licence; commercial licence separate via INT; annotations-only variant without audio **[Verified]** | **Negotiate from week one.** Also the training set behind the best Dutch ASR fine-tunes (§3.4.3) |
| **Open Beelden / Open Images** (Sound & Vision) | Dutch AV heritage: newsreels, documentaries, institutional film | Narration and archive interview — **not everyday dialogue** [C3 Corrected] | Thousands of items | All items CC or public domain; OAI-PMH (`oai_dc`, `oai_oi` with CC REL) and Atom feeds; 100-record pagination **[Verified]** | **Secondary.** Excellent for cultural and advanced-listening material. The API is genuinely good and easy to harvest |
| **Europeana** | Aggregated EU cultural heritage incl. audio and video, some Dutch oral history | Archive and interview | Variable | Per-item rights statements; Search API supports `reusability` filtering; inspect `edm:rights` per item **[Verified]** | **Secondary**, same register limits. Draft B's per-item rights handling is the correct approach |
| **CLARIAH / `asr_nl` Dutch ASR webservice** and the open Dutch speech-recognition community | Open Dutch ASR tooling and services, incl. Frisian-Dutch | n/a — tooling | n/a | Open **[Verified]** | **Tooling, not content.** Worth benchmarking; the Frisian-Dutch work matters if regional coverage becomes a goal |
| **YODAS / YODAS2 (ESPnet)** | YouTube videos carrying CC licences, with manual or automatic captions, redistributed as a dataset | Mixed; some vlog and conversation | nl000 (manual captions) **413.0 h**; nl100 (automatic) **2,490.1 h** **[Verified]** | CC-BY-3.0, with a takedown mechanism acknowledging imperfect verification **[Verified]** | **The compliant route to YouTube-origin material** — because the copies already exist as a dataset rather than being fetched from YouTube. Per-clip attribution; verify licence per video ID; expect editorial rejection rates above 50% on register grounds **[Assumption]** |
| **Mozilla Common Voice (nl)** | Volunteers reading prompted sentences | **Read**, single speaker | Substantial, growing **[Reported]** | CC0 **[Verified]** | **Not lesson material** [C4]. Ideal as ASR benchmark stratum and pronunciation reference audio |
| **Spoken Wikipedia (Gesproken Wikipedia)** | Encyclopedia articles read aloud | **Read** expository prose | Modest **[Assumption]** | CC BY-SA | **Not lesson material** [C4]. Draft A listed it as usable in-app; it is the opposite of everyday dialogue |
| **Multilingual LibriSpeech (nl)** | LibriVox audiobook readings | **Read** literary prose | ~1,500 h **[Reported]** | CC-BY 4.0 **[Reported]** | ASR benchmarking only |
| **VoxPopuli (nl)** | European Parliament plenary speech | Formal monologue | Large **[Reported]** | CC0 **[Reported]** | Wrong register entirely |
| **Internet Archive** | Mixed CC/PD audio and video | Archival, radio, spoken word | Variable | Per-item | **Long tail.** Manual vetting only |
| **Openverse** | CC-media search across sources | Audio holdings are dominated by music and sound effects | Near-zero Dutch dialogue **[Assumption]** | Per-item CC | **Not worth an integration** [Draft A over-rated it] |
| **Wikimedia Commons** | Community media incl. some spoken Dutch | Mixed, sparse | Small | CC-BY-SA / PD | Long tail; useful for isolated pronunciation samples |
| **YouTube (live, via Data API)** | CC-filtered search | Mixed | Large | CC BY on the video record | **Excluded.** See §3.2.1 [C1 Corrected] |

**The honest conclusion, unchanged from v1.0 and now stress-tested against two other drafts:** there is no large open pool of everyday conversational Dutch waiting to be indexed. IFADV is five hours. CGN is the prize and needs a licence. Everything else is the wrong register, the wrong licence, or both. **User import is therefore the volume path and the shelf is the quality path** — which is why v2.0 gives import a proper trim stage and validation UI rather than treating it as the secondary flow.

### 3.2 Legal and licensing

#### 3.2.1 Why the YouTube path is closed [C1 — Corrected from Drafts A and B]

Draft A lists CC-licensed YouTube under "usable in-app". Draft B proposes using `videoLicense=creativeCommon` with `relevanceLanguage=nl`, showing an inline player and persisting "only metadata + thumbnail … to respect licensing". Four separate problems:

1. **The policies forbid the copy.** Clients may not "download, import, backup, cache, or store copies of YouTube audiovisual content without YouTube's prior written approval", nor make content available for offline playback; API data must not be retained beyond 30 days **[Verified]**. This is contractual and independent of the CC licence on the video: the licence permits copying, the platform terms do not permit obtaining the copy this way. Fetching outside the API breaches the site terms equally.
2. **The mitigation does not reach the requirement.** An embedded player gives you playback, not audio you may extract. The entire product depends on transcribing the soundtrack. Draft B's design is internally inconsistent at exactly this join — and the inconsistency is invisible unless you trace the data flow from the embed to the ASR stage.
3. **The licence signal is unreliable at the item level.** YouTube's CC option is an uploader-set flag covering the video as uploaded; uploaders routinely mis-set it, and they cannot relicense third-party music or footage inside their video. Both drafts acknowledge per-item vetting is needed; neither notes that this makes the source unscalable, since vetting is a human judgement about rights the platform does not expose.
4. **Offline-first is incompatible with it.** All three drafts want cached lessons and media for offline study. Offline playback is explicitly out.

**Decision: no YouTube in the ingest path in any tier.** The app may link out. YODAS is the compliant route to a subset of the same material, with per-clip attribution and the honest caveat that YODAS's own licence verification is imperfect **[Verified]**.

#### 3.2.2 Licence obligations the app must implement

| Licence | Obligation in the product |
|---|---|
| **CC0 / public domain** | Nothing required. Attribute anyway |
| **CC-BY** | Creator, title, source link, licence name and link on every screen that plays the clip and in every export |
| **CC-BY-SA** | As above, plus: a derivative embedding substantial clip content may need a compatible licence. **Design consequence:** keep lesson text structurally separable from clip content; mark SA items so exports carry the right notice and so the read-only share link renders it |
| **GPLv2 (IFADV)** | Unusual for media. Attribution plus source availability; distribute the clip unmodified, link to source, claim no exclusivity over derived transcripts |
| **CGN (signed licence)** | Whatever the executed agreement says. Ship nothing CGN-derived until commercial terms exist — **including model weights fine-tuned on it** (§3.4.3) |
| **YODAS items** | Per-clip CC-BY attribution; retain the video ID and licence record; honour takedowns |
| **User imports** | The user warrants their right to process the file. Private by default, never surfaced in shelf or shared views |

**Attribution packs** [adopted from Draft A]: every lesson, export and share link carries a machine-generated attribution block assembled from the item's `provenance` object. It is never hand-written, and a lesson whose provenance is incomplete cannot be exported. This is a validator, not a convention (§7.3, gate 7).

#### 3.2.3 Exceptions — a backstop, not a foundation

Quotation (Auteurswet art. 15a), the educational exception (art. 16 and the DSM digital-teaching provisions), and text-and-data-mining (DSM arts. 3–4) are all relevant and none is a licence to build a catalogue **[Assumption — obtain Dutch IP counsel]**. TDM may cover *analysis* of lawfully accessed material; it does not authorise *redistribution* to learners. Treat exceptions as defensive cover for private per-user processing of user-supplied files. Budget a short written opinion before launch.

#### 3.2.4 Voice as personal data [absent from Drafts A and B]

Corpus speakers are identifiable people; the IFADV maintainers flag privacy and reputation risk explicitly **[Verified]**; GDPR treats voice recordings as personal data. Consequences: no feature that isolates and republishes a named speaker; a documented takedown path; consent-and-release templates for commissioned recordings; and, for user imports, the residency choice in §3.4.5 — because a learner uploading a recording of a real conversation is uploading someone else's voice too.

### 3.3 Ingest: formats, trimming, metadata, validation

#### 3.3.1 Accepted inputs

| Category | Formats |
|---|---|
| **Audio** | MP3, M4A/AAC, WAV/PCM, FLAC, OGG/Vorbis, Opus, WebM/Opus |
| **Video** | MP4/H.264+AAC, MOV, WebM/VP9+Opus, MKV, AVI, OGV/Theora |
| **Subtitles (optional)** | SRT, VTT, TTML — used as an alignment prior and an accuracy check, never trusted blindly |
| **Links** | Direct media URLs and shelf IDs only. Not platform pages |

**Playback targets** [adopted from Draft B]: MP4 (H.264 + AAC) and WebM (VP9 + Opus) cover browsers reliably; transcode anything else on ingest and keep the original. **ASR target:** 16 kHz mono PCM. `ffmpeg` server-side; `ffmpeg.wasm` for the on-device path.

#### 3.3.2 The trim stage [adopted from Draft B — absent from Draft C]

A first-class pipeline step, not a nicety. Long media is where cost, latency and lesson quality all go wrong at once. The app proposes scene boundaries automatically (pause length + speaker change + topic shift) and the user confirms or drags a 30–120 second window on a waveform. Everything downstream operates on the trimmed span, and the untrimmed source is retained for re-cutting.

Why it matters more than it looks: a 12-minute podcast transcribed whole costs ~10× a trimmed scene, produces a lesson too big to study, and buries the two grammar points worth teaching. Trimming is the single cheapest quality lever in the product.

#### 3.3.3 Validation gates

| Gate | Rule | Where |
|---|---|---|
| Audio track present | `loadedmetadata` reports an audio track **[Draft B]** | Client, instant |
| Speech energy | RMS amplitude probe shows plausible speech **[Draft B]** | Client, instant |
| Duration | Source ≤ 20 min; trimmed span 30 s – 5 min | Client |
| File size | ≤ 500 MB | Client |
| Language ID | Whisper language ID returns `nl` with confidence ≥ 0.7, else warn | Server, on a 20 s probe |
| Speech ratio | VAD-measured speech ≥ 40% of the trimmed span | Server |
| SNR probe | Below threshold → warn, offer denoising | Server |
| Speaker count | 1–6; above → warn | Server |
| Rights attestation | Required checkbox with plain-English text; shelf items pre-cleared | Client |

Running the first four client-side means most failures cost the user nothing and happen instantly — Draft B's best practical insight.

#### 3.3.4 Metadata

Read on ingest: container metadata (title, artist, date, duration, codecs), embedded chapters, embedded subtitle tracks; for shelf items, the full rights record (licence URI, creator, source URL, attribution string). **Strip location EXIF/GPS from user imports by default.** Persist a `provenance` object with every media item — every attribution surface and export renders from it, and an incomplete one blocks export.

### 3.4 Dutch speech recognition

#### 3.4.1 The evidence, corrected

Draft B asserts Dutch sits "in the higher-accuracy tier" for Whisper. That is a reasonable prior, not a finding, and the published record does not support it as stated [C6]: the Open ASR Leaderboard's multilingual track covers five languages, Dutch not among them **[Verified]**; ElevenLabs publishes English and Italian per-language figures, not Dutch **[Verified]**; independent comparisons report English WER and decline to break out Dutch **[Verified]**. Where Dutch numbers exist they are on read speech.

**What Draft A's model list adds is the missing datapoint.** `whisperd-nl` — `whisper-large-v3` fine-tuned on CGN to tag disfluencies, speakers and non-speech events — reports **WER 16.42 on the CGN test set**, MIT-licensed **[Verified]**. Two caveats keep this honest: a WER computed over output that includes disfluency and speaker tags is not directly comparable with clean-transcript WER, and CGN's test set spans registers from spontaneous conversation to read speech. It is nonetheless the first conversational-Dutch anchor any of the three drafts produced, and it sets a floor.

#### 3.4.2 Options

| Option | Strengths | Weaknesses | Role |
|---|---|---|---|
| **Whisper large-v3 self-hosted via WhisperX** | Word-level forced alignment and diarization **[Verified]**; cost-controlled at scale; full control; open weights | GPU ops; hallucination on silence; punctuation quirks | **Default engine** |
| **`whisperd-nl`** (MIT) | Disfluency, speaker and non-speech tagging built in; a real CGN WER of 16.42 **[Verified]**; pedagogically the right output shape (§3.4.3) | Trained on CGN — clear the licence question before shipping **[Unresolved]**; tags need parsing | **Strong candidate for default**, pending the benchmark |
| **Groq `whisper-large-v3-turbo`** | Very fast hosted inference **[Verified]**; good "first pass while the user waits" tier | US-hosted; turbo trades some accuracy for speed | **Fast tier** |
| **Murmel** (The AI Factory, NL) | Dutch-specific model marketed on EU hosting; v2 claims an accuracy gain **[Reported — figures not published on the page checked]** | Unverified accuracy; commercial terms unknown | **EU-residency tier candidate**; benchmark it |
| **Juvoly** (NL) | Dutch ASR company publicly claiming to beat Whisper on Dutch **[Reported]** | Clinical-domain focus; conversational-domain fit unknown | **Benchmark candidate** |
| **`whisper-large-v3-ft-nl`, `wav2vec2-large-xlsr-53-dutch`, other HF fine-tunes** | Often better on Dutch read speech **[Reported]** | Quality varies wildly; many trained on Common Voice only, so gains may not transfer to conversation | **Benchmark candidates** |
| **CLARIAH `asr_nl` / open Dutch ASR webservice** | Open, Dutch-community maintained, Frisian-Dutch variant exists **[Verified]** | Throughput and current accuracy unknown **[Unresolved]** | **Benchmark candidate**; possible non-commercial fallback |
| **ElevenLabs Scribe** | Word timestamps, diarization, audio-event tags incl. laughter, 99 languages **[Verified]** | No published Dutch WER; per-minute cost; US-hosted | **Premium fallback** |
| **Deepgram / AssemblyAI / Speechmatics / Google / Azure / Amazon** | Mature tooling, SLAs, diarization, streaming | Same Dutch evidence gap; cost; residency varies | **Benchmark candidates** |
| **In-browser Whisper** (transformers.js, WebGPU) | Audio never leaves the device; zero marginal cost **[Reported]** | Much weaker at `base`/`small`; slow on mid-range hardware; large model download | **Privacy mode** |

#### 3.4.3 Preserve the disfluencies [new in v2.0]

Draft A found `whisperd-nl` and filed it under "handles reductions/disfluencies". That undersells it. For a listening trainer, disfluency is not noise to be cleaned — it is a large part of what makes real speech unintelligible to a learner who has only heard textbook audio. A transcript that silently repairs *"ik eh… ik zou eigenlijk, nou ja, ik dacht"* into *"ik zou eigenlijk denken"* deletes the lesson.

So the pipeline **preserves** hesitation markers, repairs, false starts, overlaps and non-speech events, and the lesson surfaces them as content: a "how real speech is assembled" section alongside the grammar. This inverts Draft B's implicit goal of a tidy transcript, and it is one of the clearer differentiators available — every mainstream product optimises for clean subtitles.

Consequence for the LLM repair pass: it may fix punctuation, casing, obvious homophone errors and speaker attribution. It may **not** delete disfluencies, and it may not rewrite words the recogniser heard confidently. Raw and repaired transcripts are stored side by side; low-confidence spans are marked in the learner UI so nobody memorises a machine error.

#### 3.4.4 The benchmark harness — build this first

- **Test set:** ~90 minutes in three strata of ~30 min — (a) IFADV spontaneous dialogue, (b) clean single-speaker Dutch (Common Voice / MLS), (c) hostile-realistic: phone audio, street noise, a TV in the background. Human-corrected references.
- **Metrics:** WER and CER; **content-word WER** weighted toward the words a lesson would teach; diarization error rate; word-timestamp mean absolute error; disfluency-tag recall (for models that emit them); latency per audio-minute; cost per audio-hour; hosting region.
- **Acceptance gate [Assumption — set the numbers, then hold to them]:** conversational WER ≤ 20% (with `whisperd-nl`'s 16.42 as the reference floor), content-word WER ≤ 12%, word-timestamp MAE ≤ 120 ms. Below that, lessons built on the transcript are not trustworthy without human review.

#### 3.4.5 Residency as a user-facing choice [adopted from Draft A]

Three tiers, chosen per import and remembered as a preference:

| Tier | Route | Trade-off |
|---|---|---|
| **On device** | transformers.js Whisper, WebGPU | Nothing leaves the phone; weakest accuracy; slowest |
| **EU** | Self-hosted Whisper/`whisperd-nl` in an EU region, or Murmel | Full accuracy; data stays in the EU |
| **Fastest** | Groq turbo or a US hosted API | Lowest latency; data leaves the EU — stated plainly, not buried |

For a product whose users are mostly in the Netherlands and whose imports may contain third parties' voices, this is a genuine feature and a plain-language one: *"Where should your audio be processed?"*, not *"Select inference endpoint"*.

### 3.5 Alignment, segmentation, diarization

| Need | Tool | Note |
|---|---|---|
| Word-level timestamps | **WhisperX** forced alignment (wav2vec2) | Hard requirement [C12]. Click-a-word-to-hear-it, karaoke transcript, audio gap-fill and shadowing loops all depend on it. Whisper's native timings drift |
| Phone-level alignment | **Montreal Forced Aligner** with a Dutch model | Needed for phoneme-level pronunciation feedback **[Assumption on Dutch model quality — verify]** |
| Speaker turns | **pyannote.audio** (bundled in WhisperX); or `whisperd-nl`'s own `[S1]`–`[S4]` tags **[Verified]** | Two-speaker dialogue is reliable; 4+ degrades **[Reported]** |
| Voice activity | **Silero VAD** | Speech-ratio gate and trimming |
| Scene segmentation | Pause length + speaker change + topic shift | Proposes the trim windows in §3.3.2 |

### 3.6 Dutch linguistic analysis and lexical resources

| Layer | Resource | Access | Use |
|---|---|---|---|
| Tokenise, POS, lemma, morphology, dependencies | **spaCy `nl_core_news_lg`**, with **Stanza** or **Frog** as a second opinion | Open | Backbone of every rule in §7.1 |
| Frequency | **SUBTLEX-NL** (subtitle-derived) **[Verified]**; `wordfreq` as fallback | Academic; verify commercial terms **[Unresolved]** | Subtitle frequencies approximate *spoken* frequency far better than book corpora — exactly right here |
| CEFR grading | **NT2Lex** — 17,743 words and expressions, CEFR-graded from NT2 textbooks, linked to Open Dutch WordNet **[Verified]** | Terms unclear **[Unresolved]** | Per-item CEFR bands; drives the per-lesson CEFR estimate Draft B asked for but did not resource |
| Senses, synonyms | **Open Dutch WordNet** (VU/CLTL) | Open **[Reported]** | Gloss disambiguation; MCQ distractor generation |
| Multiword expressions | **PARSEME** corpora and identification systems; a 2.0 edition ran **[Verified]** | Open | Seeds the idiom detector. **Dutch coverage across editions is inconsistent — verify [Unresolved]** |
| Glosses | Wiktionary/Kaikki extracts; Open Dutch WordNet | Mostly CC-BY-SA | English glosses; attribution required |
| Reference | INT CLARIN K-Centre word lists | Varies | Canonical spelling, inflection tables |

The lexicon is a **build-time asset**, not a runtime API: compile frequency + CEFR + glosses into one indexed store server-side, and ship a ~5 MB A1–B1 subset to the client for offline lesson review. Draft B's plan to lemmatise and POS-tag "using Dutch NLP tools *or an LLM prompt*" is a false equivalence — an LLM asked to lemmatise is a slower, less reliable parser with no confidence scores, and it is exactly the substitution that lets fabricated analysis through.

### 3.7 Pedagogy — where all three drafts agree, and what to add

Converged across drafts: authentic input with scaffolding rather than simplification; meaning first, then form in context; pre-teaching key vocabulary; segmenting media into digestible chunks; annotated transcripts; grammar layered around content rather than taught in isolation; explicit contrast with English.

What v2.0 adds or sharpens:

- **Noticing.** Learners acquire forms they consciously notice. Highlighting a separable verb *at both split positions, in the transcript, with audio* is the mechanism; a grammar paragraph is not.
- **The lexical/chunk approach.** Fluency comes disproportionately from stored multi-word chunks (`zullen we maar`, `het valt wel mee`, `daar heb je het al`). This is where authentic dialogue beats textbooks decisively.
- **Narrow listening.** Repeated exposure to the *same* speakers and topics builds comprehension faster than constant novelty. Cluster the shelf by speaker and setting; schedule re-listening (§8.2).
- **Dictogloss and dictation.** Transcription under constraint is among the highest-yield listening exercises and is trivially automatable once you have a verified aligned transcript.
- **Shadowing.** Improves prosody and fluency more than isolated word repetition; needs the word-level timestamps the pipeline already produces.
- **Retrieval practice and spacing.** Settled findings; implemented with FSRS, not a fixed ladder [C9].
- **Task-based output.** A closing communicative task converts recognition into production.
- **Disfluency literacy.** New, and specific to this product: teach the learner to hear through repairs and hesitation (§3.4.3).

CALL research on LLM exercise generation supports the architectural point: quality is achievable but conditional on constraint and validation — generation grounded in explicit linguistic annotation and level targeting beats free-form prompting **[Reported]**. Draft B's §6 is the counter-example that makes the case concrete.

### 3.8 Reinforcement mechanisms

| Mechanism | Implementation | Status |
|---|---|---|
| **Spaced repetition** | **FSRS-6** via `ts-fsrs`, client-side, offline **[Verified]** | Replaces Draft B's SM-2/fixed-interval plan [C9] |
| **Pronunciation scoring** | **Azure AI Speech Pronunciation Assessment** — `nl-NL` **is** in the supported-locale table **[Verified]** [C2 Corrected] | Fastest path to a real score. Whether prosody and content assessment work for `nl-NL` or are English-only is **[Unresolved]** |
| **Pronunciation scoring (fallback)** | Self-hosted **GOP** using a wav2vec2 phoneme model plus forced alignment | Working open implementations exist **[Reported]**; more work, no per-call cost, no vendor lock, EU-hostable |
| **Not** recogniser confidence | — | Rejected [C10]: a recogniser is trained to be robust to accent and its confidence is confounded by noise, rare words and speed |
| **Recording and playback** | `MediaRecorder`, waveform overlay against the reference | Native |
| **Free production scoring** | The same ASR pipeline in short-utterance mode plus a rubric | Enables "answer out loud" tasks |
| **Adaptive difficulty** | Per-item CEFR band against rolling accuracy | Requires the CEFR layer |
---

## 4. Product scope

### 4.1 Users and boundaries

**Primary user.** An English-speaking adult in or around the Netherlands, roughly A2–B1, who understands textbook Dutch and freezes when real people speak. They can read a menu and fail a conversation at the counter. Their complaint is speed, reduction and idiom — not grammar tables.

**Secondary users.** A1 beginners on the slowest, most-scaffolded shelf items; B2+ learners working from their own podcasts; teachers building material from a clip they choose.

**In scope:** shelf sourcing; user import; trimming; transcription with review; automatic lesson generation with validation; interactive practice; spaced repetition; progress; offline use; export with attribution.

**Out of scope for v1:** live AI conversation partner; social feeds; other target languages; CEFR certification claims; a public user-generated shelf; anything that redistributes user imports; YouTube ingestion.

### 4.2 Feature list

#### F1 — Media Shelf (curated sourcing)

A curated, licence-cleared shelf browsable and searchable in-app. Not a live crawler in v1 (§2.2 call 1); the harvesting pipeline behind it is internal.

- **Search and filter:** free text over title, description and transcript; filters for CEFR band, duration, speaker count, speech rate (wpm), setting (café, doctor, workplace, family, phone call, shopping, small talk), region/accent, dialogue vs monologue, licence type.
- **Transcript search** — because every shelf item is pre-transcribed, users can search for a *structure*: "clips containing `zou je … kunnen`", "clips with the particle `even`". Differentiated, and genuinely useful to teachers.
- **Topic chips and packs** [Draft B]: curated starter packs ("At the market", "Making an appointment", "Small talk"), plus user bookmarks organised into personal packs.
- **Preview:** 20-second inline preview, partial transcript, difficulty badge (CEFR + wpm + reduction density), speaker count, and a prominent licence line.
- **Surprise me:** one-tap suggestion matched to the learner's level and current weak points.
- **Provenance card:** source, creator, licence URI, link to original — rendered from the `provenance` object, never hand-written.
- **Internal harvesting pipeline:** pulls from IFADV, Open Beelden (OAI-PMH), Europeana (`reusability=open`, per-item `edm:rights`), YODAS and licensed partners; runs the §3.3.3 gates; auto-proposes scene cuts; **requires a human editorial pass before publication.** The human pass is not optional — it is what keeps the shelf above the automated floor, and on YODAS material it will reject the majority on register grounds.

#### F2 — Import

- File picker, drag-and-drop, OS share sheet (**Web Share Target API**, so "Share to Hoorspel" appears in the share menu), or a **direct media URL** (not a platform page).
- Optional companion subtitle file used as an alignment prior and a check on ASR output.
- **Client-side pre-flight** before upload: audio-track presence, RMS speech energy, duration, format, size — failures are instant and free [Draft B].
- **In-app recording** for a conversation the user is part of, with an explicit consent reminder.
- Rights attestation with plain-English text.
- **Residency choice** per import: on-device / EU / fastest (§3.4.5).

#### F3 — Trim [Draft B]

Waveform view with auto-proposed scene boundaries; the user drags a 30–120 s window and previews it. Everything downstream runs on the trimmed span; the source is retained for re-cutting. Long imports are presented as "we found 5 scenes — pick one" rather than as a wall of audio.

#### F4 — Transcription and Analysis

- ASR with word-level forced alignment, diarization, per-word confidence, and **preserved disfluencies** (§3.4.3).
- Constrained LLM repair pass (punctuation, casing, homophones, speaker attribution only).
- Deterministic linguistic analysis (§7.1): lemmas, POS, morphology, dependencies, frequency and CEFR bands, separable-verb reunification, clause-order classification, MWE candidates, particle detection, reduction and assimilation flags.
- Difficulty scoring: speech rate, type-token ratio, above-level token share, reduction density, overlap ratio → the per-lesson CEFR estimate.

#### F5 — Lesson Builder

Produces the lesson object in §9 from the analysis plus a constrained LLM pass, then runs the seven validators in §7.3. **Every claim carries a pointer to the transcript span that triggered it; a claim without a pointer is not published.**

#### F6 — Review and Edit

- Karaoke transcript editor: click a word to hear it, correct inline, re-align only the touched segment.
- Speaker relabelling ("Speaker 1" → "Anna").
- Lesson triage: keep / drop / edit any vocabulary item, grammar point or exercise before starting.
- "This looks wrong" on any explanation → review queue; for shelf items, an editorial fix that benefits everyone.
- Learner notes and personal glosses, which flow into the SRS.

#### F7 — Practice

Listening (dictation, audio gap-fill, reduction spotting, comprehension, speed ladder), speaking (repeat-after-me with scoring, shadowing, role-play, free production), language (word and chunk cards, word-order reconstruction, transformation drills). Detailed in §8.1.

#### F8 — Review Queue

FSRS-scheduled cards, each retaining its **audio origin** — a review is the word in the sentence the learner actually heard, playable, not a naked word on a card. Mixed across lessons, works offline, syncs on reconnect. Whole clips are also scheduled for re-listening (§8.2).

#### F9 — Licence gating and attribution packs [Draft A]

Licence state is enforced at every boundary, not displayed as decoration: shelf filters by licence; exports and share links carry a generated attribution pack; SA-licensed material carries its notice through to derivatives; items with incomplete provenance cannot be exported; takedown removes an item and its derived lessons.

#### F10 — Residency and privacy controls [Draft A]

The per-import processing choice (§3.4.5), a visible record of where each item was processed, one-action deletion of the learner's own voice recordings, and GDPR export/erasure.

#### F11 — Progress and Insight

Study time and streaks (light, not gamified into meaninglessness); words and chunks known by CEFR band; a listening-comprehension index; pronunciation trend by phoneme class; and a **weak-point vector over the G1–G12 rule set** that drives both shelf recommendations and exercise mix — e.g. *"You miss verb-final order in `omdat`-clauses 60% of the time."*

Draft B's "skills radar" over Listening / Speaking / Reading / Grammar / Vocabulary is dropped as specified: five self-invented axes with no measurement model behind them is decoration. What replaces it is measured — every axis above is computed from item-level attempts.

#### F12 — Export and share [Draft B, constrained]

Lesson export as PDF/HTML for offline study and a read-only share link. Both carry the attribution pack; both are blocked where the licence or provenance does not permit; user imports are never shareable by default.

#### F13 — PWA platform

Installable; offline for lessons, media and queue; background sync for practice results; opt-in daily-queue notification; Web Share Target import; responsive phone-to-desktop; full keyboard support; WCAG 2.2 AA.

### 4.3 Priority

| Tier | Features |
|---|---|
| **MVP** | F2 import (EU server ASR), F3 trim, F4, F5 with validators, F6, four core exercise types from F7, F8 FSRS, F13 install + offline review |
| **V1** | F1 shelf (IFADV + Open Beelden + first commissioned pack), F9 attribution, F10 residency, pronunciation scoring, F11, transcript search, Web Share Target |
| **V1.5+** | On-device ASR, F12 export/share, teacher mode, CGN under licence, commissioned series, role-play, Anki export |

---

## 5. Architecture and data model

### 5.1 Architecture

```
CLIENT (PWA)                        EDGE / API                  WORKERS (GPU + CPU)
──────────────────────────────      ───────────────────         ──────────────────────────────
React + TypeScript + Vite           Auth / rate limit           1. Normalise (ffmpeg → 16k mono)
vite-plugin-pwa + Workbox           Presigned upload            2. VAD + diarization
IndexedDB (Dexie): lessons,         Job submit / status         3. ASR  ┌ EU: Whisper / whisperd-nl
  cards, transcripts, progress      Lesson read/write                   ├ Fast: Groq turbo
OPFS: cached media blobs            Shelf search                       └ Device: transformers.js
ffmpeg.wasm: pre-flight + trim      Attribution service         4. Forced alignment (WhisperX)
MediaRecorder: speaking             Residency router            5. Constrained LLM repair
ts-fsrs: scheduling, offline                                    6. spaCy/Stanza + lexicon join
transformers.js Whisper (optional)                              7. Rule bank G1–G12 (§7.1)
                                                                8. Constrained LLM writer (§7.2)
                                                                9. Seven validators (§7.3)
                                                               10. Exercise generator
                                                               11. Publish lesson object
        │                                 │                                 │
        └──── offline-first sync ─────────┴──── object store (media, derived audio) ───┘
                                               Postgres (lessons, cards, provenance,
                                               licences, processing-region log)
```

**Why a PWA:** install-to-homescreen, background sync, offline caching, share-target import and `MediaRecorder` cover every requirement; store distribution buys nothing for v1. The real risk is iOS Safari's history of restricting background audio and push — verify on target OS versions in week one **[Unresolved]**.

**Cost model (order of magnitude) [Assumption — validate against §3.4.4]:** self-hosted Whisper on a shared EU GPU is roughly an order of magnitude cheaper per audio-hour than hosted APIs at volume; LLM lesson generation for a trimmed 2-minute scene is a few cents. Trimming (F3) is what keeps both true. A "one free import per day, unlimited shelf" free tier is financially plausible.

### 5.2 Data model (abbreviated)

```
MediaItem      id, source_type(shelf|import|recording), title, duration, codecs,
               language_conf, speech_ratio, speaker_count, provenance{},
               licence{spdx, uri, attribution_string, share_alike, exportable},
               owner_id?, processing_region
Trim           media_id, start_s, end_s, auto_proposed:bool
Transcript     media_id, trim_id, version, segments[],
               words[{text,start,end,conf,speaker}], disfluencies[], events[],
               raw_vs_repaired, edited_by_user:bool
Analysis       transcript_id, tokens[{lemma,pos,morph,dep,freq_band,cefr}],
               detections[{id,type,span,evidence,confidence}]
Lesson         media_id, analysis_id, cefr_estimate, sections{vocab[], grammar[],
               chunks[], listening_insights[], culture[], exercises[]},
               generated_at, model_version, validator_report{}, editorial_state
Card           lesson_id, kind(word|chunk|grammar|pronunciation|clip),
               front, back, audio_span{start,end}, fsrs_state{...}
Attempt        card_id|exercise_id, ts, correct, latency_ms, score{}, offline:bool
Learner        cefr_estimate, weak_points[G1..G12], daily_target, residency_pref
```

Three invariants, enforced at write time: **every lesson claim links to a transcript span**; **every media item carries a licence object the UI renders**; **every processing step records its region**.

---

## 6. User journeys and wireframes

### 6.1 Journey A — Shelf to lesson

```
[Onboard: level + goals] → [Browse shelf] → [Filter: A2, café, 2 speakers, <3 min]
→ [Preview + licence] → [Use this clip] → [Lesson ready — pre-generated, instant]
→ [Triage lesson items] → [Listen → notice → practise] → [Cards queued] → [Next suggestion]
```

Shelf items are pre-transcribed and pre-generated, so there is no wait. The shelf is the fast path; import is the deep path. Design accordingly.

### 6.2 Journey B — Import to lesson (the volume flow)

```
[Share a podcast episode from the OS share sheet]
→ [Pre-flight, client-side: 12:40, audio track ✓, speech energy ✓]
→ [App proposes 5 scenes → user drags a 2:10 window on the waveform]
→ [Residency: EU (remembered)] → [Transcribe + align + analyse]
→ [Karaoke transcript: fix 3 words, name the speakers]
→ [Generate lesson → validators run → 1 item dropped, 14 published]
→ [Triage: drop 4 known words, keep 2 chunks] → [Study + practise] → [Cards queued]
```

### 6.3 Journey C — Daily return

```
[Open offline on a train] → [Queue: 24 due cards, each with its original audio]
→ [Review 8 min] → [Listening rep: re-hear a clip from 3 days ago at full speed]
→ [5 shadowing lines, scored] → [Sync on signal]
```

### 6.4 Journey D — Teacher / power user

```
[Transcript search: clips containing "zou je ... kunnen"] → [Pick 3]
→ [Generate, edit explanations] → [Export handout + card deck, attribution pack attached]
```

### 6.5 Wireframes

**W1 — Home**

```
┌──────────────────────────────────────────────────────┐
│  Hoorspel                              [profile]  ⚙  │
├──────────────────────────────────────────────────────┤
│  Due today                                           │
│  ┌────────────────────────────────────────────────┐  │
│  │  24 cards   ·   ~8 min          [ Start review ]│  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Continue                                            │
│  ┌────────────────────────────────────────────────┐  │
│  │ ▶ "Bij de bakker"   A2 · 2:04 · 58% complete   │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  New lesson from…                                    │
│  ┌───────────────┐  ┌───────────────┐                │
│  │ 🔎 Find a clip│  │ ⬆ Import / rec│                │
│  └───────────────┘  └───────────────┘                │
│                                                      │
│  This week: you're missing verb-final order in       │
│  "omdat" clauses.        [ Practise that → ]         │
└──────────────────────────────────────────────────────┘
```

**W2 — Shelf**

```
┌──────────────────────────────────────────────────────┐
│ ← Find a clip            [ search transcripts…    🔎 ]│
├──────────────────────────────────────────────────────┤
│ Level A1 [A2] B1 B2  │ Length <2m [2-5m] 5m+         │
│ Speakers 1 [2] 3+    │ Setting [café] work family    │
│ Speed slow [normal] fast │ Licence [any] CC0 CC-BY   │
│ Packs: [At the market] [Appointments] [Small talk]   │
├──────────────────────────────────────────────────────┤
│ ▶ [PLACEHOLDER clip title]                           │
│   A2 · 1:48 · 2 speakers · 142 wpm · CC-BY-3.0       │
│   [preview 0:20 ▸] [ Use this clip ]                 │
│   ⓘ [PLACEHOLDER source] · [PLACEHOLDER creator] ·   │
│     Licence: CC-BY 3.0 ↗                             │
├──────────────────────────────────────────────────────┤
│ ▶ [PLACEHOLDER clip title]                           │
│   A2 · 2:31 · 2 speakers · 128 wpm · GPLv2 (IFADV)   │
│   [preview 0:20 ▸] [ Use this clip ]                 │
└──────────────────────────────────────────────────────┘
```

**W3 — Import**

```
┌──────────────────────────────────────────────────────┐
│ ← Add your own audio or video                        │
├──────────────────────────────────────────────────────┤
│   ┌────────────────────────────────────────────┐     │
│   │   Drop a file here, or [ choose file ]     │     │
│   │   MP3 M4A WAV FLAC OGG · MP4 MOV WebM MKV  │     │
│   └────────────────────────────────────────────┘     │
│   [ 🎙 Record now ]   [ 🔗 Paste direct media URL ]   │
│   [ + add subtitles (.srt/.vtt) — optional ]         │
│                                                      │
│   Pre-flight ✓ (checked on your device)              │
│   12:40 · audio track ✓ · speech detected ✓          │
│                                                      │
│   Where should your audio be processed?              │
│     ( ) On this device — private, slower, less exact │
│     (•) In Europe — full accuracy, stays in the EU   │
│     ( ) Fastest — leaves the EU                      │
│                                                      │
│   [x] I have the right to use this file for study.   │
│                             [ Continue → ]           │
└──────────────────────────────────────────────────────┘
```

**W4 — Trim**

```
┌──────────────────────────────────────────────────────┐
│ ← Pick the part to study                             │
├──────────────────────────────────────────────────────┤
│  We found 5 scenes. Scene 3 looks best for A2.       │
│                                                      │
│  ▁▃▅▇▅▃▁▂▅▇▆▃▁▁▂▄▆▇▆▄▂▁▃▅▇▅▃▁▂▄▆▅▃▂▁▂▄▅▇▆▄▂▁        │
│      [1]      [2]     ▓▓▓[3]▓▓▓     [4]     [5]      │
│              ├────── 2:10 selected ──────┤           │
│                                                      │
│  ▶ Preview selection        30 s ─────── 5 min       │
│  2 speakers · 138 wpm · A2–B1                        │
│                             [ Transcribe → ]         │
└──────────────────────────────────────────────────────┘
```

**W5 — Transcript review (karaoke editor)**

```
┌──────────────────────────────────────────────────────┐
│ ← Check the transcript            [ Regenerate ] [→] │
├──────────────────────────────────────────────────────┤
│ ▶ ━━━━━●────────────────────────  0:42 / 2:10  0.75x │
├──────────────────────────────────────────────────────┤
│ [A]  0:38  [PLACEHOLDER Dutch line, with eh…         │
│            hesitations kept]                         │
│ [B]  0:41  [PLACEHOLDER Dutch line]~                 │
│ [A]  0:44  [PLACEHOLDER Dutch line]                  │
│                                                      │
│  ~ = low confidence, tap to fix                      │
│  eh / false starts are kept on purpose — they're     │
│  part of what you're learning to hear.               │
│  tap a word to hear it · long-press to edit          │
│  [ Rename speakers ]  [ 3 edits · re-align ]         │
└──────────────────────────────────────────────────────┘
```

**W6 — Lesson**

```
┌──────────────────────────────────────────────────────┐
│ ← [PLACEHOLDER title]        A2 · 2:10     ●●●○○ 58% │
├──────────────────────────────────────────────────────┤
│ [Listen] [Words] [Grammar] [Chunks] [Heard it?] [Practise]
├──────────────────────────────────────────────────────┤
│  ▶ Full clip   ▶ Slow (0.75x)   ▶ Line by line       │
│                                                      │
│  Grammar in this clip                                │
│  ① [PLACEHOLDER rule name]                     [ →]  │
│     heard 3× · you got 2/5 right last time           │
│  ② [PLACEHOLDER rule name]                     [ →]  │
│  ③ [PLACEHOLDER rule name]                     [ →]  │
│                                                      │
│  9 words · 4 chunks · 3 listening insights · 2 notes │
│  ⓘ [PLACEHOLDER attribution line]                    │
│                          [ Start practice → ]        │
└──────────────────────────────────────────────────────┘
```

**W7 — Practice: shadowing**

```
┌──────────────────────────────────────────────────────┐
│ ← Shadowing              line 3 of 8                 │
├──────────────────────────────────────────────────────┤
│  "[PLACEHOLDER Dutch line]"                          │
│  /[PLACEHOLDER IPA]/                                 │
│                                                      │
│  ▶ Listen   ▶ Slow   ●  Record (hold)                │
│                                                      │
│  Your attempt      ▁▃▅▇▅▃▁▂▅▇▆▃▁                     │
│  Reference         ▁▄▆▇▅▂▁▃▆▇▅▂▁                     │
│                                                      │
│  Accuracy [__]  Fluency [__]  Completeness [__]      │
│  ⚠ [PLACEHOLDER targeted articulation tip]           │
│                     [ Try again ]  [ Next → ]        │
└──────────────────────────────────────────────────────┘
```

**W8 — Review queue**

```
┌──────────────────────────────────────────────────────┐
│ Review                                    12 / 24    │
├──────────────────────────────────────────────────────┤
│                                                      │
│         [PLACEHOLDER chunk]                          │
│                                                      │
│         ▶ hear it in context ([PLACEHOLDER 0:52],    │
│           "[PLACEHOLDER lesson title]")              │
│                                                      │
│                 [ Show answer ]                      │
│                                                      │
│   Again      Hard      Good      Easy                │
│   <1 min     4 days    9 days    21 days             │
└──────────────────────────────────────────────────────┘
```
---

## 7. The extraction and explanation engine

The principle, restated because §1.3 is what happens without it: **the machine that detects and the machine that explains are different machines, and the explainer may only speak about what the detector found.**

### 7.1 Layer 1 — Deterministic detection (no LLM)

Input: the aligned, disfluency-preserving transcript. Output: `detections`, each with a span, a type and evidence.

**Vocabulary selection**

1. Lemmatise every token (spaCy `nl_core_news_lg`) — a parser, not a prompt (§3.6).
2. Look up SUBTLEX-NL frequency band and NT2Lex CEFR band.
3. Score teaching value: `(CEFR at or just above learner level) × frequency × (not already known per FSRS) × (repeated in clip) × (semantically central to the scene)`.
4. Cap at 8–12 items. More is not a better lesson.

**Grammar — a rule bank over dependency parses.** Targeted at what English-L1 learners actually fail on:

| # | Phenomenon | Detection signal | Why English speakers need it |
|---|---|---|---|
| G1 | **V2 word order** | Finite verb at position 2 of a main clause with a fronted non-subject | English is SVO; inversion after a fronted adverbial (`Morgen ga ik…`) is a persistent error |
| G2 | **Verb-final in subordinate clauses** | Subordinator + finite verb at clause end | `omdat ik het niet weet` — the most common English-L1 error |
| G3 | **Separable verbs** | Separable-prefix lexicon + `compound:prt` dependency, possibly many tokens away | `Ik bel je morgen op.` Invisible to a learner who does not know to look for the stranded particle |
| G4 | **Perfect: `hebben` vs `zijn`, participle placement** | `aux` + past participle at clause end | Auxiliary choice has no English analogue |
| G5 | **`er`** (locative, existential, quantitative, prepositional) | `er` token + syntactic context classification | Notoriously hard; no English equivalent. **Detected, never assumed** — see §7.4 defect 2 |
| G6 | **`de`/`het` gender** | Determiner–noun agreement; article–noun pair lookup | Unpredictable; every noun card carries its article |
| G7 | **Diminutives** | `-je/-tje/-pje/-kje` on a noun lemma | Pervasive and pragmatically loaded, not merely "small" |
| G8 | **Modal particles** | Closed class (`even, nou, toch, maar, eens, hoor, wel, dan, zeg`) in non-literal position | **The signature of everyday Dutch.** Textbooks skip them; dialogue is full of them |
| G9 | **Modal politeness constructions** | `zou je … kunnen/willen`, conditionals | Register control |
| G10 | **Reduction and clitics** | `-ie`, `'t`, `'k`, surface vs citation forms in the audio | Explains *why the learner could not hear it* — high value |
| G11 | **`niet` vs `geen` and negation placement** | Negation token + object determiner analysis | Placement differs from English |
| G12 | **Time–manner–place ordering** | Adverbial order in the middle field | English order differs; the error is instantly audible |

Each rule emits: span, surface form, canonical form, in-clip count, and a pointer to a **human-authored explanation template** for that phenomenon. The templates are written once, by a person, and are the reason the explanations are correct.

**Phraseological units**

1. Candidates: PARSEME-style MWE identification; verb-particle and verb-preposition combinations; fixed prepositional phrases; high-PMI n-grams against a Dutch reference corpus.
2. **Non-compositionality test:** does a word-by-word gloss reproduce a dictionary sense of the whole? If yes, it is not an idiom and does not get an idiom card. This single test removes both of Draft B's false idioms (§7.4 defect 5).
3. Classify: **idiom** · **collocation** · **discourse marker** · **fixed formula** · **particle construction**.

**Listening insights (G10 extended)**

Compare aligned surface audio against citation pronunciations to detect final devoicing, `-en` /n/-deletion, cross-boundary assimilation and vowel reduction; and surface the preserved disfluencies — hesitation, repair, false start, overlap. Each becomes a "why you couldn't hear it" note. Nothing else in the market does this well.

### 7.2 Layer 2 — Constrained generation

The LLM receives the transcript, the detection list, the learner's level and known items, the human-authored templates for each detected rule, and a strict output schema. Its instructions:

- Explain **only** items in the detection list. Add no grammar points.
- Quote the exact transcript span for every explanation.
- Write for an English speaker; contrast with English explicitly where structures diverge.
- Under 90 words per explanation: one worked example from the clip, one new example.
- Flag context-dependence rather than resolving it.
- Cultural notes only where a native speaker would agree the reference needs explaining. No invented sociology.
- Never alter the transcript. Never invent Dutch.
- Strict JSON matching the lesson schema.

### 7.3 Layer 3 — Validators

Automated gates. Failure sends the item back for one repair pass, then drops it. The lesson stores its `validator_report`.

| # | Gate | Check |
|---|---|---|
| 1 | **Span** | Every quoted string exists verbatim in the transcript |
| 2 | **Detection** | Every grammar point maps to a detection ID produced in Layer 1 |
| 3 | **Lexicon** | Every Dutch word form in vocabulary, idiom and exercise output exists in the lexicon (or in the transcript). Unknown forms are rejected, not glossed |
| 4 | **Gloss** | Every translation is consistent with the lexicon/WordNet entry; mismatches go to editorial review |
| 5 | **Answer key** | Every exercise has exactly one defensible answer; distractors are re-parsed to confirm they are wrong; numeric and factual answers are cross-checked against the transcript |
| 6 | **Level** | Explanation English is within the learner's reading level; Dutch items within one CEFR band of target |
| 7 | **Attribution** | The lesson carries the media item's licence, attribution string and processing region; incomplete provenance blocks publication and export |

Plus a **coverage** check: the lesson addresses ≥ 60% of the clip's above-level tokens, or it declares the gap.

**[Assumption]:** these gates convert "usually right" into "wrong in ways we detect and fix". *Falsifiable by:* an NT2 teacher's blind review of 50 generated lessons, target ≥ 95% of published claims judged correct with zero fabricated grammar rules. **Run it before launch, not after.**

### 7.4 The gates, demonstrated on Draft B's lesson

Every defect in §1.3, and the gate that stops it — this is the specification test suite, not an illustration.

| Defect in Draft B | Gate | How it fires |
|---|---|---|
| **1.** `zakij` — fabricated word, then glossed as "a bag (colloquial)" | **3 Lexicon** | `zakij` is in no lexicon and (in a real run) in no ASR transcript. Item rejected before it reaches a card |
| **2.** Grammar point on `er` in a transcript containing no `er` | **1 Span** + **2 Detection** | The quoted span is not in the transcript; and no G5 detection exists to attach the point to. Two independent gates catch it |
| **3.** V2 explained using a verbless, ungrammatical sentence | **1 Span** + **2 Detection** | In a real run the span comes from ASR output, so it is by construction well-formed speech; the G1 detector requires a finite verb it can locate. A sentence with no finite verb produces no detection and therefore no explanation |
| **4.** €10 − €8.50 = "fifty cents", answer key says "1.50" | **5 Answer key** | Numeric answers are cross-checked against the transcript; the transcript, the arithmetic and the key must agree or the exercise is dropped |
| **5.** `Wat wil je graag?` and `Natuurlijk` presented as idioms | **Non-compositionality test (§7.1)** | A word-by-word gloss reproduces the meaning of both, so neither is classified as an idiom |
| **6.** Register incoherence described as a cultural observation | **Architecture, not a gate** | The transcript is never generated. Register is a property of real recorded speech, and the cultural note is written against a real span or not at all |

Note what this table also shows: **no gate would have helped Draft B**, because Draft B has no detection layer for the gates to check against. The gates are only possible because Layer 1 exists. That is the architectural argument in one line.

---

## 8. Practice, scheduling and progress

### 8.1 Exercise types

| Skill | Exercise | Generated from | Scoring |
|---|---|---|---|
| **Listening** | **Dictation** — type the line while hearing it, unlimited replays | Aligned segment | Token diff, partial credit, errors typed as spelling vs mishearing |
| Listening | **Audio gap-fill** — hear the sentence, supply the removed word | Target vocab/particle spans | Exact + fuzzy |
| Listening | **Reduction spotting** — "what did she actually say?" citation vs reduced form | G10 detections | MCQ |
| Listening | **Disfluency tracking** — mark where the speaker restarts or repairs | Preserved disfluency spans | Span selection |
| Listening | **Comprehension** — who wants what, what happens next | LLM over transcript, span- and key-checked | MCQ / short answer |
| Listening | **Speed ladder** — 0.75× → 1.0× → 1.25× | Media | Comprehension check per rung |
| **Speaking** | **Repeat-after-me** with scoring | Sentence spans | Azure `nl-NL` accuracy/fluency/completeness, or self-hosted GOP. **Not** recogniser confidence [C10] |
| Speaking | **Shadowing** — speak along, waveform comparison | Word timestamps | Timing overlap + accuracy |
| Speaking | **Role-play** — the app plays speaker A, the learner answers as B | Diarized turns | ASR + semantic match against acceptable answer patterns |
| Speaking | **Free production** — a real communicative task | LLM task prompt, validated | ASR + rubric; must use ≥ 2 target items |
| **Language** | **Chunk cards** — chunk, meaning, audio | MWE detections | FSRS |
| Language | **Word cards with article** — `de`/`het` always attached | Vocabulary selection | FSRS |
| Language | **Word-order reconstruction** — drag tokens into Dutch order | G1/G2/G12 | Exact sequence, hint after two failures |
| Language | **Transformation drill** — turn a main clause into an `omdat` clause | G2/G3 | Parse the answer and check the *structure*, not the string |

### 8.2 Scheduling

FSRS-6 via `ts-fsrs`, client-side, offline **[Verified]** — not SM-2, not fixed 1/3/7/14 intervals [C9]. Two product-specific rules:

- **Audio-first cards.** For listening items the prompt is the audio, not the text. A learner who recognises only the written word has not learned to hear it.
- **Clip-level re-listening.** Whole clips are scheduled at expanding intervals alongside item cards — the narrow-listening principle from §3.7, which no mainstream SRS implements well.

### 8.3 Progress

Per learner: a CEFR estimate from item-level performance; known words and chunks by band; a listening-comprehension index (first-listen comprehension accuracy normalised by clip difficulty); pronunciation scores by phoneme class over time; and the **weak-point vector over G1–G12** that drives shelf recommendations and exercise mix.

Every one of those is computed from recorded attempts. Nothing on the dashboard is a self-declared axis (F11).

**Deliberate omissions:** no leaderboards, no streak-loss punishment, no invented currency. The retention mechanism is that the material is the learner's own and the reviews are short.

---

## 9. Example lesson module

Placeholders only, throughout, for the reasons in §1.3. The **structure, field names and kind of explanation** are the specification.

### 9.1 Lesson object (abbreviated)

```json
{
  "lesson_id": "[PLACEHOLDER lesson_uuid]",
  "media": {
    "media_id": "[PLACEHOLDER media_uuid]",
    "title": "[PLACEHOLDER clip title]",
    "source_type": "shelf | import",
    "trim": {"start_s": "[PLACEHOLDER]", "end_s": "[PLACEHOLDER]"},
    "speakers": ["[PLACEHOLDER A]", "[PLACEHOLDER B]"],
    "processing_region": "[PLACEHOLDER eu-west | device | us]",
    "provenance": {
      "source": "[PLACEHOLDER source]", "source_url": "[PLACEHOLDER url]",
      "creator": "[PLACEHOLDER creator]", "licence_spdx": "[PLACEHOLDER]",
      "licence_url": "[PLACEHOLDER]", "attribution_string": "[PLACEHOLDER]"
    }
  },
  "cefr_estimate": "[PLACEHOLDER band]",
  "difficulty": {
    "speech_rate_wpm": "[PLACEHOLDER]", "above_level_token_share": "[PLACEHOLDER]",
    "reduction_density": "[PLACEHOLDER]", "disfluency_rate": "[PLACEHOLDER]",
    "overlap_ratio": "[PLACEHOLDER]"
  },
  "sections": {
    "orientation": {}, "transcript": {}, "vocabulary": [], "grammar": [],
    "phraseology": [], "listening_insights": [], "culture": [],
    "exercises": [], "cards": []
  },
  "generation": {
    "model_version": "[PLACEHOLDER]",
    "detection_ids": ["[PLACEHOLDER]"],
    "validator_report": {
      "span": "pass", "detection": "pass", "lexicon": "pass", "gloss": "pass",
      "answer_key": "pass", "level": "pass", "attribution": "pass",
      "dropped_items": "[PLACEHOLDER n]"
    }
  }
}
```

### 9.2 Rendered lesson

---

#### [PLACEHOLDER clip title] — [PLACEHOLDER CEFR band] · [PLACEHOLDER duration]

**Source:** [PLACEHOLDER source] · **Creator:** [PLACEHOLDER creator] · **Licence:** [PLACEHOLDER licence name and link]
**Speakers:** [PLACEHOLDER A] and [PLACEHOLDER B] · **Speech rate:** [PLACEHOLDER wpm] · **Setting:** [PLACEHOLDER setting] · **Processed:** [PLACEHOLDER region]

---

**① Before you listen**

> [PLACEHOLDER 1–2 sentence orientation: who is talking, where, what they want. No vocabulary spoilers.]
>
> **Listen once without reading.** Then answer: [PLACEHOLDER single gist question]

---

**② Transcript**

*Tap any word to hear it. `~` marks lower recogniser confidence. Hesitations and false starts are kept — they are part of what you are learning to hear.*

| Time | Speaker | Dutch | English |
|---|---|---|---|
| [PLACEHOLDER 0:00] | [PLACEHOLDER A] | [PLACEHOLDER Dutch line 1, disfluencies intact] | [PLACEHOLDER English line 1] |
| [PLACEHOLDER 0:04] | [PLACEHOLDER B] | [PLACEHOLDER Dutch line 2] | [PLACEHOLDER English line 2] |
| [PLACEHOLDER 0:09] | [PLACEHOLDER A] | [PLACEHOLDER Dutch line 3] | [PLACEHOLDER English line 3] |
| [PLACEHOLDER 0:14] | [PLACEHOLDER B] | [PLACEHOLDER Dutch line 4] | [PLACEHOLDER English line 4] |

---

**③ Key vocabulary** *(above level, useful frequency, in context — 8–12 items)*

| Dutch | English | Notes | Heard at |
|---|---|---|---|
| **[PLACEHOLDER de/het + noun]** | [PLACEHOLDER translation] | [PLACEHOLDER gender + plural] · [PLACEHOLDER CEFR] · [PLACEHOLDER frequency band] | [PLACEHOLDER 0:04] ▶ |
| **[PLACEHOLDER verb infinitive]** | [PLACEHOLDER translation] | [PLACEHOLDER separable? · auxiliary `hebben`/`zijn` · participle] | [PLACEHOLDER 0:09] ▶ |
| **[PLACEHOLDER adjective]** | [PLACEHOLDER translation] | [PLACEHOLDER inflection] | [PLACEHOLDER 0:14] ▶ |
| **[PLACEHOLDER noun]** | [PLACEHOLDER translation] | [PLACEHOLDER false-friend warning if applicable] | [PLACEHOLDER 0:18] ▶ |
| *[… 5–8 more …]* | | | |

---

**④ Grammar in this clip** *(only rules the detector found)*

> **G[PLACEHOLDER id] — [PLACEHOLDER rule name]**
>
> **In the clip:** "[PLACEHOLDER exact transcript span]" ([PLACEHOLDER 0:09] ▶)
>
> **What's happening:** [PLACEHOLDER ≤90 words, from the human-authored template for this rule, instantiated on this clip's example. Names the contrast with English explicitly.]
>
> **The pattern:** `[PLACEHOLDER schematic]`
>
> **Another example:** [PLACEHOLDER new sentence] — [PLACEHOLDER translation]
>
> **Watch out:** [PLACEHOLDER the specific mistake an English speaker makes here]
>
> *Heard [PLACEHOLDER n]× · your accuracy on this rule: [PLACEHOLDER %]*

> **G[PLACEHOLDER id] — [PLACEHOLDER second rule]**
>
> **In the clip:** "[PLACEHOLDER exact span]" ([PLACEHOLDER 0:14] ▶)
>
> **What's happening:** [PLACEHOLDER explanation. For modal particles: the particle has no direct English translation; its function is social, not semantic.]
>
> **Compare:**
> - [PLACEHOLDER sentence without the particle] — [PLACEHOLDER blunter English rendering]
> - [PLACEHOLDER sentence with the particle] — [PLACEHOLDER softer English rendering]

> **G[PLACEHOLDER id] — [PLACEHOLDER third rule]** *[… same structure …]*

---

**⑤ Phrases and idioms** *(non-compositional only)*

| Phrase | Literal | What it actually means | Type | When to use it |
|---|---|---|---|---|
| **[PLACEHOLDER idiom]** | [PLACEHOLDER word-by-word gloss] | [PLACEHOLDER real meaning] | idiom | [PLACEHOLDER register/situation] |
| **[PLACEHOLDER collocation]** | — | [PLACEHOLDER meaning] | collocation | [PLACEHOLDER why this verb goes with this noun, and which English verb is wrong] |
| **[PLACEHOLDER discourse marker]** | — | [PLACEHOLDER conversational function] | discourse marker | [PLACEHOLDER e.g. buys thinking time; very common; makes you sound less scripted] |
| **[PLACEHOLDER fixed formula]** | — | [PLACEHOLDER meaning] | formula | [PLACEHOLDER social situation] |

---

**⑥ Why you couldn't hear it**

- **[PLACEHOLDER surface form]** is actually **[PLACEHOLDER citation form]** — [PLACEHOLDER explanation, e.g. `-en` /n/-deletion] ([PLACEHOLDER 0:04] ▶ slowed)
- **[PLACEHOLDER contraction]** = [PLACEHOLDER full form] — [PLACEHOLDER clitic note]
- **[PLACEHOLDER assimilation example]** — [PLACEHOLDER cross-boundary sound change]
- **[PLACEHOLDER repair/false start]** — [PLACEHOLDER what the speaker started to say and how they restarted; real speech is assembled, not delivered]
- **Sound focus:** [PLACEHOLDER phoneme] — [PLACEHOLDER articulation tip contrasted with the nearest English sound]

---

**⑦ Culture and context** *(only where a native speaker would agree it needs explaining)*

- [PLACEHOLDER note grounded in something actually said — an institution, a habit, a politeness convention — plus what the learner should *do* with it]
- [PLACEHOLDER register note: how formal is this, and what would change with a stranger / a boss / a child?]

---

**⑧ Practice**

**Listening**

1. **Dictation** — [PLACEHOLDER target line] ([PLACEHOLDER 0:09] ▶) → `[PLACEHOLDER expected answer]`
2. **Audio gap-fill** — "[PLACEHOLDER sentence with ____]" → [PLACEHOLDER correct] / [PLACEHOLDER distractor] / [PLACEHOLDER distractor] / [PLACEHOLDER distractor]
3. **What did she actually say?** — you heard "[PLACEHOLDER reduced form]" → (a) [PLACEHOLDER citation form] (b) [PLACEHOLDER mishearing] (c) [PLACEHOLDER mishearing]
4. **Mark the repair** — where does the speaker restart? → [PLACEHOLDER span]
5. **Comprehension** — [PLACEHOLDER inference question] → [PLACEHOLDER answer] · *evidence: "[PLACEHOLDER span]"*

**Speaking**

6. **Repeat after me** — "[PLACEHOLDER short line]" ▶ → target ≥ [PLACEHOLDER threshold]
7. **Shadow** — lines [PLACEHOLDER n]–[PLACEHOLDER m] at 0.75×, then 1.0×
8. **Role-play** — the app is [PLACEHOLDER A]; you are [PLACEHOLDER B] → *acceptable:* [PLACEHOLDER pattern 1], [PLACEHOLDER pattern 2]
9. **Free production** — [PLACEHOLDER task] → *must use:* [PLACEHOLDER chunk], [PLACEHOLDER structure]

**Language**

10. **Word order** — `[PLACEHOLDER scrambled tokens]` → `[PLACEHOLDER correct order]` · *rule: [PLACEHOLDER G-id]*
11. **Transformation** — rewrite "[PLACEHOLDER main clause]" starting with "[PLACEHOLDER subordinator]" → `[PLACEHOLDER expected clause]`

---

**⑨ Cards added to your queue** *(FSRS, each with its original audio)*

| # | Front | Back | Kind |
|---|---|---|---|
| 1 | 🔊 [PLACEHOLDER audio span] | [PLACEHOLDER word + article] — [PLACEHOLDER translation] | word (audio-first) |
| 2 | [PLACEHOLDER chunk] | [PLACEHOLDER meaning + usage] | chunk |
| 3 | [PLACEHOLDER sentence with gap] | [PLACEHOLDER answer] | grammar |
| 4 | 🎙 [PLACEHOLDER line to produce] | [PLACEHOLDER reference audio + best score] | pronunciation |
| 5 | ▶ [PLACEHOLDER whole clip] | — | clip re-listen |
| *[… 8–15 total …]* | | | |

**Attribution:** [PLACEHOLDER generated attribution pack] · **Validators:** [PLACEHOLDER 7/7 passed, n items dropped]

---

## 10. Non-functional requirements

| Area | Requirement |
|---|---|
| **Performance** | Shelf lesson opens < 1 s (pre-generated). Import → lesson for a trimmed 2-minute scene < 90 s p50, < 180 s p95. Practice interactions < 100 ms. First contentful paint < 1.5 s on 4G |
| **Offline** | Full review, practice and lesson reading offline for any downloaded lesson. Only transcription and generation need network |
| **Privacy and residency** | Per-import processing choice (device / EU / fastest) with the region recorded per item; imports private by default and never surfaced in the shelf; one-action deletion of the learner's own recordings; location metadata stripped on ingest; GDPR export and erasure |
| **Licence integrity** | Provenance completeness is a publication and export precondition; SA notices propagate to derivatives; takedown removes an item and its derived lessons |
| **Accessibility** | WCAG 2.2 AA; full keyboard operation; transcripts and captions everywhere by construction; adjustable playback rate; dyslexia-friendly font option; no colour-only signalling |
| **i18n** | UI in the learner's L1 (English for v1) with Dutch content. The L1 must not be hard-coded: a Russian-L1 or German-L1 variant is a lexicon and template swap, not a rewrite (§12.3) |
| **Observability** | Per-stage pipeline timing and failure rates; ASR confidence distribution; **validator pass rates and drop counts per gate**; user-correction rate per lesson section — the single best quality signal available |
| **Cost control** | Trim before transcribe; per-user import quota; caching by media content hash so nothing is transcribed twice; shelf items transcribed once, ever |

---

## 11. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **The open-content well is too shallow** — the shelf stays small and users churn once IFADV is exhausted | High | High | Import is the volume path by design; commission recordings; open the CGN conversation in week 1 |
| R2 | **Dutch conversational ASR is worse than assumed**, making transcripts too error-prone to teach from | Medium | High | The §3.4.4 benchmark before any engine commitment, with `whisperd-nl`'s 16.42 as a reference floor; mandatory review step; confidence markers in the UI; refuse to publish below a confidence floor |
| R3 | **Fabricated explanations** damage trust irreparably | Medium | Critical | The three-layer architecture and seven gates (§7); the §7.4 defect suite as regression tests; NT2 teacher blind review of 50 lessons pre-launch |
| R4 | **Licence violation** via YODAS's imperfect verification or a user import | Medium | High | Per-clip licence records; documented takedown; no redistribution of imports; legal opinion before launch |
| R5 | **CGN-derived model weights carry corpus obligations** — `whisperd-nl` is fine-tuned on CGN and MIT-licensed, which may or may not settle the question | Medium | Medium | Ask INT directly as part of the licence conversation **[Unresolved]**; keep a non-CGN engine as the fallback default |
| R6 | **Speaker privacy complaint** from a corpus participant or a third party in a user import | Low | High | Honour the IFADV warning; no speaker-isolation features; residency controls; takedown path |
| R7 | **iOS PWA limitations** break background audio, install or push | Medium | Medium | Verify on target OS versions in week 1 **[Unresolved]**; degrade gracefully; native shell only if evidence demands it |
| R8 | **Unit economics fail** — ASR + LLM cost per lesson exceeds willingness to pay | Medium | High | Trim-first; self-hosted EU ASR; content-hash caching; pre-generated shelf lessons; import quota |
| R9 | **Scope creep into a full course** | High | Medium | The out-of-scope list in §4.1 is a contract |
| R10 | **Three-codebase drift** across the Dutch, Italian and Russian-L1 scopes | High | High | Build as one engine with per-L1 configuration from day one (§12.3) |

---

## 12. Roadmap and next steps

### 12.1 Weeks 1–2 — prove what can kill this

1. **Freeze the lesson JSON schema and build the review UI against fixture transcripts** [Draft A's call, adopted]. This decouples the two hardest unknowns — schema design and ASR quality — and gives every later stage a fixed target.
2. **Build the Dutch conversational ASR benchmark** (§3.4.4) and run Whisper large-v3 via WhisperX, `whisperd-nl`, Groq turbo, Murmel and one hosted API. Publish the numbers internally, including hosting region and cost per audio-hour. *This decides the engine, the residency story and the cost model.*
3. **Download IFADV, read its terms, and write ten lessons by hand.** Not generated — written. This produces the explanation templates the rule bank needs and is the only reliable way to find out what a good lesson from a two-minute clip contains.
4. **Open the CGN licence conversation** with INT, including the question about models fine-tuned on it (R5).
5. **Send the licence questions to Dutch IP counsel** (§3.2.3).
6. **Verify iOS PWA behaviour** for audio, install and push on current versions.

### 12.2 Weeks 3–6 — vertical slice

Import → trim → EU ASR with disfluencies preserved → WhisperX alignment → spaCy analysis → **three rules only** (G3 separable verbs, G8 modal particles, G2 verb-final) → constrained LLM → **all seven validators** → four exercise types → FSRS queue. One clip, one learner, end to end, offline-capable.

Build the §7.4 defect suite as automated regression tests in this phase, while the gates are being written.

Judge the slice on one question: would you study from it?

### 12.3 Weeks 7–12 — MVP

Complete the rule bank (G1–G12), the full exercise set, the transcript editor, the PWA shell, attribution packs, residency controls, and the pronunciation-scoring spike (Azure `nl-NL` vs self-hosted GOP — noting that Azure is US/global-hosted, so the two options carry different residency stories).

Run the **NT2 teacher blind review of 50 lessons** and hold the ≥ 95% correctness gate before any external user sees generated output.

### 12.4 Months 4–6 — V1

Shelf with IFADV, Open Beelden and the first commissioned pack; transcript search; progress and weak-point modelling; export with attribution; billing.

### 12.5 A note on reuse

`plykov/Nederlands` (FSRS-6, NT2/inburgering alignment, Russian-L1 contrastive pedagogy) and `plykov/Italiano` share the scheduler, card model, media pipeline, progress model and PWA shell with this scope. Only three things differ per configuration: the **lexicon**, the **rule bank**, and the **L1-contrastive explanation templates**. Building this as "the English-L1 Dutch configuration of one engine" rather than a third product is the difference between one codebase and three, and R10 says what happens if that decision is deferred.

### 12.6 The single most important recommendation

**Write ten lessons by hand before writing the generator.** Everything in §7 — the rule bank, the templates, the gates — encodes what a good teacher does with a two-minute clip. If nobody has done it manually, the encoding will be wrong, and the generator will produce lessons that are structurally complete and pedagogically empty. Draft B's §6 is what that looks like when it ships. This is a two-day exercise and it decides whether the product is worth building.

---

## 13. Open questions

| # | Question | Blocks | Owner action |
|---|---|---|---|
| Q1 | Are CGN commercial terms affordable, and do they permit consumer redistribution of excerpts? | Shelf strategy | Contact INT, week 1 |
| Q2 | Do CGN obligations reach models fine-tuned on it, such as `whisperd-nl` (MIT weights)? | Default engine choice | Same conversation |
| Q3 | Is NT2Lex obtainable, and on what terms? | CEFR grading; fallback is manual banding of a 5k list | Contact authors |
| Q4 | Does Azure pronunciation assessment support **prosody** and **content** assessment for `nl-NL`, or only accuracy/fluency/completeness? | Speaking module design | Test with a trial key |
| Q5 | What are Murmel's and Juvoly's actual Dutch conversational WER, pricing and hosting terms? Neither publishes verifiable figures | EU-residency tier | Request an evaluation |
| Q6 | Does PARSEME or another open resource provide usable Dutch MWE data? | Idiom extraction; fallback is PMI + LLM with human curation | Check the corpora directly |
| Q7 | SUBTLEX-NL commercial licence terms? | Frequency layer; fallback is `wordfreq` | Contact rights holder |
| Q8 | Current iOS Safari behaviour for PWA background audio, install and push? | Platform decision | Device test, week 1 |
| Q9 | Monetisation: freemium with an import quota, or flat subscription? | Cost gates throughout | Founder decision |
| Q10 | First market: English-speaking expats in the Netherlands, or English speakers worldwide? Different acquisition and different shelf | Shelf and marketing | Founder decision |

---

## 14. Sources

**Media sources and licensing**

- [IFA Dialog Video corpus (IFADV)](https://www.fon.hum.uva.nl/IFA-SpokenLanguageCorpora/IFADVcorpus/) · [The IFADV Corpus: a Free Dialog Video Corpus (LREC 2008)](https://aclanthology.org/L08-1219/) · [Zenodo record](https://zenodo.org/records/14906857)
- [Corpus Gesproken Nederlands — INT Taalmaterialen](https://taalmaterialen.ivdnt.org/download/tstc-corpus-gesproken-nederlands/) · [CGN commercial licence](https://taalmaterialen.ivdnt.org/download/tstc-corpus-gesproken-nederlands-c/) · [CGN project documentation](https://lands.cls.ru.nl/cgn/doc_English/topics/project/pro_info.htm)
- [Open Beelden API documentation](https://www.openbeelden.nl/api) · [Open Images — Netherlands Institute for Sound & Vision](https://www.beeldengeluid.nl/en/research/projects/open-images)
- [Europeana Search API documentation](https://pro.europeana.eu/page/search)
- [YODAS dataset (ESPnet)](https://huggingface.co/datasets/espnet/yodas) · [YODAS paper (arXiv 2406.00899)](https://arxiv.org/abs/2406.00899)
- [Mozilla Common Voice datasets](https://commonvoice.mozilla.org/en/datasets) · [NVIDIA/Mozilla Common Voice release](https://developer.nvidia.com/blog/nvidia-and-mozilla-release-common-voice-dataset-surpassing-13000-hours-for-the-first-time/)
- [VoxPopuli corpus](https://github.com/facebookresearch/voxpopuli) · [VoxPopuli paper (ACL 2021)](https://aclanthology.org/2021.acl-long.80.pdf)
- [YouTube API Services — Developer Policies](https://developers.google.com/youtube/terms/developer-policies) · [YouTube API Services Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service)
- [Artikelen 3 en 4 DSM-richtlijn: tekst- en datamining (IViR)](https://www.ivir.nl/publicaties/download/AMI_2019_5.pdf)

**Speech recognition and alignment**

- [`pevers/whisperd-nl` — Whisper with disfluencies for Dutch (Hugging Face)](https://huggingface.co/pevers/whisperd-nl) · [whisperd-nl (GitHub)](https://github.com/pevers/whisperd-nl)
- [`Jaspernl/whisper-large-v3-ft-nl`](https://huggingface.co/Jaspernl/whisper-large-v3-ft-nl) · [`jonatasgrosman/wav2vec2-large-xlsr-53-dutch`](https://huggingface.co/jonatasgrosman/wav2vec2-large-xlsr-53-dutch)
- [Groq — Whisper Large v3 Turbo](https://console.groq.com/docs/model/whisper-large-v3-turbo)
- [Murmel — Dutch speech-to-text (The AI Factory)](https://the-ai-factory.com/murmel) · [Murmel v2 announcement](https://the-ai-factory.com/insights/murmel-v2-dutch-speech-recognition)
- [Juvoly — how it built Dutch ASR to beat Whisper (Techzine)](https://www.techzine.eu/blogs/infrastructure/129331/how-juvoly-built-its-own-ai-speech-recognition-to-beat-openais-whisper/) · [Juvoly (OECD.AI)](https://oecd.ai/en/dashboards/policy-initiatives/juvoly,-ai-speech-recognition-for-medical-consults)
- [CLARIAH — Automatic Speech Recognition for Dutch](https://tools.clariah.nl/asr_nl/0.6.2/) · [`opensource-spraakherkenning-nl/asr_nl`](https://github.com/opensource-spraakherkenning-nl/asr_nl)
- [Open ASR Leaderboard — multilingual and long-form tracks](https://huggingface.co/blog/open-asr-leaderboard) · [Open ASR Leaderboard paper (arXiv 2510.06961)](https://arxiv.org/html/2510.06961v3)
- [ElevenLabs — Meet Scribe](https://elevenlabs.io/blog/meet-scribe) · [Introducing Scribe v2](https://elevenlabs.io/blog/introducing-scribe-v2)
- [WhisperX](https://github.com/m-bain/whisperx)
- [Speech-to-text API comparison (Soniox)](https://soniox.com/compare-stt) · [Best open-source STT models 2026 (Northflank)](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks)
- [Transformers.js WebGPU guide](https://huggingface.co/docs/transformers.js/en/guides/webgpu) · [whisper-web](https://github.com/xenova/whisper-web)

**Dutch NLP and lexical resources**

- [spaCy `nl_core_news_lg`](https://huggingface.co/spacy/nl_core_news_lg) · [CLARIN K-Centre Dutch — basic language processing](https://kdutch.ivdnt.org/wiki/Basic_language_processing)
- [SUBTLEX-NL (Keuleers et al.)](https://link.springer.com/article/10.3758/BRM.42.3.643) · [CLARIN K-Centre Dutch wordlists](https://kdutch.ivdnt.org/wiki/Wordlists)
- [NT2Lex: a CEFR-graded lexical resource for Dutch as a foreign language](https://aclanthology.org/W18-0514/)
- [Open Dutch WordNet](https://aclanthology.org/2016.gwc-1.43/)
- [PARSEME shared task](https://typo.uni-konstanz.de/parseme/index.php/results/shared-task) · [PARSEME 2.0 edition (MWE 2026)](https://aclanthology.org/2026.mwe-1.33/)

**Learning design and practice**

- [Azure AI Speech — pronunciation assessment locales](https://github.com/MicrosoftDocs/azure-ai-docs/blob/main/articles/ai-services/speech-service/includes/language-support/pronunciation-assessment.md) · [Use pronunciation assessment](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment) · [Interactive language learning with pronunciation assessment](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-learning-with-pronunciation-assessment)
- [ts-fsrs](https://open-spaced-repetition.github.io/ts-fsrs/) · [FSRS algorithm](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) · [awesome-fsrs](https://github.com/open-spaced-repetition/awesome-fsrs)
- [Automatic generation of ESL learning materials based on CEFR levels using reinforcement-tuned LLMs](https://link.springer.com/article/10.1007/s44163-025-00762-3)
- [Phonological-level wav2vec2 mispronunciation detection and diagnosis](https://www.sciencedirect.com/science/article/pii/S0167639325000640) · [Enhancing GOP in CTC-based mispronunciation detection (arXiv 2506.02080)](https://arxiv.org/pdf/2506.02080v1)
