@echo off
setlocal

cd /d "%~dp0"

docker info >nul 2>&1
if not errorlevel 1 goto dockerReady

echo Docker Desktop is not running. Starting it...
if not exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    echo Docker Desktop was not found. Please install or start it manually.
    pause
    exit /b 1
)

start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
set /a attempts=0

:waitForDocker
set /a attempts+=1
if %attempts% geq 60 (
    echo Docker Desktop did not become ready in time. Please check its status.
    pause
    exit /b 1
)

timeout /t 2 /nobreak >nul
docker info >nul 2>&1
if errorlevel 1 goto waitForDocker

:dockerReady
echo Starting PostgreSQL...
docker compose up -d
if errorlevel 1 (
    echo PostgreSQL failed to start. Check Docker Desktop and port 5432.
    pause
    exit /b 1
)

echo Starting the MemeSeek development environment...
start "MemeSeek Dev" /d "%~dp0" cmd /k pnpm dev

timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"

endlocal
