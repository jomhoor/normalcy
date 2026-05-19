# normalcy

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

- **Model:** semantic reasoning LLM. MVP may use a smaller open model with the same rubric; once AWS Bedrock integration is enabled for production, the target model is Claude 3.5 Sonnet.
- **Language:** Persian-native prompt and rubric. User content and relevant convention passages are evaluated in Persian.
- **Hook point:** pre-publish in the Taraaz API, after identity/signature checks and before storage/fan-out.
- **Failure behavior:** if blocked, the author receives a reason and can revise/resubmit; Gate 2 is a revision loop at pre-publish rather than an adjudicated appeal process.

### What this gate is (and is not)

This is not a word-level toxicity filter. The gate performs semantic normative reasoning: policy disagreement is allowed; content that endorses human-rights violations is blocked.
