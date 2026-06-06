import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import prisma from '../services/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { encryptBuffer, decryptBuffer, generateHash } from '../services/crypto';
import { applyWatermark } from '../services/watermark';
import { checkDownloadFrequency } from '../services/alerts';
import { UPLOADS_DIR } from '../config';

// Configure multer for memory storage so we never write unencrypted PDFs to disk
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
}).single('file');

/**
 * Encrypt and upload an exam paper
 */
export const uploadPaper = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { examId, centerIds } = req.body; // centerIds will be passed as JSON string or array
  const file = req.file;

  try {
    if (!examId || !file) {
      res.status(400).json({ error: 'Exam ID and PDF file are required' });
      return;
    }

    // Parse centerIds
    let assignedCenters: string[] = [];
    if (centerIds) {
      try {
        assignedCenters = typeof centerIds === 'string' ? JSON.parse(centerIds) : centerIds;
      } catch (err) {
        res.status(400).json({ error: 'Invalid centerIds format. Must be a JSON array.' });
        return;
      }
    }

    // Check if exam exists
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      res.status(404).json({ error: 'Exam not found' });
      return;
    }

    // Check if exam already has a paper
    const existingPaper = await prisma.paper.findUnique({ where: { examId } });
    if (existingPaper) {
      res.status(400).json({ error: 'This exam already has a paper uploaded' });
      return;
    }

    // Encrypt PDF buffer in memory
    const { encryptedBuffer, iv, tag } = encryptBuffer(file.buffer);
    const hash = generateHash(file.buffer);

    // Generate unique ID for Paper
    const paperId = crypto.randomUUID();
    const encryptedFileName = `${paperId}.enc`;
    const encryptedFilePath = path.join(UPLOADS_DIR, encryptedFileName);

    // Write encrypted buffer to secure local directory
    fs.writeFileSync(encryptedFilePath, encryptedBuffer);

    // Save Paper metadata to DB
    const paper = await prisma.paper.create({
      data: {
        id: paperId,
        examId,
        originalFileName: file.originalname,
        encryptedPath: encryptedFilePath,
        hash,
        aesIv: iv,
        aesTag: tag,
        uploadedBy: req.user?.email || 'SYSTEM',
        assignments: {
          create: assignedCenters.map(centerId => ({
            centerId
          }))
        }
      },
      include: {
        assignments: {
          include: { center: true }
        }
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'PAPER_UPLOADED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Uploaded & encrypted paper: ${file.originalname} for Exam: ${exam.name} (ID: ${examId})`
      }
    });

    res.status(201).json({
      message: 'Paper uploaded and encrypted successfully',
      paper: {
        id: paper.id,
        examId: paper.examId,
        originalFileName: paper.originalFileName,
        hash: paper.hash,
        uploadedBy: paper.uploadedBy,
        createdAt: paper.createdAt,
        assignments: paper.assignments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Decrypt, watermark, and stream the PDF paper
 */
export const downloadPaper = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const user = req.user;
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip || req.socket.remoteAddress || null;

  try {
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Retrieve paper, including the associated exam details
    const paper = await prisma.paper.findUnique({
      where: { id },
      include: {
        exam: true,
        assignments: true
      }
    });

    if (!paper) {
      res.status(404).json({ error: 'Exam paper not found' });
      return;
    }

    const { exam, assignments } = paper;

    // 1. Authorization checks
    if (user.role === 'CENTER_ADMIN') {
      if (!user.centerId) {
        res.status(403).json({ error: 'Center Admin is not associated with any center' });
        return;
      }

      const isAssigned = assignments.some(a => a.centerId === user.centerId);
      if (!isAssigned) {
        // Record unauthorized access attempt
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'UNAUTHORIZED_ACCESS',
            ipAddress,
            userAgent,
            details: `Center Admin tried accessing paper ${id} not assigned to their Center (${user.centerId})`
          }
        });
        res.status(403).json({ error: 'Access denied: Paper not assigned to your center' });
        return;
      }

      // 2. Time-lock check
      const now = new Date();
      if (now < exam.startTime) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'UNAUTHORIZED_ACCESS',
            ipAddress,
            userAgent,
            details: `Time-locked access blocked: Checked paper ${id} before start time. Start: ${exam.startTime.toISOString()}`
          }
        });
        res.status(403).json({
          error: 'Access locked: The exam paper is not yet available.',
          startTime: exam.startTime
        });
        return;
      }

      if (now > exam.endTime) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'UNAUTHORIZED_ACCESS',
            ipAddress,
            userAgent,
            details: `Time-locked access blocked: Checked paper ${id} after end time. End: ${exam.endTime.toISOString()}`
          }
        });
        res.status(403).json({ error: 'Access expired: The exam paper is no longer available.' });
        return;
      }
    }

    // 3. Read encrypted file from local storage
    if (!fs.existsSync(paper.encryptedPath)) {
      res.status(500).json({ error: 'Encrypted storage file missing on server' });
      return;
    }

    const encryptedData = fs.readFileSync(paper.encryptedPath);

    // 4. Decrypt in memory
    let decryptedBuffer: Buffer;
    try {
      decryptedBuffer = decryptBuffer(encryptedData, paper.aesIv, paper.aesTag);
    } catch (err) {
      res.status(500).json({ error: 'Decryption failed. Storage signature mismatch.' });
      return;
    }

    // 5. Verify integrity (SHA-256 check)
    const decryptedHash = generateHash(decryptedBuffer);
    if (decryptedHash !== paper.hash) {
      res.status(500).json({ error: 'Integrity Check Failed: Decrypted file hash does not match original!' });
      return;
    }

    // 6. Gather center details for watermarking
    let centerName = 'EXAMSHIELD HEADQUARTERS';
    let centerCode = 'HQ001';

    if (user.centerId) {
      const center = await prisma.center.findUnique({ where: { id: user.centerId } });
      if (center) {
        centerName = center.name;
        centerCode = center.code;
      }
    }

    // Generate unique Trace Watermark ID
    const watermarkId = `ES-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Apply PDF watermarking & embed verification QR code
    const watermarkedBuffer = await applyWatermark(decryptedBuffer, {
      centerName,
      centerCode,
      userEmail: user.email,
      watermarkId,
      timestamp: new Date()
    });

    // 7. Write successful download audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PAPER_DOWNLOADED',
        ipAddress,
        userAgent,
        details: JSON.stringify({
          paperId: paper.id,
          watermarkId,
          centerCode,
          centerName
        })
      }
    });

    // 8. Trigger alert checks for rapid downloading
    await checkDownloadFrequency(user.id, paper.id);

    // 9. Stream the watermarked PDF directly inline to browser
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${exam.name.replace(/\s+/g, '_')}_QuestionPaper.pdf"`
    );
    res.send(watermarkedBuffer);
  } catch (error) {
    next(error);
  }
};
