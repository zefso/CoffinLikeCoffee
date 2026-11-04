import json
from datetime import date

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import Client, TestCase

from .forms import pesel_birth_date
from .models import Place, Reservation
from .reservations import (
    ReservationConflict,
    calculate_price,
    cancel_reservation,
    create_reservation,
)


class MapTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_places", verbosity=0)

    def test_seed_is_repeatable_and_preserves_status(self):
        p = Place.objects.first()
        p.status = "reserved"
        p.save()
        call_command("seed_places", verbosity=0)
        p.refresh_from_db()
        self.assertEqual(Place.objects.count(), 268)
        self.assertEqual(p.status, "reserved")

    def test_filters_combine_and_response_has_no_customer_data(self):
        response = self.client.get(
            "/api/miejsca/",
            {"level": 2, "sector": "A", "row": 2, "status": "available"},
        )
        self.assertEqual(response.status_code, 200)
        places = response.json()["places"]
        self.assertTrue(places)
        for p in places:
            self.assertEqual(
                (p["level"], p["sector"], p["row"], p["status"]),
                (2, "A", 2, "available"),
            )
            self.assertEqual(
                set(p),
                {
                    "id",
                    "code",
                    "level",
                    "level_name",
                    "sector",
                    "row",
                    "number",
                    "kind",
                    "capacity",
                    "ground",
                    "status",
                },
            )
        self.assertEqual(response.headers["Cache-Control"], "no-store")

    def test_validation_empty_and_readonly(self):
        for query in [
            {"level": "no"},
            {"row": "0"},
            {"level": "9" * 100},
            {"status": "bad"},
        ]:
            self.assertEqual(self.client.get("/api/miejsca/", query).status_code, 400)
        self.assertEqual(
            self.client.get("/api/miejsca/?sector=ZZ").json(), {"places": []}
        )
        self.assertEqual(self.client.post("/api/miejsca/").status_code, 405)
        self.assertEqual(self.client.get("/api/miejsca/999999/").status_code, 404)

    def test_pages_and_detail(self):
        self.assertContains(self.client.get("/"), "/mapa/")
        self.assertContains(self.client.get("/mapa/"), '<option value="1">')
        self.assertContains(self.client.get("/mapa/"), "<option>A</option>")
        p = Place.objects.first()
        self.assertEqual(
            self.client.get(f"/api/miejsca/{p.pk}/").json()["code"], p.code
        )

    def test_reservation_integration(self):
        self.assertContains(
            self.client.get("/mapa/"), 'data-booking="/rezerwacje/nowa/"'
        )


def make_pesel(year, month, day):
    """Generuje fikcyjny numer z poprawną sumą kontrolną."""
    offset = {18: 80, 19: 0, 20: 20}[year // 100]
    base = f"{year % 100:02}{month + offset:02}{day:02}1234"[:10]
    weights = (1, 3, 7, 9, 1, 3, 7, 9, 1, 3)
    total = sum(int(digit) * weight for digit, weight in zip(base, weights))
    return base + str((10 - total % 10) % 10)


ADULT_PESEL = make_pesel(1980, 5, 17)
CHILD_PESEL = make_pesel(date.today().year - 5, 3, 9)


class PricingAndPeselTests(TestCase):
    def test_price_adds_all_parts(self):
        self.assertEqual(calculate_price(1, "basic", "adult", "single", False), 3200)
        self.assertEqual(calculate_price(2, "row", "adult", "double", False), 8400)
        self.assertEqual(calculate_price(3, "place", "adult", "family", True), 17100)

    def test_child_pays_no_package_fee(self):
        self.assertEqual(calculate_price(1, "place", "child", "single", False), 3200)

    def test_pesel_validation(self):
        self.assertEqual(pesel_birth_date(ADULT_PESEL), date(1980, 5, 17))
        self.assertEqual(pesel_birth_date(make_pesel(2005, 12, 31)), date(2005, 12, 31))
        for value in [
            "123",
            "1234567890a",
            ADULT_PESEL[:-1] + str((int(ADULT_PESEL[-1]) + 1) % 10),
            make_pesel(1990, 2, 30),
            make_pesel(date.today().year + 1, 1, 1),
        ]:
            with self.assertRaises(ValidationError):
                pesel_birth_date(value)


class ReservationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_places", verbosity=0)
        cls.user = get_user_model().objects.create_user("klient", password="x")
        cls.other = get_user_model().objects.create_user("inny", password="x")

    def setUp(self):
        self.client.force_login(self.user)

    def data(self, **changes):
        data = {
            "kind": "adult",
            "capacity": "single",
            "level": 1,
            "package": "basic",
            "first_name": "Jan",
            "last_name": "Testowy",
            "email": "jan@example.com",
            "phone": "+48 500 600 700",
            "pesel": ADULT_PESEL,
            "for_self": True,
        }
        data.update(changes)
        return data

    def post(self, client=None, **changes):
        return (client or self.client).post(
            "/api/rezerwacje/",
            json.dumps(self.data(**changes)),
            content_type="application/json",
        )

    def free(self, **filters):
        return Place.objects.filter(status="available", **filters).first()

    def seat(self, place, **changes):
        return self.post(
            package="place",
            place=place.pk,
            level=place.level,
            kind=place.kind,
            capacity=place.capacity,
            **changes,
        )

    def direct(self, place, user=None):
        return Reservation.objects.create(
            customer=user or self.user,
            place=place,
            package="place",
            price=1,
            first_name="A",
            last_name="B",
            email="a@example.com",
            phone="500600700",
            beneficiary_first_name="A",
            beneficiary_last_name="B",
        )

    def test_basic_assigns_standard_matching_place(self):
        for _ in range(5):
            response = self.post()
            self.assertEqual(response.status_code, 201)
            reservation = Reservation.objects.get(pk=response.json()["id"])
            place = reservation.place
            self.assertEqual(
                (place.level, place.kind, place.capacity, place.ground, place.status),
                (1, "adult", "single", "standard", "reserved"),
            )
            self.assertEqual(reservation.price, 3200)
            self.assertEqual(reservation.customer, self.user)
            self.assertEqual(reservation.beneficiary_last_name, "Testowy")

    def test_basic_rejects_reinforced(self):
        response = self.post(reinforced=True)
        self.assertEqual(response.status_code, 400)
        self.assertIn("reinforced", response.json()["errors"])

    def test_sector_and_row_stay_in_scope_and_charge_reinforced(self):
        response = self.post(package="sector", sector="B", reinforced=True)
        self.assertEqual(response.status_code, 201)
        reservation = Reservation.objects.get(pk=response.json()["id"])
        self.assertEqual(
            (reservation.place.sector, reservation.place.ground),
            ("B", "reinforced"),
        )
        self.assertEqual(reservation.price, 3200 + 400 + 2200)
        target = self.free(level=1, kind="adult", capacity="double", ground="standard")
        response = self.post(
            package="row", capacity="double", sector=target.sector, row=target.row
        )
        self.assertEqual(response.status_code, 201)
        place = Reservation.objects.get(pk=response.json()["id"]).place
        self.assertEqual((place.sector, place.row), (target.sector, target.row))

    def test_selection_outside_package_is_rejected(self):
        place = self.free(level=1, kind="adult", capacity="single")
        for changes, field in [
            ({"sector": "A"}, "sector"),
            ({"row": 1}, "row"),
            ({"place": place.pk}, "place"),
            ({"package": "sector"}, "sector"),
            ({"package": "row", "sector": "A"}, "row"),
            ({"package": "place"}, "place"),
            ({"package": "sector", "sector": "A", "row": 1}, "row"),
        ]:
            response = self.post(**changes)
            self.assertEqual(response.status_code, 400, changes)
            self.assertIn(field, response.json()["errors"])
        self.assertFalse(Reservation.objects.exists())

    def test_adult_cannot_take_child_place(self):
        place = self.free(kind="child")
        response = self.post(
            package="place",
            place=place.pk,
            level=place.level,
            capacity=place.capacity,
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("place", response.json()["errors"])

    def test_auto_assignment_for_adult_never_uses_child_place(self):
        Place.objects.filter(kind="adult").update(status="occupied")
        self.assertEqual(self.post().status_code, 409)

    def test_place_charges_reinforced_from_the_place(self):
        place = self.free(level=1, kind="adult", capacity="single", ground="reinforced")
        response = self.seat(place)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["price"], 3200 + 1500 + 2200)

    def test_same_place_twice_gives_one_active_reservation(self):
        place = self.free(kind="adult", capacity="single")
        self.assertEqual(self.seat(place).status_code, 201)
        response = self.seat(place)
        self.assertEqual(response.status_code, 409)
        self.assertIn("error", response.json())
        self.assertEqual(Reservation.objects.filter(place=place).count(), 1)

    def test_lost_race_after_stale_read(self):
        place = self.free()
        stale = Place.objects.get(pk=place.pk)
        Place.objects.filter(pk=place.pk).update(status="reserved")
        with self.assertRaises(ReservationConflict):
            create_reservation(
                self.user,
                level=stale.level,
                package="place",
                kind=stale.kind,
                capacity=stale.capacity,
                place=stale,
            )

    def test_database_blocks_second_active_reservation(self):
        place = self.free()
        self.direct(place)
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.direct(place, self.other)

    def test_no_free_place_gives_conflict(self):
        Place.objects.update(status="occupied")
        self.assertEqual(self.post().status_code, 409)

    def test_cancel_frees_reserved_but_not_occupied(self):
        place = self.free()
        reservation = self.direct(place)
        Place.objects.filter(pk=place.pk).update(status="reserved")
        cancel_reservation(reservation)
        place.refresh_from_db()
        self.assertEqual(reservation.status, "cancelled")
        self.assertEqual(place.status, "available")
        self.direct(place)
        reservation = Reservation.objects.get(place=place, status="active")
        Place.objects.filter(pk=place.pk).update(status="occupied")
        cancel_reservation(reservation)
        place.refresh_from_db()
        self.assertEqual(place.status, "occupied")

    def test_beneficiary_data_is_required_and_saved(self):
        response = self.post(for_self=False)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            set(response.json()["errors"]),
            {
                "beneficiary_first_name",
                "beneficiary_last_name",
                "beneficiary_pesel",
            },
        )
        response = self.post(
            for_self=False,
            beneficiary_first_name="Anna",
            beneficiary_last_name="Nowak",
            beneficiary_pesel=ADULT_PESEL,
        )
        self.assertEqual(response.status_code, 201)
        reservation = Reservation.objects.get(pk=response.json()["id"])
        self.assertEqual(reservation.beneficiary_first_name, "Anna")
        self.assertFalse(reservation.for_self)

    def test_beneficiary_age_must_match_kind(self):
        child = {
            "for_self": False,
            "beneficiary_first_name": "Ola",
            "beneficiary_last_name": "Nowak",
        }
        response = self.post(beneficiary_pesel=CHILD_PESEL, **child)
        self.assertIn("beneficiary_pesel", response.json()["errors"])
        response = self.post(kind="child", beneficiary_pesel=ADULT_PESEL, **child)
        self.assertIn("beneficiary_pesel", response.json()["errors"])
        response = self.post(kind="child", beneficiary_pesel=CHILD_PESEL, **child)
        self.assertEqual(response.status_code, 201)

    def test_child_place_cannot_be_for_self(self):
        response = self.post(kind="child")
        self.assertIn("for_self", response.json()["errors"])

    def test_reserver_must_be_adult(self):
        response = self.post(pesel=CHILD_PESEL)
        self.assertIn("pesel", response.json()["errors"])

    def test_pesel_is_never_stored_or_returned(self):
        response = self.post()
        self.assertNotIn(ADULT_PESEL, response.content.decode())
        fields = {field.name for field in Reservation._meta.get_fields()}
        self.assertFalse([field for field in fields if "pesel" in field])
        page = self.client.get("/moje-rezerwacje/")
        self.assertNotContains(page, ADULT_PESEL)

    def test_invalid_json_and_contact_fields(self):
        for body in ["{", "[]", "1"]:
            response = self.client.post(
                "/api/rezerwacje/", body, content_type="application/json"
            )
            self.assertEqual(response.status_code, 400)
        response = self.post(email="zly", phone="abc", first_name="")
        self.assertEqual(
            set(response.json()["errors"]), {"email", "phone", "first_name"}
        )
        self.assertEqual(self.client.get("/api/rezerwacje/").status_code, 405)

    def test_customer_cannot_be_set_by_client(self):
        response = self.post(customer=self.other.pk)
        reservation = Reservation.objects.get(pk=response.json()["id"])
        self.assertEqual(reservation.customer, self.user)

    def test_price_cannot_be_set_by_client(self):
        response = self.post(price=1)
        self.assertEqual(response.json()["price"], 3200)

    def test_anonymous_gets_401_json(self):
        self.assertEqual(self.post(client=Client()).status_code, 401)
        self.assertFalse(Reservation.objects.exists())

    def test_csrf_is_required(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.user)
        self.assertEqual(self.post(client=client).status_code, 403)
        self.assertFalse(Reservation.objects.exists())

    def test_form_page_is_public_and_shows_login_step(self):
        response = Client().get("/rezerwacje/nowa/?miejsce=1")
        self.assertContains(response, "Zaloguj się, aby kontynuować")
        self.assertContains(self.client.get("/rezerwacje/nowa/"), 'name="pesel"')

    def test_my_reservations_show_only_own_data(self):
        mine = self.direct(self.free())
        theirs = self.direct(
            Place.objects.filter(status="available").exclude(pk=mine.place_id).first(),
            self.other,
        )
        response = self.client.get("/moje-rezerwacje/")
        self.assertContains(response, mine.place.code)
        self.assertNotContains(response, theirs.place.code)
        response = self.client.get(f"/moje-rezerwacje/?nowa={theirs.pk}")
        self.assertNotContains(response, "Rezerwacja została zapisana")
        response = self.client.get(f"/moje-rezerwacje/?nowa={mine.pk}")
        self.assertContains(response, "Rezerwacja została zapisana")

    def test_my_reservations_empty_and_anonymous(self):
        self.assertContains(
            self.client.get("/moje-rezerwacje/"), "Nie masz jeszcze żadnych rezerwacji"
        )
        response = Client().get("/moje-rezerwacje/")
        self.assertRedirects(
            response,
            "/logowanie/?next=/moje-rezerwacje/",
            fetch_redirect_response=False,
        )
