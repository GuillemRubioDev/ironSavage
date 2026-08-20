# tienda suple

A full-stack e-commerce application built with [Vendure](https://www.vendure.io/) and [Next.js](https://nextjs.org/).

## Project Structure

This is a monorepo using npm workspaces:

```
tienda suple/
├── apps/
│   ├── server/       # Vendure backend (GraphQL API, Admin Dashboard)
│   └── storefront/   # Next.js frontend
└── package.json      # Root workspace configuration
```

## Getting Started

### Development

Start both the server and storefront in development mode:

```bash
npm run dev
```

Or run them individually:

```bash
# Start only the server
npm run dev:server

# Start only the storefront
npm run dev:storefront
```

### Access Points

- **Vendure Dashboard**: http://localhost:3000/dashboard
- **Shop GraphQL API**: http://localhost:3000/shop-api
- **Admin GraphQL API**: http://localhost:3000/admin-api
- **Storefront**: http://localhost:3001

### Admin Credentials

Use these credentials to log in to the Vendure Dashboard:

- **Username**: superadmin
- **Password**: superadmin

## Database Setup

A brand new environment needs three steps, in order, before the store can process a checkout:

```bash
cd apps/server
npx vendure migrate --run  # create the schema
npm run seed                # create the minimum commercial configuration
npm run dev:server          # or build + start, for production
```

`npm run seed` reproducibly creates the commercial configuration a clean
install needs — country Spain (ES), a "Spain" zone, the default channel set
to EUR + that zone, a "Standard" 21% tax rate, the `standard-shipping`
method, and the `redsys` payment method (plus a `standard-payment` dummy
method outside `APP_ENV=production`, for testing without a real gateway). It
never creates products, customers, orders, or any Redsys credentials — those
still come from `.env` (see `.env.example`) at request time, never from the
seed.

Safe to run more than once: every step checks for the existing row first
(by country code, zone name, tax category name, method code) and reuses or
updates it in place instead of duplicating it.

## Production Build

Build all packages:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Learn More

- [Vendure Documentation](https://docs.vendure.io)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vendure Discord Community](https://vendure.io/community)
