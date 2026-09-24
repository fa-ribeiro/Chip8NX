import { MemoryImage } from "@chip8nx/core";

/**
 * Minimal binary source required by the Web ROM loader.
 *
 * Browser {@link File} objects satisfy this contract directly.
 */
export interface WebRomSource {
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * Reads ROM bytes for the Web host while ensuring that only the latest load
 * request may complete.
 *
 * Older requests are allowed to finish at the browser level, but their result
 * or failure is ignored once a newer request has started.
 */
export class WebRomLoader {
  private latestRequest = 0;

  public async load(source: WebRomSource): Promise<MemoryImage | undefined> {
    const request = ++this.latestRequest;

    try {
      const bytes = new Uint8Array(await source.arrayBuffer());

      if (request !== this.latestRequest) {
        return undefined;
      }

      return new MemoryImage(bytes);
    } catch (error) {
      if (request !== this.latestRequest) {
        return undefined;
      }

      throw error;
    }
  }
}
