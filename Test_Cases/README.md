# Test Verification & QA Documentation

This directory contains the quality assurance artifacts, test specifications, execution reports, and automated test suites for the **Smart Issue Tracker** project.

## 📂 Directory Contents

* 📄 **[test_cases.xlsx](file:///Test_Cases/test_cases.xlsx)**: A comprehensive spreadsheet detailing 15 functional, security, and integration test cases covering end-to-end user and admin workflows.
* 📕 **[test_report.pdf](file:///Test_Cases/test_report.pdf)**: A formal PDF test summary report detailing scope, environments, assumptions, pass/fail aggregations, and coverage status.
* 🐍 **[test_duplicate_pipeline.py](file:///Test_Cases/test_duplicate_pipeline.py)**: The Django integration and pipeline verification test suite validating local FAISS embeddings and Gemini verifier execution models.

---

## 🎯 Test Coverage Summary

Our quality verification process covers 15 critical system scenarios across 7 key architectural modules:

### 1. Customer Intake & Ingestion
* **TC-01 (Ticket Submission)**: Verifies that submitting a unique ticket creates a new `UNIQUE` ticket, generates vector coordinates, and registers them in the database and FAISS index.
* **TC-12 (Invalid Input Handling)**: Validates api responses and database isolation constraints when empty subjects or descriptions are posted.

### 2. Multi-tier Deduplication Logic
* **TC-02 (Auto-Duplicate Ingestion)**: Verifies that highly similar tickets ($\ge 90\%$ similarity) automatically transition to `DUPLICATE` without calling the Gemini API.
* **TC-03 (Similarity Thresholds)**: Confirms that similarity values between $75\%$ and $90\%$ trigger the secondary validation stage.
* **TC-05 (Unique Fallback)**: Ensures tickets with similarity $< 75\%$ are categorized as `UNIQUE` immediately.

### 3. Gemini Verification Core
* **TC-04 (Gemini True Match)**: Verifies duplicate detection and parent-ticket link logic when Gemini confirms a match.
* **TC-14 (API Failure Resiliency)**: Confirms that when the Gemini API is blocked or rate-limited, the system falls back to the FAISS cosine similarity result without locking the ticket intake flow.

### 4. Admin Management Controls
* **TC-06 (Dynamic Categories)**: Validates creation, updates, and icon bindings for support categories.
* **TC-10 (Manual Override)**: Confirms that admins can manually change a duplicate ticket to `UNIQUE` (updating indexes and supporter counters).

### 5. Security & Authentication
* **TC-07 (Admin Login/Logout)**: Verifies session authentication cookies and session verification logic.
* **TC-15 (Session Blocking)**: Ensures unauthenticated calls to dashboard stats or categories return `HTTP 403 Forbidden` errors.

### 6. Aggregations & History Logs
* **TC-08 (Dashboard Aggregations)**: Validates that analytics tables, counts, and graphs represent the true PostgreSQL state.
* **TC-09 (Analysis History Audits)**: Verifies that exact vector similarity values, decision flows, and LLM reason descriptions are logged.

### 7. Boundary Configurations
* **TC-11 (Search & Filter Grids)**: Checks client-side and server-side filtering on ticket status and text keywords.
* **TC-13 (Empty States)**: Validates dashboard and ticket grid interfaces when database tables are empty.

---

## 🚀 Running Automated Test Suites

To execute the automated pipeline integration test suite locally, ensure your backend virtual environment is active, then run:

```bash
# Navigate to the Project folder
cd Project

# Activate venv
venv\Scripts\activate

# Run the backend test suite
python manage.py test backend.ai.test_duplicate_pipeline
```
