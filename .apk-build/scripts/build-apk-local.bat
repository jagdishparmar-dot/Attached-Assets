@echo off
setlocal
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmake\3.22.1\bin;%PATH%"

cd /d "%~dp0..\..\..\artifacts\mobile\android"
call gradlew.bat assembleRelease --no-daemon
if errorlevel 1 exit /b 1

for %%F in (app\build\outputs\apk\release\*.apk) do (
  echo.
  echo APK built: %CD%\%%F
)
