# PUBG PC Tournament Platform

Production-oriented full-stack scaffold for PUBG PC tournaments, stats, and management.

## Features
- Dark esports UI with GSAP hero and scroll reveals.
- Featured tournaments, matches, team/player stats, winners podiums.
- Tournament listing with search, filters, and sorting.
- Tournament detail view with participants and published results.
- Admin API with simple auth for managing tournaments, players, teams, matches, participants, winners, and announcements.
- Modular and API-ready for PUBG integration.

## Project Structure
- `server/` Express API with JSON persistence in `server/data`.
- `client/` React + Vite frontend.

## Getting Started

### 1) Install dependencies
```bash
npm install
npm --prefix server install
npm --prefix client install
```

### 2) Configure environment
```bash
cp server/.env.example server/.env
```
Default admin login is `admin / admin`. Update `server/.env` as needed.

### 3) Run in development
```bash
npm run dev
```
- API: `http://localhost:5000`
- Client: `http://localhost:5173`

## Admin Auth
- POST `/api/admin/login` with `{ "username": "admin", "password": "admin" }`.
- Use the returned token as `Authorization: Bearer <token>` for admin routes.
## Admin UI
- Visit `http://localhost:5173/admin` for a basic admin panel.

## Data Management
- Source data is in `server/data/*.json`.
- IDs are immutable; updates ignore changes to the ID fields.
- Leaderboard sorting is client-side only and does not mutate stored values.

## Google Forms (External)
- Player form fields: Player Name, PUBG IGN, Discord ID, Email (optional), Region (optional), Profile pic link (optional)
- Team form fields: Team Name, Captain Player ID, Player IDs, Discord Contact, Team logo link (optional), Region (optional)

## Optional PUBG API
- Per-tournament API key fields are supported in tournament records.
- No API calls are made by default.

## Scripts
- `npm run dev` - run server and client concurrently.
- `npm run build` - build client (server has no build step).
- `npm run start` - run server.
