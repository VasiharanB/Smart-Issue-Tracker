from rest_framework.authentication import SessionAuthentication

class UnsafeSessionAuthentication(SessionAuthentication):
    """
    Custom session authentication class that disables CSRF enforcement.
    Useful for API-based authentication where CSRF tokens are not used or managed by the client.
    """
    def enforce_csrf(self, request):
        # Override to bypass CSRF token checks
        return
