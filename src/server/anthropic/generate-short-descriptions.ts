import { generateShortDescriptions } from './api';
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

// Prepare a batch of properties for the API call
function prepareBatchData(propertyData: Record<string, any>, addresses: string[]) {
  // Create a map of addresses to property details
  const batchData: Record<string, any> = {};
  
  for (const address of addresses) {
    const property = propertyData[address];
    if (!property) {
      console.warn(`Property not found for address: ${address}`);
      continue;
    }
    
    // Extract relevant property details for short description generation
    batchData[address] = {
      address: address,
      price: property.price || null,
      buildSqMeters: property.buildSqMeters || null,
      landSqMeters: property.landSqMeters || null,
      layout: property.layout || null,
      buildDate: property.buildDate || null,
      listingDetail: property.listingDetail || null,
      propertyTitle: property.propertyTitle || null,
      tags: property.tags ? property.tags.split(',').map((tag: string) => tag.trim()) : []
    };
  }
  
  return batchData;
}

// Process a batch of properties and generate short descriptions with a single API call
async function processBatch(propertyData: Record<string, any>, batchAddresses: string[], batchNumber: number) {
  try {
    console.log(`\n--- PROCESSING BATCH ${batchNumber} ---`);
    console.log(`Batch size: ${batchAddresses.length} properties`);
    
    // Prepare the data for the API call
    const batchData = prepareBatchData(propertyData, batchAddresses);
    
    // Log property titles being processed
    console.log('\nProperty titles in this batch:');
    for (const [address, propertyDetails] of Object.entries(batchData)) {
      console.log(`- ${address}: ${propertyDetails.propertyTitle || 'No title'}`);
    }
    console.log('\n');
    
    // Send all properties in a single API call
    console.log(`Making API call to Anthropic for ${Object.keys(batchData).length} properties...`);
    const batchResults = await generateShortDescriptions(batchData);
    
    // Convert the results to the expected format
    const formattedResults: Record<string, { shortDescription: string }> = {};
    
    for (const [address, result] of Object.entries(batchResults)) {
      formattedResults[address] = {
        shortDescription: result.shortDescription
      };
      console.log(`Successfully generated short description for: ${address}`);
      // Print the generated short description
      console.log(`Short description: ${result.shortDescription}`);
    }
    
    console.log('\n--- BATCH SHORT DESCRIPTION GENERATION COMPLETE ---');
    console.log(`Generated short descriptions for ${Object.keys(formattedResults).length} properties in this batch`);
    
    return formattedResults;
  } catch (error) {
    console.error(`Error processing batch ${batchNumber}:`, error);
    return {};
  }
}

// Load existing data
function loadExistingData() {
  // Load existing short descriptions if available
  let existingDescriptions: Record<string, { shortDescription: string }> = {};
  const existingDescriptionsPath = path.resolve(process.cwd(), 'property-short-descriptions.json');
  if (fs.existsSync(existingDescriptionsPath)) {
    try {
      const existingData = fs.readFileSync(existingDescriptionsPath, 'utf8');
      existingDescriptions = JSON.parse(existingData);
      console.log(`Loaded existing short descriptions for ${Object.keys(existingDescriptions).length} properties`);
    } catch (error) {
      console.warn('Failed to load existing short descriptions, creating new file');
    }
  }
  
  return { existingDescriptions, existingDescriptionsPath };
}

// Save data to files
function saveData(mergedDescriptions: Record<string, { shortDescription: string }>, propertyData: Record<string, any>, newDescriptions: Record<string, { shortDescription: string }>) {
  const existingDescriptionsPath = path.resolve(process.cwd(), 'property-short-descriptions.json');
  fs.writeFileSync(existingDescriptionsPath, JSON.stringify(mergedDescriptions, null, 2));
  console.log(`Short descriptions written to: ${existingDescriptionsPath} (total: ${Object.keys(mergedDescriptions).length} properties)`);
  
  // Create a backup of the original batch_test_results.json file
  const originalDataPath = path.resolve(process.cwd(), 'public/batch_test_results.json');
  const backupPath = path.resolve(process.cwd(), 'public/batch_test_results.backup.json');
  
  if (fs.existsSync(originalDataPath) && !fs.existsSync(backupPath)) {
    fs.copyFileSync(originalDataPath, backupPath);
    console.log(`Created backup of original data at: ${backupPath}`);
  }
  
  // Merge with original data
  const mergedData: Record<string, any> = { ...propertyData };
  for (const [address, descriptionData] of Object.entries(newDescriptions)) {
    if (mergedData[address]) {
      mergedData[address] = {
        ...mergedData[address],
        ...descriptionData
      };
    }
  }
  
  // Write the merged data back to the file
  fs.writeFileSync(originalDataPath, JSON.stringify(mergedData, null, 2));
  console.log(`Merged data written to: ${originalDataPath}`);
  
  return { mergedData, originalDataPath };
}

// For proof of concept, just process 1 property
async function processOneBatchForProofOfConcept() {
  try {
    // Load the property data
    const propertyData = loadPropertyData();
    
    // Get the addresses (keys) from the property data
    const allAddresses = Object.keys(propertyData);
    
    // Just get the first address for our proof of concept
    const addressesToProcess = [allAddresses[0]];
    
    console.log(`Total properties in data: ${allAddresses.length}`);
    console.log(`Will process 1 property as proof of concept`);
    
    // Load existing data
    const { existingDescriptions } = loadExistingData();
    
    // Process the single property
    const batchResults = await processBatch(propertyData, addressesToProcess, 1);
    
    // Merge with existing data
    const mergedDescriptions = { ...existingDescriptions, ...batchResults };
    
    // Save data
    saveData(mergedDescriptions, propertyData, batchResults);
    
    console.log('\n--- PROOF OF CONCEPT COMPLETE ---');
    console.log(`Successfully processed 1 property and added short description`);
    
  } catch (error) {
    console.error('Processing failed:', error);
  }
}

// For full implementation, process properties in batches of 12, starting from index 1
async function processRemainingPropertiesInBatches() {
  try {
    // Load the property data
    const propertyData = loadPropertyData();
    
    // Get the addresses (keys) from the property data
    const allAddresses = Object.keys(propertyData);
    const startIndex = 1; // Skip the first property (already processed in proof of concept)
    const batchSize = 12; // Process 12 properties at once
    
    // Load existing data
    const { existingDescriptions } = loadExistingData();
    const existingDescriptionKeys = Object.keys(existingDescriptions);
    
    console.log(`Total properties in data: ${allAddresses.length}`);
    console.log(`Properties with existing short descriptions: ${existingDescriptionKeys.length}`);
    
    // Get remaining addresses to process, starting from index 1
    const remainingAddresses = allAddresses.slice(startIndex);
    
    // Filter out addresses that already have short descriptions (if any besides the first one)
    const addressesToProcess = remainingAddresses.filter(address => 
      !existingDescriptionKeys.includes(address)
    );
    
    console.log(`Starting from index: ${startIndex}`);
    console.log(`Properties needing short descriptions: ${addressesToProcess.length}`);
    
    // If no properties need processing, exit
    if (addressesToProcess.length === 0) {
      console.log('No remaining properties to process. All properties have short descriptions.');
      return;
    }
    
    const totalBatches = Math.ceil(addressesToProcess.length / batchSize);
    console.log(`Will process ${addressesToProcess.length} properties in ${totalBatches} batches\n`);
    
    // Process each batch
    let allBatchResults: Record<string, { shortDescription: string }> = {};
    
    for (let i = 0; i < addressesToProcess.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batchAddresses = addressesToProcess.slice(i, i + batchSize);
      
      console.log(`\nBatch ${batchNumber}/${totalBatches}: Processing ${batchAddresses.length} properties`);
      console.log(`Addresses in this batch:`, batchAddresses);
      
      // Process the batch
      const batchResults = await processBatch(propertyData, batchAddresses, batchNumber);
      
      // Merge batch results
      allBatchResults = { ...allBatchResults, ...batchResults };
      
      // Merge with existing descriptions and save after each batch for safety
      const mergedDescriptions = { ...existingDescriptions, ...allBatchResults };
      
      // Save data after each batch
      saveData(mergedDescriptions, propertyData, batchResults);
      
      console.log(`Completed batch ${batchNumber}/${totalBatches}`);
      console.log(`Processed ${Object.keys(allBatchResults).length} properties so far\n`);
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < addressesToProcess.length) {
        console.log('Waiting 5 seconds before processing next batch...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log('\n--- PROCESSING COMPLETE ---');
    console.log(`Successfully processed ${Object.keys(allBatchResults).length} properties`);
    
    // Final count
    const finalMergedDescriptions = { ...existingDescriptions, ...allBatchResults };
    console.log(`Total properties with short descriptions: ${Object.keys(finalMergedDescriptions).length}`);
    
  } catch (error) {
    console.error('Processing failed:', error);
  }
}

// Comment out the proof of concept function call
// processOneBatchForProofOfConcept();

// Run the main processing function to process all remaining properties
processRemainingPropertiesInBatches(); 