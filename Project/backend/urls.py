from django.urls import path
from .views import (
    TicketCreateAPIView,
    TicketListAPIView,
    TicketDetailAPIView,
    CategoryListAPIView,
    CategoryDetailAPIView,
    AdminDashboardAPIView,
    TicketStatusUpdateAPIView,
    TrendingIssuesAPIView,
    AdminLoginAPIView,
    AdminLogoutAPIView,
    AdminMeAPIView,
    AdminHistoryAPIView
)

urlpatterns = [
    # Auth Endpoints
    path('auth/login', AdminLoginAPIView.as_view(), name='auth-login'),
    path('auth/logout', AdminLogoutAPIView.as_view(), name='auth-logout'),
    path('auth/me', AdminMeAPIView.as_view(), name='auth-me'),

    # Public & Generic Endpoints
    path('tickets/create', TicketCreateAPIView.as_view(), name='ticket-create'),
    path('tickets', TicketListAPIView.as_view(), name='ticket-list'),
    path('tickets/<str:id>', TicketDetailAPIView.as_view(), name='ticket-detail'),
    path('categories', CategoryListAPIView.as_view(), name='category-list'),
    path('categories/<int:pk>', CategoryDetailAPIView.as_view(), name='category-detail'),

    # Admin Operations
    path('admin/dashboard', AdminDashboardAPIView.as_view(), name='admin-dashboard'),
    path('admin/ticket/<int:id>/status', TicketStatusUpdateAPIView.as_view(), name='ticket-status-update'),
    path('admin/trending', TrendingIssuesAPIView.as_view(), name='admin-trending'),
    path('admin/history', AdminHistoryAPIView.as_view(), name='admin-history'),
]
