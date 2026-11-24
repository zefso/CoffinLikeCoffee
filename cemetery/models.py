from django.conf import settings
from django.db import models
from django.db.models import Q


class Place(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Wolne"
        RESERVED = "reserved", "Zarezerwowane"
        OCCUPIED = "occupied", "Zajęte"

    level = models.PositiveSmallIntegerField()
    sector = models.CharField(max_length=8)
    row = models.PositiveSmallIntegerField()
    number = models.PositiveSmallIntegerField()
    kind = models.CharField(
        max_length=10, choices=[("adult", "Dla dorosłych"), ("child", "Dla dzieci")]
    )
    capacity = models.CharField(
        max_length=10,
        choices=[
            ("single", "Jednoosobowe"),
            ("double", "Dwuosobowe"),
            ("family", "Rodzinne"),
        ],
    )
    ground = models.CharField(
        max_length=10,
        choices=[("standard", "Standardowy"), ("reinforced", "Wzmocniony")],
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.AVAILABLE
    )

    class Meta:
        ordering = ["level", "sector", "row", "number"]
        constraints = [
            models.UniqueConstraint(
                fields=["level", "sector", "row", "number"],
                name="unique_place_location",
            )
        ]

    @property
    def code(self):
        return f"{self.level}-{self.sector}-{self.row:02}-{self.number:02}"

    def __str__(self):
        return self.code


class Reservation(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Aktywna"
        CANCELLED = "cancelled", "Anulowana"

    class Package(models.TextChoices):
        BASIC = "basic", "Podstawowy"
        SECTOR = "sector", "Sektor"
        ROW = "row", "Rząd"
        PLACE = "place", "Wybrane miejsce"

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="reservations"
    )
    place = models.ForeignKey(
        Place, on_delete=models.PROTECT, related_name="reservations"
    )
    package = models.CharField(max_length=10, choices=Package.choices)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ACTIVE
    )
    # Cena z chwili rezerwacji; późniejsza zmiana cennika jej nie dotyczy.
    price = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    for_self = models.BooleanField(default=False)
    beneficiary_first_name = models.CharField(max_length=80)
    beneficiary_last_name = models.CharField(max_length=80)

    class Meta:
        ordering = ["-created_at", "-pk"]
        constraints = [
            models.UniqueConstraint(
                fields=["place"],
                condition=Q(status="active"),
                name="one_active_reservation_per_place",
            )
        ]

    def __str__(self):
        return f"{self.place.code} ({self.get_status_display()})"
