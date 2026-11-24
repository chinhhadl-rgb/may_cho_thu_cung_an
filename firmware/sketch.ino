/*
 * MAY CHO THU CUNG AN TU DONG TU XA (PA1: servo SG90, cua truot, trong nha)
 * ESP32 DevKit V1 + HC-SR04 + DS3231 + SG90 + Blynk 2.0
 * Nhom 8: Pham Tri Tin, Le Quoc Thong, Ha Trieu Chinh
 *
 * Thu vien (Arduino IDE / Library Manager): Blynk, RTClib (Adafruit), ESP32Servo
 * Cau hinh WiFi/Blynk: sao chep secrets.h.example -> secrets.h
 * Xem README.md o thu muc goc de biet cach lap mach, tao template Blynk, chay mo phong.
 *
 * Cai tien so voi nguyen mau v10:
 *  - Servo khong dung delay(): loop() van chay (RTC, nut bam, Blynk) khi dang xa hat
 *  - Khoang cach 60 s tinh theo RTC va luu Flash -> van dung sau khi reset
 *  - Bo dem bua/ngay luu Flash -> reset khong lam vuot MAX_PER_DAY
 *  - Moi moc gio chay 1 lan/ngay, tu bu bua neu mat dien <= 15 phut
 *  - RTC mat gio (het pin): khoa lich cho toi khi dong bo NTP
 *  - Dieu chinh khau phan tu app (V7), lenh Serial de kiem thu
 */
#include "config.h"
#include "logic.h"
#include "clock.h"
#include "storage.h"
#include "feeder.h"
#include "level.h"
#include "scheduler.h"
#include "cloud.h"
#include "cli.h"


static void buttonTick() {
  static bool lastReading = HIGH;
  static bool stableState = HIGH;
  static uint32_t lastChange = 0;

  bool reading = digitalRead(PIN_BTN);
  uint32_t now = millis();

  if (reading != lastReading) {
    lastReading = reading;
    lastChange = now;
  }

  // Cho trang thai on dinh 40 ms
  if (now - lastChange >= 40 &&
      reading != stableState) {
    stableState = reading;

    // Chi xu ly khi nut chuyen tu tha sang bam
    if (stableState == LOW) {
      feedNow("nut");
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_BTN, INPUT_PULLUP);

  bool rtcOk = clockBegin();
  (void)rtcOk;                             // chi dung o che do that
  storageLoad();

#ifdef SIM_MODE
  if (clockLostPower()) clockSetCompileTime();
  S.timeOk = true;
#else
  if (!rtcOk) {
    S.timeOk = false;
    Serial.println("[time] LOI: khong thay DS3231 (kiem tra day I2C). Lich bi khoa, chi cho an tay.");
  } else if (clockLostPower()) {           // het pin CR2032 / mat nguon hoan toan
    clockSetCompileTime();                 // tam thoi cho dong ho chay, se chinh lai bang NTP
    S.timeOk = false; saveTimeOk();
    Serial.println("[time] RTC mat gio: khoa lich cho toi khi dong bo NTP. Kiem tra pin CR2032.");
  }
#endif

#if defined(SIM_MODE) && defined(SIM_DEMO)
  uint32_t t0 = nowUnix();                 // 3 moc = bay gio +1, +2, +3 phut
  for (int i = 0; i < NUM_SLOTS; i++) {
    int mod = minuteOfDay(t0 + 60UL * (i + 1));
    S.slot[i].h = (int8_t)(mod / 60); S.slot[i].m = (int8_t)(mod % 60);
    S.slot[i].enabled = true; S.slot[i].doneDay = 0;
  }
#endif

  feederBegin();
  cloudBegin();
  Serial.println("\n=== MAY CHO THU CUNG AN TU DONG (PA1) ===");
  printStatus();
  Serial.println("Go 'help' de xem lenh.");
}

void loop() {
  cloudTick();       // WiFi/Blynk/NTP, khong chan khi mat mang
  feederTick();      // may trang thai cua truot
  schedulerTick();   // lich theo RTC + Flash, chay ca khi offline
  levelTick();       // do muc hat, loc trung vi
  buttonTick();
  cliTick();
}
