@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo Uninstalling react-quill...
npm uninstall react-quill --legacy-peer-deps
echo Installing Tiptap core and extensions...
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link --legacy-peer-deps
echo Done.
pause
