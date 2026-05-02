JustPlay is a social platform for discovering, creating, and joining local games.  
It includes player profiles, friend connections, messaging, notifications, and an admin area for moderation.

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
