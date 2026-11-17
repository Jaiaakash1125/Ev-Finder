# start-dev.ps1 — starts MariaDB + API server for EV Finder
$MYSQL_BIN  = "D:\XAMPP\mysql\bin"
$MYSQL_EXE  = "$MYSQL_BIN\mysql.exe"
$MYSQLD_EXE = "$MYSQL_BIN\mysqld.exe"
$MY_INI     = "$MYSQL_BIN\my.ini"

Write-Host "[1/4] Starting MariaDB..."
Remove-Item "D:\XAMPP\mysql\data\mysql.pid" -Force -ErrorAction SilentlyContinue
$dbJob = Start-Job { & "D:\XAMPP\mysql\bin\mysqld.exe" --defaults-file="D:\XAMPP\mysql\bin\my.ini" --standalone 2>&1 }
Start-Sleep -Seconds 8

$ver = & $MYSQL_EXE -u root -h 127.0.0.1 -P 3306 --connect-timeout=5 -sse "SELECT VERSION();" 2>&1
if ($LASTEXITCODE -ne 0) { Write-Error "Cannot connect to MariaDB: $ver"; exit 1 }
Write-Host "  MariaDB $ver is up."

Write-Host "[2/4] Creating ev_reviews table if missing..."
$ddl = @"
CREATE TABLE IF NOT EXISTS ``ev_reviews`` (
  ``id`` VARCHAR(50) NOT NULL PRIMARY KEY,
  ``station_id`` VARCHAR(100) NOT NULL,
  ``user_id`` VARCHAR(50) DEFAULT NULL,
  ``user_name`` VARCHAR(120) NOT NULL,
  ``rating`` TINYINT UNSIGNED NOT NULL,
  ``comment`` TEXT NOT NULL,
  ``plug_condition`` ENUM('working_perfect','slow_charge','broken_connector') NOT NULL,
  ``created_at`` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX ``idx_ev_reviews_station_created`` (``station_id``,``created_at``),
  CONSTRAINT ``fk_ev_reviews_station`` FOREIGN KEY (``station_id``) REFERENCES ``ev_stations``(``id``) ON DELETE CASCADE,
  CONSTRAINT ``chk_ev_reviews_rating`` CHECK (``rating`` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"@
& $MYSQL_EXE -u root -h 127.0.0.1 -P 3306 india_ev_db -e $ddl
$count = & $MYSQL_EXE -u root -h 127.0.0.1 -P 3306 --connect-timeout=5 -sse "SELECT COUNT(*) FROM india_ev_db.ev_stations;"
Write-Host "  ev_stations rows: $count | ev_reviews table ready."

Write-Host "[3/4] Starting Node.js API server on :5000 ..."
$apiJob = Start-Job -WorkingDirectory "C:\Users\jaiaa\Downloads\Ev-Final-main\Ev-Final-main" {
    node.exe "C:\Users\jaiaa\Downloads\Ev-Final-main\Ev-Final-main\node_modules\.bin\tsx" "C:\Users\jaiaa\Downloads\Ev-Final-main\Ev-Final-main\backend\api-server.ts" 2>&1
}
Start-Sleep -Seconds 4
Write-Host "  API job started (id=$($apiJob.Id))."

Write-Host "[4/4] Done. API: http://localhost:5000/api/v1  Vite: http://localhost:8080"
Write-Host "Press Ctrl+C to stop all jobs."
Wait-Job $dbJob,$apiJob | Out-Null
