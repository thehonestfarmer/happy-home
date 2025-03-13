import axios from 'axios';
import prompts from './prompts.json';
import { AnthropicRequestBody, AnthropicResponse, CaptionResponse } from './types';

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

    // Replace placeholder in prompt template with actual property details
    const formattedPropertyDetails = JSON.stringify(propertyDetails, null, 2);
    console.log('Formatted property details:', formattedPropertyDetails);
    const userPrompt = prompts.captionGenerator.userPrompt.replace(
      '{propertyDetails}', 
      formattedPropertyDetails
    );

    console.log('Calling Anthropic API with property details');
    
    // Create request body with proper typing
    const requestBody: AnthropicRequestBody = {
      model: "claude-3-7-sonnet-20250219",
      system: prompts.captionGenerator.systemPrompt,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    };
    
    // Call Anthropic API
    const response = await axios.post<AnthropicResponse>(
      'https://api.anthropic.com/v1/messages',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2024-04-01'
        }
      }
    );

    console.log('Received response from Anthropic API');
    console.log('Response:', response.data);
    
    // Parse the response to extract generated caption and hashtags
    const responseContent = response.data.content[0].text;
    console.log('Raw response content:', responseContent);
    
    try {
      // Try multiple approaches to extract valid JSON
      let parsedResponse;
      
      // Approach 1: Extract JSON using regex
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
          console.log('Successfully parsed JSON using regex approach');
        } catch (e) {
          console.log('Regex matched content but it was not valid JSON:', jsonMatch[0]);
        }
      }
      
      // Approach 2: Try to parse the entire response as JSON
      if (!parsedResponse) {
        try {
          parsedResponse = JSON.parse(responseContent);
          console.log('Successfully parsed entire response as JSON');
        } catch (e) {
          console.log('Could not parse entire response as JSON');
        }
      }
      
      // Approach 3: Look for markdown code blocks that might contain JSON
      if (!parsedResponse) {
        const codeBlockMatch = responseContent.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          try {
            parsedResponse = JSON.parse(codeBlockMatch[1]);
            console.log('Successfully extracted JSON from markdown code block');
          } catch (e) {
            console.log('Code block did not contain valid JSON');
          }
        }
      }
      
      if (!parsedResponse) {
        console.log(parsedResponse);
        throw new Error('No valid JSON found in response after trying multiple parsing methods');
      }
      
      // Validate the parsed response has the expected properties
      if (!parsedResponse.caption || !Array.isArray(parsedResponse.hashtags)) {
        console.error('Response missing required fields:', parsedResponse);
        throw new Error('Response is missing required caption or hashtags fields');
      }
      
      return {
        caption: parsedResponse.caption,
        hashtags: parsedResponse.hashtags
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse AI response');
    }
  } catch (error) {
    console.error('Error generating caption:', error);
    throw error;
  }
} 