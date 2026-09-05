@echo off
cd /d "%~dp0"
set msg=%*
if "%msg%"=="" set msg=Update K-IG-CORE content and views
echo === adding files ===
git add -A
echo === committing: %msg% ===
git commit -m "%msg%"
echo === pushing to GitHub ===
git push origin main
echo.
echo === done ===
pause
