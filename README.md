# Batloung Farm Distribution System (DIWA2110)

Node.js + Express + MySQL REST API for managing suppliers, fruits, vendors, purchases, sales, stock (per packaging size) and vendor payments.

## Setup

1. Install Node.js (LTS) and MySQL 8.0.16+.
2. Create the database: run `database/schema.sql`, then `database/seed.sql` in MySQL Workbench.
   (Database created before the map feature? Run `database/migration_vendor_location.sql` once instead.)
3. Copy `.env.example` to `.env` and fill in `DB_PASSWORD`.
4. `npm install` (in the project root, once).

## Running (two terminals)

**Terminal 1: back end (API on port 3000)** from the project root:
```
npm run dev
```
It prints `BACK END (API) running: http://localhost:3000/api` and `MySQL connected`.

**Terminal 2: front end (website on port 5173)**:
```
cd frontend
npm start
```
It prints the link to open: `http://localhost:5173`. The front end needs no `npm install`.

The front end finds the API through `frontend/public/js/config.js` (`API_BASE`). Change it to your live API address after deployment.

## Front end

Plain HTML, CSS and JavaScript in `frontend/public`, served by `frontend/server.js`. Pages: Dashboard, Suppliers, Fruits & Stock, Vendors (with map), Purchases, Sales, Payments, Reports.

## Login

The whole API (except `POST /api/auth/login`) requires an administrator login. The frontend shows a sign-in page first.

- First run on an existing database: run `database/migration_admins.sql` once in MySQL Workbench. (New installs get the `admins` table from `schema.sql`.)
- Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` (8+ characters) in `.env`. When the backend starts and no admin exists, it creates that admin automatically.
- More admins: `npm run create-admin -- <username> <password> "Full Name"`
- Passwords are stored as salted scrypt hashes, never as plain text. Login tokens last 8 hours and are signed with `JWT_SECRET`. Five wrong attempts lock that username for 15 minutes.
- Testing in Postman: call `POST /api/auth/login` with `{"username":"...","password":"..."}`, then send the returned token as `Authorization: Bearer <token>`. Or set `AUTH_REQUIRED=false` in `.env` to switch protection off.

## Vendor map

The Vendors page has an interactive map (Leaflet + OpenStreetMap, no API key needed; internet required).

- Adding a vendor: pick the spot by clicking the map, dragging the pin, typing coordinates, "Find on map" (searches the location text) or "Use my current location". If you leave the pin empty, the app tries to pin the vendor automatically from the location text.
- Editing a vendor: the modal opens with the vendor's saved pin on the map.
- Nearest vendors: click the map (or use your current location) to set where you are, choose Walking or Driving, press Find nearest vendors. Results show real road distance and travel time and draw the route.
- API: `GET /api/vendors/nearest?lat=-29.31&lng=27.48&mode=walking&limit=5`
- If you created the database before the map feature, run `database/migration_vendor_location.sql` once. New installs get the columns from `schema.sql`.
- If the public routing servers are unreachable, distances are estimated (dashed line) so the feature keeps working.

## Structure

```
server.js
frontend/   server.js + public/ (index.html, css, js) - the website
database/   schema.sql, seed.sql, reports.sql
src/config/       db.js (pool + withTransaction)
src/routes/       route definitions
src/controllers/  request handling
src/models/       SQL queries
src/middleware/   validate.js, errorHandler.js
src/utils/        helpers.js (calculations)
```

## Endpoints

| Method | URL | Purpose |
|---|---|---|
| POST/GET | /api/suppliers | register / list |
| GET/PUT/DELETE | /api/suppliers/:id | get / update / delete (blocked if purchases exist) |
| POST/GET | /api/fruits | register (with prices per size) / list (`?status=ACTIVE`) |
| PUT | /api/fruits/:id | update fruit and prices |
| GET | /api/fruits/stock | stock per fruit and packaging size |
| GET | /api/fruits/stock/low | low stock items |
| POST/GET | /api/vendors | register / list |
| GET | /api/vendors/search?q= | search by name or phone |
| PUT | /api/vendors/:id | update vendor |
| POST/GET | /api/purchases | record purchase (multi-item, stock increases) / list |
| POST/GET | /api/sales | record sale (multi-item, stock decreases, atomic) / list |
| GET | /api/sales/:id | sale with line items |
| POST | /api/payments | record later payment (CASH / MOBILE_MONEY) |
| GET | /api/payments/outstanding | vendors with outstanding balances |
| GET | /api/payments/vendor/:vendorId | one vendor's balance |
| GET | /api/reports/top-fruits | five most sold fruits |
| GET | /api/reports/revenue?from=&to= | revenue in date range |
| GET | /api/reports/top-vendor | vendor with most boxes |
| GET | /api/reports/stock | current stock levels |

## Sample requests

Sale (credit, partial payment):
```json
POST /api/sales
{"vendor_id":1,"items":[{"fruit_id":3,"packaging_size":"SMALL","quantity":5},{"fruit_id":4,"packaging_size":"MEDIUM","quantity":2}],"payment":{"amount":300,"method":"MOBILE_MONEY"}}
```

Rejected sale (10 large apples requested, only 6 in stock) returns 400 and changes nothing:
```json
POST /api/sales
{"vendor_id":1,"items":[{"fruit_id":2,"packaging_size":"MEDIUM","quantity":1},{"fruit_id":1,"packaging_size":"LARGE","quantity":10}]}
```

Purchase:
```json
POST /api/purchases
{"supplier_id":1,"items":[{"fruit_id":1,"packaging_size":"LARGE","quantity":10,"unit_cost":120}]}
```

## Notes

- Stock is one row per fruit and packaging size (`UNIQUE(fruit_id, packaging_size)`), which also holds the selling price for that size.
- A 9th table, `payments`, supports cash / mobile money / credit tracking.
- Sales and purchases run inside `BEGIN ... COMMIT / ROLLBACK`; any failing item rolls back the whole operation.
- The server logs DB connection failures and keeps running.
