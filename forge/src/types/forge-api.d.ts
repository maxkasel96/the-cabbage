declare module '@forge/api' {
  export interface ForgeResponse {
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
    text(): Promise<string>;
  }

  export interface RequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }

  interface ForgeApiClient {
    requestConfluence(path: unknown, options?: RequestOptions): Promise<ForgeResponse>;
  }

  interface ForgeApi {
    asApp(): ForgeApiClient;
  }

  const api: ForgeApi;

  export function route(strings: TemplateStringsArray, ...values: unknown[]): unknown;

  export default api;
}
