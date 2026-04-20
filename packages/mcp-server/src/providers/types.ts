export interface GenerateRequest {
  prompt: string;
  negative_prompt?: string;
  width: number;
  height: number;
  seed: number;
  transparency?: boolean;
  reference_images?: string[];
  style_id?: string;
  palette?: string[];
  output_format?: "png" | "webp" | "svg";
  /**
   * Brand LoRA / fine-tune identifier. Forwarded to BFL Flux.2 as `finetune_id`
   * and to SDXL-family providers as `lora`. Ignored by providers without LoRA
   * support (gpt-image-1, Imagen, Ideogram, Recraft).
   */
  lora?: string;
  /** Optional LoRA strength (0.0–1.0). Defaults to 1.0 when not provided. */
  lora_strength?: number;
  [key: string]: unknown;
}

export interface GenerateResult {
  image: Buffer;
  format: "png" | "webp" | "svg" | "jpeg";
  model: string;
  version?: string;
  seed: number;
  raw_response?: unknown;
  provider_revised_prompt?: string;
  native_rgba: boolean;
  native_svg: boolean;
}

export interface Provider {
  name: string;
  supportsModel(modelId: string): boolean;
  isAvailable(): boolean;
  generate(modelId: string, req: GenerateRequest): Promise<GenerateResult>;
}

export class ProviderError extends Error {
  constructor(
    public provider: string,
    public modelId: string,
    message: string,
    public cause_?: unknown
  ) {
    super(`[${provider}/${modelId}] ${message}`);
    this.name = "ProviderError";
  }
}
