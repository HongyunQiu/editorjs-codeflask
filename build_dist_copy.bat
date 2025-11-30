@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
echo 开始构建...
call npm run build
set BUILD_RESULT=!ERRORLEVEL!

echo.
echo 构建完成，返回码: !BUILD_RESULT!

if !BUILD_RESULT! NEQ 0 (
    echo 构建失败！错误代码: !BUILD_RESULT!
    pause
    exit /b !BUILD_RESULT!
)

echo 构建成功，开始复制文件...
echo.

if not exist "dist\editorjs-codeflask.bundle.js" (
    echo 错误：找不到 dist\editorjs-codeflask.bundle.js 文件！
    pause
    exit /b 1
)

echo 源文件存在: dist\editorjs-codeflask.bundle.js

if not exist "..\..\QNotes\public\vendor\editorjs-codeflask" (
    echo 创建目标目录...
    mkdir "..\..\QNotes\public\vendor\editorjs-codeflask"
    set MKDIR_RESULT=!ERRORLEVEL!
    if !MKDIR_RESULT! NEQ 0 (
        echo 创建目录失败！错误代码: !MKDIR_RESULT!
        pause
        exit /b !MKDIR_RESULT!
    )
    echo 目标目录创建成功
)

echo 正在复制文件...
copy /Y "dist\editorjs-codeflask.bundle.js" "..\..\QNotes\public\vendor\editorjs-codeflask\editorjs-codeflask.bundle.js"
set COPY_RESULT=!ERRORLEVEL!

if !COPY_RESULT! EQU 0 (
    echo 文件复制成功！
) else (
    echo 文件复制失败！错误代码: !COPY_RESULT!
    pause
    exit /b !COPY_RESULT!
)

echo.
echo ========================================
echo 完成！所有操作已成功执行。
echo ========================================
pause

