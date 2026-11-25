/**
 * SERVER.JS - Máy chủ Backend Node.js cho Smart Pet Feeder IoT
 * 1. Phục vụ Web Application tĩnh (Port 3000)
 * 2. Cung cấp REST API lấy lịch sử (/api/history/sensor, /api/history/feeding)
 * 3. Chạy MQTT Background Worker: Tự động bắt gói tin từ ESP32 và lưu vào MySQL XAMPP
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// Nạp module db.js an toàn
let db = null;
try {
  db = require('./db');
} catch (e) {
  console.warn('⚠️ Chưa cài đặt mysql2. Để lưu database, hãy chạy: npm install');
}

// Nạp module mqtt an toàn
let mqtt = null;
try {
  mqtt = require('mqtt');
} catch (e) {
  console.warn('⚠️ Chưa cài đặt mqtt cho backend. Hãy chạy: npm install');
}

// --- 1. MQTT BACKGROUND WORKER (LẮNG NGHE & LƯU VÀO MYSQL) ---
let mqttBackendClient = null;
let isMqttBackendConnected = false;

const MQTT_CONFIG = {
  brokerUrl: 'wss://h12e1a20.ala.eu-central-1.emqxsl.com:8084/mqtt',
  username: 'petfeeder_esp32',
  password: '123',
  clientId: 'node_backend_worker_' + Math.random().toString(16).substring(2, 8),
  topics: {
    sensor: 'petfeeder/sensor',
    status: 'petfeeder/status',
    control: 'petfeeder/control'
  }
};

function startMqttWorker() {
  if (!mqtt) return;

  console.log(`🔌 [MQTT Worker] Đang kết nối EMQX Cloud: ${MQTT_CONFIG.brokerUrl}`);

  try {
    mqttBackendClient = mqtt.connect(MQTT_CONFIG.brokerUrl, {
      clientId: MQTT_CONFIG.clientId,
      username: MQTT_CONFIG.username,
      password: MQTT_CONFIG.password,
      clean: true,
      reconnectPeriod: 5000,
      protocolVersion: 4
    });

    mqttBackendClient.on('connect', () => {
      isMqttBackendConnected = true;
      console.log('✅ [MQTT Worker] Đã kết nối EMQX Cloud, bắt đầu lắng nghe topics để lưu MySQL...');

      const topics = [MQTT_CONFIG.topics.sensor, MQTT_CONFIG.topics.status, MQTT_CONFIG.topics.control];
      mqttBackendClient.subscribe(topics, { qos: 1 }, (err) => {
        if (!err) {
          console.log(`📡 [MQTT Worker] Đã subscribe: ${topics.join(', ')}`);
        }
      });
    });

    mqttBackendClient.on('message', async (topic, payload) => {
      const payloadStr = payload.toString();
      try {
        const data = JSON.parse(payloadStr);

        if (topic === MQTT_CONFIG.topics.sensor) {
          // Lưu vào bảng sensor_logs trong MySQL
          if (db) {
            // Lấy số bữa hôm nay thực tế từ MySQL (đã lưu trong feeding_logs)
            const todayDbCount = await db.getFeedsCountToday();
            
            // Nếu ESP32 gửi feeds_today < todayDbCount (do ESP32 vừa khởi động lại bị reset RAM về 0),
            // Ta giữ số bữa thực tế từ DB để không bị tụt lùi về 0!
            if (typeof data.feeds_today === 'number' && data.feeds_today < todayDbCount) {
              data.feeds_today = todayDbCount;
            } else if (typeof data.feeds_today !== 'number') {
              data.feeds_today = todayDbCount;
            }

            const saved = await db.saveSensorLog(data);
            if (saved) console.log(`💾 [MySQL] Đã lưu sensor log: level=${data.level_pct}%, feeds_today=${data.feeds_today}`);
          }
        } else if (topic === MQTT_CONFIG.topics.status) {
          // Lưu vào bảng device_status_logs
          if (db) {
            await db.saveDeviceStatus(data);
            console.log(`💾 [MySQL] Đã lưu trạng thái thiết bị: ${data.status}`);
          }
        } else if (topic === MQTT_CONFIG.topics.control) {
          // Lưu vào bảng feeding_logs
          if (db) {
            await db.saveFeedingLog({
              request_id: data.request_id || `req-${Date.now()}`,
              source: data.source || 'web_custom_app',
              status: 'SUCCESS',
              duration_ms: 2000,
              note: `Lệnh: ${data.command || 'FEED_NOW'}`
            });
            console.log(`💾 [MySQL] Đã lưu lịch sử xả hạt: ${data.request_id}`);
          }
        }
      } catch (err) {
        console.warn(`[MQTT Worker] Dữ liệu không hợp lệ từ ${topic}:`, payloadStr);
      }
    });

    mqttBackendClient.on('error', (err) => {
      isMqttBackendConnected = false;
      console.warn('⚠️ [MQTT Worker] Lỗi:', err.message);
    });

  } catch (err) {
    console.error('❌ Lỗi khởi động MQTT Worker:', err.message);
  }
}

// --- 2. MIME TYPES PHỤC VỤ WEB APPLICATION ---
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

// --- 3. HTTP SERVER & REST API ---
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Header CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API 1: Kiểm tra trạng thái hệ thống
  if (pathname === '/api/status' && req.method === 'GET') {
    const todayCount = db ? await db.getFeedsCountToday() : 0;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      database: {
        connected: db ? db.isDbConnected() : false,
        type: 'MySQL (XAMPP)',
        port: 3306
      },
      feeds_today: todayCount,
      mqtt_worker: {
        connected: isMqttBackendConnected,
        broker: MQTT_CONFIG.brokerUrl
      },
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // API 1.1: Lấy số bữa ăn hôm nay chính xác từ Database
  if (pathname === '/api/stats/today' && req.method === 'GET') {
    const todayCount = db ? await db.getFeedsCountToday() : 0;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      feeds_today: todayCount,
      max_feeds_per_day: 6
    }));
    return;
  }

  // API 2: Lấy lịch sử cảm biến từ MySQL
  if (pathname === '/api/history/sensor' && req.method === 'GET') {
    const limit = parseInt(parsedUrl.query.limit, 10) || 20;
    const rows = db ? await db.getRecentSensorLogs(limit) : [];
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, count: rows.length, data: rows }));
    return;
  }

  // API 3: Lấy lịch sử cho ăn từ MySQL
  if (pathname === '/api/history/feeding' && req.method === 'GET') {
    const limit = parseInt(parsedUrl.query.limit, 10) || 20;
    const rows = db ? await db.getRecentFeedingLogs(limit) : [];
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, count: rows.length, data: rows }));
    return;
  }

  // API 4: Gửi lệnh cho ăn thông qua Backend (tuỳ chọn)
  if (pathname === '/api/feed' && req.method === 'POST') {
    const requestId = `api-feed-${Date.now()}`;
    const payload = JSON.stringify({
      command: 'FEED_NOW',
      request_id: requestId,
      source: 'backend_api'
    });

    if (mqttBackendClient && isMqttBackendConnected) {
      mqttBackendClient.publish(MQTT_CONFIG.topics.control, payload, { qos: 1 });
    }

    if (db) {
      await db.saveFeedingLog({
        request_id: requestId,
        source: 'backend_api',
        status: 'SUCCESS',
        duration_ms: 2000,
        note: 'Kích hoạt từ REST API'
      });
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, message: 'Đã phát lệnh cho ăn!', request_id: requestId }));
    return;
  }

  // Xử lý Static Files (index.html, style.css, v.v.)
  let reqPath = pathname === '/' || pathname === '' ? '/index.html' : pathname;
  const filePath = path.join(__dirname, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

// Khởi chạy Server
server.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Smart Pet Feeder Backend running at:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`======================================================`);

  // Kiểm tra kết nối MySQL XAMPP
  if (db) {
    await db.testConnection();
  }

  // Khởi động MQTT background worker
  startMqttWorker();
});
