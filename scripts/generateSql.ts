// Script to export SQL schema and inserts for MySQL / XAMPP
import * as fs from 'fs';
import * as path from 'path';
import { stations } from '../src/data/stations.js';

let sql = `-- ============================================================
-- India EV Map Database Schema for XAMPP MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS \`india_ev_db\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`india_ev_db\`;

-- Drop old table if exists
DROP TABLE IF EXISTS \`ev_stations\`;

-- Create \`ev_stations\` table matching website columns
CREATE TABLE \`ev_stations\` (
  \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`network\` VARCHAR(100) NOT NULL,
  \`city\` VARCHAR(100) NOT NULL,
  \`state\` VARCHAR(100) NOT NULL,
  \`address\` TEXT NOT NULL,
  \`pincode\` VARCHAR(20) DEFAULT NULL,
  \`lat\` DECIMAL(10, 7) NOT NULL,
  \`lng\` DECIMAL(10, 7) NOT NULL,
  \`distanceKm\` DECIMAL(5, 2) DEFAULT 0.00,
  \`status\` ENUM('available', 'limited', 'busy', 'offline') DEFAULT 'available',
  \`freePorts\` INT DEFAULT 1,
  \`totalPorts\` INT DEFAULT 2,
  \`connectors\` JSON NOT NULL,
  \`maxPowerKw\` INT DEFAULT 50,
  \`pricePerKwh\` DECIMAL(6, 2) DEFAULT 10.00,
  \`hours\` VARCHAR(100) DEFAULT '24×7',
  \`amenities\` JSON NOT NULL,
  \`rating\` DECIMAL(2, 1) DEFAULT 4.5,
  \`reviews\` INT DEFAULT 100,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Complete Dataset of ${stations.length} Indian EV Charging Stations
`;

const insertChunks: string[] = [];
for (let i = 0; i < stations.length; i += 50) {
  const chunk = stations.slice(i, i + 50);
  const rows = chunk.map(s => {
    const esc = (val: string) => val.replace(/'/g, "''");
    return `('${esc(s.id)}', '${esc(s.name)}', '${esc(s.network)}', '${esc(s.city)}', '${esc(s.state)}', '${esc(s.address)}', '${esc(s.pincode)}', ${s.lat}, ${s.lng}, ${s.distanceKm}, '${s.status}', ${s.freePorts}, ${s.totalPorts}, '${JSON.stringify(s.connectors)}', ${s.maxPowerKw}, ${s.pricePerKwh}, '${esc(s.hours)}', '${JSON.stringify(s.amenities)}', ${s.rating}, ${s.reviews})`;
  });

  insertChunks.push(`INSERT INTO \`ev_stations\` (\`id\`, \`name\`, \`network\`, \`city\`, \`state\`, \`address\`, \`pincode\`, \`lat\`, \`lng\`, \`distanceKm\`, \`status\`, \`freePorts\`, \`totalPorts\`, \`connectors\`, \`maxPowerKw\`, \`pricePerKwh\`, \`hours\`, \`amenities\`, \`rating\`, \`reviews\`) VALUES\n${rows.join(',\n')};`);
}

sql += insertChunks.join('\n\n');

fs.writeFileSync(path.resolve('backend/schema.sql'), sql, 'utf-8');
console.log(`Updated backend/schema.sql with ${stations.length} stations.`);
