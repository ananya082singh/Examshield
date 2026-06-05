# ExamShield

### Secure Exam Paper Distribution & Leak Traceability Platform (MVP)

**ExamShield** is a cybersecurity-oriented software solution designed for educational institutions to securely upload, schedule, distribute, and trace exam papers. It mitigates the risk of exam leaks (common with WhatsApp, email, or USB distribution) by using server-side encryption, role-based time locks, dynamic PDF watermarking, live security alerts, and a forensic scan tracer.

---

## 🔒 Security Workflows

1. **Server-Side Encryption (AES-256-GCM):**
   * PDFs are encrypted on-the-fly when uploaded and stored as `.enc` binary files. Unencrypted PDFs are **never** written to server disk.
   * Cryptographic Initialization Vectors (IVs) and authentication tags are stored in the database.
2. **Document Integrity Check (SHA-256):**
   * A SHA-256 hash of the original PDF is saved during upload.
   * When accessed, the decrypted file is hashed and matched against the database to guarantee zero tamper or corruption.
3. **Time-Locked Access Control:**
   * Center Admins can only download papers during the active exam window.
   * Requests made outside the window return a `403 Forbidden` error.
4. **Dynamic Watermarking & signed QR codes:**
   * When an authorized center decrypts a paper, the server overlays a semi-transparent diagonal watermark on all pages containing the center name, code, user email, download timestamp, and a unique Watermark Session ID.
   * An HMAC-signed QR code signature is stamped on the first page to prevent watermark counterfeiting.
5. **Leak Forensics Investigation:**
   * If a leaked document is found, administrators can upload the file or input its Trace ID.
   * The scanner parses the PDF stream for our watermark token patterns (`ES-XXXXXXXX`) and queries the logs to pinpoint the leaking account, center code, time, and client environment.

---

## ⚙️ Tech Stack

*   **Frontend:** Next.js (TypeScript, Tailwind CSS, custom Glassmorphism UI)
*   **Backend:** Node.js (Express.js, TypeScript, Multer, JWT)
*   **Database:** Prisma ORM with SQLite (Serverless file db for easy zero-config local runs)
*   **PDF Processing & QRs:** `pdf-lib` (structural PDF injection) & `qrcode`

---

## 🚀 Quick Start Guide

### Prerequisites
*   **Node.js** (v18 or higher recommended)
*   **npm** (installed automatically with Node)

### Installation & Launch

1.  **Clone / Navigate** to the project directory:
    ```bash
    cd /Users/ananya123/.gemini/antigravity-ide/scratch/examshield
    ```
2.  **Run the Setup Command** (Installs frontend/backend packages, generates Prisma clients, and configures the SQLite file database):
    ```bash
    npm run setup
    ```
3.  **Start both servers concurrently** (Starts backend API on `http://localhost:5001` and Next.js frontend on `http://localhost:3000`):
    ```bash
    npm run dev
    ```
4.  Open your browser and navigate to: **`http://localhost:3000`**

---

## 🔐 Default Demo Accounts

All credentials automatically seed on the first server launch. The default password for all demo accounts is **`Password123`**.

| Role | Email | Purpose / View |
| :--- | :--- | :--- |
| **Super Admin** | `admin@examshield.com` | Audit Logs, Active Security Flags, Center/User provisioning, Leak Forensics |
| **Exam Controller** | `controller@examshield.com` | Scheduling exam windows, uploading papers, assigning test centers |
| **Center Admin 1** | `center@examshield.com` | North High School (NHS-782) - View assigned papers, live countdowns, watermark decryption |
| **Center Admin 2** | `center2@examshield.com` | West College (WCE-104) - Alternate center admin workspace |

---

## 📊 Database Schema Summary

*   `User`: Represents auth users with role assignments (`SUPER_ADMIN`, `EXAM_CONTROLLER`, `CENTER_ADMIN`).
*   `Center`: Represents physical exam centers with location attributes and codes.
*   `Exam`: Defines scheduled testing windows (start, end, name, date).
*   `Paper`: Contains encrypted paper references, encryption keys (IV/Tag), and validation hashes.
*   `Assignment`: Junction mapping which center is authorized for which exam paper.
*   `AuditLog`: Tracks login audits, downloads, unauthorized accesses, and forensics.
*   `Alert`: Flags suspicious events (brute force login, rapid download limits, new device user-agents).
