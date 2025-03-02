/**
 * Error handling utilities for the Discord AI Agent
 * Provides consistent error handling, logging, and formatting across the application
 */

import { ApiResponse } from '../types';

/**
 * Custom error class for API-related errors
 */
export class ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;

  constructor(message: string, options?: { status?: number; code?: string; details?: any }) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

/**
 * Standardized error logging with additional context
 * @param {string} service - The service where the error occurred (e.g., 'Gemini', 'Perplexity')
 * @param {string} operation - The operation being performed (e.g., 'API call', 'processing response')
 * @param {Error | unknown} error - The error object
 * @param {any} additionalContext - Any additional context to log
 */
export function logError(
  service: string,
  operation: string,
  error: Error | unknown,
  additionalContext?: any
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  console.error(`[${service}] Error during ${operation}:`, {
    message: errorObj.message,
    stack: errorObj.stack,
    ...(error instanceof ApiError && {
      status: error.status,
      code: error.code,
      details: error.details
    }),
    ...(additionalContext && { context: additionalContext })
  });
}

/**
 * Format API error messages for user display
 * @param {string} service - The service where the error occurred
 * @param {string} operation - What the system was trying to do
 * @param {Error | unknown} error - The error object
 * @param {boolean} includeDetails - Whether to include technical details (default: false)
 * @returns {string} Formatted error message for users
 */
export function formatErrorMessage(
  service: string,
  operation: string,
  error: Error | unknown,
  includeDetails: boolean = false
): string {
  const baseMessage = `I encountered an issue while ${operation}.`;
  
  // For user-facing errors, we don't want to expose too many technical details
  if (!includeDetails) {
    return `${baseMessage} Please try again later.`;
  }
  
  // For debugging or admin-facing errors, include more details
  if (error instanceof ApiError) {
    return `${baseMessage} ${service} API reported: ${error.message}${error.status ? ` (Status: ${error.status})` : ''}`;
  }
  
  return `${baseMessage} Error: ${error instanceof Error ? error.message : String(error)}`;
}

/**
 * Handle API errors with consistent logging and response formatting
 * @param {string} service - The service name (e.g., 'Gemini', 'Perplexity')
 * @param {string} operation - The operation being performed
 * @param {Error | unknown} error - The error that occurred
 * @param {any} additionalContext - Any additional context to log
 * @returns {ApiResponse<T>} A formatted error response
 */
export function handleApiError<T>(
  service: string,
  operation: string,
  error: Error | unknown,
  additionalContext?: any
): ApiResponse<T> {
  // Log the error with context
  logError(service, operation, error, additionalContext);
  
  // Format a user-friendly error message
  const userMessage = formatErrorMessage(service, operation, error);
  
  // Return a standardized API response
  return {
    error: true,
    message: userMessage
  };
}

/**
 * Retry a function with exponential backoff
 * @param {function} fn - The function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise<T>} The result of the function
 * @throws Will throw the last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>, 
  maxRetries: number = 3, 
  initialDelay: number = 300
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate exponential backoff with jitter
      const delay = initialDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
      
      // Wait before the next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Parse API response errors
 * @param {Response} response - The fetch Response object
 * @returns {Promise<ApiError>} An ApiError with the parsed details
 */
export async function parseApiErrorResponse(response: Response): Promise<ApiError> {
  try {
    const contentType = response.headers.get('content-type');
    
    // Try to parse JSON error response
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      
      return new ApiError(
        errorData.error?.message || errorData.message || `API request failed with status ${response.status}`,
        {
          status: response.status,
          code: errorData.error?.code || errorData.code,
          details: errorData
        }
      );
    }
    
    // Try to get text error response
    const errorText = await response.text();
    return new ApiError(`API request failed with status ${response.status}${errorText ? `: ${errorText}` : ''}`, {
      status: response.status
    });
  } catch (error) {
    // If we can't parse the error response, return a generic error
    return new ApiError(`API request failed with status ${response.status}`, {
      status: response.status
    });
  }
}
