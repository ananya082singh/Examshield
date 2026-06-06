import { Response, NextFunction } from 'express';
import prisma from '../services/db';
import { AuthenticatedRequest } from '../middleware/auth';
import multer from 'multer';

const storage = multer.memoryStorage();
export const forensicUploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('file');

interface ForensicReport {
  watermarkId: string;
  found: boolean;
  leakPlatform?: string;
  center?: {
    name: string;
    code: string;
    location: string;
  };
  user?: {
    name: string;
    email: string;
  };
  timestamp?: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  exam?: {
    name: string;
    id: string;
  };
  message?: string;
}

/**
 * Multi-strategy scan: searches for ExamShield trace ID in
 * 1) PDF Metadata Info Dictionary (uncompressed plain text — most reliable)
 * 2) Raw binary with latin1 encoding (catches any uncompressed occurrences)
 */
const extractTraceIdFromPDF = (buffer: Buffer): string | null => {
  // Strategy 1: Use latin1 to preserve all raw bytes without encoding issues
  const raw = buffer.toString('latin1');

  // Look for our metadata format: EXAMSHIELD_TRACE:ES-XXXXXXXX
  const metaMatch = raw.match(/EXAMSHIELD_TRACE[:\s]+([A-Z]{2}-[0-9A-F]{8})/i);
  if (metaMatch) return metaMatch[1].toUpperCase();

  // Strategy 2: Plain ES-XXXXXXXX pattern (visible in metadata Subject/Keywords)
  const plainMatch = raw.match(/ES-([0-9A-F]{8})/i);
  if (plainMatch) return `ES-${plainMatch[1].toUpperCase()}`;

  // Strategy 3: Search hex-encoded version of "ES-" prefix in PDF hex strings
  // "ES-" in ASCII hex is "45 53 2D". In PDF hex strings: <45532D...>
  const hexMatch = raw.match(/<45532D([0-9A-F]{16})>/i);
  if (hexMatch) {
    try {
      const decoded = Buffer.from(`45532D${hexMatch[1]}`, 'hex').toString('ascii');
      const m = decoded.match(/^ES-[0-9A-F]{8}$/i);
      if (m) return decoded.toUpperCase();
    } catch (_) {}
  }

  return null;
};

/**
 * Investigate a paper leak by scanning PDF or entering a trace ID manually.
 * Also records which platform the leak was found on.
 */
export const investigateLeak = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { manualWatermarkId, leakPlatform } = req.body;
  const file = req.file;

  try {
    let resolvedWatermarkId = '';
    let resolvedPlatform = leakPlatform;

    if (file && (!resolvedPlatform || resolvedPlatform === 'Not specified' || resolvedPlatform === '')) {
      const name = file.originalname.toLowerCase();
      if (name.includes('whatsapp') || name.includes('wa')) {
        resolvedPlatform = 'WhatsApp';
      } else if (name.includes('telegram') || name.includes('tg')) {
        resolvedPlatform = 'Telegram';
      } else if (name.includes('mail') || name.includes('email') || name.includes('gmail') || name.includes('outlook')) {
        resolvedPlatform = 'Email';
      } else if (name.includes('facebook') || name.includes('instagram') || name.includes('fb') || name.includes('ig') || name.includes('social')) {
        resolvedPlatform = 'Social Media (Facebook/Instagram)';
      } else if (name.includes('twitter') || name.includes('x.com') || name.includes('x_com')) {
        resolvedPlatform = 'Twitter/X';
      } else if (name.includes('usb') || name.includes('physical') || name.includes('drive')) {
        resolvedPlatform = 'USB / Physical Copy';
      } else {
        resolvedPlatform = 'Telegram'; // Default smart fallback
      }
    } else if (!resolvedPlatform) {
      resolvedPlatform = 'Website/Link';
    }

    if (manualWatermarkId) {
      resolvedWatermarkId = manualWatermarkId.trim().toUpperCase();
    } else if (file) {
      if (file.mimetype !== 'application/pdf') {
        res.status(400).json({ error: 'Uploaded file must be a PDF document' });
        return;
      }

      const extracted = extractTraceIdFromPDF(file.buffer);

      if (extracted) {
        resolvedWatermarkId = extracted;
      } else {
        res.status(422).json({
          error: 'No ExamShield watermark could be found in this PDF. The document may not be an ExamShield-distributed file, or the watermark metadata has been stripped. Try entering the Trace ID manually — it is printed in small red text at the bottom of each page (format: ES-XXXXXXXX).'
        });
        return;
      }
    } else {
      res.status(400).json({ error: 'Please upload a leaked PDF or provide a Watermark Trace ID (format: ES-XXXXXXXX)' });
      return;
    }

    // Validate the format
    if (!/^ES-[0-9A-F]{8}$/i.test(resolvedWatermarkId)) {
      res.status(400).json({ error: `Invalid Trace ID format: "${resolvedWatermarkId}". Expected format: ES-XXXXXXXX (e.g. ES-A92B104F)` });
      return;
    }

    // Search audit logs for this watermark transaction
    const matchingLog = await prisma.auditLog.findFirst({
      where: {
        action: 'PAPER_DOWNLOADED',
        details: {
          contains: resolvedWatermarkId
        }
      },
      include: {
        user: {
          include: { center: true }
        }
      }
    });

    if (!matchingLog) {
      res.status(404).json({
        watermarkId: resolvedWatermarkId,
        found: false,
        message: `Watermark ID "${resolvedWatermarkId}" is not found in our download records. This could mean the document was from an earlier session, or the trace ID was altered.`
      });
      return;
    }

    // Parse details for paper/exam info
    let paperId = '';
    let centerCode = '';
    let centerName = '';
    try {
      if (matchingLog.details) {
        const parsed = JSON.parse(matchingLog.details);
        paperId = parsed.paperId;
        centerCode = parsed.centerCode;
        centerName = parsed.centerName;
      }
    } catch (_) {}

    let examInfo = undefined;
    if (paperId) {
      const paper = await prisma.paper.findUnique({
        where: { id: paperId },
        include: { exam: true }
      });
      if (paper?.exam) {
        examInfo = { name: paper.exam.name, id: paper.exam.id };
      }
    }

    const report: ForensicReport = {
      watermarkId: resolvedWatermarkId,
      found: true,
      leakPlatform: resolvedPlatform,
      center: matchingLog.user?.center ? {
        name: matchingLog.user.center.name,
        code: matchingLog.user.center.code,
        location: matchingLog.user.center.location
      } : {
        name: centerName || 'Unknown Center',
        code: centerCode || 'UNKNOWN',
        location: 'Check audit logs for details'
      },
      user: matchingLog.user ? {
        name: matchingLog.user.name,
        email: matchingLog.user.email
      } : {
        name: 'Unknown User',
        email: 'unknown@institution.ac.in'
      },
      timestamp: matchingLog.timestamp,
      ipAddress: matchingLog.ipAddress,
      userAgent: matchingLog.userAgent,
      exam: examInfo
    };

    // Log this forensic investigation in the audit trail
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'FORENSIC_INVESTIGATION',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: JSON.stringify({
          tracedId: resolvedWatermarkId,
          centerCode: report.center?.code,
          leakPlatform: report.leakPlatform,
          accusedUser: report.user?.email
        })
      }
    });

    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
};
