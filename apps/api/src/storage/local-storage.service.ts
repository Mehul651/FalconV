import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class LocalStorageService {
  root() {
    return process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
  }

  async saveDocumentVersion(params: {
    documentId: string;
    version: number;
    originalName: string;
    buffer: Buffer;
  }) {
    const safeName = params.originalName.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const storageKey = `documents/${params.documentId}/v${params.version}-${safeName}`;
    const fullPath = join(this.root(), storageKey);
    await mkdir(join(this.root(), 'documents', params.documentId), { recursive: true });
    await writeFile(fullPath, params.buffer);
    return {
      storageKey,
      fullPath,
      checksum: createHash('sha256').update(params.buffer).digest('hex'),
    };
  }

  async saveImport(params: { originalName: string; buffer: Buffer }) {
    const safeName = params.originalName.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const stamp = Date.now();
    const storageKey = `imports/${stamp}-${safeName}`;
    await mkdir(join(this.root(), 'imports'), { recursive: true });
    await writeFile(join(this.root(), storageKey), params.buffer);
    return {
      storageKey,
      checksum: createHash('sha256').update(params.buffer).digest('hex'),
    };
  }

  resolve(storageKey: string) {
    return join(this.root(), storageKey);
  }
}
