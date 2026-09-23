# Time Matrix — Instagram Reels Posting-Time & Performance Prediction App

**Time Matrix** is an analytics and personal prediction web application tailored for Instagram Reels creators. It captures immutable timestamps at the moment of publishing, runs a strict 24-hour verification countdown, records actual view counts, and uses a self-learning 3-stage intelligence engine to uncover your optimal posting windows.

---

## 🌟 Key Features

1. **Automatic Date & Time Capture (IST & UTC)**
   - Automatically stamps the exact publication moment in Indian Standard Time (IST).
   - Stored in standard UTC ISO format to prevent timezone bugs across devices or international travel.
   - **Immutable**: Once a post is confirmed, its timestamp is locked to ensure model data integrity.

2. **Strict Segregation: Trial Reels vs. Public Reels**
   - Instagram distributes trial reels to non-followers differently than standard public reels.
   - Time Matrix runs **isolated timelines, separate datasets, and independent prediction models** for Trial and Public posts. They are never mixed.

3. **24-Hour Performance Check-In Queue**
   - Live countdown timer for each post until 24 hours have elapsed.
   - At 24h, the check-in unlocks an inline prompt to record verified view counts.
   - Once submitted, the data point `(date, day_of_week, time_bucket, post_type) → views` is locked permanently.
   - Includes a *Simulate 24h Elapsed* testing shortcut for instant evaluation.

4. **3-Stage Self-Learning Prediction Engine**
   - **Stage 1 (0–15 posts)**: *Cold Start Descriptive Mode*. Computes median and average views across the 4 daily time buckets (Morning 6am–12pm, Afternoon 12pm–5pm, Evening 5pm–9pm, Night 9pm–6am) and days of the week. Honestly reports baseline stats without premature claims.
   - **Stage 2 (15–50 posts)**: *Recency-Weighted Scoring*. Uses exponential decay (21-day half-life) to give recent posts higher importance, adapting dynamically to Instagram's shifting algorithms, accompanied by sample-size confidence scores.
   - **Stage 3 (50+ posts)**: *Contextual Multi-Armed Bandit (UCB1)*. Intelligently balances **Exploitation** (recommending proven top slots) with targeted **Exploration** (testing new or less-frequented audience windows to discover emerging peaks).

5. **Algorithm vs. User Choice Comparison**
   - Every post is tagged as `Algorithm Suggested` or `My Own Choice`.
   - The app maintains a running comparison report displaying median views, average views, top posts, and the performance edge (%) of following the algorithm.

6. **Weekly External Signals Log**
   - Log platform news, shadow-ban reports, trending audio, or algorithm updates.
   - Shown alongside performance data to correlate sudden dips or spikes.

---

## 🛠️ Tech Stack & Integration Architecture

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas-Confetti.
- **Design**: Minimalist, dark studio palette, fluid rounded containers (`rounded-2xl`, `rounded-3xl`), responsive mobile-friendly interface.
- **Data Layer (Dual Mode)**:
  - **Local-First Mode (Active)**: Full reactivity with persistent `localStorage` and bundled demo presets (Stage 1, Stage 2, Stage 3, Fresh).
  - **Firebase & Supabase Mode (Ready)**: Pre-wired adapter layer in `src/config/firebase.ts` and `src/config/supabase.ts`.

---

## 🔌 Connecting Firebase & Supabase (Next Step)

Create a `.env` file in the root directory (or use `.env.example`) and supply your keys:

```bash
# Firebase (Structured data: posts, timestamps, views, signals)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Supabase (Media storage: reel preview thumbnails)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_BUCKET_NAME=reel-thumbnails
```

---

## 🚀 Running the App Locally

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Production build & preview
npm run build
npm run preview
```
