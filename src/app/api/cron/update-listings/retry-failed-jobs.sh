#!/bin/bash

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd $SCRIPT_DIR/../../../../.. && pwd)"

# Default worker count
WORKER_COUNT=3

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -w|--workers) WORKER_COUNT="$2"; shift ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
  shift
done

echo "🔄 Retrying failed jobs with $WORKER_COUNT workers..."
echo "Project root: $PROJECT_ROOT"

# Change to project root directory first
cd "$PROJECT_ROOT"
echo "Changed to directory: $(pwd)"

# Check if Redis is running
echo "Checking if Redis is running..."
if command -v redis-cli &> /dev/null; then
  if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
  else
    echo "❌ Redis is not running. Please start Redis first."
    echo "You can start Redis with: redis-server"
    exit 1
  fi
else
  echo "⚠️ redis-cli not found. Cannot verify if Redis is running."
  echo "Please ensure Redis is running before continuing."
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Run the script
echo "Starting retry process with $WORKER_COUNT workers..."
npx tsx "$SCRIPT_DIR/retry-failed-jobs.ts" --workers=$WORKER_COUNT

echo ""
echo "Script started. Workers are processing jobs in the background."
echo "You can monitor progress in the worker logs." 