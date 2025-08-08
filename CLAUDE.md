# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pind is a Next.js web application that visualizes locations mentioned in YouTube videos on an interactive map. Users can analyze YouTube URLs to extract location data and export these locations to Google My Maps or KML files.

## Development Commands

- `npm run dev` - Start development server with Turbopack (opens at http://localhost:3000)
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

## Architecture & Structure

### Core Application Flow

- **Entry Point**: `src/app/page.tsx` manages main app state with two primary states: 'landing' and 'dashboard'
- **State Management**: Client-side state for authentication, app navigation, and video analysis
- **Authentication**: Google OAuth integration via `GoogleAuthProvider` wrapper

### Key Components Architecture

**Landing & Authentication Flow**:

- `LandingPage` → `MainDashboard` transition based on video analysis
- `AuthModal` with login/signup modes
- `SignupPrompt` appears after 3 seconds for non-authenticated users
- Google OAuth provider wraps the entire application

**Dashboard Architecture**:

- `MainDashboard` - Main container with responsive layout
- `MapView` - Interactive map display for location visualization
- `HistorySidebar` - Video analysis history management
- `CheckedVideosPanel` - Selected videos management
- `MobileOverlay` - Mobile-responsive navigation overlay

### UI System

- **Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom configuration
- **Theme**: "new-york" style variant with neutral base color
- **Icons**: Lucide React icon library

### Google Integration Layer

- **Maps API**: `src/lib/google-maps-api.ts` handles all Google services integration
- **Core Functions**:
  - `loadGoogleMapsAPI()` - Dynamic Google Maps JavaScript API loading
  - `createGoogleMapsList()` - Google My Maps list creation
  - `createGoogleMapsKML()` - KML file generation for Google Drive
  - `getGoogleAccessToken()` - OAuth2 token management
- **Required Environment Variables**:
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

### Data Models

```typescript
interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  date: string;
  locations: LocationData[];
}

interface LocationData {
  id: string;
  name: string;
  address: string;
  category: string;
  description: string;
  coordinates: { lat: number; lng: number };
  videoId: string;
}
```

## Technical Configuration

- **Framework**: Next.js 15.4.6 with App Router
- **React**: Version 19.1.0 with TypeScript
- **Build Tool**: Turbopack for development
- **Path Aliases**: `@/` maps to `src/` directory
- **Component Organization**:
  - `@/components` - Main components
  - `@/components/ui` - shadcn/ui components
  - `@/lib` - Utility functions and API integrations

## Development Notes

- Application uses client-side routing with state-based navigation
- Mock data is currently used for video analysis (implementation pending)
- Google Maps integration requires proper API keys and OAuth setup
- Mobile-responsive design with dedicated overlay components
- Authentication flow supports both login and signup with Google OAuth

## Reply

- reply always korean unless I said 'in English'
- Whenever I provide an error message, your task is to analyze it, identify the root cause, and explain why the error occurred.
- If you need any additional information to complete my request, you must ask me for it directly. Do not make assumptions or modify the request based on your own judgment.


