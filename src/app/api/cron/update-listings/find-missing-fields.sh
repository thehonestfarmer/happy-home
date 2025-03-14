#!/bin/bash

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd $SCRIPT_DIR/../../../../.. && pwd)"

echo "Running script to find listings with missing fields..."
echo "Project root: $PROJECT_ROOT"

# Change to project root directory first
cd "$PROJECT_ROOT"
echo "Changed to directory: $(pwd)"
echo "Checking if all-listings.json exists..."
if [ -f "all-listings.json" ]; then
  echo "✅ Found all-listings.json in project root"
else
  echo "❌ all-listings.json not found in project root"
  echo "Expected at: $(pwd)/all-listings.json"
  exit 1
fi

# Create a temporary output file for listing IDs
TEMP_OUTPUT_FILE=$(mktemp)
echo "Creating temporary file for listing output: $TEMP_OUTPUT_FILE"

# Run the script - using the entry point script instead
echo "Running script..."
npx tsx "$SCRIPT_DIR/run-find-missing-fields.ts" --outputFile="$TEMP_OUTPUT_FILE"

# Check if the temp file has content
if [ -s "$TEMP_OUTPUT_FILE" ]; then
  # Process the file to ensure consistent line counting
  # Remove any empty lines and count the actual entries
  grep -v "^$" "$TEMP_OUTPUT_FILE" > "${TEMP_OUTPUT_FILE}.clean"
  mv "${TEMP_OUTPUT_FILE}.clean" "$TEMP_OUTPUT_FILE"
  
  # Count total listings - using wc -l and trimming whitespace
  TOTAL_LISTINGS=$(grep -c "" "$TEMP_OUTPUT_FILE")
  
  # Create a divider line based on terminal width
  TERM_WIDTH=$(tput cols 2>/dev/null || echo 80)
  DIVIDER=$(printf '%*s' "$TERM_WIDTH" | tr ' ' '=')
  
  echo ""
  echo "$DIVIDER"
  echo "🏠 $TOTAL_LISTINGS LISTINGS WITH MISSING FIELDS"
  echo "$DIVIDER"
  echo ""
  
  # Display the listings with enhanced formatting
  counter=1
  cat "$TEMP_OUTPUT_FILE" | sort | while read -r line; do
    id=$(echo "$line" | cut -d ' ' -f 1)
    rest=$(echo "$line" | cut -d ' ' -f 2-)
    
    echo "[$counter] 📍 $id"
    echo "    $rest"
    echo ""
    
    ((counter++))
  done
  
  echo "$DIVIDER"
  echo "SUMMARY: $TOTAL_LISTINGS properties missing data, added to failed jobs queue"
  echo "NEXT STEP: Visit Admin UI (/admin/scraper) to retry these failed jobs"
  echo "$DIVIDER"
else
  echo "✅ No listings with missing fields were found!"
fi

# Clean up
rm -f "$TEMP_OUTPUT_FILE"

echo ""
echo "Script completed!" 