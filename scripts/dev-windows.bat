@echo off
echo Setting up Puppeteer for Windows development...

REM Set Puppeteer environment variables for Windows
set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
set PUPPETEER_EXECUTABLE_PATH=""

REM Create cache directory if it doesn't exist
if not exist "%USERPROFILE%\.cache\puppeteer" mkdir "%USERPROFILE%\.cache\puppeteer"

REM Set cache location
set XDG_CONFIG_HOME=%USERPROFILE%\.cache\puppeteer
set XDG_CACHE_HOME=%USERPROFILE%\.cache\puppeteer

REM Try to find Chrome installation
set CHROME_PATH=""
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe
)

if not "%CHROME_PATH%"=="" (
    echo Found Chrome at: %CHROME_PATH%
    set PUPPETEER_EXECUTABLE_PATH=%CHROME_PATH%
) else (
    echo Chrome not found, Puppeteer will download Chromium
)

echo Starting development server...
npm run dev