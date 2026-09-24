/* normalcy — benchmark library, text checker, audits. No build step, no dependencies. */
(() => {
"use strict";

// ------------------------------------------------------------------ i18n
const T = {
  fa: {
    tagline: "سنجه‌ی حقوق بشر",
    nav_home: "خانه", nav_library: "کتابخانه", nav_check: "آزمودن متن", nav_audits: "ممیزی‌ها",
    lang_switch: "English",
    footer_sources: "متن اسناد از منابع رسمی (دفتر کمیساریای عالی حقوق بشر، مجموعه‌ی معاهدات سازمان ملل، کمیسیون ونیز، yogyakartaprinciples.org) گرفته و بی‌تغییر نگه‌داری شده است.",
    foot_corpus: "اسناد بنیادین", foot_atlas: "اطلس جامعه مدنی ایران",
    benchmark_version: "نسخه‌ی متن بالادستی",

    hero_label: "متن بالادستی",
    hero_title: "سنجش متن‌ها با حقوق بین‌المللی بشر",
    hero_body: "نرمالسی متن‌ها را — از قانون اساسی و اساسنامه تا یک پست — با اسناد بین‌المللی حقوق بشر می‌سنجد. متن کامل این اسناد، بند به بند و با شناسه‌ی پایدار، این‌جا نگه‌داری می‌شود تا هر داوری فقط به متنی استناد کند که واقعاً وجود دارد.",
    cta_library: "کتابخانه‌ی اسناد", cta_check: "آزمودن یک متن",
    stat_instruments: "سند", stat_provisions: "ماده و اصل", stat_ids: "شناسه‌ی قابل استناد",
    principle_title: "معیار، حقوق بین‌الملل بشر است — نه قانون هیچ دولتی",
    principle_body: "قانون اساسی ۱۳۵۸ جمهوری اسلامی و کارنامه‌ی تعهدات آن هرگز نقطه‌ی مرجع نیستند؛ آن قانون تنها یکی از متن‌هایی است که مانند هر متن دیگری سنجیده می‌شود.",
    tier1: "لایه‌ی ۱ — برای همه‌ی متن‌ها",
    tier1_sub: "معاهده‌ها و اعلامیه‌های بنیادین حقوق بشر، حقوق کیفری بین‌المللی، و اصول یوگیاکارتا.",
    tier2: "لایه‌ی ۲ — برای اسناد سازمانی",
    tier2_sub: "رهنمودهای غیرالزام‌آور ODIHR سازمان امنیت و همکاری اروپا و کمیسیون ونیز، برای اساسنامه‌ی احزاب و انجمن‌ها.",
    who_title: "چه کسانی از آن استفاده می‌کنند",
    who_atlas: "اطلس جامعه مدنی ایران", who_atlas_body: "نتیجه‌ی ممیزی اسناد سازمان‌ها را کنار صفحه‌ی هر سازمان نشان می‌دهد.",
    who_corpus: "اسناد بنیادین", who_corpus_body: "پیکره‌ای از قانون‌های اساسی و پیش‌نویس‌های ایران که ماده به ماده با این کتابخانه سنجیده می‌شوند.",
    who_jomhoor: "جمهور", who_jomhoor_body: "در آینده: بررسی پست‌ها پیش از انتشار؛ فقط تأیید، توجیه یا عادی‌سازی نقض حقوق بشر مانع انتشار است.",
    open_library: "دیدن همه‌ی اسناد",

    lib_title: "کتابخانه‌ی متن بالادستی",
    lib_body: "هر سند به ماده‌ها و بندهایی با شناسه‌ی پایدار (مانند ICCPR.19.3) تقسیم شده است. با کلیک روی یک شناسه، آن را کپی کنید.",
    lib_fa_note: "متن انگلیسی مرجع است. ترجمه‌ی فارسیِ بازبینی‌شده هنوز افزوده نشده است؛ برای اعلامیه‌ی جهانی، ترجمه‌ی رسمی سازمان ملل به صورت PDF در دسترس است.",
    search_all: "جست‌وجو در همه‌ی اسناد یا رفتن به یک شناسه (مثلاً ICCPR.19.3)…",
    search_loading: "در حال بارگذاری همه‌ی اسناد…",
    no_results: "چیزی پیدا نشد.",
    results_n: (n) => `${fmt(n)} نتیجه`,
    provisions_n: (n) => `${fmt(n)} ماده`,
    ids_n: (n) => `${fmt(n)} شناسه`,
    kind_treaty: "معاهده", kind_declaration: "اعلامیه", kind_principles: "اصول", kind_guidelines: "رهنمود",
    applies_parties: "احزاب سیاسی", applies_associations: "انجمن‌ها و سازمان‌های مدنی",

    back_library: "کتابخانه",
    f_adopted: "تصویب", f_source: "منبع", f_version: "متن", f_sha: "اثرانگشت فایل منبع (SHA-256)", f_fa: "ترجمه‌ی فارسی",
    fa_pending: "در انتظار ترجمه‌ی بازبینی‌شده",
    fa_official_pdf: "ترجمه‌ی رسمی سازمان ملل (PDF)",
    filter_here: "جست‌وجو در همین سند…",
    preamble: "دیباچه",
    article: "ماده", principle: "اصل",
    copied: "کپی شد",
    not_found: "این سند یا شناسه پیدا نشد.",

    check_title: "آزمودن یک متن",
    check_body: "متنی را وارد کنید تا بررسی شود که آیا نقض حقوق بشر را ترویج، توجیه یا عادی‌سازی می‌کند. مخالفت سیاسی، نقد و بحث آزاد است و مانع نیست.",
    f_header: "عنوان (اختیاری)", f_text: "متن",
    placeholder_text: "متن را این‌جا بنویسید یا بچسبانید — فارسی، انگلیسی یا عربی…",
    btn_check: "بررسی", checking: "در حال بررسی…",
    v_compliant: "سازگار با حقوق بشر", v_non_compliant: "ناسازگار با حقوق بشر",
    from_cache: "از حافظه‌ی نتایج (این متن پیش‌تر بررسی شده بود)",
    privacy: "متن برای ارزیابی به API شرکت Anthropic (مدل Claude) فرستاده می‌شود. نتیجه با اثرانگشت متن ذخیره می‌شود تا متن تکراری دوباره فرستاده نشود. اطلاعات شخصی وارد نکنید.",
    demo_note: "این نسخه‌ی نمایشی است. داوری ماشینی است و جای بررسی انسانی را نمی‌گیرد.",
    e_checker_not_configured: "سامانه‌ی بررسی هنوز راه‌اندازی نشده است. کتابخانه در دسترس است.",
    e_rate_limited: "تعداد درخواست‌ها از حد مجاز گذشت. چند دقیقه‌ی دیگر دوباره امتحان کنید.",
    e_text_too_long: "متن بیش از حد طولانی است.",
    e_empty_text: "متنی وارد نشده است.",
    e_turnstile_failed: "تأیید «ربات نیستم» ناموفق بود. دوباره امتحان کنید.",
    e_generic: "بررسی انجام نشد. دوباره امتحان کنید.",
    checker_off: "بررسی‌کننده هنوز فعال نیست",

    aud_title: "ممیزی اسناد",
    aud_body: "قانون‌های اساسی، پیش‌نویس‌ها و اساسنامه‌ها حق به حق با متن بالادستی سنجیده می‌شوند. هر داوری به ماده‌های سند و به شناسه‌های این کتابخانه استناد می‌کند.",
    aud_none: "هنوز هیچ ممیزی‌ای منتشر نشده است. ممیزی‌ها پس از تأیید یک بازبین انسانی، با نام بازبین و تاریخ، این‌جا منتشر می‌شوند.",
    aud_scale: "مقیاس داوری",
    col_verdict: "داوری", col_meaning: "معنا",
    vd_guaranteed: "تضمین‌شده", vm_guaranteed: "حق صریحاً حمایت شده است.",
    vd_restricted_clawback: "محدودشده با قید", vm_restricted_clawback: "حق حمایت شده اما با قیدی مانند «در چارچوب قانون» یا «طبق موازین اسلامی» پس گرفته شده است.",
    vd_silent: "ساکت", vm_silent: "به این حق اشاره‌ای نشده است.",
    vd_contradicted: "در تعارض", vm_contradicted: "متن برخلاف این حق حکم می‌کند.",
    vd_disputed: "مورد اختلاف", vm_disputed: "بازبین‌ها درباره‌ی آن هم‌نظر نیستند.",
    aud_rules: "قاعده‌ها",
    rule_cite: "هر داوری باید هم به ماده‌های سند و هم به شناسه‌های متن بالادستی استناد کند. شناسه‌ای که در این کتابخانه نباشد رد می‌شود.",
    rule_like: "همانند با همانند: اساسنامه فقط با اساسنامه، و قانون اساسی با قانون اساسی مقایسه می‌شود. متن بالادستی با همه سنجیده می‌شود.",
    rule_silence: "در ممیزی اسناد، سکوت هم معنا دارد — برخلاف بررسی پست‌ها که فقط تأیید نقض را می‌سنجد.",
    rule_review: "هیچ نتیجه‌ای بدون تأیید بازبین انسانی منتشر نمی‌شود.",
    rule_correct: "سازمان‌ها می‌توانند درخواست اصلاح بفرستند.",
    aud_corpus: "پیکره‌ی اسناد بنیادین",
    aud_corpus_body: "۳۴ سند — قانون‌های اساسی، پیش‌نویس‌ها و برنامه‌ها — در مخزن عمومی Atlasiran/constitutions.",
    send_correction: "ارسال درخواست اصلاح",
  },
  en: {
    tagline: "the human-rights benchmark",
    nav_home: "Home", nav_library: "Library", nav_check: "Check a text", nav_audits: "Audits",
    lang_switch: "فارسی",
    footer_sources: "Instrument texts are taken from official sources (OHCHR, the UN Treaty Collection, the Venice Commission, yogyakartaprinciples.org) and stored unchanged.",
    foot_corpus: "Constitutions corpus", foot_atlas: "Atlas of Iranian civil society",
    benchmark_version: "Benchmark version",

    hero_label: "The benchmark",
    hero_title: "Measuring texts against international human-rights law",
    hero_body: "normalcy measures texts — constitutions, bylaws, a single post — against international human-rights law. The full text of each instrument is stored here, provision by provision with stable IDs, so every verdict cites text that actually exists.",
    cta_library: "Browse the library", cta_check: "Check a text",
    stat_instruments: "instruments", stat_provisions: "articles and principles", stat_ids: "citable IDs",
    principle_title: "The benchmark is international human-rights law — not any state's law",
    principle_body: "The 1979 constitution of the Islamic Republic and its treaty record are never a reference point. That constitution is one of the texts being assessed, like any other.",
    tier1: "Tier 1 — applies to every text",
    tier1_sub: "The core human-rights treaties and declaration, international criminal law, and the Yogyakarta Principles.",
    tier2: "Tier 2 — organisational documents",
    tier2_sub: "Non-binding OSCE/ODIHR and Venice Commission guidelines, for the bylaws of parties and associations.",
    who_title: "Who uses it",
    who_atlas: "Atlas of Iranian civil society", who_atlas_body: "Shows the audit of each organisation's founding documents next to its page.",
    who_corpus: "Constitutions corpus", who_corpus_body: "Iranian constitutions and drafts, assessed article by article against this library.",
    who_jomhoor: "Jomhoor", who_jomhoor_body: "Later: a pre-publication check on posts. Only endorsing, justifying or normalising a violation blocks a post.",
    open_library: "See all instruments",

    lib_title: "The benchmark library",
    lib_body: "Every instrument is split into articles and paragraphs with stable IDs (such as ICCPR.19.3). Click an ID to copy it.",
    lib_fa_note: "English is authoritative. Reviewed Persian translations have not been added yet; for the Universal Declaration the UN's official Persian translation is available as a PDF.",
    search_all: "Search every instrument, or jump to an ID (e.g. ICCPR.19.3)…",
    search_loading: "Loading every instrument…",
    no_results: "Nothing found.",
    results_n: (n) => `${fmt(n)} result${n === 1 ? "" : "s"}`,
    provisions_n: (n) => `${fmt(n)} provisions`,
    ids_n: (n) => `${fmt(n)} IDs`,
    kind_treaty: "Treaty", kind_declaration: "Declaration", kind_principles: "Principles", kind_guidelines: "Guidelines",
    applies_parties: "Political parties", applies_associations: "Associations and NGOs",

    back_library: "Library",
    f_adopted: "Adopted", f_source: "Source", f_version: "Text", f_sha: "Source file fingerprint (SHA-256)", f_fa: "Persian translation",
    fa_pending: "Awaiting a reviewed translation",
    fa_official_pdf: "Official UN translation (PDF)",
    filter_here: "Search this instrument…",
    preamble: "Preamble",
    article: "Article", principle: "Principle",
    copied: "Copied",
    not_found: "That instrument or ID was not found.",

    check_title: "Check a text",
    check_body: "Enter a text to check whether it advocates, justifies or normalises human-rights violations. Political disagreement, criticism and debate are allowed and never block a text.",
    f_header: "Title (optional)", f_text: "Text",
    placeholder_text: "Write or paste the text here — Persian, English or Arabic…",
    btn_check: "Check", checking: "Checking…",
    v_compliant: "Compliant with human rights", v_non_compliant: "Not compliant with human rights",
    from_cache: "From the results cache (this text was checked before)",
    privacy: "The text is sent to Anthropic's API (Claude) for evaluation. The result is stored under a fingerprint of the text so repeated texts are not sent again. Don't enter personal information.",
    demo_note: "This is a demo. The verdict is automated and is no substitute for human review.",
    e_checker_not_configured: "The checker is not switched on yet. The library is available.",
    e_rate_limited: "Too many requests. Please try again in a few minutes.",
    e_text_too_long: "The text is too long.",
    e_empty_text: "No text was entered.",
    e_turnstile_failed: "The \"not a robot\" check failed. Please try again.",
    e_generic: "The check did not complete. Please try again.",
    checker_off: "The checker is not switched on yet",

    aud_title: "Document audits",
    aud_body: "Constitutions, drafts and bylaws are assessed right by right against the benchmark. Every verdict cites the document's articles and the IDs in this library.",
    aud_none: "No audits have been published yet. Each audit is published here only after a human reviewer signs it off, with the reviewer's name and the date.",
    aud_scale: "Verdict scale",
    col_verdict: "Verdict", col_meaning: "Meaning",
    vd_guaranteed: "Guaranteed", vm_guaranteed: "The right is explicitly protected.",
    vd_restricted_clawback: "Restricted (claw-back)", vm_restricted_clawback: "Protected, but taken back by a clause such as \"within the framework of law\" or \"according to Islamic standards\".",
    vd_silent: "Silent", vm_silent: "The right is not mentioned.",
    vd_contradicted: "Contradicted", vm_contradicted: "The document goes against the right.",
    vd_disputed: "Disputed", vm_disputed: "Reviewers disagree.",
    aud_rules: "Rules",
    rule_cite: "Every verdict cites both the document's articles and the benchmark IDs it rests on. An ID that is not in this library is rejected.",
    rule_like: "Like with like: bylaws are compared only with bylaws, constitutions with constitutions. The benchmark applies to all.",
    rule_silence: "In document audits silence counts — unlike post checks, where only endorsing a violation does.",
    rule_review: "No result is published without a human reviewer's sign-off.",
    rule_correct: "Organisations can submit corrections.",
    aud_corpus: "The constitutions corpus",
    aud_corpus_body: "34 documents — constitutions, drafts and programmes — in the public Atlasiran/constitutions repository.",
    send_correction: "Submit a correction",
  },
};

let LANG = "fa";
try { LANG = localStorage.getItem("normalcy.lang") || "fa"; } catch (_) { /* storage unavailable */ }
const t = (k, ...a) => { const v = T[LANG][k] ?? T.fa[k] ?? k; return typeof v === "function" ? v(...a) : v; };
const fmt = (n) => Number(n).toLocaleString(LANG === "fa" ? "fa-IR" : "en-US");
const year = (d) => Number(String(d).slice(0, 4)).toLocaleString(LANG === "fa" ? "fa-IR" : "en-US", { useGrouping: false });

// ------------------------------------------------------------------ helpers
const $ = (s, r = document) => r.querySelector(s);
const app = $("#app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cache = new Map();
async function getJSON(url) {
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }));
  return cache.get(url);
}
const index = () => getJSON("data/instruments.json");
const instrument = (id) => getJSON(`data/provisions/${encodeURIComponent(id)}.json`);
let CONFIG = null;
const config = async () => CONFIG ??= await fetch("api/config").then((r) => r.ok ? r.json() : null).catch(() => null);

function copy(text, el) {
  const done = () => { if (!el) return; const old = el.textContent; el.classList.add("copied"); el.textContent = t("copied"); setTimeout(() => { el.textContent = old; el.classList.remove("copied"); }, 1100); };
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => {}); else done();
}
document.addEventListener("click", (e) => {
  const chip = e.target.closest("[data-copy]");
  if (chip) { e.preventDefault(); copy(chip.dataset.copy, chip); }
});

function label(p, meta) {
  if (p.number === "preamble") return t("preamble");
  if (p.label && LANG === "en") return p.label;
  const word = meta.kind === "principles" || meta.kind === "guidelines" ? t("principle") : t("article");
  if (typeof p.number === "string") return p.heading;               // e.g. YP10 additional obligations
  return `${word} ${p.label && LANG === "fa" ? p.label.replace("Article ", "") : fmt(p.number)}`;
}

// Render verbatim English text; numbered paragraphs and lettered obligations get their own ID chip.
function renderText(p) {
  const paraIds = new Map((p.paras || []).map((q) => [String(q.n), q.id]));
  return p.text_en.split(/\n\n+/).map((block) => {
    const lines = block.split("\n");
    return lines.map((line, i) => {
      const m = line.match(/^(\d{1,3}|[A-Z])\.\s/);
      const id = m && paraIds.get(m[1]);
      const chip = id ? ` <span class="chip id para-id" data-copy="${esc(id)}" title="${esc(id)}">${esc(id)}</span>` : "";
      const isItem = /^\(\s?([a-z]{1,4}|[ivx]+)\s?\)\s/.test(line) || (m && /^[A-Z]$/.test(m[1])) || (i > 0 && m);
      const html = esc(line) + chip;
      return isItem ? `<span class="item">${html}</span>` : (lines.length > 1 && i === 0 ? `<span>${html}</span>` : html);
    }).join("");
  }).map((b) => `<p>${b}</p>`).join("");
}

function highlight(html, q) {
  if (!q) return html;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return html.split(/(<[^>]+>)/).map((part) => part.startsWith("<") ? part : part.replace(re, "<mark>$1</mark>")).join("");
}

// ------------------------------------------------------------------ views
async function viewHome() {
  const idx = await index();
  const all = idx.instruments;
  const n = (k) => all.reduce((s, i) => s + i[k], 0);
  const card = (i) => `
    <a class="card inst" href="#/i/${esc(i.id)}">
      <span class="fa">${esc(LANG === "fa" ? i.fa : i.en)}</span>
      <span class="en ltr">${esc(LANG === "fa" ? i.en : i.id)}</span>
      <span class="meta"><span class="chip">${t("kind_" + i.kind)}</span><span class="chip">${t("provisions_n", i.n_provisions)}</span></span>
    </a>`;
  app.innerHTML = `
    <section class="hero">
      <span class="label">${t("hero_label")}</span>
      <h1 class="title">${t("hero_title")}</h1>
      <p class="body">${t("hero_body")}</p>
      <div class="cta">
        <a class="btn btn-primary" href="#/library">${t("cta_library")}</a>
        <a class="btn btn-outline" href="#/check">${t("cta_check")}</a>
      </div>
      <div class="stats">
        <div class="stat"><b>${fmt(all.length)}</b><span>${t("stat_instruments")}</span></div>
        <div class="stat"><b>${fmt(n("n_provisions"))}</b><span>${t("stat_provisions")}</span></div>
        <div class="stat"><b>${fmt(n("n_citable"))}</b><span>${t("stat_ids")}</span></div>
      </div>
    </section>
    <section style="padding-top:8px">
      <div class="note warm"><b>${t("principle_title")}</b><br>${t("principle_body")}</div>
    </section>
    <section>
      <div class="tier-head"><div><h2 class="h2">${t("tier1")}</h2><p class="body small">${t("tier1_sub")}</p></div></div>
      <div class="grid grid-3">${all.filter((i) => i.tier === 1).map(card).join("")}</div>
    </section>
    <section>
      <div class="tier-head"><div><h2 class="h2">${t("tier2")}</h2><p class="body small">${t("tier2_sub")}</p></div></div>
      <div class="grid grid-2">${all.filter((i) => i.tier === 2).map(card).join("")}</div>
    </section>
    <section>
      <h2 class="h2" style="margin-bottom:14px">${t("who_title")}</h2>
      <div class="grid grid-3">
        <div class="card"><h3>${t("who_atlas")}</h3><p class="body small">${t("who_atlas_body")}</p></div>
        <div class="card"><h3>${t("who_corpus")}</h3><p class="body small">${t("who_corpus_body")}</p></div>
        <div class="card"><h3>${t("who_jomhoor")}</h3><p class="body small">${t("who_jomhoor_body")}</p></div>
      </div>
    </section>`;
}

async function viewLibrary(q = "") {
  const idx = await index();
  const all = idx.instruments;
  const card = (i) => `
    <a class="card inst" href="#/i/${esc(i.id)}">
      <span class="fa">${esc(LANG === "fa" ? i.fa : i.en)}</span>
      <span class="en ltr">${esc(LANG === "fa" ? i.en : i.version)}</span>
      <span class="meta">
        <span class="chip">${t("kind_" + i.kind)}</span>
        <span class="chip">${year(i.adopted)}</span>
        <span class="chip">${t("provisions_n", i.n_provisions)}</span>
        <span class="chip">${t("ids_n", i.n_citable)}</span>
        ${i.applies !== "all" ? `<span class="chip">${t("applies_" + i.applies)}</span>` : ""}
      </span>
    </a>`;
  app.innerHTML = `
    <section class="hero" style="padding-bottom:10px">
      <span class="label">${t("nav_library")}</span>
      <h1 class="title">${t("lib_title")}</h1>
      <p class="body">${t("lib_body")}</p>
      <div class="toolbar"><input class="input" id="q" type="search" autocomplete="off" placeholder="${esc(t("search_all"))}" value="${esc(q)}"></div>
      <div id="results"></div>
    </section>
    <div id="lists">
      <section style="padding-top:10px">
        <div class="tier-head"><h2 class="h2">${t("tier1")}</h2></div>
        <div class="grid grid-3">${all.filter((i) => i.tier === 1).map(card).join("")}</div>
      </section>
      <section>
        <div class="tier-head"><h2 class="h2">${t("tier2")}</h2></div>
        <div class="grid grid-2">${all.filter((i) => i.tier === 2).map(card).join("")}</div>
      </section>
      <section style="padding-top:0"><div class="note">${t("lib_fa_note")}</div></section>
    </div>`;
  const input = $("#q");
  let timer;
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => search(input.value), 220); });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") jumpToId(input.value); });
  if (q) search(q);
}

async function jumpToId(raw) {
  const id = raw.trim().toUpperCase().replace(/\s+/g, "");
  const m = id.match(/^([A-Z0-9-]+)\.(.+)$/);
  if (!m) return;
  const idx = await index();
  const inst = idx.instruments.find((i) => i.id === m[1]);
  if (!inst) return;
  const data = await instrument(inst.id);
  const hit = data.provisions.find((p) => p.id.toUpperCase() === id || (p.paras || []).some((q) => q.id.toUpperCase() === id));
  if (hit) location.hash = `#/i/${inst.id}/${encodeURIComponent(String(hit.number))}`;
}

let allLoaded = null;
async function search(q) {
  const box = $("#results"), lists = $("#lists");
  q = q.trim();
  if (!box) return;
  if (q.length < 2) { box.innerHTML = ""; lists.classList.remove("hidden"); return; }
  lists.classList.add("hidden");
  if (!allLoaded) {
    box.innerHTML = `<p class="muted small">${t("search_loading")}</p>`;
    const idx = await index();
    allLoaded = await Promise.all(idx.instruments.map((i) => instrument(i.id)));
  }
  const needle = q.toLowerCase();
  const hits = [];
  for (const d of allLoaded) {
    for (const p of d.provisions) {
      const hay = `${p.id} ${p.heading || ""} ${p.text_en}`.toLowerCase();
      const at = hay.indexOf(needle);
      if (at >= 0) hits.push({ d, p, at: p.text_en.toLowerCase().indexOf(needle) });
      if (hits.length >= 80) break;
    }
  }
  box.innerHTML = `<p class="muted small">${t("results_n", hits.length)}</p><div class="results">${hits.map(({ d, p, at }) => {
    const start = Math.max(0, at - 90);
    const snip = (start > 0 ? "…" : "") + p.text_en.slice(start, start + 240).replace(/\s+/g, " ") + "…";
    return `<a class="card result" href="#/i/${esc(d.instrument.id)}/${encodeURIComponent(String(p.number))}">
      <span class="chip id">${esc(p.id)}</span> <b class="small">${esc(LANG === "fa" ? d.instrument.fa : d.instrument.en)}</b>
      ${p.heading && p.number !== "preamble" ? `<span class="small muted ltr"> — ${esc(p.heading)}</span>` : ""}
      <div class="snip">${highlight(esc(snip), q)}</div></a>`;
  }).join("") || `<p class="muted">${t("no_results")}</p>`}</div>`;
}

async function viewInstrument(id, target) {
  const idx = await index();
  const meta = idx.instruments.find((i) => i.id === id);
  if (!meta) { app.innerHTML = `<section><p>${t("not_found")}</p></section>`; return; }
  const data = await instrument(id);
  const fa = meta.fa_source_url
    ? `${t("fa_pending")} · <a href="${esc(meta.fa_source_url)}" rel="noopener">${t("fa_official_pdf")}</a>`
    : t("fa_pending");
  app.innerHTML = `
    <section class="hero inst-head" style="padding-bottom:0">
      <div class="crumbs"><a href="#/library">${t("back_library")}</a> / <span class="ltr">${esc(meta.id)}</span></div>
      <span class="label">${t("kind_" + meta.kind)} · ${LANG === "fa" ? `لایه‌ی ${fmt(meta.tier)}` : `Tier ${meta.tier}`}</span>
      <h1 class="title">${esc(LANG === "fa" ? meta.fa : meta.en)}</h1>
      ${LANG === "fa" ? `<div class="en ltr">${esc(meta.en)}</div>` : ""}
      <dl class="facts">
        <div><dt>${t("f_adopted")}</dt><dd class="ltr" style="text-align:start">${esc(meta.adopted)}</dd></div>
        <div><dt>${t("f_version")}</dt><dd class="ltr" style="text-align:start">${esc(meta.version)}</dd></div>
        <div><dt>${t("f_source")}</dt><dd><a class="ltr" href="${esc(meta.source_url)}" rel="noopener">${esc(new URL(meta.source_url).hostname)}</a></dd></div>
        <div><dt>${t("f_sha")}</dt><dd class="mono" title="${esc(meta.source_sha256)}">${esc(meta.source_sha256.slice(0, 16))}…</dd></div>
        <div><dt>${t("f_fa")}</dt><dd>${fa}</dd></div>
      </dl>
      <div class="toolbar"><input class="input" id="filter" type="search" autocomplete="off" placeholder="${esc(t("filter_here"))}"></div>
      <nav class="jump" aria-label="provisions">${data.provisions.map((p) =>
        `<a href="#/i/${esc(id)}/${encodeURIComponent(String(p.number))}">${esc(p.number === "preamble" ? "¶" : String(p.number).replace("ASO.", "+"))}</a>`).join("")}</nav>
    </section>
    <div id="provs">${data.provisions.map((p) => `
      <article class="card prov" id="p-${esc(String(p.number))}" data-hay="${esc((p.id + " " + (p.heading || "") + " " + p.text_en).toLowerCase())}">
        <div class="prov-head">
          <span class="chip id" data-copy="${esc(p.id)}" title="${esc(p.id)}">${esc(p.id)}</span>
          <h3>${esc(label(p, meta))}</h3>
          ${p.heading && p.number !== "preamble" && typeof p.number !== "string" ? `<span class="small muted ltr">${esc(p.heading)}</span>` : ""}
        </div>
        <div class="prov-text">${renderText(p)}</div>
      </article>`).join("")}</div>`;
  const filter = $("#filter");
  filter.addEventListener("input", () => {
    const q = filter.value.trim().toLowerCase();
    for (const el of document.querySelectorAll(".prov")) el.classList.toggle("hidden", q.length > 1 && !el.dataset.hay.includes(q));
  });
  if (target) {
    const el = document.getElementById(`p-${target}`);
    if (el) { el.classList.add("target"); requestAnimationFrame(() => el.scrollIntoView({ block: "start" })); }
  } else window.scrollTo(0, 0);
}

let turnstileReady = null;
function loadTurnstile() {
  return turnstileReady ??= new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true; s.onload = () => resolve(window.turnstile); s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

async function viewCheck() {
  const cfg = await config();
  const max = cfg?.max_text ?? 6000;
  app.innerHTML = `
    <section class="hero" style="padding-bottom:14px">
      <span class="label">${t("nav_check")}</span>
      <h1 class="title">${t("check_title")}</h1>
      <p class="body">${t("check_body")}</p>
    </section>
    <div class="grid" style="grid-template-columns:minmax(0,1fr)">
      <form class="card form" id="form">
        ${cfg && !cfg.checker ? `<div class="note warm" style="margin-bottom:6px">${t("e_checker_not_configured")}</div>` : ""}
        <label for="h">${t("f_header")}</label>
        <input class="input" id="h" maxlength="300" autocomplete="off">
        <label for="b">${t("f_text")}</label>
        <textarea class="input" id="b" maxlength="${max}" placeholder="${esc(t("placeholder_text"))}" required></textarea>
        <div id="ts" style="margin-top:12px"></div>
        <div class="row">
          <button class="btn btn-primary" id="go" type="submit" ${cfg && !cfg.checker ? "disabled" : ""}>${cfg && !cfg.checker ? t("checker_off") : t("btn_check")}</button>
          <span class="counter" id="count">${fmt(0)} / ${fmt(max)}</span>
        </div>
        <p class="small muted" style="margin:14px 0 0">${t("privacy")}<br>${t("demo_note")}</p>
      </form>
      <div class="card hidden" id="out" aria-live="polite"></div>
    </div>`;
  const body = $("#b"), count = $("#count"), out = $("#out"), go = $("#go");
  body.addEventListener("input", () => { count.textContent = `${fmt(body.value.length)} / ${fmt(max)}`; });
  let widget = null;
  if (cfg?.turnstile_site_key) {
    const ts = await loadTurnstile();
    if (ts) widget = ts.render("#ts", { sitekey: cfg.turnstile_site_key, language: LANG, theme: "auto" });
  }
  $("#form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!body.value.trim()) return;
    go.disabled = true; go.innerHTML = `<span class="spin"></span>${t("checking")}`;
    out.classList.add("hidden");
    try {
      const res = await fetch("api/check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          header: $("#h").value, text: body.value,
          turnstile: widget !== null && window.turnstile ? window.turnstile.getResponse(widget) : undefined,
        }),
      });
      const r = await res.json().catch(() => ({ error: "generic" }));
      out.classList.remove("hidden");
      if (!res.ok || r.error) {
        out.innerHTML = `<p class="err">${esc(T[LANG]["e_" + r.error] ? t("e_" + r.error) : t("e_generic"))}</p>`;
      } else {
        const ok = r.verdict === "compliant";
        out.innerHTML = `
          <span class="verdict ${ok ? "ok" : "bad"}">${ok ? "✓" : "✕"} ${t(ok ? "v_compliant" : "v_non_compliant")}</span>
          <p class="reason" dir="auto">${esc(r.reason)}</p>
          <div class="meta-line">
            ${r.cached ? `<span>${t("from_cache")}</span>` : ""}
            <span class="ltr">${esc(r.model)} · ${esc(r.rubric)} · benchmark ${esc(r.benchmark)}</span>
          </div>`;
      }
    } catch (_) {
      out.classList.remove("hidden"); out.innerHTML = `<p class="err">${t("e_generic")}</p>`;
    } finally {
      go.disabled = false; go.textContent = t("btn_check");
      if (widget !== null && window.turnstile) window.turnstile.reset(widget);
    }
  });
}

async function viewAudits() {
  const verdicts = ["guaranteed", "restricted_clawback", "silent", "contradicted", "disputed"];
  app.innerHTML = `
    <section class="hero" style="padding-bottom:14px">
      <span class="label">${t("nav_audits")}</span>
      <h1 class="title">${t("aud_title")}</h1>
      <p class="body">${t("aud_body")}</p>
    </section>
    <div class="note">${t("aud_none")}</div>
    <section>
      <h2 class="h2" style="margin-bottom:14px">${t("aud_scale")}</h2>
      <div class="card table-wrap" style="padding:6px 8px">
        <table class="table">
          <thead><tr><th>${t("col_verdict")}</th><th>${t("col_meaning")}</th></tr></thead>
          <tbody>${verdicts.map((v) => `<tr><td><span class="pill v-${v}">${t("vd_" + v)}</span><div class="mono muted ltr" style="text-align:start;margin-top:4px">${v}</div></td><td>${t("vm_" + v)}</td></tr>`).join("")}</tbody>
        </table>
      </div>
    </section>
    <section style="padding-top:0">
      <div class="grid grid-2">
        <div class="card">
          <h3>${t("aud_rules")}</h3>
          <ol class="steps small">
            <li>${t("rule_cite")}</li><li>${t("rule_like")}</li><li>${t("rule_silence")}</li><li>${t("rule_review")}</li><li>${t("rule_correct")}</li>
          </ol>
        </div>
        <div class="card">
          <h3>${t("aud_corpus")}</h3>
          <p class="body small">${t("aud_corpus_body")}</p>
          <div class="cta" style="margin-top:14px">
            <a class="btn btn-outline" href="https://github.com/Atlasiran/constitutions" rel="noopener">GitHub</a>
            <a class="btn btn-outline" href="https://github.com/jomhoor/normalcy/issues" rel="noopener">${t("send_correction")}</a>
          </div>
        </div>
      </div>
    </section>`;
}

// ------------------------------------------------------------------ shell
function applyLang() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === "fa" ? "rtl" : "ltr";
  document.title = LANG === "fa" ? "normalcy — سنجه‌ی حقوق بشر" : "normalcy — the human-rights benchmark";
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  $("#langBtn").textContent = t("lang_switch");
  index().then((i) => { $("#footVersion").textContent = `${t("benchmark_version")}: ${i.version}`; }).catch(() => {});
}

async function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  const name = parts[0] || "home";
  for (const a of document.querySelectorAll("[data-route]")) {
    a.classList.toggle("active", a.dataset.route === (name === "i" ? "library" : name));
  }
  $("#links").classList.remove("open");
  try {
    if (name === "library") await viewLibrary();
    else if (name === "i") await viewInstrument(parts[1], parts[2]);
    else if (name === "check") await viewCheck();
    else if (name === "audits") await viewAudits();
    else await viewHome();
  } catch (err) {
    app.innerHTML = `<section><p class="err">${esc(t("e_generic"))}</p></section>`;
    console.error(err);
  }
  if (name !== "i") window.scrollTo(0, 0);
}

$("#langBtn").addEventListener("click", () => {
  LANG = LANG === "fa" ? "en" : "fa";
  try { localStorage.setItem("normalcy.lang", LANG); } catch (_) { /* ignore */ }
  applyLang(); route();
});
$("#menuBtn").addEventListener("click", () => {
  const open = $("#links").classList.toggle("open");
  $("#menuBtn").setAttribute("aria-expanded", String(open));
});
window.addEventListener("scroll", () => $("#nav").classList.toggle("scrolled", window.scrollY > 20), { passive: true });
window.addEventListener("hashchange", route);
applyLang();
route();
})();
