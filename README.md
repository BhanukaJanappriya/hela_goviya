# Hela Goviya 🌿

> A farm-to-table e-commerce platform connecting Sri Lankan farmers directly with customers.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## Features

- **Customer** — Browse products, add to cart, checkout, track orders, leave reviews
- **Seller** — Manage products with images, process orders, view analytics
- **Driver** — Accept deliveries, update delivery status, track daily earnings
- **Shared** — Clickable profile modal with avatar upload, live notifications, role-based dashboards

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | SQLite via better-sqlite3 |
| Auth | JWT + bcryptjs |
| Frontend | Vanilla HTML / CSS / JS |

## Project Structure

```
hela_goviya/
├── backend/
│   ├── controllers/       # Route handlers
│   ├── database/          # SQLite schema, seed data, db singleton
│   ├── middlewares/       # JWT auth middleware
│   ├── routes/            # Express router
│   ├── services/          # NotificationService, QueueService
│   └── server.js
└── frontend/
    ├── assets/
    │   ├── css/main.css
    │   └── js/api.js      # Shared API client, UI helpers, profile modal
    ├── pages/
    │   ├── customer.html
    │   ├── seller.html
    │   └── driver.html
    ├── index.html
    ├── login.html
    └── register.html
```

## Getting Started

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Seed the database

```bash
npm run seed
```

### 3. Start the server

```bash
npm start
# or for auto-reload:
npm run dev
```

### 4. Open the frontend

Open `frontend/index.html` in your browser, or use VS Code Live Server pointed at the `frontend/` folder.

The API runs on `http://localhost:3000` by default.

## Test Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@helagoviya.lk | admin123 |
| Customer | customer@helagoviya.lk | customer123 |
| Seller | seller@helagoviya.lk | seller123 |
| Driver | driver@helagoviya.lk | driver123 |
| Vendor | vendor@helagoviya.lk | vendor123 |

## License

[MIT](LICENSE)
