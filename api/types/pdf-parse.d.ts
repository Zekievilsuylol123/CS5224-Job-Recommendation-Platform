declare module 'pdf-parse' {
  import type { Buffer } from 'node:buffer';

  interface PDFParseResult {
    numpages?: number;
    numrender?: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
    text: string;
    version?: string;
  }

  function pdfParse(data: Buffer | Uint8Array, options?: Record<string, unknown>): Promise<PDFParseResult>;

  export = pdfParse;
}
