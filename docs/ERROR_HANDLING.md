# Error Handling Strategy

This document outlines the error handling approach used in the Discord AI Agent.

## Core Principles

1. **Centralized Error Handling** - Common error handling logic is centralized in the `error-handler.ts` utility to ensure consistent behavior across the application.

2. **Graceful Degradation** - The system is designed to continue functioning even when components fail. If a specific service is unavailable, the bot still responds with helpful fallback messages.

3. **Meaningful Error Messages** - User-facing error messages are clear and actionable, while sensitive technical details are only included in logs.

4. **Comprehensive Logging** - Errors are logged with rich context to aid in debugging and troubleshooting.

5. **Retry Logic** - Transient failures (like network issues) are handled with retry logic using exponential backoff.

## Error Handling Components

### ApiError Class

A custom error class that extends the standard Error to include additional fields relevant to API errors:

```typescript
class ApiError extends Error {
  status?: number;      // HTTP status code
  code?: string;        // API-specific error code
  details?: any;        // Additional error details
}
```

### Error Logging

```typescript
logError(service, operation, error, additionalContext)
```

A standardized logging function that ensures errors are logged with consistent formatting and context.

### Error Formatting

```typescript
formatErrorMessage(service, operation, error, includeDetails)
```

Formats user-facing error messages with appropriate level of detail.

### API Error Handling

```typescript
handleApiError<T>(service, operation, error, additionalContext)
```

Combines logging and formatting to provide a consistent error response.

### Retry Logic

```typescript
retryWithBackoff<T>(fn, maxRetries, initialDelay)
```

Executes a function with retry logic using exponential backoff to handle transient failures.

### Response Parsing

```typescript
parseApiErrorResponse(response)
```

Extracts structured error information from API responses.

## API-Specific Error Handling

Each API service (Gemini, Perplexity, fal.ai) implements these patterns:

1. **Request Validation** - Input validation before making API calls
2. **Response Validation** - Checking response structure before processing
3. **Specific Error Types** - Handling known error scenarios (rate limiting, service outages)
4. **Fallbacks** - Providing sensible defaults when services fail

## Example Usage

```typescript
try {
  const response = await retryWithBackoff(async () => {
    const res = await fetch('https://api.example.com/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      throw await parseApiErrorResponse(res);
    }
    
    return res;
  }, 2); // Retry up to 2 times
  
  // Process successful response
  
} catch (error) {
  return handleApiError<ResponseType>(
    'ServiceName', 
    'operation description',
    error,
    { contextData: relevantContext }
  );
}
```

## Error Handling in Chained API Calls

For operations requiring multiple API calls (like when Gemini uses tools), the error handling strategy follows this hierarchy:

1. **Individual Call Errors** - Handled at the lowest level
2. **Process/Chain Errors** - Handled with fallback logic
3. **User Experience** - User is informed appropriately while still receiving partial results when possible
