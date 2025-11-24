# AI-WhatsApp-Reservation-App

> ## 🎉 **MIGRATED TO NEXT.JS + SUPABASE**
> This application has been fully migrated to a modern, production-ready Next.js + Supabase stack!
> ✅ **100% Feature Parity** - All Python FastAPI features preserved
> 🚀 **Production Ready** - Deploy to Vercel, Docker, or any Node.js host
> 📚 **See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** for complete migration details
>
> **New Stack:** Next.js 16 + Supabase + TypeScript + Serverless Architecture

![alt text](media/1.png)
![alt text](media/Screenshot%202025-03-14%20014221.png)
![alt text](media/Screenshot%202025-03-14%20014527.png)

A powerful AI-powered WhatsApp reservation system built with **Next.js 16** and **Supabase**, integrated with multiple AI providers (OpenAI, Anthropic Claude, and Google Gemini) for generating intelligent responses to customer inquiries.

The bot allows users to make, modify, and cancel reservations via WhatsApp, while the Next.js application provides a modern full-stack interface for managing reservations, analyzing conversation data, and visualizing business metrics.

**Key Technologies:**
- ⚡ **Next.js 16** - Full-stack framework with App Router & Server Actions
- 🗄️ **Supabase** - PostgreSQL, Auth, Realtime, Edge Functions
- 🤖 **Multi-AI Support** - OpenAI GPT-4, Anthropic Claude, Google Gemini
- 💬 **WhatsApp Business API** - Official Meta WhatsApp integration
- 🎨 **Modern UI** - TailwindCSS, Radix UI, Framer Motion
- 🚀 **Serverless** - Deploy to Vercel or any platform

For the original Python FastAPI version, see git history or [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md).

## Features

- **Multi-Provider AI Integration**: Flexibility to use OpenAI, Anthropic Claude, or Google Gemini for message generation
- **Modern Frontend**: Next.js 16 application with TypeScript and Tailwind CSS for responsive UI
- **TanStack Query**: Fully integrated data fetching and state management with React Query
- **Interactive Documents**: TLDraw-powered document editor for customer notes and visual annotations
- **Comprehensive Config Page**: Centralized configuration management for:
  - Working hours and slot duration settings
  - Calendar and document column customization
  - Multi-language support configuration
  - Timezone and business settings
  - Import/export configuration functionality
- **Reservation Management**: Advanced calendar interface with:
  - Drag-and-drop reservation modification
  - Undo/redo functionality for all reservation operations
  - Multiple calendar views (week, month, list, multi-month)
  - Vacation period management
- **Docker Containerization**: Complete Docker setup for both development and production environments
- **Monitoring & Metrics**: Prometheus integration with alerting capabilities and Discord notifications
- **Advanced Analytics**: Comprehensive statistics dashboard for business insights
- **Automated Scheduling**: Built-in job scheduler for reminders and database backups
- **Internationalization**: Multi-language support (English, Arabic) with i18n capabilities
- **High Performance**: Optimized with uvloop for maximum throughput
- **Secure Authentication**: JWT-based authentication system for frontend access control
- **Domain-Driven Architecture**: Clean architecture with domain services for better maintainability
- **Feature-Sliced Design**: Modern frontend architecture following FSD principles
- **Comprehensive Testing**: Unit tests and integration tests for robust code quality
- **Production-Ready**: Support for production deployment with robust error handling and logging

## Prerequisites

- ✅ **Node.js 20+** - Required for Next.js
- ✅ **Supabase Account** - [Sign up free here](https://supabase.com)
- ✅ **Meta Developer Account** - [Create one here](https://developers.facebook.com/)
- ✅ **WhatsApp Business App** - [Setup guide](https://developers.facebook.com/docs/whatsapp/business-platform/get-started)
- ✅ **AI API Key** - At least one of: OpenAI, Anthropic, or Gemini
- 📦 _(Optional)_ Docker for containerized deployment

## Quick Start (Next.js + Supabase)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd python-whatsapp-bot
npm install
```

### 2. Set Up Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
cd app/frontend
supabase link --project-ref <your-project-id>

# Push database migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

### 3. Configure Environment

Create `app/frontend/.env.local`:

```env
# Supabase (get from https://app.supabase.com/project/_/settings/api)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=EAAxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_VERIFY_TOKEN=your-custom-verify-token
WHATSAPP_APP_SECRET=xxxxx

# AI Provider (choose one)
LLM_PROVIDER=anthropic  # or openai, gemini
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx

# Business Info
BUSINESS_NAME="Your Clinic"
BUSINESS_ADDRESS="Your Address"
TIMEZONE=Asia/Riyadh
```

### 4. Run Development Server

```bash
cd app/frontend
npm run dev
```

Visit `http://localhost:3000`

### 5. Set Up WhatsApp Webhook

1. Go to Meta App Dashboard → WhatsApp → Configuration
2. Set Webhook URL: `https://your-domain.com/api/webhook`
3. Set Verify Token: (same as `WHATSAPP_VERIFY_TOKEN`)
4. Subscribe to `messages` events

### 6. Deploy to Production

**Vercel (Recommended):**
```bash
vercel --prod
```

**Or Docker:**
```bash
docker-compose -f docker-compose.nextjs.yml up -d
```

**Set up Supabase Edge Functions:**
```bash
supabase functions deploy send-reminders
# Configure cron in Supabase dashboard: 0 19 * * * (7 PM daily)
```

---

## Legacy Python Backend

> **Note:** The Python FastAPI backend is now deprecated. Use the Next.js + Supabase version above.
> For migration details, see [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md).

The sections below document the original Python setup (preserved for reference):

## Key Technologies

### Backend

- **FastAPI**: Modern Python web framework for building APIs
- **PostgreSQL/SQLite**: Database for data persistence
- **uvloop**: High-performance event loop
- **Prometheus**: Metrics collection and monitoring
- **Pydantic**: Data validation and settings management

### Frontend

- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **TanStack Query**: Data fetching and state management
- **TLDraw**: Interactive drawing and annotation tool for documents
- **FullCalendar**: Calendar component for reservation management
- **Glide Data Grid**: High-performance data grid component
- **Zustand**: Lightweight state management
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **React Hook Form**: Form state management
- **Vitest**: Fast unit testing framework
- **Biome**: Fast formatter and linter

## Project Structure

```plaintext
├── .github/                  # GitHub workflows and CI configurations
├── app/                      # Main application code
│   ├── auth/                 # Authentication module with JWT handling
│   │   ├── deps.py          # FastAPI dependencies for authentication
│   │   ├── models.py        # Authentication models
│   │   ├── router.py        # Authentication routes
│   │   └── schemas.py       # Pydantic schemas for auth
│   ├── decorators/          # Decorator functions for security, safety, and metrics
│   ├── frontend/            # Next.js frontend application
│   │   ├── app/             # Next.js app directory structure (App Router)
│   │   │   ├── (config)/    # Config page route group
│   │   │   │   └── config/  # Configuration management page
│   │   │   ├── (core)/      # Core application pages
│   │   │   │   ├── dashboard/ # Dashboard page
│   │   │   │   └── documents/ # Documents page
│   │   │   ├── (documents)/ # Documents section route group
│   │   │   ├── (minimal)/   # Minimal layout pages
│   │   │   │   └── tldraw/  # TLDraw standalone page
│   │   │   ├── api/         # Next.js API routes (proxy to FastAPI)
│   │   │   │   ├── config/  # Configuration API endpoints
│   │   │   │   ├── reservations/ # Reservation management endpoints
│   │   │   │   ├── documents/ # Document management endpoints
│   │   │   │   └── ...      # Other API endpoints
│   │   │   ├── provider/    # Global providers (TanStack Query, etc.)
│   │   │   ├── fonts/       # Custom fonts
│   │   │   ├── globals.css  # Global CSS styles
│   │   │   └── layout.tsx   # Root layout component
│   │   ├── features/        # Feature modules (Feature-Sliced Design)
│   │   │   ├── app-config/  # Application configuration feature
│   │   │   ├── calendar/    # Calendar and reservation features
│   │   │   ├── documents/   # Document management feature
│   │   │   ├── reservations/ # Reservation operations feature
│   │   │   └── ...          # Other feature modules
│   │   ├── entities/        # Business entities (FSD layer)
│   │   ├── shared/          # Shared utilities and components
│   │   │   ├── api/         # API client and query configuration
│   │   │   ├── libs/        # Shared libraries (data-grid, calendar, etc.)
│   │   │   └── ui/          # Reusable UI components
│   │   ├── widgets/         # Complex UI widgets (FSD layer)
│   │   │   ├── calendar/   # Calendar widget
│   │   │   └── documents/  # Documents widget
│   │   ├── compositions/    # Page compositions
│   │   │   └── config/      # Config page composition
│   │   ├── infrastructure/  # Infrastructure layer (store, providers)
│   │   ├── public/          # Static assets
│   │   ├── styles/          # Global styles and CSS modules
│   │   ├── next.config.mjs  # Next.js configuration
│   │   ├── package.json     # Frontend dependencies
│   │   ├── tailwind.config.ts # Tailwind CSS configuration
│   │   └── tsconfig.json    # TypeScript configuration
│   ├── services/            # Business logic modules with domain-driven design
│   │   ├── domain/          # Domain layer with business logic
│   │   │   ├── conversation/ # Conversation management
│   │   │   ├── customer/    # Customer management
│   │   │   ├── notification/ # Notification services
│   │   │   ├── reservation/ # Reservation management
│   │   │   └── shared/      # Shared domain utilities
│   │   ├── anthropic_service.py # Anthropic Claude integration
│   │   ├── gemini_service.py    # Google Gemini integration
│   │   ├── openai_service.py    # OpenAI integration
│   │   ├── llm_service.py       # Abstract LLM service interface
│   │   └── assistant_functions.py # Core business logic for reservations
│   ├── utils/               # Utility functions for services and API interactions
│   ├── config.py            # Configuration settings loaded from environment variables
│   ├── db.py                # Database connection and schema definitions using SQLite
│   ├── i18n.py              # Internationalization support
│   ├── metrics.py           # Prometheus metrics definitions
│   ├── scheduler.py         # Background job scheduler for automated tasks
│   └── views.py             # FastAPI route definitions
├── prometheus/              # Prometheus monitoring stack
│   ├── prometheus.yml       # Main Prometheus configuration
│   ├── alert_rules.yml      # Alert rules definitions
│   └── alertmanager.yml     # Alert manager configuration
├── scripts/                 # Utility scripts (deploy, backups, reminders)
├── tests/                   # Test suite
│   ├── unit/                # Unit tests for individual components
│   └── integration/         # Integration tests
├── docker-compose.yml       # Development Docker Compose configuration
├── docker-compose.prod.yml  # Production Docker Compose configuration
├── docker-compose.override.yml # Development overrides
├── Dockerfile.backend       # Dockerfile for FastAPI backend
├── pyproject.toml           # Python project configuration with dependencies
├── biome.json               # Code formatting and linting configuration
├── knip.json               # Unused dependency checker configuration
├── pnpm-workspace.yaml      # pnpm workspace configuration
├── package.json            # Root package.json for monorepo management
├── pnpm-lock.yaml          # pnpm lock file
├── data/postgres           # PostgreSQL data directory (via Docker volume)
├── run.py                  # Entry point to run the FastAPI application
└── README.md               # Project documentation
```

## Overall Operation

The application operates as follows:

1. **Webhook Handling**:

   - The FastAPI application listens for incoming webhooks from WhatsApp at the `/webhook` endpoint.
   - Incoming requests are verified using signature verification to ensure authenticity.

1. **Message Processing**:

   - When a message is received, it is processed by the appropriate LLM service (OpenAI, Anthropic, or Gemini).
   - The application uses a configurable LLM provider to generate intelligent responses based on message content.

1. **Database Interactions**:

   - The application uses PostgreSQL (production) or SQLite (development) to store conversation history, reservation details, and thread information.
   - Multiple tables track different aspects of the business operations.
   - Database backups are automated and can be stored locally or in S3-compatible storage.

1. **Reservation Management**:

   - Users can interact with the bot via WhatsApp to make, modify, or cancel reservations.
   - Assistant functions handle these operations with natural language understanding.

1. **Monitoring and Metrics**:

   - Prometheus collects and stores metrics on system performance and business operations.
   - Alerts are configured for critical conditions and sent to a Discord channel.

1. **Frontend Dashboard**:

   - The Next.js application provides multiple views:
     - **Calendar View**: Interactive calendar for reservation management with drag-and-drop, multiple view modes (week, month, list, multi-month), and undo/redo support
     - **Documents Page**: TLDraw-powered document editor for customer notes, visual annotations, and customer data management
     - **Config Page**: Comprehensive configuration management for working hours, slot durations, column customization, and app settings
     - **Conversation History**: Browser for WhatsApp conversation history
     - **Statistics Dashboard**: Business analytics and metrics visualization
     - **WhatsApp Interface**: Message sending interface with phone contact management

1. **Automated Tasks**:

   - Background scheduler runs daily to send appointment reminders via WhatsApp.
   - Regular database backups are performed and can be uploaded to remote storage.

## Architecture Overview

### Architecture

The application follows modern architectural principles with clear separation of concerns:

#### Backend Architecture (Domain-Driven Design)

- **Domain Layer** (`app/services/domain/`): Contains business logic organized by domain entities

  - `conversation/`: Handles WhatsApp conversation management
  - `customer/`: Manages customer data and profiles
  - `reservation/`: Core reservation business logic with undo/redo support
  - `notification/`: Handles various notification types
  - `shared/`: Common domain utilities and base classes

- **Service Layer**: AI providers and external integrations

- **Infrastructure Layer**: Database (PostgreSQL/SQLite), authentication, and external APIs

#### Frontend Architecture (Feature-Sliced Design)

The frontend follows Feature-Sliced Design (FSD) methodology:

- **app/**: Next.js App Router pages and API routes
- **features/**: Feature modules with business logic
  - `app-config/`: Application configuration management
  - `calendar/`: Calendar and reservation features
  - `documents/`: Document management with TLDraw integration
  - `reservations/`: Reservation operations with undo/redo
- **entities/**: Business entities and domain models
- **shared/**: Shared utilities, API clients, and UI components
  - `api/`: TanStack Query configuration and API client
  - `libs/`: Shared libraries (data-grid, calendar utilities)
- **widgets/**: Complex UI compositions (calendar, documents)
- **infrastructure/**: Global state management (Zustand) and providers

#### Data Fetching

- **TanStack Query**: Fully integrated for all data fetching operations
  - Automatic caching and background refetching
  - Optimistic updates for better UX
  - Query invalidation and cache management
  - React Query DevTools for development

### Testing Strategy

The project includes comprehensive testing:

- **Unit Tests** (`tests/unit/`): Test individual components and functions
- **Integration Tests** (`tests/`): Test component interactions and API endpoints
- **Frontend Tests**: Component and integration tests for React components

## Setup and Installation

### Docker Setup (Recommended)

1. **Clone the Repository**

```bash
git clone https://github.com/your-repo/ai-whatsapp-bot.git
cd ai-whatsapp-bot
```

1. **Configure Environment Variables**

Create a `.env` file based on `.env.example` and update the necessary variables:

```env
# AI Provider API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key

# WhatsApp API Configuration
ACCESS_TOKEN=your_whatsapp_access_token
PHONE_NUMBER_ID=your_whatsapp_phone_id
VERIFY_TOKEN=your_webhook_verify_token
APP_ID=your_meta_app_id
APP_SECRET=your_meta_app_secret

# Business Information
BUSINESS_NAME=your_business_name
BUSINESS_ADDRESS=your_business_address
BUSINESS_LATITUDE=your_latitude
BUSINESS_LONGITUDE=your_longitude

# LLM Configuration
PREFERRED_LLM=openai  # Options: openai, anthropic, gemini
SYSTEM_PROMPT=your_system_prompt

# Monitoring
DISCORD_WEBHOOK_URL=your_discord_webhook_url
```

1. **Start the Application with Docker Compose**

For development:

```bash
docker-compose up
```

For production:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Setup (Alternative)

1. **Install Backend Dependencies**

```bash
pip install -r requirements-backend.in
```

1. **Install Frontend Dependencies**

```bash
cd app/frontend
npm install
```

1. **Run the FastAPI Application**

```bash
python run.py
```

Runs on `http://0.0.0.0:8000` by default.

1. **Run the Next.js Frontend**

```bash
cd app/frontend
pnpm run dev
```

Access at `http://localhost:3000` (default Next.js port).

### Development Scripts

The project includes various development scripts:

**Backend:**

```bash
python run.py                    # Start FastAPI server
python -m pytest tests/          # Run backend tests
```

**Frontend:**

```bash
cd app/frontend
pnpm run dev                    # Start development server (with Turbo)
pnpm run dev:classic            # Start development server (classic mode)
pnpm run build                  # Build for production
pnpm run lint:biome             # Run Biome linter
pnpm run typecheck              # Run TypeScript type checking
pnpm run test                   # Run tests with Vitest
pnpm run test:watch             # Run tests in watch mode
```

**Docker:**

```bash
docker-compose up               # Start all services
docker-compose -f docker-compose.prod.yml up -d  # Start production stack
```

**Code Quality:**

```bash
biome check .                   # Check code formatting and linting
biome format .                  # Format code
knip                            # Check for unused dependencies
pnpm run check                  # Run all checks (typecheck + lint + format)
pnpm run fix                    # Auto-fix linting and formatting issues
```

## Webhook Configuration

Configure the WhatsApp webhook to point to your FastAPI application's `/webhook` endpoint. For local testing, you can use ngrok:

```bash
ngrok http 8000
```

Then configure your webhook URL as: `https://your-ngrok-url.ngrok.io/webhook`

## Monitoring and Alerts

The application includes a complete monitoring stack:

1. **Prometheus**: Collects metrics at <http://localhost:9090>
1. **AlertManager**: Manages alert notifications at <http://localhost:9093>
1. **Discord Alerts**: Sends formatted alert notifications to Discord

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
1. Create a feature branch
1. Make your changes
1. Submit a pull request

## License

This project is licensed under the MIT License. See the `LICENSE.txt` file for details.
