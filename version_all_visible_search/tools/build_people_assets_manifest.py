from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
# קודם תיקיית האנשים החדשה עם profile_text.txt/photos, אחר כך גיבוי אם אין כזו.
CANDIDATES = [ROOT / 'assets' / 'people', ROOT / 'assets' / 'people-original']
IMG_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}


def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def clean_name(folder_name: str) -> str:
    s = re.sub(r'^\d+[_\-\s]*', '', folder_name.strip())
    # תומך גם במבנה שם_משפחה_ז''ל_43495
    s = re.sub(r'[_\-\s]*\d{4,6}$', '', s)
    s = re.sub(r'[_\-]+', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'ז["״\'׳`]{0,2}ל', 'ז"ל', s)
    if s and not re.search(r'ז["״\']?ל', s):
        s += ' ז"ל'
    return s


def dedupe_key(name: str) -> str:
    s = clean_name(name).replace('ז"ל', '')
    tokens = re.findall(r'[א-תA-Za-z]+', s)
    return '|'.join(sorted(set(tokens)))


def read_text_file(path: Path) -> str:
    for enc in ('utf-8-sig', 'utf-8', 'cp1255', 'windows-1255'):
        try:
            return path.read_text(encoding=enc)
        except Exception:
            pass
    return path.read_text(errors='replace')


def main():
    out = ROOT / 'people_assets_manifest.js'
    people = []
    seen = set()
    scanned_roots = []

    for base in CANDIDATES:
        if not base.exists() or not base.is_dir():
            continue
        scanned_roots.append(base.relative_to(ROOT).as_posix())
        for person_dir in sorted([p for p in base.iterdir() if p.is_dir()], key=lambda p: p.name):
            key = dedupe_key(person_dir.name)
            if key and key in seen:
                continue

            photos_dir = person_dir / 'photos'
            photos = []
            if photos_dir.exists():
                photos = [rel(p) for p in sorted(photos_dir.rglob('*')) if p.is_file() and p.suffix.lower() in IMG_EXTS]

            profile = person_dir / 'profile_text.txt'
            profile_text = read_text_file(profile) if profile.exists() else ''

            if not photos and not profile_text:
                continue

            if key:
                seen.add(key)
            people.append({
                'id': person_dir.name,
                'name': clean_name(person_dir.name),
                'folder': rel(person_dir),
                'profileTextPath': rel(profile) if profile.exists() else '',
                'profileText': profile_text,
                'photos': photos,
            })

    if not scanned_roots:
        print('לא נמצאה תיקייה assets/people או assets/people-original ליד index.html')
    js = 'window.PEOPLE_ASSETS_MANIFEST = ' + json.dumps(people, ensure_ascii=False, indent=2) + ';\n'
    out.write_text(js, encoding='utf-8')
    print(f'נוצר people_assets_manifest.js עם {len(people)} אנשים מתוך: {", ".join(scanned_roots) or "ללא תיקיות"}')


if __name__ == '__main__':
    main()
