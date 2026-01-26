<?php
declare(strict_types=1);

const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const CACHE_DIR = __DIR__ . '/../data';
const CACHE_TTL = 600; // 10 minutes

function send_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function handle_preflight(): void
{
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        send_json(['ok' => true], 204);
    }
}

function fetch_remote_json(string $url): array
{
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 6,
            'header' => "User-Agent: WeatherApp/1.0\r\n",
        ],
    ]);

    $raw = @file_get_contents($url, false, $context);
    if ($raw === false) {
        return ['ok' => false, 'error' => 'Nie udalo sie polaczyc z serwisem zewnetrznym.'];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return ['ok' => false, 'error' => 'Nieprawidlowa odpowiedz serwisu zewnetrznego.'];
    }

    return ['ok' => true, 'data' => $data];
}
