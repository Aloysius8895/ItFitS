@echo off
cd /d "%~dp0"
copy /b "ItFitS_Data_Package.zip.001"+"ItFitS_Data_Package.zip.002"+"ItFitS_Data_Package.zip.003" "ItFitS_Data_Package.zip"
if errorlevel 1 (echo Merge failed. Please download all 3 parts. & pause & exit /b 1)
echo Done. Extract ItFitS_Data_Package.zip to a folder.
pause
