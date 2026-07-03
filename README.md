# AI Enabled Smart Infrastructure Audit & Location Verification System

An enterprise-ready, production-grade infrastructure auditing system built specifically to replicate real college ERP environments. Features strict GPS fencing, dynamic room checklists, real-time tracking, offline synchronization, and automated verification PDF reports.

---

## Key Capabilities

1. **Role-Based Access Control (RBAC)**: Includes specialized portals for `Super Admin`, `Admin`, `Auditor` (estate inspectors), and `Viewer` (quality auditors).
2. **GPS Geofence Locking**: Uses browser Location API to compute Haversine distances to building centers. Audits are blocked unless coordinates align with room boundaries (simulation overrides available for testing).
3. **Dynamic Checklist Engine**: Configurable checklists supporting rating systems, dropdown selection options, photo attachments, and free-text observations.
4. **Auto-save & Offline Capabilities**: Automatically saves active forms to local cache every 10 seconds. Offline submissions queue inside local storage and synchronize once network connection recovers.
5. **Real-time Map Visualizations**: Incorporates Socket.io and Leaflet OpenStreetMap to display live, moving auditor coordinate markers on administrative dashboards.
6. **Institutional PDF Report Printer**: High-fidelity PDF generation containing compliance score gauges, verification timestamps, and embedded photos stamped with a verification QR Code.

---

## Technology Stack

- **Frontend**: React 19, React Router DOM, Axios, Leaflet & React Leaflet, Socket.io Client, Recharts, React Icons, Vanilla CSS
- **Backend**: Node.js, Express, Mongoose, Socket.io Server, Multer, PDFKit, QRCode, Bcrypt
- **Database**: MongoDB (Local or MongoDB Atlas)

---

## Installation & Setup Guide

### 1. Prerequisite Installations
- Node.js (v18+ recommended)
- MongoDB Community Server (Running on localhost default port `27017`)

### 2. Configure Environment Variables
Inside `backend/` directory, create a `.env` file (copied from `.env.example`):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/audit_management
JWT_SECRET=supersecretjwtkeyforcollegeaudit123
JWT_REFRESH_SECRET=supersecretrefreshjwtkeyforcollegeaudit123
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
```

### 3. Install Backend Dependencies & Seed System Data
Navigate to the `backend` directory, install packages, and populate the database with default accounts and 35+ categories:
```bash
cd backend
npm install
npm run seed
```

**Seeded Credentials**:
- **Super Admin**: `superadmin` / `password`
- **Admin**: `admin` / `password`
- **Auditor**: `auditor` / `password`
- **Viewer**: `viewer` / `password`

### 4. Install Frontend Dependencies
Navigate to the `frontend` directory and install packages:
```bash
cd ../frontend
npm install
```

### 5. Running the Application locally
Start the backend and frontend servers:

- **Run Express Server**:
  ```bash
  cd backend
  npm run dev
  ```
  *(Server runs on http://localhost:5000)*

- **Run React Client**:
  ```bash
  cd frontend
  npm run dev
  ```
  *(Vite Client runs on http://localhost:5173)*

---

## Verification & Testing Workflows

1. **Verify Room QR Scan**:
   - Access the auditor dashboard and click **Start Audit** on any assignment.
   - Click the **Simulate QR Scan** button to bypass manual input and proceed to the checklist.
2. **Verify Geofencing Checks**:
   - The Geofence status card displays the distance in meters.
   - If physically outside, tick the **Override coordinates (Simulation)** box. It automatically repositions the auditor within 5 meters of building coordinates.
3. **Verify Offline Caching**:
   - Disconnect network connectivity (or simulate offline state via Chrome DevTools).
   - Complete the form and hit **Submit**. The form saves to the offline queue and submits automatically once connectivity resumes.
