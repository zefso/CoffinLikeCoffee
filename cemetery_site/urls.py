from django.urls import include, path


urlpatterns = [
    path("", include("cemetery.urls")),
]
