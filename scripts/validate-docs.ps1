# API Documentation Validation Script (PowerShell)
# Windows-compatible version of validate-docs.sh

param(
    [string]$OutputDir = ".\output",
    [string]$TempDir = ".\output\temp"
)

# Colors
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor $Blue
Write-Host "║   API Documentation Validation Script             ║" -ForegroundColor $Blue
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor $Blue
Write-Host ""

# Configuration
$CurrentDocs = Join-Path $OutputDir "current-docs.json"
$NewDocs = Join-Path $TempDir "new-docs.json"
$DiffReport = Join-Path $OutputDir "validation-report.txt"

# Create directories
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

# Step 1: Regenerate documentation
Write-Host "[1/5] Regenerating documentation..." -ForegroundColor $Yellow

try {
    $scanOutput = node cli/index.js scan --output $NewDocs --no-ai 2>&1
    Write-Host "✓ Documentation regenerated" -ForegroundColor $Green
} catch {
    Write-Host "✗ Failed to regenerate documentation" -ForegroundColor $Red
    Write-Host $_.Exception.Message -ForegroundColor $Red
    exit 1
}

# Step 2: Check if current docs exist
Write-Host ""
Write-Host "[2/5] Checking for existing documentation..." -ForegroundColor $Yellow

if (-not (Test-Path $CurrentDocs)) {
    Write-Host "⚠ No existing documentation found" -ForegroundColor $Yellow
    Write-Host "  Creating baseline from new docs..." -ForegroundColor $Yellow
    Copy-Item $NewDocs $CurrentDocs
    Write-Host "✓ Baseline created" -ForegroundColor $Green
    exit 0
}

Write-Host "✓ Found existing documentation" -ForegroundColor $Green

# Step 3: Compare documentation
Write-Host ""
Write-Host "[3/5] Comparing documentation versions..." -ForegroundColor $Yellow

# Create comparison script
$compareScript = @"
const fs = require('fs');

const currentDocs = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
const newDocs = JSON.parse(fs.readFileSync(process.argv[3], 'utf-8'));

const results = {
    missing: [],
    new: [],
    modified: [],
    paramMismatches: []
};

const currentMap = new Map(
    currentDocs.map(doc => [``\${doc.method}:\${doc.path}``, doc])
);
const newMap = new Map(
    newDocs.map(doc => [``\${doc.method}:\${doc.path}``, doc])
);

for (const [key, doc] of currentMap) {
    if (!newMap.has(key)) {
        results.missing.push(``\${doc.method} \${doc.path}``);
    }
}

for (const [key, doc] of newMap) {
    if (!currentMap.has(key)) {
        results.new.push(``\${doc.method} \${doc.path}``);
    }
}

for (const [key, newDoc] of newMap) {
    const currentDoc = currentMap.get(key);
    if (currentDoc) {
        const currentParams = JSON.stringify(currentDoc.parameters || []);
        const newParams = JSON.stringify(newDoc.parameters || []);
        
        if (currentParams !== newParams) {
            results.modified.push(``\${newDoc.method} \${newDoc.path}``);
            results.paramMismatches.push({
                endpoint: ``\${newDoc.method} \${newDoc.path}``,
                current: currentDoc.parameters?.length || 0,
                new: newDoc.parameters?.length || 0
            });
        }
    }
}

console.log(JSON.stringify(results, null, 2));
"@

$compareScriptPath = Join-Path $TempDir "compare.js"
$compareScript | Out-File -FilePath $compareScriptPath -Encoding utf8

# Run comparison
$comparison = node $compareScriptPath $CurrentDocs $NewDocs | ConvertFrom-Json

# Step 4: Generate diff report
Write-Host ""
Write-Host "[4/5] Generating validation report..." -ForegroundColor $Yellow

$reportContent = @"
API Documentation Validation Report
Generated: $(Get-Date)
═══════════════════════════════════════════════════════

SUMMARY
-------
Missing Endpoints: $($comparison.missing.Count)
New Endpoints: $($comparison.new.Count)
Modified Endpoints: $($comparison.modified.Count)
Parameter Mismatches: $($comparison.paramMismatches.Count)

DETAILED COMPARISON
-------------------

Missing Endpoints:
$($comparison.missing -join "`n")

New Endpoints:
$($comparison.new -join "`n")

Modified Endpoints:
$($comparison.modified -join "`n")

Parameter Mismatches:
$($comparison.paramMismatches | ConvertTo-Json -Depth 3)

"@

$reportContent | Out-File -FilePath $DiffReport -Encoding utf8

Write-Host "✓ Validation report generated: $DiffReport" -ForegroundColor $Green

# Step 5: Determine validation result
Write-Host ""
Write-Host "[5/5] Validation Results:" -ForegroundColor $Yellow
Write-Host ""

$validationFailed = $false

if ($comparison.missing.Count -gt 0) {
    Write-Host "✗ FAIL: $($comparison.missing.Count) endpoint(s) are missing from new documentation" -ForegroundColor $Red
    $validationFailed = $true
}

if ($comparison.modified.Count -gt 0) {
    Write-Host "⚠ WARNING: Endpoints have been modified" -ForegroundColor $Yellow
    Write-Host "  Review the changes in $DiffReport" -ForegroundColor $Yellow
}

if ($comparison.new.Count -gt 0) {
    Write-Host "ℹ INFO: New endpoints detected" -ForegroundColor $Blue
}

Write-Host ""

if (-not $validationFailed) {
    Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor $Green
    Write-Host "║   ✓ VALIDATION PASSED                      ║" -ForegroundColor $Green
    Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor $Green
    Write-Host ""
    Write-Host "Documentation is in sync with implementation" -ForegroundColor $Green
    exit 0
} else {
    Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor $Red
    Write-Host "║   ✗ VALIDATION FAILED                      ║" -ForegroundColor $Red
    Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor $Red
    Write-Host ""
    Write-Host "Documentation does not match implementation" -ForegroundColor $Red
    Write-Host "See $DiffReport for details" -ForegroundColor $Red
    exit 1
}
