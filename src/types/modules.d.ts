/**
 * Type declarations for external modules
 */

declare module 'itty-router' {
  export interface RouterOptions {
    base?: string;
  }

  export interface RouterRequest extends Request {
    params?: Record<string, string>;
    query?: Record<string, string>;
  }

  export type RouteHandler<T = Response> = (
    request: RouterRequest,
    ...args: any[]
  ) => T | Promise<T>;

  export interface Router {
    handle: (request: Request, ...args: any[]) => Promise<Response>;
    all: (path: string, ...handlers: RouteHandler[]) => Router;
    get: (path: string, ...handlers: RouteHandler[]) => Router;
    post: (path: string, ...handlers: RouteHandler[]) => Router;
    put: (path: string, ...handlers: RouteHandler[]) => Router;
    patch: (path: string, ...handlers: RouteHandler[]) => Router;
    delete: (path: string, ...handlers: RouteHandler[]) => Router;
    head: (path: string, ...handlers: RouteHandler[]) => Router;
    options: (path: string, ...handlers: RouteHandler[]) => Router;
  }

  export function Router(options?: RouterOptions): Router;
}

declare module 'discord-interactions' {
  export function verifyKey(
    rawBody: string,
    signature: string,
    timestamp: string,
    clientPublicKey: string
  ): boolean;

  export enum InteractionType {
    PING = 1,
    APPLICATION_COMMAND = 2,
    MESSAGE_COMPONENT = 3,
    APPLICATION_COMMAND_AUTOCOMPLETE = 4,
    MODAL_SUBMIT = 5,
  }

  export enum InteractionResponseType {
    PONG = 1,
    CHANNEL_MESSAGE_WITH_SOURCE = 4,
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
    DEFERRED_UPDATE_MESSAGE = 6,
    UPDATE_MESSAGE = 7,
    APPLICATION_COMMAND_AUTOCOMPLETE_RESULT = 8,
    MODAL = 9,
  }

  export enum MessageComponentTypes {
    ACTION_ROW = 1,
    BUTTON = 2,
    SELECT_MENU = 3,
  }

  export enum ButtonStyleTypes {
    PRIMARY = 1,
    SECONDARY = 2,
    SUCCESS = 3,
    DANGER = 4,
    LINK = 5,
  }

  export enum ApplicationCommandOptionType {
    SUB_COMMAND = 1,
    SUB_COMMAND_GROUP = 2,
    STRING = 3,
    INTEGER = 4,
    BOOLEAN = 5,
    USER = 6,
    CHANNEL = 7,
    ROLE = 8,
    MENTIONABLE = 9,
    NUMBER = 10,
    ATTACHMENT = 11,
  }
} 