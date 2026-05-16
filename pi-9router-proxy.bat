@echo off
REM Pi ↔ 9Router Sanitizing Proxy Launcher
REM 
REM This proxy strips non-standard 'reasoning' fields from messages
REM before forwarding to 9Router, fixing 400 validation errors.
REM
REM Usage:
REM   pi-9router-proxy.bat [PORT] [TARGET_URL]
REM
REM Examples:
REM   pi-9router-proxy.bat                    (uses defaults: 20129 -> localhost:20128)
REM   pi-9router-proxy.bat 20129              (custom proxy port)
REM   pi-9router-proxy.bat 20129 http://9router.local:20128  (custom target)

echo.
echo ===========================================
echo   Pi ↔ 9Router Sanitizing Proxy
echo ===========================================
echo.

if "%~1"=="" (
    echo Starting proxy on port 20129 -^> localhost:20128
    node "%~dp0pi-9router-proxy.js"
) else if "%~2"=="" (
    echo Starting proxy on port %1 -^> localhost:20128
    node "%~dp0pi-9router-proxy.js" %1
) else (
    echo Starting proxy on port %1 -^> %2
    node "%~dp0pi-9router-proxy.js" %1 %2
)
