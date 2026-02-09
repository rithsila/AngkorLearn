import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../../config/env.js';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
async function ensureDir(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

export async function saveFile(
  data: Buffer,
  originalFilename: string,
  userId: string
): Promise<string> {
  // Create unique filename
  const ext = path.extname(originalFilename);
  const hash = crypto.randomBytes(16).toString('hex');
  const filename = `${userId}-${Date.now()}-${hash}${ext}`;
  
  // Create user directory
  const userDir = path.join(UPLOAD_DIR, userId);
  await ensureDir(userDir);
  
  const filePath = path.join(userDir, filename);
  
  // Save file
  await fs.writeFile(filePath, data);
  
  // Return relative URL
  return `/uploads/${userId}/${filename}`;
}

export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    const filePath = path.join(process.cwd(), fileUrl);
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Failed to delete file:', error);
  }
}

export async function getFileUrl(relativePath: string): Promise<string> {
  // For local storage, just return the path
  // For cloud storage, this would generate a signed URL
  return `${env.API_URL}${relativePath}`;
}

export async function readFile(fileUrl: string): Promise<Buffer> {
  const filePath = path.join(process.cwd(), fileUrl);
  return fs.readFile(filePath);
}
