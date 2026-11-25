from django import forms
from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import Group, User
from django.db.models import Count
from django.shortcuts import redirect, render
from django.utils.http import url_has_allowed_host_and_scheme

from .models import Place


def home(request):
    counts = dict(Place.objects.values_list("level").annotate(total=Count("pk")))
    context = {
        "levels": [
            {
                "id": 1,
                "name": "Ogród Pamięci",
                "level": "Strefa 01",
                "description": "Cichy, pełen zieleni ogród dla tych, których wspominamy z najcieplejszym uśmiechem.",
                "spots": f"Liczba miejsc: {counts.get(1, 0)}",
                "accent": "sage",
                "icon": "✦",
            },
            {
                "id": 2,
                "name": "Taras Ciszy",
                "level": "Strefa 02",
                "description": "Przestrzeń światła i kamienia, z widokiem na spokojne alejki cmentarza.",
                "spots": f"Liczba miejsc: {counts.get(2, 0)}",
                "accent": "lavender",
                "icon": "◒",
            },
            {
                "id": 3,
                "name": "Galeria Wspomnień",
                "level": "Strefa 03",
                "description": "Kameralna galeria urn i pamiątek, zaprojektowana z myślą o rodzinnych historiach.",
                "spots": f"Liczba miejsc: {counts.get(3, 0)}",
                "accent": "ochre",
                "icon": "✺",
            },
        ],
        "stats": [
            {"value": len(counts), "label": "strefy pamięci"},
            {"value": sum(counts.values()), "label": "miejsc na wszystkich piętrach"},
            {"value": "24/7", "label": "dostęp online"},
        ],
    }
    return render(request, "cemetery/home.html", context)


class ClientRegistrationForm(UserCreationForm):
    email = forms.EmailField(
        label="Adres e-mail",
        required=True,
    )
    first_name = forms.CharField(
        label="Imię",
        max_length=150,
        required=True,
    )
    last_name = forms.CharField(
        label="Nazwisko",
        max_length=150,
        required=True,
    )

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username", "first_name", "last_name", "email")

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data["email"].strip()
        user.first_name = self.cleaned_data["first_name"].strip()
        user.last_name = self.cleaned_data["last_name"].strip()
        if commit:
            user.save()
            self.save_m2m()
        return user


def register(request):
    if request.user.is_authenticated:
        return redirect("my_reservations")

    if request.method == "POST":
        form = ClientRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            client_group, _ = Group.objects.get_or_create(name="Klient")
            user.groups.add(client_group)
            login(request, user)
            messages.success(request, "Konto zostało utworzone.")
            next_url = request.POST.get("next") or request.GET.get("next")
            if next_url and url_has_allowed_host_and_scheme(
                next_url,
                allowed_hosts={request.get_host()},
                require_https=request.is_secure(),
            ):
                return redirect(next_url)
            return redirect("my_reservations")
    else:
        form = ClientRegistrationForm()

    return render(request, "cemetery/register.html", {"form": form})
