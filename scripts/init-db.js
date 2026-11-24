/**
 * SCRIPT TỰ ĐỘNG KHỞI TẠO CƠ SỞ DỮ LIỆU PET FEEDER TRÊN XAMPP
 * Chạy lệnh: npm run init-db hoặc node scripts/init-db.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

async function initDatabase() {
  console.log('⏳ Đang kết nối tới MySQL XAMPP (127.0.0.1:3306)...');

  let connection;
  try {
    // 1. Kết nối không cần chỉ định database để tạo DB nếu chưa có
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Đã kết nối thành công tới MySQL service của XAMPP!');

    // 2. Đọc file database.sql (từ thư mục database/ hoặc thư mục gốc)
    const sqlPath = fs.existsSync(path.join(__dirname, '..', 'database', 'database.sql'))
      ? path.join(__dirname, '..', 'database', 'database.sql')
      : path.join(__dirname, '..', 'database.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // 3. Thực thi kịch bản SQL
    console.log('⏳ Đang khởi tạo Database `pet_feeder_db` và các bảng...');
    await connection.query(sqlContent);

    console.log('\n=============================================================');
    console.log('🎉 KHỞI TẠO THÀNH CÔNG CƠ SỞ DỮ LIỆU PET_FEEDER_DB!');
    console.log('   - Database: pet_feeder_db');
    console.log('   - Các bảng đã sẵn sàng:');
    console.log('     + sensor_logs         (Dữ liệu cảm biến định kỳ)');
    console.log('     + feeding_logs        (Lịch sử các lần cho ăn)');
    console.log('     + device_status_logs  (Lịch sử kết nối ESP32)');
    console.log('=============================================================\n');

  } catch (error) {
    console.error('\n❌ LỖI KHỞI TẠO CƠ SỞ DỮ LIỆU:');
    if (error.code === 'ECONNREFUSED') {
      console.error('   -> Không thể kết nối tới cổng 3306.');
      console.error('   -> NGUYÊN NHÂN: Bạn chưa bấm "Start" MySQL trên phần mềm XAMPP!');
      console.error('   -> KHẮC PHỤC: Mở "XAMPP Control Panel", bấm "Start" tại dòng MySQL rồi chạy lại.\n');
    } else {
      console.error('   -> Chi tiết lỗi:', error.message);
    }
  } finally {
    if (connection) await connection.end();
  }
}

initDatabase();
