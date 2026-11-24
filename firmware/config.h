// config.h - toan bo hang so cau hinh cua may cho thu cung (PA1: SG90, cua truot)
#pragma once
#include <Arduino.h>

// ---- Che do ----
// Bo comment de chay mo phong (Wokwi): khong WiFi/Blynk.
// File wokwi/ duoc tao tu dong boi tools/sync_wokwi.sh (da bat SIM_MODE).
#define SIM_MODE
#define MQTT_MODE
// SIM_DEMO: trong SIM_MODE, 3 moc gio tu dong = bay gio +1, +2, +3 phut de xem servo chay ngay.
//#define SIM_DEMO
// SIM_RTC_DS1307: Wokwi khong co DS3231, dung DS1307 de mo phong (chi bat trong thu muc wokwi/).
#define SIM_RTC_DS1307

// ---- Chan GPIO (khop bang chan trong bao cao) ----
static const int PIN_SERVO = 18;   // PWM 50 Hz
static const int PIN_TRIG  = 25;   // HC-SR04 Trig (tranh GPIO 5 - strapping pin)
static const int PIN_ECHO  = 19;   // HC-SR04 Echo (qua phan ap 1k/2k -> 3.3V)
static const int PIN_SDA   = 21;   // DS3231
static const int PIN_SCL   = 22;   // DS3231
static const int PIN_BTN   = 4;    // Nut cho an tay (tuy chon, noi xuong GND)
static const int PIN_LED   = 2;    // LED onboard: sang khi dang xa hat

// ---- Cua truot SG90 ----
static const int      DOOR_CLOSED_DEG = 0;
static const int      DOOR_OPEN_DEG   = 90;
static const uint32_t DOOR_MOVE_MS    = 500;   // thoi gian cho servo ve vi tri roi cat PWM

// ---- Khau phan (thoi gian mo cua) ----
// Chi la dai luong thay the (proxy): phu thuoc do day phễu, do am, co hat.
// Phai hieu chuan bang can (xem docs/TESTING.md).
static const uint32_t PORTION_MIN_MS     = 1000;
static const uint32_t PORTION_MAX_MS     = 6000;
static const uint32_t PORTION_DEFAULT_MS = 2000;

// ---- An toan ----
static const uint32_t MIN_GAP_SEC  = 60;   // >= 60 s giua 2 lan cho an (tinh theo RTC)
static const int      MAX_PER_DAY  = 6;    // tran so lan / ngay (luu Flash)
static const int      GRACE_MIN    = 15;   // mat dien: bu bua neu tre <= 15 phut
static const int      NUM_SLOTS    = 3;    // Sang / Trua / Toi

// ---- Muc hat (HC-SR04) ----
static const float    EMPTY_CM     = 20.0f;  // khoang cach khi phễu rong
static const float    FULL_CM      = 3.0f;   // khoang cach khi phễu day (tranh vung chet < 2 cm)
static const int      LOW_PCT      = 20;     // duoi muc nay -> canh bao
static const int      RECOVER_PCT  = 30;     // len lai >= muc nay moi bao lai (tranh bao lap)
static const int      LEVEL_SAMPLES = 5; // trung binh 5 mau do
static const uint32_t SAMPLE_GAP_MS   = 40;
static const long     ECHO_TIMEOUT_US = 30000;
#ifdef SIM_MODE
static const uint32_t LEVEL_INTERVAL_MS = 5000;    // mo phong: 5 s cho de quan sat
#else
static const uint32_t LEVEL_INTERVAL_MS = 60000;   // thuc te: 60 s
#endif

// ---- Thoi gian ----
static const long TZ_OFFSET_SEC = 7 * 3600;        // GMT+7