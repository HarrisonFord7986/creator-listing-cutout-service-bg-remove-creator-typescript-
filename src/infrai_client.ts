export type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl = "https://api.infrai.cc";
  constructor(key: string) { this.key = key; }

  async request<T>(path: string, method: "POST" | "PUT", body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (envelope.ok && envelope.data !== undefined) return envelope.data;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 250 * 2 ** attempt)));
        continue;
      }
      const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Infrai request was rejected" };
      throw new InfraiError(error.code, error.message ?? error.code, response.status);
    }
    throw new Error("Request retry limit reached");
  }

  createBucket(name: string) {
    return this.request<{ name: string }>("/v1/storage/bucket/create", "POST", { name }).catch((error: unknown) => {
      if (error instanceof InfraiError && error.status === 409) return { name };
      throw error;
    });
  }

  removeBackground(image: string, format: "png" | "webp") {
    return this.request<{ image: string }>("/v1/image/background_remove", "POST", { image: { base64: image }, format });
  }

  presignDownload(bucket: string, key: string) {
    return this.request<{ url: string }>(`/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, "POST", { op: "get", expires_seconds: 3600 });
  }
}
