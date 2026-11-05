/**
 * MQTT-SERVICE.JS - Quản lý kết nối, đăng ký và phát bản tin MQTT qua WebSocket
 */

class MqttService {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.isConnected = false;
    this.listeners = {
      connect: [],
      error: [],
      close: [],
      reconnect: [],
      sensorData: [],
      statusData: [],
      log: []
    };
  }

  // Đăng ký event callback
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  // Phát tín hiệu nội bộ
  emit(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try { cb(...args); } catch (e) { console.error(`Error in event listener ${event}:`, e); }
      });
    }
  }

  log(type, message) {
    this.emit('log', type, message);
  }

  // Khởi tạo kết nối
  connect() {
    const mqttLib = window.mqtt || mqtt;
    if (!mqttLib || typeof mqttLib.connect !== 'function') {
      this.log('ERROR', 'Thư viện MQTT.js chưa được nạp vào trang!');
      this.emit('error', new Error('MQTT library missing'));
      return;
    }

    if (this.client) {
      try { this.client.end(true); } catch (e) {}
    }

    this.log('INFO', `Kết nối Broker: ${this.config.brokerUrl}`);
    this.log('INFO', `Client ID: ${this.config.clientId}`);

    const options = {
      clientId: this.config.clientId,
      username: this.config.username,
      password: this.config.password,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 4000,
      keepalive: 60,
      protocolVersion: 4 // MQTT 3.1.1 chuẩn cho EMQX WebSocket
    };

    try {
      this.client = mqttLib.connect(this.config.brokerUrl, options);

      this.client.on('connect', () => {
        this.isConnected = true;
        this.log('INFO', 'Đã kết nối thành công tới EMQX Cloud!');
        this.emit('connect');

        // Tự động subscribe các topic cảm biến & trạng thái
        const subTopics = [this.config.topics.sensor, this.config.topics.status];
        this.client.subscribe(subTopics, { qos: 1 }, (err, granted) => {
          if (err) {
            this.log('ERROR', `Lỗi Subscribe: ${err.message}`);
          } else {
            granted.forEach(g => {
              this.log('INFO', `Đã Sub: ${g.topic} (QoS ${g.qos})`);
            });
          }
        });
      });

      this.client.on('message', (topic, payload) => {
        const payloadStr = payload.toString();
        try {
          const data = JSON.parse(payloadStr);
          if (topic === this.config.topics.sensor) {
            this.log('RECV', `Sensor: ${payloadStr}`);
            this.emit('sensorData', data);
          } else if (topic === this.config.topics.status) {
            this.log('RECV', `Status: ${payloadStr}`);
            this.emit('statusData', data);
          } else {
            this.log('RECV', `[${topic}]: ${payloadStr}`);
          }
        } catch (e) {
          this.log('WARN', `Dữ liệu không phải JSON hợp lệ từ ${topic}: ${payloadStr}`);
        }
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        const errMsg = err?.message || 'Không thể thiết lập kết nối WebSocket';
        this.log('ERROR', `MQTT Error: ${errMsg}`);
        this.emit('error', err);
      });

      this.client.on('close', () => {
        if (this.isConnected) {
          this.isConnected = false;
          this.log('WARN', 'Mất kết nối tới Broker, đang tự động thử lại...');
          this.emit('close');
        }
      });

      this.client.on('reconnect', () => {
        this.emit('reconnect');
      });

    } catch (err) {
      this.log('ERROR', `Lỗi khởi tạo MQTT client: ${err.message}`);
      this.emit('error', err);
    }
  }

  // Gửi lệnh điều khiển xả hạt (QoS 1)
  publishControl(command = 'FEED_NOW') {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.client) {
        const err = new Error('Chưa kết nối tới MQTT Broker');
        this.log('ERROR', err.message);
        return reject(err);
      }

      const timestamp = Date.now();
      const requestId = `web-feed-${timestamp}`;
      const payload = {
        command: command,
        request_id: requestId,
        source: 'web_custom_app'
      };

      const payloadStr = JSON.stringify(payload);
      const topic = this.config.topics.control;

      this.client.publish(topic, payloadStr, { qos: 1 }, (err) => {
        if (err) {
          this.log('ERROR', `Gửi lệnh thất bại: ${err.message}`);
          reject(err);
        } else {
          this.log('SENT', `[Control QoS 1] -> ${topic}: ${payloadStr}`);
          resolve({ requestId, timestamp, payload });
        }
      });
    });
  }

  // Kết nối lại với cấu hình mới
  updateConnection(newBrokerUrl, newUsername, newPassword) {
    this.config.brokerUrl = newBrokerUrl;
    this.config.username = newUsername;
    this.config.password = newPassword;
    this.connect();
  }
}

// Khởi tạo mqttService toàn cục
const mqttService = new MqttService(APP_CONFIG);
