import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { hash } from './db';
import type { Evidence } from './types';
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://127.0.0.1:19000',
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
});
const bucket = 'insurance-evidence';
let initialized: Promise<void> | undefined;
async function ready() {
  initialized ??= (async () => {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  })();
  return initialized;
}
export async function saveFile(
  f: { name: string; data: string; mime: string },
  userId: string,
): Promise<Evidence> {
  if (!f?.name || !f.data) throw new Error('Berkas evidence wajib dilampirkan.');
  const data = Buffer.from(f.data, 'base64');
  if (!data.length || data.length > 8 * 1024 * 1024)
    throw new Error('Ukuran berkas harus 1 byte–8 MB.');
  const ext = f.name.split('.').pop()?.toLowerCase();
  if (!['pdf', 'png', 'jpg', 'jpeg', 'txt', 'csv'].includes(ext || ''))
    throw new Error('Gunakan PDF, PNG, JPG, TXT, atau CSV.');
  const mime: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    txt: 'text/plain',
    csv: 'text/csv',
  };
  const file: Evidence = {
    id: randomUUID(),
    name: f.name.replace(/[\r\n"\\/]/g, '_').slice(0, 180),
    hash: hash(data),
    size: data.length,
    mime: mime[ext!],
    uploadedBy: userId,
    createdAt: new Date().toISOString(),
  };
  await ready();
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: file.id, Body: data, ContentType: file.mime }),
  );
  return file;
}
export async function readFile(id: string) {
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: id }));
  return Buffer.from(await object.Body!.transformToByteArray());
}
