import { Anthropic } from '@anthropic-ai/sdk';
import prompts from './prompts.json';
import { CaptionResponse } from './types';

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

    // Extract only the needed fields from property details
    const filteredDetails = {
      details: propertyDetails.details || [],
      landArea: propertyDetails.landArea || '',
      buildArea: propertyDetails.buildArea || '',
      tags: propertyDetails.tags || []
    };

    // Format the data for the prompt
    const formattedPropertyDetails = JSON.stringify(filteredDetails, null, 2);
    console.log('Filtered property details:', formattedPropertyDetails);
    
    // Replace placeholder in prompt template with filtered property details
    const userPrompt = prompts.captionGenerator.userPrompt.replace(
      '{propertyDetails}', 
      formattedPropertyDetails
    );

    console.log('Calling Anthropic API with filtered property details');
    
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