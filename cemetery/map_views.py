from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.urls import NoReverseMatch, reverse
from django.views.decorators.http import require_GET
from .models import Place

LEVELS = {1: "Ogród Pamięci", 2: "Taras Ciszy", 3: "Galeria Wspomnień"}
FILTERS = ("level", "sector", "row", "kind", "capacity", "ground", "status")


def serialize(place):
    return {
        "id": place.pk,
        "code": place.code,
        "level": place.level,
        "level_name": LEVELS.get(place.level, str(place.level)),
        "sector": place.sector,
        "row": place.row,
        "number": place.number,
        "kind": place.kind,
        "capacity": place.capacity,
        "ground": place.ground,
        "status": place.status,
    }


@require_GET
def cemetery_map(request):
    # Viktor can expose this route name when the reservation module is ready.
    try:
        booking_url = reverse("reservation_create")
    except NoReverseMatch:
        booking_url = ""
    return render(request, "cemetery/map.html", {"booking_url": booking_url})


@require_GET
def places(request):
    queryset = Place.objects.all()
    for field in FILTERS:
        value = request.GET.get(field, "")
        if not value:
            continue
        if field in ("level", "row"):
            if (
                not value.isascii()
                or not value.isdigit()
                or not 1 <= int(value) <= 32767
            ):
                return JsonResponse(
                    {"error": f"Nieprawidłowy filtr: {field}"}, status=400
                )
            value = int(value)
        elif field != "sector" and value not in dict(
            Place._meta.get_field(field).choices
        ):
            return JsonResponse({"error": f"Nieprawidłowy filtr: {field}"}, status=400)
        queryset = queryset.filter(**{field: value})
    response = JsonResponse({"places": [serialize(p) for p in queryset]})
    response["Cache-Control"] = "no-store"
    return response


@require_GET
def place_detail(request, pk):
    response = JsonResponse(serialize(get_object_or_404(Place, pk=pk)))
    response["Cache-Control"] = "no-store"
    return response
