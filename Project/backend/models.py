from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

# Standard imports



class AdminUser(AbstractUser):
    """
    Custom user model representing administrators and staff members in the system.
    This model serves as the core user model for system logins and overrides the default Django User model.
    """
    email = models.EmailField(_('email address'), unique=True)
    
    class Meta:
        verbose_name = _('Admin User')
        verbose_name_plural = _('Admin Users')

    def __str__(self):
        return self.username


class Category(models.Model):
    """
    Ticket categories (e.g., Authentication, Payment Issues, Email Problems).
    Maintains metadata and slug mapping for routing and metrics aggregation.
    """
    name = models.CharField(max_length=100, unique=True, verbose_name=_('Name'))
    slug = models.SlugField(max_length=100, unique=True, db_index=True, verbose_name=_('Slug'))
    icon_name = models.CharField(
        max_length=50, 
        help_text=_('Lucide icon identifier mapping to the frontend React layout'), 
        verbose_name=_('Icon Name')
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Created At'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Updated At'))

    class Meta:
        verbose_name = _('Category')
        verbose_name_plural = _('Categories')
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        from django.utils.text import slugify
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class TicketSupporter(models.Model):
    """
    Support agent profile linked to AdminUser.
    Maintains support tiers and availability metrics for automated ticket routing.
    """
    class Tier(models.TextChoices):
        TIER_1 = 'L1', _('Level 1 Support')
        TIER_2 = 'L2', _('Level 2 Support')
        TIER_3 = 'L3', _('Level 3 Support')

    user = models.OneToOneField(
        AdminUser,
        on_delete=models.CASCADE,
        related_name='supporter_profile',
        verbose_name=_('User')
    )
    tier = models.CharField(
        max_length=2,
        choices=Tier.choices,
        default=Tier.TIER_1,
        verbose_name=_('Support Tier')
    )
    is_available = models.BooleanField(default=True, verbose_name=_('Is Available'))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Created At'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Updated At'))

    class Meta:
        verbose_name = _('Ticket Supporter')
        verbose_name_plural = _('Ticket Supporters')

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} ({self.tier})"


class Ticket(models.Model):
    """
    Main ticket instance submitted by public users.
    Contains customer metadata, subject, issue details, assignment, and deduplication states.
    Supports hierarchical duplicate mapping pointing to unique master tickets.
    """
    class Status(models.TextChoices):
        UNIQUE = 'UNIQUE', _('Unique')
        DUPLICATE = 'DUPLICATE', _('Duplicate')
        PENDING_REVIEW = 'PENDING_REVIEW', _('Pending Review')

    ticket_code = models.CharField(
        max_length=20, 
        unique=True, 
        db_index=True, 
        editable=False, 
        verbose_name=_('Ticket Code')
    )
    first_name = models.CharField(max_length=100, verbose_name=_('First Name'))
    last_name = models.CharField(max_length=100, verbose_name=_('Last Name'))
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='tickets',
        verbose_name=_('Category')
    )
    subject = models.CharField(max_length=255, verbose_name=_('Subject'))
    description = models.TextField(verbose_name=_('Description'))
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UNIQUE,
        db_index=True,  # Added index for frequent status filtering (Unique/Duplicate)
        verbose_name=_('Status')
    )
    parent_ticket = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='duplicates',
        verbose_name=_('Parent Ticket'),
        help_text=_('Points to the original/master ticket if this ticket is identified as a duplicate')
    )
    assigned_supporter = models.ForeignKey(
        TicketSupporter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets',
        verbose_name=_('Assigned Supporter')
    )
    supporter_count = models.PositiveIntegerField(
        default=1,
        help_text=_('Number of customers/supporters who have reported or are linked to this issue'),
        verbose_name=_('Supporter Count')
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name=_('Created At'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Updated At'))

    class Meta:
        verbose_name = _('Ticket')
        verbose_name_plural = _('Tickets')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.ticket_code}: {self.subject[:30]}"

    def save(self, *args, **kwargs):
        """
        Auto-generates a clean sequential ticket code (e.g. T-8924) on initial save.
        """
        if not self.ticket_code:
            # Query the database to find the last created auto-incrementing ID 
            # and format the code starting from an offset (e.g. T-8000).
            try:
                last_ticket = Ticket.objects.order_by('id').last()
                next_id = (last_ticket.id + 1) if last_ticket else 1
            except Exception:
                import random
                next_id = random.randint(1, 999)
            
            self.ticket_code = f"T-{8000 + next_id}"
            
            # Defensive check to verify uniqueness in case IDs were deleted or customized
            while Ticket.objects.filter(ticket_code=self.ticket_code).exists():
                next_id += 1
                self.ticket_code = f"T-{8000 + next_id}"
                
        super().save(*args, **kwargs)

    @property
    def is_duplicate(self):
        return self.status == self.Status.DUPLICATE


class EmbeddingReference(models.Model):
    """
    Stores semantic vector embeddings for support tickets.
    """
    ticket = models.OneToOneField(
        Ticket,
        on_delete=models.CASCADE,
        related_name='embedding_ref',
        verbose_name=_('Ticket')
    )
    embedding = models.JSONField(
        help_text=_('High-dimensional float vector representing the combined subject and description text'),
        verbose_name=_('Vector Embedding')
    )
    model_name = models.CharField(
        max_length=100,
        default='sentence-transformers/all-MiniLM-L6-v2',
        help_text=_('Model specification used to generate this vector representation'),
        verbose_name=_('Embedding Model')
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Created At'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Updated At'))

    class Meta:
        verbose_name = _('Embedding Reference')
        verbose_name_plural = _('Embedding References')

    def __str__(self):
        return f"Embedding for {self.ticket.ticket_code} ({self.model_name})"


class TicketHistory(models.Model):
    """
    Audit log tracking transitions, AI verdicts, overrides, and agent comments.
    Includes a JSON metadata payload to archive vector similarity values and raw LLM justifications.
    """
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='history_logs',
        verbose_name=_('Ticket')
    )
    action = models.CharField(
        max_length=100,
        db_index=True,  # Added index for quick history audit trail queries
        help_text=_('Logged event name (e.g., INGESTED, MATCH_FOUND, VERDICT_OVERRIDDEN, CLOSED)'),
        verbose_name=_('Action')
    )
    actor = models.ForeignKey(
        AdminUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='action_history',
        verbose_name=_('Actor')
    )
    notes = models.TextField(blank=True, verbose_name=_('Notes'))
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text=_('Dynamic logging data storing LLM verdict logs, similarity score details, or historical diffs'),
        verbose_name=_('Metadata')
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name=_('Created At'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Updated At'))

    class Meta:
        verbose_name = _('Ticket History')
        verbose_name_plural = _('Ticket Histories')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.ticket.ticket_code} - {self.action} on {self.created_at.strftime('%Y-%m-%d %H:%M')}"
