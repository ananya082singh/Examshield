import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env variables
dotenv.config();

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;
export const JWT_SECRET = process.env.JWT_SECRET || 'examshield-jwt-super-secret-key-default-12345';

// AES-256 requires a 32-byte key. We derive it using SHA-256 of the configuration key.
export const MASTER_ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY || 'examshield-master-aes-key-placeholder-32b';

export const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
