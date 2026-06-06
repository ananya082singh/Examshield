import { Response, NextFunction } from 'express';
import prisma from '../services/db';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Fetch stats, alerts, and logs for dashboards
 */
export const getDashboardData = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const centerId = req.user?.centerId;

    if (userRole === 'CENTER_ADMIN' && centerId) {
      // Center Dashboard stats
      const assignmentsCount = await prisma.assignment.count({
        where: { centerId }
      });

      // Get count of papers accessible right now (time-locked check)
      const now = new Date();
      const activeAssignments = await prisma.assignment.findMany({
        where: { centerId },
        include: {
          paper: {
            include: { exam: true }
          }
        }
      });

      let unlockedCount = 0;
      let expiredCount = 0;
      let lockedCount = 0;

      for (const assignment of activeAssignments) {
        if (assignment.paper && assignment.paper.exam) {
          const { startTime, endTime } = assignment.paper.exam;
          if (now >= startTime && now <= endTime) {
            unlockedCount++;
          } else if (now > endTime) {
            expiredCount++;
          } else {
            lockedCount++;
          }
        }
      }

      // Recent audit logs for this specific center admin
      const logs = await prisma.auditLog.findMany({
        where: { userId: req.user?.id },
        orderBy: { timestamp: 'desc' },
        take: 10
      });

      res.status(200).json({
        stats: {
          totalAssignedPapers: assignmentsCount,
          unlockedPapers: unlockedCount,
          lockedPapers: lockedCount,
          expiredPapers: expiredCount
        },
        logs
      });
      return;
    }

    // Super Admin / Exam Controller Stats
    const totalExams = await prisma.exam.count();
    const totalCenters = await prisma.center.count();
    const activeAlertsCount = await prisma.alert.count({ where: { resolved: false } });
    const totalUsers = await prisma.user.count();

    // Fetch last 15 security alerts
    const alerts = await prisma.alert.findMany({
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      take: 15
    });

    // Fetch last 20 audit logs
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: { name: true, email: true, role: true }
        }
      },
      take: 20
    });

    res.status(200).json({
      stats: {
        totalExams,
        totalCenters,
        activeAlerts: activeAlertsCount,
        totalUsers
      },
      alerts,
      logs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resolve a security alert
 */
export const resolveAlert = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;

  try {
    const alert = await prisma.alert.findUnique({ where: { id } });

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    const updatedAlert = await prisma.alert.update({
      where: { id },
      data: { resolved: true }
    });

    // Log the resolution
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'ALERT_RESOLVED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Resolved alert: ${alert.message} (ID: ${id})`
      }
    });

    res.status(200).json(updatedAlert);
  } catch (error) {
    next(error);
  }
};
