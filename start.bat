@echo off
title Coolblue Second Chance App
cd /d "%~dp0"

echo ========================================
echo   Coolblue Second Chance
echo ========================================
echo.
echo  Mise a jour des offres : utilisez le bouton
echo  "Mise a jour" dans l'interface, ou : python scraper.py
echo.

echo Demarrage du serveur sur http://localhost:8000
python server.py
