#!/usr/bin/env python3
"""Build the benchmark library (متن بالادستی) from official sources.

Downloads each instrument into benchmark/.cache, checks it against
benchmark/sources.lock.json, splits it into provisions with stable IDs
(ICCPR.19, ICCPR.19.3, YP.3.A, ...) and writes public/data/.

Text is stored verbatim: only line breaks, page furniture and line-end
hyphenation are changed. Needs PyMuPDF (benchmark/requirements.txt) and poppler.

    python3 benchmark/build.py            # build; fail if a source changed
    python3 benchmark/build.py --relock   # accept changed sources
"""
import hashlib, html, json, os, re, subprocess, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(HERE, ".cache")
LOCK = os.path.join(HERE, "sources.lock.json")
OUT = os.path.join(ROOT, "public", "data")
UA = "Mozilla/5.0 (normalcy benchmark builder; +https://github.com/jomhoor/normalcy)"
OHCHR = "https://www.ohchr.org/sites/default/files/Documents/ProfessionalInterest/"

UDHR_FA_PDF = "https://www.ohchr.org/sites/default/files/UDHR/Documents/UDHR_Translations/prs.pdf"

SOURCES = [
 dict(id="UDHR", tier=1, kind="declaration", adopted="1948-12-10",
      en="Universal Declaration of Human Rights", fa="اعلامیه جهانی حقوق بشر",
      url="https://www.un.org/en/about-us/universal-declaration-of-human-rights",
      version="UN General Assembly resolution 217 A (III)", parser="udhr_html",
      fa_url=UDHR_FA_PDF),
 dict(id="ICCPR", tier=1, kind="treaty", adopted="1966-12-16",
      en="International Covenant on Civil and Political Rights",
      fa="میثاق بین‌المللی حقوق مدنی و سیاسی",
      url=OHCHR + "ccpr.pdf", version="GA resolution 2200A (XXI)", parser="articles"),
 dict(id="ICESCR", tier=1, kind="treaty", adopted="1966-12-16",
      en="International Covenant on Economic, Social and Cultural Rights",
      fa="میثاق بین‌المللی حقوق اقتصادی، اجتماعی و فرهنگی",
      url=OHCHR + "cescr.pdf", version="GA resolution 2200A (XXI)", parser="articles"),
 dict(id="GENOCIDE", tier=1, kind="treaty", adopted="1948-12-09",
      en="Convention on the Prevention and Punishment of the Crime of Genocide",
      fa="کنوانسیون پیشگیری و مجازات جرم نسل‌کشی",
      url="https://treaties.un.org/doc/Treaties/1951/01/19510112%2008-12%20PM/Ch_IV_1p.pdf",
      version="UNTC certified true copy; OCR corrected against page images (benchmark/manual/genocide-en.txt)",
      parser="manual", manual="genocide-en.txt"),
 dict(id="CAT", tier=1, kind="treaty", adopted="1984-12-10",
      en="Convention against Torture and Other Cruel, Inhuman or Degrading Treatment or Punishment",
      fa="کنوانسیون منع شکنجه و دیگر رفتارها یا مجازات‌های ظالمانه، غیرانسانی یا تحقیرآمیز",
      url=OHCHR + "cat.pdf", version="GA resolution 39/46", parser="articles"),
 dict(id="ICERD", tier=1, kind="treaty", adopted="1965-12-21",
      en="International Convention on the Elimination of All Forms of Racial Discrimination",
      fa="کنوانسیون بین‌المللی رفع همه اشکال تبعیض نژادی",
      url=OHCHR + "cerd.pdf", version="GA resolution 2106 (XX)", parser="articles"),
 dict(id="CRC", tier=1, kind="treaty", adopted="1989-11-20",
      en="Convention on the Rights of the Child", fa="پیمان‌نامه حقوق کودک",
      url=OHCHR + "crc.pdf", version="GA resolution 44/25", parser="articles"),
 dict(id="CEDAW", tier=1, kind="treaty", adopted="1979-12-18",
      en="Convention on the Elimination of All Forms of Discrimination against Women",
      fa="کنوانسیون رفع همه اشکال تبعیض علیه زنان",
      url=OHCHR + "cedaw.pdf", version="GA resolution 34/180", parser="articles"),
 dict(id="CRPD", tier=1, kind="treaty", adopted="2006-12-13",
      en="Convention on the Rights of Persons with Disabilities",
      fa="کنوانسیون حقوق افراد دارای معلولیت",
      url="https://www.un.org/disabilities/documents/convention/convoptprot-e.pdf",
      version="GA resolution 61/106 (Convention only; Optional Protocol excluded)",
      parser="articles", titles=True, stop=r"^Optional Protocol to the Convention"),
 dict(id="CED", tier=1, kind="treaty", adopted="2006-12-20",
      en="International Convention for the Protection of All Persons from Enforced Disappearance",
      fa="کنوانسیون بین‌المللی حمایت از همه افراد در برابر ناپدیدسازی قهری",
      url=OHCHR + "disappearance-convention.pdf", version="GA resolution 61/177", parser="articles"),
 dict(id="ROME", tier=1, kind="treaty", adopted="1998-07-17",
      en="Rome Statute of the International Criminal Court",
      fa="اساسنامه رم دیوان کیفری بین‌المللی",
      url="https://legal.un.org/icc/statute/english/rome_statute(e).pdf",
      version="A/CONF.183/9 as corrected to 16 January 2002; later amendments (2010 Kampala, 2017, 2019) not included",
      parser="articles", titles=True),
 dict(id="YP", tier=1, kind="principles", adopted="2006-11",
      en="The Yogyakarta Principles", fa="اصول یوگیاکارتا",
      url="https://yogyakartaprinciples.org/wp-content/uploads/2016/08/principles_en.pdf",
      version="2007 publication", parser="yogyakarta", first=1),
 dict(id="YP10", tier=1, kind="principles", adopted="2017-11-10",
      en="The Yogyakarta Principles plus 10", fa="اصول یوگیاکارتا به‌علاوه ۱۰",
      url="https://yogyakartaprinciples.org/wp-content/uploads/2017/11/A5_yogyakartaWEB-2.pdf",
      version="2017 publication", parser="yogyakarta", first=30),
 dict(id="VC-PARTIES", tier=2, kind="guidelines", adopted="2020-10",
      en="OSCE/ODIHR–Venice Commission Guidelines on Political Party Regulation (2nd ed.)",
      fa="رهنمودهای ODIHR و کمیسیون ونیز درباره تنظیم احزاب سیاسی (ویرایش دوم)",
      url="https://www.venice.coe.int/webforms/documents/default.aspx?pdffile=CDL-AD(2020)032-e",
      version="CDL-AD(2020)032 — Section III, Principles 1–11", parser="vc", ext="pdf",
      start=r"^III\. PRINCIPLES\s*$", end=r"^IV\. INTERPRETATIVE NOTES\s*$", sep=r"\.", applies="parties"),
 dict(id="VC-ASSOC", tier=2, kind="guidelines", adopted="2014-12",
      en="OSCE/ODIHR–Venice Commission Joint Guidelines on Freedom of Association",
      fa="رهنمودهای مشترک ODIHR و کمیسیون ونیز درباره آزادی انجمن‌ها",
      url="https://www.venice.coe.int/webforms/documents/default.aspx?pdffile=CDL-AD(2014)046-e",
      version="CDL-AD(2014)046 — Section B, Principles 1–11", parser="vc", ext="pdf",
      start=r"^Guiding principles\s*$", end=r"^SECTION C", sep=":", applies="associations"),
]

# ---------------------------------------------------------------- fetching

def fetch(src):
    ext = src.get("ext") or ("html" if src["parser"] == "udhr_html" else "pdf")
    path = os.path.join(CACHE, f"{src['id']}.{ext}")
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        req = urllib.request.Request(src["url"], headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as r, open(path, "wb") as f:
            f.write(r.read())
    return path

def sha256(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()

def body_text(path, min_size=10.5):
    """Text of spans in the body font only: drops footnotes and superscript markers."""
    import pymupdf
    out = []
    for page in pymupdf.open(path):
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                t = "".join(sp["text"] for sp in line["spans"] if sp["size"] >= min_size)
                out.append(t.rstrip())
        out.append("")
    return "\n".join(out)

def poppler_text(path):
    """pdftotext output; the Yogyakarta parsers rely on its table-of-contents layout."""
    return subprocess.run(["pdftotext", "-enc", "UTF-8", path, "-"],
                          capture_output=True, text=True, check=True).stdout

def pdftext(path):
    """Plain text in reading order (sorted by position; pdftotext scrambles tabbed lists)."""
    import pymupdf
    return "\n".join(page.get_text("text", sort=True) for page in pymupdf.open(path))

# ---------------------------------------------------------------- text helpers

HYPHENATED, WORDS = set(), {}
PREFIXES = {"re", "non", "co", "self", "two", "three", "anti", "pre", "inter", "sub", "ex", "well", "long", "cross"}

def learn_words(text):
    """Vocabulary across all sources, used to undo line-end hyphenation."""
    for line in text.split("\n"):
        body = line.rstrip()[:-1] if line.rstrip().endswith("-") else line
        HYPHENATED.update(m.group(0).lower() for m in re.finditer(r"\b\w+-\w+\b", body))
        for w in re.findall(r"[A-Za-z]+", body):
            WORDS[w.lower()] = WORDS.get(w.lower(), 0) + 1

def hyphen_words(_text):
    return None

def keep_hyphen(head, tail):
    h, t = head.lower(), tail.lower()
    if f"{h}-{t}" in HYPHENATED: return True
    if (h + t) in WORDS: return False
    return h in PREFIXES or (WORDS.get(h, 0) >= 3 and WORDS.get(t, 0) >= 3 and len(h) > 2)

def flow(lines, keep=None):
    """Join wrapped lines into one paragraph, undoing line-end hyphenation."""
    out = ""
    for ln in (l.strip() for l in lines):
        if not ln: continue
        if out.endswith("-") and ln[:1].islower():
            head = re.search(r"(\w+)-$", out)
            tail = re.match(r"\w+", ln)
            if not (head and tail and keep_hyphen(head.group(1), tail.group(0))):
                out = out[:-1]
            out += ln
        else:
            out += (" " if out else "") + ln
    return re.sub(r"\s+", " ", out).strip()

NUM = re.compile(r"^(\d{1,2})\.(?:\s+|$)")
ITEM = re.compile(r"^\(\s?([a-z]{1,4}|[ivx]+)\s?\)\s")

BARE_ITEM = re.compile(r"^\(([a-z]{1,4}|[ivx]+)\)$")

def blocks(lines):
    """Split lines into blocks at blank lines, numbered paragraphs and (a) items."""
    out, cur = [], []
    for ln in lines:
        s = ln.strip()
        if not s and len(cur) == 1 and (BARE_ITEM.match(cur[0]) or re.fullmatch(r"\d{1,2}\.", cur[0])):
            continue                    # "(a)" or "2." alone; its text follows after a blank line
        if (not s or NUM.match(s) or ITEM.match(s) or BARE_ITEM.match(s)):
            if cur: out.append(cur)
            cur = [s] if s else []
        else:
            cur.append(s)
    if cur: out.append(cur)
    return out

def paragraphs(lines, keep):
    """-> list of (n or None, text). Numbered paragraphs absorb their (a), (b) items."""
    paras = []
    for b in blocks(lines):
        # a bare "1." line followed by its text (CRPD layout)
        if re.fullmatch(r"\d{1,2}\.", b[0]) and len(b) > 1:
            b = [b[0] + " " + b[1]] + b[2:]
        text = flow(b, keep)
        if not text: continue
        m = NUM.match(text)
        if m:
            paras.append([int(m.group(1)), text[m.end():].strip()])
        elif paras and ITEM.match(text):
            paras[-1][1] += ("\n" if paras[-1][1] else "") + text
        elif (paras and not re.search(r"[.:;]$", paras[-1][1])
              and (text[:1].islower() or (text[:1] == "(" and not ITEM.match(text)))):
            paras[-1][1] += " " + text       # paragraph broken by a page break
        else:
            paras.append([None, text])
    return paras

def provision(inst, number, paras, heading=None, key=None):
    key = key or str(number)
    numbered = [p for p in paras if p[0] is not None]
    text = "\n\n".join((f"{n}. {t}" if n is not None else t) for n, t in paras)
    rec = {"id": f"{inst}.{key}", "number": number, "heading": heading, "text_en": text}
    if numbered:
        rec["paras"] = [{"id": f"{inst}.{key}.{n}", "n": n,
                         "text_en": t} for n, t in paras if n is not None]
    return rec

# ---------------------------------------------------------------- parsers

NOISE = re.compile(r"^\s*(\d{1,3}|[-–—]\s*\d+\s*[-–—]|PART [IVX\d]+\.?.*|Part [IVX]+\.?|Preamble)\s*$")

def parse_articles(src, raw):
    # a heading can lose its line: "... obligation. Article" / "12"
    txt = re.sub(r"\s+Article\n(\d{1,3})[ \t]*\n", r"\nArticle \1\n", raw)
    txt = re.split(r"(?mi)^\s*IN WITNESS (WHEREOF|THEREOF)", txt)[0]
    txt = re.split(r"(?m)\s+IN WITNESS (WHEREOF|THEREOF)", txt)[0]
    if src.get("stop"):
        # the CRPD PDF opens with a table of contents naming the Optional Protocol
        hits = [m.start() for m in re.finditer(src["stop"], txt, re.M)]
        if len(hits) > 1: txt = txt[:hits[1]]
    keep = hyphen_words(raw)
    lines = txt.split("\n")
    heads = [i for i, l in enumerate(lines) if re.fullmatch(r"\s*Article\s+(\d{1,3})\s*", l)]
    # keep the longest run of articles numbered 1, 2, 3, ... (skips tables of contents)
    best, run = [], []
    for i in heads:
        n = int(lines[i].split()[1])
        if n == 1: run = [i]
        elif run and n == int(lines[run[-1]].split()[1]) + 1: run.append(i)
        else: continue
        if len(run) > len(best): best = list(run)
    out = []
    pre = [l for l in lines[:best[0]] if not NOISE.match(l)]
    pre = pre[next((i for i, l in enumerate(pre) if re.match(r"\s*The States Parties", l)), 0):]
    if any(l.strip() for l in pre):
        out.append({"id": f"{src['id']}.preamble", "number": "preamble", "heading": "Preamble",
                    "text_en": "\n\n".join(t for _, t in paragraphs(pre, keep))})
    for k, i in enumerate(best):
        j = best[k + 1] if k + 1 < len(best) else len(lines)
        body = [l for l in lines[i + 1:j] if not NOISE.match(l)]
        heading = None
        if src.get("titles"):
            first = next((x for x in range(len(body)) if body[x].strip()), None)
            if first is not None:
                heading = body[first].strip(); body = body[first + 1:]
        n = k + 1
        out.append(provision(src["id"], n, paragraphs(body, keep), heading))
    return out

def parse_udhr_html(src, raw):
    raw = raw.split('<div class="col-sm-3">')[0]          # page sidebar and footer follow
    parts = re.split(r'<h2[^>]*>\s*(Preamble|Article \d+)\s*</h2>', raw)
    out = []
    for i in range(1, len(parts) - 1, 2):
        head, body = parts[i], parts[i + 1]
        body = body.split("</main>")[0].split("<footer")[0]
        items = re.findall(r"<(p|li)[^>]*>(.*?)</\1>", body, re.S)
        clean = [html.unescape(re.sub(r"<[^>]+>|\s+", " ", t)).strip() for _, t in items]
        clean = [c for c in clean if c]
        if head == "Preamble":
            out.append({"id": "UDHR.preamble", "number": "preamble", "heading": "Preamble",
                        "text_en": "\n\n".join(clean)})
            continue
        n = int(head.split()[1])
        numbered = "<ol" in body
        paras = [[k + 1 if numbered else None, c] for k, c in enumerate(clean)]
        out.append(provision("UDHR", n, paras))
    return out

ROMAN = {v: i + 1 for i, v in enumerate("I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX".split())}

def parse_manual(src, _raw):
    txt = open(os.path.join(HERE, "manual", src["manual"]), encoding="utf-8").read()
    txt = "\n".join(l for l in txt.split("\n") if not l.startswith("#"))
    out = []
    for head, body in re.findall(r"(?m)^== (\S+)\n(.*?)(?=^== |\Z)", txt + "\n", re.S):
        paras = [[None, l.strip()] for l in body.strip().split("\n") if l.strip()]
        # (a), (b) items belong to the sentence that introduces them
        merged = []
        for p in paras:
            if merged and ITEM.match(p[1]): merged[-1][1] += "\n" + p[1]
            else: merged.append(p)
        if head == "preamble":
            out.append({"id": f"{src['id']}.preamble", "number": "preamble", "heading": "Preamble",
                        "text_en": "\n\n".join(t for _, t in merged)})
        else:
            rec = provision(src["id"], ROMAN[head], merged)
            rec["label"] = f"Article {head}"
            out.append(rec)
    return out

YP_NOISE = re.compile(r"^\s*(\d{1,3}|PRINCIPLE|THE YOGYAKARTA PRINCIPLES( PLUS 10)?|ADDITIONAL PRINCIPLES)\s*$")

def is_title(line):
    s = re.sub(r"^\d+\s+", "", line.strip())
    letters = [c for c in s if c.isalpha()]
    return (len(letters) >= 3 and all(c.isupper() for c in letters)
            and not re.match(r"^[A-Z]\s?\.", s) and s not in ("STATES SHALL:",))

def lettered(inst, key, body, keep):
    """Statement + 'States shall:' + A., B., ... obligations."""
    stmt, items, cur = [], [], None
    for ln in body:
        s = ln.strip()
        m = re.match(r"^([A-Z])\s?(\.?)\s+(.*)", s)
        # the source sometimes drops the period ("A Take ..."): accept that only for the expected letter
        expected = chr(ord(items[-1][0]) + 1) if items else None
        if m and not m.group(2) and m.group(1) != (expected or "A"): m = None
        if m and (cur is not None or re.search(r"shall:?\s*$", " ".join(stmt), re.I)):
            cur = [m.group(1), [m.group(3)]]; items.append(cur)
        elif cur is not None:
            cur[1].append(s)
        else:
            stmt.append(s)
    statement = flow(stmt, keep)
    obligations = [{"id": f"{inst}.{key}.{L}", "n": L, "text_en": flow(t, keep)} for L, t in items]
    text = statement + ("\n\n" + "\n".join(f"{o['n']}. {o['text_en']}" for o in obligations) if obligations else "")
    return statement, obligations, text

def parse_yogyakarta(src, raw):
    keep = hyphen_words(raw)
    lines = raw.split("\n")
    start = next(i for i, l in enumerate(lines) if re.search(r"HEREBY ADOPT THESE", l)) + 1
    end = next((i for i, l in enumerate(lines) if i > start and
                re.match(r"^\s*(ADDITIONAL RECOMMENDATIONS|RECOMMENDATIONS)\s*$", l)), len(lines))
    lines = [l for l in lines[start:end] if not YP_NOISE.match(l)]
    # group consecutive capitalised lines into titles
    sections, title, body = [], [], []
    for l in lines:
        if is_title(l):
            if body: sections.append((" ".join(title), body)); title, body = [], []
            title.append(re.sub(r"^\d+\s+", "", l.strip()))
        elif title:
            body.append(l)
    if title: sections.append((" ".join(title), body))
    heads = toc_titles(raw, src["first"])
    out, n = [], src["first"]
    for t, b in sections:
        t = re.sub(r"\s+", " ", t).strip()
        if t.endswith(":"): continue    # "PRINCIPLES AND, IN DOING SO:" closes the preamble
        aso = re.search(r"\(PRINCIPLES? ([\d, AND]+)\)\s*$", t)
        if aso:                         # YP+10 obligations added to an original principle
            target = re.findall(r"\d+", aso.group(1))
            key = "ASO." + "-".join(target)
            rest = re.sub(r"^ADDITIONAL STATE OBLIGATIONS\s*", "", t[:aso.start()]).strip()
            stmt, obl, text = lettered(src["id"], key, b, keep)
            out.append({"id": f"{src['id']}.{key}", "number": key,
                        "heading": "Additional State Obligations " + rest.lower() + f" (Principle {', '.join(target)})",
                        "extends": [f"YP.{x}" for x in target], "text_en": text, "paras": obl})
        elif n in heads:
            stmt, obl, text = lettered(src["id"], n, b, keep)
            out.append({"id": f"{src['id']}.{n}", "number": n, "heading": heads[n],
                        "text_en": text, "paras": obl})
            n += 1
    missing = sorted(set(heads) - {p["number"] for p in out})
    if missing: raise SystemExit(f"{src['id']}: principles not found in body: {missing}")
    return out

def toc_titles(raw, first):
    """Principle titles from the table of contents: {number: title}."""
    lines = raw.split("\n")[:120]
    if first == 1:                      # "Title ........ 10" after "Preamble ....."
        i = next(k for k, l in enumerate(lines) if l.startswith("Preamble ..."))
        titles, buf = [], ""
        for l in lines[i + 1:]:
            if not l.strip(): continue
            buf = (buf + " " + l.strip()).strip()
            m = re.match(r"^(.*?)\s*\.{3,}\s*\d+$", buf)
            if m: titles.append(m.group(1)); buf = ""
            if len(titles) == 29: break
        return {k + 1: t for k, t in enumerate(titles)}
    out, cur = {}, None
    for l in lines:
        m = re.match(r"^PRINCIPLE (\d+) (.*)", l.strip())
        if m: cur = int(m.group(1)); out[cur] = m.group(2).strip()
        elif cur and l.strip() and not l.strip().isupper(): out[cur] += " " + l.strip()
        elif l.strip().startswith("ADDITIONAL STATE"): break
    return out

def parse_vc(src, raw):
    keep = hyphen_words(raw)
    lines = raw.split("\n")
    # the last match is in the body; earlier ones are in the table of contents
    s = [i for i, l in enumerate(lines) if re.search(src["start"], l.strip())][-1] + 1
    e = next(i for i, l in enumerate(lines) if i > s and re.search(src["end"], l.strip()))
    lines = [l for l in lines[s:e] if not re.match(r"^\s*(\d{1,3}|CDL-AD\(20\d\d\)0\d\d|-\s*\d+\s*-|\f.*)\s*$", l)]
    # footnote bodies: lines starting with a footnote number and a capitalised word, after the page text
    heads = [i for i, l in enumerate(lines) if re.match(rf"^Principle (\d+){src['sep']}", l.strip())]
    out = []
    for k, i in enumerate(heads):
        j = heads[k + 1] if k + 1 < len(heads) else len(lines)
        n = int(re.match(r"^Principle (\d+)", lines[i].strip()).group(1))
        head = re.sub(rf"^Principle \d+{src['sep']}\s*", "", lines[i].strip())
        body = lines[i + 1:j]
        # a heading may wrap onto a second line that starts lower-case
        while (body and body[0].strip() and not NUM.match(body[0].strip()) and len(body[0].strip()) < 60
               and len(head) < 140 and not head.endswith(".")):
            head += " " + body.pop(0).strip()
        body = [l for l in body if not re.match(r"^\s*\d{1,3}\s+\S", l) or NUM.match(l.strip())]
        paras = paragraphs(body, keep)
        out.append(provision(src["id"], n, paras, head.rstrip(".")))
    return out

PARSERS = {"articles": parse_articles, "udhr_html": parse_udhr_html, "manual": parse_manual,
           "yogyakarta": parse_yogyakarta, "vc": parse_vc}

# ---------------------------------------------------------------- main

def benchmark_version(instruments):
    """Hash of the authoritative English text and the IDs only. Persian translations
    (text_fa, fa_status) are display text: adding or correcting them must not
    change the version, which keys every cached audit."""
    en = [[{"id": p["id"], "number": p.get("number"), "heading": p.get("heading"),
            "text_en": p["text_en"],
            "paras": [{"id": q["id"], "text_en": q["text_en"]} for q in p.get("paras") or []]}
           for p in provs] for provs in instruments]
    return hashlib.sha256(json.dumps(en, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]


def main():
    relock = "--relock" in sys.argv
    lock = json.load(open(LOCK)) if os.path.exists(LOCK) else {}
    os.makedirs(os.path.join(OUT, "provisions"), exist_ok=True)
    index, changed = [], []
    raws = {}
    for src in SOURCES:
        path = fetch(src)
        digest = sha256(path)
        if lock.get(src["id"], {}).get("sha256") not in (None, digest) and not relock:
            changed.append(src["id"]); continue
        lock[src["id"]] = {"url": src["url"], "sha256": digest}
        if path.endswith(".html"): raw = open(path, encoding="utf-8").read()
        elif src["parser"] == "vc": raw = body_text(path)
        elif src["parser"] == "yogyakarta": raw = poppler_text(path)
        else: raw = pdftext(path)
        raws[src["id"]] = (raw, digest)
        learn_words(re.sub(r"<[^>]+>", " ", raw))
    for src in SOURCES:
        if src["id"] not in raws: continue
        raw, digest = raws[src["id"]]
        provs = PARSERS[src["parser"]](src, raw)
        fa_status = "pending"
        for p in provs:
            p.update(instrument=src["id"], text_fa=None, fa_status=fa_status)
        meta = {k: src[k] for k in ("id", "tier", "kind", "adopted", "en", "fa", "version")}
        meta.update(source_url=src["url"], source_sha256=digest, fa_status=fa_status,
                    fa_source_url=src.get("fa_url"), applies=src.get("applies", "all"),
                    n_provisions=len(provs),
                    n_citable=sum(1 + len(p.get("paras", [])) for p in provs))
        index.append(meta)
        json.dump({"instrument": meta, "provisions": provs},
                  open(os.path.join(OUT, "provisions", f"{src['id']}.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print(f"{src['id']:<11} {len(provs):>4} provisions  {meta['n_citable']:>5} citable ids")
    if changed:
        sys.exit(f"source changed since last lock: {changed} (inspect, then --relock)")
    ids = sorted(i for f in os.listdir(os.path.join(OUT, "provisions"))
                 for p in json.load(open(os.path.join(OUT, "provisions", f), encoding="utf-8"))["provisions"]
                 for i in [p["id"]] + [q["id"] for q in p.get("paras", [])])
    version = benchmark_version(
        [json.load(open(os.path.join(OUT, "provisions", f"{m['id']}.json"), encoding="utf-8"))["provisions"]
         for m in index])
    json.dump({"version": version, "instruments": index},
              open(os.path.join(OUT, "instruments.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    # the Worker keys cached results by benchmark version and validates cited IDs against this list
    os.makedirs(os.path.join(ROOT, "src", "generated"), exist_ok=True)
    json.dump({"version": version, "ids": ids},
              open(os.path.join(ROOT, "src", "generated", "benchmark.json"), "w"), separators=(",", ":"))
    print(f"benchmark version {version}: {len(ids)} citable ids")
    json.dump(lock, open(LOCK, "w"), indent=1)

if __name__ == "__main__":
    main()
