import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors()); 
app.use(express.json()); 

// Route
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Express Server is running successfully!' });
});

// เปิดใช้งาน Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});