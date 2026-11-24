from django.db import IntegrityError, transaction

from .models import Place, Reservation

# Kwoty demonstracyjne w zł, za prawo do miejsca na 20 lat.
LEVEL_OFFERS = {
    1: {
        "price": 3200,
        "benefits": [
            "Utrzymanie alejek i zieleni",
            "Sprzątanie miejsca 2 razy w roku",
        ],
    },
    2: {
        "price": 5800,
        "benefits": [
            "Sprzątanie miejsca co kwartał",
            "Oświetlone alejki i ławki",
            "Znicz i porządki przed 1 listopada",
        ],
    },
    3: {
        "price": 9500,
        "benefits": [
            "Sprzątanie co miesiąc ze zdjęciem po wizycie",
            "Kwiaty w rocznicę",
            "Osobisty opiekun miejsca",
            "Zadaszony dostęp bez schodów",
        ],
    },
}
PACKAGES = {
    "basic": {
        "fee": 0,
        "description": "Przydzielimy miejsce za Ciebie, na gruncie standardowym.",
        "fields": (),
    },
    "sector": {
        "fee": 400,
        "description": "Wybierasz sektor, a my dobieramy w nim miejsce.",
        "fields": ("sector",),
    },
    "row": {
        "fee": 800,
        "description": "Wybierasz sektor i rząd, a my dobieramy w nim miejsce.",
        "fields": ("sector", "row"),
    },
    "place": {
        "fee": 1500,
        "description": "Wybierasz konkretne miejsce na planie sektora.",
        "fields": ("place",),
    },
}
CAPACITY_FEES = {"single": 0, "double": 1800, "family": 3900}
REINFORCED_FEE = 2200


class ReservationConflict(Exception):
    pass


def calculate_price(level, package, kind, capacity, reinforced):
    # Miejsca dziecięce są bez dopłaty za pakiet.
    fee = 0 if kind == "child" else PACKAGES[package]["fee"]
    return (
        LEVEL_OFFERS[level]["price"]
        + fee
        + CAPACITY_FEES[capacity]
        + (REINFORCED_FEE if reinforced else 0)
    )


def create_reservation(
    customer,
    *,
    level,
    package,
    kind,
    capacity,
    reinforced=False,
    sector="",
    row=None,
    place=None,
    **contact,
):
    if place:
        candidates = Place.objects.filter(pk=place.pk)
    else:
        candidates = Place.objects.filter(
            level=level,
            kind=kind,
            capacity=capacity,
            ground="reinforced" if reinforced else "standard",
        ).order_by("?")
        if sector:
            candidates = candidates.filter(sector=sector)
        if row:
            candidates = candidates.filter(row=row)
    price = calculate_price(level, package, kind, capacity, reinforced)
    # SQLite ignoruje select_for_update, dlatego miejsce zajmuje warunkowy UPDATE.
    for pk in candidates.filter(status=Place.Status.AVAILABLE).values_list(
        "pk", flat=True
    ):
        try:
            with transaction.atomic():
                taken = Place.objects.filter(
                    pk=pk, status=Place.Status.AVAILABLE
                ).update(status=Place.Status.RESERVED)
                if taken:
                    return Reservation.objects.create(
                        customer=customer,
                        place_id=pk,
                        package=package,
                        price=price,
                        **contact,
                    )
        except IntegrityError:
            continue
    raise ReservationConflict(
        "To miejsce nie jest już wolne. Wybierz inne."
        if place
        else "Brak wolnych miejsc dla tego wyboru. Zmień wybór."
    )


def cancel_reservation(reservation):
    with transaction.atomic():
        cancelled = Reservation.objects.filter(
            pk=reservation.pk, status=Reservation.Status.ACTIVE
        ).update(status=Reservation.Status.CANCELLED)
        # Miejsce oznaczone jako zajęte pozostaje zajęte.
        if cancelled:
            Place.objects.filter(
                pk=reservation.place_id, status=Place.Status.RESERVED
            ).update(status=Place.Status.AVAILABLE)
    reservation.refresh_from_db()
