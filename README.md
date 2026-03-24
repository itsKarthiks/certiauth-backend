# Certificate Verification Server

A secure, RESTful backend service designed to issue, store, and verify digital certificates. This system ensures data integrity and authenticity by leveraging SHA-256 hashing and RSA asymmetric cryptography alongside standard CRUD operations and ACID-compliant database transactions.

## 🛠 Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Cryptography:** Built-in Node `crypto` module (SHA-256, RSA)
* **Architecture:** MVC (Model-View-Controller)

## 📂 Directory Structure

```text
├── src/
│   ├── config/           # Database and environment configurations
│   ├── controllers/      # Core business logic (issue, verify)
│   ├── models/           # Database schemas/models
│   ├── routes/           # Express API route definitions
│   ├── utils/            
│   │   └── crypto.js     # RSA and SHA-256 implementation
│   └── app.js            # Express app initialization
├── keys/                 # RSA .pem files (excluded from git)
├── .env                  # Environment variables
├── package.json
└── README.md

## 🔌 Core API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/certificates/issue` | Accepts student/course data, hashes it (SHA-256), signs it (RSA), and stores it. |
| `POST` | `/api/certificates/verify` | Accepts a certificate payload and signature, verifies authenticity using the Public Key. |
| `GET` | `/api/certificates/:id` | Retrieves a specific certificate's details via standard CRUD. |

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+ recommended)
* npm or yarn

### 1. Clone & Install
```bash
git clone <your-repository-url>
cd server-repo
npm install

### 4. Run the Server
```bash
# For development with auto-restart
npm run dev

# For production
npm start