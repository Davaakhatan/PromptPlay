// Type declarations for jszip (optional dependency)
declare module 'jszip' {
  interface JSZipInstance {
    file(name: string, data: string | Blob | ArrayBuffer): JSZipInstance;
    folder(name: string): JSZipInstance | null;
    generateAsync(options: {
      type: 'blob' | 'base64' | 'string' | 'uint8array' | 'arraybuffer' | 'nodebuffer';
      compression?: string;
      compressionOptions?: { level: number };
    }): Promise<Blob | string | Uint8Array | ArrayBuffer>;
  }

  interface JSZipConstructor {
    new (): JSZipInstance;
  }

  const JSZip: JSZipConstructor;
  export default JSZip;
}
