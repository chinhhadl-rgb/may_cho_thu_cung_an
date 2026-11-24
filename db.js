/**
 * DB.JS - Kết nối MySQL XAMPP và các hàm ghi/đọc dữ liệu
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pet_feeder_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;
let isConnected = false;

// Khởi tạo Connection Pool
function initPool() {
  try {
    pool = mysql.createPool(DB_CONFIG);
    return pool;
  } catch (err) {
    console.error('Lỗi tạo MySQL Pool:', err.message);
    return null;
  }
}

// Kiểm tra kết nối thử tới MySQL
async function testConnection() {
  if (!pool) initPool();
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    isConnected = true;
    console.log('✅ Đã kết nối thành công tới MySQL XAMPP [Database: pet_feeder_db]');
    return true;
  } catch (error) {
    isConnected = false;
    if (error.code === 'ECONNREFUSED') {
      console.warn('⚠️ CẢNH BÁO: Chưa bật MySQL trên XAMPP (Port 3306). Server vẫn chạy nhưng chưa lưu được log vào Database!');
      console.warn('👉 Hãy mở XAMPP Control Panel và nhấn "Start" tại module MySQL.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.warn('⚠️ CẢNH BÁO: Database `pet_feeder_db` chưa tồn tại!');
      console.warn('👉 Hãy chạy lệnh: npm run init-db để tự động tạo database và các bảng.');
    } else {
      console.warn('⚠️ Lỗi kết nối MySQL:', error.message);
    }
    return false;
  }
}

// 1. Lưu log cảm biến
async function saveSensorLog(data) {
  if (!pool || !isConnected) return false;
  try {
    const query = `
      INSERT INTO sensor_logs (device_id, level_pct, feeds_today, max_feeds_per_day, wifi_rssi, sensor_ok)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.device_id || 'esp32-feeder-01',
      typeof data.level_pct === 'number' ? data.level_pct : 0,
      typeof data.feeds_today === 'number' ? data.feeds_today : 0,
      typeof data.max_feeds_per_day === 'number' ? data.max_feeds_per_day : 6,
      typeof data.wifi_rssi === 'number' ? data.wifi_rssi : -99,
      data.sensor_ok !== undefined ? (data.sensor_ok ? 1 : 0) : 1
    ];
    await pool.execute(query, params);
    return true;
  } catch (err) {
    console.error('Lỗi lưu sensor_logs:', err.message);
    return false;
  }
}

// 2. Lưu log cho ăn
async function saveFeedingLog({ request_id, source, status, duration_ms, note }) {
  if (!pool || !isConnected) return false;
  try {
    const query = `
      INSERT INTO feeding_logs (request_id, source, status, duration_ms, note)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      request_id || `req-${Date.now()}`,
      source || 'web_app',
      status || 'SUCCESS',
      duration_ms || 2000,
      note || 'Lệnh xả hạt'
    ];
    await pool.execute(query, params);
    return true;
  } catch (err) {
    console.error('Lỗi lưu feeding_logs:', err.message);
    return false;
  }
}

// 3. Lưu log trạng thái thiết bị
async function saveDeviceStatus({ device_id, status, detail }) {
  if (!pool || !isConnected) return false;
  try {
    const query = `
      INSERT INTO device_status_logs (device_id, status, detail)
      VALUES (?, ?, ?)
    `;
    await pool.execute(query, [
      device_id || 'esp32-feeder-01',
      status || 'unknown',
      detail || ''
    ]);
    return true;
  } catch (err) {
    console.error('Lỗi lưu device_status_logs:', err.message);
    return false;
  }
}

// 4. Lấy lịch sử cảm biến gần nhất
async function getRecentSensorLogs(limit = 20) {
  if (!pool || !isConnected) return [];
  try {
    const [rows] = await pool.query(
      `SELECT * FROM sensor_logs ORDER BY created_at DESC LIMIT ?`,
      [Number(limit)]
    );
    return rows;
  } catch (err) {
    console.error('Lỗi lấy sensor_logs:', err.message);
    return [];
  }
}

// 5. Lấy lịch sử các lần cho ăn gần nhất
async function getRecentFeedingLogs(limit = 20) {
  if (!pool || !isConnected) return [];
  try {
    const [rows] = await pool.query(
      `SELECT * FROM feeding_logs ORDER BY created_at DESC LIMIT ?`,
      [Number(limit)]
    );
    return rows;
  } catch (err) {
    console.error('Lỗi lấy feeding_logs:', err.message);
    return [];
  }
}

// 6. Đếm số lần cho ăn thành công trong ngày hôm nay từ Database (Single Source of Truth)
async function getFeedsCountToday() {
  if (!pool || !isConnected) return 0;
  try {
    const query = `
      SELECT COUNT(*) AS today_count 
      FROM feeding_logs 
      WHERE status = 'SUCCESS' AND DATE(created_at) = CURDATE()
    `;
    const [rows] = await pool.query(query);
    return rows[0] ? Number(rows[0].today_count) : 0;
  } catch (err) {
    console.error('Lỗi đếm số bữa hôm nay từ MySQL:', err.message);
    return 0;
  }
}

module.exports = {
  initPool,
  testConnection,
  saveSensorLog,
  saveFeedingLog,
  saveDeviceStatus,
  getRecentSensorLogs,
  getRecentFeedingLogs,
  getFeedsCountToday,
  isDbConnected: () => isConnected
};
