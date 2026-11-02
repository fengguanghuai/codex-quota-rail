@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22+ is required. Install Node.js and try again.
  pause
  exit /b 1
)
node "%~dp0src\cli.mjs" install
set "result=%errorlevel%"
pause
exit /b %result%
