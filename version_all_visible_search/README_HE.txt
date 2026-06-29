גרסת faded leaf מקורית + assets/people v7

מה חדש:
- העיצוב נשאר מבוסס על הקובץ המקורי.
- אין צורך ב-data.js.
- התמונות הראשיות בכרטיסים נלקחות קודם מתוך assets/people-original לפי מיפוי השמות המקורי.
- התמונות בתוך הפופ-אפ נלקחות מתוך תיקיית photos של כל אדם, למשל:
  assets/people/אביב_ורטהיים_ז''ל_43495/photos/
- הטקסט בפופ-אפ נלקח מתוך profile_text.txt באותה תיקיית אדם.

מבנה מומלץ:
version_fade_search/
  index.html
  people_assets_manifest.js
  run_build_manifest_windows.bat
  tools/
  assets/
    people-original/   ← תמונות ראשיות קיימות, למשל person-035.jpg
    people/            ← תיקיות אדם עם profile_text.txt ו-photos

אחרי שמעתיקים/מעדכנים את assets/people:
1. להפעיל run_build_manifest_windows.bat במחשב.
2. לוודא ש-people_assets_manifest.js לא ריק.
3. להעלות ל-GitHub את index.html ואת people_assets_manifest.js, ואת תיקיות assets.
4. לעשות Ctrl+F5 בדפדפן.
