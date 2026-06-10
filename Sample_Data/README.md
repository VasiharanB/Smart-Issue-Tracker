# Sample Test Data & Deduplication Pipeline Mapping

This directory contains mockup datasets representing ticket payloads to verify the processing of the **Smart Issue Tracker** deduplication engine.

## 📂 Directory Contents

* 📥 **[sample_input_tickets.json](file:///Sample_Data/sample_input_tickets.json)**: A list of four sample tickets representing unique entries, exact duplicates, and semantically similar tickets.
* 📤 **[expected_output.json](file:///Sample_Data/expected_output.json)**: A detailed mapping of expected system outputs, including similarity scores, verdicts, and decision routes.

---

## 🔬 Deduplication Pipeline Verification Scenarios

The sample tickets represent the four core execution paths in the deduplication pipeline:

### 1. Ingestion of a New Unique Master Ticket (`T-1001`)
* **Input**: John Doe submits a ticket regarding corporate email login 403 errors.
* **Pipeline Action**: Since there are no prior vectors under the `authentication` category, the similarity search results are empty.
* **Outcome**: Marked as `UNIQUE`. Vector embeddings (384 float dimensions) are generated, stored in DB, and registered in FAISS index.

### 2. Auto-Duplicate Ingestion under Rule A (`T-1002`)
* **Input**: Alice Smith submits a ticket identical to `T-1001`.
* **Pipeline Action**: FAISS returns a cosine similarity of $100\%$ ($1.00$). Since similarity is $\ge 90\%$, it bypasses Gemini to save API quota.
* **Outcome**: Marked as `DUPLICATE` of `T-1001`. The parent ticket `T-1001` has its supporter count incremented.

### 3. Gemini-Verified Semantic Duplicate under Rule B (`T-1003`)
* **Input**: Bob Johnson submits a ticket with the subject *"Corporate email login page failing with 403 error"*.
* **Pipeline Action**: Text comparison shows different phrasing, but high semantic alignment. FAISS resolves similarity as $83.5\%$. Since similarity lies in $[75\%, 90\%)$, the ticket details are serialized and sent to Gemini AI with a structured Pydantic response schema.
* **Outcome**: Gemini verifies `same_issue = True`. Ticket is marked as `DUPLICATE` and linked to `T-1001`.

### 4. Semantic Unique Ticket under Rule D (`T-1004`)
* **Input**: Sarah Connor submits a billing ticket about server errors on the checkout page.
* **Pipeline Action**: The category is different, and the vector representation results in a similarity score of only $12.4\%$ ($0.124$).
* **Outcome**: Because similarity is $< 75\%$, it is marked `UNIQUE` and added to the database and vector spaces.

---

## 🛠️ Testing with the Sample Data

You can use the python shell to ingest these sample tickets through the Django service layer to verify live execution:

```python
import json
from backend.services import TicketSubmissionService

# Instantiate deduplication service coordinator
service = TicketSubmissionService()

# Load sample tickets
with open("Sample_Data/sample_input_tickets.json") as f:
    tickets = json.load(f)

# Submit tickets sequentially and observe return values (Ticket instance, is_duplicate)
for t in tickets:
    res, is_dup = service.submit_ticket(t)
    print(f"Code: {res.ticket_code} | Status: {res.status} | Is Duplicate: {is_dup}")
```
