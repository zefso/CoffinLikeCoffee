from datetime import date

from django import forms
from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import Place, Reservation
from .reservations import LEVEL_OFFERS, PACKAGES

PESEL_WEIGHTS = (1, 3, 7, 9, 1, 3, 7, 9, 1, 3)
PESEL_CENTURIES = {0: 1900, 1: 2000, 2: 2100, 3: 2200, 4: 1800}


def pesel_birth_date(pesel):
    """Sprawdza format, sumę kontrolną i datę; nie potwierdza tożsamości."""
    message = "Podaj poprawny numer PESEL."
    if len(pesel) != 11 or not pesel.isascii() or not pesel.isdigit():
        raise ValidationError(message)
    digits = [int(digit) for digit in pesel]
    total = sum(digit * weight for digit, weight in zip(digits, PESEL_WEIGHTS))
    if (10 - total % 10) % 10 != digits[10]:
        raise ValidationError(message)
    month = int(pesel[2:4])
    century = PESEL_CENTURIES.get(month // 20)
    try:
        born = date(century + int(pesel[:2]), month % 20, int(pesel[4:6]))
    except (TypeError, ValueError):
        raise ValidationError(message)
    if born > timezone.localdate():
        raise ValidationError(message)
    return born


def is_adult(born):
    today = timezone.localdate()
    before_birthday = (today.month, today.day) < (born.month, born.day)
    return today.year - born.year - before_birthday >= 18


class ReservationForm(forms.Form):
    level = forms.TypedChoiceField(
        choices=[(level, level) for level in LEVEL_OFFERS], coerce=int
    )
    package = forms.ChoiceField(choices=Reservation.Package.choices)
    kind = forms.ChoiceField(choices=Place._meta.get_field("kind").choices)
    capacity = forms.ChoiceField(choices=Place._meta.get_field("capacity").choices)
    reinforced = forms.BooleanField(required=False)
    sector = forms.CharField(required=False, max_length=8)
    row = forms.IntegerField(required=False, min_value=1)
    place = forms.IntegerField(required=False, min_value=1)
    first_name = forms.CharField(max_length=80)
    last_name = forms.CharField(max_length=80)
    email = forms.EmailField()
    phone = forms.RegexField(r"^\+?[0-9 ]{9,19}$", max_length=20)
    pesel = forms.CharField(max_length=11)
    for_self = forms.BooleanField(required=False)
    beneficiary_first_name = forms.CharField(required=False, max_length=80)
    beneficiary_last_name = forms.CharField(required=False, max_length=80)
    beneficiary_pesel = forms.CharField(required=False, max_length=11)

    def clean_pesel(self):
        pesel = self.cleaned_data["pesel"]
        if not is_adult(pesel_birth_date(pesel)):
            raise ValidationError("Rezerwacji może dokonać tylko osoba pełnoletnia.")
        return pesel

    def clean(self):
        data = super().clean()
        # PESEL służy tylko do walidacji i nie może trafić dalej.
        data.pop("pesel", None)
        beneficiary_pesel = data.pop("beneficiary_pesel", "")
        if data.get("package"):
            self.check_package(data)
        if data.get("for_self"):
            data["beneficiary_first_name"] = data.get("first_name", "")
            data["beneficiary_last_name"] = data.get("last_name", "")
            if data.get("kind") == "child":
                self.add_error(
                    "for_self", "Miejsce dziecięce nie może być rezerwacją dla siebie."
                )
        else:
            self.check_beneficiary(data, beneficiary_pesel)
        return data

    def check_package(self, data):
        allowed = PACKAGES[data["package"]]["fields"]
        for field in ("sector", "row", "place"):
            if field in self.errors:
                continue
            if field in allowed and not data.get(field):
                self.add_error(field, "Wybierz wartość dla tego pakietu.")
            elif field not in allowed and data.get(field):
                self.add_error(field, "Ten pakiet nie obejmuje takiego wyboru.")
        if data["package"] == "basic" and data.get("reinforced"):
            self.add_error(
                "reinforced", "Pakiet podstawowy obejmuje grunt standardowy."
            )
        if data["package"] == "place" and data.get("place"):
            self.check_place(data)

    def check_place(self, data):
        place = Place.objects.filter(pk=data["place"]).first()
        if (
            place is None
            or place.level != data.get("level")
            or place.kind != data.get("kind")
            or place.capacity != data.get("capacity")
        ):
            self.add_error("place", "To miejsce nie pasuje do Twojego wyboru.")
            return
        data["place"] = place
        data["reinforced"] = place.ground == "reinforced"

    def check_beneficiary(self, data, pesel):
        for field in ("beneficiary_first_name", "beneficiary_last_name"):
            if field not in self.errors and not data.get(field):
                self.add_error(field, "To pole jest wymagane.")
        if "beneficiary_pesel" in self.errors:
            return
        try:
            adult = is_adult(pesel_birth_date(pesel))
        except ValidationError as error:
            self.add_error("beneficiary_pesel", error)
            return
        if data.get("kind") and adult != (data["kind"] == "adult"):
            self.add_error(
                "beneficiary_pesel",
                "Wiek tej osoby nie pasuje do wybranego typu miejsca.",
            )
