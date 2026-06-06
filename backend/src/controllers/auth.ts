import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../services/db';
import { JWT_SECRET } from '../config';
import { AuthenticatedRequest } from '../middleware/auth';
import { checkFailedLoginSpike, checkDeviceChange } from '../services/alerts';

/**
 * Handle user authentication and session creation
 */
export const login = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, password } = req.body;
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip || req.socket.remoteAddress || null;

  try {
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { center: true }
    });

    if (!user) {
      // Record failed audit log
      await prisma.auditLog.create({
        data: {
          action: 'LOGIN_FAILED',
          ipAddress,
          userAgent,
          details: `Non-existent user attempted login: ${email}`
        }
      });
      
      await checkFailedLoginSpike(email, ipAddress);

      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // Record failed audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN_FAILED',
          ipAddress,
          userAgent,
          details: `Password mismatch for user: ${email}`
        }
      });

      await checkFailedLoginSpike(email, ipAddress);

      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Login success - sign JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        centerId: user.centerId
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Record success audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        ipAddress,
        userAgent,
        details: `User login successful: ${email}`
      }
    });

    // Check if user is logging in from a new device/browser
    await checkDeviceChange(user.id, userAgent);

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        center: user.center
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create a new exam center
 */
export const createCenter = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { name, code, location } = req.body;

  try {
    if (!name || !code || !location) {
      res.status(400).json({ error: 'Center name, unique code, and location are required' });
      return;
    }

    const existingCode = await prisma.center.findUnique({ where: { code } });
    if (existingCode) {
      res.status(400).json({ error: 'Center code already exists' });
      return;
    }

    const center = await prisma.center.create({
      data: { name, code, location }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'CENTER_CREATED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Created center: ${name} (${code})`
      }
    });

    res.status(201).json(center);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create user accounts (Exam Controller or Center Admin)
 */
export const createUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, password, name, role, centerId } = req.body;

  try {
    if (!email || !password || !name || !role) {
      res.status(400).json({ error: 'Email, password, name, and role are required' });
      return;
    }

    if (!['SUPER_ADMIN', 'EXAM_CONTROLLER', 'CENTER_ADMIN'].includes(role)) {
      res.status(400).json({ error: 'Invalid user role' });
      return;
    }

    if (role === 'CENTER_ADMIN' && !centerId) {
      res.status(400).json({ error: 'Center Admin must be associated with a centerId' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        centerId: role === 'CENTER_ADMIN' ? centerId : null
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        centerId: true
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'USER_CREATED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Created user ${email} with role ${role}`
      }
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch all centers
 */
export const listCenters = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const centers = await prisma.center.findMany({
      orderBy: { name: 'asc' }
    });
    res.status(200).json(centers);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Fetch all users
 */
export const listUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        center: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};
