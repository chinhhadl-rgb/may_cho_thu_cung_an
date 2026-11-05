/**
 * CONFIG.JS - Toàn bộ cấu hình hệ thống & thông số MQTT Broker
 */

const DEFAULT_CONFIG = {
  // EMQX Cloud Serverless WSS Endpoint
  brokerUrl: 'wss://h12e1a20.ala.eu-central-1.emqxsl.com:8084/mqtt',
  username: 'petfeeder_esp32',
  password: '123',
  
  // Topic đặc tả
  topics: {
    sensor: 'petfeeder/sensor',
    status: 'petfeeder/status',
    control: 'petfeeder/control'
  },

  // Quy chuẩn nghiệp vụ (Business Rules)
  rules: {
    minFeedGapMs: 60 * 1000,      // Rule 1: 60s cooldown chống spam
    lowFoodAlertPct: 20,          // Rule 2: Ngưỡng cảnh báo cạn hạt (< 20%)
    lowFoodRestorePct: 25,        // Rule 2: Ngưỡng phục hồi Hysteresis (>= 25%)
    defaultMaxFeeds: 6            // Rule 3: Trần số lần cho ăn/ngày
  }
};

// Đọc cấu hình tùy biến từ localStorage (tự động cập nhật nếu phát hiện tài khoản cũ)
function loadConfig() {
  const saved = localStorage.getItem('pet_feeder_config');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Nếu còn lưu username cũ là petuser thì xóa để nhận tài khoản mới petfeeder_esp32
      if (parsed.username === 'petuser') {
        localStorage.removeItem('pet_feeder_config');
        return { ...DEFAULT_CONFIG };
      }
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        topics: { ...DEFAULT_CONFIG.topics, ...(parsed.topics || {}) },
        rules: { ...DEFAULT_CONFIG.rules, ...(parsed.rules || {}) }
      };
    } catch (e) {
      console.warn('Lỗi đọc cấu hình đã lưu, dùng mặc định:', e);
    }
  }
  return { ...DEFAULT_CONFIG };
}

// Lưu cấu hình vào localStorage
function saveConfig(newConfig) {
  localStorage.setItem('pet_feeder_config', JSON.stringify(newConfig));
}

// Khởi tạo instance config toàn cục
const APP_CONFIG = loadConfig();

// Sinh Client ID ngẫu nhiên cho mỗi phiên làm việc
APP_CONFIG.clientId = 'web_feeder_' + Math.random().toString(16).substring(2, 10);
