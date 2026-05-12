# KNG Interactions Portal — Major Rebuild Plan

This is a large feature set. Below is the full plan grouped by area. I'll confirm before building.

## 1. Branding & Theming
- Rename portal to **KNG Interactions Portal** (sidebar, login, signup, page titles, SEO).
- Department color tokens in `src/styles.css`:
  - `--dept-events` = purple
  - `--dept-parties` = pink
  - `--dept-entertainment` = cyan
- Badges/cards use department colors.

## 2. Roles & Departments (DB rework)
- New `app_role` enum: `member`, `sld`, `ld`, `aux`, `adm`, `manager`.
- New `department` enum: `events`, `parties`, `entertainment`.
- `profiles` gains `department` (enum), keep `display_name`, `avatar_url`, `status`.
- Permission helpers (SQL):
  - `is_admin_tier(user)` → role in (aux, adm, manager) → can run admin commands (add members, edit prizes, etc).
  - `is_manager(user)` → role = manager → archives + leaderboard oversight + promote/demote.
  - `is_aux_plus(user)` → aux/adm/manager → announcements creation.
- Existing tables (`interactions`, `warnings`, etc.) reused but extended; old generic schema mostly replaced.

## 3. Signup Codes (replace email-only signup)
- New table `signup_codes` { code, created_by, role, department, used_by nullable, used_at, revoked }.
- Signup flow requires a valid one-time code. Code is consumed on signup → assigns role + department.
- Removed users have their code burned (cannot rejoin without new one). Banning = delete profile + revoke; no reuse possible because code is consumed.
- AUX+ can generate codes from an Admin → Codes page. Managers can generate any role; AUX/ADM cannot create manager codes.
- Login still email+password (Supabase requires email); but signup gated by code.

## 4. Persistent Sessions
- Already enabled via Supabase localStorage persistence — verify "stay signed in" works (no auto-logout).

## 5. Schedules (30-min slots, live updating)
- Two schedules:
  - **Events/Parties** schedule (shared) — slot can be booked as event OR party.
  - **Entertainment** schedule (separate).
- Tables:
  - `schedule_slots` { id, schedule_type ('events_parties' | 'entertainment'), slot_start (timestamptz, aligned to :00/:30), booked_by, department, title, status ('booked','in_progress','completed','cancelled'), interaction_id }.
- Unique constraint `(schedule_type, slot_start)` where status != 'cancelled' → prevents overbooking.
- Realtime: enable `supabase_realtime` on `schedule_slots`, `interactions`, `points`, `announcements`. UI subscribes.
- Visual day view, color-coded by department.

## 6. Interaction Logging (replaces old interactions)
- When a slot is marked completed, user logs an **Interaction** with:
  - department, type (event/party/entertainment), title, location, summary
  - **attendees** (multi-select staff who helped) → each gets a point too
  - **winners**: array of `{ winner_id, prize_code, quantity, comped (bool), comped_at, comped_by }`
- Tables:
  - `interactions` (rebuilt) + `interaction_attendees` { interaction_id, user_id } + `interaction_winners`.
- On insert: trigger awards 1 point to author + each attendee in `points_log`.

## 7. Points & Leaderboards
- `points_log` { user_id, interaction_id, amount, awarded_at }.
- Views/queries for daily / weekly / monthly leaderboards.
- Public leaderboard page (all staff see current periods).
- **Archives** page (managers only) — past completed periods snapshot.

## 8. Comp Queue (AUX/ADM)
- Page lists winners where `comped = false`.
- Click a row → copies `!additem [WinnerID] [PrizeCode] [quantity]` to clipboard.
- "Mark as completed" sets `comped=true`, records who & when.
- Prizes catalog table `prizes` { code, name, default_quantity } — editable by managers/AUX/ADM (managers + aux + adm).
- Winner entry uses prize from catalog (or freeform code).

## 9. Posters / Staff Management
- Posters page: AUX+ can promote / demote / rename / change department / remove staff.
- Below AUX: read-only directory.
- Uses `user_roles` updates + `profiles` updates with RLS gated by `is_admin_tier`.

## 10. Announcements (AUX+ post; Member+ read; read-receipt logs)
- `announcements` { id, author_id, title, body, created_at }.
- `announcement_reads` { announcement_id, user_id, read_at } unique pair.
- AUX+ can post; everyone can read; AUX+ can view who has read each one.

## 11. Hall of Fame
- Page with selectable **frame templates** (a few preset SVG/PNG frames bundled in `src/assets`).
- User picks a frame → pastes/uploads winner image → canvas auto-fits image inside the frame's photo cutout (object-fit cover within frame mask).
- "Copy framed image" button → exports composited canvas to clipboard as PNG.
- Optional save to `hall_of_fame` table + Supabase Storage bucket `hall-of-fame` (public) so it persists.

## 12. Navigation (sidebar restructure)
- Dashboard
- Schedule — Events/Parties
- Schedule — Entertainment
- Interactions (log + history + search)
- Leaderboard
- Comp Queue (AUX+)
- Announcements
- Hall of Fame
- Posters / Staff
- Archives (Manager only)
- Admin → Codes, Prizes, Roles (AUX+)

## 13. Realtime
Enable realtime on: `schedule_slots`, `interactions`, `points_log`, `announcements`, `announcement_reads`, `signup_codes`.

---

## Technical Notes
- All gating done via Postgres SECURITY DEFINER functions + RLS — never client-trusted.
- Signup uses a server function `redeemSignupCode` that validates code, creates auth user (or signs up then assigns role atomically via trigger reading metadata), marks code consumed.
- Storage bucket `hall-of-fame` (public) + RLS for inserts by authenticated.
- Existing tables (`warnings`, `staff_activity`) kept; old `interactions` schema migrated/replaced (will drop & recreate since project is new).

## Open Questions (small)
1. Should signup codes carry a **fixed role + department** (recommended), or be generic?
2. For Hall of Fame frames — OK if I generate 4-6 frame designs via image generator?
3. For "stay signed in" — Supabase persists ~1 hour by default with auto-refresh; that's effectively forever as long as the user opens the app periodically. OK?

If you say "go", I'll proceed with the recommended choices (fixed role+dept on codes, generated frames, default session persistence).
