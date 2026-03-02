# Solar Portal - Pre-Publish Verification (PowerShell)
# Usage: .\check-ready.ps1

$pass = 0
$fail = 0
$warn = 0

function Test-Pass {
    param([string]$message)
    Write-Host "[OK] $message" -ForegroundColor Green
    $global:pass++
}

function Test-Fail {
    param([string]$message)
    Write-Host "[FAIL] $message" -ForegroundColor Red
    $global:fail++
}

function Test-Warn {
    param([string]$message)
    Write-Host "[WARN] $message" -ForegroundColor Yellow
    $global:warn++
}

# Header
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Solar Portal - Pre-Publish Check" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# ==================================================
Write-Host "Directory Structure" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

if (Test-Path "addon") {
    Test-Pass "addon/ directory exists"
    
    if (Test-Path "addon/addon.yaml") {
        Test-Pass "addon/addon.yaml exists"
    } else {
        Test-Fail "addon/addon.yaml missing"
    }
    
    if (Test-Path "addon/Dockerfile") {
        Test-Pass "addon/Dockerfile exists"
    } else {
        Test-Fail "addon/Dockerfile missing"
    }
    
    if (Test-Path "addon/README.md") {
        Test-Pass "addon/README.md exists"
    } else {
        Test-Fail "addon/README.md missing"
    }
    
    if (Test-Path "addon/rootfs/entrypoint.sh") {
        Test-Pass "addon/rootfs/entrypoint.sh exists"
    } else {
        Test-Fail "addon/rootfs/entrypoint.sh missing"
    }
} else {
    Test-Fail "addon/ directory missing"
}

# Check source folders
if (Test-Path "backend") {
    Test-Pass "backend/ directory exists"
    if (Test-Path "backend/package.json") {
        Test-Pass "backend/package.json exists"
    } else {
        Test-Fail "backend/package.json missing"
    }
} else {
    Test-Fail "backend/ directory missing"
}

if (Test-Path "frontend") {
    Test-Pass "frontend/ directory exists"
    if (Test-Path "frontend/package.json") {
        Test-Pass "frontend/package.json exists"
    } else {
        Test-Fail "frontend/package.json missing"
    }
} else {
    Test-Fail "frontend/ directory missing"
}

if (Test-Path "agent") {
    Test-Pass "agent/ directory exists"
    if (Test-Path "agent/package.json") {
        Test-Pass "agent/package.json exists"
    } else {
        Test-Fail "agent/package.json missing"
    }
} else {
    Test-Fail "agent/ directory missing"
}

# ==================================================
Write-Host ""
Write-Host "📋 Configuration Files" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if (Test-Path "addon/addon.yaml") {
    $content = Get-Content "addon/addon.yaml" -Raw
    
    if ($content -match "name: Solar Portal") {
        Test-Pass "addon.yaml has name field"
    } else {
        Test-Fail "addon.yaml missing name field"
    }
    
    if ($content -match "slug: solar_portal") {
        Test-Pass "addon.yaml has slug field"
    } else {
        Test-Fail "addon.yaml missing slug field"
    }
    
    if ($content -match "version:") {
        Test-Pass "addon.yaml has version field"
    } else {
        Test-Fail "addon.yaml missing version field"
    }
    
    if ($content -match "startup: application") {
        Test-Pass "addon.yaml has startup: application"
    } else {
        Test-Fail "addon.yaml missing startup field"
    }
    
    if ($content -match "arch:") {
        if ($content -match "aarch64" -and $content -match "armhf") {
            Test-Pass "addon.yaml lists multiple architectures"
        } else {
            Test-Warn "addon.yaml may be missing some architectures"
        }
    } else {
        Test-Fail "addon.yaml missing arch field"
    }
}

if (Test-Path "addon/Dockerfile") {
    $content = Get-Content "addon/Dockerfile" -Raw
    
    if ($content -match "FROM ghcr.io/hassio-addons/base") {
        Test-Pass "Dockerfile uses HA base image"
    } else {
        Test-Warn "Dockerfile not using official HA base image"
    }
    
    if ($content -match "npm run build") {
        Test-Pass "Dockerfile builds source code"
    } else {
        Test-Fail "Dockerfile doesn't build source code"
    }
    
    if ($content -match "COPY backend" -and $content -match "COPY frontend") {
        Test-Pass "Dockerfile copies backend and frontend"
    } else {
        Test-Fail "Dockerfile missing COPY commands"
    }
}

# ==================================================
Write-Host ""
Write-Host "🔧 Build Scripts" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$dirs = @("backend", "frontend", "agent")
foreach ($dir in $dirs) {
    if (Test-Path "$dir/package.json") {
        $content = Get-Content "$dir/package.json" -Raw
        
        if ($content -match '"build"') {
            Test-Pass "$dir/package.json has build script"
        } else {
            Test-Warn "$dir/package.json missing build script"
        }
        
        if ($content -match '"start"') {
            Test-Pass "$dir/package.json has start script"
        } else {
            Test-Warn "$dir/package.json missing start script"
        }
    }
}

# ==================================================
Write-Host ""
Write-Host "🔐 Security & Git" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if (Test-Path ".gitignore") {
    Test-Pass ".gitignore exists"
    $content = Get-Content ".gitignore" -Raw
    
    if ($content -match "node_modules") {
        Test-Pass ".gitignore excludes node_modules"
    } else {
        Test-Fail ".gitignore should exclude node_modules"
    }
    
    if ($content -match "\.env") {
        Test-Pass ".gitignore excludes .env files"
    } else {
        Test-Fail ".gitignore should exclude .env files"
    }
} else {
    Test-Warn ".gitignore missing"
}

if (Test-Path ".git") {
    Test-Pass "Git repository initialized"
} else {
    Test-Warn "Not a git repository (run: git init)"
}

# ==================================================
Write-Host ""
Write-Host "📚 Documentation" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$docs = @(
    "PUBLISH_QUICK_START.md",
    "PUBLISHING_CHECKLIST.md",
    "DISTRIBUTION_GUIDE.md",
    "PACKAGE_SUMMARY.md",
    "addon/INSTALL.md"
)

foreach ($doc in $docs) {
    if (Test-Path $doc) {
        Test-Pass "$doc exists"
    } else {
        Test-Warn "$doc missing (Would be helpful)"
    }
}

# ==================================================
Write-Host ""
Write-Host "🤖 GitHub Actions" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if (Test-Path ".github/workflows/build.yaml") {
    Test-Pass ".github/workflows/build.yaml exists"
    $content = Get-Content ".github/workflows/build.yaml" -Raw
    
    if ($content -match "on:") {
        Test-Pass "Workflow has trigger configuration"
    } else {
        Test-Fail "Workflow missing trigger"
    }
} else {
    Test-Warn ".github/workflows/build.yaml missing (CI/CD won't work)"
}

# ==================================================
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "RESULTS:" -ForegroundColor Cyan
Write-Host "  Pass:   $pass" -ForegroundColor Green
if ($warn -gt 0) {
    Write-Host "  Warn:   $warn" -ForegroundColor Yellow
}
if ($fail -gt 0) {
    Write-Host "  Fail:   $fail" -ForegroundColor Red
}
Write-Host ""

# Recommendations
if ($fail -eq 0 -and $warn -lt 3) {
    Write-Host "You are ready to publish!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Fix any warnings above (if needed)"
    Write-Host "2. Push to GitHub: git push origin main"
    Write-Host "3. Submit to Home Assistant Add-on Store"
    Write-Host ""
    Write-Host "See PUBLISH_QUICK_START.md for details"
} elseif ($fail -eq 0) {
    Write-Host "Almost ready!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please fix the warnings above, then:"
    Write-Host "1. git push origin main"
    Write-Host "2. Submit to Add-on Store"
} else {
    Write-Host "Please fix the errors above" -ForegroundColor Red
    Write-Host ""
    Write-Host "Failed items:"
    Write-Host "1. Check addon/ folder structure"
    Write-Host "2. Verify .yaml and Dockerfile syntax"
    Write-Host "3. See PUBLISHING_CHECKLIST.md for details"
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
