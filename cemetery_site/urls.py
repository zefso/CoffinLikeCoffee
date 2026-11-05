from django.contrib.auth.views import LoginView, LogoutView
from django.urls import include, path

urlpatterns = [
    path("", include("cemetery.urls")),
    path('logowanie/', LoginView.as_view(template_name='cemetery/login.html'), name='login'),
    path('wylogowanie/', LogoutView.as_view(next_page='/'), name='logout'),
]
