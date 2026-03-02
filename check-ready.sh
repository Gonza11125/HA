#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Solar Portal - Pre-Publish Verification  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Counters
PASS=0
FAIL=0
WARN=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARN++))
}

# ==================================================
echo -e "${BLUE}📂 Directory Structure${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check addon folder
if [ -d "addon" ]; then
    check_pass "addon/ directory exists"
    
    if [ -f "addon/addon.yaml" ]; then
        check_pass "addon/addon.yaml exists"
    else
        check_fail "addon/addon.yaml missing"
    fi
    
    if [ -f "addon/Dockerfile" ]; then
        check_pass "addon/Dockerfile exists"
    else
        check_fail "addon/Dockerfile missing"
    fi
    
    if [ -f "addon/README.md" ]; then
        check_pass "addon/README.md exists"
    else
        check_fail "addon/README.md missing"
    fi
    
    if [ -f "addon/rootfs/entrypoint.sh" ]; then
        check_pass "addon/rootfs/entrypoint.sh exists"
        if [ -x "addon/rootfs/entrypoint.sh" ]; then
            check_pass "entrypoint.sh is executable"
        else
            check_warn "entrypoint.sh is NOT executable (chmod +x needed)"
        fi
    else
        check_fail "addon/rootfs/entrypoint.sh missing"
    fi
else
    check_fail "addon/ directory missing"
fi

# Check source folders
if [ -d "backend" ]; then
    check_pass "backend/ directory exists"
    if [ -f "backend/package.json" ]; then
        check_pass "backend/package.json exists"
    else
        check_fail "backend/package.json missing"
    fi
else
    check_fail "backend/ directory missing"
fi

if [ -d "frontend" ]; then
    check_pass "frontend/ directory exists"
    if [ -f "frontend/package.json" ]; then
        check_pass "frontend/package.json exists"
    else
        check_fail "frontend/package.json missing"
    fi
else
    check_fail "frontend/ directory missing"
fi

if [ -d "agent" ]; then
    check_pass "agent/ directory exists"
    if [ -f "agent/package.json" ]; then
        check_pass "agent/package.json exists"
    else
        check_fail "agent/package.json missing"
    fi
else
    check_fail "agent/ directory missing"
fi

# ==================================================
echo ""
echo -e "${BLUE}📋 Configuration Files${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check addon.yaml
if [ -f "addon/addon.yaml" ]; then
    if grep -q "name: Solar Portal" addon/addon.yaml; then
        check_pass "addon.yaml has name field"
    else
        check_fail "addon.yaml missing name field"
    fi
    
    if grep -q "slug: solar_portal" addon/addon.yaml; then
        check_pass "addon.yaml has slug field"
    else
        check_fail "addon.yaml missing slug field"
    fi
    
    if grep -q "version:" addon/addon.yaml; then
        check_pass "addon.yaml has version field"
    else
        check_fail "addon.yaml missing version field"
    fi
    
    if grep -q "startup: application" addon/addon.yaml; then
        check_pass "addon.yaml has startup: application"
    else
        check_fail "addon.yaml missing startup field"
    fi
    
    if grep -q "arch:" addon/addon.yaml; then
        if grep -q "aarch64" addon/addon.yaml && grep -q "armhf" addon/addon.yaml; then
            check_pass "addon.yaml lists multiple architectures"
        else
            check_warn "addon.yaml may be missing some architectures"
        fi
    else
        check_fail "addon.yaml missing arch field"
    fi
fi

# Check Dockerfile
if [ -f "addon/Dockerfile" ]; then
    if grep -q "FROM ghcr.io/hassio-addons/base" addon/Dockerfile; then
        check_pass "Dockerfile uses HA base image"
    else
        check_warn "Dockerfile not using official HA base image"
    fi
    
    if grep -q "npm run build" addon/Dockerfile; then
        check_pass "Dockerfile builds source code"
    else
        check_fail "Dockerfile doesn't build source code"
    fi
    
    if grep -q "COPY backend" addon/Dockerfile && grep -q "COPY frontend" addon/Dockerfile; then
        check_pass "Dockerfile copies backend and frontend"
    else
        check_fail "Dockerfile missing COPY commands"
    fi
fi

# ==================================================
echo ""
echo -e "${BLUE}🔧 Build Scripts${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check package.json scripts
for dir in backend frontend agent; do
    if [ -f "$dir/package.json" ]; then
        if grep -q '"build"' "$dir/package.json"; then
            check_pass "$dir/package.json has build script"
        else
            check_warn "$dir/package.json missing build script"
        fi
        
        if grep -q '"start"' "$dir/package.json"; then
            check_pass "$dir/package.json has start script"
        else
            check_warn "$dir/package.json missing start script"
        fi
    fi
done

# ==================================================
echo ""
echo -e "${BLUE}🔐 Security & Git${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f ".gitignore" ]; then
    check_pass ".gitignore exists"
    
    if grep -q "node_modules" .gitignore; then
        check_pass ".gitignore excludes node_modules"
    else
        check_fail ".gitignore should exclude node_modules"
    fi
    
    if grep -q "\.env" .gitignore; then
        check_pass ".gitignore excludes .env files"
    else
        check_fail ".gitignore should exclude .env files"
    fi
else
    check_warn ".gitignore missing"
fi

if [ -d ".git" ]; then
    check_pass "Git repository initialized"
    
    if git remote get-url origin &>/dev/null; then
        check_pass "Git has remote (GitHub) configured"
    else
        check_warn "No git remote configured (run: git remote add origin ...)"
    fi
else
    check_warn "Not a git repository (run: git init)"
fi

# ==================================================
echo ""
echo -e "${BLUE}📚 Documentation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docs=(
    "PUBLISH_QUICK_START.md"
    "PUBLISHING_CHECKLIST.md"
    "DISTRIBUTION_GUIDE.md" 
    "PACKAGE_SUMMARY.md"
    "addon/INSTALL.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        check_pass "$doc exists"
    else
        check_warn "$doc missing (Would be helpful)"
    fi
done

# ==================================================
echo ""
echo -e "${BLUE}🤖 GitHub Actions${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f ".github/workflows/build.yaml" ]; then
    check_pass ".github/workflows/build.yaml exists"
    
    if grep -q "on:" .github/workflows/build.yaml; then
        check_pass "Workflow has trigger configuration"
    else
        check_fail "Workflow missing trigger"
    fi
else
    check_warn ".github/workflows/build.yaml missing (CI/CD won't work)"
fi

# ==================================================
echo ""
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo ""
echo "RESULTS:"
echo -e "  ${GREEN}✅ Pass:   $PASS${NC}"
if [ $WARN -gt 0 ]; then
    echo -e "  ${YELLOW}⚠️  Warn:   $WARN${NC}"
fi
if [ $FAIL -gt 0 ]; then
    echo -e "  ${RED}❌ Fail:   $FAIL${NC}"
fi
echo ""

# Recommendations
if [ $FAIL -eq 0 ] && [ $WARN -lt 3 ]; then
    echo -e "${GREEN}✅ You're ready to publish!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Fix any warnings above (if needed)"
    echo "2. Push to GitHub: git push origin main"
    echo "3. Submit to Home Assistant Add-on Store"
    echo ""
    echo "See PUBLISH_QUICK_START.md for details"
elif [ $FAIL -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Almost ready!${NC}"
    echo ""
    echo "Please fix the warnings above, then:"
    echo "1. git push origin main"
    echo "2. Submit to Add-on Store"
else
    echo -e "${RED}❌ Please fix the errors above${NC}"
    echo ""
    echo "Failed items:"
    echo "1. Check addon/ folder structure"
    echo "2. Verify .yaml and Dockerfile syntax"
    echo "3. See PUBLISHING_CHECKLIST.md for details"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════${NC}"

# Exit code
[ $FAIL -eq 0 ] && exit 0 || exit 1
