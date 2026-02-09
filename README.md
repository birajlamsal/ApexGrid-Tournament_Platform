📊 ApexGrid — Multi‑Game Tournament Platform

Overview
ApexGrid is a full‑stack multi‑game tournament platform with a game‑selection landing page, tournament + scrims management, live leaderboard views, and an admin console. It’s designed for community events and competitive leagues with a clean, esports‑style UI.

Key Features
- Landing page with game selection (default route)
- Game dashboards (tournaments, scrims, news, stats)
- Admin console for tournaments + scrims + players + teams + announcements
- Participant roster management (teams + players per tournament)
- Live match aggregation via PUBG API (optional)
- Postgres storage for match payloads + normalized stats (optional)

Routes
- `/` — Landing (game selection)
- `/pubg` — PUBG home dashboard (current live game)
- `/pubg/tournaments` — Tournaments list
- `/pubg/tournaments/:id` — Tournament details
- `/pubg/scrims` — Scrims list
- `/pubg/scrims/:id` — Scrim details
- `/pubg/announcements` — Notices & announcements
- `/pubg/contact` — Contact page
- `/pubg/admin` — Admin console
- `*` — Custom 404 page

Tech Stack
- Frontend: React 18, Vite, React Router
- Backend: Node.js, Express
- Database: Postgres (`pg`) for admin data + match data + normalization (optional)
- Auth: JWT (admin login)

Project Structure
├── client/             # Frontend app (Vite)
├── server/             # API + backend logic
├── server/data/        # JSON storage for admin data (legacy v1.0.0)
├── PUBG/               # PUBG assets + data + schema
│   ├── Logo/           # Brand assets
│   ├── Images/         # Static images
│   ├── match_data_raw/ # Raw match payloads
│   └── schema/         # Reference SQL/DBML schema
├── DB_Scheme_Supabase/  # Supabase setup (additions + schema notes)
├── GameLogo/           # Source game logos
├── README.md
├── LICENSE
├── package.json

Getting Started
1) Install
```
npm install
npm --prefix server install
npm --prefix client install
```

2) Configure
Create `server/.env` (or update it) with at least:
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
JWT_SECRET=change_me_super_secret
PUBG_API_KEY=your_pubg_key
DATABASE_URL=postgresql://user:pass@host:5432/postgres
PGSSL=true
```

3) Run locally
```
npm run dev
```

Default ports:
- API: http://localhost:5000
- Client: http://localhost:5173

Notes
- The client proxies `/api` to `http://localhost:5000` via Vite.
- Admin data (tournaments/scrims/players/teams/participants) is stored in Postgres when `DATABASE_URL` is set.
- Match payloads and stats are stored in Postgres when `DATABASE_URL` is set.

Releases
- v1.0.1 — Supabase Postgres version (admin data + matches in DB). `c4d90e3` (zip, tar.gz) — 3 minutes ago.
- v1.0.0 — Local-only version (JSON storage, full local run). `a3f2f52` (zip, tar.gz) — yesterday.

License
MIT — see `LICENSE`.
