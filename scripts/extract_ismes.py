#!/usr/bin/env python3
"""Extract dictionary entries whose headword ends in -isme from the EPUB XHTML.

Usage: python3 scripts/extract_ismes.py
The generated data is intentionally kept separate from the source EPUB.
"""
from __future__ import annotations

import html
import json
import re
import unicodedata
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OPS = next(ROOT.glob("La philosophie de A à Z*/OPS"), None)
OUT = ROOT / "src" / "data" / "ismes.json"


class DivText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.divs = []
        self.stack = []
        self.buffers = []

    def handle_starttag(self, tag, attrs):
        if tag == "div":
            attributes = dict(attrs)
            self.stack.append(attributes.get("class", ""))
            self.buffers.append([])

    def handle_data(self, data):
        for buffer in self.buffers:
            buffer.append(data)

    def handle_endtag(self, tag):
        if tag == "div" and self.buffers:
            classes = self.stack.pop()
            text = "".join(self.buffers.pop())
            if " t " in f" {classes} ":
                self.divs.append((classes, clean(text)))


def clean(text: str) -> str:
    text = unicodedata.normalize("NFKC", html.unescape(text))
    # Decode the embedded fonts' private-use glyphs before normalizing spaces.
    text = re.sub(r"[\ue618-\ue61b]{2,}", lambda m: m[0].translate(str.maketrans({"\ue618": "I", "\ue619": "V", "\ue61a": "X", "\ue61b": "X"})), text)
    text = re.sub(r"\ue61a(?= s\.)", "V", text)
    text = re.sub(r"[\ue621-\ue65b]", lambda m: chr(ord(m[0]) - 0xe5e1), text)
    text = text.translate(str.maketrans({"\ue660": " ", "\ue603": " ", "\ue60f": ".", "\ue618": "Th", "\ue619": "Th", "\ue61a": "V", "\ue61b": "Th", "\ue61d": " ", "\ue61f": " ", "\ue6a9": "é", "\ue6aa": "ê", "\ueb2b": "fi", "\ueb2a": "ff", "\uf769": "I", "\uf776": "V", "\uf778": "X"}))
    text = text.replace("\ue61eeravâda", "Theravâda").replace("\ue61e", " ")
    text = re.sub(r" +([,.])", r"\1", text)
    text = re.sub(r"\s+", " ", text).strip()
    # Preserve compound names and common grammatical compounds across line breaks.
    text = re.sub(r"(?<=\w)\s*- (?=[A-ZÀ-ÖØ-Þ])", "-", text)
    text = re.sub(r"(?<=\w)\s*- (?=(?:mêmes?|être|à-dire)\b)", "-", text)
    # Other line-end hyphens in this fixed-layout export mark word wrapping.
    return re.sub(r"(?<=\w)\s*- (?=\w)", "", text)


def slug(term: str) -> str:
    normalized = unicodedata.normalize("NFKD", term.lower())
    normalized = "".join(c for c in normalized if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")


def is_headword(classes: str, text: str) -> bool:
    # Font size identifies headings; height varies with the font (h12/h29/h44/h63).
    tokens = set(classes.split())
    return "fs7" in tokens and bool(tokens & {"fc2", "fc3"}) and bool(text)


def is_body(classes: str) -> bool:
    tokens = set(classes.split())
    return bool(tokens & {"h14", "h15"}) or ("fs2" in tokens and "fc0" in tokens)


def make_entry(term, page, lines):
    sections = {key: [] for key in ("definition", "context", "antonyms", "neighbors", "related")}
    section = "definition"
    context_paragraphs = []
    context_buffer = []
    context_headings = set()
    for classes, text in lines:
        tokens = set(classes.split())
        if not text or tokens & {"fs9"} or ("fs0" in tokens and "fc0" in tokens and text.isdigit()):
            continue
        match = re.match(r"Termes? (opposés?|voisins?)\s*:\s*(.*)", text)
        if match:
            section = "antonyms" if match[1].startswith("opposé") else "neighbors"
            text = match[2]
        elif tokens & {"h16", "h55"}:
            section = "related"
        elif "fs0" in tokens and "fc1" in tokens and section in ("antonyms", "neighbors"):
            pass  # A relationship list can continue on the next visual line.
        elif is_subheading(classes, text) or "h26" in tokens:
            if context_buffer:
                context_paragraphs.append(clean(" ".join(context_buffer)))
                context_buffer = []
            context_paragraphs.append(text)
            context_headings.add(text)
            section = "context"
            continue
        elif "fs10" in tokens and "fc0" in tokens:
            text = text.upper()
            section = "context"
        elif is_body(classes):
            section = "context"
        elif tokens & {"fs3", "fse"} and section in ("definition", "context"):
            # Superscript century numbers and ordinals are separate divs.
            target = context_buffer if section == "context" else sections[section]
            if target:
                target[-1] += text
            continue
        elif "fs8" in tokens and tokens & {"fc7", "fc3"}:
            section = "definition"
        else:
            continue
        sections[section].append(text)
        if section == "context":
            context_buffer.append(text)
            if "ws0" in tokens and re.search(r"[.!?]$", text):
                context_paragraphs.append(clean(" ".join(context_buffer)))
                context_buffer = []
    joined = {key: clean(" ".join(value)) for key, value in sections.items()}
    if context_buffer:
        context_paragraphs.append(clean(" ".join(context_buffer)))
    raw = joined["definition"]
    chunks = [part.strip() for part in raw.split("•") if part.strip()]
    etymology = chunks.pop(0) if len(chunks) > 1 and re.match(r"n\. |adj\.", chunks[0]) else ""
    if not chunks and context_paragraphs and context_paragraphs[0] not in context_headings:
        chunks = [context_paragraphs.pop(0)]
    senses = []
    for chunk in chunks:
        match = re.match(r"^([^.!?]{2,65})\. (.+)$", chunk)
        if match and len(raw.split("•")) > 1 and not chunk.startswith(("n. ", "adj.")):
            senses.append({"label": match[1], "text": match[2]})
        else:
            senses.append({"label": "", "text": chunk})
    return {
        "id": slug(term), "term": term, "definition": raw,
        "etymology": etymology, "senses": senses,
        "context": "\n\n".join(context_paragraphs),
        "contextBlocks": [{"type": "heading" if text in context_headings else "paragraph", "text": text}
                          for text in context_paragraphs],
        **{key: [v.strip().rstrip(".") for v in joined[key].split(",") if v.strip()]
           for key in ("antonyms", "neighbors", "related")},
        "source": {"page": page},
    }


def is_subheading(classes, text):
    return {"h1e", "fsa", "fc3"}.issubset(classes.split()) and bool(text)


def join_heading(parts):
    value = parts[0]
    for part in parts[1:]:
        if value.endswith("-"):
            value = value[:-1] + part
        elif value.endswith("/"):
            value += part
        else:
            value += " " + part
    return value


def read_pages(ops):
    for path in sorted(ops.glob("pageNum-*.xhtml"), key=lambda p: int(re.search(r"(\d+)", p.stem)[1])):
        parser = DivText()
        source = path.read_text(encoding="utf-8")
        parser.feed(source)
        # Running headers have the same typography as cross-references but sit
        # above the dictionary columns. Do not let them change the active section.
        positions = {name: float(bottom) for name, bottom in
                     re.findall(r"\.(y[0-9a-f]+)\s*\{bottom:([\d.]+)px;?\}", source)}
        viewport = re.search(r'height=(\d+)', source)
        page_height = int(viewport[1]) if viewport else 2048
        divs = [(c, t) for c, t in parser.divs
                if not any(positions.get(token, 0) > page_height - 100 for token in c.split())]
        yield int(re.search(r"(\d+)", path.stem)[1]), divs


def iter_articles(ops):
    """Reassemble every heading before selecting -isme articles, not after."""
    heading, lines, start_page, end_page = [], [], None, None
    for page, divs in read_pages(ops):
        for classes, text in divs:
            tokens = set(classes.split())
            # The dictionary ends before the back matter; its tables use body fonts.
            if "fs4" in tokens and text in {"Les notions du bac", "Les auteurs du bac", "Table d’illustrations"}:
                if heading:
                    yield join_heading(heading), start_page, end_page, lines
                return
            if not text or "fs9" in tokens or ("fs0" in tokens and "fc0" in tokens and text.isdigit()):
                continue
            if is_headword(classes, text):
                if heading and not lines:
                    heading.append(text)
                    continue
                if heading:
                    yield join_heading(heading), start_page, end_page, lines
                heading, lines, start_page, end_page = [text], [], page, page
            elif heading:
                lines.append((classes, text, page))
                end_page = page
    if heading:
        yield join_heading(heading), start_page, end_page, lines


def selected_terms(heading):
    # Combined articles and qualified terms: spécisme/antispécisme,
    # normativisme juridique, matérialisme historique, etc.
    return [part.strip() for part in heading.split("/")
            if re.search(r"\b[\w’'-]*isme\b", part, re.I)]


def extract_entries(ops):
    entries = []
    for heading, page, end_page, rows in iter_articles(ops):
        for term in selected_terms(heading):
            entry = make_entry(term, page, [(c, t) for c, t, _ in rows])
            entry["source"].update({"endPage": end_page, "heading": heading})
            entries.append(entry)
        # Subentries remain labelled inside the parent article and also get their
        # own index entry. The parent's final relation lists are not inherited.
        index = 0
        while index < len(rows):
            classes, text, sub_page = rows[index]
            if not is_subheading(classes, text):
                index += 1
                continue
            parts = [text]
            index += 1
            while index < len(rows) and is_subheading(*rows[index][:2]):
                parts.append(rows[index][1])
                index += 1
            title = join_heading(parts)
            sub_rows = []
            while index < len(rows) and not is_subheading(*rows[index][:2]):
                c, t, _ = rows[index]
                if re.match(r"Termes? (opposés?|voisins?)\s*:", t) or set(c.split()) & {"h16", "h55"}:
                    break
                sub_rows.append(rows[index])
                index += 1
            for term in selected_terms(title):
                entry = make_entry(term, sub_page, [(c, t) for c, t, _ in sub_rows])
                entry["source"].update({"endPage": sub_rows[-1][2] if sub_rows else sub_page,
                                        "heading": title, "parent": heading})
                entries.append(entry)
            # Move past a parent relation block, if present.
            if index < len(rows) and not is_subheading(*rows[index][:2]):
                index += 1
    return entries


def main():
    if OPS is None:
        raise SystemExit("Source XHTML introuvable : placez le dossier de l’ouvrage à la racine.")
    entries = extract_entries(OPS)
    # Never silently overwrite a homonym or a duplicate source occurrence.
    unique = {}
    for entry in entries:
        if entry["id"] in unique:
            raise SystemExit(f"Entrée dupliquée à examiner : {entry['term']}")
        unique[entry["id"]] = entry
    result = sorted(unique.values(), key=lambda entry: unicodedata.normalize("NFKD", entry["term"]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(result)} entries written to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
