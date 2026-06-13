# Site Features and Capabilities

This document outlines all the major functions and user-facing features of the platform, based on the codebase structure.

## 1. Authentication & Onboarding
* **Sign Up / Log In:** Standard user authentication.
* **Password Reset:** Allows users to recover their accounts.
* **Business Setup:** A dedicated flow for restaurant owners to initialize their store details.
* **Team Invites:** Invite staff members to the restaurant workspace.
* **Onboarding:** Guided process for new users/businesses.

## 2. Customer Experience (Storefront)
* **Digital Shop / Menu:** Customers can view the available menu and place food orders.
* **QR Code Generation & Scanning:** Businesses can generate QR codes (e.g., for tables), and customers can scan them to access the menu.
* **Cart & Checkout:** Customers can review their items, place orders, and pay.
* **Payments Integration:** Processes payments securely (integrated with Razorpay).

## 3. Management & Admin Dashboard
* **Main Dashboard:** High-level overview of the business.
* **Analytics:** View sales data, order volume, and other key metrics.
* **Menu Management:** Add, edit, and organize food items, categories, and inventory.
* **Staff Management:** Add or remove staff, and assign role-based permissions.
* **Settings:** Configure general business preferences.
* **Pricing & Billing:** Manage the SaaS subscription plans for the business.

## 4. Role-Based Staff Dashboards
The platform provides customized workflows for different restaurant staff roles:
* **Server / Waiter Dashboard:** Manage table orders and serve customers.
* **Cashier Dashboard:** Handle billing, verify pins, and manage transactions.
* **Kitchen / Cook Dashboard:** View incoming tickets and update order statuses (e.g., preparing, ready).
* **Juice / Beverage Dashboard:** Specialized view for drink preparation.
* **Servant / Runner Dashboard:** Manage food delivery to tables.

## 5. Marketing & Public Pages
* **Landing Page:** Showcases the product to potential customers (Hero Section, How it Works).
* **Features Grid:** Highlights the key benefits of the platform.
* **Pricing Plans:** Publicly displays the available subscription tiers.

## 6. Core Backend Services
* **Order Management API:** Handles creating orders and updating order status in real-time.
* **Cron Jobs:** Scheduled tasks for maintenance or recurring business logic.
* **Database & Auth:** Powered by Supabase.
