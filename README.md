# Popeye — AI Fitness Chatbot

React Native Expo frontend + FastAPI backend. All API keys and credentials are pre-configured in the `.env` files — no setup needed, just install and run.

> This is a private repo. The `.env` files are intentionally included with all credentials pre-filled. You do not need to create any accounts or API keys.

---

## What you need installed

- Python 3.11+ — [python.org](https://python.org)
- Node.js 18+ — [nodejs.org](https://nodejs.org)
- [Ngrok](https://ngrok.com) — download and install
- [Expo Go](https://expo.dev/go) on your phone (SDK 54)

---

## 1. Backend

> **One-time Supabase setup:** Go to your Supabase project → SQL Editor and run:
> ```sql
> create table conversations (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), created_at timestamptz default now());
> create table messages (id uuid primary key default gen_random_uuid(), conversation_id uuid references conversations(id), user_id uuid references auth.users(id), role text, content text, created_at timestamptz default now());
> create table weight_logs (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), date date not null, weight float not null, created_at timestamptz default now(), unique(user_id, date));
> create table workout_plans (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), content text not null, saved_at timestamptz default now());
> ```
> Also go to Authentication → Providers → Email → turn off **Confirm email**.

```bash
python -m venv venv
venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

Test it — open `http://127.0.0.1:8000/health` in your browser. Should return `{"status": "ok"}`.

---

## 2. Ngrok tunnel

Open a second terminal:

```bash
ngrok config add-authtoken <ngrok-token-from-env>
ngrok http 8000
```

Copy the `https://...ngrok-free.app` URL you get.

---

## 3. Frontend

Update `frontend/.env` with the Ngrok URL from step 2:

```
EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.app
```

Then:

```bash
cd frontend
npm install --legacy-peer-deps
npx expo start
```

Scan the QR code with Expo Go. Phone and computer must be on the same WiFi.

---

## Notes

- Ngrok URL changes every restart — update `frontend/.env` and press `r` in the Expo terminal.
- Free tier: 20 messages/day. Paywall shows after that.
- RevenueCat purchases are mocked in Expo Go — needs a native build to test real payments.
