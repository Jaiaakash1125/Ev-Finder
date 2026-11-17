<?php
/**
 * Common Helpers for India EV Finder PHP API
 */

function setCorsHeaders(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: application/json; charset=UTF-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

function sendJsonResponse(mixed $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit();
}

function sendErrorResponse(string $message, int $statusCode = 400): void {
    sendJsonResponse([
        'success' => false,
        'error'   => $message
    ], $statusCode);
}

function formatStation(array $row): array {
    // Parse JSON connectors
    $connectors = [];
    if (!empty($row['connectors'])) {
        $decoded = is_string($row['connectors']) ? json_decode($row['connectors'], true) : $row['connectors'];
        if (is_array($decoded)) {
            $connectors = $decoded;
        } else if (is_string($row['connectors'])) {
            $connectors = array_map('trim', explode(',', $row['connectors']));
        }
    }
    if (empty($connectors)) {
        $connectors = ['CCS2', 'Type 2 AC'];
    }

    // Parse JSON amenities
    $amenities = [];
    if (!empty($row['amenities'])) {
        $decoded = is_string($row['amenities']) ? json_decode($row['amenities'], true) : $row['amenities'];
        if (is_array($decoded)) {
            $amenities = $decoded;
        } else if (is_string($row['amenities'])) {
            $amenities = array_map('trim', explode(',', $row['amenities']));
        }
    }
    if (empty($amenities)) {
        $amenities = ['Restrooms'];
    }

    $distanceKm = 0.0;
    if (isset($row['distanceKm'])) {
        $distanceKm = round((float)$row['distanceKm'], 2);
    } elseif (isset($row['distance_km'])) {
        $distanceKm = round((float)$row['distance_km'], 2);
    }

    return [
        'id'          => (string)($row['id'] ?? ''),
        'name'        => (string)($row['name'] ?? ''),
        'network'     => (string)($row['network'] ?? 'Public Charger'),
        'city'        => (string)($row['city'] ?? ''),
        'state'       => (string)($row['state'] ?? 'India'),
        'address'     => (string)($row['address'] ?? ''),
        'pincode'     => (string)($row['pincode'] ?? ''),
        'lat'         => (float)($row['lat'] ?? 0),
        'lng'         => (float)($row['lng'] ?? 0),
        'distanceKm'  => $distanceKm,
        'status'      => in_array($row['status'] ?? '', ['available', 'limited', 'busy', 'offline']) ? $row['status'] : 'available',
        'freePorts'   => (int)($row['freePorts'] ?? $row['free_ports'] ?? 1),
        'totalPorts'  => (int)($row['totalPorts'] ?? $row['total_ports'] ?? 2),
        'connectors'  => array_values($connectors),
        'maxPowerKw'  => (int)($row['maxPowerKw'] ?? $row['max_power_kw'] ?? 50),
        'pricePerKwh' => (float)($row['pricePerKwh'] ?? $row['price_per_kwh'] ?? 10.0),
        'hours'       => (string)($row['hours'] ?? '24×7'),
        'amenities'   => array_values($amenities),
        'rating'      => (float)($row['rating'] ?? 4.5),
        'reviews'     => (int)($row['reviews'] ?? 0),
        'isFavorite'  => false
    ];
}

