import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

const uploadsDir = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || "";
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || "";
const cloudinaryEnabled = Boolean(cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret);

const storage = cloudinaryEnabled
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      },
    });

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpeg, jpg, png, webp) are allowed'));
  }
});

import nodemailer from "nodemailer";

async function uploadToCloudinary(file: any) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "subtleinfra";
  const signatureBase = `folder=${folder}&timestamp=${timestamp}${cloudinaryApiSecret}`;
  const signature = crypto.createHash("sha1").update(signatureBase).digest("hex");

  const form = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype || "application/octet-stream" });
  form.append("file", blob, file.originalname || "upload");
  form.append("api_key", cloudinaryApiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cloudinary upload failed: ${res.status} ${text}`);
  }

  const data: any = await res.json();
  return { url: data.secure_url || data.url };
}

async function sendEmail(to: string, subject: string, body: string) {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM;
    const fromAddress = settings?.smtpFrom || process.env.SMTP_FROM || resendFrom || settings?.smtpUser || process.env.SMTP_USER;

    if (resendApiKey && resendFrom) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to,
          subject,
          html: body,
        }),
      });

      if (!emailRes.ok) {
        const text = await emailRes.text().catch(() => "");
        throw new Error(`Resend failed: ${emailRes.status} ${text}`);
      }

      await prisma.emailLog.create({
        data: {
          to,
          subject,
          body,
          status: "Success",
        },
      });

      console.log(`Email sent to ${to}`);
      return;
    }

    const host = settings?.smtpHost || process.env.SMTP_HOST;
    
    if (host && host.includes('@')) {
      throw new Error(`Invalid SMTP Host: "${host}". It looks like an email address. Please provide a valid SMTP server hostname (e.g., smtp.gmail.com).`);
    }

    const port = settings?.smtpPort || parseInt(process.env.SMTP_PORT || "587");
    const user = settings?.smtpUser || process.env.SMTP_USER;
    const pass = settings?.smtpPass || process.env.SMTP_PASS;
    const from = fromAddress || user;

    if (!host || !user || !pass) {
      throw new Error("SMTP not configured. Please set up SMTP settings in the Settings panel.");
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      html: body,
    });

    // Log success
    await prisma.emailLog.create({
      data: {
        to,
        subject,
        body,
        status: "Success"
      }
    });

    console.log(`Email sent to ${to}`);
  } catch (e: any) {
    console.error("Email failed:", e);
    
    // Log failure
    try {
      await prisma.emailLog.create({
        data: {
          to,
          subject,
          body,
          status: "Failed",
          error: e.message
        }
      });
    } catch (logError) {
      console.error("Failed to log email failure:", logError);
    }

    throw e;
  }
}

async function startServer() {
  // ... existing setup ...
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());
  app.use('/uploads', express.static(uploadsDir));

  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const authorize = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: `Forbidden: ${roles.join(' or ')} role required` });
      }
      next();
    };
  };

  app.get("/api/email-config", authenticate, authorize(["Admin"]), async (req, res) => {
    try {
      const settings = await prisma.settings.findUnique({ where: { id: "default" } });
      const host = settings?.smtpHost || process.env.SMTP_HOST;
      const user = settings?.smtpUser || process.env.SMTP_USER;
      const pass = settings?.smtpPass || process.env.SMTP_PASS;
      const from = settings?.smtpFrom || process.env.SMTP_FROM;
      const port = settings?.smtpPort || parseInt(process.env.SMTP_PORT || "587");

      res.json({
        configured: !!(host && user && pass),
        host,
        user,
        from,
        port,
        source: settings?.smtpHost ? "database" : "environment"
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch email config" });
    }
  });

  app.post("/api/test-email", authenticate, authorize(["Admin"]), async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || !user.email) {
        return res.status(400).json({ error: "User email not found for testing" });
      }

      await sendEmail(
        user.email,
        "Test Email - THE SUBTLEINFRA PVT LTD",
        `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #4f46e5;">SMTP Configuration Test</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>This is a test email to verify your SMTP settings in the ERP system.</p>
          <p style="background-color: #f0fdf4; color: #166534; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
            <strong>Success!</strong> If you are reading this, your email configuration is working correctly.
          </p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <p>Sent from THE SUBTLEINFRA ERP System</p>
            <p>Timestamp: ${new Date().toLocaleString()}</p>
          </div>
        </div>
        `
      );
      res.json({ success: true });
    } catch (e: any) {
      console.error("[TEST EMAIL ERROR]", e);
      res.status(500).json({ error: "Failed to send test email", details: e.message });
    }
  });

  app.get("/api/email-logs", authenticate, authorize(["Admin"]), async (req, res) => {
    try {
      const logs = await prisma.emailLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      res.json(logs);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch email logs" });
    }
  });

  app.delete("/api/email-logs", authenticate, authorize(["Admin"]), async (req, res) => {
    try {
      await prisma.emailLog.deleteMany();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to clear email logs" });
    }
  });

  app.post("/api/verify-smtp", authenticate, authorize(["Admin"]), async (req, res) => {
    try {
      const settings = await prisma.settings.findUnique({ where: { id: "default" } });
      const host = settings?.smtpHost || process.env.SMTP_HOST;
      const port = settings?.smtpPort || parseInt(process.env.SMTP_PORT || "587");
      const user = settings?.smtpUser || process.env.SMTP_USER;
      const pass = settings?.smtpPass || process.env.SMTP_PASS;

      if (!host || !user || !pass) {
        return res.status(400).json({ error: "SMTP not configured" });
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
        connectionTimeout: 5000,
      });

      await transporter.verify();
      res.json({ success: true, message: "SMTP connection verified successfully" });
    } catch (e: any) {
      res.status(500).json({ error: "SMTP verification failed", details: e.message });
    }
  });

  // --- File Upload ---
  app.post("/api/upload", authenticate, upload.single('image'), async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    try {
      if (cloudinaryEnabled) {
        const uploaded = await uploadToCloudinary(req.file);
        return res.json({ imageUrl: uploaded.url });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      return res.json({ imageUrl });
    } catch (e: any) {
      return res.status(500).json({ error: "Upload failed", details: e.message });
    }
  });

  // --- Auth Routes ---
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, name, role } = req.body;
    try {
      // Only allow signup if no users exist (initial setup)
      const userCount = await prisma.user.count();
      if (userCount > 0) {
        return res.status(403).json({ error: "Signup is disabled. Please contact an administrator." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, name, role: role || "Admin" },
      });
      res.json({ message: "Initial administrator user created" });
    } catch (e) {
      res.status(400).json({ error: "Failed to create user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      console.log(`Login attempt for: ${email}`);
      
      const user = await prisma.user.findUnique({ where: { email } });
      
      if (!user) {
        console.log(`User not found: ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        console.log(`Invalid password for: ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      console.log(`Login successful for: ${email}`);
      
      const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name, email: user.email }, 
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.cookie("token", token, { 
        httpOnly: true, 
        sameSite: "none", 
        secure: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.json({ 
        user: { 
          id: user.id, 
          role: user.role, 
          name: user.name,
          email: user.email
        } 
      });
    } catch (e: any) {
      console.error("Login error details:", {
        message: e.message,
        stack: e.stack,
        email: req.body.email
      });
      res.status(500).json({ error: "Internal server error during login. Please try again later." });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    res.json({ user: req.user });
  });

  // --- Settings Routes ---
  app.get("/api/settings", authenticate, async (req, res) => {
    try {
      let settings = await prisma.settings.findUnique({ where: { id: "default" } });
      if (!settings) {
        settings = await prisma.settings.create({
          data: { 
            id: "default", 
            companyName: "THE SUBTLEINFRA PVT LTD", 
            poSeries: "PO", 
            poNextNumber: 1,
            defaultGstRate: 18,
            defaultMargin: 20,
            currencySymbol: "₹",
            projectCategories: "Residential,Commercial,Industrial,Infrastructure,Hospitality"
          }
        });
      }
      res.json(settings);
    } catch (e) {
      console.error("[API ERROR] GET /api/settings:", e);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", authenticate, authorize(["Admin"]), async (req, res) => {
    const { 
      companyName, address, logoUrl, gstNumber, panNumber, 
      poSeries, poNextNumber, poTerms,
      defaultGstRate, defaultMargin, currencySymbol, projectCategories,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom
    } = req.body;

    // Validate SMTP Host if provided
    if (smtpHost && smtpHost.includes('@')) {
      return res.status(400).json({ error: 'Invalid SMTP Host. Please provide a valid hostname (e.g., smtp.gmail.com), not an email address.' });
    }

    try {
      const settings = await prisma.settings.update({
        where: { id: "default" },
        data: { 
          companyName, 
          address, 
          logoUrl, 
          gstNumber, 
          panNumber, 
          poSeries, 
          poNextNumber: poNextNumber !== undefined ? parseInt(String(poNextNumber)) : undefined, 
          poTerms,
          defaultGstRate: defaultGstRate !== undefined ? parseFloat(String(defaultGstRate)) : undefined,
          defaultMargin: defaultMargin !== undefined ? parseFloat(String(defaultMargin)) : undefined,
          currencySymbol: currencySymbol || "₹",
          projectCategories: projectCategories || "Residential,Commercial,Industrial,Infrastructure,Hospitality",
          smtpHost,
          smtpPort: (smtpPort !== undefined && smtpPort !== null && smtpPort !== "") ? parseInt(String(smtpPort)) : undefined,
          smtpUser,
          smtpPass,
          smtpFrom
        }
      });
      res.json(settings);
    } catch (e) {
      console.error("[API ERROR] PUT /api/settings:", e);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // --- Dashboard Stats ---
  app.get("/api/dashboard/stats", authenticate, async (req, res) => {
    try {
      const [
        boqStats,
        pendingApprovals,
        approvedValue,
        items,
        vendors,
        pos,
        totalInflow,
        totalOutflow,
        lineItems,
        recentBOQs,
        dashboardSettings
      ] = await Promise.all([
        prisma.bOQ.aggregate({
          _sum: { totalValue: true, totalMargin: true },
          _count: { _all: true }
        }),
        prisma.bOQ.count({ where: { status: "Pending Approval" } }),
        prisma.bOQ.aggregate({
          where: { status: "Approved" },
          _sum: { totalValue: true }
        }),
        prisma.itemMaster.count(),
        prisma.vendor.count(),
        prisma.purchaseOrder.aggregate({ _sum: { totalAmount: true }, _count: { _all: true } }),
        prisma.inflow.aggregate({ _sum: { amount: true } }),
        prisma.outflow.aggregate({ _sum: { amount: true } }),
        prisma.bOQLineItem.findMany({ select: { quantity: true, progress: { select: { quantity: true } } } }),
        prisma.bOQ.findMany({
          include: { createdBy: true, client: true },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        prisma.settings.findUnique({ where: { id: "default" } })
      ]);

      const emailConfigured = !!(dashboardSettings?.smtpHost && dashboardSettings?.smtpUser && dashboardSettings?.smtpPass);

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const [
        lastMonthBoqs,
        lastMonthInflows,
        lastMonthOutflows
      ] = await Promise.all([
        prisma.bOQ.aggregate({
          where: { createdAt: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth } },
          _sum: { totalValue: true, totalMargin: true },
          _count: { _all: true }
        }),
        prisma.inflow.aggregate({
          where: { date: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth } },
          _sum: { amount: true }
        }),
        prisma.outflow.aggregate({
          where: { date: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth } },
          _sum: { amount: true }
        })
      ]);

      const totalPipelineValue = boqStats._sum.totalValue || 0;
      const avgMargin = boqStats._count._all ? (boqStats._sum.totalMargin || 0) / boqStats._count._all : 0;
      const totalPOValue = pos._sum.totalAmount || 0;
      const currentInflow = totalInflow._sum.amount || 0;
      const currentOutflow = totalOutflow._sum.amount || 0;

      const lastMonthPipelineValue = lastMonthBoqs._sum.totalValue || 0;
      const lastMonthAvgMargin = lastMonthBoqs._count._all ? (lastMonthBoqs._sum.totalMargin || 0) / lastMonthBoqs._count._all : 0;
      const lastMonthInflowTotal = lastMonthInflows._sum.amount || 0;
      const lastMonthOutflowTotal = lastMonthOutflows._sum.amount || 0;

      const calculateTrend = (current: number, last: number) => {
        if (last === 0) return current > 0 ? 100 : 0;
        return ((current - last) / last) * 100;
      };

      const trends = {
        pipelineValue: calculateTrend(totalPipelineValue, lastMonthPipelineValue),
        inflow: calculateTrend(currentInflow, lastMonthInflowTotal),
        outflow: calculateTrend(currentOutflow, lastMonthOutflowTotal),
        margin: calculateTrend(avgMargin, lastMonthAvgMargin)
      };

      // Calculate overall progress
      let totalPlanned = 0;
      let totalExecuted = 0;
      lineItems.forEach(li => {
        totalPlanned += li.quantity;
        totalExecuted += li.progress.reduce((sum, p) => sum + p.quantity, 0);
      });
      const overallProgress = totalPlanned > 0 ? (totalExecuted / totalPlanned) * 100 : 0;

      res.json({
        totalPipelineValue,
        avgMargin,
        pendingApprovals,
        approvedValue: approvedValue._sum.totalValue || 0,
        totalPOValue,
        itemCount: items,
        vendorCount: vendors,
        poCount: pos._count._all,
        totalInflow: totalInflow._sum.amount || 0,
        totalOutflow: totalOutflow._sum.amount || 0,
        overallProgress,
        recentBOQs,
        trends,
        emailConfigured
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // --- Payment Tracking Sheet (PTS) ---
  app.get("/api/pts", authenticate, async (req, res) => {
    try {
      const pos = await prisma.purchaseOrder.findMany({
        include: {
          boq: { include: { project: true, client: true } },
          project: { include: { client: true } },
          vendor: true,
          outflows: true
        }
      });

      const ptsData = pos.map(po => {
        const totalPaid = po.outflows.reduce((sum, outflow) => sum + outflow.amount, 0);
        
        return {
          id: po.id,
          poNumber: po.poNumber || po.id.substring(0, 8).toUpperCase(),
          project: po.project?.name || po.boq?.project?.name || po.boq?.name || "General",
          projectId: po.projectId,
          boqId: po.boqId,
          client: po.project?.client?.name || po.boq?.client?.name || "N/A",
          clientId: po.project?.clientId || po.boq?.clientId,
          vendor: po.vendor?.name || "N/A",
          vendorId: po.vendorId,
          poValue: po.totalAmount,
          certifiedValue: 0,
          amountPaid: totalPaid,
          paidPercent: po.totalAmount > 0 ? (totalPaid / po.totalAmount) * 100 : 0,
          balancePayment: po.totalAmount - totalPaid,
          tds: 0,
          status: po.status
        };
      });

      res.json(ptsData);
    } catch (e) {
      console.error("Failed to fetch PTS data:", e);
      res.status(500).json({ error: "Failed to fetch PTS data" });
    }
  });

  // --- User Management Routes ---
  app.get("/api/users", authenticate, async (req: any, res) => {
    if (req.user.role !== "Admin") return res.status(403).json({ error: "Forbidden" });
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  });

  app.post("/api/users", authenticate, authorize(["Admin"]), async (req: any, res) => {
    const { email, password, name, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, name, role },
      });
      res.json({ message: "User created", user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (e) {
      res.status(400).json({ error: "User already exists" });
    }
  });

  app.put("/api/users/:id", authenticate, authorize(["Admin"]), async (req: any, res) => {
    const { email, name, role, password } = req.body;
    try {
      const data: any = { email, name, role };
      if (password) {
        data.password = await bcrypt.hash(password, 10);
      }
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data
      });
      res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (e) {
      res.status(400).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authenticate, authorize(["Admin"]), async (req: any, res) => {
    if (req.user.id === req.params.id) return res.status(400).json({ error: "Cannot delete yourself" });
    try {
      await prisma.user.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Failed to delete user" });
    }
  });

  // --- BOQ Routes ---
  app.get("/api/boqs", authenticate, async (req, res) => {
    try {
      const boqs = await prisma.bOQ.findMany({
        include: { 
          createdBy: { select: { name: true } },
          client: { select: { name: true } },
          project: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(boqs);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch BOQs" });
    }
  });

  app.post("/api/boqs", authenticate, authorize(["Admin", "Estimator"]), async (req: any, res) => {
    const { name, clientId, projectId, state, category } = req.body;
    try {
      const boq = await prisma.bOQ.create({
        data: { 
          name, 
          createdById: req.user.id,
          clientId: clientId || null,
          projectId: projectId || null,
          state: state || "Maharashtra",
          category: category || "Residential"
        },
        include: { createdBy: true, client: true, project: true }
      });
      res.json(boq);
    } catch (e) {
      res.status(400).json({ error: "Failed to create BOQ" });
    }
  });

  app.get("/api/boqs/:id", authenticate, async (req, res) => {
    try {
      const boq = await prisma.bOQ.findUnique({
        where: { id: req.params.id },
        include: {
          lineItems: { 
            include: { 
              item: { include: { stateRates: true } },
              vendor: true,
              progress: {
                include: { updatedBy: true },
                orderBy: { date: 'desc' }
              }
            }
          },
          createdBy: { select: { name: true } },
          client: { select: { name: true } },
          project: { select: { name: true } },
          approvals: { include: { user: { select: { name: true } } } },
          inflows: { orderBy: { date: 'desc' } },
          pos: { 
            include: { 
              vendor: true,
              outflows: true
            } 
          }
        }
      });

      if (!boq) return res.status(404).json({ error: "BOQ not found" });

      // Fetch outflows separately to avoid stale include error
      const outflows = await (prisma as any).outflow.findMany({
        where: { boqId: boq.id },
        include: { vendor: true, purchaseOrder: true },
        orderBy: { date: 'desc' }
      });

      res.json({ ...boq, outflows });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch BOQ details" });
    }
  });

  app.put("/api/boqs/:id", authenticate, authorize(["Admin", "Estimator"]), async (req, res) => {
    const { name, clientId, projectId, status, state, category, startDate, endDate } = req.body;
    try {
      const boq = await prisma.bOQ.update({
        where: { id: req.params.id },
        data: { 
          name, 
          clientId: clientId || null,
          projectId: projectId || null,
          status,
          state,
          category,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined
        },
        include: { createdBy: true, client: true, project: true }
      });
      res.json(boq);
    } catch (e) {
      res.status(400).json({ error: "Failed to update BOQ" });
    }
  });

  app.delete("/api/boqs/:id", authenticate, authorize(["Admin"]), async (req, res) => {
    try {
      await prisma.bOQ.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Failed to delete BOQ" });
    }
  });

  app.put("/api/boqs/:id/line-items", authenticate, authorize(["Admin", "Estimator"]), async (req: any, res) => {
    const { items, startDate, endDate, category } = req.body; 
    const boqId = req.params.id;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const boq = await tx.bOQ.findUnique({ where: { id: boqId } });
        if (boq?.status !== "Draft" && boq?.status !== "Rejected" && req.user.role !== "Admin") {
          throw new Error("BOQ is locked");
        }

        const existingItems = await tx.bOQLineItem.findMany({ where: { boqId } });
        const existingIds = existingItems.map(i => i.id);
        const incomingIds = items.map((i: any) => i.id).filter(Boolean);

        // Delete items that are not in the incoming list
        const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
        if (idsToDelete.length > 0) {
          await tx.bOQLineItem.deleteMany({ where: { id: { in: idsToDelete } } });
        }

        let totalCost = 0;
        let totalValue = 0;
        let totalGst = 0;
        let subTotal = 0;

        for (const item of items) {
          if (!item.itemId) {
            console.warn(`Skipping line item without itemId for BOQ ${boqId}`);
            continue;
          }
          let bcs = parseFloat(item.rate || "0");
          let vendorId = item.vendorId || null;

          if (!bcs && !vendorId) {
            const lowestRate = await tx.vendorRate.findFirst({
              where: { itemId: item.itemId, status: "Active" },
              orderBy: { activeRate: 'asc' }
            });
            bcs = lowestRate ? (lowestRate.activeRate || lowestRate.submittedRate) : 0;
            vendorId = lowestRate ? lowestRate.vendorId : null;
          }

          const qty = parseFloat(item.quantity || "0");
          const clientPrice = parseFloat(item.clientPrice || "0");
          const gstRate = parseFloat(item.gstRate || "0");
          
          const lineSubTotal = bcs * qty;
          const lineGst = lineSubTotal * (gstRate / 100);
          const amount = lineSubTotal + lineGst;
          
          const margin = clientPrice > 0 ? ((clientPrice - bcs) / clientPrice) * 100 : 0;
          
          subTotal += lineSubTotal;
          totalGst += lineGst;
          totalCost += lineSubTotal;
          totalValue += clientPrice * qty;
          
          const itemData = {
            boqId,
            itemId: item.itemId,
            description: item.description,
            category: item.category,
            unit: item.unit,
            quantity: qty,
            rate: bcs,
            gstRate: gstRate,
            gstAmount: lineGst,
            amount: amount,
            vendorId: vendorId,
            rateType: item.rateType || "SupplyPlusInstallation",
            bcs: bcs,
            clientPrice: clientPrice,
            margin: margin
          };

          if (item.id && existingIds.includes(item.id)) {
            await tx.bOQLineItem.update({
              where: { id: item.id },
              data: itemData
            });
          } else {
            await tx.bOQLineItem.create({ data: itemData });
          }
        }

        const totalMargin = totalValue > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 0;

        await tx.bOQ.update({
          where: { id: boqId },
          data: { 
            subTotal,
            gstAmount: totalGst,
            totalCost, 
            totalValue, 
            totalMargin,
            category,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined
          }
        });

        return { success: true };
      });

      res.json(result);
    } catch (e: any) {
      console.error("Failed to update BOQ line items:", e);
      res.status(400).json({ error: e.message || "Failed to update line items" });
    }
  });

  app.post("/api/boqs/:id/submit", authenticate, authorize(["Admin", "Estimator"]), async (req: any, res) => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const status = req.user.role === "Admin" ? "Approved" : "Pending Approval";
        await tx.bOQ.update({
          where: { id: req.params.id },
          data: { status }
        });
        
        if (req.user.role === "Admin") {
          await tx.approval.create({
            data: { 
              boqId: req.params.id, 
              userId: req.user.id, 
              status: "Approved", 
              comment: "Auto-approved by Admin" 
            }
          });
        }
        return { success: true, status };
      });
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: "Failed to submit BOQ" });
    }
  });

  app.post("/api/boqs/:id/approve", authenticate, authorize(["Admin", "Estimator"]), async (req: any, res) => {
    const { status, comment } = req.body; // Approved or Rejected
    try {
      const result = await prisma.$transaction(async (tx) => {
        const boq = await tx.bOQ.update({ 
          where: { id: req.params.id }, 
          data: { status },
          include: { client: true }
        });
        
        await tx.approval.create({ 
          data: { boqId: req.params.id, userId: req.user.id, status, comment } 
        });

        return boq;
      });

      // Send email to client if BOQ is approved (OUTSIDE transaction)
      if (status === "Approved" && result.client && result.client.email) {
        const emailBody = `
          <div style="font-family: sans-serif; color: #333;">
            <h2>BOQ Approved - THE SUBTLEINFRA PVT LTD</h2>
            <p>Hello ${result.client.name},</p>
            <p>We are pleased to inform you that the BOQ for <strong>${result.name}</strong> has been approved.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 5px 0;"><strong>Project:</strong> ${result.name}</p>
              <p style="margin: 5px 0;"><strong>Total Value:</strong> ${process.env.CURRENCY_SYMBOL || '₹'}${result.totalValue}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> Approved</p>
            </div>
            <p>Our team will now proceed with the next steps. Thank you for choosing THE SUBTLEINFRA PVT LTD.</p>
          </div>
        `;
        sendEmail(result.client.email, `BOQ Approved: ${result.name}`, emailBody)
          .catch(err => console.error("Background email sending failed (BOQ Approval):", err));
      }

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to process approval" });
    }
  });

  // --- Progress Update Routes ---
  app.post("/api/line-items/:id/progress", authenticate, authorize(["Admin", "Estimator"]), async (req: any, res) => {
    const { quantity, remarks, date } = req.body;
    try {
      const update = await prisma.progressUpdate.create({
        data: {
          lineItemId: req.params.id,
          quantity: parseFloat(quantity),
          remarks,
          date: date ? new Date(date) : new Date(),
          updatedById: req.user.id
        },
        include: { updatedBy: true }
      });
      res.json(update);
    } catch (e) {
      res.status(400).json({ error: "Failed to log progress" });
    }
  });

  app.delete("/api/progress-updates/:id", authenticate, authorize(["Admin", "Estimator"]), async (req: any, res) => {
    try {
      await prisma.progressUpdate.delete({
        where: { id: req.params.id }
      });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Failed to delete progress update" });
    }
  });

  // --- Master Item Routes ---
  app.get("/api/items", authenticate, async (req, res) => {
    try {
      const items = await prisma.itemMaster.findMany({
        include: { 
          stateRates: true,
          vendorMappings: { include: { vendor: true } }
        },
        orderBy: { itemCode: 'asc' }
      });
      res.json(items);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.post("/api/items", authenticate, authorize(["Admin", "Estimator"]), async (req: any, res) => {
    const { 
      itemCode, name, category, subCategory, description, unit, 
      materialMake, sizeThickness, finishColor, applicationArea, 
      vendorType, hsnSac, typicalRateBand, remarks, status, stateRates,
      defaultGstRate, imageUrl
    } = req.body;
    
    try {
      const result = await prisma.$transaction(async (tx) => {
        const item = await tx.itemMaster.create({
          data: {
            itemCode, name, category, subCategory, description, unit,
            materialMake, sizeThickness, finishColor, applicationArea,
            vendorType, hsnSac, typicalRateBand, remarks, status: status || "Active",
            defaultGstRate: defaultGstRate ? parseFloat(defaultGstRate) : 18,
            imageUrl,
            stateRates: {
              create: stateRates || []
            }
          },
          include: { stateRates: true }
        });
        return item;
      });
      res.json(result);
    } catch (e: any) {
      console.error("[ITEM CREATE ERROR]", e);
      if (e.code === 'P2002') {
        return res.status(400).json({ error: "Item Code must be unique" });
      }
      res.status(500).json({ error: "Failed to create item", details: e.message });
    }
  });

  app.put("/api/items/:id", authenticate, authorize(["Admin", "Estimator"]), async (req: any, res) => {
    const { 
      itemCode, name, category, subCategory, description, unit, 
      materialMake, sizeThickness, finishColor, applicationArea, 
      vendorType, hsnSac, typicalRateBand, remarks, status, stateRates,
      defaultGstRate, imageUrl
    } = req.body;
    
    try {
      const result = await prisma.$transaction(async (tx) => {
        const item = await tx.itemMaster.update({
          where: { id: req.params.id },
          data: {
            itemCode, name, category, subCategory, description, unit,
            materialMake, sizeThickness, finishColor, applicationArea,
            vendorType, hsnSac, typicalRateBand, remarks, status,
            defaultGstRate: defaultGstRate ? parseFloat(defaultGstRate) : 18,
            imageUrl,
            stateRates: {
              deleteMany: {},
              create: stateRates || []
            }
          },
          include: { stateRates: true }
        });
        return item;
      });
      res.json(result);
    } catch (e: any) {
      console.error("[ITEM UPDATE ERROR]", e);
      if (e.code === 'P2002') {
        return res.status(400).json({ error: "Item Code must be unique" });
      }
      res.status(500).json({ error: "Failed to update item", details: e.message });
    }
  });

  app.post("/api/items/bulk-import", authenticate, authorize(["Admin", "Estimator"]), async (req: any, res) => {
    const { items, mode } = req.body; // mode: 'insert' or 'upsert'
    
    try {
      const result = await prisma.$transaction(async (tx) => {
        let imported = 0;
        let updated = 0;
        let skipped = 0;
        let failed = 0;
        const errors: any[] = [];

        for (const item of items) {
          try {
            const existing = await tx.itemMaster.findUnique({ where: { itemCode: item.itemCode } });
            if (existing) {
              if (mode === 'upsert') {
                await tx.itemMaster.update({
                  where: { id: existing.id },
                  data: { ...item, updatedAt: new Date() }
                });
                updated++;
              } else {
                skipped++;
              }
            } else {
              await tx.itemMaster.create({ data: item });
              imported++;
            }
          } catch (e: any) {
            failed++;
            errors.push({ itemCode: item.itemCode, error: e.message });
          }
        }
        return { summary: { total: items.length, imported, updated, skipped, failed }, errors };
      });

      res.json(result);
    } catch (e: any) {
      console.error("Bulk import failed:", e);
      res.status(500).json({ error: "Bulk import failed", details: e.message });
    }
  });

  // --- State Routes ---
  app.get("/api/states", authenticate, async (req, res) => {
    const states = await prisma.state.findMany({ orderBy: { name: 'asc' } });
    res.json(states);
  });

  app.post("/api/states", authenticate, authorize(["Admin", "Estimator"]), async (req: any, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: "State name is required and must be a string" });
      }
      
      const state = await prisma.state.create({ data: { name: name.trim() } });
      res.json(state);
    } catch (e: any) {
      console.error(`[STATE CREATE] Fatal Error:`, e);
      if (e.code === 'P2002') {
        return res.status(400).json({ error: "State already exists" });
      }
      res.status(500).json({ error: "Internal Server Error", details: e.message });
    }
  });

  app.delete("/api/states/:id", authenticate, authorize(["Admin"]), async (req: any, res) => {
    try {
      await prisma.state.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Failed to delete state" });
    }
  });

  // --- Item Vendor Mapping Routes ---
  app.post("/api/item-vendor-mappings", authenticate, authorize(["Admin", "Procurement"]), async (req: any, res) => {
    const { itemId, vendorId } = req.body;
    try {
      const mapping = await prisma.itemVendorMapping.create({
        data: { itemId, vendorId }
      });
      res.json(mapping);
    } catch (e) {
      res.status(400).json({ error: "Mapping already exists" });
    }
  });

  app.delete("/api/item-vendor-mappings", authenticate, authorize(["Admin", "Procurement"]), async (req: any, res) => {
    const { itemId, vendorId } = req.body;
    try {
      await prisma.itemVendorMapping.delete({
        where: { itemId_vendorId: { itemId, vendorId } }
      });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Mapping not found" });
    }
  });

  app.delete("/api/items/:id", authenticate, authorize(["Admin"]), async (req: any, res) => {
    const itemId = req.params.id;

    try {
      // Direct delete
      await prisma.itemMaster.delete({
        where: { id: itemId }
      });
      res.json({ success: true });
    } catch (e: any) {
      console.error("[ITEM DELETE] Error:", e);
      // Fallback: manual cleanup of related records
      try {
        await prisma.vendorRate.deleteMany({ where: { itemId } });
        await prisma.purchaseOrderItem.deleteMany({ where: { itemId } });
        await prisma.bOQLineItem.deleteMany({ where: { itemId } });
        await prisma.itemMaster.delete({ where: { id: itemId } });
        res.json({ success: true, note: "Deleted via manual fallback" });
      } catch (fallbackErr: any) {
        res.status(500).json({ error: "Delete failed", details: fallbackErr.message });
      }
    }
  });

  // --- Client Routes ---
  app.get("/api/clients", authenticate, async (req, res) => {
    try {
      const clients = await prisma.client.findMany({
        include: { boqs: true, projects: true, inflows: true }
      });
      res.json(clients);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", authenticate, authorize(["Admin", "Estimator"]), async (req, res) => {
    const { name, email, contactInfo } = req.body;
    console.log(`[CLIENT CREATE] Attempting to create client: ${email}`);
    
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    try {
      const client = await prisma.client.create({
        data: { name, email, contactInfo }
      });
      console.log(`[CLIENT CREATE] Success: ${client.id}`);
      res.json(client);
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.warn(`[CLIENT CREATE] Duplicate email attempt: ${email}`);
        return res.status(400).json({ error: "Client with this email already exists" });
      }
      console.error(`[CLIENT CREATE] Fatal Error:`, e);
      res.status(500).json({ error: "Failed to create client", details: e.message });
    }
  });

  // --- Project Routes ---
  app.get("/api/projects", authenticate, async (req, res) => {
    try {
      const projects = await prisma.project.findMany({
        include: { client: true, boqs: true }
      });
      res.json(projects);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", authenticate, authorize(["Admin", "Estimator"]), async (req, res) => {
    const { name, description, clientId, status, startDate, endDate } = req.body;
    try {
      const project = await prisma.project.create({
        data: {
          name,
          description,
          clientId: clientId || null,
          status: status || "Active",
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null
        },
        include: { client: true }
      });
      res.json(project);
    } catch (e) {
      res.status(400).json({ error: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", authenticate, authorize(["Admin", "Estimator"]), async (req, res) => {
    const { name, description, clientId, status, startDate, endDate } = req.body;
    try {
      const project = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          name,
          description,
          clientId: clientId || null,
          status,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null
        },
        include: { client: true }
      });
      res.json(project);
    } catch (e) {
      res.status(400).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", authenticate, authorize(["Admin"]), async (req, res) => {
    try {
      await prisma.project.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Failed to delete project" });
    }
  });

  // --- Cash Flow Routes ---
  app.get("/api/cash-flow", authenticate, async (req, res) => {
    try {
      const inflows = await prisma.inflow.findMany({
        include: { client: true, boq: true, project: true },
        orderBy: { date: 'desc' }
      });
      const outflows = await prisma.outflow.findMany({
        include: { vendor: true, purchaseOrder: true, boq: true, project: true },
        orderBy: { date: 'desc' }
      });
      
      // Split outflows for frontend
      const vendorPayments = outflows.filter(o => o.poId !== null);
      const generalOutflows = outflows.filter(o => o.poId === null);
      
      res.json({ inflows, vendorPayments, generalOutflows });
    } catch (e) {
      console.error("[API ERROR] GET /api/cash-flow:", e);
      res.status(500).json({ error: "Failed to fetch cash flow data" });
    }
  });

  app.delete("/api/inflows/:id", authenticate, authorize(["Admin"]), async (req, res) => {
    try {
      await prisma.inflow.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Failed to delete inflow" });
    }
  });

  app.delete("/api/outflows/:id", authenticate, authorize(["Admin"]), async (req, res) => {
    try {
      await prisma.outflow.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Failed to delete outflow" });
    }
  });

  app.post("/api/inflows", authenticate, authorize(["Admin", "Procurement"]), async (req, res) => {
    const { clientId, boqId, projectId, amount, description, method, date } = req.body;
    try {
      const inflow = await prisma.inflow.create({
        data: {
          clientId,
          boqId: boqId || null,
          projectId: projectId || null,
          amount: parseFloat(amount),
          description,
          method,
          date: date ? new Date(date) : new Date()
        }
      });
      res.json(inflow);
    } catch (e) {
      res.status(400).json({ error: "Failed to record inflow" });
    }
  });

  app.post("/api/outflows", authenticate, authorize(["Admin", "Procurement"]), async (req, res) => {
    const { vendorId, poId, boqId, projectId, amount, description, method, category, date } = req.body;
    try {
      const outflow = await prisma.outflow.create({
        data: {
          vendorId: vendorId || null,
          poId: poId || null,
          boqId: boqId || null,
          projectId: projectId || null,
          amount: parseFloat(amount),
          description,
          method,
          category,
          date: date ? new Date(date) : new Date()
        }
      });
      res.json(outflow);
    } catch (e) {
      res.status(400).json({ error: "Failed to record outflow" });
    }
  });

  // --- Vendor Routes ---
  app.post("/api/vendors", authenticate, authorize(["Admin", "Procurement"]), async (req, res) => {
    const { name, email, contactInfo, state } = req.body;
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    try {
      const vendor = await prisma.vendor.create({
        data: { name, email, contactInfo, state: state || "Maharashtra", token },
      });

      // Send real email
      const submissionUrl = `${process.env.APP_URL}/vendor-setup/${token}`;
      const portalUrl = `${process.env.APP_URL}/vendor-portal/${token}`;
      const emailBody = `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Welcome to THE SUBTLEINFRA PVT LTD</h2>
          <p>Hello ${name},</p>
          <p>We would like to invite you to join our vendor network. Please use the link below to complete your profile and submit your product rates.</p>
          <div style="margin: 20px 0;">
            <a href="${submissionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px;">Complete Onboarding</a>
            <a href="${portalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1e293b; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Vendor Portal</a>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">Bookmark your Vendor Portal link to view your Purchase Orders in the future: ${portalUrl}</p>
        </div>
      `;
      
      sendEmail(email, "Invitation to Onboard - THE SUBTLEINFRA PVT LTD", emailBody)
        .catch(err => console.error("Background email sending failed (Vendor Invitation):", err));

      res.json({ vendor, submissionUrl, portalUrl });
    } catch (e) {
      res.status(400).json({ error: "Vendor with this email already exists" });
    }
  });

  app.delete("/api/vendors/:id", authenticate, authorize(["Admin", "Procurement"]), async (req, res) => {
    const vendorId = req.params.id;
    try {
      await prisma.$transaction(async (tx) => {
        // Delete related records first
        await tx.vendorRate.deleteMany({ where: { vendorId } });
        
        // Find POs for this vendor
        const pos = await tx.purchaseOrder.findMany({ where: { vendorId } });
        const poIds = pos.map(po => po.id);
        
        if (poIds.length > 0) {
          await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: { in: poIds } } });
          await tx.outflow.deleteMany({ where: { poId: { in: poIds } } });
          await tx.purchaseOrder.deleteMany({ where: { id: { in: poIds } } });
        }
        
        // Finally delete the vendor
        await tx.vendor.delete({ where: { id: vendorId } });
      });
      
      res.json({ success: true });
    } catch (e: any) {
      console.error("[VENDOR DELETE] Error:", e);
      res.status(400).json({ error: "Failed to delete vendor. It may have active transactions." });
    }
  });

  app.delete("/api/payments/:id", authenticate, authorize(["Admin"]), async (req, res) => {
    try {
      await prisma.outflow.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Failed to delete payment" });
    }
  });
  app.get("/api/vendors", async (req, res) => {
    try {
      const vendors = await prisma.vendor.findMany();
      res.json(vendors);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  // --- Multi-Item Vendor Submission (Public) ---
  app.get("/api/public/vendor-setup/:token", async (req, res) => {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { token: req.params.token },
        include: { rates: { include: { item: true } } }
      });
      if (!vendor) return res.status(404).json({ error: "Invalid link" });
      
      const items = await prisma.itemMaster.findMany();
      res.json({ vendor, items });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch vendor setup data" });
    }
  });

  app.post("/api/public/vendor-setup/:token", async (req, res) => {
    const { contactInfo, rates, customItems } = req.body; 
    try {
      const result = await prisma.$transaction(async (tx) => {
        const vendor = await tx.vendor.findUnique({ where: { token: req.params.token } });
        if (!vendor) throw new Error("Invalid link");

        await tx.vendor.update({
          where: { id: vendor.id },
          data: { contactInfo }
        });

        for (const r of rates) {
          const existingRate = await tx.vendorRate.findFirst({
            where: { vendorId: vendor.id, itemId: r.itemId }
          });

          if (existingRate) {
            await tx.vendorRate.update({
              where: { id: existingRate.id },
              data: { submittedRate: r.submittedRate, status: "Pending Review" }
            });
          } else {
            await tx.vendorRate.create({
              data: {
                vendor: { connect: { id: vendor.id } },
                item: { connect: { id: r.itemId } },
                submittedRate: r.submittedRate,
                activeRate: r.submittedRate,
                status: "Pending Review"
              }
            });
          }
        }

        if (customItems && Array.isArray(customItems)) {
          for (const ci of customItems) {
            await tx.vendorRate.create({
              data: {
                vendor: { connect: { id: vendor.id } },
                vendorItemName: ci.name,
                vendorCategory: ci.category,
                vendorUnit: ci.unit,
                submittedRate: ci.rate,
                activeRate: ci.rate,
                status: "Pending Review"
              }
            });
          }
        }
        return { success: true };
      });
      res.json(result);
    } catch (e: any) {
      console.error("Failed to submit vendor setup:", e);
      res.status(400).json({ error: e.message || "Failed to submit vendor setup" });
    }
  });

  app.post("/api/vendor-rates/:id/approve", authenticate, authorize(["Admin", "Procurement"]), async (req: any, res) => {
    const { negotiatedRate } = req.body;
    
    try {
      const result = await prisma.$transaction(async (tx) => {
        const rate = await tx.vendorRate.findUnique({ 
          where: { id: req.params.id },
          include: { vendor: true }
        });
        if (!rate) throw new Error("Rate not found");

        let itemId = rate.itemId;

        if (!itemId && rate.vendorItemName) {
          const timestamp = Date.now().toString().slice(-6);
          const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          const generatedCode = `AUTO-${timestamp}-${random}`;

          const newItem = await tx.itemMaster.create({
            data: {
              itemCode: generatedCode,
              name: rate.vendorItemName,
              category: rate.vendorCategory || "General",
              unit: rate.vendorUnit || "NOS",
              stateRates: {
                create: [
                  { 
                    state: rate.vendor.state, 
                    supplyPlusInstallationRate: negotiatedRate || rate.submittedRate,
                    labourRate: 0,
                    supplyOnlyRate: 0
                  }
                ]
              }
            }
          });
          itemId = newItem.id;
        }

        await tx.vendorRate.update({
          where: { id: req.params.id },
          data: {
            item: itemId ? { connect: { id: itemId } } : undefined,
            negotiatedRate: negotiatedRate ?? null,
            activeRate: negotiatedRate || rate.submittedRate,
            status: "Active"
          }
        });

        return { success: true };
      });

      res.json(result);
    } catch (e: any) {
      console.error("Failed to approve rate:", e);
      res.status(400).json({ error: e.message || "Failed to approve rate" });
    }
  });

  app.post("/api/boqs/:id/create-po", authenticate, authorize(["Admin", "Estimator"]), async (req, res) => {
    const boqId = req.params.id;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const boq = await tx.bOQ.findUnique({
          where: { id: boqId },
          include: { lineItems: { include: { item: true } } }
        });

        if (!boq || boq.status !== "Approved") {
          throw new Error("Only approved BOQs can generate POs");
        }

        const settings = await tx.settings.findUnique({ where: { id: "default" } });
        let poNextNumber = settings?.poNextNumber || 1;
        const poSeries = settings?.poSeries || "PO";
        const defaultTerms = settings?.poTerms || "";
        const defaultGstRate = settings?.defaultGstRate || 18;

        const vendorGroups: Record<string, any[]> = {};

        for (const li of boq.lineItems) {
          let vendorId = li.vendorId;
          let rate = li.rate;

          if (!vendorId) {
            const lowestRate = await tx.vendorRate.findFirst({
              where: { 
                itemId: li.itemId, 
                status: "Active"
              },
              orderBy: { activeRate: 'asc' },
              include: { vendor: true }
            });
            if (lowestRate && lowestRate.activeRate !== null) {
              vendorId = lowestRate.vendorId;
              rate = lowestRate.activeRate;
            }
          }

          if (vendorId && rate !== null && rate !== undefined) {
            if (!vendorGroups[vendorId]) vendorGroups[vendorId] = [];
            
            const gstRate = li.gstRate || defaultGstRate;
            const lineSubTotal = li.quantity * rate;
            const lineGst = lineSubTotal * (gstRate / 100);

            vendorGroups[vendorId].push({
              itemId: li.itemId,
              quantity: li.quantity,
              rate: rate,
              gstRate: gstRate,
              gstAmount: lineGst,
              total: lineSubTotal + lineGst
            });
          }
        }

        const createdPos = [];
        const emailsToSend = [];
        for (const [vendorId, items] of Object.entries(vendorGroups)) {
          const subTotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
          const gstAmount = items.reduce((sum, item) => sum + item.gstAmount, 0);
          const totalAmount = subTotal + gstAmount;

          const poNumber = `${poSeries}-${poNextNumber.toString().padStart(4, '0')}`;
          
          const po = await tx.purchaseOrder.create({
            data: {
              poNumber,
              boqId,
              projectId: boq.projectId,
              vendorId,
              subTotal,
              gstAmount,
              totalAmount,
              status: "Draft",
              terms: defaultTerms,
              items: {
                create: items.map(i => ({
                  itemId: i.itemId,
                  quantity: i.quantity,
                  rate: i.rate,
                  gstRate: i.gstRate,
                  gstAmount: i.gstAmount,
                  total: i.total
                }))
              }
            },
            include: { vendor: true, boq: true }
          });
          
          // Collect PO notification email to vendor
          if (po.vendor && po.vendor.email) {
            const portalUrl = `${process.env.APP_URL}/vendor-portal/${po.vendor.token}`;
            const emailBody = `
              <div style="font-family: sans-serif; color: #333;">
                <h2>New Purchase Order - THE SUBTLEINFRA PVT LTD</h2>
                <p>Hello ${po.vendor.name},</p>
                <p>We have issued a new Purchase Order <strong>${po.poNumber}</strong> for you.</p>
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
                  <p style="margin: 5px 0;"><strong>PO Number:</strong> ${po.poNumber}</p>
                  <p style="margin: 5px 0;"><strong>Total Amount:</strong> ${process.env.CURRENCY_SYMBOL || '₹'}${po.totalAmount}</p>
                  <p style="margin: 5px 0;"><strong>Project:</strong> ${po.boq?.name || 'N/A'}</p>
                </div>
                <p>You can view the full details and download the PO from your vendor portal:</p>
                <div style="margin: 20px 0;">
                  <a href="${portalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Access Vendor Portal</a>
                </div>
                <p>Thank you for your partnership.</p>
              </div>
            `;
            emailsToSend.push({
              to: po.vendor.email,
              subject: `New Purchase Order: ${po.poNumber}`,
              body: emailBody
            });
          }

          createdPos.push(po);
          poNextNumber++;
        }

        await tx.settings.update({
          where: { id: "default" },
          data: { poNextNumber }
        });

        return { success: true, count: createdPos.length, pos: createdPos, emailsToSend };
      });

      // Send emails OUTSIDE transaction
      if (result.emailsToSend && Array.isArray(result.emailsToSend)) {
        result.emailsToSend.forEach(email => {
          sendEmail(email.to, email.subject, email.body)
            .catch(err => console.error("Background email sending failed (PO from BOQ):", err));
        });
      }

      res.json(result);
    } catch (e: any) {
      console.error("Error creating POs from BOQ:", e);
      res.status(400).json({ error: e.message || "Failed to create POs" });
    }
  });

  app.get("/api/purchase-orders", authenticate, async (req, res) => {
    try {
      const pos = await prisma.purchaseOrder.findMany({
        include: { 
          vendor: true, 
          boq: {
            include: { project: true }
          },
          project: true,
          items: {
            include: { item: true }
          },
          outflows: true
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(pos);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch purchase orders" });
    }
  });

  app.get("/api/purchase-orders/:id", authenticate, async (req, res) => {
    try {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: req.params.id },
        include: { 
          vendor: true, 
          boq: {
            include: { project: true, client: true }
          },
          items: {
            include: { item: true }
          },
          outflows: true
        }
      });
      if (!po) return res.status(404).json({ error: "Purchase Order not found" });
      res.json(po);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch purchase order details" });
    }
  });

  app.put("/api/purchase-orders/:id", authenticate, authorize(["Admin", "Procurement"]), async (req, res) => {
    const { status, terms, items, vendorId, boqId, projectId } = req.body;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existingPO = await tx.purchaseOrder.findUnique({
          where: { id: req.params.id },
          include: { items: true }
        });

        if (!existingPO) {
          throw new Error("Purchase Order not found");
        }

        let updateData: any = { 
          status, 
          terms,
          vendorId,
          boqId: boqId || null,
          projectId: projectId || null
        };

        if (boqId) {
          const boq = await tx.bOQ.findUnique({ where: { id: boqId }, select: { projectId: true } });
          if (boq?.projectId) updateData.projectId = boq.projectId;
        }

        if (items && Array.isArray(items)) {
          // Delete existing items
          await tx.purchaseOrderItem.deleteMany({
            where: { purchaseOrderId: req.params.id }
          });

          // Create new items
          let subTotal = 0;
          let gstAmount = 0;
          
          const itemsWithGst = items.map((item: any) => {
            const qty = parseFloat(String(item.quantity)) || 0;
            const rate = parseFloat(String(item.rate)) || 0;
            const gstRate = parseFloat(String(item.gstRate)) || 0;
            const lineTotal = qty * rate;
            const lineGst = lineTotal * (gstRate / 100);
            
            subTotal += lineTotal;
            gstAmount += lineGst;
            
            return {
              itemId: item.itemId || null,
              description: item.description,
              unit: item.unit || "Nos",
              quantity: qty,
              rate: rate,
              gstRate: gstRate,
              gstAmount: lineGst,
              total: lineTotal + lineGst
            };
          });

          updateData.items = {
            create: itemsWithGst
          };
          updateData.subTotal = subTotal;
          updateData.gstAmount = gstAmount;
          updateData.totalAmount = subTotal + gstAmount;
        }

        return await tx.purchaseOrder.update({
          where: { id: req.params.id },
          data: updateData,
          include: { vendor: true, boq: true, items: true }
        });
      });

      res.json(result);
    } catch (e) {
      console.error("[API ERROR] PUT /api/purchase-orders/:id:", e);
      res.status(400).json({ error: e instanceof Error ? e.message : "Failed to update purchase order" });
    }
  });

  app.post("/api/purchase-orders", authenticate, authorize(["Admin", "Procurement"]), async (req, res) => {
    const { vendorId, boqId, projectId, items, terms } = req.body;
    
    if (!vendorId) {
      return res.status(400).json({ error: "Vendor is required" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "At least one item is required" });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const settings = await tx.settings.findUnique({ where: { id: "default" } });
        const poSeries = settings?.poSeries || "PO";
        let poNextNumber = settings?.poNextNumber || 1;
        const poNumber = `${poSeries}-${poNextNumber.toString().padStart(4, '0')}`;
        const defaultTerms = settings?.poTerms || "";

        let finalProjectId = projectId;
        if (boqId) {
          const boq = await tx.bOQ.findUnique({ where: { id: boqId }, select: { projectId: true } });
          if (boq?.projectId) finalProjectId = boq.projectId;
        }

        let subTotal = 0;
        let totalGst = 0;
        const itemsWithGst = items.map((item: any) => {
          const qty = parseFloat(item.quantity?.toString() || "0") || 0;
          const rate = parseFloat(item.rate?.toString() || "0") || 0;
          const gstRate = parseFloat(item.gstRate?.toString() || "0") || 0;
          const lineSubTotal = qty * rate;
          const lineGst = lineSubTotal * (gstRate / 100);
          subTotal += lineSubTotal;
          totalGst += lineGst;
          
          const itemData: any = {
            description: item.description || null,
            unit: item.unit || null,
            quantity: qty,
            rate: rate,
            gstRate: gstRate,
            gstAmount: lineGst,
            total: lineSubTotal + lineGst
          };

          if (item.itemId) {
            itemData.item = { connect: { id: item.itemId } };
          }

          return itemData;
        });

        const po = await tx.purchaseOrder.create({
          data: {
            poNumber,
            vendorId,
            boqId: boqId || null,
            projectId: finalProjectId || null,
            subTotal,
            gstAmount: totalGst,
            totalAmount: subTotal + totalGst,
            status: "Draft",
            terms: terms || defaultTerms,
            items: {
              create: itemsWithGst
            }
          },
          include: { 
          vendor: true, 
          boq: { include: { project: true } }, 
          project: true,
          outflows: true
        }
        });

        await tx.settings.update({
          where: { id: "default" },
          data: { poNextNumber: poNextNumber + 1 }
        });

        return po;
      });

      // Send PO notification email to vendor (OUTSIDE transaction)
      if (result.vendor && result.vendor.email) {
        const portalUrl = `${process.env.APP_URL}/vendor-portal/${result.vendor.token}`;
        const emailBody = `
          <div style="font-family: sans-serif; color: #333;">
            <h2>New Purchase Order - THE SUBTLEINFRA PVT LTD</h2>
            <p>Hello ${result.vendor.name},</p>
            <p>We have issued a new Purchase Order <strong>${result.poNumber}</strong> for you.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 5px 0;"><strong>PO Number:</strong> ${result.poNumber}</p>
              <p style="margin: 5px 0;"><strong>Total Amount:</strong> ${process.env.CURRENCY_SYMBOL || '₹'}${result.totalAmount}</p>
              <p style="margin: 5px 0;"><strong>Project:</strong> ${result.boq?.name || 'N/A'}</p>
            </div>
            <p>You can view the full details and download the PO from your vendor portal:</p>
            <div style="margin: 20px 0;">
              <a href="${portalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Access Vendor Portal</a>
            </div>
            <p>Thank you for your partnership.</p>
          </div>
        `;
        
        // Don't await here or wrap in try/catch to avoid failing the response
        sendEmail(result.vendor.email, `New Purchase Order: ${result.poNumber}`, emailBody)
          .catch(err => console.error("Background email sending failed:", err));
      }

      res.json(result);
    } catch (e: any) {
      console.error("Error creating PO:", e);
      res.status(400).json({ error: e.message || "Failed to create PO" });
    }
  });

  // --- Vendor Submission (Public) ---
  app.get("/api/public/vendor-rate/:token", async (req, res) => {
    try {
      const rate = await prisma.vendorRate.findUnique({
        where: { token: req.params.token },
        include: { item: true, vendor: true }
      });
      if (!rate) return res.status(404).json({ error: "Invalid link" });
      res.json(rate);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch vendor rate" });
    }
  });

  app.post("/api/public/vendor-rate/:token", async (req, res) => {
    const { submittedRate } = req.body;
    const rateValue = parseFloat(submittedRate);
    
    if (isNaN(rateValue)) {
      return res.status(400).json({ error: "Invalid rate value" });
    }

    try {
      await prisma.vendorRate.update({
        where: { token: req.params.token },
        data: { submittedRate: rateValue, status: "Pending Review" }
      });
      res.json({ success: true });
    } catch (e) {
      console.error("Error submitting vendor rate:", e);
      res.status(500).json({ error: "Failed to submit rate" });
    }
  });

  // --- Vendor Portal (Public/Token-based) ---
  app.get("/api/public/vendor-portal/:token", async (req, res) => {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { token: req.params.token }
      });
      if (!vendor) return res.status(404).json({ error: "Invalid link" });
      res.json(vendor);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch vendor portal data" });
    }
  });

  app.get("/api/public/vendor-portal/:token/pos", async (req, res) => {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { token: req.params.token }
      });
      if (!vendor) return res.status(404).json({ error: "Invalid link" });

      const pos = await prisma.purchaseOrder.findMany({
        where: { vendorId: vendor.id },
        include: { 
          boq: {
            include: { project: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(pos);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch vendor POs" });
    }
  });

  app.get("/api/public/vendor-portal/:token/pos/:poId", async (req, res) => {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { token: req.params.token }
      });
      if (!vendor) return res.status(404).json({ error: "Invalid link" });

      const po = await prisma.purchaseOrder.findFirst({
        where: { id: req.params.poId, vendorId: vendor.id },
        include: { 
          boq: {
            include: { project: true }
          },
          items: { include: { item: true } }
        }
      });
      if (!po) return res.status(404).json({ error: "PO not found" });
      res.json(po);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch vendor PO details" });
    }
  });

  // --- Vendor Portal Public Routes (Extended) ---
  app.get("/api/public/vendor-portal/:token/items", async (req, res) => {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { token: req.params.token }
      });
      if (!vendor) return res.status(404).json({ error: "Invalid link" });

      const items = await prisma.itemMaster.findMany({
        include: {
          stateRates: {
            where: { state: "Default" }
          }
        },
        orderBy: { name: 'asc' }
      });
      res.json(items);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.get("/api/public/vendor-portal/:token/rates", async (req, res) => {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { token: req.params.token }
      });
      if (!vendor) return res.status(404).json({ error: "Invalid link" });

      const rates = await prisma.vendorRate.findMany({
        where: { vendorId: vendor.id },
        include: { item: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(rates);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch vendor rates" });
    }
  });

  app.post("/api/public/vendor-portal/:token/rates", async (req, res) => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const vendor = await tx.vendor.findUnique({
          where: { token: req.params.token }
        });
        if (!vendor) throw new Error("Invalid link");

        const { itemId, vendorItemName, vendorCategory, submittedRate, vendorUnit, remarks } = req.body;
        const rateValue = parseFloat(submittedRate);

        if (isNaN(rateValue)) {
          throw new Error("Invalid rate value");
        }
        
        const rate = await tx.vendorRate.create({
          data: {
            vendor: { connect: { id: vendor.id } },
            item: itemId && itemId !== 'new' ? { connect: { id: itemId } } : undefined,
            vendorItemName: itemId === 'new' ? vendorItemName : null,
            vendorCategory: itemId === 'new' ? vendorCategory : null,
            submittedRate: rateValue,
            vendorUnit,
            remarks,
            status: "Pending Review"
          }
        });
        return rate;
      });
      res.json(result);
    } catch (e: any) {
      console.error("Error submitting vendor portal rate:", e);
      res.status(400).json({ error: e.message || "Failed to submit rate" });
    }
  });

  app.patch("/api/public/vendor-portal/:token/rates/:id", async (req, res) => {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { token: req.params.token }
      });
      if (!vendor) return res.status(404).json({ error: "Invalid link" });

      const { submittedRate, vendorUnit, remarks } = req.body;
      
      const rate = await prisma.vendorRate.update({
        where: { id: req.params.id, vendorId: vendor.id },
        data: {
          submittedRate: parseFloat(submittedRate),
          vendorUnit,
          remarks,
          status: "Pending" // Reset to pending on update
        }
      });
      res.json(rate);
    } catch (e) {
      res.status(400).json({ error: "Failed to update rate" });
    }
  });

  app.get("/api/vendor-rates", authenticate, async (req, res) => {
    try {
      const rates = await prisma.vendorRate.findMany({
        include: { 
          vendor: true,
          item: true 
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(rates);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch vendor rates" });
    }
  });

  app.patch("/api/vendor-rates/:id", authenticate, async (req: any, res) => {
    if (req.user.role === "Viewer") return res.status(403).json({ error: "Forbidden" });
    const { status, remarks, submittedRate, vendorUnit } = req.body;
    try {
      const rate = await prisma.vendorRate.update({
        where: { id: req.params.id },
        data: { 
          status, 
          remarks,
          submittedRate: submittedRate ? parseFloat(submittedRate) : undefined,
          vendorUnit
        }
      });
      res.json(rate);
    } catch (e) {
      res.status(400).json({ error: "Failed to update rate" });
    }
  });

  app.post("/api/vendor-rates/:id/convert", authenticate, authorize(["Admin", "Estimator"]), async (req: any, res) => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const vendorRate = await tx.vendorRate.findUnique({
          where: { id: req.params.id },
          include: { vendor: true }
        });

        if (!vendorRate || !vendorRate.vendorItemName) {
          throw new Error("Invalid vendor rate or item already in master");
        }

        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const generatedCode = `VND-${timestamp}-${random}`;

        // Create new item in master
        const newItem = await tx.itemMaster.create({
          data: {
            itemCode: generatedCode,
            name: vendorRate.vendorItemName,
            category: vendorRate.vendorCategory || "Uncategorized",
            unit: vendorRate.vendorUnit || "NOS",
            status: "Active",
            stateRates: {
              create: {
                state: vendorRate.vendor.state,
                supplyOnlyRate: vendorRate.submittedRate,
                labourRate: 0,
                supplyPlusInstallationRate: vendorRate.submittedRate
              }
            }
          }
        });

        // Update vendor rate to point to the new master item
        await tx.vendorRate.update({
          where: { id: vendorRate.id },
          data: {
            itemId: newItem.id,
            vendorItemName: null,
            vendorCategory: null,
            status: "Active",
            activeRate: vendorRate.submittedRate
          }
        });

        return newItem;
      });

      res.json(result);
    } catch (e: any) {
      console.error("Failed to convert item:", e);
      res.status(400).json({ error: e.message || "Failed to convert item" });
    }
  });

  // --- Vendor Mapping Routes ---
  app.get("/api/vendor-mappings", authenticate, async (req, res) => {
    try {
      const mappings = await prisma.itemVendorMapping.findMany({
        include: { item: true, vendor: true }
      });
      res.json(mappings);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch vendor mappings" });
    }
  });

  app.post("/api/vendor-mappings", authenticate, authorize(["Admin", "Procurement"]), async (req, res) => {
    const { itemId, vendorId } = req.body;
    try {
      const mapping = await prisma.itemVendorMapping.create({
        data: { itemId, vendorId }
      });
      res.json(mapping);
    } catch (e) {
      res.status(400).json({ error: "Mapping already exists" });
    }
  });

  app.delete("/api/vendor-mappings/:id", authenticate, authorize(["Admin", "Procurement"]), async (req, res) => {
    try {
      await prisma.itemVendorMapping.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete mapping" });
    }
  });

  app.get("/api/items/stats", authenticate, async (req, res) => {
    try {
      const totalItems = await prisma.itemMaster.count();
      const totalCategories = await prisma.itemMaster.groupBy({ by: ['category'] });
      const totalVendorsMapped = await prisma.itemVendorMapping.count();
      const activeItems = await prisma.itemMaster.count({ where: { status: 'Active' } });
      const recentlyUpdated = await prisma.itemMaster.count({
        where: { updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
      });

      res.json({
        totalItems,
        categoriesCount: totalCategories.length,
        totalVendorsMapped,
        activeItems,
        recentlyUpdated
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch items stats" });
    }
  });

  // --- Global Error Handler ---
  app.use("/api/*", (req, res) => {
    console.warn(`[API 404] ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[GLOBAL ERROR]", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
