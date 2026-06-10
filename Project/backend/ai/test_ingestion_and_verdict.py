import os
import django

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_issue_tracker.settings')
django.setup()

from backend.models import Category, Ticket, TicketHistory
from backend.services import TicketSubmissionService

# 1. Clear existing tickets to start clean
TicketHistory.objects.all().delete()
Ticket.objects.all().delete()

# Make sure FAISS index is cleared
service = TicketSubmissionService()
service.vector_store.clear()

category = Category.objects.get(slug='authentication')

tickets_data = [
    {
        "first_name": "User",
        "last_name": "One",
        "category_slug": "authentication",
        "subject": "Login Failed",
        "description": "I cannot login to my account after password reset."
    },
    {
        "first_name": "User",
        "last_name": "Two",
        "category_slug": "authentication",
        "subject": "Login Problem",
        "description": "Unable to login to my account after changing password."
    },
    {
        "first_name": "User",
        "last_name": "Three",
        "category_slug": "authentication",
        "subject": "unable to login",
        "description": "I am unable to login to the system."
    },
    {
        "first_name": "User",
        "last_name": "Four",
        "category_slug": "authentication",
        "subject": "login error",
        "description": "I get an error while logging in."
    }
]

for idx, data in enumerate(tickets_data):
    ticket, is_duplicate = service.submit_ticket(data)
    print(f"Ingested Ticket {idx+1}: {ticket.ticket_code} (Status: {ticket.status}, Parent: {ticket.parent_ticket.ticket_code if ticket.parent_ticket else 'None'})")

print("\nTICKETS:")
for t in Ticket.objects.all().order_by('id'):
    print(f"ID: {t.id} | Code: {t.ticket_code} | Subject: {t.subject} | Status: {t.status} | Parent: {t.parent_ticket.ticket_code if t.parent_ticket else 'None'} | Supporter Count: {t.supporter_count}")

print("\nHISTORY:")
for h in TicketHistory.objects.all().order_by('id'):
    print(f"Ticket: {h.ticket.ticket_code} | Action: {h.action} | Flow: {h.metadata.get('decision_flow')} | Score: {h.metadata.get('similarity_score')}")
