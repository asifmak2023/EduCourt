@echo off
title EduCourt Development Servers
cd /d C:\EduCourt

echo Starting Laravel API...
start "EduCourt API" cmd /k "php apps\api\artisan serve --host=127.0.0.1 --port=8000"

echo Starting Next.js Web...
start "EduCourt Web" cmd /k "cd /d C:\EduCourt\apps\web && npm run dev"

echo Starting Mobile App...
start "EduCourt Mobile" cmd /k "cd /d C:\EduCourt\apps\mobile && npm run start"

echo.
echo All EduCourt services started.
pause