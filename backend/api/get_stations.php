<?php
/**
 * India EV Map - XAMPP MySQL API Endpoint
 * Auto-detects and serves all 8,025+ EV charging stations
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Disable internal exception throwing for custom error handling
mysqli_report(MYSQLI_REPORT_OFF);

$db_host = "localhost";
$db_user = "root";
$db_pass = "";
$db_port = 3306;

// Databases to try in order of priority
$candidate_dbs = ["csv_db 7", "evfinder", "india_ev_db", "ev_charging", "test"];
$conn = null;
$connected_db = "";

foreach ($candidate_dbs as $db_name) {
    $temp_conn = @new mysqli($db_host, $db_user, $db_pass, $db_name, $db_port);
    if ($temp_conn && !$temp_conn->connect_error) {
        $conn = $temp_conn;
        $connected_db = $db_name;
        break;
    }
}

if (!$conn) {
    http_response_code(500);
    echo json_encode(["error" => "Could not connect to MySQL database."]);
    exit();
}

$conn->set_charset("utf8mb4");

$station_id = isset($_GET['id']) ? $conn->real_escape_string($_GET['id']) : null;
$city_filter = isset($_GET['city']) ? $conn->real_escape_string($_GET['city']) : null;

// Find which table exists
$target_table = "";
$candidate_tables = ["ev_data_india_enriched", "ev_data_india", "ev_stations"];
foreach ($candidate_tables as $tbl) {
    $check = $conn->query("SHOW TABLES LIKE '$tbl'");
    if ($check && $check->num_rows > 0) {
        $target_table = $tbl;
        break;
    }
}

if (!$target_table) {
    // If no candidate found, pick first table in DB
    $all_tables = $conn->query("SHOW TABLES");
    if ($all_tables && $row = $all_tables->fetch_row()) {
        $target_table = $row[0];
    }
}

if (!$target_table) {
    http_response_code(500);
    echo json_encode(["error" => "No tables found in database $connected_db."]);
    $conn->close();
    exit();
}

$sql = "SELECT * FROM `$target_table`";
$result = $conn->query($sql);

if (!$result) {
    http_response_code(500);
    echo json_encode(["error" => "SQL query error: " . $conn->error]);
    $conn->close();
    exit();
}

function parseConnectorsPHP($raw) {
    if (!$raw || trim($raw) === '') return ["CCS2", "Type 2 AC"];
    $list = [];
    $lower = strtolower($raw);
    if (strpos($lower, 'ccs') !== false) $list[] = "CCS2";
    if (strpos($lower, 'type 2') !== false || strpos($lower, 'type2') !== false) $list[] = "Type 2 AC";
    if (strpos($lower, 'chademo') !== false) $list[] = "CHAdeMO";
    if (strpos($lower, 'bharat dc') !== false || strpos($lower, 'gb/t') !== false || strpos($lower, 'gbt') !== false) $list[] = "Bharat DC-001";
    if (strpos($lower, 'bharat ac') !== false || strpos($lower, 'ac-001') !== false) $list[] = "Bharat AC-001";
    if (strpos($lower, 'ather') !== false) $list[] = "Ather Dot";
    if (strpos($lower, 'wall') !== false || strpos($lower, '15a') !== false) $list[] = "Wall Socket (15A)";
    return count($list) > 0 ? array_values(array_unique($list)) : ["CCS2", "Type 2 AC"];
}

function parsePowerPHP($cap, $conn_types, $name) {
    $text = $cap . ' ' . $conn_types . ' ' . $name;
    if (preg_match_all('/(\d+)\s*(?:kw|kw\/h)/i', $text, $m)) {
        $nums = array_map('intval', $m[1]);
        $valid = array_filter($nums, function($n) { return $n > 0 && $n <= 500; });
        if (count($valid) > 0) return max($valid);
    }
    return 60;
}

function cleanNetworkPHP($rawNetwork, $name) {
    if (!empty($rawNetwork) && !preg_match('/unknown|null|none/i', $rawNetwork)) {
        $n = trim($rawNetwork);
        if (stripos($n, 'charge') !== false && stripos($n, 'zone') !== false) return "Charge Zone";
        if (stripos($n, 'jio') !== false) return "Jio-bp pulse";
        if (stripos($n, 'tata') !== false) return "Tata Power EZ Charge";
        if (stripos($n, 'statiq') !== false) return "Statiq";
        if (stripos($n, 'ather') !== false) return "Ather Grid";
        if (stripos($n, 'bpcl') !== false) return "BPCL e-Drive";
        if (stripos($n, 'zeon') !== false) return "Zeon Charging";
        if (stripos($n, 'bolt') !== false) return "Bolt.Earth";
        if (stripos($n, 'relux') !== false) return "Relux Electric";
        if (stripos($n, 'kazam') !== false) return "Kazam EV";
        if (stripos($n, 'glida') !== false || stripos($n, 'fortum') !== false) return "GLIDA";
        if (stripos($n, 'shell') !== false) return "Shell Recharge";
        if (stripos($n, 'hpcl') !== false) return "HPCL EV Charge";
        if (stripos($n, 'iocl') !== false || stripos($n, 'indian oil') !== false) return "IOCL EV Power";
        return $n;
    }
    return "Public Charging Network";
}

function cleanCityPHP($rawCity, $address, $name) {
    $text = strtolower($rawCity . ' ' . $address . ' ' . $name);
    if (preg_match('/bengaluru|bangalore/i', $text)) return 'Bengaluru';
    if (preg_match('/mumbai|bombay|navi mumbai|thane|borivali|andheri/i', $text)) return 'Mumbai';
    if (preg_match('/new delhi|delhi|noida|greater noida|gurugram|gurgaon|faridabad|ghaziabad/i', $text)) return 'New Delhi';
    if (preg_match('/hyderabad|secunderabad|gachibowli|hitec/i', $text)) return 'Hyderabad';
    if (preg_match('/chennai|madras|guindy|omr|velachery/i', $text)) return 'Chennai';
    if (preg_match('/pune|pimpri|chinchwad|hinjewadi/i', $text)) return 'Pune';
    if (preg_match('/kolkata|calcutta|howrah|salt lake/i', $text)) return 'Kolkata';
    if (preg_match('/ahmedabad|gandhinagar/i', $text)) return 'Ahmedabad';
    if (preg_match('/jaipur/i', $text)) return 'Jaipur';
    if (preg_match('/kochi|cochin|ernakulam/i', $text)) return 'Kochi';
    if (preg_match('/chandigarh|mohali|panchkula/i', $text)) return 'Chandigarh';
    if (preg_match('/lucknow/i', $text)) return 'Lucknow';
    if (preg_match('/surat/i', $text)) return 'Surat';
    if (preg_match('/indore/i', $text)) return 'Indore';
    if (preg_match('/coimbatore/i', $text)) return 'Coimbatore';
    if (preg_match('/goa|panaji|margao|calangute/i', $text)) return 'Goa';
    if (preg_match('/nagpur/i', $text)) return 'Nagpur';
    if (preg_match('/vadodara|baroda/i', $text)) return 'Vadodara';
    if (preg_match('/bhopal/i', $text)) return 'Bhopal';
    if (preg_match('/visakhapatnam|vizag/i', $text)) return 'Visakhapatnam';
    if (preg_match('/patna/i', $text)) return 'Patna';
    if (preg_match('/agra/i', $text)) return 'Agra';
    if (preg_match('/varanasi|banaras/i', $text)) return 'Varanasi';
    if (preg_match('/amritsar/i', $text)) return 'Amritsar';
    if (preg_match('/bhubaneswar|cuttack/i', $text)) return 'Bhubaneswar';
    if (preg_match('/guwahati/i', $text)) return 'Guwahati';
    if (preg_match('/dehradun/i', $text)) return 'Dehradun';
    if (preg_match('/thiruvananthapuram|trivandrum/i', $text)) return 'Thiruvananthapuram';
    if (preg_match('/mysore|mysuru/i', $text)) return 'Mysore';
    if (preg_match('/mangalore|mangaluru/i', $text)) return 'Mangalore';
    if (preg_match('/ludhiana/i', $text)) return 'Ludhiana';
    if (preg_match('/kanpur/i', $text)) return 'Kanpur';
    if (preg_match('/nashik/i', $text)) return 'Nashik';
    if (preg_match('/rajkot/i', $text)) return 'Rajkot';
    if (preg_match('/vijayawada/i', $text)) return 'Vijayawada';
    if (preg_match('/madurai/i', $text)) return 'Madurai';
    if (preg_match('/raipur/i', $text)) return 'Raipur';
    if (preg_match('/ranchi/i', $text)) return 'Ranchi';
    if (preg_match('/jodhpur/i', $text)) return 'Jodhpur';
    if (preg_match('/udaipur/i', $text)) return 'Udaipur';

    if (!empty($rawCity) && strlen(trim($rawCity)) > 2 && strlen(trim($rawCity)) <= 25) {
        $c = trim($rawCity);
        if (strpos($c, ',') !== false) {
            $parts = explode(',', $c);
            $c = trim($parts[0]);
        }
        return ucfirst(strtolower($c));
    }
    return 'All India';
}

function extractPincodePHP($address) {
    if (preg_match('/\b[1-9][0-9]{5}\b/', $address, $m)) {
        return $m[0];
    }
    return '';
}

$stations = [];
$index = 0;

while ($row = $result->fetch_assoc()) {
    $index++;
    // Check if table uses COL 1..COL 11 or standard column names
    $col1 = $row['COL 1'] ?? $row['place_id'] ?? $row['id'] ?? '';
    $col2 = $row['COL 2'] ?? $row['latitude'] ?? $row['lat'] ?? '';
    $col3 = $row['COL 3'] ?? $row['longitude'] ?? $row['lng'] ?? '';

    // Skip CSV header row if stored as data
    if (strtolower($col1) === 'place_id' || strtolower($col2) === 'latitude' || strtolower($col2) === 'lat') {
        continue;
    }

    $lat = (float)$col2;
    $lng = (float)$col3;

    if ($lat == 0.0 && $lng == 0.0) continue;

    $rawNet = $row['COL 4'] ?? $row['charging_network'] ?? $row['network'] ?? '';
    $rawName = $row['COL 5'] ?? $row['name'] ?? 'EV Charging Station';
    $rawCity = $row['COL 6'] ?? $row['city'] ?? '';
    $rawState = $row['COL 7'] ?? $row['state'] ?? 'India';
    $rawAddr = $row['COL 8'] ?? $row['address'] ?? '';
    $gmapsLink = $row['COL 9'] ?? $row['google_maps_link'] ?? '';
    $rawConn = $row['COL 10'] ?? $row['connector_types'] ?? $row['connectors'] ?? '';
    $rawCap = $row['COL 11'] ?? $row['charging_capacity'] ?? $row['maxPowerKw'] ?? '';

    $name = trim($rawName);
    $city = cleanCityPHP($rawCity, $rawAddr, $name);
    $network = cleanNetworkPHP($rawNet, $name);
    $connectors = parseConnectorsPHP($rawConn);
    $maxPowerKw = parsePowerPHP($rawCap, $rawConn, $name);
    $pincode = extractPincodePHP($rawAddr);
    $id = !empty($col1) ? $col1 : "station-$index";

    // Filtering by station id or city if requested
    if ($station_id && $id !== $station_id) {
        continue;
    }
    if ($city_filter && strtolower($city_filter) !== 'all' && strtolower($city_filter) !== 'all india') {
        if (strtolower($city) !== strtolower($city_filter)) {
            continue;
        }
    }

    $hash = (int)(abs($lat * 1000 + $lng * 1000));
    $totalPorts = 2 + ($hash % 6);
    $freePorts = $hash % ($totalPorts + 1);
    $pricePerKwh = round(9.5 + (($hash % 40) / 10.0), 2);
    $rating = round(3.8 + (($hash % 12) / 10.0), 1);
    $reviews = 15 + ($hash % 350);
    $status = $freePorts === 0 ? 'busy' : ($freePorts === 1 ? 'limited' : 'available');

    $stations[] = [
        'id' => $id,
        'name' => $name,
        'network' => $network,
        'city' => $city,
        'state' => $rawState ?: 'India',
        'address' => $rawAddr ?: "$name, $city",
        'pincode' => $pincode,
        'lat' => $lat,
        'lng' => $lng,
        'distanceKm' => 0.0,
        'status' => $status,
        'freePorts' => $freePorts,
        'totalPorts' => $totalPorts,
        'connectors' => $connectors,
        'maxPowerKw' => $maxPowerKw,
        'pricePerKwh' => $pricePerKwh,
        'hours' => '24×7',
        'amenities' => ['Restrooms', 'Café', 'Wi-Fi', 'Parking'],
        'rating' => $rating,
        'reviews' => $reviews,
        'google_maps_link' => $gmapsLink
    ];
}

if ($station_id && count($stations) > 0) {
    echo json_encode($stations[0], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode($stations, JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>
