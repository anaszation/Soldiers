@echo off
title Soldiers - Paper War 1v1
set "PATH=D:\portable softwares\nodejs;D:\portable softwares\Git\cmd;%PATH%"
cd /d "D:\antigravity projects\Soldiers"
echo ===================================================
echo   SOLDIERS - NOSTALGIC 1v1 PAPER WAR
echo   Running on Drive D (Zero C: Drive Bloat)
echo ===================================================
echo.
echo Launching game server...
start http://localhost:3000
call npm.cmd run dev
pause
