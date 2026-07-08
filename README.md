# Café Manager ☕

A fully-featured, production-ready full-stack restaurant management system. Designed for fluid seating operations, instant guest QR-code ordering, feedback analysis, and secure staff management.

## 🛠️ Tech Stack & Architecture

- **Frontend**: Single Page Application built on **React 19** + **Vite 6** + **Tailwind CSS v4** + **Lucide Icons** + **Motion**.
- **Backend API Server**: High-performance **Node.js** + **Express** server operating as a full-stack proxy.
- **Relational Database**: **PostgreSQL** (Google Cloud SQL Developer Edition) managed via **Drizzle ORM** connection pooling.
- **Identity & Authentication**: Secure dual-layer authentication:
  - **Owner Credentials**: Local owner session logins secured via salted **Bcrypt** password hashing and **JWT** stored in secure `httpOnly` cookie.
  - **Google Sign-In**: Enterprise-level federated logins via **Firebase Authentication** verifying ID Tokens backend-side with the **Firebase Admin SDK**.
- **QR Code System**: Dynamic, high-resolution SVG table QR codes allowing guests to scan and tag local sessions instantly.

---

## 📂 Project Structure

```
├── /drizzle                       # Database schema migrations output
├── /src
│   ├── /components
│   │   ├── AdminDashboard.tsx     # Owner control center, live queues, sales statistics
│   │   ├── AdminLogin.tsx         # Unified credential & Google Firebase Auth panel
│   │   └── CustomerView.tsx       # Dynamic guest menu, ordering cart, order tracking, feedback
│   ├── /db
│   │   ├── index.ts               # Drizzle database connection pool (Object Method)
│   │   ├── schema.ts              # PostgreSQL relational tables and relations
│   │   └── drizzle.config.ts      # Drizzle Kit migration tool options
│   ├── /lib
│   │   ├── api.ts                 # Full Fetch-based REST API client
│   │   ├── firebase.ts            # Client-side Firebase initializers
│   │   └── firebase-admin.ts      # Firebase Admin verification setup
│   ├── /middleware
│   │   └── auth.ts                # Dual JWT/Firebase secure route controller
│   ├── App.tsx                    # Main layout coordinator and table-scan routing
│   ├── index.css                  # Global Tailwind imports and theme extensions
│   └── main.tsx                   # Main React DOM entry point
├── server.ts                      # Express backend API router & static assets provider
├── index.html                     # HTML root viewport entry point
├── package.json                   # Applet runtime script mappings
└── metadata.json                  # Workspace permissions configuration
```

---

## 🔑 Environment Setup (`.env.example`)

Declare the following variables inside your live secrets environment:

```env
# URL of your active hosted instance
APP_URL="https://yourapp.com"

# Secure key for signing JWT tokens
JWT_SECRET="your_jwt_signing_secret"
```

---

## 🚀 Active Database Tables (PostgreSQL Schema)

1. **`users`**: Manages owners and staffs.
2. **`tables`**: Captures seating labels, capacities, and statuses (`available`, `occupied`, `reserved`).
3. **`menu_items`**: Menu catalog with description, price, category, imageUrl, and stock availability.
4. **`orders`**: Customer tickets with state status (`pending`, `preparing`, `ready`, `completed`) and total price.
5. **`order_items`**: Ticket line details, quantities, custom preparation notes, and snapshotted prices.
6. **`feedback`**: Post-meal 1-to-5 star ratings and textual comments from dining tables.
7. **`order_history`**: Transaction archival ledger containing snapshot item JSONs and overall revenue stats.

---

## ⚡ Default Login Credentials

For testing and verification right out of the box, the database is auto-seeded with default records:

- **Email**: `admin@cafe.com`
- **Password**: `adminpassword`
