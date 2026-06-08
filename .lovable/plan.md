# Monetization Plan

Add a €1.00/month **Pro** subscription via **Paddle** that removes Google AdSense ads. All app features remain free for everyone.

## 1. Payments — Paddle

1. Run `recommend_payment_provider` to confirm Paddle eligibility for this product (X-Wing competition tracker / SaaS).
2. Enable Paddle via `enable_paddle_payments`. A sandbox environment is created automatically; live requires Paddle account verification later.
3. Create one product in Paddle: **Pro** — €1.00/month recurring subscription. No tiers, no extras.
4. Implement the Lovable Payments checkout flow per the post-enable knowledge:
   - "Upgrade to Pro" button → Paddle checkout overlay.
   - Webhook handler at `src/routes/api/public/paddle-webhook.ts` validates Paddle signatures and updates subscription state.
   - New `public.subscriptions` table (user_id, status, current_period_end, paddle_subscription_id) with RLS — users read their own row; webhook writes via service role.
   - Server function `getMySubscription()` returning `{ isPro: boolean }`, called by a `useIsPro()` hook.

## 2. Google AdSense

1. Add a single `<AdSlot />` component in `src/components/ad-slot.tsx` that:
   - Injects the AdSense script once (in `__root.tsx` `<head>` via TanStack `head()`).
   - Renders `<ins class="adsbygoogle">` with a passed `slot` id.
   - Returns `null` when `useIsPro()` is true.
2. Place ad slots in 3 sensible spots:
   - Below the header on `/` (home).
   - In-content on `/browse` (above the competition list).
   - Sidebar/footer on `/collection`.
3. AdSense publisher ID + slot IDs stored as **client-side env vars** (`VITE_ADSENSE_CLIENT_ID`, `VITE_ADSENSE_SLOT_*`). These are public by design.
4. Add a brief "Ads on this site" note + "Remove ads with Pro" CTA linking to a new `/pro` page.

## 3. Pro upgrade page

New route `src/routes/_authenticated/pro.tsx`:
- Shows current status (Free / Pro until <date>).
- "Upgrade — €1/month" button → Paddle checkout.
- "Manage subscription" link to Paddle customer portal when already Pro.
- Cancel handled via Paddle portal (webhook syncs status).

Add a "Pro" link to the top nav in `__root.tsx` (visible to all signed-in users, shows ✓ when active).

## 4. What I need from you before building

- Your AdSense **publisher ID** (`ca-pub-XXXXXXXXXXXXX`) and 3 **ad slot IDs** — create them at https://adsense.google.com after AdSense approves your site. Until then I'll render placeholder slots so the layout is in place.
- Confirmation to proceed with enabling Paddle (you'll fill in the Paddle signup form — email, business name, etc.).

## Technical notes

- Subscription source of truth = Paddle webhook → `subscriptions` table. Never trust client-side claims.
- `useIsPro()` reads via TanStack Query against `getMySubscription` server fn (cached, invalidated on auth change and after returning from checkout).
- AdSense script is loaded for everyone (even Pro) only if not yet loaded; `<AdSlot />` simply doesn't render the `<ins>` for Pro users — cleanest and avoids hydration flicker.
- All Paddle secrets (`PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`) provisioned by `enable_paddle_payments`; no manual secret entry needed.
- Pro plan required on Lovable to use Payments — confirm you're on Pro.
