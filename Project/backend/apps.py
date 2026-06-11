from django.apps import AppConfig
import os
import logging

logger = logging.getLogger(__name__)

class BackendConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'backend'

    def ready(self):
        # Trigger superuser auto-creation only if AUTO_CREATE_ADMIN environment variable is explicitly True
        auto_create = os.environ.get("AUTO_CREATE_ADMIN", "False")
        if auto_create.lower() == "true":
            from django.contrib.auth import get_user_model
            from django.db import connection
            
            User = get_user_model()
            username = "Admin_manager"
            email = "smvcreators43@gmail.com"
            password = "Admin@123"
            
            try:
                # Introspect table names to verify user table is created before querying
                db_tables = connection.introspection.table_names()
                if "backend_adminuser" in db_tables:
                    username_exists = User.objects.filter(username=username).exists()
                    email_exists = User.objects.filter(email=email).exists()
                    
                    if not username_exists and not email_exists:
                        logger.info(f"Auto-creating production superuser '{username}'...")
                        User.objects.create_superuser(
                            username=username,
                            email=email,
                            password=password
                        )
                        logger.info(f"Superuser '{username}' successfully created.")
                    else:
                        logger.info(f"Superuser '{username}' or email '{email}' already exists. Skipping auto-creation.")
                else:
                    logger.warning("Database tables not yet hydrated. Skipping superuser auto-creation.")
            except Exception as e:
                logger.error(f"Failed to check/create superuser '{username}' during app initialization: {e}")

