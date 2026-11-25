/**
 * APP.JS - Điều phối luồng nghiệp vụ (Business Logic) và Tương tác người dùng
 */

const App = {
  state: {
    isLowFoodWarning: false,    // Cờ nhớ trạng thái Hysteresis (Rule 2)
    feedsToday: 0,
    maxFeedsPerDay: APP_CONFIG.rules.defaultMaxFeeds,
    lastFeedTimestamp: 0,       // Lần xả hạt gần nhất (Rule 1)
    countdownTimerId: null,
    currentHistoryTab: 'feeding', // 'feeding' hoặc 'sensor'
    cachedFeedingLogs: [],
    cachedSensorLogs: []
  },

  init() {
    UI.addLog('INFO', 'Smart Pet Feeder Application khởi tạo...');

    // 1. Khởi tạo Telegram Web App nếu có
    this.initTelegramWebApp();

    // 2. Khôi phục trạng thái Cooldown 60s từ localStorage
    this.restoreLastFeedTime();

    // 3. Đăng ký sự kiện từ mqttService
    this.bindMqttEvents();

    // 4. Đăng ký sự kiện giao diện (Buttons, Modal)
    this.bindUiEvents();

    // 5. Kết nối tới Broker
    UI.setMqttStatus('connecting', 'MQTT: Đang kết nối...');
    mqttService.connect();

    // 6. Kiểm tra kết nối MySQL XAMPP qua Backend API
    this.checkBackendStatus();
    setInterval(() => this.checkBackendStatus(), 10000);

    // 7. Tải lịch sử cho ăn từ MySQL XAMPP
    this.loadHistory();
    setInterval(() => this.loadHistory(true), 20000);
  },

  // Kiểm tra trạng thái Backend & MySQL XAMPP
  async checkBackendStatus() {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const json = await res.json();
        if (json.database?.connected) {
          UI.setDbStatus('online', 'MySQL: Sẵn sàng');

          // Khôi phục chính xác số bữa hôm nay từ Database (Single Source of Truth)
          if (typeof json.feeds_today === 'number') {
            this.state.feedsToday = Math.max(this.state.feedsToday, json.feeds_today);
            UI.setMealStats(this.state.feedsToday, this.state.maxFeedsPerDay);
            this.evaluateButtonState();
          }
        } else {
          UI.setDbStatus('offline', 'MySQL: Chưa bật XAMPP');
        }
      } else {
        UI.setDbStatus('offline', 'MySQL: Offline');
      }
    } catch (e) {
      UI.setDbStatus('offline', 'MySQL: Chạy file thô');
    }
  },

  // Chuyển đổi tab lịch sử giữa 'feeding' và 'sensor'
  switchHistoryTab(tabName) {
    this.state.currentHistoryTab = tabName;
    const { tabFeedHistory, tabSensorHistory } = UI.elements;

    if (tabFeedHistory && tabSensorHistory) {
      if (tabName === 'feeding') {
        tabFeedHistory.classList.add('active');
        tabSensorHistory.classList.remove('active');
        UI.renderFeedingHistory(this.state.cachedFeedingLogs);
      } else {
        tabFeedHistory.classList.remove('active');
        tabSensorHistory.classList.add('active');
        UI.renderSensorHistory(this.state.cachedSensorLogs);
      }
    }
  },

  // Tải dữ liệu lịch sử từ MySQL Backend
  async loadHistory(silent = false) {
    const btnRefresh = UI.elements.btnRefreshHistory;
    if (!silent && btnRefresh) {
      btnRefresh.innerHTML = '<span class="spin-anim">🔄</span> Đang tải...';
    }

    try {
      // 1. Tải lịch sử cho ăn (feeding_logs)
      const feedRes = await fetch('/api/history/feeding?limit=30');
      if (feedRes.ok) {
        const feedJson = await feedRes.json();
        if (feedJson.success && Array.isArray(feedJson.data)) {
          this.state.cachedFeedingLogs = feedJson.data;
        }
      }

      // 2. Tải lịch sử cảm biến (sensor_logs)
      const sensorRes = await fetch('/api/history/sensor?limit=30');
      if (sensorRes.ok) {
        const sensorJson = await sensorRes.json();
        if (sensorJson.success && Array.isArray(sensorJson.data)) {
          this.state.cachedSensorLogs = sensorJson.data;
        }
      }

      // 3. Hiển thị tab đang chọn
      this.switchHistoryTab(this.state.currentHistoryTab);

      if (!silent) {
        UI.addLog('INFO', `Đã đồng bộ lịch sử: ${this.state.cachedFeedingLogs.length} lần cho ăn, ${this.state.cachedSensorLogs.length} bản ghi đo.`);
      }
    } catch (err) {
      if (!silent) {
        console.warn('Lỗi tải lịch sử từ MySQL:', err.message);
      }
    } finally {
      if (btnRefresh) {
        btnRefresh.innerHTML = '🔄 Làm mới';
      }
    }
  },

  // Telegram Web App SDK Integration
  initTelegramWebApp() {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        UI.addLog('INFO', 'Telegram Web App SDK đã sẵn sàng.');
      } catch (e) {
        console.warn('Lỗi init Telegram Web App:', e);
      }
    }
  },

  // Rung phản hồi trên Telegram Web App
  triggerHaptic(type = 'success') {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
      else if (type === 'warning') tg.HapticFeedback.notificationOccurred('warning');
      else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
    }
  },

  // Lắng nghe sự kiện từ mqttService
  bindMqttEvents() {
    // Log chuyển tiếp ra UI Console
    mqttService.on('log', (type, message) => {
      UI.addLog(type, message);
    });

    mqttService.on('connect', () => {
      UI.setMqttStatus('online', 'MQTT: Đã kết nối');
      this.evaluateButtonState();
    });

    mqttService.on('error', (err) => {
      UI.setMqttStatus('offline', 'MQTT: Lỗi kết nối');
      this.evaluateButtonState();
    });

    mqttService.on('close', () => {
      UI.setMqttStatus('offline', 'MQTT: Mất kết nối');
      this.evaluateButtonState();
    });

    mqttService.on('reconnect', () => {
      UI.setMqttStatus('connecting', 'MQTT: Đang kết nối lại...');
    });

    // Xử lý gói tin Sensor từ ESP32
    mqttService.on('sensorData', (data) => {
      this.handleSensorData(data);
    });

    // Xử lý gói tin Status từ ESP32
    mqttService.on('statusData', (data) => {
      const isOnline = (data.status === 'online');
      UI.setDeviceStatus(isOnline, data.device_id || 'esp32-feeder-01');
      this.evaluateButtonState();
    });
  },

  // Xử lý dữ liệu cảm biến định kỳ
  handleSensorData(data) {
    // ESP32 gửi dữ liệu => ESP32 đang Online
    UI.setDeviceStatus(true, data.device_id || 'esp32-feeder-01');

    // 1. Cập nhật mức thức ăn & Hysteresis Rule 2
    const pct = typeof data.level_pct === 'number' ? Math.max(0, Math.min(100, Math.round(data.level_pct))) : 0;
    UI.setFoodGauge(pct);
    this.handleHysteresisRule(pct);

    // 2. Cập nhật bữa ăn trong ngày & Rule 3 (Chống tụt lùi số bữa khi ESP32 khởi động lại)
    if (typeof data.feeds_today === 'number') {
      this.state.feedsToday = Math.max(this.state.feedsToday, data.feeds_today);
    }
    if (typeof data.max_feeds_per_day === 'number') this.state.maxFeedsPerDay = data.max_feeds_per_day;
    UI.setMealStats(this.state.feedsToday, this.state.maxFeedsPerDay);

    // 3. Cập nhật Wi-Fi RSSI
    if (typeof data.wifi_rssi === 'number') {
      UI.setWifiRssi(data.wifi_rssi);
    }

    // 4. Trạng thái cảm biến HC-SR04
    if (typeof data.sensor_ok === 'boolean') {
      UI.setSensorStatus(data.sensor_ok);
    }

    // 5. Cập nhật thời gian
    const now = new Date();
    UI.setLastUpdated(now.toTimeString().split(' ')[0]);

    this.evaluateButtonState();
  },

  /**
   * RULE 2 - HYSTERESIS CẢNH BÁO CẠN HẠT:
   * - Khi level_pct < 20%: kích hoạt cảnh báo đỏ.
   * - Khi level_pct >= 25%: tự động tắt cảnh báo.
   * - Trong khoảng [20%, 25%): giữ nguyên trạng thái trước đó.
   */
  handleHysteresisRule(pct) {
    if (pct < APP_CONFIG.rules.lowFoodAlertPct) {
      if (!this.state.isLowFoodWarning) {
        this.state.isLowFoodWarning = true;
        UI.addLog('WARN', `Phát hiện phễu cạn hạt (< 20%): ${pct}%`);
      }
    } else if (pct >= APP_CONFIG.rules.lowFoodRestorePct) {
      if (this.state.isLowFoodWarning) {
        this.state.isLowFoodWarning = false;
        UI.addLog('INFO', `Đã nạp thêm hạt (>= 25%): ${pct}%. Tắt cảnh báo.`);
      }
    }

    UI.setFoodAlertBanner(this.state.isLowFoodWarning, pct);
  },

  /**
   * Đánh giá trạng thái nút bấm (Rate Limit, Max Feeds, Mqtt connection)
   */
  evaluateButtonState() {
    const now = Date.now();
    const elapsed = now - this.state.lastFeedTimestamp;
    const isCoolingDown = elapsed < APP_CONFIG.rules.minFeedGapMs;
    const isMaxFeedsReached = this.state.feedsToday >= this.state.maxFeedsPerDay && this.state.maxFeedsPerDay > 0;

    if (!mqttService.isConnected) {
      UI.setButtonState({
        disabled: true,
        icon: '⚠️',
        text: 'MẤT KẾT NỐI MQTT',
        countdownSec: 0,
        hintText: '⚠️ Chưa kết nối tới máy chủ MQTT'
      });
      return;
    }

    // Rule 3: Khóa khi đạt trần
    if (isMaxFeedsReached) {
      UI.setButtonState({
        disabled: true,
        icon: '⛔',
        text: 'ĐÃ ĐẠT TRẦN BỮA ĂN (6/6)',
        countdownSec: 0,
        hintText: '⚠️ Đã đạt giới hạn số bữa trong ngày'
      });
      return;
    }

    // Rule 1: Khóa khi đang đếm ngược 60s
    if (isCoolingDown) {
      const remainingSec = Math.ceil((APP_CONFIG.rules.minFeedGapMs - elapsed) / 1000);
      UI.setButtonState({
        disabled: true,
        icon: '⏳',
        text: `Vui lòng chờ <span class="countdown-highlight">(${remainingSec}s)</span> cho lượt cho ăn tiếp theo`,
        countdownSec: 0,
        hintText: `⏳ Chống spam: Vui lòng đợi ${remainingSec}s`
      });
      return;
    }

    // Sẵn sàng
    UI.setButtonState({
      disabled: false,
      icon: '🍖',
      text: 'CHO ĂN NGAY',
      countdownSec: 0,
      hintText: '✅ Sẵn sàng xả hạt'
    });
  },

  /**
   * Bắt đầu đếm ngược 60s (Rule 1)
   */
  startCountdown(seconds) {
    if (this.state.countdownTimerId) {
      clearInterval(this.state.countdownTimerId);
    }

    let remaining = seconds;
    this.evaluateButtonState();

    this.state.countdownTimerId = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(this.state.countdownTimerId);
        this.state.countdownTimerId = null;
        this.evaluateButtonState();
        UI.addLog('INFO', 'Đã hết 60s giãn cách. Nút xả hạt đã sẵn sàng!');
      } else {
        UI.setButtonState({
          disabled: true,
          icon: '⏳',
          text: `Vui lòng chờ <span class="countdown-highlight">(${remaining}s)</span> cho lượt cho ăn tiếp theo`,
          countdownSec: 0,
          hintText: `⏳ Chống spam: Vui lòng đợi ${remaining}s`
        });
      }
    }, 1000);
  },

  /**
   * Khôi phục timestamp lần cho ăn từ localStorage
   */
  restoreLastFeedTime() {
    const saved = localStorage.getItem('pet_feeder_last_feed');
    if (saved) {
      const ts = parseInt(saved, 10);
      const elapsed = Date.now() - ts;
      if (elapsed < APP_CONFIG.rules.minFeedGapMs) {
        this.state.lastFeedTimestamp = ts;
        const remainingSec = Math.ceil((APP_CONFIG.rules.minFeedGapMs - elapsed) / 1000);
        this.startCountdown(remainingSec);
      }
    }
  },

  /**
   * Xử lý click nút CHO ĂN NGAY
   */
  async handleFeedClick() {
    const now = Date.now();
    const elapsed = now - this.state.lastFeedTimestamp;

    // Rule 1: Chống spam
    if (elapsed < APP_CONFIG.rules.minFeedGapMs) {
      const waitSec = Math.ceil((APP_CONFIG.rules.minFeedGapMs - elapsed) / 1000);
      UI.addLog('WARN', `Thao tác bị chặn: Vui lòng đợi thêm ${waitSec} giây!`);
      this.triggerHaptic('warning');
      return;
    }

    // Rule 3: Khóa trần
    if (this.state.feedsToday >= this.state.maxFeedsPerDay && this.state.maxFeedsPerDay > 0) {
      UI.addLog('WARN', 'Không thể xả hạt: Đã đạt tối đa số bữa trong ngày (6/6)!');
      alert('Đã đạt giới hạn số bữa trong ngày (6/6 bữa).');
      this.triggerHaptic('error');
      return;
    }

    // Gửi lệnh điều khiển MQTT
    try {
      await mqttService.publishControl('FEED_NOW');
      this.triggerHaptic('success');

      // Cập nhật timestamp & lưu trữ localStorage
      this.state.lastFeedTimestamp = now;
      localStorage.setItem('pet_feeder_last_feed', now.toString());

      // Tăng số bữa ăn hôm nay & cập nhật giao diện
      this.state.feedsToday += 1;
      UI.setMealStats(this.state.feedsToday, this.state.maxFeedsPerDay);

      // Kích hoạt đếm ngược 60 giây
      this.startCountdown(60);

      // Tự động tải lại lịch sử sau 1.5s để cập nhật lượt vừa cho ăn từ MySQL
      setTimeout(() => this.loadHistory(true), 1500);
    } catch (err) {
      this.triggerHaptic('error');
      alert('Không thể gửi lệnh: ' + err.message);
    }
  },

  /**
   * Đăng ký sự kiện giao diện
   */
  bindUiEvents() {
    // Nút xả hạt
    const btnFeed = document.getElementById('btnFeedNow');
    if (btnFeed) {
      btnFeed.addEventListener('click', () => this.handleFeedClick());
    }

    // Nút làm mới lịch sử từ MySQL
    const btnRefreshHistory = document.getElementById('btnRefreshHistory');
    if (btnRefreshHistory) {
      btnRefreshHistory.addEventListener('click', () => this.loadHistory());
    }

    // Nút mở modal Settings
    const btnOpenSettings = document.getElementById('btnOpenSettings');
    if (btnOpenSettings) {
      btnOpenSettings.addEventListener('click', () => {
        UI.openSettingsModal(APP_CONFIG);
      });
    }

    // Nút đóng modal Settings
    const btnCloseSettings = document.getElementById('btnCloseSettings');
    if (btnCloseSettings) {
      btnCloseSettings.addEventListener('click', () => {
        UI.closeSettingsModal();
      });
    }

    // Nút lưu cài đặt Broker & Reconnect
    const btnSaveSettings = document.getElementById('btnSaveSettings');
    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', () => {
        const newUrl = document.getElementById('inputBrokerUrl')?.value?.trim();
        const newUsername = document.getElementById('inputUsername')?.value?.trim();
        const newPassword = document.getElementById('inputPassword')?.value?.trim();

        if (!newUrl) {
          alert('Vui lòng nhập Broker URL!');
          return;
        }

        APP_CONFIG.brokerUrl = newUrl;
        APP_CONFIG.username = newUsername;
        APP_CONFIG.password = newPassword;

        saveConfig(APP_CONFIG);
        UI.closeSettingsModal();

        UI.addLog('INFO', 'Đã lưu cấu hình mới. Đang kết nối lại...');
        UI.setMqttStatus('connecting', 'MQTT: Đang kết nối...');
        mqttService.updateConnection(newUrl, newUsername, newPassword);
      });
    }

    // Nút Reset về mặc định
    const btnResetSettings = document.getElementById('btnResetSettings');
    if (btnResetSettings) {
      btnResetSettings.addEventListener('click', () => {
        localStorage.removeItem('pet_feeder_config');
        Object.assign(APP_CONFIG, DEFAULT_CONFIG);
        UI.openSettingsModal(APP_CONFIG);
        UI.addLog('INFO', 'Đã đặt lại cấu hình kết nối mặc định.');
      });
    }
  }
};

// Khởi chạy khi DOM load xong
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
