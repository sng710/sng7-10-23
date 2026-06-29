@echo off
chcp 65001 >nul
set PYTHONUTF8=1
python "%~dp0tools\build_people_assets_manifest.py"
pause
