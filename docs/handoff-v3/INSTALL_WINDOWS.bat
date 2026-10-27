@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  MimaGlows Interactive Archive v3
 echo  =========================================
echo.
where py >nul 2>&1
if not errorlevel 1 (
  py -3 -u "%~dp0patch_rhine.py" %*
  goto done
)
where python >nul 2>&1
if not errorlevel 1 (
  python -u "%~dp0patch_rhine.py" %*
  goto done
)
echo [错误] 未找到 Python，请安装 Python 3.10 或更高版本。
echo https://www.python.org/downloads/windows/
:done
if errorlevel 1 (
  echo.
  echo [错误] 安装或升级未完成，请查看上方信息。
) else (
  echo.
  echo 补丁执行结束。如果成功，请进入 Rhine-Music-Demo 文件夹运行 npm ci 和 npm run dev。
)
echo.
pause
