import logging
from typing import Dict, Any, Tuple
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.conf import settings

from .models import Category, Ticket, TicketHistory, EmbeddingReference
from .ai.embedding_service import EmbeddingService
from .ai.vector_store import FAISSVectorStore
from .ai.gemini_verifier import GeminiVerifier

logger = logging.getLogger(__name__)


class TicketSubmissionService:
    """
    Service layer coordinator managing the ticket submission and deduplication workflow.
    
    Workflow:
      1. Generates text embedding using Sentence Transformers.
      2. Performs similarity search in FAISS.
      3. Verifies top matches using Gemini LLM.
      4. IF DUPLICATE: Increments supporter_count on the master ticket and returns it.
      5. IF UNIQUE: Creates a new ticket, stores the vector embedding in DB, and indexes it in FAISS.
    """
    def __init__(self, index_file_path: str = "faiss_index.bin"):
        self.embedding_service = EmbeddingService()
        self.vector_store = FAISSVectorStore(dimension=384, index_file_path=index_file_path)
        self.verifier = GeminiVerifier()
        
        self.confidence_threshold = getattr(settings, "DEDUPLICATION_CONFIDENCE_THRESHOLD", 80)
        self.similarity_threshold = getattr(settings, "DEDUPLICATION_SIMILARITY_THRESHOLD", 0.75)

    def submit_ticket(self, ticket_data: Dict[str, Any]) -> Tuple[Ticket, bool]:
        """
        Processes a support ticket submission.
        
        Args:
            ticket_data (Dict[str, Any]): Dictionary of input details containing:
                - first_name (str)
                - last_name (str)
                - category_slug (str)
                - subject (str)
                - description (str)
                
        Returns:
            Tuple[Ticket, bool]: A tuple containing (TicketInstance, is_duplicate).
                - TicketInstance: Either the updated existing master ticket OR the new ticket.
                - is_duplicate (bool): True if matched as duplicate, False if created as new.
        """
        category_slug = ticket_data.get("category_slug")
        subject = ticket_data.get("subject", "").strip()
        description = ticket_data.get("description", "").strip()

        # Resolve category
        try:
            category = Category.objects.get(slug=category_slug)
        except Category.DoesNotExist as e:
            logger.error(f"Cannot submit ticket. Category slug '{category_slug}' not found.")
            raise ValueError(f"Category slug '{category_slug}' does not exist.") from e

        # Construct search payload matching the model vector index format
        payload = f"Category: {category.name}\nSubject: {subject}\nDescription: {description}"

        # 1. Generate embedding vector
        try:
            embedding = self.embedding_service.get_embedding(payload)
        except Exception as e:
            logger.error(f"Failed to generate query embedding: {e}")
            raise RuntimeError("Deduplication failed due to vector generation error.") from e

        # 2. Query FAISS index for Top 5 similar tickets
        candidates = self.vector_store.search(embedding, top_k=5)
        logger.info(f"FAISS search retrieved {len(candidates)} similarity matches.")

        # 3. Find the best candidate that matches the category and is not already a duplicate
        best_candidate = None
        best_similarity = 0.0

        for candidate in candidates:
            ticket_id = candidate["ticket_id"]
            similarity = candidate["similarity"]

            try:
                existing_ticket = Ticket.objects.get(id=ticket_id)
            except Ticket.DoesNotExist:
                logger.warning(f"Ticket ID {ticket_id} cached in FAISS but missing in DB. Cleaning index...")
                self.vector_store.remove_ticket(ticket_id)
                continue

            # Skip comparing if candidate itself is marked as duplicate
            if existing_ticket.status == Ticket.Status.DUPLICATE:
                continue

            # Compare only within matching categories
            if existing_ticket.category != category:
                continue

            best_candidate = existing_ticket
            best_similarity = similarity
            break

        is_match = False
        confidence = 0
        reason = ""
        verification_source = "faiss_only"
        decision_flow = "FAISS Only"
        verification = None

        if best_candidate is not None:
            # Rule A: similarity >= 90% -> Auto Duplicate
            if best_similarity >= 0.90:
                is_match = True
                confidence = 100
                reason = f"Auto Duplicate: FAISS similarity score of {int(round(best_similarity * 100))}% met or exceeded 90%."
                decision_flow = "Auto Duplicate (90%+)"
                verification_source = "auto_duplicate"
                logger.info(f"Auto duplicate matched with {best_candidate.ticket_code} (Similarity: {best_similarity:.4f})")

            # Rule B & Rule C: similarity >= 75% and < 90%
            elif best_similarity >= 0.75:
                # Format compare package
                new_ticket_payload = {
                    "category": category.name,
                    "subject": subject,
                    "description": description
                }
                existing_ticket_payload = {
                    "category": best_candidate.category.name,
                    "subject": best_candidate.subject,
                    "description": best_candidate.description
                }

                # Determine if Gemini is enabled and should be used
                gemini_enabled = getattr(settings, "GEMINI_ENABLED", True)
                
                if gemini_enabled:
                    try:
                        logger.info(f"Verifying similarity with Gemini for candidate {best_candidate.ticket_code} (Similarity: {best_similarity:.4f})")
                        verification = self.verifier.verify(new_ticket_payload, existing_ticket_payload)
                    except Exception as e:
                        logger.exception("Gemini verification failed during call")
                        verification = {
                            "same_issue": False,
                            "confidence": 0,
                            "verification_source": "fallback",
                            "reason": f"Local catch fallback: {str(e)}"
                        }
                else:
                    logger.info("Gemini is disabled. Falling back to FAISS.")
                    verification = {
                        "same_issue": False,
                        "confidence": 0,
                        "verification_source": "fallback",
                        "reason": "Gemini verification disabled."
                    }

                # Evaluate Gemini result
                if verification:
                    v_source = verification.get("verification_source", "gemini")
                    if v_source == "fallback":
                        # Rule C: similarity >= 75% and Gemini fails -> FAISS Fallback Duplicate
                        is_match = True
                        confidence = int(round(best_similarity * 100))
                        decision_flow = "FAISS Fallback Duplicate"
                        verification_source = "faiss_fallback"
                        reason = f"FAISS Fallback Duplicate: Gemini failed/disabled. Used FAISS similarity of {confidence}%."
                        logger.info(f"FAISS Fallback duplicate matched with {best_candidate.ticket_code} (Similarity: {best_similarity:.4f})")
                    else:
                        # Rule B: Gemini available -> Gemini decides
                        decision_flow = "Gemini Verified"
                        verification_source = "gemini"
                        if verification.get("same_issue"):
                            gemini_conf = verification.get("confidence", 0)
                            if gemini_conf >= self.confidence_threshold:
                                is_match = True
                                confidence = gemini_conf
                                reason = verification.get("reason", "")
                            else:
                                is_match = False
                                reason = f"Gemini similarity confirmed, but confidence ({gemini_conf}%) below threshold ({self.confidence_threshold}%)."
                        else:
                            is_match = False
                            reason = verification.get("reason", "Gemini rejected similarity.")
            
            # Rule D: similarity < 75% -> Unique
            else:
                is_match = False
                decision_flow = "FAISS Only"
                verification_source = "faiss_only"
                reason = f"Similarity score of {int(round(best_similarity * 100))}% was below similarity threshold (75%)."
                logger.info(f"Ticket is unique. Candidate {best_candidate.ticket_code} similarity ({best_similarity:.4f}) below threshold.")
        else:
            # No candidate found in vector database
            is_match = False
            decision_flow = "FAISS Only"
            verification_source = "faiss_only"
            reason = "No comparison candidates found in vector search."

        # Print detailed decision flow logs
        logger.info(
            f"Deduplication decision details:\n"
            f"  - Ticket Code: {best_candidate.ticket_code if best_candidate else 'N/A'}\n"
            f"  - Similarity Score: {best_similarity:.4f}\n"
            f"  - Thresholds: Auto=0.90, Similarity=0.75, Gemini Confidence={self.confidence_threshold}%\n"
            f"  - Gemini Response: {verification if best_similarity >= 0.75 and best_similarity < 0.90 else 'Skipped'}\n"
            f"  - Final Decision: {'DUPLICATE' if is_match else 'UNIQUE'}\n"
            f"  - Verification Source: {verification_source}\n"
            f"  - Decision Flow: {decision_flow}"
        )

        if is_match and best_candidate is not None:
            # Match confirmed! Apply duplicate resolutions
            logger.info(f"Verified duplicate found: {best_candidate.ticket_code}. Confidence: {confidence}% (Source: {verification_source})")
            
            with transaction.atomic():
                # A. Increment supporter count on the existing master ticket using F expressions
                Ticket.objects.filter(pk=best_candidate.pk).update(
                    supporter_count=F('supporter_count') + 1,
                    updated_at=timezone.now()
                )
                best_candidate.refresh_from_db()
                
                # B. Create duplicate ticket in DB
                new_ticket = Ticket.objects.create(
                    first_name=ticket_data.get("first_name"),
                    last_name=ticket_data.get("last_name"),
                    category=category,
                    subject=subject,
                    description=description,
                    status=Ticket.Status.DUPLICATE,
                    parent_ticket=best_candidate,
                    supporter_count=1
                )
                
                # C. Record history on the new duplicate ticket
                TicketHistory.objects.create(
                    ticket=new_ticket,
                    action="DUPLICATE_REPORTED",
                    notes=reason or f"Duplicate of {best_candidate.ticket_code}.",
                    metadata={
                        "parent_ticket_code": best_candidate.ticket_code,
                        "similarity_score": best_similarity,
                        "decision_flow": decision_flow,
                        "verification_source": verification_source,
                        "reporter_first_name": ticket_data.get("first_name"),
                        "reporter_last_name": ticket_data.get("last_name"),
                        "reason": reason
                    }
                )

                # D. Log action history on the master ticket
                TicketHistory.objects.create(
                    ticket=best_candidate,
                    action="DUPLICATE_LINKED",
                    notes=f"Additional user ({ticket_data.get('first_name')} {ticket_data.get('last_name')}) reported this issue. Supporter count incremented to {best_candidate.supporter_count}.",
                    metadata={
                        "parent_ticket_code": best_candidate.ticket_code,
                        "similarity_score": best_similarity,
                        "decision_flow": decision_flow,
                        "verification_source": verification_source,
                        "reporter_first_name": ticket_data.get("first_name"),
                        "reporter_last_name": ticket_data.get("last_name"),
                        "reason": reason
                    }
                )
            
            return new_ticket, True

        # 4. If no duplicates are verified, create a new Ticket entry
        with transaction.atomic():
            # A. Save Ticket
            new_ticket = Ticket.objects.create(
                first_name=ticket_data.get("first_name"),
                last_name=ticket_data.get("last_name"),
                category=category,
                subject=subject,
                description=description,
                status=Ticket.Status.UNIQUE,
                supporter_count=1
            )
            
            # B. Store vector coordinates in PostgreSQL EmbeddingReference
            EmbeddingReference.objects.create(
                ticket=new_ticket,
                embedding=embedding,
                model_name=self.embedding_service.model_name
            )
            
            # C. Register vector coordinates in FAISS
            self.vector_store.add_vector(new_ticket.id, embedding)
            
            # D. Record audit history log
            TicketHistory.objects.create(
                ticket=new_ticket,
                action="INGESTION",
                notes=reason or "Verified as unique issue. Saved ticket and generated vector indexes.",
                metadata={
                    "similarity_score": best_similarity,
                    "decision_flow": decision_flow,
                    "verification_source": verification_source,
                    "reason": reason or "Verified as unique issue. Saved ticket and generated vector indexes."
                }
            )
            
        logger.info(f"Registered new unique ticket {new_ticket.ticket_code} in database and search index.")
        return new_ticket, False


