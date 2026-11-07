@echo off
setlocal EnableDelayedExpansion

REM QUANTEDGE - pull the latest commit from the remote branch, then launch.
REM Use this to make sure you are running the newest version of the terminal.

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  QUANTEDGE - Update And Launch
echo  =============================
echo  Repo: %ROOT%
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo WARNING: Git is not installed - cannot auto-update.
  echo Falling back to launching whatever is in this folder.
  echo Install Git from https://git-scm.com/download/win and run this again to update.
  echo.
  goto :launch
)

if not exist "%ROOT%\.git" (
  echo WARNING: This folder is not a git checkout - cannot auto-update.
  echo Launching whatever is here.
  echo.
  goto :launch
)

cd /d "%ROOT%"

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "BRANCH=%%b"
if not defined BRANCH set "BRANCH=HEAD"

echo Current branch: %BRANCH%
echo Fetching from origin...
git fetch --prune origin 2>nul

if /I "%BRANCH%"=="HEAD" (
  echo In detached HEAD state - skipping fast-forward.
) else (
  for /f "delims=" %%r in ('git rev-parse --verify --quiet "origin/%BRANCH%" 2^>nul') do set "REMOTE_EXISTS=%%r"
  if defined REMOTE_EXISTS (
    for /f "delims=" %%a in ('git rev-parse HEAD') do set "BEFORE=%%a"
    git merge --ff-only "origin/%BRANCH%" >nul 2>&1
    if errorlevel 1 (
      echo WARNING: Cannot fast-forward %BRANCH% to origin/%BRANCH%.
      echo You may have local commits or uncommitted changes.
      echo Launching current checkout anyway.
    ) else (
      for /f "delims=" %%a in ('git rev-parse HEAD') do set "AFTER=%%a"
      if "!BEFORE!"=="!AFTER!" (
        echo Already up to date.
      ) else (
        echo Updated: !BEFORE:~0,7! -^> !AFTER:~0,7!
        REM If package.json changed, the launcher's npm install check will handle reinstall.
      )
    )
  ) else (
    echo WARNING: No remote branch origin/%BRANCH% - skipping fast-forward.
  )
)

echo.
:launch
call "%ROOT%\Launch-QuantEdge.bat"
exit /b %ERRORLEVEL%
