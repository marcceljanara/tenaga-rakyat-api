import { AsyncLocalStorage } from 'async_hooks';

export type RequestContext = {
  requestId?: string;
  traceId?: string;
  userId?: string;
  method?: string;
  path?: string;
  route?: string;
  statusCode?: number;
  durationMs?: number;
};

export class RequestContextService {
  private static readonly storage = new AsyncLocalStorage<RequestContext>();

  static run<T>(context: RequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  static get(): RequestContext {
    return this.storage.getStore() ?? {};
  }

  static set(values: Partial<RequestContext>): void {
    const store = this.storage.getStore();
    if (!store) return;

    Object.assign(store, values);
  }

  static getRequestId(): string | undefined {
    return this.get().requestId;
  }
}
