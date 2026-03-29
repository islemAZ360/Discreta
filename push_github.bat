@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo Initializing Git...
git init
echo Setting remote origin...
git remote add origin https://github.com/islemAZ360/-.git 2>nul
if %errorlevel% neq 0 (
    git remote set-url origin https://github.com/islemAZ360/-.git
)
echo Adding files...
git add .
echo Committing...
git commit -m "Initialize and secure Firebase configuration for Vercel deployment"
echo Renaming branch to main...
git branch -M main
echo Pushing to GitHub...
git push -u origin main
echo Done.
pause
