from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import (
    Usuario, Socio, Entrenador, Recepcionista, Administrador,
    PlanMembresia, Producto, CategoriaProducto, Venta,
    Ejercicio, Rutina, DetalleRutina, AsignacionRutina,
    HorarioEntrenador, Turno,
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

# --- CU17–CU20: módulo de entrenamiento ---
admin.site.register(Ejercicio)
admin.site.register(Turno)
admin.site.register(HorarioEntrenador)


@admin.register(Rutina)
class RutinaAdmin(admin.ModelAdmin):
    """Muestra el plan de ejercicios de cada rutina en línea."""

    list_display = ('id_rutina', 'nombre_rutina', 'nivel', 'estado')
    list_filter = ('nivel', 'estado')
    search_fields = ('nombre_rutina',)
    # Muestra cada ejercicio con sus series y repeticiones dentro del admin.
    class DetalleInline(admin.TabularInline):
        model = DetalleRutina
        extra = 1
    inlines = [DetalleInline]


@admin.register(AsignacionRutina)
class AsignacionRutinaAdmin(admin.ModelAdmin):
    list_display = ('id_asignacion_rutina', 'id_socio', 'id_rutina', 'fecha_asignacion', 'estado')
    list_filter = ('estado',)
    search_fields = ('id_socio__id_socio__username', 'id_rutina__nombre_rutina')