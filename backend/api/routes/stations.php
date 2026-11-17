<?php
/**
 * Stations API Route Handlers
 * - GET /api/v1/stations
 * - GET /api/v1/stations/nearby
 * - GET /api/v1/stations/bounds
 * - GET /api/v1/stations/search
 * - GET /api/v1/stations/{id}
 */

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

function handleListStations(): void {
    setCorsHeaders();
    $pdo = getDb();

    $limit = isset($_GET['limit']) ? min(max((int)$_GET['limit'], 1), 10000) : 50;
    $offset = isset($_GET['offset']) ? max((int)$_GET['offset'], 0) : 0;
    if (isset($_GET['page']) && !isset($_GET['offset'])) {
        $page = max((int)$_GET['page'], 1);
        $offset = ($page - 1) * $limit;
    }

    $whereClauses = ['1=1'];
    $params = [];

    if (!empty($_GET['city']) && strtolower($_GET['city']) !== 'all') {
        $whereClauses[] = 'city LIKE :city';
        $params[':city'] = '%' . trim($_GET['city']) . '%';
    }

    if (!empty($_GET['state']) && strtolower($_GET['state']) !== 'all') {
        $whereClauses[] = 'state LIKE :state';
        $params[':state'] = '%' . trim($_GET['state']) . '%';
    }

    if (!empty($_GET['network']) && strtolower($_GET['network']) !== 'all') {
        $whereClauses[] = 'network LIKE :network';
        $params[':network'] = '%' . trim($_GET['network']) . '%';
    }

    if (!empty($_GET['status']) && strtolower($_GET['status']) !== 'all') {
        $whereClauses[] = 'status = :status';
        $params[':status'] = trim($_GET['status']);
    }

    if (!empty($_GET['min_power_kw'])) {
        $whereClauses[] = 'maxPowerKw >= :minPower';
        $params[':minPower'] = (int)$_GET['min_power_kw'];
    }

    if (!empty($_GET['connector'])) {
        $whereClauses[] = 'connectors LIKE :connector';
        $params[':connector'] = '%' . trim($_GET['connector']) . '%';
    }

    if (!empty($_GET['q'])) {
        $whereClauses[] = '(name LIKE :q OR address LIKE :q OR city LIKE :q OR network LIKE :q OR pincode LIKE :q)';
        $params[':q'] = '%' . trim($_GET['q']) . '%';
    }

    $whereSql = implode(' AND ', $whereClauses);

    // Count total matches
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM ev_stations WHERE {$whereSql}");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    // Query paginated rows
    $sql = "SELECT * FROM ev_stations WHERE {$whereSql} ORDER BY id ASC LIMIT {$limit} OFFSET {$offset}";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $stations = array_map('formatStation', $rows);
    $page = isset($_GET['page']) ? max((int)$_GET['page'], 1) : (int)floor($offset / $limit) + 1;
    $pages = $total > 0 ? (int)ceil($total / $limit) : 0;

    sendJsonResponse([
        'success'    => true,
        'count'      => count($stations),
        'total'      => $total,
        'page'       => $page,
        'pages'      => $pages,
        'limit'      => $limit,
        'offset'     => $offset,
        'pagination' => [
            'page'            => $page,
            'limit'           => $limit,
            'total'           => $total,
            'totalPages'      => $pages,
            'hasNextPage'     => $page < $pages,
            'hasPreviousPage' => ($page > 1 && $pages > 0),
        ],
        'data'       => $stations
    ]);
}

function handleNearbyStations(): void {
    setCorsHeaders();
    $pdo = getDb();

    $lat = isset($_GET['lat']) ? (float)$_GET['lat'] : 12.9716;
    $lng = isset($_GET['lng']) ? (float)$_GET['lng'] : 77.5946;
    $radiusKm = isset($_GET['radius_km']) ? (float)$_GET['radius_km'] : (isset($_GET['radius']) ? (float)$_GET['radius'] : 50.0);
    $limit = isset($_GET['limit']) ? min(max((int)$_GET['limit'], 1), 500) : 100;

    $whereClauses = ['1=1'];
    $params = [
        ':lat'    => $lat,
        ':lng'    => $lng,
        ':radius' => $radiusKm
    ];

    if (!empty($_GET['connector'])) {
        $whereClauses[] = 'connectors LIKE :connector';
        $params[':connector'] = '%' . trim($_GET['connector']) . '%';
    }

    if (!empty($_GET['min_power_kw'])) {
        $whereClauses[] = 'maxPowerKw >= :minPower';
        $params[':minPower'] = (int)$_GET['min_power_kw'];
    }

    if (!empty($_GET['network']) && strtolower($_GET['network']) !== 'all') {
        $whereClauses[] = 'network LIKE :network';
        $params[':network'] = '%' . trim($_GET['network']) . '%';
    }

    if (!empty($_GET['status']) && strtolower($_GET['status']) !== 'all') {
        $whereClauses[] = 'status = :status';
        $params[':status'] = trim($_GET['status']);
    }

    $whereSql = implode(' AND ', $whereClauses);

    // Haversine formula distance calculation in kilometers
    $sql = "SELECT *,
        ROUND(6371 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS(:lat - lat) / 2), 2) +
            COS(RADIANS(:lat)) * COS(RADIANS(lat)) *
            POWER(SIN(RADIANS(:lng - lng) / 2), 2)
        )), 2) AS distanceKm
        FROM ev_stations
        WHERE {$whereSql}
        HAVING distanceKm <= :radius
        ORDER BY distanceKm ASC
        LIMIT {$limit}";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $stations = array_map('formatStation', $rows);

    sendJsonResponse([
        'success'   => true,
        'count'     => count($stations),
        'total'     => count($stations),
        'page'      => 1,
        'pages'     => 1,
        'origin'    => ['lat' => $lat, 'lng' => $lng],
        'radius_km' => $radiusKm,
        'data'      => $stations
    ]);
}

function handleBoundsStations(): void {
    setCorsHeaders();
    $pdo = getDb();

    if (!isset($_GET['min_lat']) || !isset($_GET['min_lng']) || !isset($_GET['max_lat']) || !isset($_GET['max_lng'])) {
        sendErrorResponse("min_lat, min_lng, max_lat, and max_lng query params are required", 400);
    }

    $minLat = (float)$_GET['min_lat'];
    $minLng = (float)$_GET['min_lng'];
    $maxLat = (float)$_GET['max_lat'];
    $maxLng = (float)$_GET['max_lng'];
    $limit = isset($_GET['limit']) ? min(max((int)$_GET['limit'], 1), 600) : 200;

    $sql = "SELECT * FROM ev_stations 
            WHERE lat BETWEEN :min_lat AND :max_lat 
              AND lng BETWEEN :min_lng AND :max_lng 
            LIMIT {$limit}";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':min_lat' => $minLat,
        ':max_lat' => $maxLat,
        ':min_lng' => $minLng,
        ':max_lng' => $maxLng
    ]);

    $rows = $stmt->fetchAll();
    $stations = array_map('formatStation', $rows);

    sendJsonResponse([
        'success' => true,
        'count'   => count($stations),
        'total'   => count($stations),
        'page'    => 1,
        'pages'   => 1,
        'bounds'  => [
            'min_lat' => $minLat,
            'min_lng' => $minLng,
            'max_lat' => $maxLat,
            'max_lng' => $maxLng
        ],
        'data'    => $stations
    ]);
}

function handleSearchStations(): void {
    setCorsHeaders();
    $pdo = getDb();

    $q = trim($_GET['q'] ?? '');
    $city = trim($_GET['city'] ?? '');
    $limit = isset($_GET['limit']) ? min(max((int)$_GET['limit'], 1), 200) : 50;

    $whereClauses = ['1=1'];
    $params = [];

    if ($city !== '' && strtolower($city) !== 'all' && strtolower($city) !== 'all india') {
        $whereClauses[] = 'city LIKE :city';
        $params[':city'] = '%' . $city . '%';
    }

    if ($q !== '') {
        $whereClauses[] = '(name LIKE :q OR address LIKE :q OR network LIKE :q OR city LIKE :q OR pincode LIKE :q)';
        $params[':q'] = '%' . $q . '%';
    }

    $whereSql = implode(' AND ', $whereClauses);
    $sql = "SELECT * FROM ev_stations WHERE {$whereSql} LIMIT {$limit}";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $stations = array_map('formatStation', $rows);

    sendJsonResponse([
        'success' => true,
        'count'   => count($stations),
        'data'    => $stations
    ]);
}

function handleGetStationById(string $id): void {
    setCorsHeaders();
    $pdo = getDb();

    $stmt = $pdo->prepare('SELECT * FROM ev_stations WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();

    if (!$row) {
        sendErrorResponse('Station not found', 404);
    }

    $station = formatStation($row);
    sendJsonResponse([
        'success' => true,
        'data'    => $station
    ]);
}

function handleListCities(): void {
    setCorsHeaders();
    $pdo = getDb();

    $stmt = $pdo->query("SELECT DISTINCT city FROM ev_stations WHERE city <> '' ORDER BY city ASC");
    $cities = $stmt->fetchAll(PDO::FETCH_COLUMN);

    sendJsonResponse([
        'success' => true,
        'count'   => count($cities),
        'data'    => $cities
    ]);
}

function handleStationReviews(string $stationId): void {
    setCorsHeaders();
    $pdo = getDb();

    // Verify station exists
    $checkStmt = $pdo->prepare('SELECT id FROM ev_stations WHERE id = :id LIMIT 1');
    $checkStmt->execute([':id' => $stationId]);
    if (!$checkStmt->fetch()) {
        sendErrorResponse('Station not found', 404);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $rawInput = file_get_contents('php://input');
        $body = json_decode($rawInput, true) ?: [];

        $rating = isset($body['rating']) ? (int)$body['rating'] : 0;
        if ($rating < 1 || $rating > 5) {
            sendErrorResponse('Rating must be an integer between 1 and 5', 400);
        }

        $userName = !empty($body['userName']) ? substr(trim($body['userName']), 0, 120) : 'EV Driver';
        $comment = isset($body['comment']) ? (string)$body['comment'] : '';
        $plugCondition = isset($body['plugCondition']) && in_array($body['plugCondition'], ['working_perfect', 'slow_charge', 'broken_connector'])
            ? $body['plugCondition']
            : 'working_perfect';

        $id = 'rev_' . bin2hex(random_bytes(16));

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('INSERT INTO ev_reviews (id, station_id, user_name, rating, comment, plug_condition) VALUES (:id, :station_id, :user_name, :rating, :comment, :plug_condition)');
            $stmt->execute([
                ':id'             => $id,
                ':station_id'     => $stationId,
                ':user_name'      => $userName,
                ':rating'         => $rating,
                ':comment'        => $comment,
                ':plug_condition' => $plugCondition,
            ]);

            $statStmt = $pdo->prepare('SELECT COUNT(*) AS rev_count, AVG(rating) AS avg_rating FROM ev_reviews WHERE station_id = :station_id');
            $statStmt->execute([':station_id' => $stationId]);
            $stats = $statStmt->fetch();

            $updateStmt = $pdo->prepare('UPDATE ev_stations SET rating = :rating, reviews = :reviews WHERE id = :station_id');
            $updateStmt->execute([
                ':rating'     => round((float)($stats['avg_rating'] ?? 4.5), 1),
                ':reviews'    => (int)($stats['rev_count'] ?? 0),
                ':station_id' => $stationId,
            ]);

            $pdo->commit();

            sendJsonResponse([
                'success' => true,
                'data'    => [
                    'id'            => $id,
                    'stationId'     => $stationId,
                    'userName'      => $userName,
                    'rating'        => $rating,
                    'comment'       => $comment,
                    'plugCondition' => $plugCondition,
                    'createdAt'     => gmdate('Y-m-d\TH:i:s\Z')
                ]
            ], 201);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendErrorResponse('Failed to create review: ' . $e->getMessage(), 500);
        }
    }

    $stmt = $pdo->prepare('SELECT id, station_id, user_name, rating, comment, plug_condition, created_at FROM ev_reviews WHERE station_id = :id ORDER BY created_at DESC');
    $stmt->execute([':id' => $stationId]);
    $rows = $stmt->fetchAll();

    $reviews = array_map(function ($row) {
        return [
            'id'            => (string)$row['id'],
            'stationId'     => (string)$row['station_id'],
            'userName'      => (string)$row['user_name'],
            'rating'        => (int)$row['rating'],
            'comment'       => (string)$row['comment'],
            'plugCondition' => (string)$row['plug_condition'],
            'createdAt'     => (string)$row['created_at'],
        ];
    }, $rows);

    sendJsonResponse([
        'success' => true,
        'data'    => $reviews
    ]);
}

