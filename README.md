# Popeye — AI Fitness Chatbot

A mobile fitness assistant built with React Native Expo and FastAPI. Chat with an AI coach, track your weight, and manage subscriptions.

**Stack:** React Native (Expo) · FastAPI · Supabase · Groq AI · RevenueCat · Sentry · Ngrok

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- [Ngrok](https://ngrok.com)
- [Expo Go](https://expo.dev/go) on your phone (SDK 54)
- Accounts: [Supabase](https://supabase.com), [Groq](https://console.groq.com), [RevenueCat](https://app.revenuecat.com), [Sentry](https://sentry.io)

---

## Setup

### 1. Supabase

Create a project and run this SQL:

```sql
create table conversations (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), created_at timestamptz default now());
create table messages (id uuid primary key default gen_random_uuid(), conversation_id uuid references conversations(id), user_id uuid references auth.users(id), role text, content text, created_at timestamptz default now());
create table weight_logs (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), date date not null, weight float not null, created_at timestamptz default now(), unique(user_id, date));
create table workout_plans (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), content text not null, saved_at timestamptz default now());
```

Go to Authentication → Providers → Email → turn off **Confirm email**.

### 2. Backend

```bash
python -m venv venv
venv\Scripts\activate
pip install -r backend/requirements.txt
```

Create `.env` in the project root:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-api-key
SENTRY_DSN=your-sentry-dsn
REVENUECAT_SECRET_KEY=your-revenuecat-secret-key
NGROK_AUTHTOKEN=your-ngrok-token
```

Start the server:

```bash
uvicorn backend.main:app --reload
```

### 3. Ngrok

```bash
ngrok config add-authtoken your-ngrok-token
ngrok http 8000
```

Copy the `https://...ngrok-free.app` URL.

### 4. Frontend

```bash
cd frontend
npm install --legacy-peer-deps
```

Create `frontend/.env`:

```
EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.app
EXPO_PUBLIC_REVENUECAT_API_KEY=your-revenuecat-public-key
```

Start:

```bash
npx expo start
```

Scan the QR code with Expo Go. Phone and computer must be on the same WiFi.

---

## Features

- Email/password auth with auto token refresh (Supabase)
- AI fitness chat with conversation history (Groq LLaMA 3.3)
- Onboarding — name, height, weight, goal, target weight
- Daily weight logging synced to Supabase
- Weight progress graph + 30-day consistency tracker
- Subscription paywall — Monthly, Annual, Lifetime (RevenueCat)
- 20 message/day free tier limit enforced on backend
- Backend error monitoring (Sentry)
- Ngrok tunneling for local development

## Notes

- RevenueCat real purchases require a native build (`eas build`). In Expo Go, use the DEV toggle on the subscription screen to simulate Pro.
- Ngrok URL changes on every restart — update `frontend/.env` and press `r` in the Expo terminal.
