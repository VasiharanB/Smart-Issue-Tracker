from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import AdminUser, Category, TicketSupporter, Ticket, EmbeddingReference, TicketHistory

@admin.register(AdminUser)
class AdminUserAdmin(UserAdmin):
    list_display = ("id", "username", "email", "first_name", "last_name", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name")
    list_filter = ("is_staff", "is_superuser", "is_active")
    ordering = ("username",)

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "icon_name", "created_at")
    search_fields = ("name", "slug")
    ordering = ("name",)

@admin.register(TicketSupporter)
class TicketSupporterAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "tier", "is_available", "created_at")
    search_fields = ("user__username", "user__email", "user__first_name", "user__last_name")
    list_filter = ("tier", "is_available")
    ordering = ("user__username",)

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket_code", "first_name", "last_name", "category", "subject", "status", "created_at")
    search_fields = ("ticket_code", "first_name", "last_name", "subject", "description")
    list_filter = ("status", "category", "created_at")
    ordering = ("-created_at",)

@admin.register(EmbeddingReference)
class EmbeddingReferenceAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "model_name", "created_at")
    search_fields = ("ticket__ticket_code", "model_name")
    list_filter = ("model_name",)
    ordering = ("-created_at",)

@admin.register(TicketHistory)
class TicketHistoryAdmin(admin.ModelAdmin):
    list_display = ("id", "ticket", "action", "actor", "created_at")
    search_fields = ("ticket__ticket_code", "action", "notes")
    list_filter = ("action", "created_at")
    ordering = ("-created_at",)
