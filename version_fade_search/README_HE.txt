גרסת faded leaf עם טעינה מתוך assets/people או assets/people-original - v4
=====================================================================

מה תוקן בגרסה הזו:
1. אין צורך ב-data.js.
2. נשמר עיצוב faded leaf.
3. הפופ-אפ משתמש רק ב-profile_text.txt ובתמונות שבתוך photos.
4. run_build_manifest_windows.bat מזהה עכשיו אוטומטית גם:
   assets\people
   assets\people-original
   assets\people_original
5. לפי צילום המסך שלך, אצלך התיקייה היא assets\people-original, ולכן v3 יצר/השאיר manifest ריק.
6. הנתיבים לתמונות ול-profile_text.txt נבנים עכשיו לפי שם התיקייה האמיתי.

מבנה תקין לפי המצב שלך:

index.html
styles.css
app.js
people_assets_manifest.js
run_build_manifest_windows.bat
tools/
assets/
  people-original/
    43540_קשת_זוהר_ז"ל/
      photos/
        image1.jpg
        image2.jpg
      profile_text.txt

איך משתמשים:
1. במחשב שלך, בתוך תיקיית version_fade_search המקומית, ודאי שיש:
   assets\people-original

2. לחצי פעמיים על:
   run_build_manifest_windows.bat

3. אחרי ההרצה, פתחי את people_assets_manifest.js ובדקי שהוא לא ריק.
   לא טוב:
   window.PEOPLE_ASSETS_MANIFEST = [];

   טוב:
   window.PEOPLE_ASSETS_MANIFEST = [ ...הרבה אנשים... ];

4. העלי מחדש ל-GitHub את:
   index.html
   styles.css
   app.js
   people_assets_manifest.js
   assets/people-original

חשוב מאוד:
GitHub לא מריץ את קובץ ה-BAT בעצמו. צריך להריץ אותו אצלך במחשב ואז להעלות את people_assets_manifest.js המעודכן.

Fallback אוטומטי מ-GitHub:
אם שכחת להעלות manifest מלא והאתר רץ ב-GitHub Pages, app.js ינסה לקרוא את רשימת הקבצים דרך GitHub API מתוך:
version_fade_search/assets/people-original
ואם לא נמצא, מתוך:
version_fade_search/assets/people

עדיין מומלץ יותר להריץ את ה-BAT ולהעלות manifest מלא, כי זה מהיר ויציב יותר.
