# Crispo Cookies — Ecommerce Website

A full-featured ecommerce storefront and admin panel for **Crispo Cookies**, built with Next.js 14 (App Router), Tailwind CSS, MongoDB, NextAuth, Razorpay, and Cloudinary.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS with a custom brand design system
- **Fonts:** Playfair Display (headings) + DM Sans (body/UI)
- **Database:** MongoDB with Mongoose
- **Auth:** NextAuth (JWT session, CredentialsProvider)
- **Payments:** Razorpay (order creation + HMAC signature verification)
- **Media:** Cloudinary (product image upload)
- **State:** Zustand (cart + wishlist with localStorage persistence)
- **Charts:** Recharts (admin dashboard)
- **Toasts:** React Hot Toast

## Brand Colors

| Name | Usage | Hex |
|------|-------|-----|
| `navy` | Headings, navbar, footer, primary text | `#1B1B4B` |
| `navy-dark` | Hover states | `#0F0F2D` |
| `gold` | CTAs, prices, badges, accents | `#8B6410` |
| `gold-light` | Decorative elements | `#A07820` |
| `cream` | Page background | `#FAF7F2` |
| `surface` | Cards | `#FFFFFF` |
| `muted` | Secondary text | `#5A5A7A` |
| `red` | Errors, delete actions | `#DC2626` |
| `green` | Success, paid status | `#16A34A` |
| `amber` | Warnings, pending status | `#D97706` |

All colors are defined as Tailwind custom colors and CSS custom properties in `src/app/globals.css`.

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# then fill in the values

# 3. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See [`.env.example`](./.env.example) for the full list with descriptions:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `NEXTAUTH_SECRET` | JWT signing secret for NextAuth |
| `NEXTAUTH_URL` | Base URL of the app |
| `ADMIN_EMAIL` | Admin login email (CredentialProvider) |
| `ADMIN_PASSWORD` | Admin login password |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `RAZORPAY_KEY_ID` | Razorpay key ID (server-side, order creation) |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret (order verification) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay key ID (public, checkout modal) |

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Lint with ESLint
```

## Project Structure

```
src/
├── app/
│   ├── (store)/           # Storefront (public) pages
│   │   ├── page.tsx       # Homepage
│   │   ├── shop/          # Product listing
│   │   ├── shop/[slug]/   # Product detail
│   │   ├── cart/          # Cart
│   │   ├── checkout/      # Checkout (+Razorpay)
│   │   ├── order-success/ # Order confirmation
│   │   ├── about/         # About
│   │   └── contact/       # Contact
│   ├── admin/             # Admin panel
│   │   ├── layout.tsx     # Sidebar + topbar layout
│   │   ├── page.tsx       # Dashboard
│   │   ├── products/      # Product CRUD
│   │   ├── orders/        # Order list + detail
│   │   ├── customers/     # Customer analytics
│   │   ├── categories/    # Category management
│   │   ├── settings/      # Store settings
│   │   └── login/         # Admin login
│   ├── api/               # API routes
│   │   ├── products/      # Public product API
│   │   ├── razorpay/      # Payment endpoints
│   │   ├── contact/       # Contact form
│   │   ├── auth/          # NextAuth
│   │   └── admin/         # Admin-only APIs (auth protected)
│   └── layout.tsx         # Root layout (fonts + toasts)
├── components/            # Shared components
│   ├── admin/             # Admin components
│   ├── product-card.tsx
│   ├── storefront-navbar.tsx
│   ├── storefront-footer.tsx
│   └── confirm-modal.tsx
├── lib/                   # Utilities & services
│   ├── mongodb.ts         # Mongoose connection (cached on global)
│   ├── cloudinary.ts      # Cloudinary upload/delete helpers
│   ├── razorpay.ts        # Razorpay instance
│   ├── auth.ts            # NextAuth config
│   └── helpers.ts         # Price/slug/order-id/truncate helpers
├── models/                # Mongoose models
│   ├── Product.ts
│   ├── Order.ts
│   ├── Category.ts
│   ├── Customer.ts
│   ├── Notification.ts
│   ├── Settings.ts
│   └── Contact.ts
├── store/                 # Zustand stores
│   ├── useCartStore.ts
│   └── useWishlistStore.ts
└── middleware.ts          # Admin route protection
```

## Core Features

### Storefront
- Hero, category strip, best sellers, testimonials carousel, newsletter
- Product listing with filters (category, price, dietary) + sorting + pagination
- Product detail with variant/weight selector, quantity stepper, tabs, related products
- Cart with localStorage persistence, quantity steppers, order summary
- Checkout with Razorpay payment modal and HMAC signature verification
- Order success page, About, Contact with form submission

### Admin Panel
- Secure login (NextAuth CredentialsProvider, 1-day JWT)
- Middleware-protected `/admin/*` routes (except `/admin/login`)
- Dashboard: revenue stats, 7-day revenue chart, recent orders, category pie chart, low-stock alerts
- Products: full CRUD with Cloudinary image upload, variant manager, draft/publish toggle
- Orders: list with filters/search/CSV export, detail with status updates and printable invoice
- Customers: aggregated analytics with slide-in drawer
- Categories: CRUD with inline editing and delete guard
- Settings: store info, delivery, payment keys (masked), social links
- Notifications: real-time order + low-stock alerts with read/unread state

## Deployment (Vercel)

1. Push the repo to GitHub.
2. Import into Vercel.
3. Add all environment variables from `.env.example`.
4. Deploy.

Custom domain and Vercel Analytics can be configured in the Vercel dashboard.

## Notes

- The storefront shop pages and product detail pages currently use bundled sample data so the site renders and is fully browsable without a database configured. Once `MONGODB_URI` is set and products are added via the admin panel, the public `/api/products` endpoints can be wired in.
- Admin APIs return `401` when the session is invalid.
- All delete actions are protected by a confirmation modal.
