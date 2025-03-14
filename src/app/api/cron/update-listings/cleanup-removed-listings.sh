#!/bin/bash

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd $SCRIPT_DIR/../../../../.. && pwd)"

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting cleanup of removed/non-existent listings...${NC}"
echo -e "Project root: ${PROJECT_ROOT}"

# Change to project root directory first
cd "$PROJECT_ROOT"
echo -e "Changed to directory: $(pwd)"

# Check if all-listings.json exists
echo -e "Checking if all-listings.json exists..."
if [ -f "all-listings.json" ]; then
  echo -e "${GREEN}✅ Found all-listings.json in project root${NC}"
else
  echo -e "${RED}❌ all-listings.json not found in project root${NC}"
  echo -e "Expected at: $(pwd)/all-listings.json"
  exit 1
fi

# Check if Redis is running
echo -e "${BLUE}Checking if Redis is running...${NC}"
if command -v redis-cli &> /dev/null; then
  if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is running${NC}"
  else
    echo -e "${RED}❌ Redis is not running. Please start Redis first.${NC}"
    echo -e "${YELLOW}You can start Redis with: redis-server${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠️ redis-cli not found. Cannot verify if Redis is running.${NC}"
  echo -e "Please ensure Redis is running before continuing."
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Run the script
echo -e "${BLUE}Running cleanup script...${NC}"
npx tsx "$SCRIPT_DIR/cleanup-removed-listings.ts"

echo ""
echo -e "${GREEN}Script completed.${NC}"
echo -e "Removed listings have been removed from the database."
echo -e "You can visit the Admin UI to see the results." 