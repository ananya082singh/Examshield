import express from 'express';
import cors from 'cors';
import { PORT } from './config';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import prisma from './services/db';
import bcrypt from 'bcryptjs';

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve API routes
app.use('/api', apiRouter);

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Global error handler (must be registered last)
app.use(errorHandler);

const seedIfEmpty = async () => {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log('Database already has data. Skipping auto-seed.');
      return;
    }

    console.log('First boot: Setting up default Super Admin account...');

    // Only seed one Super Admin — all real exam centers, controllers
    // and center admins should be created by the admin through the UI.
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    await prisma.user.create({
      data: {
        email: 'admin@examshield.ac.in',
        password: hashedPassword,
        name: 'System Administrator',
        role: 'SUPER_ADMIN'
      }
    });

    console.log('');
    console.log('========================================================');
    console.log('ExamShield — First Boot Setup Complete');
    console.log('========================================================');
    console.log('Super Admin credentials:');
    console.log('  Email    : admin@examshield.ac.in');
    console.log('  Password : Admin@123');
    console.log('');
    console.log('NEXT STEPS (login as Super Admin):');
    console.log('  1. Go to Exam Centers -> register your actual exam centers');
    console.log('  2. Go to User Management -> create Exam Controller accounts');
    console.log('  3. Create Center Admin accounts and link them to centers');
    console.log('  4. Login as Exam Controller to upload and schedule papers');
    console.log('========================================================');
  } catch (error) {
    console.error('Error during first-boot setup:', error);
  }
};

// Start Server
app.listen(PORT, async () => {
  console.log(`===============================================`);
  console.log(`ExamShield Backend Server running on port ${PORT}`);
  console.log(`===============================================`);
  
  // Auto-run schema checks and seed data
  await seedIfEmpty();
});
