# WeatherApp

Szkolny projekt demonstracyjny: responsywny panel pogody z backendem w PHP (bez frameworkow) i frontendem w HTML/CSS/JS.

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

- Wyszukiwarka lokalizacji z lista wynikow (podpowiedzi po wpisaniu nazwy).
- Szybkie przyciski przykladowych miast.
- Ulubione lokalizacje zapisywane w `localStorage`.
- Aktualna pogoda, prognoza godzinowa (24h) i dzienna (7 dni).
- Przelacznik jednostek temperatury (C/F) i wiatru (km/h / m/s).
- Szkielet ladowania, animacje przejsc, uklad panelowy.

## Mapa wiatru (prototyp)
Sekcja **Mapa wiatru - prototyp** to szkic warstwy wiatru:
- Klikniecie na mapie pobiera dane wiatru dla wskazanych wspolrzednych.
- Na mapie pojawia sie kilka strzalek w poblizu punktu klikniecia.
- Warstwa jest oznaczona jako prototyp: **Warstwa wiatru (prototyp)**.

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

## Wykonawcy

- Szymon Wodziak
- Olaf Stanisz
- Tymek Kozka
