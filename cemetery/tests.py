from django.test import TestCase, override_settings
from django.core.management import call_command
from django.urls import path
from django.http import HttpResponse
from .models import Place
from .urls import urlpatterns as original_patterns

urlpatterns = [
    *original_patterns,
    path("rezerwacje/nowa/", lambda request: HttpResponse(), name="reservation_create"),
]


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
        self.assertContains(self.client.get("/mapa/"), 'data-booking=""')
        self.assertContains(self.client.get("/mapa/"), '<option value="1">')
        self.assertContains(self.client.get("/mapa/"), "<option>A</option>")
        p = Place.objects.first()
        self.assertEqual(
            self.client.get(f"/api/miejsca/{p.pk}/").json()["code"], p.code
        )

    @override_settings(ROOT_URLCONF="cemetery.tests")
    def test_reservation_integration(self):
        self.assertContains(
            self.client.get("/mapa/"), 'data-booking="/rezerwacje/nowa/"'
        )
