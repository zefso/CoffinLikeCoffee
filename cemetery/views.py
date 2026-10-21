from django.shortcuts import render


def home(request):
    context = {
        "levels": [
            {
                "name": "Ogród Pamięci",
                "level": "Poziom 01",
                "description": "Cichy, pełen zieleni ogród dla tych, których wspominamy z najcieplejszym uśmiechem.",
                "spots": "128 miejsc",
                "accent": "sage",
                "icon": "✦",
            },
            {
                "name": "Taras Ciszy",
                "level": "Poziom 02",
                "description": "Przestrzeń światła i kamienia, z widokiem na spokojne alejki cmentarza.",
                "spots": "84 miejsca",
                "accent": "lavender",
                "icon": "◒",
            },
            {
                "name": "Galeria Wspomnień",
                "level": "Poziom 03",
                "description": "Kameralna galeria urn i pamiątek, zaprojektowana z myślą o rodzinnych historiach.",
                "spots": "56 miejsc",
                "accent": "ochre",
                "icon": "✺",
            },
        ],
        "stats": [
            {"value": "3", "label": "poziomy ciszy"},
            {"value": "268", "label": "miejsc pamięci"},
            {"value": "24/7", "label": "dostęp online"},
        ],
    }
    return render(request, "cemetery/home.html", context)
