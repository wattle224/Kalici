@echo off
setlocal EnableDelayedExpansion

REM QUANTEDGE - pull the latest commit, ensure frontend branch, then launch.

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "LOG=%ROOT%\quantedge-update.log"

echo.
echo  QUANTEDGE - Update And Launch
echo  =============================
echo  Repo: %ROOT%
echo  Log:  %LOG%
echo.
> "%LOG%" echo QUANTEDGE update %DATE% %TIME%
>>"%LOG%" echo ROOT=%ROOT%

where git >nul 2>&1
if errorlevel 1 (
  echo WARNING: Git is not installed - cannot auto-update.
  echo Falling back to launching whatever is in this folder.
  echo Install Git from https://git-scm.com/download/win
  >>"%LOG%" echo WARNING: git missing
  echo.
  goto :launch
)

if not exist "%ROOT%\.git" (
  echo WARNING: This folder is not a git checkout - cannot auto-update.
  echo Launching whatever is here.
  >>"%LOG%" echo WARNING: not a git repo
  echo.
  goto :launch
)

cd /d "%ROOT%"

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "BRANCH=%%b"
if not defined BRANCH set "BRANCH=HEAD"
echo Current branch: %BRANCH%
>>"%LOG%" echo BRANCH=%BRANCH%

echo Fetching from origin...
git fetch --prune origin >>"%LOG%" 2>&1

REM Prefer the QUANTEDGE frontend branch when quantedge/ is missing or we are on main.
set "NEED_QE_BRANCH=0"
if not exist "%ROOT%\quantedge\package.json" set "NEED_QE_BRANCH=1"
if /I "%BRANCH%"=="main" set "NEED_QE_BRANCH=1"
if /I "%BRANCH%"=="master" set "NEED_QE_BRANCH=1"

if "%NEED_QE_BRANCH%"=="1" (
  echo Ensuring branch cursor/quantedge-frontend-6388 ...
  >>"%LOG%" echo checking out cursor/quantedge-frontend-6388
  git checkout cursor/quantedge-frontend-6388 >>"%LOG%" 2>&1
  if errorlevel 1 (
    git checkout -B cursor/quantedge-frontend-6388 origin/cursor/quantedge-frontend-6388 >>"%LOG%" 2>&1
  )
  for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "BRANCH=%%b"
  echo Now on: !BRANCH!
)

if /I "%BRANCH%"=="HEAD" (
  echo In detached HEAD state - skipping fast-forward.
) else (
  for /f "delims=" %%r in ('git rev-parse --verify --quiet "origin/%BRANCH%" 2^>nul') do set "REMOTE_EXISTS=%%r"
  if defined REMOTE_EXISTS (
    for /f "delims=" %%a in ('git rev-parse HEAD') do set "BEFORE=%%a"
    git merge --ff-only "origin/%BRANCH%" >>"%LOG%" 2>&1
    if errorlevel 1 (
      echo WARNING: Cannot fast-forward %BRANCH%. Launching current checkout anyway.
      echo You may have local changes — see %LOG%
      >>"%LOG%" echo WARNING: ff-only failed
    ) else (
      for /f "delims=" %%a in ('git rev-parse HEAD') do set "AFTER=%%a"
      if "!BEFORE!"=="!AFTER!" (
        echo Already up to date.
      ) else (
        echo Updated: !BEFORE:~0,7! -^> !AFTER:~0,7!
      )
    )
  ) else (
    echo WARNING: No remote branch origin/%BRANCH% - skipping fast-forward.
  )
)

if not exist "%ROOT%\Launch-QuantEdge.bat" (
  echo ERROR: Launch-QuantEdge.bat missing after update.
  echo Repo path may be wrong. Re-run Install-QuantEdge-Shortcut.bat from the Kalici repo.
  >>"%LOG%" echo ERROR: Launch-QuantEdge.bat missing
  pause
  exit /b 1
)

echo.
:launch
call "%ROOT%\Launch-QuantEdge.bat"
set "RC=%ERRORLEVEL%"
>>"%LOG%" echo launch exit=%RC%
exit /b %RC%
