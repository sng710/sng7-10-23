@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set PYTHONUTF8=1

echo Building people_assets_manifest.js ...
echo.

set PEOPLE_DIR=
set PEOPLE_URL=

if exist "assets\people-original" (
  set PEOPLE_DIR=assets\people-original
  set PEOPLE_URL=assets/people-original
) else if exist "assets\people" (
  set PEOPLE_DIR=assets\people
  set PEOPLE_URL=assets/people
) else if exist "assets\people_original" (
  set PEOPLE_DIR=assets\people_original
  set PEOPLE_URL=assets/people_original
)

if "%PEOPLE_DIR%"=="" (
  echo ERROR: לא נמצאה תיקיית אנשים.
  echo.
  echo לפי הצילום שלך התיקייה צריכה להיות:
  echo   assets\people-original
  echo.
  echo אפשר גם:
  echo   assets\people
  echo   assets\people_original
  echo.
  pause
  exit /b 1
)

echo Found people folder: %PEOPLE_DIR%
echo URL base: %PEOPLE_URL%
echo.

py -3 tools\build_people_assets_manifest.py --assets "%PEOPLE_DIR%" --output "people_assets_manifest.js" --base-url "%PEOPLE_URL%"
if errorlevel 1 (
  python tools\build_people_assets_manifest.py --assets "%PEOPLE_DIR%" --output "people_assets_manifest.js" --base-url "%PEOPLE_URL%"
)

if errorlevel 1 (
  echo.
  echo ERROR: יצירת manifest נכשלה.
  pause
  exit /b 1
)

echo.
echo Done. Upload the updated people_assets_manifest.js to GitHub.
echo.
pause
