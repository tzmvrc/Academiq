# Academiq – AI-Powered Academic Forum

Academiq is an **AI-powered academic forum** designed to promote meaningful, high-quality discussions in an educational setting. It integrates **AI-based moderation** to help ensure content relevance, academic integrity, and respectful interaction. The system is built with a modern full-stack architecture using **React**, **Node.js**, **Google Authentication**, and **Supabase Storage**.

## 📌 Project Overview

Academiq aims to enhance traditional discussion forums by incorporating artificial intelligence to assist with content moderation and validation. The platform supports user authentication, forum posting, commenting, and AI-driven moderation to maintain academic standards.

## 🛠️ Tech Stack

### Frontend

* **Framework:** React.js
* **Styling:** Tailwind CSS
* **Authentication:** Google OAuth
* **Deployment:** Vercel / Render

### Backend

* **Runtime:** Node.js
* **Framework:** Express.js
* **Authentication:** Google OAuth integration
* **API Style:** RESTful APIs

### Database & Storage

* **Database:** Supabase (PostgreSQL)
* **Storage:** Supabase Storage (images, attachments, documents)

### AI Features

* Qwen 2.5 - 500m parameters model
* AI-powered content moderation
* Academic relevance validation
* Spam and inappropriate content detection

## ✨ Key Features

* Google-authenticated user accounts
* Academic discussion posts and threaded comments
* AI-assisted content moderation
* Secure backend API services
* File and image uploads via Supabase Storage
* Responsive and user-friendly interface

## 📂 Project Structure

```
Academiq/
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page-level components
│   │   ├── services/     # API and auth services
│   │   └── App.jsx
│   └── package.json
│
├── backend/
│   ├── controllers/     # API logic
│   ├── routes/          # Endpoint definitions
│   ├── middleware/      # Auth & validation middleware
│   ├── config/          # Environment & Supabase config
│   └── server.js
└── README.md
```

## 🚀 Getting Started

### Prerequisites

* Node.js (v16 or later recommended)
* npm or yarn
* Google Cloud project with OAuth credentials
* Supabase project (Database + Storage enabled)

### Installation

```bash
git clone https://github.com/your-username/academiq.git
cd academiq
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

#### Backend Setup

```bash
cd backend
npm install
npm start
```

## 🔐 Environment Variables

### Backend (`.env`)

```
PORT=5000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### Frontend (`.env`)

```
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## 🤖 AI Moderation

Academiq integrates AI services to automatically analyze forum content before or after posting. This helps:

* Ensure academic relevance
* Detect spam or inappropriate language
* Support moderators with content validation

## 🎓 Purpose

This project was developed as an **academic / thesis-oriented system**, focusing on AI integration, full-stack development, and real-world authentication and storage solutions.

## 📌 Notes

* Frontend and backend are separated for scalability.
* AI services may run as a separate microservice depending on deployment.

## 👤 Author

**Marc Aspa** <br>
**Samantha Paradero**<br>
**Lawrence De Guia**<br>
**Chasie Caduhada**<br>
**Joshua Natino**

---

This README may be updated as AI features and system architecture evolve.
