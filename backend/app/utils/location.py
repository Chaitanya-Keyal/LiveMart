import math
from collections.abc import Iterable

EARTH_RADIUS_KM = 6371.0088


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two points on Earth in kilometers.

    Uses the Haversine formula with inputs in decimal degrees.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def latlon_bounding_box(
    lat: float, lon: float, radius_km: float
) -> tuple[float, float, float, float]:
    """Return (min_lat, max_lat, min_lon, max_lon) for a radius around a point.

    Approximates using degrees: 1° latitude ≈ 111 km; longitude depends on latitude.
    Ensures outputs are clamped to valid world bounds and handles very large radii.
    """
    # Clamp deltas to world bounds
    d_lat = min(abs(radius_km) / 111.0, 90.0)

    # Avoid division by zero at poles; when denominator ~0, treat as spanning entire longitude
    denom = 111.320 * math.cos(math.radians(lat))
    if abs(denom) < 1e-9:
        d_lon = 180.0
    else:
        d_lon = min(abs(radius_km) / denom, 180.0)

    # If longitude span covers globe, return full longitude range
    if d_lon >= 180.0 or d_lat >= 90.0:
        return (-90.0, 90.0, -180.0, 180.0)

    min_lat = max(-90.0, lat - d_lat)
    max_lat = min(90.0, lat + d_lat)
    min_lon = lon - d_lon
    max_lon = lon + d_lon

    # Normalize to [-180, 180] without producing inverted ranges
    if min_lon < -180.0:
        min_lon = -180.0
    if max_lon > 180.0:
        max_lon = 180.0

    return (min_lat, max_lat, min_lon, max_lon)


def annotate_distances(
    items: Iterable[tuple[object, float | None, float | None]],
    origin_lat: float,
    origin_lon: float,
) -> list[tuple[object, float | None]]:
    """Given an iterable of (item, lat, lon), return list of (item, distance_km).

    If lat/lon is missing, distance is None.
    """
    out: list[tuple[object, float | None]] = []
    for item, lat, lon in items:
        if lat is None or lon is None:
            out.append((item, None))
        else:
            out.append((item, haversine_km(origin_lat, origin_lon, lat, lon)))
    return out
