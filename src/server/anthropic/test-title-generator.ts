import { generateTitles } from './api';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log('Loading environment variables from:', envPath);
  dotenv.config({ path: envPath });
} else {
  console.warn('No .env.local file found at:', envPath);
  dotenv.config();
}

// Verify API key is loaded
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set in environment variables');
  process.exit(1);
}

// Function to load property data from JSON file
function loadPropertyData() {
  try {
    const dataPath = path.resolve(process.cwd(), 'public/batch_test_results.json');
    console.log('Loading property data from:', dataPath);
    
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Property data file not found at: ${dataPath}`);
    }
    
    const rawData = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error loading property data:', error);
    throw error;
  }
}

// Process the properties and prepare them for the title generator
function preparePropertyData(propertyData: Record<string, any>, addresses: string[]) {
  // Map to the format expected by the title generator
  return addresses.map(address => {
    const property = propertyData[address];
    if (!property) {
      console.warn(`Property not found for address: ${address}`);
      return null;
    }
    
    // Convert tags string to array if it's a string
    const tags = typeof property.tags === 'string' 
      ? property.tags.split(',').map((tag: string) => tag.trim()) 
      : property.tags || [];
    
    // Extract aboutProperty if it exists
    const aboutProperty = property.aboutProperty || 
                          (property.original && property.original.aboutProperty) || 
                          '';
    
    return {
      address: address || '',
      tags: tags,
      price: typeof property.price === 'number' ? `¥${property.price.toLocaleString()}` : property.price || '',
      listingDetail: property.listingDetail || '',
      aboutProperty: aboutProperty
    };
  }).filter(Boolean); // Remove null entries
}

// Process a batch of properties and save the results
async function processBatch(propertyData: Record<string, any>, batchAddresses: string[], batchNumber: number) {
  try {
    console.log(`\n--- PROCESSING BATCH ${batchNumber} ---`);
    console.log(`Batch size: ${batchAddresses.length} properties`);
    
    // Prepare the data for the title generator
    const preparedData = preparePropertyData(propertyData, batchAddresses);
    
    // Generate titles
    const result = await generateTitles(preparedData);
    
    console.log('\n--- BATCH TITLE GENERATION RESULT ---');
    console.log('Titles:');
    result.titles.forEach((title, index) => {
      const address = batchAddresses[index] || `Property ${index + 1}`;
      console.log(`${index + 1}. ${address}: ${title}`);
    });
    console.log('--------------------------------\n');
    
    // Create JSON output organized by address
    const outputData: Record<string, { propertyTitle: string }> = {};
    
    // Map each title to its corresponding property address
    result.titles.forEach((title, index) => {
      if (index < batchAddresses.length) {
        const address = batchAddresses[index];
        outputData[address] = { propertyTitle: title };
      }
    });
    
    return outputData;
  } catch (error) {
    console.error(`Error processing batch ${batchNumber}:`, error);
    return {};
  }
}

// Load existing data
function loadExistingData() {
  // Load existing titles if available
  let existingTitles: Record<string, { propertyTitle: string }> = {};
  const existingTitlesPath = path.resolve(process.cwd(), 'property-titles.json');
  if (fs.existsSync(existingTitlesPath)) {
    try {
      const existingData = fs.readFileSync(existingTitlesPath, 'utf8');
      existingTitles = JSON.parse(existingData);
      console.log(`Loaded existing titles for ${Object.keys(existingTitles).length} properties`);
    } catch (error) {
      console.warn('Failed to load existing titles, creating new file');
    }
  }
  
  return { existingTitles, existingTitlesPath };
}

// Save data to files
function saveData(mergedTitles: Record<string, { propertyTitle: string }>, propertyData: Record<string, any>, outputData: Record<string, { propertyTitle: string }>) {
  const existingTitlesPath = path.resolve(process.cwd(), 'property-titles.json');
  fs.writeFileSync(existingTitlesPath, JSON.stringify(mergedTitles, null, 2));
  console.log(`Titles written to: ${existingTitlesPath} (total: ${Object.keys(mergedTitles).length} properties)`);
  
  // Load existing merged data if available
  let existingMergedData: Record<string, any> = { ...propertyData };
  const mergedDataPath = path.resolve(process.cwd(), 'public/batch_test_results_with_titles.json');
  if (fs.existsSync(mergedDataPath)) {
    try {
      const existingData = fs.readFileSync(mergedDataPath, 'utf8');
      existingMergedData = JSON.parse(existingData);
      console.log(`Loaded existing merged data for ${Object.keys(existingMergedData).length} properties`);
    } catch (error) {
      console.warn('Failed to load existing merged data, using original property data');
    }
  }
  
  // Merge with original data
  const mergedData: Record<string, any> = { ...existingMergedData };
  for (const [address, titleData] of Object.entries(outputData)) {
    if (mergedData[address]) {
      mergedData[address] = {
        ...mergedData[address],
        ...titleData
      };
    }
  }
  
  // Write the merged data back to the file
  fs.writeFileSync(mergedDataPath, JSON.stringify(mergedData, null, 2));
  console.log(`Merged data written to: ${mergedDataPath}`);
  
  return { mergedData, mergedDataPath };
}

// Process all remaining properties in batches
async function processAllRemainingProperties() {
  try {
    // Load the property data
    const propertyData = loadPropertyData();
    
    // Get the addresses (keys) from the property data
    const addresses = Object.keys(propertyData);
    const startIndex = 13; // Skip the first 13 properties (already processed 0-12)
    const batchSize = 12; // Process 12 properties at once
    
    console.log(`Total properties: ${addresses.length}`);
    console.log(`Starting from index: ${startIndex}`);
    
    // Load existing titles
    const { existingTitles, existingTitlesPath } = loadExistingData();
    
    // Process all remaining properties in batches
    let allBatchResults: Record<string, { propertyTitle: string }> = {};
    let batchNumber = 1;
    
    // Calculate total number of batches
    const remainingAddresses = addresses.slice(startIndex);
    const totalBatches = Math.ceil(remainingAddresses.length / batchSize);
    
    console.log(`Processing ${remainingAddresses.length} remaining properties in ${totalBatches} batches\n`);
    
    // Process each batch
    for (let i = 0; i < remainingAddresses.length; i += batchSize) {
      const batchAddresses = remainingAddresses.slice(i, i + batchSize);
      
      console.log(`Batch ${batchNumber}/${totalBatches}: Processing ${batchAddresses.length} properties`);
      
      // Process the batch
      const batchResults = await processBatch(propertyData, batchAddresses, batchNumber);
      
      // Merge batch results
      allBatchResults = { ...allBatchResults, ...batchResults };
      
      // Merge with existing titles and save after each batch for safety
      const mergedTitles = { ...existingTitles, ...allBatchResults };
      
      // Save data after each batch
      saveData(mergedTitles, propertyData, batchResults);
      
      console.log(`Completed batch ${batchNumber}/${totalBatches}`);
      console.log(`Processed ${Object.keys(allBatchResults).length} properties so far\n`);
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < remainingAddresses.length) {
        console.log('Waiting 5 seconds before processing next batch...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      batchNumber++;
    }
    
    console.log('\n--- PROCESSING COMPLETE ---');
    console.log(`Successfully processed ${Object.keys(allBatchResults).length} properties`);
    
    // Properly type the merged object
    const finalMergedTitles: Record<string, { propertyTitle: string }> = { ...existingTitles, ...allBatchResults };
    console.log(`Total properties with titles: ${Object.keys(finalMergedTitles).length}`);
    
  } catch (error) {
    console.error('Processing failed:', error);
  }
}

// Run the processor
processAllRemainingProperties(); 