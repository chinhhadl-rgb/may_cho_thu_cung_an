// cloud.h - Wi-Fi, MQTT/EMQX TLS, NTP va JSON
#pragma once

#include "hooks.h"

#if defined(MQTT_MODE)

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <MQTT.h>
#include <ArduinoJson.h>
#include <time.h>
#include <string.h>

#include "mqtt_secrets.h"
#include "emqx_ca.h"

// ================== MQTT CONFIG ==================

static const char MQTT_DEVICE_ID[] = "esp32-feeder-01";

static const char TOPIC_SENSOR[]  = "petfeeder/sensor";
static const char TOPIC_CONTROL[] = "petfeeder/control";
static const char TOPIC_STATUS[]  = "petfeeder/status";

static const char WIFI_SSID[] = "Wokwi-GUEST";
static const char WIFI_PASS[] = "";
static const int WIFI_CHANNEL = 6;

static const uint32_t WIFI_CONNECT_TIMEOUT_MS = 30000UL;
static const uint32_t WIFI_RETRY_INTERVAL_MS  = 30000UL;
static const uint32_t WIFI_LOG_INTERVAL_MS    = 2000UL;
static const uint32_t MQTT_RETRY_INTERVAL_MS  = 5000UL;

static WiFiClientSecure mqttNet;
static MQTTClient mqttClient(512);

static uint32_t mqttLastTry = 0;
static uint32_t wifiNextTry = 0;
static uint32_t wifiAttemptStarted = 0;
static uint32_t wifiStatusLogNext = 0;
static uint32_t ntpNext = 0;

static bool mqttAttempted = false;
static bool wifiWasConnected = false;
static bool mqttWasConnected = false;
static bool ntpStarted = false;
static volatile bool wifiNeedReconnect = false;
static volatile int wifiDisconnectReason = 0;

static int cloudLastLevel = -1;

// ================== COMMAND QUEUE ==================

enum CloudCommandKind : uint8_t {
  CMD_NONE,
  CMD_FEED_NOW,
  CMD_BAD_JSON,
  CMD_MISSING_ID,
  CMD_UNKNOWN
};

static CloudCommandKind pendingKind = CMD_NONE;
static char pendingRequestId[64] = "";
static char pendingCommand[32] = "";
static char lastHandledRequestId[64] = "";

// ================== TIMESTAMP ==================

static void cloudTimestamp(char *buffer, size_t size) {
  DateTime t(nowUnix());

  snprintf(
    buffer,
    size,
    "%04d-%02d-%02dT%02d:%02d:%02d+07:00",
    t.year(), t.month(), t.day(),
    t.hour(), t.minute(), t.second()
  );
}

// ================== PUBLISH STATUS ==================

static void cloudPublishStatus(
  const char *status,
  const char *requestId = nullptr,
  const char *detail = nullptr,
  bool retained = false
) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<320> doc;
  doc["device_id"] = MQTT_DEVICE_ID;
  doc["status"] = status;
  doc["feeds_today"] = fedTodayNow();
  doc["max_feeds_per_day"] = MAX_PER_DAY;

  if (requestId && requestId[0]) {
    doc["request_id"] = requestId;
  }

  if (detail && detail[0]) {
    doc["detail"] = detail;
  }

  char timestamp[32];
  cloudTimestamp(timestamp, sizeof(timestamp));
  doc["timestamp"] = timestamp;

  String payload;
  serializeJson(doc, payload);

  if (!mqttClient.publish(TOPIC_STATUS, payload, retained, 1)) {
    Serial.println("[mqtt] Loi publish status");
  }
}

// ================== PUBLISH SENSOR DATA ==================

static void cloudPublishTelemetry() {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<384> doc;
  doc["device_id"] = MQTT_DEVICE_ID;
  doc["event_type"] = "sensor_update";
  doc["sensor_ok"] = (cloudLastLevel >= 0);

  if (cloudLastLevel >= 0) {
    doc["level_pct"] = cloudLastLevel;
  } else {
    doc["level_pct"] = nullptr;
  }

  doc["servo_busy"] = feederBusy();
  doc["feeds_today"] = fedTodayNow();
  doc["max_feeds_per_day"] = MAX_PER_DAY;
  doc["portion_ms"] = S.portionMs;
  doc["wifi_rssi"] = WiFi.RSSI();

  char timestamp[32];
  cloudTimestamp(timestamp, sizeof(timestamp));
  doc["timestamp"] = timestamp;

  String payload;
  serializeJson(doc, payload);

  if (!mqttClient.publish(TOPIC_SENSOR, payload, false, 1)) {
    Serial.println("[mqtt] Loi publish sensor");
  }
}

// ================== MQTT MESSAGE CALLBACK ==================
// Callback chi doc va xep lenh; khong dieu khien servo truc tiep.

static void cloudOnMessage(String &topic, String &payload) {
  if (topic != TOPIC_CONTROL) return;

  if (pendingKind != CMD_NONE) {
    Serial.println("[mqtt] Bo qua lenh: dang xu ly lenh truoc");
    return;
  }

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, payload);

  pendingRequestId[0] = '\0';
  pendingCommand[0] = '\0';

  if (err) {
    pendingKind = CMD_BAD_JSON;
    return;
  }

  const char *requestId = doc["request_id"] | "";
  const char *command = doc["command"] | "";

  if (!requestId[0]) {
    pendingKind = CMD_MISSING_ID;
    return;
  }

  strncpy(pendingRequestId, requestId, sizeof(pendingRequestId) - 1);
  pendingRequestId[sizeof(pendingRequestId) - 1] = '\0';

  strncpy(pendingCommand, command, sizeof(pendingCommand) - 1);
  pendingCommand[sizeof(pendingCommand) - 1] = '\0';

  pendingKind = (strcmp(command, "FEED_NOW") == 0)
                  ? CMD_FEED_NOW
                  : CMD_UNKNOWN;
}

// ================== HANDLE COMMAND ==================

static void cloudProcessCommand() {
  if (pendingKind == CMD_NONE) return;

  CloudCommandKind kind = pendingKind;
  pendingKind = CMD_NONE;

  if (kind == CMD_BAD_JSON) {
    cloudPublishStatus("rejected", nullptr, "invalid_json");
    Serial.println("[mqtt] Tu choi: JSON khong hop le");
    return;
  }

  if (kind == CMD_MISSING_ID) {
    cloudPublishStatus("rejected", nullptr, "missing_request_id");
    Serial.println("[mqtt] Tu choi: thieu request_id");
    return;
  }

  if (kind == CMD_UNKNOWN) {
    cloudPublishStatus("rejected", pendingRequestId, "unsupported_command");
    Serial.printf("[mqtt] Lenh khong ho tro: %s\n", pendingCommand);
    return;
  }

  // Chan request_id lap lien tiep gan nhat.
  if (strcmp(pendingRequestId, lastHandledRequestId) == 0) {
    cloudPublishStatus(
      "duplicate_ignored",
      pendingRequestId,
      "request_id_already_processed"
    );
    Serial.println("[mqtt] Bo qua request_id trung");
    return;
  }

  strncpy(lastHandledRequestId, pendingRequestId, sizeof(lastHandledRequestId) - 1);
  lastHandledRequestId[sizeof(lastHandledRequestId) - 1] = '\0';

  // Dung logic an toan hien co cua may.
  FeedResult result = feedNow("mqtt");

  if (result == FEED_OK) {
    cloudPublishStatus("feeding_started", pendingRequestId, "command_accepted");
  } else {
    cloudPublishStatus("rejected", pendingRequestId, resultText(result));
  }
}

// ================== NTP -> RTC ==================

static void cloudNtpTick() {
  if (!ntpStarted) {
    configTime(0, 0, "pool.ntp.org", "time.google.com");
    ntpStarted = true;
  }

  if (ntpNext != 0 && (int32_t)(millis() - ntpNext) < 0) return;

  time_t utcNow = time(nullptr);
  if (utcNow < 1700000000) {
    ntpNext = millis() + 2000UL;
    return;
  }

  // RTC cua project luu gio dia phuong GMT+7.
  clockSet((uint32_t)(utcNow + TZ_OFFSET_SEC));

  if (!S.timeOk) {
    S.timeOk = true;
    saveTimeOk();
    Serial.println("[time] Da dong bo NTP, mo khoa lich");
  }

  ntpNext = millis() + 24UL * 3600UL * 1000UL;
}

// ================== PUBLIC CLOUD HOOKS ==================

void cloudOnFed() {
  cloudPublishTelemetry();
}

void cloudOnLevel(int pct) {
  cloudLastLevel = pct;
  cloudPublishTelemetry();
}

void cloudOnLow(int pct) {
  Serial.printf("[level] CANH BAO het hat: %d%%\n", pct);
  cloudPublishStatus("low_food", nullptr, "low_food_threshold");
}

// ================== START NETWORK ==================

inline void cloudBegin() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);

  // Theo doi su kien Wi-Fi de biet nguyen nhan mat ket noi.
  WiFi.onEvent([](WiFiEvent_t event, WiFiEventInfo_t info) {
    if (event == ARDUINO_EVENT_WIFI_STA_CONNECTED) {
      Serial.println("[wifi-event] Da ket noi access point");
    }
    else if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP) {
      Serial.print("[wifi-event] Da nhan IP: ");
      Serial.println(WiFi.localIP());
      wifiNeedReconnect = false;
    }
    else if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
      wifiDisconnectReason = info.wifi_sta_disconnected.reason;
      wifiNeedReconnect = true;
      Serial.printf(
        "[wifi-event] Mat ket noi, reason=%d\n",
        (int)wifiDisconnectReason
      );
    }
  });

  // Xac minh may chu EMQX bang CA certificate.
  mqttNet.setCACert(EMQX_CA_CERT);
  mqttClient.begin(MQTT_HOST, MQTT_PORT, mqttNet);
  mqttClient.onMessage(cloudOnMessage);
  mqttClient.setOptions(30, true, 1000);
  mqttClient.setWill(
    TOPIC_STATUS,
    "{\"device_id\":\"esp32-feeder-01\",\"status\":\"offline\"}",
    true,
    1
  );

  Serial.println("[wifi] Dang ket noi Wokwi-GUEST...");
  wifiAttemptStarted = millis();
  wifiNextTry = wifiAttemptStarted + WIFI_CONNECT_TIMEOUT_MS;
  wifiNeedReconnect = false;
  WiFi.begin(WIFI_SSID, WIFI_PASS, WIFI_CHANNEL);
}

// ================== MAIN CLOUD LOOP ==================

inline void cloudTick() {
  uint32_t now = millis();
  wl_status_t wifiStatus = WiFi.status();

  // ----- Wi-Fi disconnected / reconnect -----
  if (wifiStatus != WL_CONNECTED) {
    if (wifiWasConnected) {
      wifiWasConnected = false;
      wifiNeedReconnect = true;
      mqttAttempted = false;
      mqttWasConnected = false;

      Serial.println("[wifi] Mat ket noi Wi-Fi");
      if (mqttClient.connected()) mqttClient.disconnect();
    }

    // In trang thai moi 2 giay de khong tran Serial Monitor.
    if ((int32_t)(now - wifiStatusLogNext) >= 0) {
      wifiStatusLogNext = now + WIFI_LOG_INTERVAL_MS;
      Serial.printf("[wifi] status=%d\n", (int)wifiStatus);
    }

    bool connectTimedOut =
      (uint32_t)(now - wifiAttemptStarted) >= WIFI_CONNECT_TIMEOUT_MS;
    bool retryTimeReached =
      (int32_t)(now - wifiNextTry) >= 0;

    // Khong goi WiFi.begin() lien tuc khi status dang cho (0).
    // Thu lai khi co su kien disconnect hoac da het thoi gian cho.
    if ((wifiNeedReconnect || connectTimedOut) && retryTimeReached) {
      wifiNeedReconnect = false;
      wifiAttemptStarted = now;
      wifiNextTry = now + WIFI_RETRY_INTERVAL_MS;

      Serial.println("[wifi] Dang thu ket noi lai Wokwi-GUEST...");
      // Goi lai begin ma khong chu dong ngat Wi-Fi, tranh tao reason=8 lien tuc.
      WiFi.begin(WIFI_SSID, WIFI_PASS, WIFI_CHANNEL);
    }

    return;
  }

  // ----- Wi-Fi connected -----
  if (!wifiWasConnected) {
    wifiWasConnected = true;
    wifiNeedReconnect = false;
    mqttAttempted = false;

    Serial.print("[wifi] Da ket noi. IP=");
    Serial.println(WiFi.localIP());
  }

  cloudNtpTick();

  // ----- Maintain MQTT session -----
  if (mqttClient.connected()) {
    mqttWasConnected = true;
    mqttClient.loop();
    cloudProcessCommand();
    return;
  }

  if (mqttWasConnected) {
    mqttWasConnected = false;
    Serial.println("[mqtt] Mat ket noi MQTT; se thu ket noi lai");
  }

  // Tranh bat dau ket noi MQTT khi servo dang chay.
  if (feederBusy()) return;

  if (
    mqttAttempted &&
    (uint32_t)(now - mqttLastTry) < MQTT_RETRY_INTERVAL_MS
  ) {
    return;
  }

  mqttAttempted = true;
  mqttLastTry = now;

  Serial.println("[mqtt] Dang ket noi EMQX...");

  if (mqttClient.connect(MQTT_DEVICE_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
    mqttWasConnected = true;
    Serial.println("[mqtt] CONNECTED");

    // Moi phien MQTT can subscribe lai topic dieu khien.
    if (mqttClient.subscribe(TOPIC_CONTROL, 1)) {
      Serial.println("[mqtt] Da subscribe petfeeder/control QoS 1");
    } else {
      Serial.println("[mqtt] Loi subscribe control");
    }

    cloudPublishStatus("online", nullptr, "mqtt_connected", true);
    cloudPublishTelemetry();
  } else {
    Serial.printf(
      "[mqtt] Ket noi that bai, ma loi=%d\n",
      (int)mqttClient.lastError()
    );
  }
}

#else  // MQTT_MODE is not defined

#if defined(SIM_MODE)

// Che do mo phong offline, khong ket noi mang.
inline void cloudBegin() {
  Serial.println("[cloud] SIM_MODE: offline, khong ket noi MQTT");
}

inline void cloudTick() {}
void cloudOnFed() {}

void cloudOnLevel(int pct) {
  Serial.printf("[level] Muc hat: %d%%\n", pct);
}

void cloudOnLow(int pct) {
  Serial.printf(
    "[level] CANH BAO: sap het hat (%d%% < %d%%)\n",
    pct,
    LOW_PCT
  );
}

#else
#error "Hay define MQTT_MODE de ket noi EMQX hoac SIM_MODE de chay offline"
#endif  // defined(SIM_MODE)

#endif  // defined(MQTT_MODE)