# Drift — Food Pickup API

A production-style REST API for a food-pickup platform: users register and log in, browse restaurants and menus, and place orders that move through a real status lifecycle. Built with Node.js, Express, and MongoDB, secured with JWT authentication, and deployed live.

**Live API:** https://driftres.onrender.com
**Health check:** https://driftres.onrender.com/health

*(Free tier — the first request may take ~30 seconds to wake the server.)*

---

## What it does

- **Authentication** — register and log in with hashed passwords (bcrypt) and JWT tokens.
- **Authorization** — protected routes, plus ownership checks (you can only edit your own restaurant) and role-based permissions.
- **Restaurants & menus** — full CRUD, with menu items embedded per restaurant.
- **Orders** — place an order, with prices validated server-side against the real menu, and a status lifecycle (pending → preparing → ready → completed / cancelled) enforced as a state machine.
- **Email** — order confirmations sent via a third-party email provider.
- **Lists** — filtering, sorting, and pagination on order and restaurant endpoints.

## Tech stack

- **Runtime:** Node.js + Express
- **Database:** MongoDB (Atlas) with Mongoose
- **Auth:** JWT + bcrypt
- **Email:** Resend
- **Testing:** Jest + Supertest
- **Deployment:** Render (API) + MongoDB Atlas (database)

## Architecture

Organized in clean, layered architecture so each file has one job:

```
src/
├── models/         # Mongoose schemas (the data shape)
├── controllers/    # handle req/res, call services
├── services/       # business logic (no HTTP knowledge)
├── routes/         # map URLs to controllers
├── middleware/     # auth guard, centralized error handler
├── validators/     # request validation
└── config/         # database connection
```

Requests flow **route → controller → service → model**, keeping HTTP concerns separate from business logic and making the code testable.

## Key API endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/users/register` | Register a new user | No |
| POST | `/users/login` | Log in, receive a JWT | No |
| GET | `/restaurants` | List restaurants (filter, paginate) | No |
| POST | `/restaurants` | Create a restaurant | Yes |
| PUT | `/restaurants/:id` | Update a restaurant (owner only) | Yes |
| POST | `/orders` | Place an order | Yes |
| GET | `/orders/my-orders` | List your orders | Yes |
| PATCH | `/orders/:id/status` | Advance an order's status | Yes |

Protected routes require an `Authorization: Bearer <token>` header.

## Running locally

```bash
git clone https://github.com/rimshanasrullah-dl/driftRes.git
cd driftRes
npm install
cp .env.example .env   # then fill in your own values
npm run dev
```

Requires a MongoDB connection string and the environment variables listed in `.env.example`.

## Running tests

```bash
npm test
```

Covers registration, validation, and authentication flows using Jest and Supertest.

## What I learned building this

Server-side security (never trusting the client for prices or permissions), the difference between authentication and authorization, embedding vs. referencing in MongoDB, centralized error handling, and deploying a database-backed app to production with environment-based secrets.
