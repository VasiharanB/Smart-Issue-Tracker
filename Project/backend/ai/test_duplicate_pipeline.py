import os
import sys
import django
import unittest
from unittest.mock import patch, MagicMock

# Add project root to python path to prevent import errors
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Setup Django context
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_issue_tracker.settings')
django.setup()

from backend.models import Category, Ticket, TicketHistory
from backend.services import TicketSubmissionService

class DuplicateDetectionPipelineTest(unittest.TestCase):
    def setUp(self):
        # Clean up database tables for testing in transactions
        TicketHistory.objects.all().delete()
        Ticket.objects.all().delete()
        Category.objects.all().delete()
        
        self.category = Category.objects.create(name="Authentication", slug="authentication")
        self.service = TicketSubmissionService()

    @patch('backend.services.EmbeddingService.get_embedding')
    @patch('backend.services.FAISSVectorStore.search')
    def test_scenario_a_completely_different_issue(self, mock_search, mock_get_embedding):
        # Scenario A: Similarity is < 0.75 (e.g. 0.40)
        mock_get_embedding.return_value = [0.1] * 384
        mock_search.return_value = [{"ticket_id": 9999, "similarity": 0.40}] # Below threshold

        ticket_data = {
            "first_name": "John",
            "last_name": "Doe",
            "category_slug": "authentication",
            "subject": "Reset Password",
            "description": "I need to reset my password."
        }

        ticket, is_duplicate = self.service.submit_ticket(ticket_data)
        
        self.assertFalse(is_duplicate)
        self.assertEqual(Ticket.objects.count(), 1)
        self.assertEqual(ticket.status, Ticket.Status.UNIQUE)
        
        # Check history
        history = TicketHistory.objects.filter(ticket=ticket).first()
        self.assertEqual(history.action, "INGESTION")
        self.assertEqual(history.metadata.get("decision_flow"), "FAISS Only")
        self.assertEqual(history.metadata.get("verification_source"), "faiss_only")

    @patch('backend.services.EmbeddingService.get_embedding')
    @patch('backend.services.FAISSVectorStore.search')
    @patch('backend.services.GeminiVerifier.verify')
    def test_scenario_b_similar_issue_requires_gemini(self, mock_verify, mock_search, mock_get_embedding):
        # Scenario B: Similarity in [0.75, 0.90) (e.g. 0.82)
        # Create master ticket first
        master = Ticket.objects.create(
            first_name="Admin",
            last_name="User",
            category=self.category,
            subject="Login Failed",
            description="Cannot log in.",
            status=Ticket.Status.UNIQUE,
            supporter_count=1
        )
        
        mock_get_embedding.return_value = [0.1] * 384
        mock_search.return_value = [{"ticket_id": master.id, "similarity": 0.82}]
        mock_verify.return_value = {
            "same_issue": True,
            "confidence": 95,
            "verification_source": "gemini",
            "reason": "Both describe inability to log in."
        }

        ticket_data = {
            "first_name": "Jane",
            "last_name": "Smith",
            "category_slug": "authentication",
            "subject": "Sign In Error",
            "description": "Getting error when signing in."
        }

        ticket, is_duplicate = self.service.submit_ticket(ticket_data)
        
        self.assertTrue(is_duplicate)
        self.assertEqual(ticket.parent_ticket.id, master.id)
        self.assertEqual(ticket.status, Ticket.Status.DUPLICATE)
        
        master.refresh_from_db()
        self.assertEqual(master.supporter_count, 2)
        
        # Check history on duplicate ticket
        history = TicketHistory.objects.filter(ticket=ticket, action="DUPLICATE_REPORTED").first()
        self.assertIsNotNone(history)
        self.assertEqual(history.metadata.get("decision_flow"), "Gemini Verified")
        self.assertEqual(history.metadata.get("verification_source"), "gemini")

    @patch('backend.services.EmbeddingService.get_embedding')
    @patch('backend.services.FAISSVectorStore.search')
    @patch('backend.services.GeminiVerifier.verify')
    def test_scenario_c_auto_duplicate(self, mock_verify, mock_search, mock_get_embedding):
        # Scenario C: Similarity >= 0.90 (e.g. 0.95) -> Gemini should NOT be called
        master = Ticket.objects.create(
            first_name="Admin",
            last_name="User",
            category=self.category,
            subject="Login Failed",
            description="Cannot log in.",
            status=Ticket.Status.UNIQUE,
            supporter_count=1
        )
        
        mock_get_embedding.return_value = [0.1] * 384
        mock_search.return_value = [{"ticket_id": master.id, "similarity": 0.95}]

        ticket_data = {
            "first_name": "Bob",
            "last_name": "Johnson",
            "category_slug": "authentication",
            "subject": "Login Failed",
            "description": "Cannot log in."
        }

        ticket, is_duplicate = self.service.submit_ticket(ticket_data)
        
        self.assertTrue(is_duplicate)
        self.assertEqual(ticket.parent_ticket.id, master.id)
        self.assertEqual(ticket.status, Ticket.Status.DUPLICATE)
        mock_verify.assert_not_called()
        
        master.refresh_from_db()
        self.assertEqual(master.supporter_count, 2)
        
        history = TicketHistory.objects.filter(ticket=ticket, action="DUPLICATE_REPORTED").first()
        self.assertEqual(history.metadata.get("decision_flow"), "Auto Duplicate (90%+)")
        self.assertEqual(history.metadata.get("verification_source"), "auto_duplicate")

    @patch('backend.services.EmbeddingService.get_embedding')
    @patch('backend.services.FAISSVectorStore.search')
    @patch('backend.services.GeminiVerifier.verify')
    def test_scenario_d_gemini_unavailable(self, mock_verify, mock_search, mock_get_embedding):
        # Scenario D: Similarity in [0.75, 0.90) but Gemini throws an exception or fails
        master = Ticket.objects.create(
            first_name="Admin",
            last_name="User",
            category=self.category,
            subject="Login Failed",
            description="Cannot log in.",
            status=Ticket.Status.UNIQUE,
            supporter_count=1
        )
        
        mock_get_embedding.return_value = [0.1] * 384
        mock_search.return_value = [{"ticket_id": master.id, "similarity": 0.85}]
        # verify fails
        mock_verify.side_effect = Exception("API Quota exceeded / Timeout")

        ticket_data = {
            "first_name": "Alice",
            "last_name": "Williams",
            "category_slug": "authentication",
            "subject": "Login Problem",
            "description": "Login fails."
        }

        ticket, is_duplicate = self.service.submit_ticket(ticket_data)
        
        self.assertTrue(is_duplicate)
        self.assertEqual(ticket.parent_ticket.id, master.id)
        self.assertEqual(ticket.status, Ticket.Status.DUPLICATE)
        
        master.refresh_from_db()
        self.assertEqual(master.supporter_count, 2)
        
        history = TicketHistory.objects.filter(ticket=ticket, action="DUPLICATE_REPORTED").first()
        self.assertEqual(history.metadata.get("decision_flow"), "FAISS Fallback Duplicate")
        self.assertEqual(history.metadata.get("verification_source"), "faiss_fallback")

if __name__ == "__main__":
    unittest.main()
