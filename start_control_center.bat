@echo off
set "PORT=4100"
set "HOST=127.0.0.1"
set "NODE_ENV=production"
set "PATH=C:\Program Files\Git\bin;C:\Users\khoid\AppData\Local\Android\Sdk\platform-tools;%PATH%"
cd /d "%~dp0"
echo [FNMF Control Center] Starting on http://127.0.0.1:4100...
node server/index.js
