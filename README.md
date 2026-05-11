# SwiftPOS - Point of Sale System

A modern, full-stack Point of Sale (POS) application built with Next.js, PostgreSQL, and Prisma.

## Features

### Core Features
- **Authentication & Authorization** - Role-based access control with NextAuth
- **Dashboard** - Real-time sales analytics, low stock alerts, top products
- **POS System** - Fast checkout with barcode scanning, cart management, and multiple payment methods
- **Products & Inventory** - Full CRUD operations with category management
- **Stock Management** - Track stock movements and levels
- **Sales History** - View and filter all sales transactions
- **Suppliers & Purchases** - Manage suppliers and create purchase orders
- **User Management** - Admin-only user creation and role assignment

### User Roles
- **Admin** - Full system access
- **Manager** - Dashboard, POS, products, stock, purchases, reports
- **Cashier** - POS and own sales history only
- **Storekeeper** - Products view, stock, and purchases only

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth with credentials provider
- **Password Hashing**: bcryptjs

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (local instance)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd pos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   The `.env` file is already configured with:
   ```
   DATABASE_URL="postgresql://postgres:Admin@localhost:5432/pos"
   NEXTAUTH_SECRET="your-secret-key-change-in-production"
   NEXTAUTH_URL="http://localhost:3000"
   ```
   
   Update the database credentials if needed.

4. **Run database migrations**
   ```bash
   npm run prisma:migrate
   ```

5. **Seed the database**
   ```bash
   npm run prisma:seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@swiftpos.com | admin123 |
| Manager | manager@swiftpos.com | manager123 |
| Cashier | cashier@swiftpos.com | cashier123 |
| Storekeeper | storekeeper@swiftpos.com | storekeeper123 |

## Project Structure

```
pos/
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Database seeding
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── api/         # API routes
│   │   │   ├── auth/    # NextAuth endpoints
│   │   │   ├── products/
│   │   │   ├── sales/
│   │   │   ├── stock/
│   │   │   ├── purchases/
│   │   │   ├── suppliers/
│   │   │   └── users/
│   │   ├── login/       # Login page
│   │   ├── dashboard/   # Dashboard
│   │   ├── pos/         # POS system
│   │   ├── products/    # Products management
│   │   ├── sales/       # Sales history
│   │   ├── stock/       # Stock management
│   │   ├── purchases/   # Purchases
│   │   └── users/       # User management
│   ├── components/      # React components
│   ├── lib/             # Utilities
│   │   ├── prisma.ts    # Prisma client singleton
│   │   └── auth.ts      # NextAuth configuration
│   └── types/           # TypeScript types
├── .env                 # Environment variables
├── next.config.js       # Next.js configuration
├── tailwind.config.ts   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get session

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `GET /api/products/[id]` - Get product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product

### Sales
- `GET /api/sales` - List sales
- `POST /api/sales` - Create sale

### Stock
- `GET /api/stock` - List stock movements
- `POST /api/stock` - Create stock adjustment

### Purchases
- `GET /api/purchases` - List purchases
- `POST /api/purchases` - Create purchase

### Suppliers
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Create supplier

### Users
- `GET /api/users` - List users (admin only)
- `POST /api/users` - Create user (admin only)

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category

## Key Features

### POS System
- Auto-focused barcode input for fast scanning
- Real-time product search by name or barcode
- Dynamic cart with quantity management
- Percentage-based discount support
- Multiple payment methods (Cash, Card, Mobile Money)
- Printable receipt generation
- Automatic stock deduction on sale completion

### Stock Management
- Real-time stock level tracking
- Low stock alerts and warnings
- Stock movement history (IN/OUT/ADJUSTMENT)
- Automatic stock updates from sales and purchases

### Dashboard
- Today's sales summary
- Low stock alerts
- Top selling products
- Recent sales activity

## Production Deployment

Before deploying to production:

1. **Update environment variables**
   - Change `NEXTAUTH_SECRET` to a strong random string
   - Update database credentials
   - Set `NEXTAUTH_URL` to your production domain

2. **Build the application**
   ```bash
   npm run build
   ```

3. **Run database migrations**
   ```bash
   npx prisma migrate deploy
   ```

4. **Start the production server**
   ```bash
   npm start
   ```

## License

MIT