@echo off
REM Retélécharger le projet sur un autre PC de la maison

REM Demander si le projet est déjà initialisé avec git
if not exist .git (
    echo Le projet n'est pas initialise avec Git. Initialisation...
    git init
)

REM Ajouter le remote GitHub (remplacez par votre URL GitHub)
git remote add github https://github.com/Goodge009/coolblue-second-chance-app.git 2>nul

REM Récupérer les derniers changements depuis Github
echo Telechargement des dernieres modifications depuis Github...
git fetch origin
git reset --hard origin/main

REM Demander si l'utilisateur veut faire un pull au lieu de reset
set /p confirm="Voulez-vous faire un 'git pull' au lieu d'un reset? (O/N): "
if /i "%confirm%"=="o" (
    git pull origin main
) else (
    echo Projet telecharge avec succes!
)

pause