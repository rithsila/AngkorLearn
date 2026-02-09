# Content Sharing & Monetization System

> Feature specification for content library, sharing permissions, and
> monetization.

---

## 1. Overview

This document defines the **Content Sharing & Monetization System** for Learning
OS, enabling:

1. **Platform Library** – Pre-loaded free PDFs provided by the platform
2. **User Uploads** – Users can upload their own learning materials
3. **Flexible Sharing** – Private, shared with specific users, or public
4. **Monetization** – Sell content or accept donations

---

## 2. Content Visibility Levels

| Level                | Description                              | Access Control                     |
| -------------------- | ---------------------------------------- | ---------------------------------- |
| **Private**          | Only the owner can see and learn from it | `owner_id` only                    |
| **Shared**           | Specific users invited by the owner      | `shared_users[]` list              |
| **Public Free**      | Anyone can access for free               | `visibility = 'public'`            |
| **Public Paid**      | Anyone can purchase to access            | `visibility = 'paid'`, `price > 0` |
| **Platform Library** | Provided by platform, free for all       | `is_platform_content = true`       |

---

## 3. Monetization Options

### 3.1 Selling Content (One-time Purchase)

| Feature           | Implementation                                   |
| ----------------- | ------------------------------------------------ |
| **Price Setting** | Owner sets price (min $0.99, max $999)           |
| **Currency**      | USD primary, multi-currency via payment provider |
| **Revenue Split** | Platform takes 10-20% commission                 |
| **Payout**        | Monthly or upon request (min $10)                |

### 3.2 Donations (Tip Jar) – Multi-Method

| Feature             | Implementation                                   |
| ------------------- | ------------------------------------------------ |
| **Enabled**         | Owner toggles "Accept Donations"                 |
| **Preset Amounts**  | $1, $3, $5, $10, Custom                          |
| **No Unlock**       | Donation does not unlock paid content            |
| **100% to Creator** | Platform takes 0% (only payment processing fees) |

**Donation Methods (Creator Chooses):**

| Method       | Description                 | Setup                            |
| ------------ | --------------------------- | -------------------------------- |
| **Paddle**   | International card payments | Platform-managed, auto-enabled   |
| **ABA KHQR** | Cambodia bank transfer      | Creator uploads QR code image    |
| **PayPal**   | PayPal donations            | Creator enters PayPal email/link |

> [!NOTE]
> Creators can enable multiple donation methods. Users choose their preferred
> payment option.

### 3.3 Payment Provider Strategy

| Provider          | Use Case                  | Why                                                |
| ----------------- | ------------------------- | -------------------------------------------------- |
| **Lemon Squeezy** | Selling content           | Handles global VAT/GST, built for digital products |
| **Paddle**        | Donations (international) | MoR benefits, handles taxes, good for tips         |
| **ABA KHQR**      | Donations (Cambodia)      | Free local transfers, popular in Cambodia          |
| **PayPal**        | Donations (global)        | Widely recognized, creator controls their account  |

**Lemon Squeezy Benefits (Sales):**

- Acts as Merchant of Record (handles VAT/GST globally)
- Built-in affiliate program for future growth
- Fees: 5% + $0.50 per transaction

**Paddle Benefits (Donations):**

- Also MoR (handles taxes automatically)
- Fees: 5% + $0.50 per transaction
- Good alternative to Stripe

**ABA KHQR Benefits (Local Donations):**

- Zero transaction fees (bank to bank)
- Popular in Cambodia
- Creator uploads their own QR code image
- Platform just displays the image, no processing

**PayPal Benefits (Global Donations):**

- Creator manages their own PayPal
- No platform integration needed (just link/email display)
- Users click to donate via PayPal.me link

---

## 3.4 Subscription Model (v1)

**All-Access Subscription:**

Users can subscribe to access ALL public content on the platform:

| Plan        | Price     | Access                                 |
| ----------- | --------- | -------------------------------------- |
| **Monthly** | $9.99/mo  | Unlimited access to all public content |
| **Yearly**  | $79.99/yr | Same access, 33% discount              |

**Revenue Sharing for Subscribers:**

Subscription revenue is distributed to content owners based on **learning
engagement**:

```
Creator Payout = (Time spent on creator's content / Total learning time) × Pool
```

| Metric                 | Weight | Description                |
| ---------------------- | ------ | -------------------------- |
| **Time Spent**         | 50%    | Minutes actively learning  |
| **Sessions Completed** | 30%    | Finished learning sessions |
| **Content Accessed**   | 20%    | Number of concepts viewed  |

**Pool Calculation:**

- Platform takes 30% of subscription revenue
- 70% goes to creator pool
- Distributed monthly based on engagement

**Example:**

- 1000 subscribers × $9.99 = $9,990/month
- Platform keeps: $2,997 (30%)
- Creator pool: $6,993 (70%)
- Creator A has 15% of total engagement = $1,049 payout

---

## 3.5 Content Bundles (v1)

**Bundle Types:**

| Type               | Description                             | Example                              |
| ------------------ | --------------------------------------- | ------------------------------------ |
| **Creator Bundle** | Same creator's multiple books           | "Complete Python Series" - 5 books   |
| **Curated Bundle** | Platform-curated from multiple creators | "Beginner Trading Pack" - 3 creators |

**Bundle Pricing:**

- Minimum 20% discount vs individual purchase
- Maximum 50% discount
- Platform commission same as individual sales

**Revenue Split for Multi-Creator Bundles:**

- Equal split, or
- Proportional to individual book prices

---

## 4. Database Schema Updates

### 4.1 Updated `contents` Table

```sql
-- Add new columns to existing contents table
ALTER TABLE contents ADD COLUMN visibility TEXT DEFAULT 'private';
  -- Values: 'private', 'shared', 'public', 'paid'

ALTER TABLE contents ADD COLUMN is_platform_content BOOLEAN DEFAULT FALSE;
  -- TRUE for admin-uploaded free content

ALTER TABLE contents ADD COLUMN price_cents INTEGER DEFAULT 0;
  -- Price in cents (e.g., 999 = $9.99)

ALTER TABLE contents ADD COLUMN currency TEXT DEFAULT 'USD';

ALTER TABLE contents ADD COLUMN accept_donations BOOLEAN DEFAULT FALSE;

ALTER TABLE contents ADD COLUMN donation_message TEXT;
  -- Optional message shown with donation button

ALTER TABLE contents ADD COLUMN sales_count INTEGER DEFAULT 0;

ALTER TABLE contents ADD COLUMN rating_average FLOAT DEFAULT 0;

ALTER TABLE contents ADD COLUMN rating_count INTEGER DEFAULT 0;
```

### 4.2 New `content_access` Table

```sql
CREATE TABLE content_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL,
    -- Values: 'owner', 'shared', 'purchased', 'platform'
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,  -- NULL = permanent
  UNIQUE(content_id, user_id)
);

CREATE INDEX idx_content_access_user ON content_access(user_id);
CREATE INDEX idx_content_access_content ON content_access(content_id);
```

### 4.3 New `purchases` Table

```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES users(id),
  content_id UUID REFERENCES contents(id),
  seller_id UUID REFERENCES users(id),
  
  -- Payment details
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  platform_fee_cents INTEGER NOT NULL,
  seller_revenue_cents INTEGER NOT NULL,
  
  -- Provider details
  payment_provider TEXT NOT NULL,  -- 'lemon_squeezy', 'paddle'
  provider_transaction_id TEXT,
  provider_order_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending',
    -- Values: 'pending', 'completed', 'refunded', 'disputed'
  
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_purchases_buyer ON purchases(buyer_id);
CREATE INDEX idx_purchases_seller ON purchases(seller_id);
CREATE INDEX idx_purchases_content ON purchases(content_id);
```

### 4.4 New `donations` Table

```sql
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID REFERENCES users(id),
  recipient_id UUID REFERENCES users(id),
  content_id UUID REFERENCES contents(id),  -- Optional: linked content
  
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  message TEXT,  -- Optional donor message
  
  payment_provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_donations_recipient ON donations(recipient_id);
```

### 4.5 New `payouts` Table

```sql
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Breakdown
  from_sales_cents INTEGER DEFAULT 0,
  from_donations_cents INTEGER DEFAULT 0,
  
  -- Provider
  payout_method TEXT,  -- 'bank_transfer', 'paypal', 'wise', 'aba'
  payout_details JSONB,
  
  status TEXT DEFAULT 'pending',
    -- Values: 'pending', 'processing', 'completed', 'failed'
  
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);
```

### 4.6 New `content_ratings` Table

```sql
CREATE TABLE content_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(content_id, user_id)
);
```

### 4.7 New `creator_payment_settings` Table

```sql
CREATE TABLE creator_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Paddle (for international donations)
  paddle_enabled BOOLEAN DEFAULT TRUE,
  
  -- ABA KHQR (for Cambodia)
  aba_khqr_enabled BOOLEAN DEFAULT FALSE,
  aba_khqr_image_url TEXT,  -- Uploaded QR code image
  aba_khqr_name TEXT,       -- Account holder name to display
  
  -- PayPal
  paypal_enabled BOOLEAN DEFAULT FALSE,
  paypal_email TEXT,        -- PayPal email or PayPal.me link
  
  -- Payout preferences
  preferred_payout_method TEXT,  -- 'aba', 'paypal', 'wise', 'bank_transfer'
  payout_aba_account TEXT,       -- ABA account number for payouts
  payout_paypal_email TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);
```

### 4.8 New `subscriptions` Table

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  plan_type TEXT NOT NULL,  -- 'monthly', 'yearly'
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  payment_provider TEXT NOT NULL,  -- 'lemon_squeezy', 'paddle'
  provider_subscription_id TEXT,
  
  status TEXT DEFAULT 'active',
    -- Values: 'active', 'cancelled', 'expired', 'paused'
  
  started_at TIMESTAMP DEFAULT NOW(),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

### 4.9 New `engagement_tracking` Table

```sql
CREATE TABLE engagement_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  
  -- Tracking metrics for subscription revenue sharing
  total_time_seconds INTEGER DEFAULT 0,
  sessions_completed INTEGER DEFAULT 0,
  concepts_accessed INTEGER DEFAULT 0,
  
  -- Period tracking
  period_start DATE NOT NULL,  -- First day of the month
  period_end DATE NOT NULL,    -- Last day of the month
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, content_id, period_start)
);

CREATE INDEX idx_engagement_period ON engagement_tracking(period_start, period_end);
CREATE INDEX idx_engagement_content ON engagement_tracking(content_id);
```

### 4.10 New `bundles` Table

```sql
CREATE TABLE bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id),
  
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  discount_percent INTEGER NOT NULL,  -- 20-50%
  
  bundle_type TEXT NOT NULL,  -- 'creator', 'curated'
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bundle_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID REFERENCES bundles(id) ON DELETE CASCADE,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  revenue_share_percent INTEGER,  -- For multi-creator bundles
  
  UNIQUE(bundle_id, content_id)
);
```

---

## 5. User Roles & Permissions

### 5.1 Role Definitions

| Role        | Permissions                                              |
| ----------- | -------------------------------------------------------- |
| **Guest**   | View public content listings, cannot learn               |
| **User**    | Learn from accessible content, upload own content        |
| **Creator** | All User permissions + sell content + receive payouts    |
| **Admin**   | All permissions + upload platform content + manage users |

### 5.2 Creator Verification (Optional for v2)

For monetization, consider requiring:

- Email verification
- Payout details on file
- Optional: Identity verification for high-volume sellers

---

## 6. User Flows

### 6.1 Uploading Content

```
User clicks "Upload" → Fills form:
  - Title, Description
  - PDF file
  - Visibility: [Private] [Shared] [Public Free] [Sell]
  - If Sell: Set price
  - Toggle: Accept Donations
→ Content processed → Goes to user's library
```

### 6.2 Sharing with Specific Users

```
User opens content → "Share" button → Enter emails:
  - Type email addresses (comma-separated)
  - Or share link with code (auto-expires in 7 days)
→ Invited users see content in "Shared with Me"
```

### 6.3 Purchasing Content

```
Guest/User browses "Discover" → Finds paid content
→ Clicks "Buy for $X" → Redirected to Lemon Squeezy checkout
→ Payment completed → Webhook received
→ Access granted → User can now learn
```

### 6.4 Donating to Creator

```
User learns from free content → Sees "Support Creator" button
→ Chooses amount: $1 / $3 / $5 / $10 / Custom
→ Redirected to Stripe checkout
→ Donation completed → Creator notified
```

### 6.5 Platform Library Access

```
Admin uploads content with:
  - is_platform_content = TRUE
  - visibility = 'public'
→ Content appears in "Platform Library" section
→ All users can access for free
```

---

## 7. API Endpoints

### Content Management

| Method  | Endpoint                  | Description                           |
| ------- | ------------------------- | ------------------------------------- |
| `GET`   | `/content/discover`       | List public/paid content with filters |
| `GET`   | `/content/library`        | User's own content                    |
| `GET`   | `/content/shared`         | Content shared with user              |
| `GET`   | `/content/purchased`      | User's purchased content              |
| `GET`   | `/content/platform`       | Platform's free library               |
| `PATCH` | `/content/:id/visibility` | Update sharing settings               |
| `POST`  | `/content/:id/share`      | Invite specific users                 |

### Purchases

| Method | Endpoint                 | Description             |
| ------ | ------------------------ | ----------------------- |
| `POST` | `/purchase/checkout`     | Generate checkout URL   |
| `POST` | `/webhook/lemon-squeezy` | Handle purchase webhook |
| `GET`  | `/purchase/history`      | User's purchase history |

### Donations

| Method | Endpoint              | Description                  |
| ------ | --------------------- | ---------------------------- |
| `POST` | `/donate/checkout`    | Generate donation checkout   |
| `POST` | `/webhook/stripe`     | Handle donation webhook      |
| `GET`  | `/donations/received` | Creator's received donations |

### Creator Dashboard

| Method | Endpoint                  | Description               |
| ------ | ------------------------- | ------------------------- |
| `GET`  | `/creator/earnings`       | Sales + donations summary |
| `GET`  | `/creator/analytics`      | Views, sales, ratings     |
| `POST` | `/creator/payout`         | Request payout            |
| `GET`  | `/creator/payout/history` | Payout history            |

---

## 8. Frontend Pages

### 8.1 Discover Page `/discover`

```
┌──────────────────────────────────────────────────────────────┐
│  🔍 Discover Learning Materials                              │
│                                                              │
│  [All] [Free] [Paid] [Bestsellers]     Search: [________]   │
│                                                              │
│  Categories: [Programming] [Business] [Science] [More...]   │
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐│
│  │ 📘        │ │ 📗        │ │ 📕        │ │ 📙        ││
│  │ Title     │ │ Title     │ │ Title     │ │ Title     ││
│  │ by Author │ │ by Author │ │ by Author │ │ by Author ││
│  │ ⭐⭐⭐⭐⭐ (42)│ │ ⭐⭐⭐⭐ (18)│ │ FREE      │ │ $9.99     ││
│  │ $4.99     │ │ FREE      │ │ Platform  │ │ 🎁 Tips   ││
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### 8.2 Content Detail Page `/content/:id`

```
┌──────────────────────────────────────────────────────────────┐
│  📖 Book Title                                               │
│  by Creator Name                                             │
│                                                              │
│  ⭐⭐⭐⭐⭐ 4.8 (128 ratings)   |   📚 1,234 learners          │
│                                                              │
│  ┌─────────────────────────────┐  ┌────────────────────────┐ │
│  │                             │  │ $9.99                  │ │
│  │  📄 Preview / Cover         │  │                        │ │
│  │                             │  │ [Buy Now]              │ │
│  │                             │  │                        │ │
│  │                             │  │ ────────────────────── │ │
│  │                             │  │ 💝 Support Creator     │ │
│  │                             │  │ [$1] [$3] [$5] [...]   │ │
│  └─────────────────────────────┘  └────────────────────────┘ │
│                                                              │
│  ## About This Book                                          │
│  Description text here...                                    │
│                                                              │
│  ## What You'll Learn                                        │
│  • Concept 1                                                 │
│  • Concept 2                                                 │
│                                                              │
│  ## Reviews                                                  │
│  ⭐⭐⭐⭐⭐ "Great book!" - User                                │
└──────────────────────────────────────────────────────────────┘
```

### 8.3 Creator Dashboard `/creator`

```
┌──────────────────────────────────────────────────────────────┐
│  💰 Creator Dashboard                                        │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ $1,234.56    │ │ $89.00       │ │ $1,145.56    │         │
│  │ Total Sales  │ │ Donations    │ │ Available    │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                              │
│  [Request Payout]                                            │
│                                                              │
│  ───────────────────────────────────────────────────────     │
│                                                              │
│  📊 Your Content Performance                                 │
│                                                              │
│  | Title      | Views | Sales | Revenue | Rating  |         │
│  |------------|-------|-------|---------|---------|         │
│  | Book 1     | 1,234 | 45    | $450    | ⭐ 4.8  |         │
│  | Book 2     | 567   | 12    | $120    | ⭐ 4.5  |         │
│  | Book 3     | 234   | FREE  | $23*    | ⭐ 4.9  |         │
│  (* donations only)                                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Implementation Tasks

Add these tasks to `ImplementPlan.md`:

### SHARE-01: Content Visibility System

- **Task ID**: `SHARE-01`
- **Objective**: Implement content visibility and access control
- **Requirements**:
  - Add visibility fields to contents table
  - Create content_access table
  - Implement access check middleware
  - Update content queries to filter by access
- **Dependencies**: `DB-01`, `AUTH-01`
- **Deliverables**:
  - Database migrations
  - `backend/src/content/access.service.ts`
  - `backend/src/middleware/content-access.middleware.ts`
- **Acceptance Criteria**:
  - Private content only visible to owner
  - Shared content visible to invited users
  - Public content visible to all

---

### SHARE-02: Content Sharing (Invite Users)

- **Task ID**: `SHARE-02`
- **Objective**: Allow users to share content with specific people
- **Requirements**:
  - Add share button to content page
  - Email invitation system
  - Share link with expiring code
  - "Shared with Me" section in library
- **Dependencies**: `SHARE-01`
- **Deliverables**:
  - `backend/src/content/share.service.ts`
  - `frontend/src/components/share/ShareModal.tsx`
  - Email templates for invitations
- **Acceptance Criteria**:
  - Can invite users by email
  - Share link works with code
  - Shared content appears in recipient's library

---

### MONEY-01: Lemon Squeezy Integration

- **Task ID**: `MONEY-01`
- **Objective**: Integrate Lemon Squeezy for content sales
- **Requirements**:
  - Create Lemon Squeezy account and products
  - Dynamic checkout generation
  - Webhook handling for purchases
  - Store purchase records
  - Grant content access on purchase
- **Dependencies**: `SHARE-01`
- **Deliverables**:
  - `backend/src/payment/lemon-squeezy.service.ts`
  - `backend/src/webhook/lemon-squeezy.controller.ts`
  - `backend/src/payment/purchase.service.ts`
- **Acceptance Criteria**:
  - Generate checkout URL for content
  - Webhook processes purchase
  - Buyer gets access after purchase
  - Seller sees sale in dashboard

---

### MONEY-02: Multi-Method Donation System

- **Task ID**: `MONEY-02`
- **Objective**: Implement donation system with Paddle, ABA KHQR, and PayPal
- **Requirements**:
  - **Paddle:** Checkout for international donations
  - **ABA KHQR:** Creator uploads QR image, displayed to donors
  - **PayPal:** Creator enters PayPal.me link
  - Creator settings page to enable/configure each method
  - Donation recording for Paddle (webhook), manual entry for ABA/PayPal
    optional
- **Dependencies**: `SHARE-01`
- **Deliverables**:
  - `backend/src/payment/paddle.service.ts`
  - `backend/src/webhook/paddle.controller.ts`
  - `backend/src/donation/donation.service.ts`
  - `backend/src/creator/payment-settings.service.ts`
  - `frontend/src/components/donate/DonateModal.tsx` (shows payment options)
  - `frontend/src/app/creator/payment-settings/page.tsx`
- **Acceptance Criteria**:
  - Creator can enable/disable each donation method
  - Creator can upload ABA KHQR image
  - Donation modal shows available methods
  - Paddle donations tracked automatically
  - ABA/PayPal show QR code or link only (no tracking required)

---

### MONEY-03: Creator Dashboard

- **Task ID**: `MONEY-03`
- **Objective**: Build creator earnings and analytics dashboard
- **Requirements**:
  - Earnings summary (sales + donations)
  - Content performance table
  - Payout request system
  - Payout history
- **Dependencies**: `MONEY-01`, `MONEY-02`
- **Deliverables**:
  - `frontend/src/app/creator/page.tsx`
  - `backend/src/creator/analytics.service.ts`
  - `backend/src/payout/payout.service.ts`
- **Acceptance Criteria**:
  - Dashboard shows total earnings
  - Can request payout (min $10)
  - Payout history visible

---

### PLATFORM-01: Platform Content Library

- **Task ID**: `PLATFORM-01`
- **Objective**: Enable admin to upload free platform content
- **Requirements**:
  - Admin-only upload with platform flag
  - Platform Library section on discover page
  - Featured content carousel
  - Category organization
- **Dependencies**: `SHARE-01`, Admin authentication
- **Deliverables**:
  - Admin upload interface
  - Platform library API endpoint
  - Frontend platform library section
- **Acceptance Criteria**:
  - Admin can upload platform content
  - Platform content has special badge
  - All users can access for free

---

### DISCOVER-01: Content Discovery Page

- **Task ID**: `DISCOVER-01`
- **Objective**: Build public content discovery page
- **Requirements**:
  - Search and filter
  - Categories
  - Sort by: popular, new, rating, price
  - Content cards with preview
- **Dependencies**: `SHARE-01`
- **Deliverables**:
  - `frontend/src/app/discover/page.tsx`
  - `backend/src/content/discover.service.ts`
  - Search API with filters
- **Acceptance Criteria**:
  - Can browse public content
  - Filters work correctly
  - Search returns relevant results

---

## 10. Revenue Model

### Platform Commission (Recommended)

| Sale Price     | Platform Fee | Creator Receives |
| -------------- | ------------ | ---------------- |
| $0.99 - $4.99  | 20%          | 80%              |
| $5.00 - $19.99 | 15%          | 85%              |
| $20.00+        | 10%          | 90%              |

### Donations

- Platform fee: **0%** (only payment processing fees apply)
- This encourages creators to enable donations

### Payment Processing Fees (passed to buyer or included)

- Lemon Squeezy: 5% + $0.50
- Paddle: 5% + $0.50
- ABA KHQR: Free (bank to bank)
- PayPal: Creator pays PayPal fees

### Subscription Revenue

- Platform takes: 30%
- Creator pool: 70% (distributed by engagement)

---

## 11. Implementation Tasks (Continued)

### SUB-01: Subscription System

- **Task ID**: `SUB-01`
- **Objective**: Implement all-access subscription with engagement tracking
- **Requirements**:
  - Subscription checkout via Lemon Squeezy or Paddle
  - Monthly/Yearly plans ($9.99 / $79.99)
  - Access control for subscribers
  - Engagement tracking (time spent, sessions, concepts)
  - Monthly revenue calculation and distribution
- **Dependencies**: `SHARE-01`, `MONEY-01`
- **Deliverables**:
  - `backend/src/subscription/subscription.service.ts`
  - `backend/src/subscription/engagement.tracker.ts`
  - `backend/src/subscription/revenue.calculator.ts`
  - `frontend/src/app/subscribe/page.tsx`
  - Subscription management in user settings
- **Acceptance Criteria**:
  - User can subscribe to monthly/yearly
  - Subscriber accesses all public content
  - Engagement tracked per content per month
  - Monthly payout calculated correctly

---

### SUB-02: Bundle System

- **Task ID**: `SUB-02`
- **Objective**: Implement content bundles with discounted pricing
- **Requirements**:
  - Creator can create bundles from their content
  - Set bundle price with 20-50% discount
  - Bundle purchase grants access to all included content
  - Multi-creator bundles (platform-curated)
- **Dependencies**: `SHARE-01`, `MONEY-01`
- **Deliverables**:
  - `backend/src/bundle/bundle.service.ts`
  - `frontend/src/app/creator/bundles/page.tsx`
  - Bundle cards on discover page
  - Bundle detail and checkout
- **Acceptance Criteria**:
  - Creator creates bundle with selected books
  - Discount auto-calculated and enforced
  - Bundle purchase unlocks all contents
  - Revenue split correctly for multi-creator bundles

---

## 11. Legal Considerations

> [!IMPORTANT]
> Before launching monetization, ensure:

1. **Terms of Service** – Clear content ownership and licensing terms
2. **Creator Agreement** – Revenue share, payout terms, content guidelines
3. **DMCA Policy** – Copyright infringement handling
4. **Refund Policy** – 7-30 day refund window (required by most MoRs)
5. **Tax Requirements** – Collect W-9/W-8BEN from creators earning over
   $600/year

---

## 12. Future Enhancements (v2+)

- **Affiliate Program** – Earn % for referring buyers
- **Coupons** – Discount codes for promotions
- **Content Previews** – Free first chapter before purchase
- **Content Requests** – Users can request specific topics
- **Creator Verification** – Verified badge for trusted creators
- **Advanced Analytics** – Deep insights for creators
- **Subscription Tiers** – Premium tiers with exclusive content
- **Gift Purchases** – Buy content for others

---

_Content Sharing & Monetization Feature Specification for Learning OS_
