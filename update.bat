@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo --- جاري رفع التحديثات إلى GitHub ---
git add .
set msg=Update %date% %time%
git commit -m "%msg%"
git push origin main
if %errorlevel% neq 0 (
    echo [ERROR] حدث خطأ أثناء الرفع. تأكد من اتصال الإنترنت أو إعدادات Git.
) else (
    echo [SUCCESS] تم الرفع بنجاح!
)
pause
