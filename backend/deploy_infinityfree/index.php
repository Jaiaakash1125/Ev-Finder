<?php
/**
 * India EV Finder - PHP Server-Side API Front Controller
 * Handles routing for /api/v1/*
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/routes/health.php';
require_once __DIR__ . '/routes/stations.php';

setCorsHeaders();

// Determine requested path
if (!empty($_GET['route'])) {
    $path = trim($_GET['route'], '/');
    $path = preg_replace('#^api/#i', '', $path);
    $path = preg_replace('#^v1/#i', '', $path);
} else {
    $requestUri = $_SERVER['REQUEST_URI'] ?? '/';
    $path = parse_url($requestUri, PHP_URL_PATH) ?: '/';
    $path = str_replace('\\', '/', $path);

    // Normalize path: strip script name if accessed directly (e.g. index.php)
    $scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
    $scriptDir = dirname($scriptName);
    if ($scriptDir !== '/' && $scriptDir !== '.' && $scriptDir !== '' && str_starts_with($path, $scriptDir)) {
        $path = substr($path, strlen($scriptDir));
    }
    if (str_starts_with($path, '/index.php')) {
        $path = substr($path, strlen('/index.php'));
    }

    // Remove /api and /v1 prefixes
    $path = preg_replace('#^/api#i', '', $path);
    $path = preg_replace('#^/v1#i', '', $path);
    $path = trim($path, '/');
}

// Routing table
if ($path === '' || $path === 'health') {
    handleHealth();
} elseif ($path === 'stations/cities') {
    handleListCities();
} elseif ($path === 'stations/nearby') {
    handleNearbyStations();
} elseif ($path === 'stations/bounds') {
    handleBoundsStations();
} elseif ($path === 'stations/search') {
    handleSearchStations();
} elseif ($path === 'stations') {
    handleListStations();
} elseif (preg_match('#^stations/([^/]+)/reviews$#', $path, $matches)) {
    handleStationReviews($matches[1]);
} elseif (preg_match('#^stations/([^/]+)$#', $path, $matches)) {
    handleGetStationById($matches[1]);
} else {
    sendErrorResponse("Endpoint not found: /" . htmlspecialchars($path, ENT_QUOTES, 'UTF-8'), 404);
}

