import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';
import {
  login,
  createUser,
  listUsers,
  createCenter,
  listCenters
} from '../controllers/auth';
import {
  createExam,
  listExams,
  deleteExam
} from '../controllers/exams';
import {
  uploadPaper,
  downloadPaper,
  uploadMiddleware
} from '../controllers/papers';
import {
  getDashboardData,
  resolveAlert
} from '../controllers/dashboard';
import {
  investigateLeak,
  forensicUploadMiddleware
} from '../controllers/forensic';

const router = Router();

// --- Auth Routes ---
router.post('/auth/login', login);
router.post('/auth/users', authenticateJWT, authorizeRoles(['SUPER_ADMIN']), createUser);
router.get('/auth/users', authenticateJWT, authorizeRoles(['SUPER_ADMIN']), listUsers);
router.post('/auth/centers', authenticateJWT, authorizeRoles(['SUPER_ADMIN']), createCenter);
router.get('/auth/centers', authenticateJWT, listCenters);

// --- Exam Routes ---
router.post('/exams', authenticateJWT, authorizeRoles(['SUPER_ADMIN', 'EXAM_CONTROLLER']), createExam);
router.get('/exams', authenticateJWT, listExams);
router.delete('/exams/:id', authenticateJWT, authorizeRoles(['SUPER_ADMIN', 'EXAM_CONTROLLER']), deleteExam);

// --- Paper Routes ---
router.post('/papers/upload', authenticateJWT, authorizeRoles(['SUPER_ADMIN', 'EXAM_CONTROLLER']), uploadMiddleware, uploadPaper);
router.get('/papers/:id/download', authenticateJWT, downloadPaper);

// --- Dashboard Routes ---
router.get('/dashboard', authenticateJWT, getDashboardData);
router.put('/dashboard/alerts/:id/resolve', authenticateJWT, authorizeRoles(['SUPER_ADMIN']), resolveAlert);

// --- Forensic Scan Routes ---
router.post('/forensic/scan', authenticateJWT, authorizeRoles(['SUPER_ADMIN']), forensicUploadMiddleware, investigateLeak);

export default router;
