import { Anthropic } from '@anthropic-ai/sdk';
import prompts from './prompts.json';
import { CaptionResponse, TitleResponse, BatchCaptionResponse } from './types';

/**
 * Generate a caption and hashtags for a property listing using Anthropic's Claude API
 * @param propertyDetails - The property listing details
 * @returns Promise with caption and hashtags
 */
export async function generateCaption(propertyDetails: any): Promise<CaptionResponse> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key is not configured');
    }

    // Initialize the official Anthropic SDK client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Format the data for the prompt - include all property details
    const formattedPropertyDetails = JSON.stringify(propertyDetails, null, 2);
    console.log('Property details for caption generation:', formattedPropertyDetails);
    
    // Replace placeholder in prompt template with property details
    const userPrompt = prompts.captionGenerator.userPrompt.replace(
      '{propertyDetails}', 
      formattedPropertyDetails
    );

    console.log('Calling Anthropic API with property details');
    
    // Create message using the SDK with proper message format
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      system: prompts.captionGenerator.systemPrompt,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    console.log('Received response from Anthropic API');
    console.log('Response ID:', response.id);
    
    // Access the response content safely with type checking
    if (response.content.length === 0 || response.content[0].type !== 'text') {
      throw new Error('Unexpected response format from Anthropic API');
    }
    
    // Get the response text
    const responseContent = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('Raw response content:', responseContent);
    
    // Process the text response instead of trying to parse JSON
    try {
      // Extract caption (everything before hashtags)
      const hashtags: string[] = [];
      
      // Find all hashtags in the response
      const hashtagRegex = /#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g;
      const matches = responseContent.match(hashtagRegex) || [];
      
      // Extract hashtags without the # symbol
      matches.forEach(tag => {
        hashtags.push(tag.slice(1)); // Remove the # symbol
      });
      
      // Remove hashtags from the caption
      let caption = responseContent;
      
      // If there are hashtags, remove them from the caption
      if (hashtags.length > 0) {
        // Find the index of the first hashtag
        const firstHashtagIndex = responseContent.indexOf('#');
        if (firstHashtagIndex !== -1) {
          caption = responseContent.substring(0, firstHashtagIndex).trim();
        }
      }
      
      console.log('Extracted caption:', caption);
      console.log('Extracted hashtags:', hashtags);
      
      // Return the extracted caption and hashtags
      return {
        caption,
        hashtags
      };
    } catch (error) {
      console.error('Error processing AI response:', error);
      throw new Error('Failed to process AI response');
    }
  } catch (error) {
    console.error('Error generating caption:', error);
    throw error;
  }
}

/**
 * Generate titles for multiple property listings using Anthropic's Claude API
 * @param propertyListings - Array of property listing details
 * @returns Promise with an array of titles
 */
export async function generateTitles(propertyListings: any[]): Promise<TitleResponse> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key is not configured');
    }

    // Initialize the official Anthropic SDK client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Extract only the needed fields from property listings
    const filteredListings = propertyListings.map(listing => ({
      tags: listing.tags || [],
      price: listing.price || '',
      listingDetail: listing.listingDetail || '',
      aboutProperty: listing.aboutProperty || ''
    }));

    // Format the data for the prompt
    const formattedListings = JSON.stringify(filteredListings, null, 2);
    console.log('Filtered property listings:', formattedListings);
    
    // Replace placeholder in prompt template with filtered property listings
    const userPrompt = prompts.titleGenerator.userPrompt.replace(
      '{propertyListings}', 
      formattedListings
    );

    console.log('Calling Anthropic API with filtered property listings');
    
    // Create message using the SDK with proper message format
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      system: prompts.titleGenerator.systemPrompt,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    console.log('Received response from Anthropic API');
    console.log('Response ID:', response.id);
    
    // Access the response content safely with type checking
    if (response.content.length === 0 || response.content[0].type !== 'text') {
      throw new Error('Unexpected response format from Anthropic API');
    }
    
    // Get the response text
    const responseContent = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('Raw response content:', responseContent);
    
    // Parse the JSON response to extract titles
    try {
      const titles = JSON.parse(responseContent) as string[];
      console.log('Extracted titles:', titles);
      
      return { titles };
    } catch (error) {
      console.error('Error processing AI response:', error);
      throw new Error('Failed to process AI response. Expected a JSON array of titles.');
    }
  } catch (error) {
    console.error('Error generating titles:', error);
    throw error;
  }
}

/**
 * Generate captions for multiple property listings at once using Anthropic's Claude API
 * @param propertiesDetails - Array of property listing details with their addresses as keys
 * @returns Promise with batch of captions and hashtags
 */
export async function generateBatchCaptions(propertiesDetails: Record<string, any>): Promise<BatchCaptionResponse> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key is not configured');
    }

    // Initialize the official Anthropic SDK client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Format the data for the prompt - include all properties details
    const formattedPropertiesDetails = JSON.stringify(propertiesDetails, null, 2);
    console.log('Batch properties details for caption generation (sending multiple properties)');
    console.log(`Processing ${Object.keys(propertiesDetails).length} properties in this batch`);
    
    // Replace placeholder in prompt template with properties details
    const userPrompt = prompts.batchCaptionGenerator.userPrompt.replace(
      '{propertiesDetails}', 
      formattedPropertiesDetails
    );

    console.log('Calling Anthropic API with batch of properties details');
    
    // Create message using the SDK with proper message format
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      system: prompts.batchCaptionGenerator.systemPrompt,
      max_tokens: 4096, // Increased for batch processing
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    console.log('Received response from Anthropic API');
    console.log('Response ID:', response.id);
    
    // Access the response content safely with type checking
    if (response.content.length === 0 || response.content[0].type !== 'text') {
      throw new Error('Unexpected response format from Anthropic API');
    }
    
    // Get the response text
    const responseContent = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Debug: Log the first and last 300 characters of the response
    console.log('\n=== DEBUG: RESPONSE PREVIEW ===');
    console.log('First 300 chars:', responseContent.substring(0, 300));
    console.log('Last 300 chars:', responseContent.substring(responseContent.length - 300));
    console.log('Total response length:', responseContent.length);
    console.log('=== END DEBUG PREVIEW ===\n');
    
    // Write the full response to a file for debugging
    const fs = require('fs');
    const path = require('path');
    const debugPath = path.resolve(process.cwd(), 'anthropic-debug-response.json');
    fs.writeFileSync(debugPath, responseContent);
    console.log(`Full response written to ${debugPath} for debugging`);
    
    // Process the text response to JSON
    try {
      // Try to parse the JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseContent) as Record<string, { caption: string, hashtags: string[] }>;
      } catch (error: any) {
        const jsonError = error as Error;
        console.error('JSON parse error details:', jsonError.message);
        
        // If the error is about unterminated string, log the problematic region
        if (jsonError.message.includes('Unterminated string')) {
          const match = jsonError.message.match(/position (\d+)/);
          if (match) {
            const position = parseInt(match[1]);
            const errorContext = responseContent.substring(
              Math.max(0, position - 100), 
              Math.min(responseContent.length, position + 100)
            );
            console.error('Error context around position:', position);
            console.error(errorContext);
          }
        }
        
        // Try to clean the response and parse again
        console.log('Attempting to clean and repair the JSON response...');
        
        // Basic repair attempt - look for obvious JSON structure and extract it
        const jsonMatch = responseContent.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          const potentialJson = jsonMatch[1];
          console.log('Found potential JSON structure, trying to parse it...');
          try {
            parsedResponse = JSON.parse(potentialJson) as Record<string, { caption: string, hashtags: string[] }>;
            console.log('Successfully parsed JSON after cleanup!');
          } catch (repairError: any) {
            console.error('Still failed to parse JSON after cleanup:', repairError.message);
            throw jsonError; // Throw the original error if repair fails
          }
        } else {
          throw jsonError; // Rethrow the original error if no JSON structure found
        }
      }
      
      console.log('Successfully parsed batch caption response');
      console.log(`Parsed ${Object.keys(parsedResponse).length} property captions`);
      
      return parsedResponse;
    } catch (error) {
      console.error('Error processing AI batch response:', error);
      throw new Error('Failed to process AI batch response. Expected a JSON object with property captions.');
    }
  } catch (error) {
    console.error('Error generating batch captions:', error);
    throw error;
  }
} 