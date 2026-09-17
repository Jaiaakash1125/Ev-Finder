<?php
/**
 * India EV Map - XAMPP MySQL API Endpoint
 * Connects to `ev_charging.ev_data_india` (837+ stations) or fallback to `india_ev_db`
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$db_host = "localhost";
$db_user = "root";
$db_pass = "";
$db_port = 3306;

// Check which database is available
$target_db = "ev_charging";
$conn = new mysqli($db_host, $db_user, $db_pass, $target_db, $db_port);

if ($conn->connect_error) {
    // Try fallback to india_ev_db
    $target_db = "india_ev_db";
    $conn = new mysqli($db_host, $db_user, $db_pass, $target_db, $db_port);
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(["error" => "Database connection failed: " . $conn->connect_error]);
        exit();
    }
}

$conn->set_charset("utf8mb4");

$station_id = isset($_GET['id']) ? $conn->real_escape_string($_GET['id']) : null;
$city_filter = isset($_GET['city']) ? $conn->real_escape_string($_GET['city']) : null;

// Determine if table is `ev_data_india` or `ev_stations`
$check_table = $conn->query("SHOW TABLES LIKE 'ev_data_india'");
$is_ev_data_india = ($check_table && $check_table->num_rows > 0);

if ($is_ev_data_india) {
    $where_clauses = [];
    if ($station_id) {
        $where_clauses[] = "(place_id = '$station_id' OR MD5(CONCAT(COALESCE(name,''), COALESCE(latitude,''), COALESCE(longitude,''))) = '$station_id')";
    }
    if ($city_filter && strtolower($city_filter) !== 'all' && strtolower($city_filter) !== 'all india') {
        $where_clauses[] = "LOWER(city) = LOWER('$city_filter')";
    }

    $where_sql = count($where_clauses) > 0 ? "WHERE " . implode(" AND ", $where_clauses) : "";
    $sql = "SELECT * FROM ev_data_india $where_sql";
} else {
    $where_clauses = [];
    if ($station_id) {
        $where_clauses[] = "id = '$station_id'";
    }
    if ($city_filter && strtolower($city_filter) !== 'all' && strtolower($city_filter) !== 'all india') {
        $where_clauses[] = "LOWER(city) = LOWER('$city_filter')";
    }

    $where_sql = count($where_clauses) > 0 ? "WHERE " . implode(" AND ", $where_clauses) : "";
    $sql = "SELECT * FROM ev_stations $where_sql";
}

$result = $conn->query($sql);

if (!$result) {
    http_response_code(500);
    echo json_encode(["error" => "SQL query error: " . $conn->error]);
    $conn->close();
    exit();
}

$stations = [];

// Network detector helper
function detectNetwork($name) {
    $n = strtolower($name);
    if (strpos($n, 'tata power') !== false) return 'Tata Power EZ Charge';
    if (strpos($n, 'statiq') !== false) return 'Statiq';
    if (strpos($n, 'ather') !== false) return 'Ather Grid';
    if (strpos($n, 'bpcl') !== false) return 'BPCL e-Drive';
    if (strpos($n, 'jio') !== false || strpos($n, 'pulse') !== false) return 'Jio-bp pulse';
    if (strpos($n, 'zeon') !== false) return 'Zeon Charging';
    if (strpos($n, 'charge zone') !== false || strpos($n, 'chargezone') !== false) return 'Charge Zone';
    if (strpos($n, 'magenta') !== false) return 'Magenta ChargeGrid';
    if (strpos($n, 'relux') !== false) return 'Relux Electric';
    if (strpos($n, 'mercedes') !== false) return 'Mercedes-Benz High-Power';
    if (strpos($n, 'kazam') !== false) return 'Kazam EV';
    if (strpos($n, 'glida') !== false || strpos($n, 'fortum') !== false) return 'GLIDA';
    return 'Public Charging Network';
}

function extractPincode($address) {
    if (preg_match('/\b[1-9][0-9]{5}\b/', $address, $matches)) {
        return $matches[0];
    }
    return '';
}

function cleanCity($rawCity, $address, $name) {
    $text = strtolower($rawCity . ' ' . $address . ' ' . $name);
    
    if (preg_match('/bengaluru|bangalore/i', $text)) return 'Bengaluru';
    if (preg_match('/mumbai|bombay|navi mumbai|thane|borivali|andheri|nariman/i', $text)) return 'Mumbai';
    if (preg_match('/new delhi|delhi|noida|greater noida|gurugram|gurgaon|faridabad|ghaziabad/i', $text)) return 'New Delhi';
    if (preg_match('/hyderabad|secunderabad|gachibowli|hitec/i', $text)) return 'Hyderabad';
    if (preg_match('/chennai|madras|guindy|omr/i', $text)) return 'Chennai';
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

    $c = trim($rawCity);
    $c = preg_replace('/^[0-9\-\+\s]+/', '', $c);
    if (strpos($c, ',') !== false) {
        $parts = explode(',', $c);
        $c = trim($parts[0]);
    }
    if (strpos($c, ':') !== false) {
        $parts = explode(':', $c);
        $c = trim($parts[0]);
    }
    if (strlen($c) > 2 && strlen($c) <= 25 && !preg_match('/dealer|service|station|industrial|highway|toll|sector|opposite|petroleum/i', $c)) {
        return ucfirst(strtolower($c));
    }

    return 'India';
}

while ($row = $result->fetch_assoc()) {
    if ($is_ev_data_india) {
        $lat = isset($row['latitude']) ? (float)$row['latitude'] : 0.0;
        $lng = isset($row['longitude']) ? (float)$row['longitude'] : 0.0;
        
        // Skip invalid coordinates
        if ($lat == 0.0 && $lng == 0.0) continue;

        $id = !empty($row['place_id']) ? $row['place_id'] : md5(($row['name'] ?? '') . $lat . $lng);
        $name = !empty($row['name']) ? $row['name'] : 'EV Charging Station';
        $network = detectNetwork($name);
        $address = !empty($row['address']) ? $row['address'] : '';
        $rawCity = !empty($row['city']) ? trim($row['city']) : '';
        $city = cleanCity($rawCity, $address, $name);
        $state = !empty($row['state']) ? trim($row['state']) : '';
        $pincode = extractPincode($address);

        // Power and connectors logic based on network / name
        $isHighPower = stripos($name, 'high-power') !== false || stripos($name, 'super') !== false || stripos($name, 'fast') !== false;
        $isTwoWheeler = stripos($name, 'ather') !== false;

        $maxPowerKw = $isHighPower ? 150 : ($isTwoWheeler ? 30 : 60);
        $connectors = $isTwoWheeler ? ["Ather Dot", "Type 2 AC"] : ($isHighPower ? ["CCS2", "CHAdeMO", "Type 2 AC"] : ["CCS2", "Type 2 AC"]);
        
        // Seed pseudo-random realistic values deterministically from lat/lng
        $hashNum = (int)(abs($lat * 1000 + $lng * 1000));
        $totalPorts = 4 + ($hashNum % 6);
        $freePorts = 1 + ($hashNum % ($totalPorts - 1));
        $rating = 4.0 + (($hashNum % 10) / 10.0);
        $reviews = 25 + ($hashNum % 450);
        $pricePerKwh = 9.5 + (($hashNum % 35) / 10.0);

        $station = [
            'id' => $id,
            'name' => $name,
            'network' => $network,
            'city' => $city,
            'state' => $state,
            'address' => $address,
            'pincode' => $pincode,
            'lat' => $lat,
            'lng' => $lng,
            'distanceKm' => 0.0,
            'status' => ($freePorts > 0 ? 'available' : 'busy'),
            'freePorts' => $freePorts,
            'totalPorts' => $totalPorts,
            'connectors' => $connectors,
            'maxPowerKw' => $maxPowerKw,
            'pricePerKwh' => round($pricePerKwh, 2),
            'hours' => '24×7',
            'amenities' => ['Café', 'Restrooms', 'Free parking', 'Wi-Fi'],
            'rating' => round($rating, 1),
            'reviews' => $reviews,
            'google_maps_link' => $row['google_maps_link'] ?? ''
        ];
        $stations[] = $station;
    } else {
        // Standard ev_stations format
        if (!empty($row['connectors'])) {
            $decoded = json_decode($row['connectors'], true);
            $row['connectors'] = is_array($decoded) ? $decoded : array_map('trim', explode(',', $row['connectors']));
        } else {
            $row['connectors'] = ["CCS2"];
        }

        if (!empty($row['amenities'])) {
            $decoded = json_decode($row['amenities'], true);
            $row['amenities'] = is_array($decoded) ? $decoded : array_map('trim', explode(',', $row['amenities']));
        } else {
            $row['amenities'] = ["Restrooms"];
        }

        $row['lat'] = (float)$row['lat'];
        $row['lng'] = (float)$row['lng'];
        $row['distanceKm'] = isset($row['distanceKm']) ? (float)$row['distanceKm'] : 0.0;
        $row['maxPowerKw'] = (int)$row['maxPowerKw'];
        $row['pricePerKwh'] = (float)$row['pricePerKwh'];
        $row['freePorts'] = (int)$row['freePorts'];
        $row['totalPorts'] = (int)$row['totalPorts'];
        $row['rating'] = (float)$row['rating'];
        $row['reviews'] = (int)$row['reviews'];

        $stations[] = $row;
    }
}

if ($station_id && count($stations) > 0) {
    echo json_encode($stations[0]);
} else {
    echo json_encode($stations);
}

$conn->close();
?>
