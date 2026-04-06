import { AsyncLocalStorage } from "async_hooks";

const storage = new AsyncLocalStorage<string>();

export function runWithRequestId<T>(id: string, fn: () => T): T {
  return storage.run(id, fn);
}

export function getRequestId(): string | undefined {
  return storage.getStore();
}
