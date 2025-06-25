Write-Host "Setting up Puppeteer for Windows development..." -ForegroundColor Green

# Set Puppeteer environment variables for Windows
$env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "false"
$env:PUPPETEER_EXECUTABLE_PATH = ""

# Create cache directory if it doesn't exist
$cacheDir = "$env:USERPROFILE\.cache\puppeteer"
if (!(Test-Path $cacheDir)) {
    New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null
}

# Set cache location
$env:XDG_CONFIG_HOME = $cacheDir
$env:XDG_CACHE_HOME = $cacheDir

# Try to find Chrome installation
$chromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chromePath = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chromePath = $path
        break
    }
}

if ($chromePath) {
    Write-Host "Found Chrome at: $chromePath" -ForegroundColor Yellow
    $env:PUPPETEER_EXECUTABLE_PATH = $chromePath
} else {
    Write-Host "Chrome not found, Puppeteer will download Chromium" -ForegroundColor Yellow
}

Write-Host "Starting development server..." -ForegroundColor Green
npm run dev