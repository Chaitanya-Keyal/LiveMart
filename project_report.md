# LiveMart Project Report

![LiveMart Logo](frontend/public/assets/images/logo.png)

## Group-10

**Group Members:**

* Chaitanya Keyal - 2023B4A70727H
* ARPIT - 2023B3A70482H
* Vishesh - 2023B4A70611H
* Abhishek - 2023B4A71256H

---

## Summary

LiveMart is an e-commerce platform designed to unify the fragmented supply chain of local commerce. Unlike traditional platforms that serve either B2C (Business to Consumer) or B2B (Business to Business) markets, LiveMart integrates **Customers**, **Retailers**, **Wholesalers** and **Delivery Partners** into a single, cohesive ecosystem.

* **Website**: [dashboard.livemart.okaybro.dev](https://dashboard.livemart.okaybro.dev)
* **GitHub Repository**: [github.com/Chaitanya-Keyal/LiveMart](https://github.com/Chaitanya-Keyal/LiveMart)

The platform solves a critical problem in the retail industry: the disconnect between local inventory and digital visibility. Retailers struggle to source products efficiently from wholesalers while simultaneously failing to reach nearby customers online. LiveMart bridges this gap through a unified platform that enables seamless role switching, allowing users to operate as customers, retailers, wholesalers, or delivery partners within a single account. The system leverages geolocation-powered discovery using Google Maps integration and Haversine distance calculations to prioritize nearby sellers in search results, ensuring customers find local shops within walking distance while retailers discover wholesalers in their vicinity. Products support tiered pricing based on buyer type, enabling wholesalers to offer bulk discounts to retailers while maintaining higher retail prices for individual customers. Dynamic delivery fees are calculated based on distance to ensure fair pricing.

The platform provides comprehensive business automation including automated financial settlements that track all transactions, calculate platform commissions, and generate detailed payout records for transparent reconciliation. Wholesalers can upload thousands of products via CSV files with automated validation and error reporting, while retailers can clone purchased products into their own catalog with a single click. Secure payment processing through Razorpay with webhook verification ensures no successful payment goes unrecorded, supporting credit cards, UPI, and net banking. Orders progress through eleven distinct states with delivery partner assignment and real-time tracking, accompanied by responsive MJML email notifications at each transition. The system includes an admin dashboard for platform oversight, smart coupon management with usage limits and targeted distribution, verified purchaser reviews and ratings, low stock alerts for inventory management, email verification via OTP codes, and Google OAuth for single-click registration and login.

## Core Functionality and Workflow

The platform operates on a cyclic commerce model:

1. **Wholesale Supply**: Wholesalers upload bulk inventory (via CSV or manual entry) and set pricing tiers.
2. **Retail Procurement**: Retailers browse wholesale catalogs, benefiting from bulk discounts. They place orders, which are tracked and fulfilled through the platform.
3. **Inventory Transformation**: Once a retailer receives stock, they can "clone" these items into their own retail catalog with a single click, setting a new retail price.
4. **Consumer Purchase**: Customers search for products. The system prioritizes nearby sellers using geolocation. They place orders, pay online, and track delivery.
5. **Delivery**: Delivery partners can claim available orders, update statuses, and complete deliveries.
6. **Settlement**: The platform automatically calculates commissions and settles payments to sellers, ensuring a transparent financial flow.

## Specialized Features

### 1. Google Maps Integration and Geolocation

* **How it works**: When a user searches for a product, the backend calculates the Haversine distance between the user's coordinates and every seller's shop location.
* **The Result**: Search results are sorted by proximity. A customer sees the shop 500 meters away before the one 5 kilometers away.
* **Address Management**: The system uses the Google Maps Autocomplete API to let users pinpoint their exact delivery location, storing the latitude and longitude for precise delivery routing.

<p align="center">
  <img src="images/add-address.png" alt="Add Address with Google Maps" width="600"/>
</p>

<p align="center">
  <img src="images/address-management.png" alt="Address Management" width="600"/>
</p>

### 2. Razorpay Payment Gateway with Webhooks

The platform implements a robust payment flow that handles the unpredictability of real-world internet connections.

* **The Flow**: When a user initiates payment, the system creates a secure order on Razorpay's servers.
* **Webhooks**: The system relies on webhooks for confirmation. If a user pays but closes their browser immediately, Razorpay sends a secure, signed signal to the backend endpoint (`/payments/razorpay/webhook`).
* **Reliability**: This ensures that no successful payment goes unrecorded. The system automatically clears the cart, generates an invoice, and notifies the seller only after cryptographic verification.

<p align="center">
  <img src="images/payment.png" alt="Razorpay Payment Gateway" width="600"/>
</p>

<p align="center">
  <img src="images/payment-success.png" alt="Payment Success" width="600"/>
</p>

### 3. Bulk Product Upload for Wholesalers

Wholesalers manage thousands of SKUs, making individual product entry impractical.

* **The Solution**: The platform provides a dedicated Bulk Import feature (`/products/bulk-import`).
* **How it works**: Wholesalers can upload a structured JSON or CSV payload containing hundreds of products.
* **Validation**: The backend processes this data, validating every row for data integrity (ensuring price is greater than zero, stock is valid) before committing to the database. The system provides a detailed report of successes and failures (such as "Row 45 failed: Invalid Category").

<p align="center">
  <img src="images/wholesaler-bulk-upload.png" alt="Bulk Product Upload" width="600"/>
</p>

### 4. Admin Panel and Financial Settlements

The platform includes a comprehensive Admin Dashboard for system oversight and financial management.

* **Settlements**: The system tracks every order and calculates:
  * Total Amount Paid
  * Platform Commission (for example, 5%)
  * Net Payable to Seller
* **Reconciliation**: Admins can view pending settlements aggregated by seller. They can mark a payout as completed, which updates the ledger and creates a permanent financial record.

<p align="center">
  <img src="images/admin-panel.png" alt="Admin Dashboard" width="600"/>
</p>

<p align="center">
  <img src="images/settlements-admin.png" alt="Settlements Management" width="600"/>
</p>

### 5. Smart Coupon System

The platform implements a comprehensive coupon system (`/coupons`) with advanced validation logic.

* **Validation Logic**: The system checks multiple constraints in real-time:
  * Is the coupon active?
  * Has the usage limit been reached?
  * Does the cart meet the minimum order value?
* **Targeting**: Coupons can be public (available to all users) or targeted (sent to specific email lists via background tasks).
* **Usage Tracking**: The system atomically increments usage counters to prevent race conditions where more users apply a limited coupon than allowed.

<p align="center">
  <img src="images/coupon-creation.png" alt="Coupon Creation" width="600"/>
</p>

<p align="center">
  <img src="images/coupon-applied.png" alt="Coupon Application" width="600"/>
</p>

### 6. Dynamic Role Switching

This represents a key architectural feature of the platform.

* **The Problem**: In most applications, users are either buyers or sellers. Supporting both roles typically requires two separate accounts.
* **The Solution**: The system decouples `User` from `Role`. A user can have a list of roles (for example, `[CUSTOMER, RETAILER]`).
* **The Experience**: A toggle switch in the UI allows users to change their active context. When switching to "Retailer", the entire UI transforms: search bars become inventory tools, and cart icons become order management dashboards. The backend validates every request against the active role, ensuring strict security boundaries.

<p align="center">
  <img src="images/role-switching.png" alt="Role Switching" width="600"/>
</p>

## Technology Stack

### Frontend

The frontend is built as a Single Page Application (SPA) designed for performance, scalability, and developer experience.

* **Framework**: **React 19** - Leveraging the latest features like Actions and optimistic UI updates for a responsive user experience.
* **Build Tool**: **Vite** - Chosen for its lightning-fast hot module replacement (HMR) and optimized production builds.
* **Language**: **TypeScript** - Ensures type safety across the entire application, significantly reducing runtime errors. The frontend types are auto-generated from the backend OpenAPI schema, guaranteeing 100% contract synchronization.
* **UI Library**: **Chakra UI v3** - A modular, accessible component library. The platform utilizes a custom theme system (`createSystem`) with semantic tokens for consistent design and easy dark mode implementation.
* **State Management & Data Fetching**: **TanStack Query (React Query)** - Handles server state, caching, background refetching, and optimistic updates, eliminating the need for complex global state management for API data.
* **Routing**: **TanStack Router** - A type-safe router that manages URL state, search parameters, and nested layouts (such as `_layout/admin`, `_layout/seller`). It ensures that broken links are caught at compile time.
* **Maps Integration**: **Google Maps API** (@react-google-maps/api) - Powers the location-based features, allowing users to pinpoint addresses and find nearby sellers.
* **Linting & Formatting**: **Biome** - A fast, all-in-one toolchain for linting and formatting, ensuring code consistency.

### Backend

The backend is a high-performance, asynchronous REST API designed for reliability and ease of maintenance.

* **Framework**: **FastAPI** - Selected for its speed (Starlette), ease of use, and automatic OpenAPI documentation generation. It supports asynchronous request handling, making it ideal for I/O-bound operations like database queries and external API calls.
* **Database ORM**: **SQLModel** - A library that combines SQLAlchemy and Pydantic. It allows defining models that serve as both database tables and data validation schemas, reducing code duplication.
* **Database**: **PostgreSQL 16+** - A robust, open-source relational database used for its reliability, complex query support, and JSON capabilities (used for storing snapshots of addresses and order history).
* **Authentication**: **OAuth2 with Password Flow (JWT)** - Secure stateless authentication. Access tokens are short-lived (8 days), and the system supports **Google OAuth** for frictionless onboarding.
* **Security**: **Passlib (bcrypt)** for password hashing. Role-based access control (RBAC) is enforced via dependency injection (`require_role`).
* **Migrations**: **Alembic** - Handles database schema changes, ensuring smooth transitions between versions without data loss.
* **Email**: **MJML** - Responsive email templates are designed in MJML and compiled to HTML. **SMTP** is used for reliable delivery of OTPs, order confirmations, and notifications.
* **Payments**: **Razorpay** - Integrated for secure payment processing, supporting webhooks for real-time payment status updates.
* **Linting & Formatting**: **Ruff** - An extremely fast Python linter and formatter.

### Other Libraries and Tools

* **Containerization**: **Docker & Docker Compose** - The entire stack (Frontend, Backend, DB, Traefik, Adminer) is containerized, ensuring consistency across development, staging, and production environments.
* **Reverse Proxy**: **Traefik** - Automatically discovers Docker services and routes traffic. It handles SSL termination (Let's Encrypt) and load balancing.
* **Database Management**: **Adminer** - A lightweight web interface for managing the PostgreSQL database directly.
* **Version Control**: **Git** - Source code management.

### DevTools, CI/CD, and Deployment

* **CI/CD**: **GitHub Actions** - Automated workflows for:
  * **Linting**: Checks code quality on every push.
  * **Staging Deployment**: Deploys to the staging environment on merges to the main branch.
  * **Production Deployment**: Deploys to production on release tags.
* **Pre-commit Hooks**: Automatically runs Ruff and Biome before commits to prevent bad code from entering the repository.

## Features Implemented

### Module 1: Registration and Sign-Up

This module handles the onboarding and identity management of users.

* **Multi-role Registration**: Users select their primary role (Customer, Retailer, Wholesaler) during sign-up. The system allows users to add additional roles later.
* **Secure Authentication**:
  * **Flow**: User enters credentials, backend validates and issues JWT, frontend stores token.
  * **Security**: Passwords are never stored in plain text but are hashed using bcrypt.
* **Email Verification**:
  * **Flow**: After sign-up, the system generates a 6-digit OTP, sends it via email, user enters the OTP, and the account is verified.
  * **Purpose**: Prevents spam accounts and ensures communication channels are valid.
* **Social Login**:
  * **Google OAuth**: Users can sign up or log in with one click. The system automatically retrieves their email and name, creating a seamless entry point.
* **Role Management**:
  * **Dynamic Switching**: Users can switch their active role in the dashboard. For example, a user can switch from Customer mode to Retailer mode to manage their shop without logging out.

<p align="center">
  <img src="images/login.png" alt="Login Page" width="600"/>
</p>

<p align="center">
  <img src="images/signup.png" alt="Sign Up Page" width="600"/>
</p>

<p align="center">
  <img src="images/email-verification-email.png" alt="Email Verification" width="600"/>
</p>

### Module 2: User Dashboards

Tailored interfaces for each user type ensure relevant information is always at hand.

* **Customer Dashboard**:
  * **Home Feed**: Personalized product recommendations and nearby shop listings.
  * **Order History**: List of past orders with status tracking.
* **Retailer/Wholesaler Dashboard**:
  * **Inventory Management**: CRUD operations for products. Sellers can set stock levels, low-stock alerts, and pricing.
  * **Sales Overview**: Charts and metrics showing daily and weekly sales performance.
  * **Order Management**: Interface to view incoming orders, update status (for example, "Ready to Ship"), and assign delivery partners.
* **Product Management**:
  * **Rich Details**: Support for multiple images, detailed descriptions, and categorization.
  * **Pricing Tiers**: Sellers can define different prices for different buyer types (for example, a Wholesaler sets a lower price for Retailers buying in bulk).

<p align="center">
  <img src="images/customer-dashboard.png" alt="Customer Dashboard" width="600"/>
</p>

<p align="center">
  <img src="images/retailer-inventory-management.png" alt="Inventory Management" width="600"/>
</p>

<p align="center">
  <img src="images/product-edit.png" alt="Product Management" width="600"/>
</p>

<p align="center">
  <img src="images/stock-management.png" alt="Stock Management" width="600"/>
</p>

<p align="center">
  <img src="images/retailer-order-with-clone-product-button.png" alt="Product Cloning" width="600"/>
</p>

### Module 3: Search & Navigation

Helping users find what they need quickly and efficiently.

* **Smart Filtering**:
  * **Facets**: Filter by Category, Price Range, Brand, and Availability.
  * **Logic**: Filters are applied server-side for performance.
* **Location-Based Services**:
  * **Geospatial Search**: The platform provides location-based shop discovery. The backend uses the Haversine formula to sort sellers by distance.
* **Product Search**:
  * **Full-Text Search**: Users can search for product names, descriptions, or SKUs.

<p align="center">
  <img src="images/product-search.png" alt="Product Search" width="600"/>
</p>

<p align="center">
  <img src="images/product-detail-with-reviews.png" alt="Product Detail" width="600"/>
</p>

### Module 4: Order & Payment Management

The core commerce engine of the platform.

* **Cart System**:
  * **Persistence**: Cart items are stored in the database, so they persist across devices.
  * **Validation**: Real-time stock checks prevent adding out-of-stock items.
* **Checkout Process**:
  * **Address Selection**: Users choose from saved addresses or add a new one using Google Maps autocomplete.
  * **Coupon Application**: Users can apply discount codes. The system validates validity, usage limits, and minimum order values.
* **Payment Gateway**:
  * **Razorpay Integration**: Seamless flow for credit cards, UPI, and net banking.
  * **Webhooks**: The backend listens for Razorpay webhooks to automatically mark orders as "Paid" even if the user closes the browser.
* **Order Tracking**:
  * **Granular Statuses**: Orders progress through multiple states: Pending, Confirmed, Preparing, Ready to Ship, Out for Delivery, and Delivered.
  * **History**: A timeline view shows when each status change occurred.
* **Settlements**:
  * **Automated Logic**: The system calculates the platform commission and the net amount due to the seller.
  * **Transparency**: Sellers can view a report of all settlements and their status (Pending or Completed).

<p align="center">
  <img src="images/cart.png" alt="Shopping Cart" width="600"/>
</p>

<p align="center">
  <img src="images/checkout.png" alt="Checkout" width="600"/>
</p>

<p align="center">
  <img src="images/order-details.png" alt="Order Details" width="600"/>
</p>

<p align="center">
  <img src="images/retailers-order-list.png" alt="Seller Orders" width="600"/>
</p>

<p align="center">
  <img src="images/deliveries-list.png" alt="Delivery Orders" width="600"/>
</p>

<p align="center">
  <img src="images/delivery-partner-claim.png" alt="Claim Delivery" width="600"/>
</p>

### Module 5: Feedback and Dashboard Updates

Ensuring quality and keeping users informed.

* **Reviews & Ratings**:
  * **Verified Purchase Only**: Only users who have bought a product can review it, ensuring authenticity.
  * **Aggregates**: Product pages show average ratings and review counts.
* **Notifications**:
  * **Email Triggers**: System sends emails for: Welcome, OTP, Order Confirmation, Status Updates, and Low Stock Alerts.
* **Admin Panel**:
  * **Superuser Access**: A special role for platform administrators.
  * **Capabilities**: Manage global settings, view all users, manage coupons, and oversee platform-wide settlements.

<p align="center">
  <img src="images/add-review.png" alt="Write Review" width="600"/>
</p>

<p align="center">
  <img src="images/order-confirm-email.png" alt="Order Confirmation Email" width="600"/>
</p>

<p align="center">
  <img src="images/order-status-update-email.png" alt="Order Status Email" width="600"/>
</p>

## Key Platform Highlights

* **Dynamic Role Switching Architecture**: Unlike traditional platforms where a user is either a buyer or a seller, LiveMart treats roles as attributes. A single `User` entity can possess multiple `UserRole` links. The `active_role` field on the user model determines the current context, allowing for a fluid user experience where a Retailer can buy stock (as a customer of a Wholesaler) and sell goods (to end Customers) using the same account.
* **Tiered Pricing Model**: The `ProductPricing` model allows a single product to have multiple price points based on the `BuyerType`. This enables complex B2B and B2C scenarios within a single catalog.
* **Automated Settlements System**: The platform includes a dedicated `PaymentSettlement` module. It aggregates orders, calculates the platform commission, and generates payout records for sellers. This automates the financial reconciliation process, which is often a manual pain point.

## Unique Selling Points (USPs)

1. **Unified Supply Chain Ecosystem**: LiveMart is not just a B2C store or a B2B marketplace; it is both. It connects the entire chain (Wholesaler to Retailer to Customer) in one application, reducing friction and intermediaries.
2. **Hyper-Local Focus**: The architecture is designed to prioritize proximity. Search results and shop listings default to the user's location, supporting local commerce initiatives and reducing delivery times.
3. **Transparent Operations**: Real-time visibility into stock levels and order statuses builds trust. Retailers can track when their wholesale stock will arrive, and Customers can track their delivery status.
4. **Developer-Friendly Architecture**: The project uses a schema-first approach. The backend OpenAPI schema drives the frontend TypeScript client generation. This means if a backend developer changes an API response, the frontend build will fail immediately, preventing subtle runtime bugs.

## System Architecture

The system follows a modern, containerized microservices-ready architecture. While currently deployed as a modular monolith for simplicity, the clear separation of concerns allows for easy splitting into microservices in the future.

### Directory Structure and Organization

* **`backend/app/models`**: Contains SQLModel definitions. These serve as both database tables and Pydantic schemas.
* **`backend/app/api`**: Holds the route handlers, organized by resource (users, products, orders).
* **`backend/app/crud`**: Encapsulates all database logic. The API layer does not access the database directly but calls CRUD functions.
* **`frontend/src/routes`**: Follows the file-based routing convention of TanStack Router.
* **`frontend/src/client`**: Contains the auto-generated API client SDK.

### Database Schema Diagrams

The following diagrams show the core domain models and their relationships, split by functional area for clarity.

#### User and Authentication Domain

```mermaid
classDiagram
    class User {
        +UUID id
        +String email
        +String full_name
        +String hashed_password
        +RoleEnum active_role
        +UUID active_address_id
        +Boolean is_active
        +Boolean email_verified
        +has_role(role) bool
        +get_roles() List~RoleEnum~
    }

    class UserRole {
        +UUID id
        +UUID user_id
        +RoleEnum role
        +DateTime created_at
    }

    class Address {
        +UUID id
        +UUID user_id
        +String street_address
        +String city
        +String state
        +String postal_code
        +Float latitude
        +Float longitude
        +AddressLabelEnum label
    }

    User "1" -- "*" UserRole : has_roles
    User "1" -- "*" Address : owns
    User "1" -- "0..1" Address : active_address
```

#### Product Catalog Domain

```mermaid
classDiagram
    class User {
        +UUID id
        +String email
    }

    class Product {
        +UUID id
        +UUID seller_id
        +UUID address_id
        +String name
        +String description
        +CategoryEnum category
        +String sku
        +String brand
        +SellerType seller_type
        +Boolean is_active
    }

    class ProductPricing {
        +UUID id
        +UUID product_id
        +BuyerType buyer_type
        +Decimal price
        +Int min_quantity
        +Int max_quantity
        +Boolean is_active
    }

    class ProductInventory {
        +UUID id
        +UUID product_id
        +Int stock_quantity
        +Int low_stock_threshold
        +DateTime last_restocked_at
    }

    class ProductReview {
        +UUID id
        +UUID product_id
        +UUID author_user_id
        +Int rating
        +String title
        +String content
    }

    class Address {
        +UUID id
        +Float latitude
        +Float longitude
    }

    Product "*" -- "1" User : seller
    Product "1" -- "*" ProductPricing : pricing_tiers
    Product "1" -- "1" ProductInventory : inventory
    Product "1" -- "*" ProductReview : reviews
    Product "*" -- "1" Address : pickup_location
    ProductReview "*" -- "1" User : author
```

#### Shopping Cart Domain

```mermaid
classDiagram
    class User {
        +UUID id
        +String email
    }

    class Cart {
        +UUID id
        +UUID user_id
        +DateTime created_at
        +DateTime updated_at
    }

    class CartItem {
        +UUID id
        +UUID cart_id
        +UUID product_id
        +Int quantity
    }

    class Product {
        +UUID id
        +String name
        +Decimal price
    }

    User "1" -- "1" Cart : owns
    Cart "1" -- "*" CartItem : contains
    CartItem "*" -- "1" Product : references
```

#### Order and Payment Domain

```mermaid
classDiagram
    class User {
        +UUID id
        +String email
    }

    class Order {
        +UUID id
        +String order_number
        +UUID buyer_id
        +UUID seller_id
        +UUID delivery_partner_id
        +UUID payment_id
        +OrderStatus status
        +Decimal subtotal
        +Decimal delivery_fee
        +Decimal total_amount
        +DateTime created_at
    }

    class OrderItem {
        +UUID id
        +UUID order_id
        +UUID product_id
        +String product_name
        +Int quantity
        +Decimal price_paid
    }

    class Payment {
        +UUID id
        +UUID user_id
        +PaymentStatus status
        +Decimal total_amount
        +String razorpay_order_id
        +String razorpay_payment_id
    }

    class OrderStatusHistory {
        +UUID id
        +UUID order_id
        +OrderStatus status
        +UUID changed_by_user_id
        +String notes
        +DateTime created_at
    }

    User "1" -- "*" Order : buyer
    User "1" -- "*" Order : seller
    User "1" -- "*" Order : delivery_partner
    Order "1" -- "*" OrderItem : contains
    Order "*" -- "1" Payment : paid_by
    Order "1" -- "*" OrderStatusHistory : history
    Payment "*" -- "1" User : by_user
    OrderStatusHistory "*" -- "1" User : changed_by
```

#### Coupon and Settlement Domain

```mermaid
classDiagram
    class Coupon {
        +UUID id
        +String code
        +DiscountType discount_type
        +Decimal discount_value
        +Decimal min_order_value
        +Int usage_limit
        +Int used_count
        +DateTime valid_from
        +DateTime valid_until
        +Boolean is_active
        +Boolean is_featured
    }

    class Payment {
        +UUID id
        +Decimal total_amount
    }

    class PaymentCoupon {
        +UUID id
        +UUID payment_id
        +UUID coupon_id
        +Decimal discount_amount
    }

    class PaymentSettlement {
        +UUID id
        +UUID user_id
        +UserType user_type
        +Decimal amount
        +Decimal commission_amount
        +Decimal net_amount
        +DateTime settlement_date
        +SettlementStatus status
        +List~String~ order_ids
    }

    class User {
        +UUID id
        +String email
    }

    Payment "1" -- "*" PaymentCoupon : uses_coupons
    PaymentCoupon "*" -- "1" Coupon : applies
    PaymentSettlement "*" -- "1" User : for_user
```

## Database Overview

The database is normalized to 3NF to ensure data integrity.

* **`user`**: The central identity table. Stores credentials and profile info.
* **`user_role`**: A many-to-many link table between users and roles.
* **`address`**: Stores geocoded locations. Linked to users. Used for both shipping addresses and shop locations.
* **`product`**: The main catalog table. Contains static data (name, description).
* **`product_pricing`**: One-to-Many with Product. Allows different prices for different buyer types.
* **`product_inventory`**: One-to-One with Product. Separates volatile stock data from static catalog data to reduce locking contention.
* **`cart` and `cart_item`**: Transient data for shopping sessions.
* **`order`**: The central transaction record. Contains snapshots of addresses to preserve history even if the user changes their address later.
* **`order_item`**: Details of what was bought. Stores a snapshot of the price at the time of purchase.
* **`payment`**: Tracks Razorpay transaction details and statuses.
* **`payment_settlement`**: Records the financial payouts to sellers.

## Deployment and Developer Guide

### Prerequisites

* **Docker Engine and Docker Compose** (v2.0+)
* **Node.js 20+** (Only for local frontend development outside Docker)
* **Python 3.12+** (Only for local backend development outside Docker)

### Quick Start with Docker (Recommended)

This is the easiest way to get the full stack running.

1. **Clone the repository**:

    ```bash
    git clone https://github.com/Chaitanya-Keyal/LiveMart.git
    cd LiveMart
    ```

2. **Configure Environment**:
    * Copy `.env.example` to `.env`.
    * Generate a secure secret key: `openssl rand -hex 32`.
    * Set `SECRET_KEY`, `POSTGRES_PASSWORD`, `FIRST_SUPERUSER`, and `FIRST_SUPERUSER_PASSWORD`.
    * (Optional) Add Google Maps API Key and Razorpay Keys for full functionality.
3. **Run the Stack**:

    ```bash
    docker compose watch
    ```

    * The `watch` command enables hot-reloading for both frontend and backend containers.
4. **Access the App**:
    * **Frontend**: `http://localhost:5173`
    * **Backend API Docs**: `http://localhost:8000/docs`
    * **Adminer (Database UI)**: `http://localhost:8080`
    * **Traefik Dashboard**: `http://localhost:8090`

### Local Development (Hybrid)

If you prefer running services natively for faster debugging:

* **Backend**:
    1. Navigate to `backend/`.
    2. Install dependencies: `uv sync` (or `pip install -r requirements.txt`).
    3. Run the server: `fastapi dev app/main.py`.
    4. The API will be available at `http://localhost:8000`.

* **Frontend**:
    1. Navigate to `frontend/`.
    2. Install dependencies: `npm install`.
    3. Run the dev server: `npm run dev`.
    4. The UI will be available at `http://localhost:5173`.

### Deployment to Production

The project is designed for easy deployment using Docker Compose and Traefik.

1. **Provision a Server**: A VPS (such as AWS EC2, DigitalOcean Droplet) with Docker installed.
2. **DNS Configuration**: Point your domain (such as `livemart.com`) and subdomains (`api.livemart.com`, `dashboard.livemart.com`) to the server IP.
3. **Traefik Setup**:
    * Deploy the `docker-compose.traefik.yml` stack.
    * This sets up the reverse proxy and automatic SSL certificate management (Let's Encrypt).
4. **App Deployment**:
    * Set `ENVIRONMENT=production` in `.env`.
    * Run `docker compose -f docker-compose.yml up -d`.
    * Traefik will automatically detect the new containers and route traffic securely via HTTPS.
