# Road to Kakul — live content

The Road to Kakul app and website read **`pack.json`** from this repository every few hours.
Change it here and every phone gets the change, with no new app version.

Keep this repository **public** (the app reads it without a password) and keep only `pack.json` and this note in it.

## What you can change

| Part of `pack.json` | What it does |
|---|---|
| `news` | Cards under **News & dates**. `t` title, `d` date (YYYY-MM-DD), `b` text, `u` official link, `c` courses (`pma_lc`, `tcc`, `mc`, `lcc`, `pn`, `paf_gdp` or `all`) |
| `questions` | Extra practice questions: `subj` (`verbal`, `english`, `maths`, `physics`, `gk`), `q` question, `a` right answer, `w` three wrong answers, `e` explanation |
| `cards` | Extra flashcards: `deck`, `f` front, `b` back |
| `config.blockTids` | Transaction IDs that are fake or used twice. Put the number in quotes, e.g. `["41234567890"]`. The pass stops working on that phone |
| `config.pay.honourMin` / `honourMax` | Shortest and longest honour scholarship, in days (now 5 and 10) |
| `config.pay.honourTimes` | Scholarships per candidate (now 1) |
| `config.pay.honourWords` | Words of reasons needed for each day asked (now 5) |
| `config.pay.logUrl` / `logMap` | Where payments and scholarships are recorded (your Google Form) |
| `config.shareUrl` | The link sent when someone invites a friend |

Always change `version` (e.g. to today's date) when you edit, and check the file still opens in the GitHub app —
one missing comma or quote and phones keep the old copy until it is fixed.
