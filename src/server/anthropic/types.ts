/**
 * Type definitions for the Anthropic API
 */

export interface AnthropicMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AnthropicRequestBody {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  system?: string;
}

export interface AnthropicContent {
  type: 'text';
  text: string;
}

export interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContent[];
  model: string;
  stop_reason: string;
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Response structure from the caption generation function
 */
export interface CaptionResponse {
  caption: string;
  hashtags: string[];
}

/**
 * Response structure from the batch caption generation function
 */
export interface BatchCaptionResponse {
  [address: string]: {
    caption: string;
    hashtags: string[];
  };
}

/**
 * Response structure from the short description generation function
 */
export interface ShortDescriptionResponse {
  [address: string]: {
    shortDescription: string;
  };
}

/**
 * Response structure from the title generation function
 */
export interface TitleResponse {
  titles: string[];
}

export interface CaptionGenerationRequest {
  listingId: string;
}

export interface CaptionGenerationResponse {
  success: boolean;
  data?: CaptionResponse;
  error?: string;
} 