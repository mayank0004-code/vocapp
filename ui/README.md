# VocApp UI Design Reference Catalog

Complete UI design snapshot references for [VocApp](https://vocapp-d94e1.web.app), captured across three standard device aspect ratios and viewport densities.

---

## Directory Overview

| Directory | Device Reference | Viewport | Native Pixel Resolution | Files |
| :--- | :--- | :--- | :--- | :--- |
| [`ui_laptop/`](./ui_laptop) | **MacBook Pro / Air** | `1512 × 982` | `3024 × 1964` (2x Retina) | **23 PNGs** |
| [`ui_phone/`](./ui_phone) | **iPhone 16** | `393 × 852` | `1179 × 2556` (3x Super Retina) | **23 PNGs** |
| [`ui_tablet/`](./ui_tablet) | **iPad (10th Gen / Air)** | `820 × 1180` | `1640 × 2360` (2x Retina) | **23 PNGs** |

---

## Screen & Feature Reference Inventory

Each folder contains the following 23 high-fidelity reference captures:

### 1. Today Tab (Home)
- `01_today_main.png` — Default home view (week streak tracker, word lookup textbox, context input).
- `01_today_with_review_due.png` — **Home view with active review banner** displaying `DUE FOR REVIEW (5 scheduled words)` and `Review 5 words` primary action button.
- `02_today_streak_popover.png` — Streak badge popover displaying current streak (`1-day streak 🔥`) and best record (`Best: 30 days`).

### 2. Review Tab
- `03_review_queue.png` — Review queue idle/all-caught-up state (countdown to next review batch, export questions button).
- `03_review_flashcard_front.png` — **Active review flashcard front** (`REVIEW 1 OF 5 · UP NEXT: perplexed`, Core Meaning, Relates To context, Memory Anchor, Hint button, Spacebar/tap instructions).
- `03_review_flashcard_flipped.png` — **Active review flashcard flipped/answered** (Revealed word `provenance`, in-context sentence, alternate meaning notes, `🔴 Forgot it (1)` & `🟢 Got it! (2)` grading buttons).

### 3. Studio Tab (Drills & Practice Hub)
- `04_studio_drill1_spot_and_fix.png` — Daily Tune-Up banner, Craft XP rank badge, Drill 1 "Spot & Fix" (audio cadence preview button, multiple-choice grammar options).
- `05_studio_drill2_polish_cadence.png` — Drill 2 "Polish & Cadence" (inline sentence token highlighter, cadence indicator, replacement token chips).
- `06_studio_drill3_vault_rehab.png` — Drill 3 "Vault Rehab" (rehabilitating past mistake slips, pedagogical hint box, rewrite textarea, redeem trigger).
- `07_studio_drill4_craft_locked.png` — Drill 4 "Craft" showing lock badge and unlock requirements.

### 4. Dictionary Tab
- `08_dictionary_all.png` — Complete vocabulary library showing search bar and all 84 words with status pills (*Learning*, *New*, *Mastered*, *Crafted ✨*).
- `09_dictionary_filter_due.png` — Filtered by words due for active spaced repetition review (`Due (5)`).
- `10_dictionary_filter_mastered.png` — Filtered by words that have reached Mastered tier.
- `11_dictionary_word_expanded.png` — Inline accordion expansion of a word item showing definition, context sentences, and management actions.
- `12_dictionary_word_modal_breakdown.png` — Full Word Breakdown sheet/modal displaying pronunciation audio, dictionary definition, formal register notes, collocations, and contextual examples.

### 5. Insights Tab
- `13_insights_overview.png` — Top performance metrics (Level 2 Craftsman rank, 180 XP progress bar, streak counter, solved drill counts).
- `14_insights_active_coaching.png` — "Habits Under Active Coaching" section with habit cards (Mechanical Word Pairing, Clause Stacking, Syntactic Nuance).
- `15_insights_mistake_vault.png` — "Focus Area · Rhythm & Sentence Flow" rules of thumb and "The Mistake Vault" slip archive.

### 6. Settings Modal / Views
- `16_settings_notifications.png` — Push notification toggles and Timing Strategy dropdown (Smart Timing / Custom).
- `17_settings_english_proficiency.png` — English proficiency calibration tiers (L1 Apprentice to L5 Master) and automatic difficulty adjustment settings.
- `18_settings_question_bank.png` — Spaced repetition question archive pool, Excel (.xls) and CSV (.csv) export triggers, and recent question logs.
- `19_settings_studio_progress.png` — Skill progress reset controls (Grammar, Flow, Context, Punctuation) and Insights baseline cleanse.
- `20_settings_account.png` — User account profile (`mayank360bansal@gmail.com`) and Sign Out action.
