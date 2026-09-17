@echo off
REM Synchroniser le projet OpenCode avec Github depuis mon travail

set NOPAUSE=0
if "%1"=="/nopause" set NOPAUSE=1

REM Configurer l'URL GitHub si ce n'est pas deja fait
git remote add github https://github.com/Goodge009/coolblue-second-chance-app.git 2>nul || git remote set-url github https://github.com/Goodge009/coolblue-second-chance-app.git

REM Verifier que le remote est correct
echo URL GitHub configuree: %git config --get remote.github.url%

git status
git add .
git commit -m "Synchronization to GitHub"
git push github main
if %ERRORLEVEL% EQU 0 (
    echo Succes: Projet synchronise avec Github
) else (
    echo Erreur lors de la synchronisation
)
if "%NOPAUSE%"=="1" exit /b %ERRORLEVEL%
pause