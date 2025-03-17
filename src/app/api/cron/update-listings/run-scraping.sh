#!/bin/bash

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd $SCRIPT_DIR/../../../../.. && pwd)"

# Default worker count
WORKER_COUNT=3
ACTION=""

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -w|--workers) WORKER_COUNT="$2"; shift ;;
    -a|--action) ACTION="$2"; shift ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
  shift
done

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to check if Redis is running
check_redis() {
  echo -e "${BLUE}Checking if Redis is running...${NC}"
  if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
      echo -e "${GREEN}✅ Redis is running${NC}"
      return 0
    else
      echo -e "${RED}❌ Redis is not running. Please start Redis first.${NC}"
      echo -e "${YELLOW}You can start Redis with: redis-server${NC}"
      return 1
    fi
  else
    echo -e "${YELLOW}⚠️ redis-cli not found. Cannot verify if Redis is running.${NC}"
    echo -e "${YELLOW}Please ensure Redis is running before continuing.${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      return 1
    fi
    return 0
  fi
}

# Function to start workers
start_workers() {
  echo -e "${BLUE}Starting $WORKER_COUNT worker(s)...${NC}"
  npx tsx "$SCRIPT_DIR/spawn-workers.ts" --workers=$WORKER_COUNT
}

# Function to start scraping
start_scraping() {
  echo -e "${BLUE}Starting scraping process...${NC}"
  npx tsx "$SCRIPT_DIR/start-scraping.ts"
  echo -e "${GREEN}Scraping process initiated. Check worker logs for progress.${NC}"
}

# Function to retry failed jobs
retry_failed_jobs() {
  echo -e "${BLUE}Retrying failed jobs with $WORKER_COUNT worker(s)...${NC}"
  npx tsx "$SCRIPT_DIR/retry-failed-jobs.ts" --workers=$WORKER_COUNT
}

# Function to find listings with missing fields
find_missing_fields() {
  echo -e "${BLUE}Finding listings with missing fields...${NC}"
  npx tsx "$SCRIPT_DIR/run-find-missing-fields.ts"
}

# Function to show menu
show_menu() {
  clear
  echo -e "${PURPLE}=======================================${NC}"
  echo -e "${PURPLE}      Scraping System Control Panel    ${NC}"
  echo -e "${PURPLE}=======================================${NC}"
  echo -e "${CYAN}Current worker count: $WORKER_COUNT${NC}"
  echo
  echo -e "${YELLOW}1.${NC} Start workers only"
  echo -e "${YELLOW}2.${NC} Start scraping (requires workers)"
  echo -e "${YELLOW}3.${NC} Retry failed jobs"
  echo -e "${YELLOW}4.${NC} Find listings with missing fields"
  echo -e "${YELLOW}5.${NC} Start workers and scraping"
  echo -e "${YELLOW}6.${NC} Change worker count"
  echo -e "${YELLOW}0.${NC} Exit"
  echo
  echo -e "${PURPLE}=======================================${NC}"
  echo -n -e "${GREEN}Enter your choice [0-6]: ${NC}"
}

# Function to change worker count
change_worker_count() {
  read -p "Enter new worker count (1-10): " new_count
  if [[ "$new_count" =~ ^[1-9]|10$ ]]; then
    WORKER_COUNT=$new_count
    echo -e "${GREEN}Worker count updated to $WORKER_COUNT${NC}"
  else
    echo -e "${RED}Invalid input. Worker count remains $WORKER_COUNT${NC}"
  fi
  sleep 2
}

# Change to project root directory
cd "$PROJECT_ROOT"
echo -e "${BLUE}Changed to directory: $(pwd)${NC}"

# If action is specified, run it directly
if [[ ! -z "$ACTION" ]]; then
  check_redis || exit 1
  
  case "$ACTION" in
    workers)
      start_workers
      ;;
    scrape)
      start_scraping
      ;;
    retry)
      retry_failed_jobs
      ;;
    missing)
      find_missing_fields
      ;;
    all)
      # Start workers in the background
      npx tsx "$SCRIPT_DIR/spawn-workers.ts" --workers=$WORKER_COUNT &
      WORKERS_PID=$!
      
      # Wait a moment for workers to initialize
      sleep 3
      
      # Start scraping
      start_scraping
      
      # Wait for the user to press Ctrl+C
      echo -e "${YELLOW}Press Ctrl+C to stop workers and exit${NC}"
      wait $WORKERS_PID
      ;;
    *)
      echo -e "${RED}Unknown action: $ACTION${NC}"
      echo -e "${YELLOW}Available actions: workers, scrape, retry, missing, all${NC}"
      exit 1
      ;;
  esac
  
  exit 0
fi

# Interactive menu
while true; do
  show_menu
  read -n 1 choice
  echo
  
  case $choice in
    1)
      check_redis && start_workers
      exit 0
      ;;
    2)
      if check_redis; then
        start_scraping
        echo -e "${YELLOW}Press Enter to return to menu...${NC}"
        read
      fi
      ;;
    3)
      if check_redis; then
        retry_failed_jobs
        echo -e "${YELLOW}Press Enter to return to menu...${NC}"
        read
      fi
      ;;
    4)
      find_missing_fields
      echo -e "${YELLOW}Press Enter to return to menu...${NC}"
      read
      ;;
    5)
      if check_redis; then
        # Start workers in the background
        npx tsx "$SCRIPT_DIR/spawn-workers.ts" --workers=$WORKER_COUNT &
        WORKERS_PID=$!
        
        # Wait a moment for workers to initialize
        sleep 3
        
        # Start scraping
        start_scraping
        
        # Wait for the user to press Ctrl+C
        echo -e "${YELLOW}Press Ctrl+C to stop workers and exit${NC}"
        wait $WORKERS_PID
        exit 0
      fi
      ;;
    6)
      change_worker_count
      ;;
    0)
      echo -e "${GREEN}Exiting...${NC}"
      exit 0
      ;;
    *)
      echo -e "${RED}Invalid option. Press Enter to continue...${NC}"
      read
      ;;
  esac
done 