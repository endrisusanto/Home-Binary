@echo off
title QuickBuild Playwright Standalone Tester
echo ======================================================
echo   Running QuickBuild Playwright Standalone Tester
echo ======================================================
echo.

node engine/standalone-test.mjs %*

pause
