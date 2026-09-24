#!/usr/bin/env python3
"""Build the audit scoring guides from rubrics/*.json and the benchmark library.

Each guide is a checklist of rights, each resting on benchmark provision IDs.
This script checks every ID against public/data/provisions/, renders the cited
provisions verbatim into the reference block the model sees, and versions each
guide by a hash of everything that reaches the model. Cached audits are keyed
by that version, so any change to a guide invalidates its results.

Writes src/generated/rubrics.json (for the Worker) and public/data/rubrics.json
(the published methodology). Standard library only.

    python3 benchmark/rubrics.py
"""
import hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "public", "data")


def load_benchmark():
    index = json.load(open(os.path.join(DATA, "instruments.json"), encoding="utf-8"))
    instruments, articles, owner = [], {}, {}
    for meta in index["instruments"]:
        provs = json.load(open(os.path.join(DATA, "provisions", f"{meta['id']}.json"),
                               encoding="utf-8"))["provisions"]
        instruments.append((meta, provs))
        for p in provs:
            articles[p["id"]] = p
            owner[p["id"]] = p["id"]
            for q in p.get("paras") or []:
                owner[q["id"]] = p["id"]
    return index["version"], instruments, articles, owner


def render(instruments, wanted):
    """Render the wanted articles, in benchmark order, with a bracketed ID on every citable unit."""
    out = []
    for meta, provs in instruments:
        chosen = [p for p in provs if p["id"] in wanted]
        if not chosen:
            continue
        out.append(f"## {meta['id']}: {meta['en']}")
        for p in chosen:
            head = f"### {p['id']}" + (f": {p['heading']}" if p.get("heading") else "")
            out.append(head)
            if p.get("paras"):
                out.extend(f"[{q['id']}] {q['text_en']}" for q in p["paras"])
            else:
                out.append(f"[{p['id']}] {p['text_en']}")
        out.append("")
    return "\n\n".join(out).strip()


def build(path, bench_version, instruments, articles, owner):
    r = json.load(open(path, encoding="utf-8"))
    errors, wanted, seen = [], set(), set()
    for right in r["rights"]:
        if right["id"] in seen:
            errors.append(f"duplicate right {right['id']}")
        seen.add(right["id"])
        for pid in right["provisions"]:
            if pid not in owner:
                errors.append(f"{right['id']}: unknown provision {pid}")
            else:
                wanted.add(owner[pid])
    if errors:
        sys.exit(f"{os.path.basename(path)}:\n  " + "\n  ".join(errors))

    checklist = "\n".join(
        f"- {x['id']}: {x['en']} (rests on {', '.join(x['provisions'])})" for x in r["rights"])
    reference = (f"# Checklist\n\n{checklist}\n\n"
                 f"# Benchmark provisions (benchmark version {bench_version})\n\n"
                 f"{render(instruments, wanted)}")
    digest = hashlib.sha256(json.dumps(
        [r["instructions"], reference, r["rights"]], ensure_ascii=False).encode()).hexdigest()
    return {
        "name": r["name"],
        "version": f"{r['name']}-{digest[:12]}",
        "en": r["en"],
        "fa": r["fa"],
        "applies_to": r["applies_to"],
        "benchmark": bench_version,
        "instructions": r["instructions"],
        "rights": r["rights"],
        "reference": reference,
        "n_articles": len(wanted),
    }


def main():
    bench_version, instruments, articles, owner = load_benchmark()
    rubrics = {}
    for name in sorted(os.listdir(os.path.join(ROOT, "rubrics"))):
        if name.endswith(".json"):
            g = build(os.path.join(ROOT, "rubrics", name), bench_version, instruments, articles, owner)
            rubrics[g["name"]] = g
            print(f"{g['version']}: {len(g['rights'])} rights, {g['n_articles']} benchmark articles, "
                  f"{len(g['reference']):,} chars of reference")

    os.makedirs(os.path.join(ROOT, "src", "generated"), exist_ok=True)
    json.dump({"benchmark": bench_version, "rubrics": rubrics},
              open(os.path.join(ROOT, "src", "generated", "rubrics.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    public = {n: {k: v for k, v in g.items() if k != "reference"} for n, g in rubrics.items()}
    json.dump({"benchmark": bench_version, "rubrics": public},
              open(os.path.join(DATA, "rubrics.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
