<?php
/**
 * Health Check Endpoint
 * GET /api/v1/health
 */

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

function handleHealth(): void {
    setCorsHeaders();

    try {
        $pdo = getDb();
        $stmt = $pdo->query('SELECT COUNT(*) AS total FROM ev_stations');
        $totalStations = (int)$stmt->fetchColumn();

        sendJsonResponse([
            'status'            => 'ok',
            'database'          => 'connected',
            'service'           => 'India EV Finder REST API',
            'version'           => '1.0.0',
            'stations'          => $totalStations,
            'totalStationsInDb' => $totalStations,
            'timestamp'         => gmdate('Y-m-d\TH:i:s\Z')
        ]);
    } catch (Exception $e) {
        sendJsonResponse([
            'status'    => 'degraded',
            'service'   => 'India EV Finder REST API',
            'version'   => '1.0.0',
            'database'  => 'error',
            'error'     => $e->getMessage(),
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z')
        ], 500);
    }
}

