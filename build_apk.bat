@echo off
title Build APK Coolblue Second Chance
cd /d "%~dp0"

set NOPAUSE=0
if "%1"=="/nopause" set NOPAUSE=1

echo ========================================
echo   Compilation APK - Coolblue Second Chance
echo ========================================
echo.

REM 1) Copier les derniers fichiers web dans les assets Android
echo [1/3] Copie des assets...
copy /y index.html android\app\src\main\assets\ >nul
copy /y app.js android\app\src\main\assets\ >nul
copy /y scraper.js android\app\src\main\assets\ >nul
copy /y categories.json android\app\src\main\assets\ >nul
copy /y brands.json android\app\src\main\assets\ >nul
copy /y second_chance_offers.json android\app\src\main\assets\ >nul
copy /y sw.js android\app\src\main\assets\ >nul
copy /y manifest.webmanifest android\app\src\main\assets\ >nul
if not exist android\app\src\main\assets\icons mkdir android\app\src\main\assets\icons
xcopy /y /d icons\*.png android\app\src\main\assets\icons\ >nul

REM 2) Compiler l'APK release signe
echo [2/3] Compilation Gradle (premier lancement : plusieurs minutes)...
set JAVA_HOME=C:\android-build\jdk17\jdk-17.0.20+8
set ANDROID_HOME=C:\android-build\sdk
call C:\android-build\gradle\gradle-8.7\bin\gradle.bat -p android assembleRelease

if errorlevel 1 (
    echo.
    echo [ERREUR] La compilation a echoue.
    if "%NOPAUSE%"=="1" exit /b 1
    pause
    exit /b 1
)

REM 3) Copier l'APK final a la racine du projet
echo [3/3] Copie de l'APK final...
copy /y android\app\build\outputs\apk\release\app-release.apk coolblue-second-chance.apk >nul

echo.
echo ========================================
echo  OK ! APK genere : coolblue-second-chance.apk
echo  Transferez-le sur votre telephone puis installez-le.
echo ========================================
if "%NOPAUSE%"=="1" exit /b 0
pause

