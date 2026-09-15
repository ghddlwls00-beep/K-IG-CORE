@echo off
chcp 65001 > nul
title K-IG 고객 기록 백업

echo.
echo  ===============================================
echo   K-IG 고객 기록 백업
echo  ===============================================
echo.
echo  이용권 등록 기록과 학습 진도를 안전한 곳에 복사합니다.
echo.

cd /d "%~dp0"

REM OneDrive 안에 넣으면 컴퓨터가 고장나도 인터넷에 사본이 남습니다.
REM 그래서 OneDrive 가 있으면 거기를 1순위로 씁니다.
REM (D 드라이브 외장하드는 꽂혀 있을 때만 쓰이므로 2순위)
set "TARGET=%~dp0..\kig-backups"
if exist "D:\" set "TARGET=D:\kig-backup"
if exist "%OneDrive%" set "TARGET=%OneDrive%\KIG-백업"

echo  저장 위치: %TARGET%
echo.

node scripts\backup-license-data.mjs --out "%TARGET%"
if errorlevel 1 goto failed

REM 폴더는 메일이나 메신저로 보낼 수 없으므로 최신 백업을 파일 하나로
REM 묶어 둡니다. OneDrive 를 쓰면 굳이 보낼 필요는 없지만, 사본을 한 곳 더
REM 두고 싶을 때 이 파일만 첨부하면 됩니다.
echo.
echo  파일 하나로 압축하는 중...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$t='%TARGET%';" ^
  "$last=Get-ChildItem $t -Directory ^| Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}' } ^| Sort-Object Name ^| Select-Object -Last 1;" ^
  "if($last){ $zip=Join-Path $t ('KIG_고객기록_'+$last.Name+'.zip');" ^
  "Compress-Archive -Path $last.FullName -DestinationPath $zip -Force;" ^
  "Write-Host ('  압축 완료: '+$zip) } else { Write-Host '  압축할 백업이 없습니다' }"

echo.
echo  ===============================================
echo   백업이 정상적으로 끝났습니다.
echo  ===============================================
echo.
if exist "%OneDrive%" (
  echo   OneDrive 폴더에 저장했으므로 잠시 후 자동으로
  echo   인터넷에 올라갑니다. 따로 하실 일은 없습니다.
) else (
  echo   위에 표시된 .zip 파일을 본인 메일이나 카카오톡으로
  echo   보내두시면 사본이 하나 더 생깁니다.
)
echo.
echo  폴더를 열려면 아무 키나 누르세요.
pause > nul
explorer "%TARGET%"
goto end

:failed
echo.
echo  ***********************************************
echo   백업에 실패했습니다. 위 메시지를 확인하세요.
echo  ***********************************************
echo.
echo  창을 닫으려면 아무 키나 누르세요.
pause > nul

:end
