# Tenaga Rakyat API

![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white) ![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![Jest](https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white)

Tenaga Rakyat API is a robust, scalable backend service built with [NestJS](https://nestjs.com/) designed to connect job providers ("Pemberi Kerja") with workers ("Pekerja"). It handles user accounts, job postings, application lifecycles, payments, wallet integrations, dual-sided reviews, and complex administrative reporting functions.

## 🌟 Modules & Features

The API is structured in highly cohesive, loosely coupled domain modules:

- **Authentication & Registration**: Role-based access control (RBAC), JWT tokenization, Email Verifications with hashed tokens, and password resetting logic using Nodemailer.
- **Users & Portfolios**: Profile management, CV and Avatar uploads, verification statuses, and quota limits.
- **Jobs**: Posting, editing, and managing open vacancies, including precise geographical tagging (Latitude/Longitude integration).
- **Applications**: Managing the lifecycle between `PENDING`, `ACCEPTED`, and `REJECTED` candidate requests.
- **Payments & Wallets**: Complete financial ecosystem using Bull Queue processing and Midtrans Gateway for payouts, withdrawals, transaction histories, and platform fee tracking.
- **Reviews**: Bidirectional rating systems (`PROVIDER_TO_WORKER` and `WORKER_TO_PROVIDER`).
- **Admin & User Management**: Dedicated Super Admin workflows to moderate the ecosystem, ban flags, verify users manually, and manage system administrators.
- **Reporting**: Administrative analytical exports (CSV) and dashboard statistics.

---

## 🏗Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (Node.js/TypeScript)
- **Database**: PostgreSQL
- **ORM**: [Prisma](https://www.prisma.io/)
- **Queuing & Background Jobs**: Bull (Redis)
- **Payment Gateway**: Midtrans
- **Validation**: Zod & Class-Validator
- **Testing**: Jest & Supertest (E2E)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your local machine:
- Node.js (v18 or higher)
- PostgreSQL
- Redis Server (Required for Bull Queues)
- NPM or Yarn

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/marcceljanara/tenaga-rakyat-api.git
   cd tenaga-rakyat-api
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Copy the `env.example` file (or create one) to `.env` and fill in your corresponding local variables:

   ```env
   # App
   PORT=3000
   NODE_ENV=development

   # Database (PostgreSQL)
   DATABASE_URL="postgresql://user:password@localhost:5432/tenaga_rakyat?schema=public"

   # Security
   JWT_SECRET="your_super_secret_key"
   
   # External Services (SMTP/Email)
   SMTP_HOST="smtp.example.com"
   SMTP_PORT=587
   SMTP_USER="youremail@example.com"
   SMTP_PASS="your_password"

   # Payment Gateway (Midtrans)
   MIDTRANS_SERVER_KEY="your-server-key"
   MIDTRANS_IS_PRODUCTION=false
   
   # Frontend App URL (for email magic links)
   FRONTEND_URL="http://localhost:5173"
   ```

4. **Database Migration & Seeding**
   Initialize the database schema via Prisma:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   
   # Optional: populate seed data (roles, etc.)
   npm run prisma:seed
   ```

5. **Start the Application**
   ```bash
   # development
   npm run start
   
   # watch mode (Hot-reload)
   npm run start:dev
   ```

The server should now be running on `http://localhost:3000`.

---

## 🧪 Testing Architecture

We heavily rely on automated End-to-End (E2E) tests. Every module contains a `*.spec.ts` file covering success flows and constraint boundary limits interacting with a live testing database connection. Mock setups are utilized for 3rd party providers (e.g., SMTP Email services).

- **Run all tests:**
  ```bash
  npm run test
  ```
- **Run specific module E2E Tests:**
  ```bash
  npx jest test/auth.spec.ts --runInBand
  npx jest test/admin.spec.ts --runInBand
  npx jest test/payment.spec.ts --runInBand
  # etc...
  ```

*For accurate execution, verify `--runInBand` is appended since tests often manipulate shared database states synchronously.*

---

## 📚 API Documentation

Once the server is running, you can access the interactive auto-generated **Swagger API Documentation** at:

👉 `http://localhost:3000/api/docs`

It contains endpoint parameter schemas, required headers, Authorization tokens, and example response schemas.

---

## 🤝 Contributing

When introducing new functionalities:
1. Declare your Prisma Schema updates in `schema.prisma`.
2. Generate schemas: `npx prisma generate` followed by `npx prisma migrate dev`.
3. Validate data integrity utilizing `zod` schemas located within `module.validation.ts` files.
4. Expand test suites inside the `test/` directory to track your endpoint inputs/outputs reliably before committing. 

---

## 📄 License & Rights
UNLICENSED (Proprietary source-code)
