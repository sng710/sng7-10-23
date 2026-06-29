# -*- coding: utf-8 -*-
"""
Build people_assets_manifest.js from assets/people.
The browser cannot list local folders by itself, so this script scans once and
creates the manifest used by the faded leaf memorial page.

It uses ONLY:
- profile_text.txt (preferred), or all_text_profile_and_inner_pages.txt if needed
- photos/ folder image files
It does not read inner_pages, profile.json or gallery_manifest.json into the popup.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import quote

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
TEXT_PRIORITY = [
    "profile_text.txt",
    "summary.txt",
    "person_summary.txt",
    "all_text_profile_and_inner_pages.txt",
]

SKIP_DIRS = {"images", "old", "backup", "backups", "tmp", "temp", "__macosx"}

BOILERPLATE_PATTERNS = [
    r"^עבור לתפריט",
    r"^עבור למפת האתר",
    r"^אזרחים חללי פעולות איבה",
    r"^חללי \"?חרבות ברזל\"?",
    r"^האנדרטה לזכרם בהר הרצל$",
    r"^דבר שר",
    r"^דבר מנכ",
    r"^מידע שימושי",
    r"^אוגדן זכויות",
    r"^על אודות האתר$",
    r"^דף חלל$",
    r"^אלבום זיכרון$",
    r"^תמונות המצבה$",
    r"^בניית אתרים:?$",
    r"^פיתוח מאגרי מידע$",
    r"^שיתוף בפייסבוק",
    r"^הדפסת תווית",
    r"^אנו עושים כל מאמץ",
    r"^אם ברצונכם להעיר",
    r"^פרטים אישיים והנצחה:?$",
    r"^קורות חיים$",
]
BOILERPLATE_RES = [re.compile(p) for p in BOILERPLATE_PATTERNS]


def read_text(path: Path) -> str:
    raw = path.read_bytes()
    for enc in ("utf-8-sig", "utf-8", "cp1255", "windows-1255", "cp1252"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            pass
    return raw.decode("utf-8", errors="replace")


def clean_text(s: str) -> str:
    lines: list[str] = []
    seen: set[str] = set()
    for raw in s.replace("\r", "").split("\n"):
        line = re.sub(r"\s+", " ", raw).strip()
        if not line:
            continue
        if any(rx.search(line) for rx in BOILERPLATE_RES):
            continue
        key = re.sub(r"[\s\"'״׳`.,:;()\[\]{}_-]+", "", line)
        if len(key) < 120 and key in seen:
            continue
        if len(key) < 120:
            seen.add(key)
        lines.append(line)
    return "\n".join(lines).strip()


def clean_name(name: str) -> str:
    name = re.sub(r"^\d+[_\-\s]*", "", name)
    name = name.replace("_", " ")
    name = re.sub(r"\s*ז[\"״'׳`]{0,2}\s*ל\s*$", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def infer_name_from_text(text: str) -> str:
    for line in clean_text(text).splitlines()[:25]:
        if re.search(r"ז[\"״'׳`]{0,2}\s*ל", line) and len(line) <= 90:
            return clean_name(line)
    return ""


def infer_community(text: str) -> str:
    patterns = [
        r"התגורר(?:ה)?\s+ב([^\n,.]+)",
        r"מקום אירוע:\s*([^\n,.]+)",
        r"מקום מגורים:\s*([^\n,.]+)",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            return re.sub(r"\s+", " ", m.group(1)).strip()
    return ""


def infer_age(text: str) -> str:
    m = re.search(r"(?:בן|בת)\s+(\d{1,3})\s+במות", text)
    return f"{m.group(1)} במותו/ה" if m else ""


def choose_text_file(person_dir: Path) -> Path | None:
    by_name = {p.name.lower(): p for p in person_dir.iterdir() if p.is_file()}
    for name in TEXT_PRIORITY:
        if name.lower() in by_name:
            return by_name[name.lower()]
    txts = sorted([p for p in person_dir.iterdir() if p.is_file() and p.suffix.lower() == ".txt"], key=lambda p: p.name.lower())
    return txts[0] if txts else None


def url_path(base_url: str, *parts: str) -> str:
    base_segments = [seg for seg in str(base_url).replace("\\", "/").strip("/").split("/") if seg]
    all_segments = base_segments + [str(p).strip("/\\") for p in parts if str(p).strip("/\\")]
    return "/".join(quote(seg, safe="") for seg in all_segments)


def build_manifest(assets_dir: Path, base_url: str) -> list[dict]:
    items: list[dict] = []
    for person_dir in sorted([p for p in assets_dir.iterdir() if p.is_dir()], key=lambda p: p.name):
        if person_dir.name.lower() in SKIP_DIRS:
            continue
        text_file = choose_text_file(person_dir)
        profile_text = ""
        text_name = ""
        if text_file:
            profile_text = clean_text(read_text(text_file))
            text_name = text_file.name
        name = infer_name_from_text(profile_text) or clean_name(person_dir.name)
        community = infer_community(profile_text)
        age = infer_age(profile_text)

        photos_dir = person_dir / "photos"
        photos: list[str] = []
        if photos_dir.exists() and photos_dir.is_dir():
            for img in sorted(photos_dir.rglob("*"), key=lambda p: p.name.lower()):
                if img.is_file() and img.suffix.lower() in IMAGE_EXTS:
                    rel = img.relative_to(photos_dir)
                    photos.append(url_path(base_url, person_dir.name, "photos", *rel.parts))

        items.append({
            "folder": person_dir.name,
            "baseUrl": str(base_url).replace("\\", "/").strip("/"),
            "name": name,
            "names": sorted(set([name, clean_name(person_dir.name)])),
            "community": community,
            "age": age,
            "textFile": text_name,
            "profileText": profile_text,
            "photos": photos,
        })
    return items


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--assets", default="assets/people", help="Path to people folder, for example assets/people or assets/people-original")
    ap.add_argument("--output", default="people_assets_manifest.js", help="Output JS file")
    ap.add_argument("--base-url", default="assets/people", help="URL prefix used by the website, matching --assets")
    args = ap.parse_args()

    assets_dir = Path(args.assets)
    if not assets_dir.exists():
        raise SystemExit(f"assets folder not found: {assets_dir}")
    manifest = build_manifest(assets_dir, args.base_url)
    out = Path(args.output)
    js = "window.PEOPLE_ASSETS_MANIFEST = " + json.dumps(manifest, ensure_ascii=False, indent=2) + ";\n"
    out.write_text(js, encoding="utf-8")
    print(f"Created {out} with {len(manifest)} people")
    missing_text = sum(1 for x in manifest if not x.get("profileText"))
    missing_photos = sum(1 for x in manifest if not x.get("photos"))
    if missing_text:
        print(f"Warning: {missing_text} people have no profile_text/summary text file")
    if missing_photos:
        print(f"Warning: {missing_photos} people have no photos")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
