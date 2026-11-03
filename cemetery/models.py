from django.db import models


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
