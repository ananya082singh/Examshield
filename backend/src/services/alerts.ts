import prisma from './db';

/**
 * Checks for a spike in failed logins (5 or more within the last 5 minutes)
 */
export const checkFailedLoginSpike = async (email: string, ipAddress: string | null | undefined): Promise<void> => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  // Count failed logins for this email in last 5 minutes
  const failedCount = await prisma.auditLog.count({
    where: {
      action: 'LOGIN_FAILED',
      timestamp: { gte: fiveMinutesAgo },
      details: {
        contains: email
      }
    }
  });

  if (failedCount >= 5) {
    // Check if we already have an unresolved alert for this
    const existingAlert = await prisma.alert.findFirst({
      where: {
        type: 'FAILED_LOGIN_SPIKE',
        message: { contains: email },
        resolved: false
      }
    });

    if (!existingAlert) {
      await prisma.alert.create({
        data: {
          type: 'FAILED_LOGIN_SPIKE',
          message: `Brute force warning: 5+ failed logins for account ${email} from IP ${ipAddress || 'unknown'} in under 5 minutes.`,
        }
      });
    }
  }
};

/**
 * Checks if a user has downloaded/opened a paper more than 3 times in 2 minutes
 */
export const checkDownloadFrequency = async (userId: string, paperId: string): Promise<void> => {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

  // Count paper downloads by this user in last 2 minutes
  const downloadCount = await prisma.auditLog.count({
    where: {
      userId,
      action: 'PAPER_DOWNLOADED',
      timestamp: { gte: twoMinutesAgo },
      details: {
        contains: paperId
      }
    }
  });

  if (downloadCount >= 3) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { center: true } });
    const paper = await prisma.paper.findUnique({ where: { id: paperId }, include: { exam: true } });
    
    const centerName = user?.center?.name || 'unknown center';
    const examName = paper?.exam?.name || 'unknown exam';

    const existingAlert = await prisma.alert.findFirst({
      where: {
        type: 'SUSPICIOUS_DOWNLOAD_FREQUENCY',
        userId,
        resolved: false,
        message: { contains: paperId }
      }
    });

    if (!existingAlert) {
      await prisma.alert.create({
        data: {
          type: 'SUSPICIOUS_DOWNLOAD_FREQUENCY',
          userId,
          message: `High download frequency: User ${user?.name} at Center "${centerName}" requested paper for "${examName}" (ID: ${paperId}) ${downloadCount} times in under 2 minutes.`,
        }
      });
    }
  }
};

/**
 * Checks if the user-agent of the current request is different from their last active session
 */
export const checkDeviceChange = async (userId: string, currentAgent: string | undefined): Promise<void> => {
  if (!currentAgent) return;

  // Find the last login/access log for this user (before the current log is created)
  const lastLog = await prisma.auditLog.findFirst({
    where: {
      userId,
      action: 'LOGIN_SUCCESS'
    },
    orderBy: { timestamp: 'desc' },
    skip: 1 // Skip the current login which was just recorded
  });

  if (lastLog && lastLog.userAgent && lastLog.userAgent !== currentAgent) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    // Simple helper to extract basic browser/OS details for a cleaner alert message
    const getDeviceDesc = (ua: string) => {
      if (ua.includes('Mobi')) return 'Mobile Device';
      if (ua.includes('Chrome')) return 'Chrome Browser';
      if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari Browser';
      if (ua.includes('Firefox')) return 'Firefox Browser';
      return 'Different Browser';
    };

    const prevDevice = getDeviceDesc(lastLog.userAgent);
    const currDevice = getDeviceDesc(currentAgent);

    if (prevDevice !== currDevice || lastLog.userAgent.substring(0, 30) !== currentAgent.substring(0, 30)) {
      // Check if an unresolved alert exists
      const existingAlert = await prisma.alert.findFirst({
        where: {
          type: 'NEW_DEVICE_LOGIN',
          userId,
          resolved: false
        }
      });

      if (!existingAlert) {
        await prisma.alert.create({
          data: {
            type: 'NEW_DEVICE_LOGIN',
            userId,
            message: `Session Alert: User ${user?.name} logged in from a new device/browser. Previous: "${lastLog.userAgent.substring(0, 50)}...", Current: "${currentAgent.substring(0, 50)}...".`,
          }
        });
      }
    }
  }
};
