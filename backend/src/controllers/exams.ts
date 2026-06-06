import { Response, NextFunction } from 'express';
import prisma from '../services/db';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Create a new exam
 */
export const createExam = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { name, date, startTime, endTime } = req.body;

  try {
    if (!name || !date || !startTime || !endTime) {
      res.status(400).json({ error: 'Exam name, date, start time, and end time are required' });
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ error: 'Invalid start or end date format' });
      return;
    }

    if (start >= end) {
      res.status(400).json({ error: 'Start time must be before end time' });
      return;
    }

    const exam = await prisma.exam.create({
      data: {
        name,
        date: new Date(date),
        startTime: start,
        endTime: end
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'EXAM_CREATED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Created exam: ${name} (ID: ${exam.id})`
      }
    });

    res.status(201).json(exam);
  } catch (error) {
    next(error);
  }
};

/**
 * List all exams, including their paper metadata
 */
export const listExams = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // If it's a Center Admin, they only need to see exams that are assigned to their center
    const userRole = req.user?.role;
    const centerId = req.user?.centerId;

    let exams;

    if (userRole === 'CENTER_ADMIN' && centerId) {
      // Find exams that have papers assigned to this center
      exams = await prisma.exam.findMany({
        where: {
          papers: {
            some: {
              assignments: {
                some: {
                  centerId: centerId
                }
              }
            }
          }
        },
        include: {
          papers: {
            include: {
              assignments: {
                where: { centerId }
              }
            }
          }
        },
        orderBy: { startTime: 'asc' }
      });
    } else {
      // Super Admin and Exam Controller see all exams
      exams = await prisma.exam.findMany({
        include: {
          papers: {
            include: {
              assignments: {
                include: {
                  center: {
                    select: { name: true, code: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { startTime: 'desc' }
      });
    }

    res.status(200).json(exams);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an exam (cascades to papers and assignments)
 */
export const deleteExam = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;

  try {
    const exam = await prisma.exam.findUnique({ where: { id } });

    if (!exam) {
      res.status(404).json({ error: 'Exam not found' });
      return;
    }

    await prisma.exam.delete({ where: { id } });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'EXAM_DELETED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Deleted exam: ${exam.name} (ID: ${id})`
      }
    });

    res.status(200).json({ message: 'Exam deleted successfully' });
  } catch (error) {
    next(error);
  }
};
