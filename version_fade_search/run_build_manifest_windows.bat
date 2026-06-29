@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set PYTHONUTF8=1

echo Building people_assets_manifest.js from assets\people ...
if not exist "assets\people" (
  echo.
  echo ERROR: לא נמצאה תיקיית assets\people ליד הקבצים.
  echo יש להעתיק את תיקיית people אל assets\people ואז להריץ שוב.
  pause
  exit /b 1
)

py -3 tools\build_people_assets_manifest.py --assets "assets\people" --output "people_assets_manifest.js" --base-url "assets/people"
if errorlevel 1 (
  python tools\build_people_assets_manifest.py --assets "assets\people" --output "people_assets_manifest.js" --base-url "assets/people"
)

echo.
echo Done. Upload these files/folders together:
echo index.html, styles.css, app.js, people_assets_manifest.js, assets\people
pause
