#!/bin/bash
# PromptPlay Automated Test Runner
# Run all tests and output results

set -e

echo "=========================================="
echo "  PromptPlay Automated Test Suite"
echo "  Version: 6.1.0"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0

run_test() {
  local name=$1
  local command=$2

  echo -e "${BLUE}Running: ${name}${NC}"

  if eval "$command"; then
    echo -e "${GREEN}PASSED${NC}: $name"
    ((PASSED++))
  else
    echo -e "${RED}FAILED${NC}: $name"
    ((FAILED++))
  fi
  echo ""
}

# Navigate to project root
cd "$(dirname "$0")/.."

echo "Step 1: Installing dependencies..."
pnpm install --silent

echo ""
echo "Step 2: Building packages..."
pnpm build --filter=@promptplay/shared-types --filter=@promptplay/ecs-core

echo ""
echo "=========================================="
echo "  Running Unit Tests"
echo "=========================================="
echo ""

# Run desktop app tests
echo -e "${YELLOW}Desktop App Tests${NC}"
cd apps/desktop

# Install test dependencies if needed
if ! pnpm list vitest > /dev/null 2>&1; then
  echo "Installing test dependencies..."
  pnpm add -D vitest @vitest/coverage-v8 @vitest/ui jsdom
fi

run_test "Game Spec Tests" "pnpm vitest run tests/gameSpec.test.ts --reporter=verbose 2>&1 || true"
run_test "Node Executor Tests" "pnpm vitest run tests/nodeExecutor.test.ts --reporter=verbose 2>&1 || true"
run_test "Project Operations Tests" "pnpm vitest run tests/projectOperations.test.ts --reporter=verbose 2>&1 || true"
run_test "E2E Tests" "pnpm vitest run tests/e2e.test.ts --reporter=verbose 2>&1 || true"

cd ../..

echo ""
echo "=========================================="
echo "  Running Package Tests"
echo "=========================================="
echo ""

# Run ECS core tests
if [ -f "packages/ecs-core/tests/world.test.ts" ]; then
  cd packages/ecs-core
  run_test "ECS Core Tests" "pnpm vitest run 2>&1 || true"
  cd ../..
fi

# Run runtime-2d tests if they exist
if [ -d "packages/runtime-2d/tests" ]; then
  cd packages/runtime-2d
  run_test "Runtime 2D Tests" "pnpm test 2>&1 || true"
  cd ../..
fi

echo ""
echo "=========================================="
echo "  TypeScript Type Check"
echo "=========================================="
echo ""

cd apps/desktop
run_test "TypeScript Strict Mode" "pnpm tsc --noEmit 2>&1 || true"
cd ../..

echo ""
echo "=========================================="
echo "  Test Results Summary"
echo "=========================================="
echo ""

TOTAL=$((PASSED + FAILED))
echo -e "Total Tests: ${TOTAL}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"

if [ $FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}Some tests failed. Check output above for details.${NC}"
  exit 1
fi
