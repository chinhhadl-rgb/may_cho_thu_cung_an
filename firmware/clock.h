// clock.h - RTC DS3231
// Wokwi: dung DS1307 khi bat SIM_RTC_DS1307
// May that: dung DS3231
// Muc dich: giu gio khi mat mang / mat dien

#pragma once

#include <Wire.h>
#include <RTClib.h>

// ============================================================
// RTC
// Wokwi khong co DS3231 nen dung DS1307 khi SIM_RTC_DS1307
// Ca hai deu giao tiep I2C tai dia chi 0x68
// ============================================================

#ifdef SIM_RTC_DS1307

static RTC_DS1307 rtc;

#else

static RTC_DS3231 rtc;

#endif

// ============================================================
// Trang thai RTC
// ============================================================

static bool rtcPresent = false;

// ============================================================
// Khoi dong RTC
// ============================================================

inline bool clockBegin() {

  Wire.begin(PIN_SDA, PIN_SCL);

  rtcPresent = rtc.begin();

  return rtcPresent;
}

// ============================================================
// Kiem tra RTC co mat gio hay mat nguon
// ============================================================

#ifdef SIM_RTC_DS1307

inline bool clockLostPower() {
  return rtcPresent && !rtc.isrunning();
}

#else

inline bool clockLostPower() {
  return rtcPresent && rtc.lostPower();
}

#endif

// ============================================================
// Lay Unix timestamp hien tai
//
// Neu co RTC:
//   -> doc gio tu RTC
//
// Neu khong co RTC:
//   -> dung millis() lam fallback
//   -> de van co the xu ly nut cho an tay
// ============================================================

inline uint32_t nowUnix() {

  if (rtcPresent) {
    return rtc.now().unixtime();
  }

  // Fallback khi khong tim thay RTC
  return (uint32_t)(millis() / 1000UL) + (86400UL * 365UL);
}

// ============================================================
// Set thoi gian RTC tu Unix timestamp
// ============================================================

inline void clockSet(uint32_t unixLocal) {

  if (rtcPresent) {
    rtc.adjust(DateTime(unixLocal));
  }
}

// ============================================================
// Set RTC theo thoi gian compile code
// ============================================================

inline void clockSetCompileTime() {

  if (rtcPresent) {
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }
}