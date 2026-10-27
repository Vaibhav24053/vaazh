# VaazH — Voice Field Sales Intelligence

> Built for Bolna Buildathon 2026 · Solo · 10 days

VaazH turns scattered voice reports from pharma field sales reps into a live, intelligent command center — no app, no typing, just a phone call.

---

## The Problem

10M+ field sales reps in India end their day filling CRM forms on their phones after visiting 15+ chemists. Nobody does it accurately. Sales managers fly blind.

## The Solution

A rep calls a number after each visit and speaks naturally in Hindi or Hinglish:

> "Met Ramesh at Apollo Chemist, Andheri West. Interested in Zincovit, 3 boxes. Mankind giving 12% margin. Follow up Thursday."

VaazH extracts structured data, updates the manager's dashboard in real time, and flags competitor intel automatically.

---

## Demo

🔗 **Live Dashboard:** https://vaazh.vercel.app

### The Pipeline

Rep calls number
↓
Bolna voice agent (Hindi/Hinglish)
↓
Transcript sent to webhook
↓
Claude AI extracts structured data
↓
Supabase stores visit
↓
Dashboard updates in real time
↓
Manager queries by text (“Any competitor intel?”)


---

## Features

- **Voice-first** — reps log visits by talking, not typing
- **Hindi/Hinglish** — natural language, no script required
- **Realtime dashboard** — updates live as calls complete
- **Competitor intel** — automatic flagging of competitor mentions
- **Ask VaazH** — manager queries answered by AI
- **Demo mode** — pre-loaded scenarios for presentations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Voice Agent | Bolna AI |
| Telephony | Bolna + Exotel |
| AI Extraction | Claude (Anthropic) |
| Database | Supabase (Postgres + Realtime) |
| Frontend | Next.js 16 + Tailwind + Framer Motion |
| Deployment | Vercel |

---

## Local Setup

```bash
# Clone the repo
git clone https://github.com/Vaibhav24053/vaazh.git
cd vaazh

# Install dependencies
npm install

# Add environment variables
cp .env.example .env.local
# Fill in your keys

# Run development server
npm run dev
```

### Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

---

## Architecture

┌─────────────────────────────────────────────┐
│ Field Rep │
│ calls Bolna number (Hindi) │
└──────────────────┬──────────────────────────┘
│
▼
┌─────────────────────────────────────────────┐
│ Bolna Voice Agent │
│ Conducts conversation, gets visit info │
└──────────────────┬──────────────────────────┘
│ POST webhook (transcript)
▼
┌─────────────────────────────────────────────┐
│ Next.js API Route │
│ /api/webhook → Claude extraction │
│ Extracts: chemist, area, products, │
│ outcome, competitor, followup │
└──────────────────┬──────────────────────────┘
│
▼
┌─────────────────────────────────────────────┐
│ Supabase │
│ visits table + realtime subscriptions │
└──────────────────┬──────────────────────────┘
│ realtime push
▼
┌─────────────────────────────────────────────┐
│ Manager Dashboard │
│ Live feed · Intel flags · Ask VaazH │
└─────────────────────────────────────────────┘


---

## Built By

**Vaibhav** — AI/ML grad, Mumbai
Solo build for Bolna Buildathon 2026

[LinkedIn](https://linkedin.com/in/vya2405) · [GitHub](https://github.com/Vaibhav24053)

---

*Built with Bolna · Claude · Supabase · Next.js*