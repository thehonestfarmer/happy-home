import { generateBatchCaptions } from './api';
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
    
    // Extract relevant property details for caption generation
    batchData[address] = {
      aboutProperty: property.aboutProperty || null,
      propertyTitle: property.propertyTitle || null,
      address: address,
      price: property.price || null,
      buildSqMeters: property.buildSqMeters || null,
      landSqMeters: property.landSqMeters || null,
      layout: property.layout || null,
      buildDate: property.buildDate || null,
      listingDetail: property.listingDetail || null,
      tags: property.tags ? property.tags.split(',').map((tag: string) => tag.trim()) : [],
      facilities: property.facilities || null,
      schools: property.schools || null
    };
  }
  
  return batchData;
}

// Process a batch of properties and generate captions with a single API call
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
    const batchResults = await generateBatchCaptions(batchData);
    
    // Convert the results to the expected format
    const formattedResults: Record<string, { propertyCaption: string, hashTags: string }> = {};
    
    for (const [address, result] of Object.entries(batchResults)) {
      formattedResults[address] = {
        propertyCaption: result.caption,
        hashTags: result.hashtags.join(', ')
      };
      console.log(`Successfully generated caption for: ${address}`);
      // Print a short preview of the generated caption
      console.log(`Caption preview: ${result.caption.substring(0, 100)}...`);
    }
    
    console.log('\n--- BATCH CAPTION GENERATION COMPLETE ---');
    console.log(`Generated captions for ${Object.keys(formattedResults).length} properties in this batch`);
    
    return formattedResults;
  } catch (error) {
    console.error(`Error processing batch ${batchNumber}:`, error);
    return {};
  }
}

// Load existing data
function loadExistingData() {
  // Load existing captions if available
  let existingCaptions: Record<string, { propertyCaption: string, hashTags: string }> = {};
  const existingCaptionsPath = path.resolve(process.cwd(), 'property-captions.json');
  if (fs.existsSync(existingCaptionsPath)) {
    try {
      const existingData = fs.readFileSync(existingCaptionsPath, 'utf8');
      existingCaptions = JSON.parse(existingData);
      console.log(`Loaded existing captions for ${Object.keys(existingCaptions).length} properties`);
    } catch (error) {
      console.warn('Failed to load existing captions, creating new file');
    }
  }
  
  return { existingCaptions, existingCaptionsPath };
}

// Save data to files
function saveData(mergedCaptions: Record<string, { propertyCaption: string, hashTags: string }>, propertyData: Record<string, any>, newCaptions: Record<string, { propertyCaption: string, hashTags: string }>) {
  const existingCaptionsPath = path.resolve(process.cwd(), 'property-captions.json');
  fs.writeFileSync(existingCaptionsPath, JSON.stringify(mergedCaptions, null, 2));
  console.log(`Captions written to: ${existingCaptionsPath} (total: ${Object.keys(mergedCaptions).length} properties)`);
  
  // Load existing merged data if available
  let existingMergedData: Record<string, any> = { ...propertyData };
  const mergedDataPath = path.resolve(process.cwd(), 'public/batch_test_results_with_captions.json');
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
  for (const [address, captionData] of Object.entries(newCaptions)) {
    if (mergedData[address]) {
      mergedData[address] = {
        ...mergedData[address],
        ...captionData
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
    const allAddresses = Object.keys(propertyData);
    const batchSize = 6; // Process 6 properties at once
    
    // Load existing captions
    const { existingCaptions } = loadExistingData();
    const existingCaptionKeys = Object.keys(existingCaptions);
    
    console.log(`Total properties in data: ${allAddresses.length}`);
    console.log(`Properties with existing captions: ${existingCaptionKeys.length}`);
    
    // Identify mock captions to be replaced
    const mockCaptionAddresses = existingCaptionKeys.filter(address => {
      const caption = existingCaptions[address];
      return caption.propertyCaption.includes('Mock caption') || 
             caption.hashTags.includes('MockTag') ||
             caption.hashTags.includes('NoAPICall') ||
             caption.hashTags.includes('DebugMode');
    });
    
    console.log(`Found ${mockCaptionAddresses.length} mock captions that will be replaced`);
    
    // Filter out addresses that already have REAL captions (not mocks)
    const addressesToProcess = allAddresses.filter(address => 
      !existingCaptionKeys.includes(address) || mockCaptionAddresses.includes(address)
    );
    
    console.log(`Properties needing captions: ${addressesToProcess.length}`);
    
    // If no properties need processing, exit
    if (addressesToProcess.length === 0) {
      console.log('No remaining properties to process. All properties have captions.');
      return;
    }
    
    const totalBatches = Math.ceil(addressesToProcess.length / batchSize);
    console.log(`Will process ${addressesToProcess.length} properties in ${totalBatches} batches\n`);
    
    // Process each batch
    let allBatchResults: Record<string, { propertyCaption: string, hashTags: string }> = {};
    
    for (let i = 0; i < addressesToProcess.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batchAddresses = addressesToProcess.slice(i, i + batchSize);
      
      console.log(`\nBatch ${batchNumber}/${totalBatches}: Processing ${batchAddresses.length} properties`);
      console.log(`Addresses in this batch:`, batchAddresses);
      
      // Process the batch
      const batchResults = await processBatch(propertyData, batchAddresses, batchNumber);
      
      // Merge batch results
      allBatchResults = { ...allBatchResults, ...batchResults };
      
      // Merge with existing captions and save after each batch for safety
      // For mock captions, the new results will replace the mocks
      const mergedCaptions = { ...existingCaptions, ...allBatchResults };
      
      // Save data after each batch
      saveData(mergedCaptions, propertyData, batchResults);
      
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
    const finalMergedCaptions = { ...existingCaptions, ...allBatchResults };
    console.log(`Total properties with captions: ${Object.keys(finalMergedCaptions).length}`);
    console.log(`Properties remaining without captions: ${allAddresses.length - Object.keys(finalMergedCaptions).length}`);
    
  } catch (error) {
    console.error('Processing failed:', error);
  }
}

// Run the processor
processAllRemainingProperties(); 