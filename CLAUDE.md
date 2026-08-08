# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — run the server with nodemon (auto-restart on file changes). Entry point is `server.js`, which loads `.env`, connects to MongoDB, and starts Express on port 3000.
- There is no lint, build, or test setup. `npm test` is a stub that exits with an error.
- Requires a `.env` file at the project root with `MONGO_URI` and `JWT_SECRET`.

## Architecture

Express 5 + Mongoose REST API, ESM (`"type": "module"` in package.json — use `import`/`export`, not `require`).

Request flow follows a layered pattern: **routes → middleware → controller → service → model**.

- `server.js` — process entry point: loads env, calls `connectDB()`, starts the HTTP listener. Contains a large commented-out block of the original inline (pre-refactor) route implementations — kept as reference, not live code.
- `src/app.js` — builds the Express app: JSON body parsing, mounts `/restaurants` and `/user` routers, and registers the global `errorHandler` last.
- `src/config/db.js` — `connectDB()` opens the Mongoose connection to `MONGO_URI`; exits the process on failure.
- `src/routes/` — defines endpoints per resource and wires up which middleware (auth, role check, validation) applies to each route.
- `src/controllers/` — parses `req`/`res`, delegates business logic to the matching service, and calls `next(error)` on failure. Controllers do authorization checks that depend on the request (e.g. "is this user the owner"); role-based checks are done via middleware.
- `src/services/` — the only layer that talks to Mongoose models directly. Pure business logic, no `req`/`res`.
- `src/models/` — Mongoose schemas (`User`, `Restaurant`). `Restaurant.menu` is an embedded array of `menuSchema` subdocuments, managed via `restaurant.menu.id(itemID)`/`.push()`/`.pull()` in `MenuServices.js`, not a separate collection.
- `src/middleware/authmiddleware.js` — `protectedRoutes` verifies the JWT from `Authorization: Bearer <token>` and sets `req.user = { id, role }`.
- `src/middleware/roleCheckmiddleware.js` — `restrictTo(...roles)` factory for role-gating routes (e.g. `restrictTo("admin")`); must run after `protectedRoutes`.
- `src/middleware/errorHandler.js` — single global error handler mounted at the end of the middleware chain in `app.js`. Maps Mongoose `ValidationError`/`CastError`/duplicate-key (11000) and `appError`-thrown errors (`err.statusCode`/`err.details`) to JSON responses; everything else becomes a 500.
- `src/utils/appError.js` — `appError(statusCode, message)` builds an `Error` carrying `statusCode`, understood by `errorHandler`. `message` can be a string or an array of validation messages (joined for `.message`, kept as `.details`).
- `src/validators/` — request-body validation middleware (e.g. `validateRegister`, `validateLogin`) that runs before the controller and calls `next(appError(400, [...]))` on failure.

### Auth model

JWT-based. On login/register, a token embedding `{ id, role }` is signed with `JWT_SECRET` (10-day expiry). Protected routes require `protectedRoutes` middleware; admin-only routes additionally require `restrictTo("admin")`. Restaurant update, and menu item add/update, enforce ownership (`restaurant.createdBy` vs `req.user.id`, or admin) directly in the controller. Restaurant delete and menu item delete are gated by `restrictTo("admin")` at the route level instead — no owner bypass for those two.

### Adding a new resource

Follow the existing restaurant/user pattern: model in `src/models/`, data-access functions in `src/services/`, request handling in `src/controllers/`, route wiring (with appropriate `protectedRoutes`/`restrictTo`/validators) in `src/routes/`, then mount the router in `src/app.js`.

For a resource nested under another (e.g. `MenuRoutes.js` under restaurants), use `express.Router({ mergeParams: true })` so the parent's `:id` param is visible, and mount it from the parent router (`restaurantRoutes.use("/:id/menu", menuRoutes)`) rather than from `app.js`.
