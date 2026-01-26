<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

handle_preflight();

$query = trim((string)($_GET['q'] ?? ''));
$length = mb_strlen($query);
if ($length < 2 || $length > 80) {
    send_json(['ok' => false, 'error' => 'Query must be between 2 and 80 characters.'], 400);
}

$params = [
    'name' => $query,
    'count' => 8,
    'language' => 'en',
    'format' => 'json',
];

$result = fetch_remote_json(GEOCODE_API_URL . '?' . http_build_query($params));
if (!$result['ok']) {
    send_json(['ok' => false, 'error' => $result['error']], 502);
}

$payload = $result['data'];
$results = [];
foreach (($payload['results'] ?? []) as $item) {
    if (!isset($item['latitude'], $item['longitude'])) {
        continue;
    }

    $results[] = [
        'name' => (string)($item['name'] ?? ''),
        'country' => (string)($item['country'] ?? ''),
        'admin1' => (string)($item['admin1'] ?? ''),
        'lat' => (float)$item['latitude'],
        'lon' => (float)$item['longitude'],
    ];
}

send_json(['ok' => true, 'data' => ['results' => $results]]);
