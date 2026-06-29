from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
CANDIDATES = [ROOT / 'assets' / 'people-original', ROOT / 'assets' / 'people']
IMG_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}

def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()

def clean_name(folder_name: str) -> str:
    s = re.sub(r'^\d+[_\-\s]*', '', folder_name.strip())
    s = re.sub(r'[_\-]+', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'ז["״\'׳`]{0,2}ל', 'ז"ל', s)
    if s and not re.search(r'ז["״\']?ל', s):
        s += ' ז"ל'
    return s

def read_text_file(path: Path) -> str:
    for enc in ('utf-8-sig', 'utf-8', 'cp1255', 'windows-1255'):
        try:
            return path.read_text(encoding=enc)
        except Exception:
            pass
    return path.read_text(errors='replace')

def main():
    base = None
    for c in CANDIDATES:
        if c.exists() and c.is_dir():
            base = c
            break
    out = ROOT / 'people_assets_manifest.js'
    if not base:
        print('לא נמצאה תיקייה assets/people-original או assets/people ליד index.html')
        out.write_text('window.PEOPLE_ASSETS_MANIFEST = [];\n', encoding='utf-8')
        return
    people = []
    for person_dir in sorted([p for p in base.iterdir() if p.is_dir()], key=lambda p: p.name):
        photos_dir = person_dir / 'photos'
        photos = []
        if photos_dir.exists():
            photos = [rel(p) for p in sorted(photos_dir.rglob('*')) if p.is_file() and p.suffix.lower() in IMG_EXTS]
        profile = person_dir / 'profile_text.txt'
        profile_text = read_text_file(profile) if profile.exists() else ''
        if not photos and not profile_text:
            continue
        people.append({
            'id': person_dir.name,
            'name': clean_name(person_dir.name),
            'folder': rel(person_dir),
            'profileTextPath': rel(profile) if profile.exists() else '',
            'profileText': profile_text,
            'photos': photos,
        })
    js = 'window.PEOPLE_ASSETS_MANIFEST = ' + json.dumps(people, ensure_ascii=False, indent=2) + ';\n'
    out.write_text(js, encoding='utf-8')
    print(f'נוצר people_assets_manifest.js עם {len(people)} אנשים מתוך {base.relative_to(ROOT).as_posix()}')

if __name__ == '__main__':
    main()
