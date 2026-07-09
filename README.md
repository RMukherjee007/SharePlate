# 🍽️ SharePlate — Food Waste Reduction Platform

A full-stack platform designed to reduce food waste by connecting food providers with people, NGOs, and communities who can utilize surplus food effectively.

Built with modern cloud-native architecture using React, Node.js, MySQL, Redis, Docker, and deployed on Google Cloud.

---

## 🌍 Live Demo

🔗 https://shareplate-app.onrender.com

---

## 📌 Problem Statement

Millions of tons of edible food are wasted every year while many communities struggle with food insecurity.

**SharePlate** solves this problem by enabling:

- Restaurants to list surplus food
- NGOs to discover available donations
- Communities to access excess food nearby
- Real-time availability management
- Secure and scalable distribution workflow

---

## ✨ Features

### User Features

✅ Secure Registration & JWT Authentication
✅ Browse available food donations  
✅ View food listings in real time  
✅ Claim available food  
✅ Location-based discovery  
✅ Responsive mobile-friendly UI with premium unified styling

### Provider Features

✅ Add surplus food listings  
✅ Manage availability  
✅ Update quantity/status  
✅ Track donation requests  
✅ Secure Role-Based Dashboards

### System Features

✅ JWT Authentication (bcrypt hashed passwords)
✅ AI-based demand prediction & Analytics dashboard
✅ Food expiry detection background service
✅ Real-time data sync using Server-Sent Events (SSE) & Redis
✅ API Rate Limiting  
✅ Compression Middleware  
✅ Cloud Deployment  
✅ Dockerized Infrastructure  

---

## 🏗️ Architecture

```text
Frontend (React + Vite)
        ↓
Backend API (Node.js + Express)
        ↓
  ┌─────────────┬─────────────┐
  ↓             ↓             ↓
MySQL         Redis        JWT Auth
        ↓
Docker + Render / Vercel / GCP
```

---

## 🛠 Tech Stack

### Frontend

- React 19
- React Router
- Vite
- Recharts (Data Visualization)
- Modern CSS (Glassmorphism & Unified Themes)

### Backend

- Node.js
- Express.js
- JWT Authentication & bcryptjs
- Express Rate Limiter
- node-cron (Expiry Service)

### Database

- MySQL

### Caching & Messaging

- Redis (Caching and Pub/Sub for SSE)

### DevOps

- Docker
- Google Cloud Run

---

## 📂 Project Structure

```bash
SharePlate/
│
├── client/                # React frontend (Vite)
│
├── src/                   # Backend source (Express)
│
├── schema.sql             # Database schema
├── Dockerfile             # Container config
├── package.json           # Backend dependencies
└── README.md
```

---

## ⚙️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/RMukherjee007/SharePlate.git
cd SharePlate
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd client
npm install
cd ..
```

---

## 🗄 Database Setup

Create MySQL database:

```sql
CREATE DATABASE food_waste_redistribution_platform;
```

Import schema:

```bash
mysql -u root -p food_waste_redistribution_platform < schema.sql
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5001

DB_HOST=127.0.0.1
DB_USER=root
DB_PASS=
DB_NAME=food_waste_redistribution_platform

REDIS_URL=redis://localhost:6379

JWT_SECRET=your_secret_key
```

---

## ▶️ Running Locally

### Start Redis (Required for real-time events)
```bash
redis-server
```

### Backend

```bash
npm run dev
```

### Frontend (in a new terminal)

```bash
cd client
npm run dev
```

---

## 🐳 Docker Deployment

Build container:

```bash
docker build -t shareplate .
```

Run container:

```bash
docker run -p 5001:5001 shareplate
```

---

## ☁️ Cloud Deployment

This project is designed to be deployed using Google Cloud Run.

Live deployment (Example):

https://shareplate-app-883918498227.us-central1.run.app

---

## 🚀 Future Improvements

- Real-time map integration
- Advanced NGO verification workflows
- Push notifications for new listings

---

## 🤝 Contributing

Contributions are welcome.

```bash
Fork → Clone → Create Branch → Commit → Push → Pull Request
```

---

## 📜 License

This project is licensed under the ISC License.

---

## 👨‍💻 Author

**Raghav Mukherjee**

GitHub: https://github.com/RMukherjee007

---

⭐ If you found this project useful, consider starring the repository.
