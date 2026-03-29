# Quantify - Cloud BOQ Manager

A professional Bill of Quantities (BOQ) management system built with React, Express, and Prisma.

## Core Features
- **Auth & Roles**: Estimator, Approver, Viewer roles.
- **BOQ Module**: Excel-like grid for line items, auto-calculated margins.
- **Item Master**: Centralized item repository.
- **Vendor Intelligence**: Track vendor rates, negotiated rates, and rate history.
- **AI Insights**: Gemini-powered margin analysis and cost optimization tips.
- **Approval Workflow**: Secure submission and approval process.
- **Vendor Portal**: Token-based public links for vendor rate submissions.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Lucide Icons, Motion.
- **Backend**: Node.js, Express.
- **Database**: SQLite (via Prisma ORM).
- **AI**: Google Gemini API.

## Setup Instructions

1. **Environment Variables**:
   Create a `.env` file based on `.env.example`:
   ```env
   GEMINI_API_KEY="your_api_key"
   JWT_SECRET="your_secret"
   DATABASE_URL="file:./dev.db"
   ```

2. **Database Initialization**:
   Run the following commands to set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Development**:
   Start the development server:
   ```bash
   npm run dev
   ```

4. **Deployment**:
   The app is configured for Replit/Cloud Run. Ensure `NODE_ENV=production` and run `npm run build` then `npm start`.

## Default Credentials
For testing purposes, you can use the following credentials:
- **Email**: `admin@quantify.com`
- **Password**: `admin123`
- **Role**: Approver

## User Roles
- **Estimator**: Create and edit BOQs, manage items and vendors.
- **Approver**: Review and approve/reject submitted BOQs.
- **Viewer**: Read-only access to BOQs and reports.
