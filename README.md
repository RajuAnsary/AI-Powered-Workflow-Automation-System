# BiztelAI Workflow Automation System

A full-stack web application for manufacturing and B2B operational environments. Upload handwritten or semi-structured operational documents (images and PDFs), extract structured data automatically via OCR and AI, review and correct results before saving, and analyze records through a dashboard.

## Features

- **Document Upload** — drag-and-drop or file-select for JPEG, PNG, WebP, and PDF (up to 20 MB)
- **OCR Extraction** — Tesseract.js extracts raw text from uploaded images/PDFs
- **AI Extraction** — Google Gemini (gemini-1.5-flash) converts OCR text into 8 structured fields
- **Confidence Scoring** — per-field confidence indicators (green/yellow/red)
- **Validation** — business rules: required fields, shift codes, machine number format, quantity threshold, duplicate work orders
- **Review Workflow** — edit extracted fields before saving; discard without saving
- **Dashboard** — charts showing records by shift, machine, and daily trend; summary cards
- **History & Search** — filter saved records by machine, shift, date range, and work order number

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS |
| Routing | React Router DOM v7 |
| Charts | Recharts |
| HTTP client | Axios |
| Backend | Node.js + Express 5 |
| Database | MongoDB Atlas + Mongoose |
| OCR | Tesseract.js |
| AI | Google Gemini API (`@google/generative-ai`) |
| PDF conversion | pdf2pic |
| Frontend hosting | Vercel |
| Backend hosting | Render |

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **MongoDB Atlas account** — [mongodb.com/atlas](https://www.mongodb.com/atlas) (free tier works)
- **Google Gemini API key** — [aistudio.google.com](https://aistudio.google.com/app/apikey) (free tier available)

## Local Development Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd "AI-Powered Workflow Automation System"
```

### 2. Configure backend environment

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and fill in your values:

```
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=your-key-here
PORT=5000
FRONTEND_URL=http://localhost:5173
```

### 3. Configure frontend environment

```bash
cd ../client
cp .env.example .env
```

Edit `client/.env`:

```
VITE_API_URL=http://localhost:5000
```

### 4. Install dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 5. Run both servers

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# Server starts on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# App opens at http://localhost:5173
```

## Environment Variables

### Backend (`server/.env`)

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Google Gemini API key |
| `PORT` | Port for Express server (default: 5000) |
| `FRONTEND_URL` | Frontend origin for CORS (e.g. `https://your-app.vercel.app`) |

### Frontend (`client/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (e.g. `https://your-backend.onrender.com`) |

## Running Tests

```bash
# Backend tests (Jest)
cd server
npm test

# Frontend tests (Vitest)
cd client
npm test
```

## Deployment

### Frontend → Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Set **Root Directory** to `client`
4. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com`
5. Deploy — Vercel auto-detects Vite; `vercel.json` handles SPA routing

### Backend → Render

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Set **Root Directory** to `server`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Add environment variables: `MONGODB_URI`, `GEMINI_API_KEY`, `FRONTEND_URL`
7. Deploy

> After deploying the backend, update `VITE_API_URL` in Vercel with the Render URL, and update `FRONTEND_URL` in Render with the Vercel URL.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload` | Upload file, run OCR + AI + validation |
| `GET` | `/api/records` | List saved records (with optional filters) |
| `PUT` | `/api/records/:id` | Confirm and save a reviewed record |
| `GET` | `/api/dashboard` | Aggregated analytics |
| `GET` | `/health` | Health check |


## Author
Raju Ansary
