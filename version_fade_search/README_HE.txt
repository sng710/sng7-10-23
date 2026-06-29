גרסת faded leaf עם פופ-אפ מתוך assets/people
============================================

מה הגרסה עושה
--------------
- מציגה 6 כרטיסי אנשים בכל סבב, עם fade-in/fade-out.
- שומרת על רקע העלים הכהה.
- בלחיצה על אדם נפתח פופ-אפ.
- הפופ-אפ לוקח מידע מתוך assets/people:
  1. תיקיית photos בלבד לתמונות.
  2. profile_text.txt בלבד לטקסט האדם.
- הוא לא מציג inner_pages, profile.json או gallery_manifest.json בפופ-אפ.

מבנה תיקיות נדרש
----------------
שימי ליד index.html תיקייה כזו:

assets/
  people/
    43540_קשת_זוהר_ז"ל/
      photos/
        image1.jpg
        image2.jpg
      profile_text.txt
    43539_יסמין_זוהר_ז"ל/
      photos/
      profile_text.txt

שלבי עבודה
-----------
1. העתיקי את תיקיית assets/people שלך אל תוך תיקיית האתר, ליד index.html.
2. השאירי ליד הקבצים גם את data.js האמיתי שלך.
3. לחצי על run_build_manifest_windows.bat.
4. יווצר קובץ people_assets_manifest.js.
5. העלי לאתר את כל אלה:
   - index.html
   - styles.css
   - app.js
   - data.js
   - people_assets_manifest.js
   - assets/people כולל כל תיקיות האנשים

למה צריך people_assets_manifest.js?
-----------------------------------
דפדפן לא יכול לקרוא לבד רשימת קבצים מתוך תיקייה באתר, במיוחד ב-GitHub Pages / שרת רגיל.
לכן הסקריפט סורק את assets/people במחשב שלך פעם אחת, ובונה קובץ שמכיל:
- שם תיקיית האדם
- הטקסט מתוך profile_text.txt
- רשימת התמונות מתוך photos

התאמה בין data.js לבין assets/people
-------------------------------------
הקוד מנסה להתאים אוטומטית לפי שם האדם.
לדוגמה:
43540_קשת_זוהר_ז"ל -> קשת זוהר

אם יש שם שלא מתחבר נכון, אפשר להוסיף לאדם ב-data.js שדה:
assetsFolder: "43540_קשת_זוהר_ז\"ל"

דוגמה:
{
  name: "קשת זוהר",
  community: "נחל עוז",
  assetsFolder: "43540_קשת_זוהר_ז\"ל"
}

הערות חשובות
-------------
- אם פתחת ב-file:// והכול נטען, זה בסדר. בפרסום אמיתי עדיף להעלות לאתר או להריץ שרת מקומי.
- אם התמונות לא מופיעות, בדקי ש-run_build_manifest_windows.bat רץ אחרי שהעתקת את assets/people.
- אם הטקסט לא מופיע, בדקי שבתיקיית האדם יש profile_text.txt.
