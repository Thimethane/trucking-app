from django.urls import path
from .views import TripPlanView, GeocodeView

urlpatterns = [
    path("plan/", TripPlanView.as_view(), name="trip-plan"),
    path("geocode/", GeocodeView.as_view(), name="geocode"),
]
