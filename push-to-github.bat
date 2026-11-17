@echo off
title Push India EV Finder to GitHub
echo =======================================================
echo Pushing to: https://github.com/Jaiaakash1125/Ev-Finder
echo =======================================================
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%LOCALAPPDATA%\Programs\Git\mingw64\bin;%PATH%"
git branch -m main
git remote set-url origin https://github.com/Jaiaakash1125/Ev-Finder.git 2>nul || git remote add origin https://github.com/Jaiaakash1125/Ev-Finder.git
git push -u origin main
echo.
pause
