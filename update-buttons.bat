@echo off
echo Updating floating buttons in all HTML files...
echo.

set "files=index.html pages/contact.html pages/faq.html pages/privacy.html pages/supported-sites.html pages/terms.html"

for %%f in (%files%) do (
    if exist "%%f" (
        echo Processing: %%f
        powershell -Command "(Get-Content '%%f') -replace '<!--\s*Floating contact button[\s\S]*?</button>\s*', '    <!-- Floating button will be added here by main.js -->' | Set-Content '%%f' -Encoding UTF8"
        if errorlevel 1 (
            echo Error updating %%f
        ) else (
            echo Successfully updated %%f
        )
    ) else (
        echo File not found: %%f
    )
    echo.
)

echo Update complete!
pause
