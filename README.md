# normalcy

The human-rights benchmark (متن بالادستی) behind [normalcy.is](https://normalcy.is): the full text of the instruments below, provision by provision with stable IDs, and checks of texts against them. It serves [Atlas](https://github.com/Atlasiran/Atlas-website) and the [constitutions corpus](https://github.com/Atlasiran/constitutions) now, and Jomhoor later.

## The site and API

| Path | What |
|---|---|
| `/` | the site (`public/`): benchmark library, "check a text" demo, audits and methodology. Persian first, styled after AtlasIran.org |
| `GET /data/instruments.json`, `GET /data/provisions/{ID}.json` | the benchmark texts, e.g. `ICCPR.19.3`, `YP.3.A`, `ROME.7` |
| `GET /api/config` | whether the checker is on, benchmark and rubric versions |
| `POST /api/check` | public demo checker: `{text, header?}`. Rate-limited per IP, Cloudflare Turnstile when configured, results cached in KV by `sha256(text) + rubric + benchmark + model` |
| `POST /check` | async check with callback (bearer `SHARED_SECRET`) |
| `POST /check-sync` | sync check for integration tests (bearer `SHARED_SECRET`) |

### API v1

| Endpoint | Access | What |
|---|---|---|
| `GET /v1/instruments` | public | the instrument index with sources and versions |
| `GET /v1/provisions/{id}` | public | one article or paragraph, e.g. `ICCPR.19` or `ICCPR.19.3` |
| `GET /v1/rubrics` | public | the audit scoring guides: checklist, cited provisions, instructions, version |
| `POST /v1/audit` | client key | `{rubric, documents: [{id, title?, segments: [{id, label?, text}]}], refresh?}` → `202 {job, counts}` |
| `GET /v1/audit/{job}` | client key | `processing`, or `ended` with a result per document |
| `POST /v1/check` | Jomhoor key | Gate 2 post moderation; answers `503 not_enabled` until `GATE2_ENABLED = "true"` |

Client keys are the `API_KEYS` secret, `name:key` pairs separated by commas (`constitutions`, `atlas`, `jomhoor`).

**How an audit runs.** Each document is keyed by `sha256(segments + scoring-guide version + benchmark version + model)`. A key already in KV is answered from the cache and never reaches the model. The rest go to the Message Batches API in one batch (half price). Each request carries the guide's instructions and the verbatim text of the provisions its checklist rests on, as a stable system prefix with `cache_control`; only the document changes. The model gives one verdict per checklist item (`guaranteed`, `restricted_clawback`, `contradicted`, `silent`) with the document segments and benchmark provision IDs it rests on, a verbatim quote and a note in English and Persian. When the batch ends, every citation is checked: an unknown provision or segment ID, or a non-silent verdict without a segment, marks that verdict `rejected`; a quote that is not in the document is flagged. Verdicts are not final: the caller publishes them only after human review.

**Scoring guides** (`rubrics/*.json`, built by `benchmark/rubrics.py` into `src/generated/rubrics.json` and `public/data/rubrics.json`; the build fails on any provision ID not in the stored texts):

| Guide | For | Checklist |
|---|---|---|
| `audit-constitution` | constitutions, drafts, charters, programmes, treatises | 31 rights across the Tier 1 instruments |
| `audit-org` | bylaws | 14 items: membership, internal democracy, dissent, discipline, parity, finances, oversight… Tier 1 + Tier 2 |
| `gate2-post` | forum posts (Jomhoor) | endorsement of violations only (`src/claude.ts`) |

Bylaws are never audited with the constitutional guide, and no two documents are compared with each other here.

## The benchmark library

`benchmark/build.py` downloads each instrument from its official source, checks it against `benchmark/sources.lock.json` (SHA-256), splits it into provisions and writes `public/data/` and `src/generated/benchmark.json`. Text is stored verbatim: only line breaks, page furniture and line-end hyphenation change. The Genocide Convention's only born-digital source is an OCR'd scan, so its text is in `benchmark/manual/genocide-en.txt`, corrected against the page images (each correction is listed there).

```sh
python3 -m venv benchmark/.venv && benchmark/.venv/bin/pip install -r benchmark/requirements.txt
benchmark/.venv/bin/python benchmark/build.py      # needs poppler (pdftotext) too
python3 benchmark/rubrics.py                        # after changing the benchmark or rubrics/*.json
```

English is authoritative. Persian translations are pending review (`fa_status: pending`); nothing machine-translated is published as text.

Tier 2 (organisational documents): the OSCE/ODIHR–Venice Commission *Guidelines on Political Party Regulation* (2nd ed., 2020) and *Joint Guidelines on Freedom of Association* (2014), Principles 1–11 of each.

## Deploying

```sh
npm install
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put SHARED_SECRET
npx wrangler secret put API_KEYS          # constitutions:<key>,atlas:<key>
npx wrangler deploy
```

For Turnstile, set `TURNSTILE_SITE_KEY` in `wrangler.toml` and `npx wrangler secret put TURNSTILE_SECRET`.

## Gate 2 — Normative compliance

Jomhoor structurally commits to a single publication constraint: content must not advocate, justify, or normalize violations of the international human-rights baseline below.

### Normative baseline

Gate 2 checks content against the following instruments:

1. Universal Declaration of Human Rights (UDHR)
2. International Covenant on Civil and Political Rights (ICCPR)
3. International Covenant on Economic, Social and Cultural Rights (ICESCR)
4. Convention on the Prevention and Punishment of the Crime of Genocide
5. Convention against Torture (CAT)
6. International Convention on the Elimination of All Forms of Racial Discrimination (ICERD)
7. Convention on the Rights of the Child (CRC)
8. Convention on the Elimination of All Forms of Discrimination against Women (CEDAW)
9. Convention on the Rights of Persons with Disabilities (CRPD)
10. International Convention for the Protection of All Persons from Enforced Disappearance (CED)
11. Rome Statute of the International Criminal Court (war crimes, crimes against humanity, genocide)
12. Yogyakarta Principles and Yogyakarta Principles +10 (application of international human-rights law to SOGIESC protections)

These are not platform-specific values; they are the legal-moral minimum floor used by the platform moderation gate.

### How the check runs

- **Model:** `claude-opus-5` with adaptive thinking and a strict JSON-schema verdict (`src/claude.ts`). A refusal falls back server-side to Anthropic's recommended model.
- **Language:** the rubric is written in English; posts may be Persian, Arabic, English or mixed, and the reason is written in the post's language.
- **Hook point:** pre-publish in the Taraaz API, after identity/signature checks and before storage/fan-out.
- **Failure behavior:** if blocked, the author receives a reason and can revise/resubmit; Gate 2 is a revision loop at pre-publish rather than an adjudicated appeal process.

### What this gate is (and is not)

This is not a word-level toxicity filter. The gate performs semantic normative reasoning: policy disagreement is allowed; content that endorses human-rights violations is blocked.
