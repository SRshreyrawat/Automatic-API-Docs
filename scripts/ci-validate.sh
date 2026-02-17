#!/bin/bash

# CI/CD Integration Script
# Validates API documentation as part of CI pipeline
# Returns exit code 0 if valid, 1 if invalid

set -e

echo "Running API Documentation Validation in CI Mode..."
echo ""

# Run validation
bash scripts/validate-docs.sh

# Capture exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✓ CI Validation Passed"
    exit 0
else
    echo ""
    echo "✗ CI Validation Failed"
    echo "Documentation is out of sync. Please regenerate documentation."
    exit 1
fi
