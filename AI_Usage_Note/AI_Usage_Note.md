# AI Usage & Collaboration Note

This document highlights the collaborative engineering process between the developers and AI assistants to build, test, and release the **Smart Issue Tracker** platform.

---

## 🛠️ AI Tools Utilized

* **Gemini 3.5 Flash / Gemini 1.5 Pro**: Assisted in backend system design, database configurations, verifier retries, documentation, and release testing setups.
* **GitHub Copilot**: Leveraged for writing boilerplate React UI layouts, state handlers, and Tailwind CSS styles.

---

## 💡 How AI Assisted Development

1. **Boilerplate and Structure**: Automatically generated the base configurations for the Django REST Framework API resources and initial Vite-React components.
2. **Algorithm Design**: Helped design the multi-tier duplicate classification pipeline (Rule A, B, C, D) merging local FAISS vector search with remote Gemini verification.
3. **Mockup and Data Generation**: Generated mock ticket entries, SQL schemas, and JSON data matrices for release testing checks.

---

## 🔧 AI-Generated Code Manually Corrected

While AI outputs provided strong blueprints, several modules required manual refactoring for correctness and robustness:

* **PyTorch CPU Warnings**: Auto-generated model loading scripts threw heavy CUDA/GPU missing warnings. Refactored `EmbeddingService` to explicitly target CPU allocations:
  ```python
  self.model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', device='cpu')
  ```
* **FAISS Index Concurrency**: AI-generated code wrote vector updates directly to files, causing file lock issues on concurrent requests. Added transactional database atomic wraps (`transaction.atomic()`) and synchronization locks to ensure FAISS file writes are serial and safe.
* **Recharts Graph Failures**: The dashboard charts crashed when databases returned empty arrays or categories with zero tickets. Handled data boundary states manually on the client-side to ensure graphs default to neutral coordinates rather than throwing errors.

---

## ⚡ Challenges Faced & Overcome

1. **Gemini API Network Failure**: External LLM calls are vulnerable to rate limits (429) or network time-outs.
   * *Resolution*: Implemented **Rule C (FAISS Fallback Duplicate)**, letting the backend catch all API exceptions and fallback to local FAISS cosine similarity values so ticket submissions never hang.
2. **FAISS Index Persistence**: Synchronizing memory vector indexes with disk files is error-prone.
   * *Resolution*: Configured `settings.py` with `FAISS_INDEX_PATH` to persist files inside `Project/`, keeping configurations portable across local directories.

---

## 🎯 Best Prompts Used

> *"Design a hybrid deduplication service in Python that runs a cosine similarity query on local FAISS vector representations. If the score is between 0.75 and 0.90, invoke Gemini AI using a structured JSON schema response to verify semantic equivalence, with a fallback mechanism if the API is rate-limited or fails."*

> *"Write a custom Django REST Framework session authentication validator that restricts admin operations, returning HTTP 403 Forbidden details on direct page calls, while maintaining permissive CORS handling for local frontend dev servers."*

---

## 🎓 Lessons Learned

* **Decoupled Fallback Design**: Relying entirely on external AI APIs introduces single points of failure. Designing localized fallback procedures (like local FAISS cosine scores) makes applications production-grade.
* **Pydantic Validation Enforcements**: Forcing LLM models to respond with structured JSON schemas (via Pydantic definitions) is critical. It eliminates text parsing errors and keeps database ingestion interfaces clean.
* **Local Embeddings Cost Efficiency**: Running vector embeddings locally on the CPU (using lightweight Sentence-Transformers) saves huge network costs and speeds up calculations to millisecond ranges.
