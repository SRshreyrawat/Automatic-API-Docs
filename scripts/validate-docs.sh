#!/bin/bash

# API Documentation Validation Script
# Regenerates documentation and compares with stored version
# Detects mismatches, missing endpoints, and undocumented parameters
# Exits with error code if validation fails (for CI/CD integration)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OUTPUT_DIR="./output"
TEMP_DIR="./output/temp"
CURRENT_DOCS="$OUTPUT_DIR/current-docs.json"
NEW_DOCS="$TEMP_DIR/new-docs.json"
DIFF_REPORT="$OUTPUT_DIR/validation-report.txt"

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   API Documentation Validation Script             ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo ""

# Create directories
mkdir -p "$OUTPUT_DIR"
mkdir -p "$TEMP_DIR"

# Step 1: Regenerate documentation
echo -e "${YELLOW}[1/5]${NC} Regenerating documentation..."
if node cli/index.js scan --output "$NEW_DOCS" --no-ai 2>&1 | tee "$TEMP_DIR/scan.log"; then
    echo -e "${GREEN}✓${NC} Documentation regenerated"
else
    echo -e "${RED}✗${NC} Failed to regenerate documentation"
    exit 1
fi

# Step 2: Check if current docs exist
echo ""
echo -e "${YELLOW}[2/5]${NC} Checking for existing documentation..."
if [ ! -f "$CURRENT_DOCS" ]; then
    echo -e "${YELLOW}⚠${NC} No existing documentation found"
    echo -e "   Creating baseline from new docs..."
    cp "$NEW_DOCS" "$CURRENT_DOCS"
    echo -e "${GREEN}✓${NC} Baseline created"
    exit 0
fi
echo -e "${GREEN}✓${NC} Found existing documentation"

# Step 3: Compare documentation
echo ""
echo -e "${YELLOW}[3/5]${NC} Comparing documentation versions..."

# Initialize counters
MISSING_ENDPOINTS=0
NEW_ENDPOINTS=0
MODIFIED_ENDPOINTS=0
PARAM_MISMATCHES=0

# Parse and compare using Node.js
cat > "$TEMP_DIR/compare.js" << 'EOF'
const fs = require('fs');

const currentDocs = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
const newDocs = JSON.parse(fs.readFileSync(process.argv[3], 'utf-8'));

const results = {
    missing: [],
    new: [],
    modified: [],
    paramMismatches: []
};

// Create maps for comparison
const currentMap = new Map(
    currentDocs.map(doc => [`${doc.method}:${doc.path}`, doc])
);
const newMap = new Map(
    newDocs.map(doc => [`${doc.method}:${doc.path}`, doc])
);

// Find missing endpoints
for (const [key, doc] of currentMap) {
    if (!newMap.has(key)) {
        results.missing.push(`${doc.method} ${doc.path}`);
    }
}

// Find new endpoints
for (const [key, doc] of newMap) {
    if (!currentMap.has(key)) {
        results.new.push(`${doc.method} ${doc.path}`);
    }
}

// Find modified endpoints
for (const [key, newDoc] of newMap) {
    const currentDoc = currentMap.get(key);
    if (currentDoc) {
        // Check parameters
        const currentParams = JSON.stringify(currentDoc.parameters || []);
        const newParams = JSON.stringify(newDoc.parameters || []);
        
        if (currentParams !== newParams) {
            results.modified.push(`${newDoc.method} ${newDoc.path}`);
            results.paramMismatches.push({
                endpoint: `${newDoc.method} ${newDoc.path}`,
                current: currentDoc.parameters?.length || 0,
                new: newDoc.parameters?.length || 0
            });
        }
    }
}

console.log(JSON.stringify(results, null, 2));
EOF

# Run comparison
COMPARISON=$(node "$TEMP_DIR/compare.js" "$CURRENT_DOCS" "$NEW_DOCS")

# Extract counts
MISSING_ENDPOINTS=$(echo "$COMPARISON" | grep -o '"missing":' | wc -l)
NEW_ENDPOINTS=$(echo "$COMPARISON" | grep -c '"method":' || echo "0")

# Step 4: Generate diff report
echo ""
echo -e "${YELLOW}[4/5]${NC} Generating validation report..."

cat > "$DIFF_REPORT" << EOF
API Documentation Validation Report
Generated: $(date)
═══════════════════════════════════════════════════════

SUMMARY
-------
Missing Endpoints: $MISSING_ENDPOINTS
New Endpoints: $NEW_ENDPOINTS
Modified Endpoints: $(echo "$COMPARISON" | grep -c '"modified":' || echo "0")
Parameter Mismatches: $(echo "$COMPARISON" | grep -c '"paramMismatches":' || echo "0")

DETAILED COMPARISON
-------------------

EOF

echo "$COMPARISON" >> "$DIFF_REPORT"

# Also output to console
echo -e "${GREEN}✓${NC} Validation report generated: $DIFF_REPORT"

# Step 5: Determine validation result
echo ""
echo -e "${YELLOW}[5/5]${NC} Validation Results:"
echo ""

VALIDATION_FAILED=0

if [ "$MISSING_ENDPOINTS" -gt 0 ]; then
    echo -e "${RED}✗ FAIL:${NC} $MISSING_ENDPOINTS endpoint(s) are missing from new documentation"
    VALIDATION_FAILED=1
fi

if echo "$COMPARISON" | grep -q '"modified"'; then
    MODIFIED_COUNT=$(echo "$COMPARISON" | grep -o '"modified"' | wc -l)
    echo -e "${YELLOW}⚠ WARNING:${NC} Endpoints have been modified"
    echo "   Review the changes in $DIFF_REPORT"
fi

if echo "$COMPARISON" | grep -q '"new"'; then
    NEW_COUNT=$(echo "$COMPARISON" | grep -c '"method"' || echo "0")
    echo -e "${BLUE}ℹ INFO:${NC} New endpoints detected"
fi

echo ""
if [ $VALIDATION_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✓ VALIDATION PASSED                      ║${NC}"
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo ""
    echo "Documentation is in sync with implementation"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   ✗ VALIDATION FAILED                      ║${NC}"
    echo -e "${RED}╔════════════════════════════════════════════╗${NC}"
    echo ""
    echo "Documentation does not match implementation"
    echo "See $DIFF_REPORT for details"
    exit 1
fi
