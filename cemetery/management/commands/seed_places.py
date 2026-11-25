from django.core.management.base import BaseCommand
from django.db import transaction
from cemetery.models import Place


class Command(BaseCommand):
    help = "Dodaje przykładowe miejsca na piętrach 0…−4; zachowuje istniejące dane."

    def add_arguments(self, parser):
        parser.add_argument(
            "--floors",
            nargs="+",
            type=int,
            choices=Place.Floor.values,
            default=Place.Floor.values,
            help="Piętra do uzupełnienia (domyślnie wszystkie).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        created = 0
        for floor in options["floors"]:
            created += self.seed_floor(floor)
        self.stdout.write(
            self.style.SUCCESS(f"Dodano {created} miejsc demonstracyjnych.")
        )

    def seed_floor(self, floor):
        created = 0
        for level, count in [(1, 128), (2, 84), (3, 56)]:
            for i in range(count):
                _, new = Place.objects.get_or_create(
                    floor=floor,
                    level=level,
                    sector=chr(65 + i // 32),
                    row=i % 32 // 8 + 1,
                    number=i % 8 + 1,
                    defaults={
                        "kind": "child" if i % 9 == 0 else "adult",
                        "capacity": ["single", "double", "family"][i % 3],
                        "ground": "reinforced" if i % 4 == 0 else "standard",
                        "status": (
                            "occupied"
                            if i % 7 == 0
                            else "reserved" if i % 5 == 0 else "available"
                        ),
                    },
                )
                created += new
        return created
