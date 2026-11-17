<?php
/**
 * Database Configuration for India EV Finder PHP API
 */

$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (str_contains($line, '=')) {
            [$key, $val] = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val);
            if (getenv($key) === false) {
                putenv("$key=$val");
                $_ENV[$key] = $val;
            }
        }
    }
}

define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ? (int)getenv('DB_PORT') : 3306);
define('DB_NAME', getenv('DB_NAME') ?: 'india_ev_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : (getenv('DB_PASS') !== false ? getenv('DB_PASS') : ''));
define('DB_CHARSET', 'utf8mb4');

