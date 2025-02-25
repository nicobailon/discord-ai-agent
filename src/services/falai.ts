/**
 * fal.ai API Service
 * Handles interactions with fal.ai API for image generation
 */

import { ApiResponse, FalImageGenerationParams, FalImageResult } from '../types';

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
    
    // Make the API request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('fal.ai API error:', errorData);
      return {
        error: true,
        message: `Error: ${response.status} - ${response.statusText}`
      };
    }
    
    const data = await response.json() as FalImageResult;
    return {
      error: false,
      data: data
    };
  } catch (error) {
    console.error('Error calling fal.ai API:', error);
    return {
      error: true,
      message: 'An error occurred while generating the image.'
    };
  }
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
  
  // Extract the image URL from the response
  // Note: The actual response structure may vary based on the fal.ai API
  const imageUrl = result.data.images?.[0]?.url || result.data.image?.url || result.data.url;
  
  if (!imageUrl) {
    return {
      content: "**Error**: Could not extract image URL from the response."
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