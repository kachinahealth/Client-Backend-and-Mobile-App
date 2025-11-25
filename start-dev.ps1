# KachinaHealth Development Startup Script (Windows/PowerShell)
# This script helps start both the backend and frontend servers

Write-Host "🚀 Starting KachinaHealth Client Portal..." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Yellow

# Get the current directory (should be project root)
$projectRoot = Get-Location
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "Client-Backend-and-Mobile-App-master\admin-dashboard"

Write-Host "Project root: $projectRoot" -ForegroundColor Cyan
Write-Host "Backend path: $backendPath" -ForegroundColor Cyan
Write-Host "Frontend path: $frontendPath" -ForegroundColor Cyan
Write-Host ""

# Check if backend directory exists
if (!(Test-Path $backendPath)) {
    Write-Host "❌ Backend directory not found at: $backendPath" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

# Check if frontend directory exists
if (!(Test-Path $frontendPath)) {
    Write-Host "❌ Frontend directory not found at: $frontendPath" -ForegroundColor Red
    Write-Host "Please ensure the project structure is correct." -ForegroundColor Red
    exit 1
}

# Check if .env file exists in backend
$envFile = Join-Path $backendPath ".env"
if (Test-Path $envFile) {
    Write-Host "✅ Found .env file in backend directory with database credentials configured" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: .env file not found in backend directory" -ForegroundColor Yellow
    Write-Host "Please ensure a .env file exists with your Supabase credentials." -ForegroundColor Yellow
    Write-Host "See README.md for environment variable setup." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "🔧 Starting Backend Server..." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Yellow

# Start backend server in background
$backendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    & npm start
} -ArgumentList $backendPath

Write-Host "✅ Backend server starting..." -ForegroundColor Green
Write-Host "📍 Backend will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "💚 Health check: http://localhost:5000/health" -ForegroundColor Cyan

Write-Host ""
Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Yellow

# Start frontend server in background
$frontendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    & npm run dev
} -ArgumentList $frontendPath

Write-Host "✅ Frontend server starting..." -ForegroundColor Green
Write-Host "📍 Frontend will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🏠 Dashboard: http://localhost:3000/clienthome.html" -ForegroundColor Cyan

Write-Host ""
Write-Host "⏳ Waiting for servers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "🎉 Development servers are starting!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "📱 Access your application:" -ForegroundColor White
Write-Host "   • Login Page:    http://localhost:3000" -ForegroundColor Cyan
Write-Host "   • Dashboard:     http://localhost:3000/clienthome.html" -ForegroundColor Cyan
Write-Host "   • API Health:    http://localhost:5000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "🛑 To stop the servers, close this PowerShell window or press Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Test credentials (from sample data):" -ForegroundColor White
Write-Host "   • Admin: admin@kachinahealth.com" -ForegroundColor Gray
Write-Host "   • Manager: john.smith@hospital1.com" -ForegroundColor Gray
Write-Host "   • User: sarah.johnson@hospital2.com" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Setup complete! Both servers should be running now." -ForegroundColor Green

# Keep the script running to show job status
Write-Host ""
Write-Host "🔍 Server status:" -ForegroundColor Yellow
while ($true) {
    $backendStatus = Get-Job -Id $backendJob.Id | Select-Object -ExpandProperty State
    $frontendStatus = Get-Job -Id $frontendJob.Id | Select-Object -ExpandProperty State

    Write-Host "   Backend:  $backendStatus    Frontend: $frontendStatus" -ForegroundColor Gray
    Start-Sleep -Seconds 2
}
