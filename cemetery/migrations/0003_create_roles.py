from django.db import migrations

def create_roles(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    roles = ['Klient', 'Zarządca', 'Administrator']
    for role in roles:
        Group.objects.get_or_create(name=role)

def remove_roles(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    roles = ['Klient', 'Zarządca', 'Administrator']
    Group.objects.filter(name__in=roles).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('cemetery', '0002_reservation.py'),
    ]

    operations = [
        migrations.RunPython(create_roles, remove_roles),
    ]