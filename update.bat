@echo off
cd /d "%~dp0"

echo --- Starting GitHub Update ---

echo 1. Adding files...
git add .

echo 2. Committing changes...
git commit -m "Auto Update"

echo 3. Pushing to GitHub...
git push origin main

if %errorlevel% neq 0 (
    echo [ERROR] An error occurred! Please check your connection or Git setup.
) else (
    echo [SUCCESS] Upload completed successfully!
)

pause
