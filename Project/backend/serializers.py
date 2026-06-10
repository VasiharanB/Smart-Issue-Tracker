from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from .models import Category, Ticket, TicketSupporter, AdminUser, TicketHistory

class AdminUserSerializer(serializers.ModelSerializer):
    """
    Serializes user details for administrative responses.
    """
    class Meta:
        model = AdminUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class TicketSupporterSerializer(serializers.ModelSerializer):
    """
    Serializes support agent tier and profile details.
    """
    user = AdminUserSerializer(read_only=True)
    tier_label = serializers.CharField(source='get_tier_display', read_only=True)

    class Meta:
        model = TicketSupporter
        fields = ['id', 'user', 'tier', 'tier_label', 'is_available']


class CategorySerializer(serializers.ModelSerializer):
    """
    Serializes ticket categories. Supports dynamic database annotations 
    such as ticket count, duplicate count, and duplication rate.
    """
    ticket_count = serializers.IntegerField(read_only=True, default=0)
    duplicate_count = serializers.IntegerField(read_only=True, default=0)
    duplication_rate = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'icon_name', 
            'ticket_count', 'duplicate_count', 'duplication_rate',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['slug']

    def get_duplication_rate(self, obj) -> int:
        # Calculates category-level duplication rate percentage
        ticket_count = getattr(obj, 'ticket_count', 0)
        duplicate_count = getattr(obj, 'duplicate_count', 0)
        if ticket_count == 0:
            return 0
        return int(round((duplicate_count / ticket_count) * 100))


class TicketHistorySerializer(serializers.ModelSerializer):
    """
    Serializes logs from the ticket audit history.
    """
    actor_username = serializers.CharField(source='actor.username', read_only=True, default=None)

    class Meta:
        model = TicketHistory
        fields = ['id', 'action', 'actor_username', 'notes', 'metadata', 'created_at']


class TicketCreateSerializer(serializers.ModelSerializer):
    """
    Serializer optimized for ticket submission.
    Accepts category slug in write operations instead of database PK values.
    """
    category_slug = serializers.SlugField(write_only=True)

    class Meta:
        model = Ticket
        fields = ['first_name', 'last_name', 'category_slug', 'subject', 'description']

    def validate_category_slug(self, value):
        if not Category.objects.filter(slug=value).exists():
            raise serializers.ValidationError(_("Provided category slug does not exist."))
        return value

    def create(self, validated_data):
        category_slug = validated_data.pop('category_slug')
        category = Category.objects.get(slug=category_slug)
        validated_data['category'] = category
        return super().create(validated_data)


class TicketListSerializer(serializers.ModelSerializer):
    """
    Simplified ticket representation tailored for dashboard grids and list tables.
    """
    category_name = serializers.CharField(source='category.name', read_only=True)
    parent_ticket_code = serializers.CharField(source='parent_ticket.ticket_code', read_only=True, default=None)

    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_code', 'first_name', 'last_name', 
            'category_name', 'subject', 'status', 'parent_ticket_code', 
            'created_at'
        ]


class TicketDetailSerializer(serializers.ModelSerializer):
    """
    Detailed ticket representation mapping all dependencies, historical logs, 
    and sibling duplicate tickets.
    """
    category = CategorySerializer(read_only=True)
    assigned_supporter = TicketSupporterSerializer(read_only=True)
    history_logs = TicketHistorySerializer(many=True, read_only=True)
    duplicates = serializers.SerializerMethodField()
    parent_ticket_code = serializers.CharField(source='parent_ticket.ticket_code', read_only=True, default=None)

    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_code', 'first_name', 'last_name', 'category', 'subject', 
            'description', 'status', 'parent_ticket_code', 'assigned_supporter', 
            'history_logs', 'duplicates', 'created_at', 'updated_at'
        ]

    def get_duplicates(self, obj) -> list[dict]:
        """
        Retrieves matching sub-tickets linked to this ticket if it is a unique master ticket.
        """
        if obj.status == Ticket.Status.UNIQUE:
            # Query active duplicates referencing this primary ticket
            dupes = obj.duplicates.all()
            return [
                {
                    "id": d.id, 
                    "ticket_code": d.ticket_code, 
                    "subject": d.subject, 
                    "created_at": d.created_at
                } 
                for d in dupes
            ]
        return []


class AdminHistorySerializer(serializers.ModelSerializer):
    newTicket = serializers.SerializerMethodField()
    matchedTicket = serializers.SerializerMethodField()
    score = serializers.SerializerMethodField()
    verdict = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    reasoning = serializers.SerializerMethodField()
    decision_flow = serializers.SerializerMethodField()

    class Meta:
        model = TicketHistory
        fields = ['id', 'newTicket', 'matchedTicket', 'score', 'verdict', 'date', 'reasoning', 'decision_flow']

    def get_newTicket(self, obj):
        if obj.ticket.status == Ticket.Status.DUPLICATE:
            return obj.ticket.ticket_code
        if obj.action == "DUPLICATE_REPORTED":
            first_name = obj.metadata.get('reporter_first_name', '')
            last_name = obj.metadata.get('reporter_last_name', '')
            return f"Rep: {first_name} {last_name}".strip() or "Duplicate Report"
        return obj.ticket.ticket_code

    def get_matchedTicket(self, obj):
        if obj.ticket.status == Ticket.Status.DUPLICATE and obj.ticket.parent_ticket:
            return obj.ticket.parent_ticket.ticket_code
        if obj.metadata and 'parent_ticket_code' in obj.metadata:
            return obj.metadata.get('parent_ticket_code')
        if obj.action == "DUPLICATE_REPORTED":
            return obj.ticket.ticket_code
        return None

    def get_score(self, obj):
        if obj.metadata and 'similarity_score' in obj.metadata:
            score_val = obj.metadata.get('similarity_score')
            if score_val is not None:
                return f"{int(round(float(score_val) * 100))}%"
        if obj.action == "MANUAL_OVERRIDE_DUPLICATE":
            return "100%"
        return None

    def get_verdict(self, obj):
        if obj.ticket.status == Ticket.Status.DUPLICATE or obj.action in ["DUPLICATE_REPORTED", "MANUAL_OVERRIDE_DUPLICATE"]:
            return "Confirmed"
        return "Rejected"

    def get_date(self, obj):
        return obj.created_at.strftime("%b %d, %Y")

    def get_reasoning(self, obj):
        if obj.action == "DUPLICATE_REPORTED":
            return obj.metadata.get('reason', obj.notes)
        return obj.notes

    def get_decision_flow(self, obj):
        if obj.metadata and 'decision_flow' in obj.metadata:
            return obj.metadata['decision_flow']
        # Fallback values for old records
        if obj.action == "INGESTION":
            return "FAISS Only"
        elif obj.action == "DUPLICATE_REPORTED":
            return "Gemini Verified"
        elif obj.action == "MANUAL_OVERRIDE_DUPLICATE":
            return "Auto Duplicate (90%+)"
        return "FAISS Only"


