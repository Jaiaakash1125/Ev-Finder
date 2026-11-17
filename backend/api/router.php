<?php
/**
 * Router script for PHP built-in web server:
 * php -S localhost:8000 backend/api/router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// If the file exists and is not a php script, let the server handle it
if ($uri !== '/' && file_exists(__DIR__ . $uri) && !is_dir(__DIR__ . $uri)) {
    return false;
}

require __DIR__ . '/index.php';

