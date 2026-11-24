from functools import wraps
from django.contrib.auth.decorators import user_passes_test
from django.http import JsonResponse


def is_manager(user):
    return user.is_authenticated and (
        user.is_superuser
        or user.groups.filter(name__in=["Zarządca", "Administrator"]).exists()
    )


def is_admin(user):
    return user.is_authenticated and (
        user.is_superuser or user.groups.filter(name="Administrator").exists()
    )


manager_required = user_passes_test(is_manager)
admin_required = user_passes_test(is_admin)


def api_manager_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not is_manager(request.user):
            return JsonResponse({"error": "Brak uprawnień zarządcy."}, status=403)
        return view_func(request, *args, **kwargs)

    return wrapper


def api_admin_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not is_admin(request.user):
            return JsonResponse(
                {"error": "Brak uprawnień administratora."}, status=403
            )
        return view_func(request, *args, **kwargs)

    return wrapper