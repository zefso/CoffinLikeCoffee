from django import forms
from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import Group, User
from django.shortcuts import redirect, render

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
            return redirect("my_reservations")
    else:
        form = ClientRegistrationForm()

    return render(request, "cemetery/register.html", {"form": form})