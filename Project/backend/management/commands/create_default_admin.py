from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import sys

class Command(BaseCommand):
    help = "Creates a default superuser Admin_manager if not already existing."

    def handle(self, *args, **options):
        User = get_user_model()
        username = "Admin_manager"
        email = "smvcreators43@gmail.com"
        password = "Admin@123"

        try:
            username_exists = User.objects.filter(username=username).exists()
            email_exists = User.objects.filter(email=email).exists()

            if not username_exists and not email_exists:
                self.stdout.write(self.style.WARNING(f"Auto-creating default superuser '{username}'..."))
                User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password
                )
                self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' successfully created."))
            else:
                self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' or email '{email}' already exists. Skipping creation."))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error checking/creating superuser '{username}': {e}"))
            sys.exit(1)
