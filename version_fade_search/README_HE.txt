גרסת faded leaf assets v5
==========================

מה השתנה בגרסה הזו:
1. העיצוב חזר לבסיס של גרסת faded leaf המקורית: אותו רקע עלים, אותו פאנל שיר, אותם כרטיסים עגולים ואותם כפתורי תחתית.
2. אין שימוש ב-data.js ולכן לא תהיה שגיאת data.js 404.
3. האתר קורא אנשים מתוך people_assets_manifest.js.
4. אם people_assets_manifest.js ריק והאתר רץ ב-GitHub Pages, הוא מנסה לטעון אוטומטית את הרשימה מתוך GitHub API לפי הנתיב הנוכחי.
5. הפופ-אפ משתמש רק ב-profile_text.txt ובתמונות מתוך photos.

מבנה מומלץ:
version_fade_search
├── index.html
├── styles.css
├── app.js
├── people_assets_manifest.js
├── run_build_manifest_windows.bat
├── tools
└── assets
    └── people-original
        └── 43540_קשת_זוהר_ז"ל
            ├── photos
            └── profile_text.txt

חשוב:
- הקובץ שהעלית people_assets_manifest.js היה ריק:
  window.PEOPLE_ASSETS_MANIFEST = [];
  לכן האתר לא ידע אילו אנשים קיימים.

דרך עבודה מומלצת:
1. לשים/להשאיר את תיקיית האנשים ב-assets/people-original.
2. להריץ במחשב את run_build_manifest_windows.bat.
3. לבדוק שהקובץ people_assets_manifest.js כבר לא ריק.
4. להעלות ל-GitHub את people_assets_manifest.js החדש יחד עם index.html, styles.css, app.js.

גם אם שכחת להריץ manifest, ב-GitHub Pages v5 מנסה fallback אוטומטי דרך GitHub API, אבל manifest עדיין עדיף כי הוא מהיר ויציב יותר.
