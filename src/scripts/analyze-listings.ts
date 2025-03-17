#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Constants
const YEN_TO_USD_RATE = 150;

interface AnalysisResult {
  timestamp: string;
  averages: {
    priceJPY: number;
    priceUSD: number;
    landArea: number;
    buildArea: number;
  };
  totalListings: number;
  metadata: {
    source: string;
    exchangeRate: number;
  };
}

function parseYenPrice(priceStr: string): number {
  // Handle price formats like "693万円" (6.93 million yen)
  const manMatch = priceStr.match(/(\d+(?:\.\d+)?)万円/);
  if (manMatch) {
    return parseFloat(manMatch[1]) * 10000;
  }
  
  // Handle price formats like "1億2000万円" (120 million yen)
  const okuMatch = priceStr.match(/(\d+)億(\d+(?:\.\d+)?)万円/);
  if (okuMatch) {
    const oku = parseInt(okuMatch[1]) * 100000000;
    const man = parseFloat(okuMatch[2]) * 10000;
    return oku + man;
  }

  // Handle simple yen format like "10000円"
  const simpleMatch = priceStr.match(/(\d+(?:\.\d+)?)円/);
  if (simpleMatch) {
    return parseFloat(simpleMatch[1]);
  }

  console.warn(`Unable to parse price: ${priceStr}, treating as 0`);
  return 0;
}

function parseArea(areaStr: string): number {
  // Handle area formats like "229.2㎡"
  const match = areaStr.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  
  console.warn(`Unable to parse area: ${areaStr}, treating as 0`);
  return 0;
}

function fixJsonTrailingCommas(jsonString: string): string {
  // Replace trailing commas in objects
  return jsonString
    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas before closing braces/brackets
    .replace(/,\s*$/g, ''); // Remove trailing commas at the end of the file
}

function analyzeListings(jsonPath: string): AnalysisResult {
  try {
    // Read the file
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    
    // Attempt to fix common JSON issues
    const fixedContent = fixJsonTrailingCommas(fileContent);
    
    // Parse the JSON
    let data;
    try {
      data = JSON.parse(fixedContent);
    } catch (parseError) {
      if (parseError instanceof Error) {
        // Provide more detailed error with content around the error position
        const errorMatch = parseError.message.match(/position (\d+)/);
        if (errorMatch) {
          const position = parseInt(errorMatch[1]);
          const start = Math.max(0, position - 30);
          const end = Math.min(fixedContent.length, position + 30);
          const context = fixedContent.substring(start, end);
          
          throw new Error(`${parseError.message}\nJSON context around error: ...${context}...`);
        }
      }
      throw parseError;
    }
    
    if (!data.newListings) {
      throw new Error("JSON structure is invalid: 'newListings' property not found");
    }
    
    const listings = Object.values(data.newListings) as any[];
    if (!listings.length) {
      throw new Error("No listings found in the JSON file");
    }
    
    // Initialize variables to calculate averages
    let totalPriceJPY = 0;
    let totalLandArea = 0;
    let totalBuildArea = 0;
    let validPriceCount = 0;
    let validLandAreaCount = 0;
    let validBuildAreaCount = 0;
    
    // Process each listing
    listings.forEach((listing: any) => {
      if (listing.price) {
        const priceJPY = parseYenPrice(listing.price);
        if (priceJPY > 0) {
          totalPriceJPY += priceJPY;
          validPriceCount++;
        }
      }
      
      if (listing.landArea) {
        const landArea = parseArea(listing.landArea);
        if (landArea > 0) {
          totalLandArea += landArea;
          validLandAreaCount++;
        }
      }
      
      if (listing.buildArea) {
        const buildArea = parseArea(listing.buildArea);
        if (buildArea > 0) {
          totalBuildArea += buildArea;
          validBuildAreaCount++;
        }
      }
    });
    
    // Calculate averages
    const avgPriceJPY = validPriceCount > 0 ? totalPriceJPY / validPriceCount : 0;
    const avgLandArea = validLandAreaCount > 0 ? totalLandArea / validLandAreaCount : 0;
    const avgBuildArea = validBuildAreaCount > 0 ? totalBuildArea / validBuildAreaCount : 0;
    
    // Convert to USD
    const avgPriceUSD = avgPriceJPY / YEN_TO_USD_RATE;
    
    // Return the result with a timestamp
    return {
      timestamp: new Date().toISOString(),
      averages: {
        priceJPY: Math.round(avgPriceJPY),
        priceUSD: Math.round(avgPriceUSD),
        landArea: parseFloat(avgLandArea.toFixed(2)),
        buildArea: parseFloat(avgBuildArea.toFixed(2))
      },
      totalListings: listings.length,
      metadata: {
        source: path.basename(jsonPath),
        exchangeRate: YEN_TO_USD_RATE
      }
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to analyze listings: ${error.message}`);
    }
    throw new Error(`Failed to analyze listings: Unknown error`);
  }
}

function main() {
  try {
    // Check if a file path was provided as an argument
    if (process.argv.length < 3) {
      console.error("Error: Please provide a path to the JSON file");
      console.error("Usage: npx ts-node analyze-listings.ts <path/to/json>");
      process.exit(1);
    }
    
    const jsonPath = process.argv[2];
    
    // Check if the file exists
    if (!fs.existsSync(jsonPath)) {
      console.error(`Error: File not found: ${jsonPath}`);
      process.exit(1);
    }
    
    // Analyze the listings
    const result = analyzeListings(jsonPath);
    
    // Output the result as JSON
    const output = {
      propertyAnalysis: result
    };
    
    console.log(JSON.stringify(output, null, 2));
    
    // Optionally save the result to a file
    const outputPath = `analysis-${new Date().toISOString().replace(/:/g, '-')}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.error(`Analysis saved to ${outputPath}`);
    
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("An unknown error occurred");
    }
    process.exit(1);
  }
}

// Run the script
main(); 