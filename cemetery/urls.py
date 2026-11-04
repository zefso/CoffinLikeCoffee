from django.urls import path

from .views import home
from . import map_views, reservation_views

urlpatterns = [
    path("", home, name="home"),
    path("mapa/", map_views.cemetery_map, name="map"),
    path("api/miejsca/", map_views.places, name="places"),
    path("api/miejsca/<int:pk>/", map_views.place_detail, name="place_detail"),
    path(
        "rezerwacje/nowa/",
        reservation_views.reservation_create,
        name="reservation_create",
    ),
    path("api/rezerwacje/", reservation_views.reservations_api, name="reservations"),
    path(
        "moje-rezerwacje/",
        reservation_views.my_reservations,
        name="my_reservations",
    ),
]
