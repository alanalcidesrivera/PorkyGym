from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import (
    Usuario, Socio, Entrenador, Recepcionista, Administrador,
    PlanMembresia, Producto, CategoriaProducto, Venta
)

# Registra los modelos en el panel
admin.site.register(Usuario)
admin.site.register(Socio)
admin.site.register(Entrenador)
admin.site.register(Recepcionista)
admin.site.register(Administrador)
admin.site.register(PlanMembresia)
admin.site.register(Producto)
admin.site.register(CategoriaProducto)
admin.site.register(Venta)