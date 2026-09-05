// Type declarations for Deno environment in Supabase Edge Functions
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
  }
  export const env: Env;
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "https://*" {
  export const serve: any;
  export const createClient: any;
  const content: any;
  export default content;
}
