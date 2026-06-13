import os
import shutil
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from backend.models import Ticket, EmbeddingReference
from backend.ai.vector_store import FAISSVectorStore
from backend.ai.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Rebuilds the FAISS vector index from scratch by recomputing embeddings from the Ticket database."

    def handle(self, *args, **options):
        self.stdout.write("Starting FAISS index rebuild process...")
        
        index_path = getattr(settings, "FAISS_INDEX_PATH", "faiss_index.bin")
        backup_path = index_path + ".bak"
        backup_map_path = index_path + ".map.bak"
        map_path = index_path + ".map"
        
        # 1. Backup existing index files
        backed_up = False
        if os.path.exists(index_path):
            try:
                shutil.copy2(index_path, backup_path)
                if os.path.exists(map_path):
                    shutil.copy2(map_path, backup_map_path)
                self.stdout.write(self.style.SUCCESS(f"Successfully created backup at: {backup_path}"))
                backed_up = True
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Backup failed: {e}"))
        
        # 2. Create fresh index
        try:
            # We initialize a new/empty index store
            vector_store = FAISSVectorStore(dimension=384, index_file_path=index_path)
            vector_store.clear()  # Wipes existing files
            
            # Re-initialize to ensure a fresh clean state
            vector_store = FAISSVectorStore(dimension=384, index_file_path=index_path)
            self.stdout.write("Initialized a fresh, empty FAISS index.")
            
            # 3. Load UNIQUE Ticket records directly
            tickets = Ticket.objects.filter(status=Ticket.Status.UNIQUE).select_related('category')
            total_tickets = Ticket.objects.count()
            self.stdout.write(f"Found {tickets.count()} UNIQUE Ticket records to re-index.")
            
            # 4. Filter, recompute embeddings and reinsert
            embedding_service = EmbeddingService()
            added_count = 0
            
            for ticket in tickets:
                # Recompute embedding vector using Category, Subject, and Description payload format
                payload = f"Category: {ticket.category.name}\nSubject: {ticket.subject}\nDescription: {ticket.description}"
                
                try:
                    embedding = embedding_service.get_embedding(payload)
                    
                    # Update or create the EmbeddingReference table record
                    EmbeddingReference.objects.update_or_create(
                        ticket=ticket,
                        defaults={
                            "embedding": embedding,
                            "model_name": embedding_service.model_name
                        }
                    )
                    
                    # Add to FAISS index
                    vector_store.add_vector(ticket.id, embedding)
                    added_count += 1
                    
                    # Print in exact format:
                    # Added:
                    # ticket_id ticket_code
                    self.stdout.write("Added:")
                    self.stdout.write(f"{ticket.id} {ticket.ticket_code}")
                    self.stdout.write("")
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed to add ticket {ticket.ticket_code} (ID: {ticket.id}) to index: {e}"))
            
            final_faiss_count = vector_store.index.ntotal
            
            # Final required outputs:
            # Database tickets:
            # X
            # FAISS vectors:
            # Y
            self.stdout.write("Database tickets:")
            self.stdout.write(str(total_tickets))
            self.stdout.write("FAISS vectors:")
            self.stdout.write(str(final_faiss_count))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Rebuild process crashed: {e}"))
            if backed_up:
                self.stdout.write("Restoring from backup...")
                try:
                    if os.path.exists(backup_path):
                        shutil.copy2(backup_path, index_path)
                    if os.path.exists(backup_map_path):
                        shutil.copy2(backup_map_path, map_path)
                    self.stdout.write(self.style.SUCCESS("Successfully restored index from backup."))
                except Exception as restore_err:
                    self.stdout.write(self.style.ERROR(f"Failed to restore backup: {restore_err}"))
            raise e
