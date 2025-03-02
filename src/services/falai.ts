/**
 * fal.ai API Service
 * Handles interactions with fal.ai API for image generation
 */

import { ApiResponse, FalImageGenerationParams, FalImageResult } from '../types';
import { 
  handleApiError, 
  retryWithBackoff, 
  parseApiErrorResponse, 
  logError 
} from '../utils/error-handler';

/**
 * Generate an image using fal.ai's Stable Diffusion 3.5 Large model
 * @param {string} prompt - The image generation prompt
 * @param {string} apiKey - fal.ai API key
 * @returns {Promise<ApiResponse<FalImageResult>>} - The generated image data
 */
export async function generateHighQualityImage(prompt: string, apiKey: string): Promise<ApiResponse<FalImageResult>> {
  return generateImage(prompt, 'sd-3.5-large', apiKey);
}

/**
 * Generate an image quickly using fal.ai's Stable Diffusion 3.5 Turbo model
 * @param {string} prompt - The image generation prompt
 * @param {string} apiKey - fal.ai API key
 * @returns {Promise<ApiResponse<FalImageResult>>} - The generated image data
 */
export async function generateFastImage(prompt: string, apiKey: string): Promise<ApiResponse<FalImageResult>> {
  return generateImage(prompt, 'sd-3.5-turbo', apiKey);
}

/**
 * Generate an image using fal.ai's FLUX model
 * @param {string} prompt - The image generation prompt
 * @param {string} apiKey - fal.ai API key
 * @returns {Promise<ApiResponse<FalImageResult>>} - The generated image data
 */
export async function generateFluxImage(prompt: string, apiKey: string): Promise<ApiResponse<FalImageResult>> {
  return generateImage(prompt, 'flux', apiKey);
}

/**
 * Base function to generate an image using fal.ai API
 * @param {string} prompt - The image generation prompt
 * @param {string} model - The model to use (sd-3.5-large, sd-3.5-turbo, or flux)
 * @param {string} apiKey - fal.ai API key
 * @returns {Promise<ApiResponse<FalImageResult>>} - The generated image data
 */
async function generateImage(prompt: string, model: 'sd-3.5-large' | 'sd-3.5-turbo' | 'flux', apiKey: string): Promise<ApiResponse<FalImageResult>> {
  try {
    // Determine the endpoint and parameters based on the model
    let endpoint: string;
    let payload: FalImageGenerationParams;
    
    switch (model) {
      case 'sd-3.5-large':
        endpoint = 'https://api.fal.ai/v1/stable-diffusion-3.5-large';
        payload = {
          prompt: prompt,
          image_size: "1024x1024",
          num_inference_steps: 25,
          guidance_scale: 7.5
        };
        break;
      case 'sd-3.5-turbo':
        endpoint = 'https://api.fal.ai/v1/stable-diffusion-3.5-turbo';
        payload = {
          prompt: prompt,
          image_size: "1024x1024",
          num_inference_steps: 4,
          guidance_scale: 7.5
        };
        break;
      case 'flux':
        endpoint = 'https://api.fal.ai/v1/flux';
        payload = {
          prompt: prompt,
          image_size: "1024x1024"
        };
        break;
      default:
        throw new Error(`Unsupported model: ${model}`);
    }
    
    // Make the API request with retry logic
    const response = await retryWithBackoff(async () => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        throw await parseApiErrorResponse(res);
      }
      
      return res;
    }, 2); // Retry up to 2 times (3 attempts total)
    
    const data = await response.json() as FalImageResult;
    return {
      error: false,
      data: data
    };
  } catch (error) {
    return handleApiError<FalImageResult>(
      'fal.ai', 
      'generating image', 
      error,
      { model, promptLength: prompt.length }
    );
  }
}

/**
 * Validate the image URL from the fal.ai response
 * @param {FalImageResult} data - The image generation result
 * @returns {string | null} - The validated image URL or null if not found
 */
function validateImageUrl(data: FalImageResult): string | null {
  if (!data) return null;
  
  // Extract the image URL from the response
  // Note: The actual response structure may vary based on the fal.ai API
  const imageUrl = data.images?.[0]?.url || data.image?.url || data.url;
  
  // Validate that the URL is properly formed
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
    logError('fal.ai', 'validating image URL', new Error('Invalid image URL format'), { data });
    return null;
  }
  
  return imageUrl;
}

/**
 * Format the image generation response for Discord
 * @param {ApiResponse<FalImageResult>} result - The image generation result
 * @param {string} prompt - The original prompt
 * @returns {Object} - Formatted response for Discord
 */
export function formatImageResponse(result: ApiResponse<FalImageResult>, prompt: string): { content: string; embeds?: any[] } {
  if (result.error) {
    return {
      content: `**Image Generation Error**: ${result.message}`
    };
  }
  
  if (!result.data) {
    return {
      content: "**Error**: No data returned from image generation."
    };
  }
  
  const imageUrl = validateImageUrl(result.data);
  
  if (!imageUrl) {
    return {
      content: "**Error**: Could not extract a valid image URL from the response."
    };
  }
  
  return {
    content: `**Generated image for**: ${prompt}`,
    embeds: [
      {
        title: "AI Generated Image",
        image: {
          url: imageUrl
        }
      }
    ]
  };
}
