@echo off
REM Synchroniser le projet OpenCode avec Github depuis mon travail
git status
git add .
git commit -m "Synchronization to GitHub"
git push origin main
if %ERRORLEVEL% EQU 0 (
    echo Succes: Projet synchronise avec Github
) else (
    echo Erreur lors de la synchronisation
)
pause