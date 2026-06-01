#!/usr/bin/env python3
"""Audit src/data/cisco.ts against the upstream Cisco brochure PDF.

Strategy
--------
- Parse `src/data/cisco.ts` with a regex extractor (each device is a top-level
  object literal in the DEVICES array). We do not try to round-trip TypeScript;
  we just capture each device's `id` + raw text block + field values per a
  small hand-rolled tokenizer.
- Open `scripts/cisco_matrix.pdf` with pypdf and extract per-page text.
- For each device, determine which PDF page(s) form its "section" by matching
  hand-curated identifying tokens against the page text.
- For each spec field (display, camera, audio, connectivity, software,
  highlights, useCases, roomSizes, recommendedPeople, price, priceNote,
  tagline, formFactor) emit one of:
    MATCH      - value (or each list element) appears in PDF section
    SIMILAR    - some key tokens appear, others don't
    DIFFERS    - PDF section contradicts the value for the same concept
    NOT_IN_PDF - concept isn't mentioned in this PDF section (likely
                 datasheet-derived)
    MISSING    - PDF section mentions a concept that the data omits
- Write a Markdown report to docs/spec-audit.md grouped by device with a
  summary table at the bottom.

The report is intentionally plain-ASCII so it grep's cleanly and diffs cleanly.
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Iterable

try:
    import pypdf  # type: ignore[import-not-found]
except ImportError:
    sys.stderr.write(
        "pypdf is required. Install with:\n"
        "  python3 -m pip install --user pypdf\n"
        "or (PEP 668 systems):\n"
        "  python3 -m pip install --user --break-system-packages pypdf\n"
    )
    sys.exit(2)


ROOT = Path(__file__).resolve().parent.parent
TS_PATH = ROOT / "src" / "data" / "cisco.ts"
PDF_PATH = ROOT / "scripts" / "cisco_matrix.pdf"
REPORT_PATH = ROOT / "docs" / "spec-audit.md"


# ---------------------------------------------------------------------------
# Device -> PDF section mapping.
#
# Each entry lists hand-curated tokens. A PDF page is considered part of
# the device's section if any of these tokens appears in that page's text.
# When multiple devices share a page (the brochure is a multi-column table),
# the section text is shared. That is fine for "appears in PDF section"
# style checks because the columns sit side-by-side in the extracted text.
# ---------------------------------------------------------------------------
DEVICE_TOKENS: dict[str, list[str]] = {
    "board-pro-g2-55": ["BOARD PRO 55/75 G2"],
    "board-pro-g2-75": ["BOARD PRO 55/75 G2"],
    "room-kit-eqx": ["ROOM KIT EQX"],
    "room-bar": ["ROOM BAR ROOM BAR PRO"],  # page header for pp.6-8
    "room-bar-pro": ["ROOM BAR PRO"],
    "room-bar-byod": ["ROOM BAR BYOD"],
    "room-kit-eq": ["ROOM KIT EQ"],  # also matches EQX header; section overlap OK
    "room-kit-pro-g2": ["ROOM KIT PRO G2"],
    "desk": ["DESK DESK PRO G2 DESK MINI"],  # page header for pp.11-12
    "desk-pro-g2": ["DESK PRO G2"],
    "desk-mini": ["DESK MINI"],
    "video-phone-8875": ["VIDEO PHONE 8875"],
    "desk-phone-9871": ["DESK PHONE 9871"],
    "desk-phone-9841": ["DESK PHONE 9841"],
    "conference-8832": ["8832 CONFERENCE PHONE"],
    "wireless-9821": ["Wireless Phone 9821"],
    "wireless-860": ["Wireless Phone 860"],
    "dect-6825": ["6825 DECT PHONE"],
    "headset-320": ["320 SERIES"],
    "headset-520": ["520 SERIES"],
    "headset-560": ["560 SERIES"],
    "headset-730": ["700 SERIES - 730", "730 Product page"],
    "headset-bang-olufsen-900": ["900 SERIES - B&O"],
    "headset-950": ["CISCO 950"],
    "room-navigator-table": ["ROOM NAVIGATOR FOR TABLE"],
    "room-navigator-wall": ["ROOM NAVIGATOR FOR WALL"],
    "table-mic-pro": ["CISCO TABLE MICROPHONE PRO"],
    "ceiling-mic-pro": ["CISCO CEILING MICROPHONE PRO"],
    # table-mic + ceiling-mic share page 24 with their PRO siblings; the page
    # text union is fine for "appears in section" style checks.
    "table-mic": ["CISCO TABLE MICROPHONE"],
    "ceiling-mic": ["CISCO CEILING MICROPHONE"],
    "desk-camera-1080": ["DESK CAMERA 1080"],
    "desk-camera-4k": ["DESK CAMERA 4K"],
    "quad-camera": ["QUAD CAMERA"],
    "room-vision-ptz": ["ROOM VISION PTZ"],
    "ptz-4k-camera": ["PTZ 4K CAMERA"],
}


# ---------------------------------------------------------------------------
# Tiny TypeScript object literal parser. Good enough for cisco.ts since the
# file is purely an array of plain object literals with no nested arrays of
# objects, function calls, template literals, etc.
# ---------------------------------------------------------------------------
def parse_devices(ts_source: str) -> list[dict]:
    """Return list of {id, raw, fields} dicts in declaration order."""
    devices_match = re.search(
        r"export const DEVICES\s*:\s*Device\[\]\s*=\s*\[",
        ts_source,
    )
    if not devices_match:
        raise SystemExit("Could not find `export const DEVICES` in cisco.ts")

    start = devices_match.end()
    devices: list[dict] = []
    i = start
    n = len(ts_source)
    depth_brackets = 1  # opened the [

    while i < n and depth_brackets > 0:
        ch = ts_source[i]
        if ch == "[":
            depth_brackets += 1
            i += 1
        elif ch == "]":
            depth_brackets -= 1
            i += 1
        elif ch == "{":
            block, end = _read_object_literal(ts_source, i)
            devices.append({"raw": block, "start": i, "end": end})
            i = end
        else:
            i += 1

    for dev in devices:
        dev["fields"] = _parse_fields(dev["raw"])
        dev["id"] = dev["fields"].get("id")
    return [d for d in devices if d.get("id")]


def _read_object_literal(src: str, start: int) -> tuple[str, int]:
    """Return (object_literal_text, index_after_closing_brace).

    Handles nested braces, strings ('', "", ``), and line/block comments.
    """
    assert src[start] == "{"
    i = start
    depth = 0
    n = len(src)
    while i < n:
        ch = src[i]
        if ch in ("'", '"', "`"):
            quote = ch
            i += 1
            while i < n:
                if src[i] == "\\":
                    i += 2
                    continue
                if src[i] == quote:
                    i += 1
                    break
                i += 1
            continue
        if ch == "/" and i + 1 < n and src[i + 1] == "/":
            nl = src.find("\n", i)
            i = nl + 1 if nl != -1 else n
            continue
        if ch == "/" and i + 1 < n and src[i + 1] == "*":
            end = src.find("*/", i + 2)
            i = end + 2 if end != -1 else n
            continue
        if ch == "{":
            depth += 1
            i += 1
            continue
        if ch == "}":
            depth -= 1
            i += 1
            if depth == 0:
                return src[start:i], i
            continue
        i += 1
    raise SystemExit("unterminated object literal at offset {}".format(start))


def _parse_fields(block: str) -> dict:
    """Extract top-level key: value pairs from an object literal text."""
    inner = block.strip()
    if inner.startswith("{"):
        inner = inner[1:]
    if inner.endswith("}"):
        inner = inner[:-1]

    fields: dict[str, object] = {}
    i = 0
    n = len(inner)
    while i < n:
        # Skip whitespace, commas, and comments.
        while i < n and inner[i] in " \t\r\n,":
            i += 1
        if i < n and inner[i : i + 2] == "//":
            nl = inner.find("\n", i)
            i = nl + 1 if nl != -1 else n
            continue
        if i < n and inner[i : i + 2] == "/*":
            end = inner.find("*/", i + 2)
            i = end + 2 if end != -1 else n
            continue
        if i >= n:
            break
        # Parse key.
        key_match = re.match(r"([A-Za-z_][A-Za-z0-9_]*)\s*:\s*", inner[i:])
        if not key_match:
            i += 1
            continue
        key = key_match.group(1)
        i += key_match.end()
        # Parse value: a string, number, array, or identifier expression.
        value, i = _parse_value(inner, i)
        fields[key] = value
    return fields


def _parse_value(src: str, i: int) -> tuple[object, int]:
    n = len(src)
    if i >= n:
        return None, i
    ch = src[i]
    if ch in ("'", '"', "`"):
        return _parse_string(src, i)
    if ch == "[":
        return _parse_array(src, i)
    if ch == "{":
        block, end = _read_object_literal(src, i)
        return {"__object__": block}, end
    # Number or identifier (e.g. C.carbon).
    m = re.match(r"[^,\n]+", src[i:])
    if not m:
        return None, i
    raw = m.group(0).strip()
    j = i + m.end()
    # Try numeric.
    try:
        if "." in raw:
            return float(raw), j
        return int(raw), j
    except ValueError:
        return {"__expr__": raw}, j


def _parse_string(src: str, i: int) -> tuple[str, int]:
    quote = src[i]
    out_parts: list[str] = []
    n = len(src)
    while True:
        # Read a single literal segment.
        assert src[i] == quote
        i += 1
        start = i
        while i < n:
            if src[i] == "\\":
                out_parts.append(src[start:i])
                if i + 1 < n:
                    out_parts.append(_decode_escape(src[i + 1]))
                i += 2
                start = i
                continue
            if src[i] == quote:
                out_parts.append(src[start:i])
                i += 1
                break
            i += 1
        # If immediately followed by + and another string, concatenate.
        j = i
        while j < n and src[j] in " \t\r\n":
            j += 1
        if j < n and src[j] == "+":
            j += 1
            while j < n and src[j] in " \t\r\n":
                j += 1
            if j < n and src[j] in ("'", '"', "`"):
                i = j
                quote = src[i]
                continue
        break
    return "".join(out_parts), i


def _decode_escape(c: str) -> str:
    return {
        "n": "\n",
        "t": "\t",
        "r": "\r",
        "\\": "\\",
        "'": "'",
        '"': '"',
        "`": "`",
    }.get(c, c)


def _parse_array(src: str, i: int) -> tuple[list, int]:
    assert src[i] == "["
    i += 1
    n = len(src)
    out: list[object] = []
    while i < n:
        while i < n and src[i] in " \t\r\n,":
            i += 1
        if i < n and src[i : i + 2] == "//":
            nl = src.find("\n", i)
            i = nl + 1 if nl != -1 else n
            continue
        if i < n and src[i] == "]":
            return out, i + 1
        value, i = _parse_value(src, i)
        out.append(value)
    return out, i


# ---------------------------------------------------------------------------
# PDF extraction + section assignment.
# ---------------------------------------------------------------------------
def extract_pdf_pages(pdf_path: Path) -> list[tuple[int, str]]:
    reader = pypdf.PdfReader(str(pdf_path))
    pages: list[tuple[int, str]] = []
    for idx, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception as exc:
            text = ""
            sys.stderr.write(f"warning: page {idx}: {exc}\n")
        pages.append((idx, _ascii(text)))
    return pages


def _ascii(text: str) -> str:
    """Normalize unicode to plain ASCII for stable diffs."""
    if not text:
        return ""
    repl = {
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u2026": "...",
        "\u00b0": " deg ",
        "\u00b2": "^2",
        "\u00b3": "^3",
        "\u00ae": "(R)",
        "\u2122": "(TM)",
        "\u00a9": "(C)",
        "\u00b5": "u",
        "\u00b1": "+/-",
        "\u00d7": "x",
        "\u2022": "*",
        "\u00b7": "*",
        "\u2192": "->",
        "\u00a0": " ",
    }
    out = text
    for k, v in repl.items():
        out = out.replace(k, v)
    out = unicodedata.normalize("NFKD", out)
    out = out.encode("ascii", "ignore").decode("ascii")
    return out


def assign_sections(
    devices: list[dict], pages: list[tuple[int, str]]
) -> dict[str, dict]:
    """For each device id, compute list of matching pages and combined text."""
    out: dict[str, dict] = {}
    for dev in devices:
        dev_id = dev["id"]
        tokens = DEVICE_TOKENS.get(dev_id, [])
        matched_pages: list[int] = []
        for page_num, text in pages:
            text_norm = text
            for tok in tokens:
                if tok in text_norm:
                    matched_pages.append(page_num)
                    break
        section_text = "\n".join(
            pages[p - 1][1] for p in matched_pages
        )
        out[dev_id] = {
            "pages": matched_pages,
            "tokens": tokens,
            "text": section_text,
        }
    return out


# ---------------------------------------------------------------------------
# Field verdict logic.
# ---------------------------------------------------------------------------
STOPWORDS = {
    "a", "an", "and", "or", "the", "of", "for", "with", "in", "on", "to",
    "via", "by", "from", "into", "at", "is", "are", "be", "as", "any",
    "all", "up", "out", "in/out", "into", "etc",
}

NORMALIZE_RE = re.compile(r"[^A-Za-z0-9]+")


def _norm(s: str) -> str:
    return NORMALIZE_RE.sub(" ", _ascii(s)).lower().strip()


def _tokens(s: str) -> list[str]:
    """Return distinctive tokens from a string for membership checks."""
    s = _ascii(s)
    out: list[str] = []
    # Capture model numbers (e.g. 8875, 9871, RJ-45, 4K, 1080p, 14-mic).
    for m in re.finditer(
        r"[A-Za-z][A-Za-z0-9]*(?:[-/][A-Za-z0-9]+)+"  # hyphenated/slashed
        r"|\d+(?:\.\d+)?[A-Za-z%/+]+"  # number+unit
        r"|\b\d+\b"  # bare number
        r"|[A-Za-z]{4,}",  # plain words 4+ chars
        s,
    ):
        tok = m.group(0)
        if tok.lower() in STOPWORDS:
            continue
        out.append(tok)
    return out


def _value_in_text(value: str, pdf_text: str) -> tuple[int, int, list[str]]:
    """Return (hits, total, missing_tokens) for tokens of value in pdf_text."""
    tokens = _tokens(value)
    if not tokens:
        return (0, 0, [])
    norm_pdf = _norm(pdf_text)
    hits = 0
    missing: list[str] = []
    for tok in tokens:
        norm_tok = _norm(tok)
        if norm_tok and norm_tok in norm_pdf:
            hits += 1
        else:
            missing.append(tok)
    return (hits, len(tokens), missing)


# Concept regexes used to detect direct contradictions.
# Each entry: (concept_label, regex_in_data, regex_in_pdf_with_capture)
# The capture group must yield a numeric value (string).
CONCEPT_CHECKS: list[tuple[str, re.Pattern[str], re.Pattern[str]]] = [
    (
        "mic-array-elements",
        re.compile(r"(\d+)[- ]?(?:mic|element)\b", re.IGNORECASE),
        re.compile(
            r"(\d+)[- ]?element[- ]?(?:microphone|beamforming|second)",
            re.IGNORECASE,
        ),
    ),
    (
        "camera-MP-total",
        re.compile(r"\b(\d+)\s*MP\b", re.IGNORECASE),
        re.compile(r"\b(\d+)\s*MP\b", re.IGNORECASE),
    ),
    (
        "recommended-people",
        re.compile(r"Up to\s*(\d+)\b", re.IGNORECASE),
        re.compile(r"Up to\s*(\d+)\s*people", re.IGNORECASE),
    ),
    (
        "roomos-version",
        re.compile(r"RoomOS\s*(\d+(?:\.\d+)?)", re.IGNORECASE),
        re.compile(
            r"RoomOS\s*(\d+(?:\.\d+)?)\s*(?:or later|\+)?",
            re.IGNORECASE,
        ),
    ),
    (
        "wifi-version",
        re.compile(r"Wi-?Fi\s*(6E|7|6|5)\b", re.IGNORECASE),
        re.compile(r"Wi-?Fi\s*(6E|7|6|5)\b", re.IGNORECASE),
    ),
]


# Words in the data that mean a screen count. Used to translate phrases
# like "Triple-screen" to a number for the external-displays comparison.
SCREEN_WORDS = {
    "single": "1",
    "dual": "2",
    "triple": "3",
    "quad": "4",
}


def detect_contradiction(
    field: str, value: str, pdf_text: str
) -> tuple[str, str] | None:
    """Try to detect a direct numeric contradiction. Returns (label, excerpt)."""
    text_norm = _ascii(pdf_text)
    for label, data_re, pdf_re in CONCEPT_CHECKS:
        # Only apply some concepts to relevant fields.
        if label == "mic-array-elements" and field not in (
            "audio", "highlights"
        ):
            continue
        if label == "camera-MP-total" and field not in (
            "camera", "highlights"
        ):
            continue
        if label == "recommended-people" and field != "recommendedPeople":
            continue
        if label == "roomos-version" and field != "software":
            continue
        if label == "external-displays" and field not in (
            "highlights", "display"
        ):
            continue
        if label == "wifi-version" and field not in (
            "connectivity", "highlights"
        ):
            continue
        data_match = data_re.search(_ascii(value))
        if not data_match:
            continue
        data_num = (data_match.group(1) or data_match.group(0)).strip()
        # Look for the same concept in PDF, capture the number.
        pdf_matches = list(pdf_re.finditer(text_norm))
        if not pdf_matches:
            continue
        pdf_nums = {m.group(1) for m in pdf_matches if m.group(1)}
        if not pdf_nums:
            continue
        if data_num in pdf_nums:
            return None  # matches some value in PDF
        # All PDF numbers differ from data number.
        sample = pdf_matches[0]
        ctx_start = max(0, sample.start() - 40)
        ctx_end = min(len(text_norm), sample.end() + 40)
        excerpt = text_norm[ctx_start:ctx_end].replace("\n", " ")
        return (label, f"data={data_num} pdf={sorted(pdf_nums)} :: {excerpt}")
    return None


def field_concept_in_pdf(field: str, pdf_text: str) -> str:
    """If the PDF section even mentions the concept of `field`, return a hint."""
    text_norm = _ascii(pdf_text)
    keywords = {
        "display": ["Display", "Screen", "Screens", "LCD", "OLED", "touch screen"],
        "camera": ["Camera", "lens"],
        "audio": ["Audio", "Microphone", "Speaker", "loudspeaker"],
        "connectivity": ["Connectivity", "HDMI", "USB", "Ethernet", "Wi-Fi"],
        "software": ["Software", "RoomOS", "Microsoft Teams"],
        "highlights": ["Key Features", "Features"],
        "useCases": [],
        "roomSizes": [],
        "recommendedPeople": ["Recommended Number", "Up to", "people"],
        "price": ["price", "USD", "MSRP", "CSRP"],
        "priceNote": ["price", "USD", "MSRP", "CSRP"],
        "tagline": [],
        "formFactor": ["Form Factor", "Form factor"],
    }
    for kw in keywords.get(field, []):
        idx = text_norm.lower().find(kw.lower())
        if idx >= 0:
            return text_norm[idx : idx + 80].replace("\n", " ")
    return ""


def verdict_value(
    field: str, value: str, pdf_text: str
) -> tuple[str, str]:
    """Return (verdict, excerpt) for a single string value."""
    if value is None or str(value).strip() == "":
        return ("EMPTY", "")
    raw = str(value)
    # Run contradiction detector first.
    contradiction = detect_contradiction(field, raw, pdf_text)
    if contradiction:
        return ("DIFFERS", contradiction[1])

    hits, total, missing = _value_in_text(raw, pdf_text)
    if total == 0:
        return ("NOT_IN_PDF", "")
    ratio = hits / total

    excerpt = _excerpt_for_value(raw, pdf_text)
    if ratio >= 0.7:
        return ("MATCH", excerpt)
    if ratio >= 0.35:
        return ("SIMILAR", excerpt or _ascii(",".join(missing[:5])))
    # Low overlap. Reserve DIFFERS for the structured contradiction checks
    # above; below-threshold token matches are treated as "concept not in
    # this PDF section" to avoid noise. (Highlights commonly summarize
    # facts in marketing wording that doesn't share tokens with the row
    # text in the brochure table.)
    return ("NOT_IN_PDF", "")


def _excerpt_for_value(value: str, pdf_text: str) -> str:
    """Find the most relevant 120-char window in pdf_text containing value tokens."""
    text = _ascii(pdf_text)
    tokens = _tokens(value)
    best_idx = -1
    best_count = 0
    norm_text = text.lower()
    for tok in tokens:
        tn = tok.lower()
        idx = norm_text.find(tn)
        if idx < 0:
            continue
        # Count nearby tokens.
        window = norm_text[max(0, idx - 60) : idx + 60]
        count = sum(1 for t in tokens if t.lower() in window)
        if count > best_count:
            best_count = count
            best_idx = idx
    if best_idx < 0:
        return ""
    start = max(0, best_idx - 50)
    end = min(len(text), best_idx + 70)
    return text[start:end].replace("\n", " ").strip()


# ---------------------------------------------------------------------------
# Required-field MISSING checks. For each device, look for facts the PDF
# clearly states that are absent from our data.
# ---------------------------------------------------------------------------
MISSING_CHECKS: dict[str, list[tuple[str, str, re.Pattern[str]]]] = {
    # device_id -> list of (concept_label, message_if_missing, regex_in_section)
    # The check fires (= MISSING) when the regex matches the section text AND
    # the message tokens are NOT present in the data field-block.
}


# ---------------------------------------------------------------------------
# Per-device walking + report emission.
# ---------------------------------------------------------------------------
AUDITED_FIELDS = [
    "tagline",
    "formFactor",
    "highlights",
    "useCases",
    "roomSizes",
    "recommendedPeople",
    "price",
    "priceNote",
    "display",
    "camera",
    "audio",
    "connectivity",
    "software",
]


# Optional Device fields where "absent in data" is not a defect. We don't
# emit MISSING for these; the visualization deliberately leaves them out for
# many devices (e.g. phones, headsets) where the brochure has rich data but
# we only summarize highlights.
OPTIONAL_FIELDS = {
    "price",
    "priceNote",
    "recommendedPeople",
    "display",
    "camera",
    "audio",
    "connectivity",
    "software",
    "tagline",
}


def audit_device(
    dev: dict, section: dict
) -> tuple[list[dict], Counter]:
    fields = dev["fields"]
    raw_block = dev["raw"]
    rows: list[dict] = []
    counts: Counter = Counter()
    section_text = section["text"]
    for field in AUDITED_FIELDS:
        if field not in fields:
            if field in OPTIONAL_FIELDS:
                continue  # absent is intentional, do not emit MISSING noise
            hint = field_concept_in_pdf(field, section_text)
            if hint:
                rows.append({
                    "field": field,
                    "value": "(absent)",
                    "verdict": "MISSING",
                    "excerpt": hint,
                })
                counts["MISSING"] += 1
            continue
        value = fields[field]
        if isinstance(value, list):
            for idx, item in enumerate(value):
                v_str = _value_to_str(item)
                verdict, excerpt = verdict_value(field, v_str, section_text)
                rows.append({
                    "field": f"{field}[{idx}]",
                    "value": v_str,
                    "verdict": verdict,
                    "excerpt": excerpt,
                })
                counts[verdict] += 1
        else:
            v_str = _value_to_str(value)
            verdict, excerpt = verdict_value(field, v_str, section_text)
            rows.append({
                "field": field,
                "value": v_str,
                "verdict": verdict,
                "excerpt": excerpt,
            })
            counts[verdict] += 1
    return rows, counts


def _value_to_str(value: object) -> str:
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, dict):
        if "__expr__" in value:
            return str(value["__expr__"])
        return json.dumps(value)
    if isinstance(value, list):
        return ", ".join(_value_to_str(v) for v in value)
    return _ascii(str(value))


def _truncate(s: str, n: int = 120) -> str:
    s = _ascii(s).replace("|", "\\|").replace("\n", " ").strip()
    if len(s) <= n:
        return s
    return s[: n - 1] + "~"


def emit_report(
    devices: list[dict],
    sections: dict[str, dict],
    per_device_rows: dict[str, list[dict]],
    per_device_counts: dict[str, Counter],
) -> str:
    out: list[str] = []
    out.append("# Spec audit: src/data/cisco.ts vs Cisco brochure PDF")
    out.append("")
    out.append(
        "Generated by `scripts/audit-specs.py`. Do not commit; this file is "
        "gitignored. Re-run after edits to refresh."
    )
    out.append("")
    out.append(
        "Verdicts: MATCH = value tokens present in PDF section; "
        "SIMILAR = some tokens present; DIFFERS = PDF contradicts or "
        "mentions concept with different value; NOT_IN_PDF = concept not "
        "found in section; MISSING = PDF asserts concept that data omits."
    )
    out.append("")

    # Per-device sections.
    for dev in devices:
        dev_id = dev["id"]
        rows = per_device_rows[dev_id]
        section = sections[dev_id]
        out.append(f"## `{dev_id}` -- {_ascii(dev['fields'].get('name', ''))}")
        out.append("")
        out.append(f"- pages: {section['pages'] or '(none)'}")
        out.append(f"- match-tokens: {section['tokens']}")
        out.append("")
        out.append("| field | value | verdict | PDF excerpt |")
        out.append("| --- | --- | --- | --- |")
        for row in rows:
            out.append(
                "| {field} | {value} | {verdict} | {excerpt} |".format(
                    field=_truncate(row["field"], 40),
                    value=_truncate(row["value"], 80),
                    verdict=row["verdict"],
                    excerpt=_truncate(row["excerpt"], 110),
                )
            )
        out.append("")

    # Summary table.
    out.append("## Summary -- counts per device")
    out.append("")
    verdict_cols = ["MATCH", "SIMILAR", "DIFFERS", "NOT_IN_PDF", "MISSING", "EMPTY"]
    out.append("| device | " + " | ".join(verdict_cols) + " | pages |")
    out.append("| --- | " + " | ".join("---:" for _ in verdict_cols) + " | --- |")
    totals: Counter = Counter()
    for dev in devices:
        dev_id = dev["id"]
        c = per_device_counts[dev_id]
        totals.update(c)
        cells = [str(c.get(v, 0)) for v in verdict_cols]
        out.append(
            "| {id} | ".format(id=dev_id)
            + " | ".join(cells)
            + " | "
            + ",".join(str(p) for p in sections[dev_id]["pages"])
            + " |"
        )
    out.append(
        "| **TOTAL** | "
        + " | ".join(f"**{totals.get(v, 0)}**" for v in verdict_cols)
        + " | |"
    )
    out.append("")

    # Global lists.
    out.append("## Global: DIFFERS findings")
    out.append("")
    for dev in devices:
        dev_id = dev["id"]
        diffs = [r for r in per_device_rows[dev_id] if r["verdict"] == "DIFFERS"]
        if not diffs:
            continue
        out.append(f"### `{dev_id}`")
        for r in diffs:
            out.append(
                f"- **{r['field']}**: `{_truncate(r['value'], 80)}` -- "
                f"{_truncate(r['excerpt'], 160)}"
            )
        out.append("")

    out.append("## Global: MISSING findings")
    out.append("")
    for dev in devices:
        dev_id = dev["id"]
        miss = [r for r in per_device_rows[dev_id] if r["verdict"] == "MISSING"]
        if not miss:
            continue
        out.append(f"### `{dev_id}`")
        for r in miss:
            out.append(
                f"- **{r['field']}**: `{_truncate(r['value'], 80)}` -- "
                f"{_truncate(r['excerpt'], 160)}"
            )
        out.append("")

    out.append("## Global: NOT_IN_PDF findings (datasheet candidates)")
    out.append("")
    for dev in devices:
        dev_id = dev["id"]
        nip = [r for r in per_device_rows[dev_id] if r["verdict"] == "NOT_IN_PDF"]
        if not nip:
            continue
        out.append(f"### `{dev_id}`")
        for r in nip:
            out.append(
                f"- **{r['field']}**: `{_truncate(r['value'], 80)}`"
            )
        out.append("")
    return "\n".join(out) + "\n"


def main() -> int:
    if not TS_PATH.exists():
        sys.stderr.write(f"missing source: {TS_PATH}\n")
        return 1
    if not PDF_PATH.exists():
        sys.stderr.write(
            f"missing PDF: {PDF_PATH} -- run scripts/fetch-pdf.py first\n"
        )
        return 1

    ts_source = TS_PATH.read_text(encoding="utf-8")
    devices = parse_devices(ts_source)
    sys.stderr.write(f"parsed {len(devices)} devices from cisco.ts\n")

    pages = extract_pdf_pages(PDF_PATH)
    sys.stderr.write(f"extracted {len(pages)} PDF pages\n")

    sections = assign_sections(devices, pages)

    per_device_rows: dict[str, list[dict]] = {}
    per_device_counts: dict[str, Counter] = {}
    for dev in devices:
        rows, counts = audit_device(dev, sections[dev["id"]])
        per_device_rows[dev["id"]] = rows
        per_device_counts[dev["id"]] = counts
        if not sections[dev["id"]]["pages"]:
            sys.stderr.write(
                f"WARN: no pages matched for {dev['id']}\n"
            )

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    report = emit_report(devices, sections, per_device_rows, per_device_counts)
    REPORT_PATH.write_text(report, encoding="utf-8")
    sys.stderr.write(f"wrote {REPORT_PATH}\n")

    # Print summary to stdout so callers see headline counts.
    totals: Counter = Counter()
    for c in per_device_counts.values():
        totals.update(c)
    print(
        "Totals:",
        " ".join(f"{k}={totals.get(k, 0)}" for k in (
            "MATCH", "SIMILAR", "DIFFERS", "NOT_IN_PDF", "MISSING", "EMPTY"
        )),
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
