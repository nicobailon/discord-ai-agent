/**
 * Perplexity API Service
 * Handles interactions with Perplexity API for web search and information retrieval
 */

import { 
  ApiResponse, 
  PerplexityResult, 
  PerplexitySearchParams, 
  PerplexityResearchParams 
} from '../types';
import { 
  handleApiError, 
  retryWithBackoff, 
  parseApiErrorResponse 
} from '../utils/error-handler';

/**
 * Perform a standard search using Perplexity API
 * @param {string} query - The search query
 * @param {string} apiKey - Perplexity API key
 * @returns {Promise<ApiResponse<PerplexityResult>>} - The search results
 */
export async function performSearch(query: string, apiKey: string): Promise<ApiResponse<PerplexityResult>> {
  try {
    const searchParams: PerplexitySearchParams = {
      query: query,
      max_results: 5,
      include_citations: true,
      highlight_citations: true
    };

    const response = await retryWithBackoff(async () => {
      const res = await fetch('https://api.perplexity.ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(searchParams)
      });

      if (!res.ok) {
        throw await parseApiErrorResponse(res);
      }
      
      return res;
    });

    const data = await response.json() as PerplexityResult;
    return {
      error: false,
      data: data
    };
  } catch (error) {
    return handleApiError<PerplexityResult>(
      'Perplexity', 
      'performing search',
      error, 
      { queryLength: query.length }
    );
  }
}

/**
 * Perform a deep research query using Perplexity API
 * @param {string} query - The research query
 * @param {string} apiKey - Perplexity API key
 * @returns {Promise<ApiResponse<PerplexityResult>>} - The research results
 */
export async function performDeepResearch(query: string, apiKey: string): Promise<ApiResponse<PerplexityResult>> {
  try {
    const researchParams: PerplexityResearchParams = {
      query: query,
      focus: 'comprehensive',
      max_sources: 8,
      include_citations: true,
      highlight_citations: true
    };

    const response = await retryWithBackoff(async () => {
      const res = await fetch('https://api.perplexity.ai/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(researchParams)
      });

      if (!res.ok) {
        throw await parseApiErrorResponse(res);
      }
      
      return res;
    });

    const data = await response.json() as PerplexityResult;
    
    // Validate the response data
    if (!data.answer || typeof data.answer !== 'string') {
      throw new Error('Invalid or empty response from Perplexity API');
    }
    
    return {
      error: false,
      data: data
    };
  } catch (error) {
    return handleApiError<PerplexityResult>(
      'Perplexity', 
      'conducting research',
      error,
      { queryLength: query.length }
    );
  }
}

/**
 * Format Perplexity search results for Discord
 * @param {ApiResponse<PerplexityResult>} results - The search results from Perplexity
 * @returns {string} - Formatted results for Discord message
 */
export function formatSearchResults(results: ApiResponse<PerplexityResult>): string {
  if (results.error) {
    return `**Search Error**: ${results.message}`;
  }

  if (!results.data) {
    return '**Search Error**: No data returned from search.';
  }

  const { answer, citations, query } = results.data;
  
  if (!answer || typeof answer !== 'string') {
    return '**Search Error**: Invalid or missing answer in the response.';
  }
  
  let formattedResult = `**Search Results for**: ${query}\n\n${answer}\n\n`;
  
  if (citations && Array.isArray(citations) && citations.length > 0) {
    formattedResult += '**Sources**:\n';
    citations.forEach((citation, index) => {
      // Validate citation format before including
      if (citation && citation.title && citation.url) {
        formattedResult += `${index + 1}. [${citation.title}](${citation.url})\n`;
      }
    });
  }
  
  return formattedResult;
}

/**
 * Format Perplexity research results for Discord
 * @param {ApiResponse<PerplexityResult>} results - The research results from Perplexity
 * @returns {string} - Formatted results for Discord message
 */
export function formatResearchResults(results: ApiResponse<PerplexityResult>): string {
  if (results.error) {
    return `**Research Error**: ${results.message}`;
  }

  if (!results.data) {
    return '**Research Error**: No data returned from research.';
  }

  const { answer, citations, query } = results.data;
  
  if (!answer || typeof answer !== 'string') {
    return '**Research Error**: Invalid or missing answer in the response.';
  }
  
  let formattedResult = `**Deep Research Results for**: ${query}\n\n${answer}\n\n`;
  
  if (citations && Array.isArray(citations) && citations.length > 0) {
    formattedResult += '**Sources**:\n';
    citations.forEach((citation, index) => {
      // Validate citation format before including
      if (citation && citation.title && citation.url) {
        formattedResult += `${index + 1}. [${citation.title}](${citation.url})\n`;
      }
    });
  }
  
  // Truncate if the message is too long for Discord
  if (formattedResult.length > 2000) {
    const truncationMessage = '\n\n... (results truncated due to Discord message size limits)';
    formattedResult = formattedResult.substring(0, 2000 - truncationMessage.length) + truncationMessage;
  }
  
  return formattedResult;
}
