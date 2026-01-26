<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function cache_path(string $key): string
{
    $safe = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $key);
    return rtrim(CACHE_DIR, '/') . '/' . $safe . '.json';
}

function cache_get(string $key, int $ttl = CACHE_TTL): ?array
{
    $path = cache_path($key);
    if (!file_exists($path)) {
        return null;
    }

    if (time() - filemtime($path) > $ttl) {
        @unlink($path);
        return null;
    }

    $raw = file_get_contents($path);
    if ($raw === false) {
        return null;
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function cache_set(string $key, array $data): void
{
    if (!is_dir(CACHE_DIR)) {
        mkdir(CACHE_DIR, 0775, true);
    }

    $path = cache_path($key);
    file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE));
}
