/**
 * UI.JS - Quản lý giao diện, hiển thị Gauge, Thẻ thống kê và Live Logs
 */

const UI = {
  // DOM Elements
  elements: {
    mqttStatusDot: document.getElementById('mqttStatusDot'),
    mqttStatusText: document.getElementById('mqttStatusText'),
    dbStatusDot: document.getElementById('dbStatusDot'),
    dbStatusText: document.getElementById('dbStatusText'),
    deviceStatusBadge: document.getElementById('deviceStatusBadge'),
    deviceStatusDot: document.getElementById('deviceStatusDot'),
    deviceStatusText: document.getElementById('deviceStatusText'),
    deviceSubtitle: document.getElementById('deviceSubtitle'),
    wifiSignalBars: document.getElementById('wifiSignalBars'),
    wifiRssiText: document.getElementById('wifiRssiText'),
    alertBanner: document.getElementById('alertBanner'),
    alertLevelText: document.getElementById('alertLevelText'),
    foodPercent: document.getElementById('foodPercent'),
    gaugeProgressCircle: document.getElementById('gaugeProgressCircle'),
    gaugeStatusText: document.getElementById('gaugeStatusText'),
    gaugeIcon: document.getElementById('gaugeIcon'),
    mealCountText: document.getElementById('mealCountText'),
    mealProgressFill: document.getElementById('mealProgressFill'),
    mealLimitNotice: document.getElementById('mealLimitNotice'),
    sensorStatusValue: document.getElementById('sensorStatusValue'),
    lastUpdatedTime: document.getElementById('lastUpdatedTime'),
    btnFeedNow: document.getElementById('btnFeedNow'),
    btnFeedText: document.getElementById('btnFeedText'),
    btnFeedCountdown: document.getElementById('btnFeedCountdown'),
    controlStatusHint: document.getElementById('controlStatusHint'),
    logConsole: document.getElementById('logConsole'),
    
    // Lịch sử MySQL
    historyList: document.getElementById('historyList'),
    historyCountBadge: document.getElementById('historyCountBadge'),
    tabFeedHistory: document.getElementById('tabFeedHistory'),
    tabSensorHistory: document.getElementById('tabSensorHistory'),
    tabFeedCount: document.getElementById('tabFeedCount'),
    tabSensorCount: document.getElementById('tabSensorCount'),
    btnRefreshHistory: document.getElementById('btnRefreshHistory'),

    // Modal Cấu hình
    settingsModal: document.getElementById('settingsModal'),
    inputBrokerUrl: document.getElementById('inputBrokerUrl'),
    inputUsername: document.getElementById('inputUsername'),
    inputPassword: document.getElementById('inputPassword')
  },

  // Thêm bản ghi log thời gian thực
  addLog(type, message) {
    const consoleEl = this.elements.logConsole;
    if (!consoleEl) return;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `
      <span class="log-time">[${timeStr}]</span>
      <span class="log-badge ${type.toLowerCase()}">${type}</span>
      <span class="log-msg">${this.escapeHtml(message)}</span>
    `;

    consoleEl.appendChild(item);
    consoleEl.scrollTop = consoleEl.scrollHeight;

    // Giữ tối đa 100 log items
    if (consoleEl.childNodes.length > 100) {
      consoleEl.removeChild(consoleEl.firstChild);
    }
  },

  clearLogs() {
    if (this.elements.logConsole) {
      this.elements.logConsole.innerHTML = '';
      this.addLog('INFO', 'Đã làm sạch nhật ký.');
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Cập nhật trạng thái Broker MQTT
  setMqttStatus(status, text) {
    const { mqttStatusDot, mqttStatusText } = this.elements;
    if (mqttStatusDot) mqttStatusDot.className = `status-dot ${status}`;
    if (mqttStatusText) mqttStatusText.innerText = text;
  },

  // Cập nhật trạng thái Cơ sở dữ liệu MySQL XAMPP
  setDbStatus(status, text) {
    const { dbStatusDot, dbStatusText } = this.elements;
    if (dbStatusDot) dbStatusDot.className = `status-dot ${status}`;
    if (dbStatusText) dbStatusText.innerText = text;
  },

  // Cập nhật trạng thái thiết bị ESP32
  setDeviceStatus(isOnline, deviceId = 'esp32-feeder-01') {
    const { deviceSubtitle, deviceStatusDot, deviceStatusText, deviceStatusBadge } = this.elements;
    if (deviceSubtitle) deviceSubtitle.innerText = `ID: ${deviceId}`;

    if (isOnline) {
      if (deviceStatusDot) deviceStatusDot.className = 'status-dot online';
      if (deviceStatusText) deviceStatusText.innerText = 'ESP32 Online';
      if (deviceStatusBadge) deviceStatusBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else {
      if (deviceStatusDot) deviceStatusDot.className = 'status-dot offline';
      if (deviceStatusText) deviceStatusText.innerText = 'ESP32 Offline';
      if (deviceStatusBadge) deviceStatusBadge.style.borderColor = 'rgba(244, 63, 94, 0.4)';
    }
  },

  // Cập nhật cường độ sóng Wi-Fi RSSI
  setWifiRssi(rssi) {
    const { wifiRssiText, wifiSignalBars } = this.elements;
    if (wifiRssiText) wifiRssiText.innerText = `${rssi} dBm`;
    if (!wifiSignalBars) return;

    wifiSignalBars.className = 'wifi-signal';
    if (rssi >= -60) {
      wifiSignalBars.classList.add('wifi-good');
    } else if (rssi >= -75) {
      wifiSignalBars.classList.add('wifi-fair');
    } else if (rssi >= -90) {
      wifiSignalBars.classList.add('wifi-weak');
    } else {
      wifiSignalBars.classList.add('wifi-none');
    }
  },

  // Cập nhật cảm biến HC-SR04
  setSensorStatus(isOk) {
    const { sensorStatusValue } = this.elements;
    if (!sensorStatusValue) return;
    if (isOk) {
      sensorStatusValue.innerHTML = '<span class="sensor-ok">● BÌNH THƯỜNG</span>';
    } else {
      sensorStatusValue.innerHTML = '<span class="sensor-error">⚠️ LỖI ĐO</span>';
    }
  },

  // Cập nhật vòng quay Gauge thức ăn
  setFoodGauge(pct) {
    const { foodPercent, gaugeProgressCircle, gaugeStatusText, gaugeIcon } = this.elements;
    if (foodPercent) foodPercent.innerText = `${pct}%`;

    // Chu vi hình tròn r=90: 2 * PI * 90 = ~565.48
    const circumference = 565.48;
    const offset = circumference - (pct / 100) * circumference;
    if (gaugeProgressCircle) {
      gaugeProgressCircle.style.strokeDashoffset = offset;
      gaugeProgressCircle.classList.remove('danger', 'warning', 'good');

      if (pct < 20) {
        gaugeProgressCircle.classList.add('danger');
        if (gaugeStatusText) {
          gaugeStatusText.innerText = 'Cạn Thức Ăn';
          gaugeStatusText.style.color = 'var(--accent-rose)';
        }
        if (gaugeIcon) gaugeIcon.innerText = '⚠️';
      } else if (pct < 50) {
        gaugeProgressCircle.classList.add('warning');
        if (gaugeStatusText) {
          gaugeStatusText.innerText = 'Còn Khá Ít';
          gaugeStatusText.style.color = 'var(--accent-amber)';
        }
        if (gaugeIcon) gaugeIcon.innerText = '🥣';
      } else {
        gaugeProgressCircle.classList.add('good');
        if (gaugeStatusText) {
          gaugeStatusText.innerText = 'Dồi Dào';
          gaugeStatusText.style.color = 'var(--accent-emerald)';
        }
        if (gaugeIcon) gaugeIcon.innerText = '🍖';
      }
    }
  },

  // Hiển thị / Ẩn banner cảnh báo cạn hạt (Rule 2)
  setFoodAlertBanner(showAlert, pct) {
    const { alertBanner, alertLevelText } = this.elements;
    if (!alertBanner) return;

    if (showAlert) {
      alertBanner.classList.add('active');
      if (alertLevelText) alertLevelText.innerText = pct;
    } else {
      alertBanner.classList.remove('active');
    }
  },

  // Cập nhật thống kê bữa ăn (Rule 3)
  setMealStats(feedsToday, maxFeeds) {
    const { mealCountText, mealProgressFill, mealLimitNotice } = this.elements;
    if (mealCountText) mealCountText.innerText = `${feedsToday} / ${maxFeeds}`;

    const pct = Math.min(100, Math.round((feedsToday / maxFeeds) * 100));
    if (mealProgressFill) {
      mealProgressFill.style.width = `${pct}%`;
      if (feedsToday >= maxFeeds) {
        mealProgressFill.classList.add('full');
      } else {
        mealProgressFill.classList.remove('full');
      }
    }

    if (mealLimitNotice) {
      if (feedsToday >= maxFeeds) {
        mealLimitNotice.innerHTML = '<span style="color: var(--accent-rose); font-weight:700;">⚠️ Đã đạt giới hạn hôm nay</span>';
      } else {
        mealLimitNotice.innerText = `Định mức tối đa: ${maxFeeds} bữa/ngày`;
      }
    }
  },

  // Cập nhật thời gian nhận dữ liệu cuối
  setLastUpdated(timeStr) {
    if (this.elements.lastUpdatedTime) {
      this.elements.lastUpdatedTime.innerText = `Cập nhật: ${timeStr}`;
    }
  },

  // Cập nhật trạng thái nút bấm CHO ĂN NGAY
  setButtonState({ disabled, text, countdownSec = 0, hintText = '', icon = '🍖' }) {
    const { btnFeedNow, btnFeedText, btnFeedCountdown, controlStatusHint } = this.elements;
    const btnFeedIcon = document.getElementById('btnFeedIcon');

    if (btnFeedNow) btnFeedNow.disabled = disabled;
    if (btnFeedIcon) btnFeedIcon.innerText = icon;
    if (btnFeedText) btnFeedText.innerHTML = text;
    
    if (btnFeedCountdown) {
      if (countdownSec > 0) {
        btnFeedCountdown.style.display = 'inline-block';
        btnFeedCountdown.innerText = `${countdownSec}s`;
      } else {
        btnFeedCountdown.style.display = 'none';
      }
    }

    if (controlStatusHint) {
      controlStatusHint.innerText = hintText;
    }
  },

  // Modal Settings
  openSettingsModal(config) {
    const { settingsModal, inputBrokerUrl, inputUsername, inputPassword } = this.elements;
    if (inputBrokerUrl) inputBrokerUrl.value = config.brokerUrl;
    if (inputUsername) inputUsername.value = config.username;
    if (inputPassword) inputPassword.value = config.password;
    if (settingsModal) settingsModal.classList.add('active');
  },

  closeSettingsModal() {
    if (this.elements.settingsModal) {
      this.elements.settingsModal.classList.remove('active');
    }
  },

  // Định dạng ngày giờ chuẩn hiển thị
  formatDateTime(dateStr) {
    if (!dateStr) return '--:--:--';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${mins}:${secs} - ${day}/${month}/${year}`;
    } catch (e) {
      return String(dateStr);
    }
  },

  // Chuyển đổi mã nguồn phát lệnh thành tên tiếng Việt thân thiện
  formatSource(source) {
    switch ((source || '').toLowerCase()) {
      case 'web_custom_app':
      case 'web_app':
        return '🌐 Web Dashboard';
      case 'nut':
      case 'nut_bam':
      case 'esp32_button':
        return '🔘 Nút Bấm ESP32';
      case 'scheduler':
      case 'schedule':
        return '⏰ Hẹn Giờ Tự Động';
      case 'telegram_bot':
      case 'telegram':
        return '🤖 Telegram Bot';
      case 'backend_api':
        return '⚡ REST API';
      default:
        return source ? `📱 ${source}` : '📱 Khác';
    }
  },

  // Hiển thị danh sách Lịch Sử Cho Ăn (feeding_logs)
  renderFeedingHistory(items = []) {
    const { historyList, historyCountBadge, tabFeedCount } = this.elements;
    if (!historyList) return;

    if (historyCountBadge) historyCountBadge.innerText = `${items.length} lần cho ăn`;
    if (tabFeedCount) tabFeedCount.innerText = String(items.length);

    if (!items || items.length === 0) {
      historyList.innerHTML = `
        <div class="history-empty">
          <span class="empty-icon">🥣</span>
          <span>Chưa có lịch sử xả hạt nào được ghi nhận trong MySQL.</span>
          <span style="font-size:0.7rem; color:var(--text-dim);">Bấm "CHO ĂN NGAY" để tạo lượt đầu tiên!</span>
        </div>
      `;
      return;
    }

    historyList.innerHTML = items.map((item, index) => {
      const isSuccess = (item.status === 'SUCCESS');
      const statusClass = isSuccess ? 'success' : 'rejected';
      const statusText = isSuccess ? '✅ Thành công' : '⛔ Bị từ chối';
      const itemClass = isSuccess ? 'history-item' : 'history-item rejected';
      const timeFormatted = this.formatDateTime(item.created_at);
      const sourceFormatted = this.formatSource(item.source);
      const durationSec = (item.duration_ms ? (item.duration_ms / 1000).toFixed(1) : '2.0');
      const noteText = item.note || (isSuccess ? `Mở cửa hạt ${durationSec}s` : 'Vi phạm quy tắc');

      return `
        <div class="${itemClass}">
          <div class="history-row-top">
            <span class="history-time">
              <span>⏱️</span>
              <span>${timeFormatted}</span>
            </span>
            <span class="history-status-tag ${statusClass}">${statusText}</span>
          </div>
          <div class="history-row-bottom">
            <span class="history-source">${sourceFormatted}</span>
            <span class="history-note">Mở: ${durationSec}s • ${this.escapeHtml(noteText)}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  // Hiển thị danh sách Lịch Sử Cảm Biến (sensor_logs)
  renderSensorHistory(items = []) {
    const { historyList, historyCountBadge, tabSensorCount } = this.elements;
    if (!historyList) return;

    if (historyCountBadge) historyCountBadge.innerText = `${items.length} bản ghi đo`;
    if (tabSensorCount) tabSensorCount.innerText = String(items.length);

    if (!items || items.length === 0) {
      historyList.innerHTML = `
        <div class="history-empty">
          <span class="empty-icon">📡</span>
          <span>Chưa có dữ liệu cảm biến định kỳ nào trong MySQL.</span>
        </div>
      `;
      return;
    }

    historyList.innerHTML = items.map(item => {
      const level = Number(item.level_pct) || 0;
      const feeds = item.feeds_today !== undefined ? item.feeds_today : '--';
      const maxFeeds = item.max_feeds_per_day || 6;
      const rssi = item.wifi_rssi !== undefined ? `${item.wifi_rssi} dBm` : '--';
      const isOk = (item.sensor_ok === 1 || item.sensor_ok === true);
      const sensorTag = isOk ? '<span style="color:var(--accent-emerald)">● HC-SR04 OK</span>' : '<span style="color:var(--accent-rose)">⚠️ Lỗi cảm biến</span>';
      const timeFormatted = this.formatDateTime(item.created_at);

      return `
        <div class="history-item sensor-item">
          <div class="history-row-top">
            <span class="history-time">
              <span>⏱️</span>
              <span>${timeFormatted}</span>
            </span>
            <span style="font-size:0.75rem; font-weight:700; color:var(--accent-cyan); font-family:'JetBrains Mono';">
              🥣 ${level}% Thức ăn
            </span>
          </div>
          <div class="history-row-bottom">
            <span>Đã ăn: <strong>${feeds}/${maxFeeds} bữa</strong></span>
            <span>📶 ${rssi} • ${sensorTag}</span>
          </div>
        </div>
      `;
    }).join('');
  }
};
