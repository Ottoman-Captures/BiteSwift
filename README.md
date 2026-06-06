# BiteSwift 🍔

BiteSwift is a premium, full-stack, multi-role food delivery SaaS platform. Built on the **MERN (MongoDB, Express, React, Node.js)** stack, it supports distinct user roles with tailor-made dashboards, interactive order tracking, and an integrated AI support chatbot.

---

## 🚀 Key Features

*   **Multi-Role Dashboards**:
    *   **Customer Portal**: Browse restaurant catalogs, manage shopping carts, apply promo codes, and order food.
    *   **Vendor Portal**: Manage restaurant menus, update order statuses (e.g., preparing, ready), and track earnings.
    *   **Driver Portal**: View available deliveries, accept orders, update delivery status (e.g., picked up, delivered), and collect earnings.
    *   **Admin Dashboard**: Manage user accounts, add/remove restaurants, system-wide analytics, and settings.
*   **Real-time Order Tracker**: Interactive, step-by-step progress tracking for placed orders.
*   **Virtual Wallet & Payment**: Localized wallet balances for instant simulated transactions.
*   **AI Chatbot Assistant**: Embedded AI assistant on the customer dashboard to answer customer support queries in real-time.
*   **Responsive Styling**: Modern, fluid, glassmorphism-based design with customizable CSS variables.

---

## 📁 Repository Structure

```tree
BiteSwift/
├── package.json         # Workspace/monorepo script coordinator
├── .gitignore           # Git exclusions (node_modules, .env, builds)
├── backend/             # Node/Express API Server
│   ├── .env.example     # Environment template
│   ├── config/          # DB connections and configurations
│   ├── middleware/      # Authentication middlewares
│   ├── models/          # Mongoose schema definitions
│   ├── routes/          # API route handlers (Auth, Restaurants, Orders)
│   ├── seed.js          # Mock database seeder script
│   └── server.js        # Main entry point for backend API
└── frontend/            # React Client Application
    ├── public/          # Static HTML & assets
    └── src/             # React codebase
        ├── components/  # Page components (Auth, Dashboards, Cart, AI Chat)
        ├── App.js       # Root React component
        ├── api.js       # Axios instance & interceptors
        └── index.css    # Premium CSS design system
```

---

## 🛠️ Tech Stack

*   **Frontend**: React (v18), Axios, Vanilla CSS (Premium Glassmorphism Design System)
*   **Backend**: Node.js, Express, MongoDB (via Mongoose)
*   **Security**: JWT (JSON Web Tokens) and bcryptjs hashing
*   **Runner**: concurrently (runs frontend & backend simultaneously)

---

## ⚙️ Setup & Installation

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v16 or higher)
*   [MongoDB](https://www.mongodb.com/try/download/community) running locally (port `27017`) or a MongoDB Atlas URI

### 2. Clone the Repository
```bash
git clone <your-repository-url>
cd <repository-folder>
```

### 3. Backend Setup
Navigate to the `backend` folder, copy `.env.example` to `.env`, and fill in the values:
```bash
cd backend
cp .env.example .env
npm install
```
*Make sure `MONGO_URI` points to your active MongoDB instance.*

### 4. Frontend Setup
Navigate to the `frontend` folder and install dependencies:
```bash
cd ../frontend
npm install
```

### 5. Seed Database (Optional)
If you want to populate the database with mock restaurants, menus, and users:
```bash
cd ../backend
npm run seed
```

---

## 🏃 Running the Application

Instead of running backend and frontend in separate terminals, you can launch both from the root workspace directory with a single command:

```bash
# In the root workspace folder:
npm run dev
```

*   **Frontend Client**: [http://localhost:3000](http://localhost:3000)
*   **Backend API**: [http://localhost:5000](http://localhost:5000)
