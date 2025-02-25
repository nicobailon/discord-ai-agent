/**
 * Cloudflare Workers type definitions
 */

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface VectorizeIndex {
  describe(): Promise<{ name: string }>;
  upsert(vectors: any[]): Promise<any>;
  query(embedding: any, options: any): Promise<any>;
}

export interface CloudflareAI {
  run(model: string, options: any): Promise<any>;
} 