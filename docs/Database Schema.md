# Database Schema – Learning OS

## 1. users

Stores user profile and preferences.

| Field         | Type      | Notes                |
| ------------- | --------- | -------------------- |
| id            | uuid      | primary key          |
| email         | text      | unique               |
| password_hash | text      | auth                 |
| preferences   | jsonb     | learning style, pace |
| created_at    | timestamp |                      |
| updated_at    | timestamp |                      |

---

## 2. contents

Represents uploaded learning materials.

| Field      | Type      | Notes       |
| ---------- | --------- | ----------- |
| id         | uuid      | primary key |
| user_id    | uuid      | owner       |
| title      | text      |             |
| type       | text      | pdf, text   |
| raw_text   | text      | extracted   |
| created_at | timestamp |             |

---

## 3. content_sections

Logical segmentation of content.

| Field       | Type   | Notes              |
| ----------- | ------ | ------------------ |
| id          | uuid   | primary key        |
| content_id  | uuid   |                    |
| title       | text   | chapter or section |
| order_index | int    |                    |
| text        | text   |                    |
| embedding   | vector | for RAG            |

---

## 4. learning_maps

AI-generated learning structure.

| Field        | Type      | Notes       |
| ------------ | --------- | ----------- |
| id           | uuid      |             |
| content_id   | uuid      |             |
| overview     | text      | big picture |
| generated_at | timestamp |             |

---

## 5. concepts

Individual learnable concepts.

| Field           | Type | Notes |
| --------------- | ---- | ----- |
| id              | uuid |       |
| learning_map_id | uuid |       |
| title           | text |       |
| description     | text |       |
| difficulty      | int  | 1–5   |
| order_index     | int  |       |

---

## 6. learning_sessions

Tracks learning progress per concept.

| Field            | Type      | Notes             |
| ---------------- | --------- | ----------------- |
| id               | uuid      |                   |
| user_id          | uuid      |                   |
| concept_id       | uuid      |                   |
| status           | text      | active, completed |
| confidence_score | float     | AI estimated      |
| created_at       | timestamp |                   |

---

## 7. interactions

All AI ↔ user exchanges.

| Field       | Type      | Notes           |
| ----------- | --------- | --------------- |
| id          | uuid      |                 |
| session_id  | uuid      |                 |
| role        | text      | tutor, examiner |
| user_input  | text      |                 |
| ai_response | text      |                 |
| evaluation  | jsonb     | optional        |
| created_at  | timestamp |                 |

---

## 8. user_notes

User explanations and reflections.

| Field       | Type | Notes |
| ----------- | ---- | ----- |
| id          | uuid |       |
| user_id     | uuid |       |
| concept_id  | uuid |       |
| content     | text |       |
| ai_feedback | text |       |

---

## 9. content_access

Controls who can access which content.

| Field       | Type      | Notes                                          |
| ----------- | --------- | ---------------------------------------------- |
| id          | uuid      | primary key                                    |
| content_id  | uuid      | FK → contents                                  |
| user_id     | uuid      | FK → users                                     |
| access_type | text      | owner, shared, purchased, platform, subscriber |
| granted_by  | uuid      | FK → users (who granted access)                |
| granted_at  | timestamp |                                                |
| expires_at  | timestamp | NULL = permanent                               |

**Unique constraint:** `(content_id, user_id)`

---

## 10. purchases

Tracks content purchases.

| Field                   | Type      | Notes                        |
| ----------------------- | --------- | ---------------------------- |
| id                      | uuid      | primary key                  |
| buyer_id                | uuid      | FK → users                   |
| content_id              | uuid      | FK → contents                |
| seller_id               | uuid      | FK → users                   |
| amount_cents            | int       | price in cents               |
| currency                | text      | USD default                  |
| platform_fee_cents      | int       | platform commission          |
| seller_revenue_cents    | int       | seller receives              |
| payment_provider        | text      | lemon_squeezy, paddle        |
| provider_transaction_id | text      |                              |
| provider_order_id       | text      |                              |
| status                  | text      | pending, completed, refunded |
| created_at              | timestamp |                              |
| completed_at            | timestamp |                              |

---

## 11. donations

Tracks creator donations/tips.

| Field                   | Type      | Notes                    |
| ----------------------- | --------- | ------------------------ |
| id                      | uuid      | primary key              |
| donor_id                | uuid      | FK → users               |
| recipient_id            | uuid      | FK → users (creator)     |
| content_id              | uuid      | optional, linked content |
| amount_cents            | int       |                          |
| currency                | text      | USD default              |
| message                 | text      | optional donor message   |
| payment_provider        | text      | paddle, aba_khqr, paypal |
| provider_transaction_id | text      | NULL for ABA/PayPal      |
| status                  | text      | completed                |
| created_at              | timestamp |                          |

---

## 12. payouts

Creator payout requests.

| Field                    | Type      | Notes                                  |
| ------------------------ | --------- | -------------------------------------- |
| id                       | uuid      | primary key                            |
| user_id                  | uuid      | FK → users (creator)                   |
| amount_cents             | int       |                                        |
| currency                 | text      | USD default                            |
| from_sales_cents         | int       | portion from sales                     |
| from_donations_cents     | int       | portion from donations                 |
| from_subscriptions_cents | int       | portion from subscription pool         |
| payout_method            | text      | bank_transfer, paypal, wise, aba       |
| payout_details           | jsonb     | account info                           |
| status                   | text      | pending, processing, completed, failed |
| requested_at             | timestamp |                                        |
| processed_at             | timestamp |                                        |

---

## 13. content_ratings

User ratings and reviews.

| Field      | Type      | Notes         |
| ---------- | --------- | ------------- |
| id         | uuid      | primary key   |
| content_id | uuid      | FK → contents |
| user_id    | uuid      | FK → users    |
| rating     | int       | 1-5 stars     |
| review     | text      | optional      |
| created_at | timestamp |               |
| updated_at | timestamp |               |

**Unique constraint:** `(content_id, user_id)`

---

## 14. creator_payment_settings

Creator donation and payout configuration.

| Field                   | Type      | Notes                   |
| ----------------------- | --------- | ----------------------- |
| id                      | uuid      | primary key             |
| user_id                 | uuid      | FK → users              |
| paddle_enabled          | bool      | default TRUE            |
| aba_khqr_enabled        | bool      | default FALSE           |
| aba_khqr_image_url      | text      | uploaded QR code        |
| aba_khqr_name           | text      | account holder name     |
| paypal_enabled          | bool      | default FALSE           |
| paypal_email            | text      | PayPal.me link or email |
| preferred_payout_method | text      | aba, paypal, wise, bank |
| payout_aba_account      | text      | for payout to ABA       |
| payout_paypal_email     | text      | for payout to PayPal    |
| created_at              | timestamp |                         |
| updated_at              | timestamp |                         |

**Unique constraint:** `(user_id)`

---

## 15. subscriptions

All-access subscription tracking.

| Field                    | Type      | Notes                              |
| ------------------------ | --------- | ---------------------------------- |
| id                       | uuid      | primary key                        |
| user_id                  | uuid      | FK → users                         |
| plan_type                | text      | monthly, yearly                    |
| price_cents              | int       | 999 or 7999                        |
| currency                 | text      | USD default                        |
| payment_provider         | text      | lemon_squeezy, paddle              |
| provider_subscription_id | text      |                                    |
| status                   | text      | active, cancelled, expired, paused |
| started_at               | timestamp |                                    |
| current_period_start     | timestamp |                                    |
| current_period_end       | timestamp |                                    |
| cancelled_at             | timestamp |                                    |
| created_at               | timestamp |                                    |

---

## 16. engagement_tracking

Tracks learning engagement for subscription revenue sharing.

| Field              | Type      | Notes                       |
| ------------------ | --------- | --------------------------- |
| id                 | uuid      | primary key                 |
| user_id            | uuid      | FK → users                  |
| content_id         | uuid      | FK → contents               |
| total_time_seconds | int       | learning time               |
| sessions_completed | int       | completed learning sessions |
| concepts_accessed  | int       | concepts viewed             |
| period_start       | date      | first day of month          |
| period_end         | date      | last day of month           |
| created_at         | timestamp |                             |
| updated_at         | timestamp |                             |

**Unique constraint:** `(user_id, content_id, period_start)`

---

## 17. bundles

Content bundles for discounted purchases.

| Field            | Type      | Notes            |
| ---------------- | --------- | ---------------- |
| id               | uuid      | primary key      |
| creator_id       | uuid      | FK → users       |
| title            | text      |                  |
| description      | text      |                  |
| cover_image_url  | text      |                  |
| price_cents      | int       |                  |
| currency         | text      | USD default      |
| discount_percent | int       | 20-50%           |
| bundle_type      | text      | creator, curated |
| is_active        | bool      | default TRUE     |
| created_at       | timestamp |                  |
| updated_at       | timestamp |                  |

---

## 18. bundle_contents

Links bundles to their contents.

| Field                 | Type | Notes                     |
| --------------------- | ---- | ------------------------- |
| id                    | uuid | primary key               |
| bundle_id             | uuid | FK → bundles              |
| content_id            | uuid | FK → contents             |
| revenue_share_percent | int  | for multi-creator bundles |

**Unique constraint:** `(bundle_id, content_id)`

---

## Updated `contents` Table (Additional Columns)

Add these columns to the existing `contents` table:

| Field               | Type  | Notes                           |
| ------------------- | ----- | ------------------------------- |
| visibility          | text  | private, shared, public, paid   |
| is_platform_content | bool  | TRUE for admin-uploaded content |
| price_cents         | int   | 0 for free                      |
| currency            | text  | USD default                     |
| accept_donations    | bool  | enable tip jar                  |
| donation_message    | text  | optional message                |
| sales_count         | int   | total purchases                 |
| rating_average      | float | avg rating                      |
| rating_count        | int   | number of ratings               |
| category            | text  | for discovery                   |

---

## Schema Summary

| #  | Table                    | Purpose                           |
| -- | ------------------------ | --------------------------------- |
| 1  | users                    | User accounts                     |
| 2  | contents                 | Uploaded learning materials       |
| 3  | content_sections         | Document segments with embeddings |
| 4  | learning_maps            | AI-generated learning structure   |
| 5  | concepts                 | Individual learnable items        |
| 6  | learning_sessions        | Progress tracking                 |
| 7  | interactions             | AI ↔ user exchanges               |
| 8  | user_notes               | User reflections                  |
| 9  | content_access           | Access control                    |
| 10 | purchases                | Sales records                     |
| 11 | donations                | Tips/donations                    |
| 12 | payouts                  | Creator withdrawals               |
| 13 | content_ratings          | Reviews                           |
| 14 | creator_payment_settings | Donation/payout config            |
| 15 | subscriptions            | Subscriber tracking               |
| 16 | engagement_tracking      | For revenue sharing               |
| 17 | bundles                  | Content bundles                   |
| 18 | bundle_contents          | Bundle items                      |

---
