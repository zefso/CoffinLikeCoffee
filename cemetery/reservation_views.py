import json

from django.db import transaction
from django.contrib import messages
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_GET, require_POST

from .forms import ReservationForm
from .map_views import LEVELS
from .models import Place, Reservation
from .reservations import (
    CAPACITY_FEES,
    LEVEL_OFFERS,
    PACKAGES,
    REINFORCED_FEE,
    ReservationConflict,
    cancel_reservation,
    create_reservation,
)


def money(amount):
    return f"{amount:,}".replace(",", " ") + " zł"


@require_GET
def reservation_create(request):
    context = {
        "levels": [
            {
                "id": level,
                "name": LEVELS[level],
                "price": money(offer["price"]),
                "benefits": offer["benefits"],
            }
            for level, offer in LEVEL_OFFERS.items()
        ],
        "packages": [
            {
                "id": value,
                "name": label,
                "fee": money(PACKAGES[value]["fee"]),
                "description": PACKAGES[value]["description"],
            }
            for value, label in Reservation.Package.choices
        ],
        "kinds": Place._meta.get_field("kind").choices,
        "capacities": [
            {"id": value, "name": label, "fee": money(CAPACITY_FEES[value])}
            for value, label in Place._meta.get_field("capacity").choices
        ],
        "reinforced_fee": money(REINFORCED_FEE),
        "pricing": {
            "levels": {level: LEVEL_OFFERS[level]["price"] for level in LEVEL_OFFERS},
            "levelNames": LEVELS,
            "packages": {key: value["fee"] for key, value in PACKAGES.items()},
            "packageNames": dict(Reservation.Package.choices),
            "capacity": CAPACITY_FEES,
            "reinforced": REINFORCED_FEE,
        },
        "login_url": settings.LOGIN_URL,
    }
    return render(request, "cemetery/reservation_new.html", context)


@require_POST
def reservations_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Zaloguj się, aby zarezerwować."}, status=401)
    try:
        payload = json.loads(request.body)
    except ValueError:
        payload = None
    if not isinstance(payload, dict):
        return JsonResponse({"error": "Nieprawidłowe dane."}, status=400)
    form = ReservationForm(payload)
    if not form.is_valid():
        errors = form.errors.get_json_data()
        return JsonResponse(
            {"errors": {key: value[0]["message"] for key, value in errors.items()}},
            status=400,
        )
    try:
        reservation = create_reservation(request.user, **form.cleaned_data)
    except ReservationConflict as error:
        return JsonResponse({"error": str(error)}, status=409)
    response = JsonResponse(
        {
            "id": reservation.pk,
            "code": reservation.place.code,
            "price": reservation.price,
            "url": f"{reverse('my_reservations')}?nowa={reservation.pk}",
        },
        status=201,
    )
    response["Cache-Control"] = "no-store"
    return response


@login_required
@require_GET
def my_reservations(request):
    reservations = request.user.reservations.select_related("place")
    for reservation in reservations:
        reservation.level_name = LEVELS.get(reservation.place.level, "")
        reservation.benefits = LEVEL_OFFERS.get(reservation.place.level, {}).get(
            "benefits", []
        )
        reservation.price_label = money(reservation.price)
    return render(
        request,
        "cemetery/my_reservations.html",
        {
            "reservations": reservations,
            "new_id": request.GET.get("nowa", ""),
            "cancelled_id": request.GET.get("anulowana", ""),
        },
    )


@login_required
@require_POST
def reservation_cancel(request, pk):
    with transaction.atomic():
        reservation = get_object_or_404(
            Reservation.objects.select_for_update().select_related("place"),
            pk=pk,
        )

        # Підставте фактичне поле моделі Reservation замість "client" / "user"
        owner_id = (
            getattr(reservation, "user_id", None)
            or getattr(reservation, "client_id", None)
            or getattr(reservation, "owner_id", None)
        )
        is_staff = request.user.is_superuser or request.user.groups.filter(
            name__in=["Zarządca", "Administrator"]
        ).exists()

        if owner_id is not None and owner_id != request.user.id and not is_staff:
            messages.error(request, "Nie masz uprawnień do anulowania tej rezerwacji.")
            return redirect("my_reservations")

        place = reservation.place
        if hasattr(reservation, "status"):
            reservation.status = "cancelled"
            reservation.save(update_fields=["status"])
            has_other_active = (
                Reservation.objects.filter(place=place)
                .exclude(pk=reservation.pk)
                .exclude(status="cancelled")
                .exists()
            )
        else:
            reservation.delete()
            has_other_active = Reservation.objects.filter(place=place).exists()

        if place and not has_other_active and getattr(place, "status", None) != "occupied":
            place.status = "free"
            place.save(update_fields=["status"])

    messages.success(request, "Rezerwacja została anulowana.")
    return redirect("my_reservations")