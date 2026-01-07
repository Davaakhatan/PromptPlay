/**
 * RPC Manager
 * Remote Procedure Call system for multiplayer games
 */

import { NetworkManager } from './NetworkManager';
import { createMessage, RPCCallMessage, RPCResponseMessage } from './messages';

export type RPCHandler = (...args: unknown[]) => unknown | Promise<unknown>;

interface PendingCall {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class RPCManager {
  private network: NetworkManager;
  private handlers: Map<string, RPCHandler> = new Map();
  private pendingCalls: Map<string, PendingCall> = new Map();
  private callTimeout: number;

  constructor(network: NetworkManager, options?: { callTimeout?: number }) {
    this.network = network;
    this.callTimeout = options?.callTimeout ?? 10000;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.network.on('rpc_call', async (msg) => {
      await this.handleRPCCall(msg as RPCCallMessage);
    });

    this.network.on('rpc_response', (msg) => {
      this.handleRPCResponse(msg as RPCResponseMessage);
    });
  }

  /**
   * Register an RPC handler
   */
  register(method: string, handler: RPCHandler): () => void {
    this.handlers.set(method, handler);
    return () => this.handlers.delete(method);
  }

  /**
   * Unregister an RPC handler
   */
  unregister(method: string): void {
    this.handlers.delete(method);
  }

  /**
   * Call a remote procedure on the server
   */
  callServer<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
    return this.call<T>(method, args, 'server');
  }

  /**
   * Call a remote procedure on all clients
   */
  callAll<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
    return this.call<T>(method, args, 'all');
  }

  /**
   * Call a remote procedure on other clients (not self)
   */
  callOthers<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
    return this.call<T>(method, args, 'others');
  }

  /**
   * Call a remote procedure on a specific client
   */
  callClient<T = unknown>(clientId: string, method: string, ...args: unknown[]): Promise<T> {
    return this.call<T>(method, args, clientId);
  }

  private call<T>(method: string, args: unknown[], target: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const callId = `rpc_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const timeout = setTimeout(() => {
        this.pendingCalls.delete(callId);
        reject(new Error(`RPC call '${method}' timed out`));
      }, this.callTimeout);

      this.pendingCalls.set(callId, {
        resolve: resolve as (result: unknown) => void,
        reject,
        timeout,
      });

      this.network.send(createMessage('rpc_call', {
        callId,
        method,
        args,
        target,
      }));
    });
  }

  private async handleRPCCall(msg: RPCCallMessage): Promise<void> {
    const handler = this.handlers.get(msg.method);

    if (!handler) {
      // Unknown method - send error response
      this.network.send(createMessage('rpc_response', {
        callId: msg.callId,
        error: `Unknown RPC method: ${msg.method}`,
      }));
      return;
    }

    try {
      const result = await handler(...msg.args);
      this.network.send(createMessage('rpc_response', {
        callId: msg.callId,
        result,
      }));
    } catch (error) {
      this.network.send(createMessage('rpc_response', {
        callId: msg.callId,
        error: error instanceof Error ? error.message : 'RPC handler error',
      }));
    }
  }

  private handleRPCResponse(msg: RPCResponseMessage): void {
    const pending = this.pendingCalls.get(msg.callId);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingCalls.delete(msg.callId);

    if (msg.error) {
      pending.reject(new Error(msg.error));
    } else {
      pending.resolve(msg.result);
    }
  }

  /**
   * Clear all pending calls
   */
  clearPending(): void {
    for (const [callId, pending] of this.pendingCalls) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('RPC manager cleared'));
    }
    this.pendingCalls.clear();
  }
}
