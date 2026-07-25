# FaceMeet Full Platform Audit

Date: 2026-06-25  
Primary Website/Admin repo: `/Users/simeonononobi/Downloads/FaceMeet_Website`  
Primary app/backend repo inspected: `/Users/simeonononobi/Downloads/facemeet`  
Public website: `https://facemeet.app`  
Public admin route: `https://facemeet.app/admin/`  
Partner portal route: `https://facemeet.app/partner`  
PWA/app domain: `https://app.facemeet.app`  
Android package: `com.ononobi.facemeet`  
Current app version/build found: `1.0.4+81`

## 1. Executive Summary

FaceMeet is now more than a marketing website. It is a multi-surface dating platform made up of:

- Public marketing website.
- Public legal/policy/underwriting pages.
- Public Events page.
- Static Website/Admin deployment on Netlify.
- Admin dashboard at `/admin/`.
- Partner dashboard at `/partner`.
- Flutter Android app.
- Flutter PWA/web app.
- iOS project scaffold.
- Supabase Postgres backend.
- Supabase Edge Functions.
- RevenueCat/Google Play purchase flow.
- Stripe web/PWA payment foundation.
- Daily.co Spark Session video rooms.
- Events platform with RSVP, pairing, tickets, and check-in.
- Safety, moderation, reporting, blocking, profile video review, and admin enforcement tooling.
- Global country revenue and regional partner revenue foundation.

The platform is strongest where sensitive operations are backend-owned:

- Spark Session room access is controlled by backend/RPC/Edge Function paths.
- Android Google Play purchase recording now uses `record_google_play_purchase`.
- Events access, pairing, tickets, and check-in are backed by Supabase tables/RPCs.
- Admin enforcement is RPC-backed rather than direct hard-delete behavior.
- Regional partner revenue now has dedicated tables, RLS, and summary RPCs.

Main open risks:

- Full Google Play server-side receipt verification is not yet implemented. Current Android purchase tracking is RevenueCat-confirmed/client-confirmed and idempotent, but not Google Developer API verified.
- Partner login creation still requires Supabase Auth user creation/invitation outside the static admin page or via a future service-role Edge Function.
- Website policy/payment copy still references Stripe in places and should be reviewed now that Android/Google Play is live and Stripe dating-site risk is a concern.
- Several generated Android AAB artifacts exist in the app repo as untracked files. They should remain untracked unless there is a deliberate release artifact archive policy.
- Admin dashboard is a large single HTML file. It works, but maintainability will eventually benefit from splitting into modules.

## 2. Source Repositories Inspected

### Website/Admin Repo

Path:

```text
/Users/simeonononobi/Downloads/FaceMeet_Website
```

Git state at audit start:

```text
clean
```

Important files:

- `index.html`
- `join.html`
- `pricing.html`
- `faq.html`
- `events.html`
- `creators.html`
- `terms.html`
- `privacy.html`
- `child-safety.html`
- `community-guidelines.html`
- `content-policy.html`
- `moderation-policy.html`
- `refund-policy.html`
- `payment-terms.html`
- `mobile-app.css`
- `admin/index.html`
- `partner.html`
- `netlify.toml`
- `site-metrics.json`
- `assets/events/*.svg`
- `supabase/migrations/*.sql`

### Flutter App/Backend Repo

Path:

```text
/Users/simeonononobi/Downloads/facemeet
```

Important files/directories:

- `pubspec.yaml`
- `lib/main.dart`
- `lib/routes/app_routes.dart`
- `lib/services/supabase_service.dart`
- `lib/services/revenuecat_service.dart`
- `lib/services/stripe_service.dart`
- `lib/services/daily_service.dart`
- `lib/services/push_notification_service.dart`
- `lib/services/web_push_notification_service.dart`
- `lib/presentation/*`
- `supabase/migrations/*`
- `supabase/functions/*`
- `web/*`
- `android/*`
- `ios/*`

App repo state includes many untracked `.aab` artifacts and an existing untracked app audit file. Those were inspected only as context and were not modified.

## 3. Public Website Platform

### Public Website Purpose

The public website positions FaceMeet as a video-first dating and matchmaking platform, with Android currently available through Google Play and iPhone/web access described as coming soon or secondary depending on page copy.

Core current positioning:

- Dating should start face-to-face.
- Short profile videos before chat.
- Sparks and live video introductions.
- Android/Google Play as the live access path.
- iOS/PWA/web access as coming soon or future access path on public pages.

### Public Website Files

Main public files:

- `index.html`
- `join.html`
- `pricing.html`
- `faq.html`
- `events.html`
- `creators.html`
- `child-safety.html`
- `terms.html`
- `privacy.html`

Policy/underwriting pages:

- `community-guidelines.html`
- `content-policy.html`
- `moderation-policy.html`
- `refund-policy.html`
- `payment-terms.html`

Assets:

- `apple-touch-icon.png`
- `favicon.ico`
- `favicon-32x32.png`
- `mobile-app.css`
- `assets/events/event-atlanta.svg`
- `assets/events/event-austin.svg`
- `assets/events/event-chicago.svg`
- `assets/events/event-dallas.svg`
- `assets/events/event-houston.svg`
- `assets/events/event-lagos.svg`
- `assets/events/event-los-angeles.svg`
- `assets/events/event-miami.svg`
- `assets/events/event-new-york.svg`
- `assets/events/event-san-francisco.svg`
- `assets/events/event-washington-dc.svg`

### Public Routes

Netlify clean routes in `netlify.toml`:

- `/admin` -> `/admin/index.html`
- `/admin/*` -> `/admin/index.html`
- `/child-safety` -> `/child-safety.html`
- `/community-guidelines` -> `/community-guidelines.html`
- `/content-policy` -> `/content-policy.html`
- `/moderation-policy` -> `/moderation-policy.html`
- `/refund-policy` -> `/refund-policy.html`
- `/payment-terms` -> `/payment-terms.html`
- `/creators` -> `/creators.html`
- `/events` -> `/events.html`
- `/partner` -> `/partner.html`

### Google Play CTA

The website has been updated to point visitors toward the Google Play listing:

```text
https://play.google.com/store/apps/details?id=com.ononobi.facemeet
```

The homepage hero was adjusted so Android is the access path, not the headline product.

### Events Website Page

`events.html` is a public Events rollout page.

Built:

- Static national rollout event cards.
- Cities include Dallas, Austin, Houston, Atlanta, Miami, New York, Los Angeles, Chicago, Washington DC, San Francisco, and Lagos.
- CTA routes users to Google Play rather than an in-browser RSVP.
- Clean route `/events`.
- Event SVG assets.

Not built on public website:

- Public browser-based event RSVP.
- User event ticket display.
- Live database-driven public event list.

Note:

- The app has dynamic Events features. The public website Events page is primarily marketing/launch awareness.

## 4. Public Policy And Underwriting Pages

Built pages:

- Terms of Service: `terms.html`
- Privacy Policy: `privacy.html`
- Community Guidelines: `community-guidelines.html`
- Content Policy: `content-policy.html`
- Moderation Policy: `moderation-policy.html`
- Refund Policy: `refund-policy.html`
- Payment Terms: `payment-terms.html`
- Child Safety Standards: `child-safety.html`

Coverage includes:

- Dating/matchmaking positioning.
- Not an adult entertainment platform.
- Not a webcam marketplace.
- Not an escort marketplace.
- Not a creator-payout platform.
- Not a paid private-video platform.
- Not a tipping platform.
- Not a user monetization platform.
- No compensated dating marketplace.
- Nudity prohibition.
- Sexually explicit content prohibition.
- Pornographic content prohibition.
- Sexual solicitation prohibition.
- Escort/prostitution/paid dating prohibitions.
- OnlyFans-style promotion prohibition.
- Harassment, abuse, scams, spam, fake profiles, illegal content prohibitions.
- CSAM/child exploitation prohibition.
- Report/block instructions.
- Moderation explanation.
- Refund/payment terms.

Important caution:

- `payment-terms.html` still mentions Stripe cancellation/billing portal language. This should be reviewed now that Android/Google Play is active and Stripe has been strategically de-emphasized for dating.

## 5. Admin Dashboard

Admin entry:

```text
admin/index.html
```

Admin route:

```text
https://facemeet.app/admin/
```

Admin auth:

- Supabase Auth email/password.
- Admin access checked against `admin_users`.
- Active admin profile required.
- Admin roles include values such as `super_admin`, `events_ops`, `support_staff`.

Admin architecture:

- Single large static HTML file.
- Uses Supabase JS from CDN.
- Uses public anon key and authenticated user session.
- Calls REST table endpoints and RPCs.
- Uses RLS and RPC protection for sensitive operations.

### Admin Pages/Sections

Admin sidebar sections found:

- Overview
- Beta Metrics
- Users
- Spark Credits
- Archived Apps
- Creator HQ
- Cities
- Payouts
- Events HQ
- Spark Sessions
- Revenue
- Global Revenue HQ
- Demographics
- Engagement
- Profile Videos
- Reports
- Blocked Users

### Admin Overview

Built:

- High-level user/application/city/creator/payout/revenue metrics.
- Download/public beta metrics.
- Last refresh indicator.

### Admin Users

Built:

- User list.
- Search/filter style workflows.
- Member profile review overlay.
- Profile completion reminders.
- Account/profile enforcement actions.

### Admin Spark Credits

Built:

- Lookup by account email.
- Show Spark balance/account status/profile visibility.
- Add/remove Spark credits through secure RPC.
- Reason required.
- Audit logging through backend.

RPCs/migrations:

- `admin_get_spark_credit_account`
- `admin_adjust_spark_balance`
- Multiple fixes for audit FK and array insert behavior.

### Admin Creator HQ

Built:

- Creator outreach queue.
- Creator applications.
- Creator communications/copy generator.
- Creator city/platform/interest/fit/status/follow-up/follower filters.
- Creator application export.
- Creator referral tracking.

### Admin City Performance

Built:

- City launch readiness.
- Export city performance CSV.
- Waitlist/profile upload/creator activity metrics.

### Admin Creator Payouts

Built:

- Creator payout estimation/tracking.
- Approved posts.
- Verified signups.
- Signup bonus.
- City unlock bonus.
- Subscription commission.
- Paid/unpaid status.
- Export payouts CSV.

Note:

- This is separate from the new regional partner revenue share system.

### Admin Events HQ

Built:

- Event creation/editing.
- Event publish/unpublish/cancel.
- Access mode.
- Guest list status.
- Video required.
- Verification required.
- Event stats.
- Access requests review.
- RSVP status changes.
- Admin notes.
- Guest list and anchor pair management.
- Pairing preferences.
- Pairing suggestions.
- Approved attendee roster.
- Anchor Pair Builder.
- Pair Ticket Release.
- Event Check-In panel.

Events admin status/action capabilities:

- Add to Guest List.
- Keep on Waitlist.
- Not Selected.
- Save admin RSVP note.
- Manage Guest List & Pairs.
- Release Pair Tickets.
- Open/lock Pairing Preferences.
- Create/confirm/cancel Anchor Pairs.
- Assign Open Social Access.
- Reset pairing status.

### Admin Event Check-In

Built:

- Event Check-In panel inside Events HQ.
- Ticket code input.
- Short code helper copy:
  - `Enter ticket code, e.g. FM-7K4-92Q`
  - `Codes are not case-sensitive. Hyphens are optional.`
- Validate Ticket button.
- Check In button after successful validation.
- Status panel.
- RPC fallbacks for `ticket_code` and `p_ticket_code`.

RPCs:

- `validate_event_ticket`
- `check_in_event_ticket`

Handled states:

- Valid Ticket.
- Checked In.
- Already Checked In.
- Invalid Ticket.
- Not Approved.
- Event Cancelled.
- Ticket Inactive.

### Admin Revenue

Built:

- Basic subscription/revenue table.
- Spark+ subscribers.
- Gold subscribers.
- Estimated monthly revenue.
- Paid users table.

Limitation:

- This older revenue page is simple and not the new accounting truth board.

### Admin Global Revenue HQ

Built:

- Country revenue truth board.
- Gross revenue.
- Fees/costs.
- Net revenue.
- Partner payable.
- Date filters.
- Country CSV export.
- Partner performance table.
- Create Regional Partner form.
- Create Regional Campaign form.
- Partner Portal Access mapping.
- Record Partner Payout form.

Reads:

- `admin_get_country_revenue_summary`
- `admin_get_partner_revenue_summary`

Writes:

- `regional_partners`
- `regional_partner_campaigns`
- `partner_portal_users`
- `partner_payouts`

Important behavior:

- Campaign country uses country code such as `NG`, `PH`, `US`.
- Partner display country can be human-readable such as Nigeria or Philippines.
- Partner portal access mapping requires an existing Supabase Auth user ID. Static admin cannot safely create passwords by itself.

### Admin Demographics

Built:

- Gender distribution.
- Subscription tier distribution.
- Age distribution.

### Admin Engagement

Built:

- Messages.
- Sparks/interactions.
- Match/session-related metrics.

### Admin Video Moderation

Built:

- Profile videos queue.
- Moderation status counts.
- Filter pending/needs review/approved/rejected.
- Open video URL.
- Mark moderation status.
- Save moderation reason.

### Admin Reports

Built:

- User reports queue.
- Report filters.
- Mark reviewing.
- Resolve with reason.
- Dismiss with reason.
- Reason required for resolve/dismiss.
- User identity panels for reporter/reported.
- Last enforcement reason display.

### Admin Blocked Users

Built:

- Blocked users queue.
- Block source display.
- Blocker and blocked user identity.
- Block counts.

## 6. Partner Dashboard

Partner page:

```text
partner.html
```

Route:

```text
/partner
```

Built:

- Partner login.
- Password reset request.
- Restricted partner dashboard.
- Summary cards:
  - attributed registrations
  - gross revenue
  - net revenue
  - pending partner balance
- Campaign summary table.
- Payout history table.
- Change password form.

Auth/security:

- Uses Supabase Auth.
- Partner access requires `partner_portal_users.auth_user_id`.
- Partner must be active.
- Partner summary is fetched through `partner_get_my_revenue_summary`.
- Partner payout table is filtered by `partner_id`.

Limitation:

- Admin can map a partner portal user, but static admin does not create the Supabase Auth account or initial password. This requires Supabase dashboard/manual invite or a future service-role Edge Function.

## 7. Flutter App Platform

App repo:

```text
/Users/simeonononobi/Downloads/facemeet
```

Current version/build:

```text
1.0.4+81
```

Primary app surfaces:

- Android app.
- PWA/web app.
- iOS scaffold/dependencies.

Core screens:

- Auth: `lib/presentation/auth_screen/auth_screen.dart`
- Email verification: `lib/presentation/auth_screen/email_verification_screen.dart`
- Intro carousel: `lib/presentation/intro_carousel_screen/intro_carousel_screen.dart`
- Install gate: `lib/presentation/install_gate_screen/install_gate_screen.dart`
- Notification onboarding: `lib/presentation/notification_onboarding_screen/notification_onboarding_screen.dart`
- Onboarding: `lib/presentation/onboarding_screen/onboarding_screen.dart`
- Discovery feed: `lib/presentation/discovery_feed_screen/discovery_feed_screen.dart`
- Sparks/Spark Sessions: `lib/presentation/spark_session_screen/*`
- Events: `lib/presentation/events_screen/events_screen.dart`
- Chat: `lib/presentation/chat_screen/chat_screen.dart`
- Profile: `lib/presentation/profile_screen/profile_screen.dart`
- Profile video record: `lib/presentation/profile_screen/profile_video_record_screen.dart`
- Pricing: `lib/presentation/pricing_screen/pricing_screen.dart`
- Push debug: `lib/presentation/debug_screen/push_notification_debug_screen.dart`

Main shell tabs:

- Discover.
- Sparks/Sessions.
- Events.
- Chat.
- Profile.

Routing:

- `lib/routes/app_routes.dart`

Startup:

- `lib/main.dart`

## 8. App Dependencies And Services

Important dependencies from `pubspec.yaml`:

- `supabase_flutter`
- `provider`
- `camera`
- `permission_handler`
- `geolocator`
- `google_sign_in`
- `daily_flutter`
- `video_player`
- `webview_flutter`
- `url_launcher`
- `image_picker`
- `app_links`
- `video_thumbnail_plus`
- `flutter_contacts`
- `share_plus`
- `google_mlkit_face_detection`
- `firebase_core`
- `firebase_messaging`
- `flutter_local_notifications`
- `wakelock_plus`
- `purchases_flutter`
- `universal_html`

Key services:

- Supabase: `lib/services/supabase_service.dart`
- RevenueCat: `lib/services/revenuecat_service.dart`
- Stripe: `lib/services/stripe_service.dart`
- Daily video: `lib/services/daily_service.dart`
- Native/PWA push: `lib/services/push_notification_service.dart`, `lib/services/web_push_notification_service.dart`
- Realtime notifications: `lib/services/realtime_notification_service.dart`
- Presence: `lib/services/presence_service.dart`
- Referral: `lib/services/referral_service.dart`
- Location: `lib/services/metro_location_service.dart`
- Install gate: `lib/services/install_gate_service.dart`
- Video repair: `lib/services/video_repair_service.dart`
- Content filtering: `lib/services/content_filter_service.dart`
- Android diagnostics: `lib/services/android_diagnostics_service.dart`

## 9. Auth And Onboarding

Built:

- Supabase email/password auth.
- Google sign-in.
- Email verification redirect.
- Password reset.
- PKCE Supabase auth flow.
- Web auth callback route.
- Native deep link callback.
- Intro carousel for native first-launch.
- PWA install gate.
- Notification onboarding.
- User initialization with welcome Sparks.
- Onboarding completion routing.

Onboarding includes:

- Basic identity/profile fields.
- Gender/interested-in.
- Location picker/GPS optional path.
- Profile video recording/upload.
- Profile video moderation status setup.

Location onboarding:

- Uses controlled location tables.
- GPS is optional.
- Saves canonical country/region/city/location IDs when available.

## 10. Discovery And Matching

Built:

- Discovery feed.
- Profile video cards.
- Local-first discovery foundations.
- Like/Spark/interaction flows.
- Mutual Spark banner.
- Match creation/unlock logic through backend tables/RPCs.
- Block/report safety actions on user surfaces.

Backend foundations:

- `users`
- `interactions`
- `matches`
- `blocked_users`
- `user_reports`
- location catalog tables.

Safety filters exist in backend migrations for:

- moderation status.
- account status.
- profile visibility.
- blocked users.
- local/canonical location.

## 11. Spark Sessions And Video

Built:

- Spark Session screen.
- Waiting room.
- Spark decision widget.
- Daily.co video call integration.
- Native Daily SDK path.
- Web/fallback WebView path.
- Room/session isolation.
- Daily access claim RPC.
- Server-owned room/token foundations.
- Session status, ended fields, decisions, outcome.
- Mutual Spark outcome.
- Chat unlock after mutual session flow.
- Push notification integration for session reminders/room access.

Important app files:

- `lib/presentation/spark_session_screen/spark_session_screen.dart`
- `lib/presentation/spark_session_screen/sparks_screen.dart`
- `lib/presentation/spark_session_screen/widgets/spark_video_call_widget.dart`
- `lib/services/daily_service.dart`

Important backend/Edge Function files:

- `spark_session_get_daily_access`
- `20260615133000_submit_spark_session_decision_rpc.sql`
- `20260616103000_claim_spark_session_for_daily_access.sql`

## 12. Events Platform

App Events:

- `lib/presentation/events_screen/events_screen.dart`

Backend Events migration phases include:

- Admin roles and Events phase 1.
- Public waitlist and RSVP retry.
- Guest list controls.
- Access mode.
- Match-unlocked eligibility.
- Anchor pair foundation.
- Pair ticket release foundation.
- Pairing preferences.
- Pairing suggestion logic.
- Accessible events RPC.
- Reciprocal preference indicators.
- Event request withdraw/re-request.
- Seed upcoming rollout events.
- Event entry tickets and check-in.
- Ticket RPC conflict fix.
- Short ticket codes.

Built concepts:

- Events list.
- Request access.
- RSVP status.
- Approved/waitlisted/rejected state.
- Match-unlocked/event access mode.
- Pair priority.
- Pairing preferences.
- Anchor Pairs.
- Pair Tickets.
- Entry Tickets.
- Short ticket codes such as `FM-7K4-92Q`.
- Admin check-in via Website/Admin.

Admin Events:

- Create/edit/publish/cancel events.
- Review guest list requests.
- Manage pairing preferences.
- Generate/release pair tickets.
- Validate/check in entry tickets.

## 13. Chat And Messaging

Built:

- Chat inbox.
- Chat thread.
- Message table.
- Match-specific conversations.
- Chat route supports opening a specific match/thread.

Files:

- `lib/presentation/chat_screen/chat_screen.dart`
- `lib/presentation/chat_screen/widgets/chat_inbox_widget.dart`
- `lib/presentation/chat_screen/widgets/chat_thread_widget.dart`

## 14. Profile, Video, And Moderation

Profile built:

- Profile screen.
- Bio edit.
- Interests.
- Profile stats.
- Profile video hero.
- Profile video recording.
- Gallery/video picker support.
- Thumbnail generation.
- Face detection after video recording.

Moderation built:

- Profile video moderation fields.
- Moderation status/reason.
- Admin profile review RPC.
- Admin video review queue.
- Admin approve/reject/hold style workflows.
- Admin remove profile video.
- Admin hide/unhide profile.
- Admin suspend/unsuspend user.
- Admin ban/restore user.
- Profile completion reminders.

Important backend migrations:

- `20260509193500_add_ugc_safety_tables.sql`
- `20260510120000_add_profile_video_moderation.sql`
- `20260608100000_admin_member_profile_review_rpc.sql`
- `20260613090000_admin_enforcement_foundations.sql`

## 15. Safety, Reporting, Blocking, And Enforcement

Built in app/backend:

- User reports.
- Blocked users.
- Moderation events.
- Profile video moderation.
- Account status fields.
- Profile visibility status.
- Report/block UI actions.
- Delete account Edge Function.

Built in admin:

- Reports queue.
- Mark reviewing.
- Resolve/dismiss with required reason.
- Blocked user list.
- Video moderation queue.
- Member profile review.
- Enforcement controls.

Admin enforcement RPCs referenced:

- `admin_hide_profile`
- `admin_unhide_profile`
- `admin_suspend_user`
- `admin_unsuspend_user`
- `admin_ban_user`
- `admin_restore_user`
- `admin_remove_profile_video`
- `admin_resolve_report`
- `admin_get_member_profile`

## 16. Payments, Subscriptions, Sparks, And Revenue

### Android / Google Play

Built:

- RevenueCat SDK.
- Android product IDs:
  - `spark_bundle_3`
  - `spark_bundle_10`
  - `spark_bundle_25`
  - `spark_plus_monthly`
  - `gold_monthly`
- `record_google_play_purchase` RPC.
- `purchase_transactions` table.
- `country_revenue_ledger`.
- `partner_revenue_ledger`.
- Server-side product catalog.
- Idempotency/deduplication by provider order ID/token hash.
- No raw token storage in plaintext.
- Country revenue ledger writing per purchase.

Verified during prior live test:

- A `spark_bundle_3` purchase logged as fulfilled.
- Gross: $4.99.
- Estimated Google Play fee: $1.49.
- Net revenue: $3.50.
- Country ledger row created for `US`.

Limitation:

- Current Google Play purchase recording is RevenueCat/client-confirmed. Full Google Play Developer API receipt verification remains future work.

### PWA/Web Stripe

Built:

- Stripe checkout launcher/service for web.
- `create_checkout_session` Edge Function.
- `stripe_webhook` Edge Function.
- Legacy `payments` table support.
- Payment success/cancel routes in web app.

Strategic note:

- Because Stripe has dating-site friction/risk, Android/Google Play is currently the stronger live payment route.

### Spark Credits

Built:

- User `spark_balance`.
- Welcome Sparks.
- Daily/weekly tracking fields.
- Subscription replenishment logic.
- Spark bundle purchases.
- Admin Spark credit adjustments through RPC.
- Audit logging.

## 17. Global Revenue And Regional Partner System

Built in Website/Admin and Supabase:

- `regional_partners`
- `regional_partner_campaigns`
- `user_partner_attributions`
- `regional_partner_revenue_ledger`
- `partner_payouts`
- `partner_portal_users`
- regional attribution trigger on user insert.
- regional partner revenue trigger on country revenue insert.
- admin country revenue summary RPC.
- admin partner revenue summary RPC.
- partner self-summary RPC.

Admin Global Revenue HQ:

- Country revenue truth board.
- Partner performance.
- Create partner.
- Create campaign.
- Map partner portal user.
- Record payout.
- Export country revenue CSV.

Partner Dashboard:

- Restricted partner login.
- Campaign/revenue summary.
- Payout history.
- Password reset.
- Change password.

Important limitation:

- Partner account creation/password issuing still needs a safe service-role workflow or manual Supabase Auth invite. Static admin cannot safely create Auth users/passwords with the anon key.

## 18. Push Notifications

Native push:

- Firebase Core.
- Firebase Messaging.
- Flutter local notifications.
- Background handler.
- Android notification channel.
- Device token table.
- Push notification service.

Web/PWA push:

- `web_push_subscriptions`
- `register_web_push_subscription`
- `send_web_push`
- service worker assets:
  - `web/facemeet_web_push.js`
  - `web/facemeet_web_push_sw.js`

Notification-related Edge Functions:

- `send_push_notification`
- `send_web_push`
- `register_web_push_subscription`
- `admin_send_event_reminder`
- `admin_send_profile_completion_reminder`

Known operational risk:

- Push delivery across Android and PWA should be retested on real devices after each notification release.

## 19. Referrals And Creator Marketing

Built:

- Referral codes.
- Referral attribution tables.
- Referral reward reliability migrations.
- Creator applications.
- Creator table.
- Creator referral tracking.
- Creator communications.
- Creator payout tracking.
- Website creators page.
- Admin Creator HQ.

Important files/tables:

- `creators.html`
- `creator_applications`
- `creators`
- `creator_referrals`
- `user_referrals`
- `referral_attributions`
- `referral_attribution_details`
- `apply_referral` Edge Function

Note:

- Creator payouts are marketing/referral style and should remain clearly distinct from adult creator monetization.

## 20. Location And International Growth

Built:

- Country/region/place tables.
- Location aliases.
- Canonical location fields on users.
- Structured location picker.
- Global location support.
- Philippines seed migration.
- Nigeria and other country support via country/region/place structures.

Relevant backend tables:

- `location_countries`
- `location_regions`
- `location_places`
- `location_aliases`
- `location_place_aliases`

User fields:

- `country`
- `country_code`
- `state_region`
- `canonical_country`
- `canonical_state_region`
- `canonical_city`
- `canonical_metro_area`
- `canonical_place_id`
- `location_display_name`
- `location_source`

## 21. PWA Platform

Built:

- Flutter web/PWA app.
- Manifest.
- Service worker/push support.
- PWA install gate.
- Auth callback.
- Password reset.
- Payment success/cancel pages.
- Spark daily join page.
- Netlify config.

Important files:

- `web/index.html`
- `web/manifest.json`
- `web/auth-callback.html`
- `web/reset-password.html`
- `web/payment-success.html`
- `web/payment-cancelled.html`
- `web/spark_daily_join.html`
- `web/facemeet_web_push.js`
- `web/facemeet_web_push_sw.js`

Business note:

- Public website now de-emphasizes PWA launch in favor of Android because of payment processor constraints.

## 22. Android Platform

Built:

- Native Flutter Android app.
- RevenueCat/Google Play purchase support.
- Firebase Messaging.
- Local notifications.
- Daily video.
- Camera/mic/location/contact permissions.
- Deep links.
- Google Play production/internal test AAB artifacts exist locally.

Latest visible artifact:

- `FaceMeet-Google-Play-Purchase-Tracking-1.0.4+81.aab`

Important caution:

- AAB files are build artifacts and are currently untracked. That is appropriate unless a release archive policy is established.

## 23. iOS Platform

Built/scaffolded:

- iOS Flutter project.
- Podfile/Pods present.
- AppDelegate.
- GoogleService-Info.
- Runner entitlements.
- RevenueCat iOS product ID branches in code.

Not verified in this audit:

- App Store release state.
- iOS purchase setup.
- iOS signing/export readiness.

## 24. Supabase Backend Inventory

Major table groups:

- Users/profiles.
- Interactions.
- Matches.
- Messages.
- Spark sessions.
- Payments/purchase transactions.
- Country revenue ledger.
- Partner revenue ledgers.
- Events.
- Event RSVPs.
- Event pairing preferences.
- Event anchor pairs.
- Event tickets.
- Reports/blocks/moderation.
- Admin users/audit logs.
- Creator marketing.
- City/location.
- Push subscriptions/device tokens.

Major Edge Functions:

- `apply_referral`
- `create_checkout_session`
- `stripe_webhook`
- `delete_account`
- `moderate_profile_video`
- `send_push_notification`
- `send_web_push`
- `register_web_push_subscription`
- `spark_session_get_daily_access`
- `admin_send_event_reminder`
- `admin_send_profile_completion_reminder`

Major RPC areas:

- Spark Session decisions/access.
- Events access, pairing, and tickets.
- Admin enforcement.
- Admin member profile review.
- Admin Spark credit adjustment.
- Google Play purchase recording.
- Global revenue summaries.
- Partner revenue summaries.

## 25. Deployment And Hosting

Public Website/Admin:

- Static site deployed to Netlify.
- Production custom domain: `https://facemeet.app`.
- Website/Admin repo contains `.netlify/state.json`.
- Prior deployment required explicit Netlify site ID because local link pointed to a different site than the custom domain.

PWA/App:

- PWA hosted at `https://app.facemeet.app`.
- Netlify config exists in app repo.

Backend:

- Supabase project:
  - URL in code: `https://vbaiivsvjdntzaffboue.supabase.co`

## 26. Security And Compliance Posture

Strengths:

- Uses Supabase Auth.
- Admin gate checks `admin_users`.
- Partner portal has partner-specific mapping.
- Sensitive admin actions mostly use RPCs.
- Purchase tokens are not stored raw.
- RLS policies exist for partner/regional tables.
- Admin enforcement avoids hard delete.
- Child safety and adult-content policies exist publicly.
- CSAM/child exploitation policy exists.
- Report/block guidance exists.

Risks/needs:

- Static admin is very broad and should eventually be modularized and hardened.
- Partner Auth user creation needs service-role Edge Function or controlled manual workflow.
- Full Google Play receipt verification should be implemented through Google Developer API or RevenueCat webhooks.
- Payment/refund copy should be reviewed for Google Play reality and Stripe de-emphasis.
- Public policy pages should be periodically reviewed by counsel/payment processor requirements.
- Admin direct table writes still exist in some areas such as events management; more admin actions should move behind audited RPCs over time.

## 27. Known Gaps And Recommended Next Work

High priority:

1. Add Google Play server-side verification through RevenueCat webhooks or Google Play Developer API.
2. Build a safe service-role Edge Function for admin-issued partner invites/password setup.
3. Review and update `payment-terms.html`, `pricing.html`, and FAQ language to reflect Google Play as active payment route and Stripe as not the current primary Android path.
4. Test a Nigeria or Philippines regional campaign end to end:
   - create partner
   - create active campaign
   - create new user in country during campaign window
   - make purchase
   - confirm partner attribution and partner revenue ledger rows
5. Add refund/reversal workflows for purchase ledger and partner payout ledger.

Medium priority:

6. Add a purchase transactions table/view to Admin Global Revenue HQ.
7. Add partner campaign editing/pausing/ending controls.
8. Add payout approval workflow and exportable monthly partner statement.
9. Split `admin/index.html` into maintainable modules or migrate admin to a small app framework.
10. Add automated static checks for website links and policy routes.

Lower priority:

11. Archive or remove old local AAB artifacts from app repo root according to a release artifact policy.
12. Add a README describing Website/Admin deployment and correct Netlify site ID.
13. Add a formal operator runbook for Events check-in.
14. Add a partner onboarding runbook.

## 28. Files Inspected

Website/Admin repo:

- `index.html`
- `join.html`
- `pricing.html`
- `faq.html`
- `events.html`
- `creators.html`
- `terms.html`
- `privacy.html`
- `child-safety.html`
- `community-guidelines.html`
- `content-policy.html`
- `moderation-policy.html`
- `refund-policy.html`
- `payment-terms.html`
- `mobile-app.css`
- `admin/index.html`
- `partner.html`
- `netlify.toml`
- `site-metrics.json`
- `assets/events/*.svg`
- `supabase/migrations/*.sql`

App/backend repo:

- `pubspec.yaml`
- `lib/main.dart`
- `lib/routes/app_routes.dart`
- `lib/services/supabase_service.dart`
- `lib/services/revenuecat_service.dart`
- `lib/services/stripe_service.dart`
- `lib/services/daily_service.dart`
- `lib/services/push_notification_service.dart`
- `lib/services/web_push_notification_service.dart`
- `lib/presentation/*`
- `lib/widgets/*`
- `supabase/migrations/*.sql`
- `supabase/functions/*`
- `web/*`
- `android/*`
- `ios/*`

## 29. Audit Conclusion

FaceMeet has reached a meaningful production-platform stage:

- The public website can explain and market the product.
- Android is live and linked from the website.
- The app has real dating flows, video-first onboarding, Sparks, Spark Sessions, chat, Events, push, and payments.
- Admin has operational control over users, Sparks, safety, videos, reports, Events, check-in, and revenue/partner foundations.
- Backend foundations are broad and increasingly server-owned.
- Regional partner revenue sharing is now structurally possible.

The biggest next move is not another broad feature. It is operational hardening:

- verify Google Play purchases server-side,
- make partner onboarding/password issuance safe,
- test regional partner attribution with a live country campaign,
- add refund/reversal accounting,
- clean payment copy for processor and Google Play reality.
