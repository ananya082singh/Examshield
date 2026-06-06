import { encryptBuffer, decryptBuffer, generateHash } from './services/crypto';
import { generateWatermarkSignature } from './services/watermark';

const runTests = () => {
  console.log('==================================================');
  console.log('🛡️  EXAMSHIELD SECURITY ARCHITECTURE VERIFICATION  🛡️');
  console.log('==================================================\n');

  let passes = 0;
  let failures = 0;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      console.log(` ✅ PASS: ${testName}`);
      passes++;
    } else {
      console.log(` ❌ FAIL: ${testName}`);
      failures++;
    }
  };

  try {
    // ----------------------------------------------------
    // Test 1: AES-256-GCM Encryption & Decryption
    // ----------------------------------------------------
    console.log('Testing AES-256-GCM Cryptographic Pipeline...');
    const originalText = 'CONFIDENTIAL EXAM PAPER CONTENT - DO NOT LEAK';
    const originalBuffer = Buffer.from(originalText, 'utf-8');

    const encrypted = encryptBuffer(originalBuffer);
    assert(encrypted.iv.length === 24, 'Initialization Vector (IV) is 12 bytes (24 hex characters)');
    assert(encrypted.tag.length === 32, 'Authentication tag is 16 bytes (32 hex characters)');
    assert(!encrypted.encryptedBuffer.equals(originalBuffer), 'Ciphertext buffer is fully scrambled');

    const decrypted = decryptBuffer(encrypted.encryptedBuffer, encrypted.iv, encrypted.tag);
    assert(decrypted.toString('utf-8') === originalText, 'Decryption reproduces exact plaintext content');

    // ----------------------------------------------------
    // Test 2: GCM Tampering / Authenticated Decryption
    // ----------------------------------------------------
    console.log('\nTesting GCM Integrity Verification...');
    let tamperedTag = encrypted.tag;
    // Alter the last character of the tag
    tamperedTag = tamperedTag.substring(0, 31) + (tamperedTag[31] === '0' ? '1' : '0');
    
    let decryptionFailed = false;
    try {
      decryptBuffer(encrypted.encryptedBuffer, encrypted.iv, tamperedTag);
    } catch (e) {
      decryptionFailed = true;
    }
    assert(decryptionFailed, 'Decryption fails with Auth Tag mismatch if cipher tags are altered');

    // ----------------------------------------------------
    // Test 3: SHA-256 Hash Matching
    // ----------------------------------------------------
    console.log('\nTesting SHA-256 Document Integrity...');
    const originalHash = generateHash(originalBuffer);
    const decryptedHash = generateHash(decrypted);
    assert(originalHash === decryptedHash, 'SHA-256 hash matches before and after encryption');

    const modifiedBuffer = Buffer.from(originalText + ' TAMPERED', 'utf-8');
    const modifiedHash = generateHash(modifiedBuffer);
    assert(originalHash !== modifiedHash, 'SHA-256 detects modification in content');

    // ----------------------------------------------------
    // Test 4: HMAC Signed Watermark Signatures
    // ----------------------------------------------------
    console.log('\nTesting Watermark Anti-Forgery HMAC Signatures...');
    const watermarkId = 'ES-A92B104F';
    const centerCode = 'NHS-782';
    const timestamp = new Date().toISOString();

    const signature1 = generateWatermarkSignature(watermarkId, centerCode, timestamp);
    const signature2 = generateWatermarkSignature(watermarkId, centerCode, timestamp);
    assert(signature1 === signature2, 'HMAC signature is deterministic for the same parameters');

    const tamperedCenter = 'NHS-999';
    const signatureTampered = generateWatermarkSignature(watermarkId, tamperedCenter, timestamp);
    assert(signature1 !== signatureTampered, 'HMAC signature detects changes in metadata properties');

  } catch (error) {
    console.error('Test runner encountered unexpected error:', error);
    failures++;
  }

  console.log('\n==================================================');
  console.log(`VERIFICATION SUMMARY: ${passes} PASS | ${failures} FAIL`);
  console.log('==================================================');

  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runTests();
