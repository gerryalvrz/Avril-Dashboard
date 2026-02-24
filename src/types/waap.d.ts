export {};

declare global {
  interface Window {
    waap?: {
      login?: () => Promise<unknown>;
      logout?: () => Promise<unknown>;
      request?: (args: { method: string; params?: unknown[] }) => Promise<any>;
      on?: (event: string, cb: (...args: any[]) => void) => void;
      removeListener?: (event: string, cb: (...args: any[]) => void) => void;
    };
  }
}
