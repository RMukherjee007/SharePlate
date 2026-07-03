# 🍽️ SharePlate — Food Waste Reduction Platform

A full-stack platform designed to reduce food waste by connecting food providers with people, NGOs, and communities who can utilize surplus food effectively.

Built with modern cloud-native architecture using React, Node.js, MySQL, Redis, Docker, and deployed on Google Cloud.

---

## 🌍 Live Demo

🔗 https://shareplate-app-883918498227.us-central1.run.app

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

✅ Browse available food donations  
✅ View food listings in real time  
✅ Claim available food  
✅ Location-based discovery  
✅ Responsive mobile-friendly UI  

### Provider Features

✅ Add surplus food listings  
✅ Manage availability  
✅ Update quantity/status  
✅ Track donation requests  

### System Features

✅ JWT Authentication  
✅ API Rate Limiting  
✅ Redis Caching  
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
 ┌───────────────┬──────────────┐
 ↓               ↓              ↓
MySQL          Redis        JWT Auth
        ↓
Docker + Google Cloud Run
```

---

## 🛠 Tech Stack

### Frontend

- React 19
- React Router
- Vite
- CSS

### Backend

- Node.js
- Express.js
- JWT Authentication
- Express Rate Limiter
- Compression

### Database

- MySQL

### Caching

- Redis

### DevOps

- Docker
- Google Cloud Run

---

## 📂 Project Structure

```bash
Food_Waste_Reduction/
│
├── client/                # React frontend
│
├── src/                   # Backend source
│
├── schema.sql             # Database schema
├── Dockerfile             # Container config
├── start.sh               # Startup script
├── package.json           # Backend dependencies
└── README.md
```

---

## ⚙️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/RMukherjee007/Food_Waste_Reduction.git
cd Food_Waste_Reduction
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
CREATE DATABASE shareplate;
```

Import schema:

```bash
mysql -u root -p shareplate < schema.sql
```

---

## 🔐 Environment Variables

Create a `.env` file:

```env
PORT=5000

MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=yourpassword
MYSQL_DATABASE=shareplate

REDIS_URL=redis://localhost:6379

JWT_SECRET=your_secret
```

---

## ▶️ Running Locally

### Backend

```bash
npm run dev
```

### Frontend

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
docker run -p 5000:5000 shareplate
```

---

## ☁️ Cloud Deployment

This project is deployed using:

- Google Cloud Run

Live deployment:

https://shareplate-app-883918498227.us-central1.run.app

---

## 🚀 Future Improvements

- AI-based demand prediction
- Food expiry detection
- Real-time map integration
- NGO verification system
- Push notifications
- Analytics dashboard

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
