@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo Installing react-quill and lucide-react...
npm install react-quill lucide-react --no-fund --no-audit
echo Done.
pause
