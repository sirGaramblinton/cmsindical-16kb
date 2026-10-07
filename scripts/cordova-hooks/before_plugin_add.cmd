@echo off
REM Windows hook to build cordova-plugin-moodleapp before adding the plugin.
echo Building cordova-plugin-moodleapp (Windows hook)
where npx >nul 2>&1
if %errorlevel%==0 (
  npx cross-env NODE_ENV=production node cordova-plugin-moodleapp/scripts/build.js || exit /b %ERRORLEVEL%
) else (
  node cordova-plugin-moodleapp/scripts/build.js || exit /b %ERRORLEVEL%
)
exit /b 0
