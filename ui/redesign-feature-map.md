# Vocapp redesign: feature coverage map

Every user-facing feature found in `src/` (Oct 2026) and where it lives in the redesign canvas.
Board numbers match the canvas titles. Source file = where the feature is implemented today.

## Navigation
New tabs: **Today · Practice · Words · Progress**. Settings opens from the avatar (phone) or gear (laptop sidebar). Laptop uses a left sidebar.

| # | Feature | Source today | New home (board) |
|---|---|---|---|
| 1 | Google sign-in | Login.jsx, App.jsx | 12 Sign in |
| 2 | Sign out (with confirm) | Settings.jsx | 11 Settings |
| 3 | Account email shown | Settings.jsx | 11 Settings |

## Capture & lookup
| # | Feature | Source today | New home |
|---|---|---|---|
| 4 | Look up word + optional context sentence | Today.jsx | 1 Today, 14 Desktop Today |
| 5 | AI word breakdown (definition, in-your-context meaning, vibe check, register, origin, collocations, example, common traps) | WordSheet.jsx, functions fetchWordBreakdown | 3 Word breakdown, 5 Word detail |
| 6 | Pronunciation (speech synthesis) | WordSheet.jsx | 3, 5, 2, 15, 16 |
| 7 | Spelling auto-correction notice | Today.jsx | 3 (banner), 13 States |
| 8 | "Already in your dictionary" / "not a valid word" errors | Today.jsx | 13 States |
| 9 | Lookup loading skeleton | WordSheet.jsx | 13 States |
| 10 | Practice now from breakdown | Today.jsx | 3 |
| 11 | Save for later (pending word) | Today.jsx, db.savePendingWord | 3 |
| 12 | Pending queue with show/hide + per-word info + Practise | Today.jsx | 1 Today "Saved for later", 4 Words "Saved" filter, 14 |
| 13 | Pending expiry (expiring soon after 5 days, auto-delete after 7) | db.listenToPendingWords | 1, 4, 13 (copy says "kept 7 days" / "Expires in 2 days") |
| 14 | Bell alert for expiring saved words | Dashboard.jsx | 1 Today header bell + 13 popover |
| 15 | Remove a pending word | Today.jsx (onRemove) | 4 Words › Saved › word › Remove (same pattern as 5) |
| 16 | "Added to your dictionary and scheduled" confirmation | Today.jsx | 13 States toast |

## New-word practice (3 sentences + AI coach)
| # | Feature | Source today | New home |
|---|---|---|---|
| 17 | 3 steps: factual, personal, question; "rewrite this sentence using X" prompt | Today.jsx PracticeModal | 2 Session step 6 (step tabs + prompt) |
| 18 | Pre-flight checks: ≥4 words, must contain word, question needs "?" | PracticeModal | 13 States |
| 19 | AI evaluation; diagnosis "what feels off", habit alert, quick tip, how to make it natural | evaluateSentence | 2 Session step 6 (coach card) |
| 20 | Revision attempt after diagnosis | PracticeModal | 2 ("Submit revision") |
| 21 | "I'm stuck → coach's example", Copy & adapt, Advance with model | PracticeModal | 2 |
| 22 | Success + "Master stylist comparison" | PracticeModal | 2 ("Stylist's version") |
| 23 | Info button to reopen word breakdown mid-practice | PracticeModal | 2 ("Word details" link) |
| 24 | Haptics on success/error | multiple | keep as is (no visual change) |

## Review (spaced repetition)
| # | Feature | Source today | New home |
|---|---|---|---|
| 25 | Due count + start review | Today.jsx, Dashboard | 1 Today (session card + "Only reviews") |
| 26 | Flashcard: definition → recall word, first-letter hint, reveal | Review.jsx | 2 step 1, 16 Desktop |
| 27 | Dual meaning (meaning 1 of 2, "also means") | Review.jsx | 2 step 1, 16 |
| 28 | Register + memory anchor (collocations) on card | Review.jsx | 2 step 1 (after reveal) |
| 29 | Got it / Forgot it with swipe + keys 1/2/Space | Review.jsx | 2 ("Swipe to grade"), 16 shortcuts panel |
| 30 | Fill-in-the-blank with 4 options + "I don't know" | Review.jsx, generateQuizQuestion | 2 step 2 |
| 31 | Feedback after answer (explanation) | Review.jsx | 2 step 2 |
| 32 | SRS intervals 1→3→7→14→×2, reset on miss | db.updateWordSRS | grade buttons show next interval ("back to day 1" / "next in 3 days") |
| 33 | Session complete: score %, Needs focus list, Practise weak words, Look up new word | Review.jsx AllCaughtUp | 2 final step |
| 34 | All caught up + next review countdown | Review.jsx | 13 States (Today card) |
| 35 | Export questions (.xls) from review end | Review.jsx | 2 final step link, 11 Settings |
| 36 | Up next preview | Review.jsx | 16 Desktop |
| 37 | Question bank logging per answer | db.saveQuestionToBank | 11 Settings (recent questions) |

## Practice (Studio)
| # | Feature | Source today | New home |
|---|---|---|---|
| 38 | 4 skills (Grammar, Flow, Context, Punctuation) with levels | Studio.jsx | 7 Practice (skill picker), 6 Progress |
| 39 | Daily Tune-Up (focus skill from slips) | Studio.jsx | 7 Practice card + inside 2 Session (steps 3–4) |
| 40 | Tier 1 Spot & Fix | Studio.jsx | 8 Drill, 2 step 3 |
| 41 | Tier 2 Polish (tap-to-swap token) | Studio.jsx | 8 Drill, 2 step 4 |
| 42 | Nuance duel / which word fits (+ hint) | Studio.jsx | 8 Drill "Word fit" |
| 43 | Tier 3 Vault rehab (rewrite a past slip, redeem) | Studio.jsx | 8 Drill "Vault", 9 Vault "Fix it" |
| 44 | Tier 4 Craft (original writing, attempts, spotlight nudge) | Studio.jsx | 8 Drill "Craft" |
| 45 | Tier unlock rules + lock reason | Studio.jsx | 7 Practice (lock icon + reason text) |
| 46 | Listen (TTS cadence) | Studio.jsx playSentenceCadence | 8, 2, 10 |
| 47 | Breath meter / cadence indicator | Studio.jsx BreathMeter | 8 ("Rhythm"), 2 step 4 |
| 48 | XP gain (+20/+30/+40) and loss (−5) | db.recordCraftProgress / deductCraftXP | 8 header chip, 2 step 3 |
| 49 | Craft rank Apprentice → Master + next requirement | db.calcCraftLevel | 6 Progress, 7 header chip |
| 50 | Anthology: save sentence, list, listen, delete | Studio.jsx | 8 ("Save to Anthology"), 10 Anthology |
| 51 | "Crafted" badge on words used in Craft | Dictionary.jsx | 4 Words, 5 Word detail |
| 52 | Deep links from Insights into a skill/tier/mistake | Dashboard switch-tab events | Progress/Vault rows link to 7/8 |

## Words (Dictionary)
| # | Feature | Source today | New home |
|---|---|---|---|
| 53 | Search | Dictionary.jsx | 4, 15 |
| 54 | Filters All / Due / Mastered (+ new Saved) with counts | Dictionary.jsx | 4, 15 |
| 55 | Due-first then A–Z sort | Dictionary.jsx | 4 caption |
| 56 | Status (New / Learning / Mastered) by interval | Dictionary.jsx | strength bars on 4, 5 |
| 57 | Next review label per word | Dictionary.jsx | 4, 5, 15 |
| 58 | Your 3 practised sentences | Dictionary.jsx | 5 |
| 59 | Full breakdown sheet | Dictionary.jsx → WordSheet | 5, 15 |
| 60 | Delete with two-step confirm | Dictionary.jsx DeleteBtn | 5 (playable), 15 |
| 61 | Due/Mastered empty states | Dictionary.jsx | 13 States |

## Progress (Insights)
| # | Feature | Source today | New home |
|---|---|---|---|
| 62 | Streak + best streak (+ week strip) | Today.jsx, Dashboard popover | 1 Today, 6 Progress |
| 63 | Drills solved count | Insights.jsx | 6 |
| 64 | Writing spectrum (slips by skill, %) | Insights.jsx | 6 "Where your slips happen" |
| 65 | Focus area card (headline, rules of thumb, off vs natural, from your practice) | Insights.jsx | 6 |
| 66 | Habits under coaching (status, count, last slip, tip, drill link) | Insights.jsx | 6 |
| 67 | Mistake Vault: All / Unredeemed / Done, grouped by word, what to fix, tip, tags, rehab link | Insights.jsx | 9 Vault |

## Settings
| # | Feature | Source today | New home |
|---|---|---|---|
| 68 | Enable push notifications | Settings.jsx | 11 |
| 69 | Timing: Smart (peak hour) / Custom time | Settings.jsx | 11 |
| 70 | English level L1–L5 + auto-adjust (85% / 55%) | Settings.jsx | 11 "Sentence difficulty" |
| 71 | Interval-1 shield note | Settings.jsx | 11 (footnote) |
| 72 | Question bank: count, export .xls / .csv, recent questions | Settings.jsx | 11 |
| 73 | Reset per skill / all Studio / Insights baseline (confirm sheet) | Settings.jsx | 11 (playable confirm) |

## Server-side (no UI change, keep working)
- Smart notifications job and message tones (`sendSmartNotifications`), activity-hour tracking
- Level-aware question generation and sentence grading (functions/index.js)
- PWA install, service worker, offline seed bank of drills

## Design decisions to note for implementation
- English proficiency levels used the same names as the Craft ranks (Apprentice…Master). The redesign renames proficiency to "Sentence difficulty" with the existing badge names (Foundation, Compound, Complex, Advanced, Rhetorical) so the two ladders don't collide.
- Insights showed "120 XP" to Wordsmith while Studio showed "190 XP". Use one value from `calcCraftLevel` everywhere.
- Streak freeze shown on Progress is a proposed new feature, not in the current code.
