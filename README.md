# 🧵 Embroidery Production Coordinator

A full-stack web app for managing embroidery production from art intake through digitization to finished production.

## Features

- **Secure login** — JWT authentication, multiple user roles (Admin, Staff, Digitizer, Production)
- **Order management** — Track orders through every production stage with full history
- **File uploads** — Upload `.ai`, `.eps`, `.svg`, `.dst`, `.emb`, `.pes`, `.png`, `.jpg`, `.psd` and more
- **Team chat** — General team chat + per-order chat threads
- **Activity log** — Every action logged with user and timestamp
- **Customer database** — Track customers and link them to orders
- **Dashboard** — Live production stats, urgent alerts, overdue warnings

## Production Stages

Intake → Digitization → Production → QA → Completed

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| File uploads | Multer (local disk) |
| Hosting | Render.com (free) + Vercel (free) |

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- A free PostgreSQL database from [neon.tech](https://neon.tech)

### Step 1: Get a Free Database (Neon.tech)

1. Go to [neon.tech](https://neon.tech) and sign up (free, no credit card)
2. Create a new project — name it "embroidery-coordinator"
3. Copy the **connection string** — it looks like:
   `postgresql://user:password@host.neon.tech/dbname?sslmode=require`

### Step 2: Set Up the Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and fill in:
```
DATABASE_URL=postgresql://your-neon-connection-string
JWT_SECRET=pick-any-long-random-string-like-this-abc123xyz789
FRONTEND_URL=http://localhost:5173
```

Initialize the database:
```bash
node db/setup.js
```

You'll see:
```
✅ Database schema created successfully!
Default admin login:
  Email:    admin@embroidery.local
  Password: Admin1234!
```

Start the backend:
```bash
npm run dev
```

Backend runs on http://localhost:3001

### Step 3: Set Up the Frontend

In a new terminal:
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

### Step 4: Log In

Open http://localhost:5173 in your browser.
Log in with:
- **Email:** admin@embroidery.local
- **Password:** Admin1234!

**IMPORTANT:** Change your admin password immediately after logging in!

---

## Deploying to the Web (Free Hosting)

The recommended setup is **Render.com for the backend** and **Vercel for the frontend**. Both are free.

### Option A: Render.com + Vercel (Recommended — Free)

#### Backend on Render.com

1. Push your code to GitHub (create a free account at github.com if you don't have one)
2. Go to [render.com](https://render.com) and sign up (free)
3. Click **New → Web Service**
4. Connect your GitHub repo
5. Configure:
   - **Root directory:** `backend`
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
6. Add **Environment Variables:**
   - `DATABASE_URL` → your Neon connection string
   - `JWT_SECRET` → a long random string (e.g. use [randomkeygen.com](https://randomkeygen.com))
   - `FRONTEND_URL` → your Vercel URL (add this after deploying frontend)
   - `NODE_ENV` → `production`
7. Click **Create Web Service**
8. Wait for deploy. Copy your Render URL: `https://your-app.onrender.com`
9. Run the DB setup once via Render's Shell tab: `node db/setup.js`

> **Note:** Render's free tier "sleeps" after 15 min inactivity — first load takes ~30 seconds to wake up. Upgrade to a paid plan ($7/mo) to avoid this.

#### Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Click **Add New → Project**
3. Import your GitHub repo
4. Configure:
   - **Root directory:** `frontend`
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
5. Add **Environment Variable:**
   - `VITE_API_URL` → `https://your-app.onrender.com/api`
6. Click **Deploy**
7. Copy your Vercel URL. Go back to Render and update `FRONTEND_URL` to this URL.

#### File Storage Note
By default, uploaded files are stored on the server's disk. On Render's free tier, files are deleted on each deploy. To persist files, either:
- Upgrade to Render's paid plan + add a Disk ($1/month/GB)
- Or use Cloudflare R2 (free 10GB/month) — ask for the R2 upgrade guide

---

### Option B: Railway.app (Easiest — ~$5/month)

Railway is the simplest option — everything in one place.

1. Go to [railway.app](https://railway.app) and sign up
2. Create a new project → **Deploy from GitHub**
3. Add a **PostgreSQL** database plugin
4. Set environment variables in the backend service
5. Railway gives you $5/month free credit — enough for a small team

---

## User Roles

| Role | Can Do |
|---|---|
| **admin** | Everything — manage users, reset passwords, delete orders, view all activity |
| **digitizer** | View and update orders, upload files, chat |
| **production** | View and update orders, upload files, chat |
| **staff** | View orders, upload files, chat |

Admins can create new user accounts from the **Manage Users** page.

---

## Supported File Types

| Type | Extensions | Category |
|---|---|---|
| Adobe Illustrator | `.ai`, `.eps`, `.svg`, `.psd` | Art |
| PDF | `.pdf` | Art |
| Stitch files | `.dst`, `.emb`, `.pes`, `.jef`, `.vp3`, `.hus`, `.exp` | Embroidery |
| Images | `.png`, `.jpg`, `.gif`, `.tif`, `.bmp` | Preview |

Max file size: **50 MB** per file, up to **10 files** per upload.

---

## Folder Structure

```
embroidery-coordinator/
├── backend/
│   ├── server.js           — Express app entry point
│   ├── .env.example        — Copy to .env and fill in
│   ├── db/
│   │   ├── schema.sql      — Database tables
│   │   ├── index.js        — DB connection pool
│   │   └── setup.js        — Run once to initialize DB
│   ├── middleware/
│   │   ├── auth.js         — JWT verification
│   │   └── logger.js       — Activity logging
│   ├── routes/
│   │   ├── auth.js         — Login, me, change-password
│   │   ├── orders.js       — Order CRUD + stage management
│   │   ├── files.js        — File upload/download
│   │   ├── chat.js         — Messages
│   │   ├── users.js        — User management
│   │   ├── customers.js    — Customer management
│   │   └── activity.js     — Activity log
│   └── uploads/            — Uploaded files stored here
└── frontend/
    ├── src/
    │   ├── App.jsx          — Router + layout
    │   ├── api.js           — Axios instance + auth
    │   ├── contexts/
    │   │   └── AuthContext.jsx
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Dashboard.jsx
    │       ├── Orders.jsx
    │       ├── OrderDetail.jsx
    │       ├── Chat.jsx
    │       ├── ActivityLog.jsx
    │       ├── Users.jsx
    │       └── Customers.jsx
    └── index.html
```

---

## Support

Built for your embroidery business. If you need help adding features (invoicing, email notifications, Cloudflare R2 file storage, etc.), just ask!
