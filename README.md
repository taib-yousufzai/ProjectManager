# Project Manager

A comprehensive full-stack application for managing clients, projects, payments, and financial reports. Built with React, Vite, and Firebase.

## 🚀 Features

### 👥 Client & Project Management
- **Client Dashboard**: Track client details, total revenue, and active project counts.
- **Project Tracking**: Manage projects with statuses (Active, Completed, On Hold).
- **Task & Milestone Management**: Break down projects into actionable tasks and track key milestones.

### 💰 Financial Management
- **Payment Tracking**: Record and verify payments with support for multiple currencies and payment methods.
- **Revenue Rules**: Define automated revenue split rules (e.g., 70/30 splits) for transparent financial distribution.
- **Ledger System**: Double-entry ledger system for accurate financial record-keeping.
- **Settlements**: Calculate and process settlements for different parties based on revenue rules.

### 📊 Analytics & Reports
- **Dynamic Reports**: Generate PDF and CSV reports for projects, payments, and revenue.
- **Visual Analytics**: Interactive charts for revenue trends, project distribution, and growth metrics.
- **Team Management**: Manage team members and permissions directly from the settings.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite
- **Styling**: CSS Modules (Vanilla CSS)
- **Database & Auth**: Firebase (Firestore, Authentication)
- **Visualization**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router DOM v7

## ⚙️ Setup & Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/taib-yousufzai/ProjectManager.git
    cd ProjectManager
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Firebase**
    - Create a project in the [Firebase Console](https://console.firebase.google.com/).
    - Create a `.env` file in the root directory (see `.env.example`).
    - Add your Firebase configuration credentials.

4.  **Run locally**
    ```bash
    npm run dev
    ```

## 🔒 Firebase Security Rules

This project uses Firestore security rules to ensure data privacy and integrity.
- **Users**: Can only list/manage profiles if authenticated.
- **Projects**: Access restricted to team members and owners.
- **Financials**: Strict read/write access for authorized personnel.

## 📄 License

This project is private and proprietary.
