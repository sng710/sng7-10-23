@echo off
chcp 65001 >nul
set PYTHONUTF8=1
cd /d "%~dp0"
echo Building people_assets_manifest.js from assets\people ...
python tools\build_people_assets_manifest.py --assets assets\people --output people_assets_manifest.js --base-url assets/people
if errorlevel 1 (
  echo.
  echo Failed. Make sure Python is installed and assets\people exists next to this file.
  pause
  exit /b 1
)
echo.
echo Done. Upload people_assets_manifest.js with index.html, app.js, styles.css, data.js and assets\people.
pause
