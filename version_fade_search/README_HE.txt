גרסת faded leaf עם טעינה מתוך assets/people - v3
=================================================

מה תוקן בגרסה הזו:
1. אין יותר טעינה של data.js, ולכן לא אמורה להיות שגיאת 404 על data.js.
2. העיצוב חזר להיות כמעט זהה לגרסת faded leaf המקורית.
3. האנשים, התמונות והטקסטים נטענים מתוך people_assets_manifest.js.
4. people_assets_manifest.js נוצר מתוך assets/people בעזרת run_build_manifest_windows.bat.
5. התיקון החשוב: הנתיבים לתמונות בעברית תוקנו. בגרסה הקודמת base-url קודד בטעות כ-assets%2Fpeople.

מבנה תיקיות נדרש:

index.html
styles.css
app.js
people_assets_manifest.js
run_build_manifest_windows.bat
tools/
assets/
  people/
    43540_קשת_זוהר_ז"ל/
      photos/
        image1.jpg
        image2.jpg
      profile_text.txt

איך משתמשים:
1. העתיקי את תיקיית people שלך אל:
   assets/people

2. לחצי פעמיים על:
   run_build_manifest_windows.bat

3. אחרי שזה מסתיים, ייווצר/יתעדכן:
   people_assets_manifest.js

4. העלי לאתר יחד:
   index.html
   styles.css
   app.js
   people_assets_manifest.js
   assets/people

חשוב:
- אין צורך ב-data.js לגרסה הזו.
- אם את מחליפה/מוסיפה תיקיות אנשים או תמונות, צריך להריץ שוב את run_build_manifest_windows.bat.
- הפופ-אפ משתמש רק ב-profile_text.txt ובתמונות שבתוך photos.
- הוא לא משתמש ב-inner_pages, profile.json או gallery_manifest.json.
