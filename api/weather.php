<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cache.php';

handle_preflight();

$lat = filter_var($_GET['lat'] ?? null, FILTER_VALIDATE_FLOAT);
$lon = filter_var($_GET['lon'] ?? null, FILTER_VALIDATE_FLOAT);

if ($lat === false || $lon === false) {
    send_json(['ok' => false, 'error' => 'Invalid coordinates.'], 400);
}

if ($lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) {
    send_json(['ok' => false, 'error' => 'Coordinates out of range.'], 400);
}

$name = trim((string)($_GET['name'] ?? ''));
if ($name !== '' && mb_strlen($name) > 80) {
    send_json(['ok' => false, 'error' => 'Location name is too long.'], 400);
}

$cacheKey = 'weather_' . md5(sprintf('%.4f_%.4f', $lat, $lon));
$cached = cache_get($cacheKey);
if ($cached !== null) {
    send_json(['ok' => true, 'data' => $cached, 'cached' => true]);
}

$params = [
    'latitude' => $lat,
    'longitude' => $lon,
    'current' => 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,visibility,weather_code',
    'hourly' => 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,cloud_cover,pressure_msl,visibility,wind_speed_10m,wind_direction_10m',
    'daily' => 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,weather_code',
    'forecast_days' => 7,
    'forecast_hours' => 24,
    'temperature_unit' => 'celsius',
    'windspeed_unit' => 'kmh',
    'precipitation_unit' => 'mm',
    'timezone' => 'auto',
    'timeformat' => 'iso8601',
];

$result = fetch_remote_json(WEATHER_API_URL . '?' . http_build_query($params));
if (!$result['ok']) {
    send_json(['ok' => false, 'error' => $result['error']], 502);
}

$source = $result['data'];
$data = [
    'location' => [
        'name' => $name !== '' ? $name : 'Selected location',
        'lat' => $lat,
        'lon' => $lon,
    ],
    'timezone' => $source['timezone'] ?? 'UTC',
    'current' => $source['current'] ?? null,
    'hourly' => $source['hourly'] ?? null,
    'daily' => $source['daily'] ?? null,
    'current_units' => $source['current_units'] ?? null,
    'hourly_units' => $source['hourly_units'] ?? null,
    'daily_units' => $source['daily_units'] ?? null,
];

cache_set($cacheKey, $data);

send_json(['ok' => true, 'data' => $data]);
