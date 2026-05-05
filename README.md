[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

JustPlay is a social app for discovering, creating, and joining local games.
It combines player profiles, social features, and location-based discovery to help people find the right game and teammates faster.

### Why JustPlay

- Discover nearby games with map-based browsing
- Create and manage your own games in a few steps
- Build your network through profiles, friends, and direct messages
- Stay up to date with notifications and preference controls
- Keep the platform healthy through built-in moderation tools

### Screenshots (Recruiter/Demo View)

![Dashboard](docs/screenshots/dashboard.png)
![Create Game](docs/screenshots/create-game.png)
![Map Discovery](docs/screenshots/map-discovery.png)

### Quick Demo Talking Points

- **Problem:** Local players struggle to find reliable, nearby games.
- **Solution:** A social + map-first platform for pickup game coordination.
- **Outcome:** Faster game discovery, clearer communication, and safer communities.

## Tech Stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS
- Supabase (`@supabase/supabase-js`) for backend/auth/data
- Mapbox (`mapbox-gl`, `react-map-gl`) for map/location features
- PWA support via `vite-plugin-pwa` + Workbox

## Features

- User authentication and protected routes
- Profile setup and editable player profiles
- Game discovery and game creation flows
- Friends and direct messages
- Notification center and notification preferences
- Admin dashboard, users, games, and reports pages
- Lazy-loaded pages with route-level loading skeletons

## Prerequisites

- Node.js 18+ (recommended)
- npm
- A Supabase project
- A Mapbox access token

## Environment Variables

Create a `.env` file in the project root (you can copy `.env.example`):

```bash
cp .env.example .env
```

Required values:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run lint checks:

```bash
npm run lint
```

## Supabase Notes

- Database migrations are stored in `supabase/migrations`.
- Apply migrations to your Supabase project using your normal Supabase CLI workflow.

## Project Structure

```text
src/
  components/      Reusable UI components (auth guards, map, notifications, ratings)
  contexts/        App-level state/context providers (auth, profile, notifications)
  hooks/           Custom React hooks
  lib/             Service layer for Supabase-backed operations
  pages/           Route pages (user and admin)
  types/           Shared TypeScript types
supabase/
  migrations/      SQL migrations
public/
  PWA assets and static files
```

## Routing Overview

Public routes:

- `/`
- `/login`
- `/admin-login`

Protected user routes include:

- `/dashboard`
- `/create-game`
- `/profile`
- `/profile/edit`
- `/profile/:userId`
- `/friends`
- `/messages`
- `/notifications`

Admin routes:

- `/admin`
- `/admin/users`
- `/admin/games`
- `/admin/reports`

## PWA

The app includes service worker setup and offline assets (`public/offline.html`, PWA icons).  
Installability and caching behavior are configured through Vite PWA/Workbox.

## Contributing

Contributions are welcome and appreciated.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-change`)
3. Commit with clear messages
4. Open a pull request with context, screenshots (if UI), and test notes

Before opening a PR:

- Run `npm run lint`
- Verify the app runs locally with `npm run dev`
- Keep changes focused and easy to review

## Roadmap

- [ ] Add complete screenshot gallery and short product demo GIF
- [ ] Improve onboarding flow and first-time user guidance
- [ ] Add richer game filters (skill level, distance, time windows)
- [ ] Expand moderation and reporting workflows
- [ ] Introduce automated tests for critical user flows
