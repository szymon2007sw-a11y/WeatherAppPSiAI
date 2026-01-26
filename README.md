# WeatherApp

Szkolny projekt demonstracyjny: responsywny dashboard pogody z backendem w PHP (bez frameworkow) i frontendem w HTML/CSS/JS.

## Uruchomienie lokalne

1. Upewnij sie, ze masz PHP 8+.
2. W katalogu projektu uruchom:

```bash
php -S localhost:8000
```

3. Otworz w przegladarce:

```
http://localhost:8000/public/
```

## Funkcje

- Wyszukiwarka lokalizacji z lista wynikow (autocomplete po wpisaniu nazwy).
- Szybkie przyciski przykladowych miast.
- Ulubione lokalizacje zapisywane w `localStorage`.
- Aktualna pogoda, prognoza godzinowa (24h) i dzienna (7 dni).
- Przelacznik jednostek temperatury (C/F) i wiatru (km/h / m/s).
- Skeleton loading, animacje przejsc, layout dashboardowy.

## Wind Map (Prototype)

Sekcja **Wind Map Prototype** to szkic warstwy wiatru:
- Klikniecie na mapie pobiera dane wiatru dla wskazanych wspolrzednych.
- Na mapie pojawia sie kilka strzalek w poblizu punktu klikniecia.
- Warstwa jest oznaczona jako prototyp: **Wind layer (prototype)**.

## API i cache

Backend znajduje sie w `/api` i zwraca JSON w formacie:

```
{ "ok": true, "data": { ... } }
{ "ok": false, "error": "..." }
```

Cache plikowy (domyslnie 10 minut) zapisuje odpowiedzi w `/data`.

### Endpointy

- `GET /api/geocode.php?q=Warszawa`
- `GET /api/weather.php?lat=...&lon=...&name=...`

## Uwagi

Projekt jest zanonimizowany i nie zawiera danych osobowych ani podpisow.
