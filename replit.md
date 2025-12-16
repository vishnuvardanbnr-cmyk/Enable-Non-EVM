# replit.md

## Overview

This is a full-stack TypeScript web application using React on the frontend and Express on the backend. The project follows a monorepo structure with client, server, and shared directories. It's designed as a starter template with user authentication scaffolding and a component library already in place.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (supports light/dark mode)
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with tsx for TypeScript execution
- **API Pattern**: RESTful API with `/api` prefix for all routes
- **Static Serving**: Built frontend served from `dist/public` in production

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains database table definitions
- **Validation**: Zod schemas generated from Drizzle schemas using drizzle-zod
- **Storage Interface**: Abstract `IStorage` interface in `server/storage.ts` with in-memory implementation (can be swapped for database)

### Project Structure
```
├── client/          # React frontend
│   ├── src/
│   │   ├── components/ui/  # shadcn/ui components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities (queryClient, utils)
│   │   └── pages/          # Page components
├── server/          # Express backend
│   ├── index.ts     # Server entry point
│   ├── routes.ts    # API route definitions
│   ├── storage.ts   # Data storage interface
│   └── vite.ts      # Vite dev server integration
├── shared/          # Shared code between client/server
│   └── schema.ts    # Database schema definitions
└── migrations/      # Drizzle database migrations
```

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: esbuild bundles server, Vite builds client to `dist/`
- **Scripts**: `npm run dev` for development, `npm run build` + `npm start` for production

### Path Aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

## External Dependencies

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)
- **Drizzle Kit**: Database migrations via `npm run db:push`

### UI Libraries
- **Radix UI**: Headless component primitives (dialog, dropdown, tabs, etc.)
- **Lucide React**: Icon library
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant management

### Data & Forms
- **TanStack React Query**: Server state management and caching
- **React Hook Form**: Form handling with `@hookform/resolvers`
- **Zod**: Schema validation

### Development Tools
- **Replit Plugins**: Runtime error overlay, cartographer, dev banner (dev only)
- **TypeScript**: Full type safety across the stack