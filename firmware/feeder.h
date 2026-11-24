// feeder.h - dieu khien cua truot SG90, KHONG chan (khong dung delay)
// Mo cua -> giu "portionMs" -> dong cua -> doi servo ve vi tri -> cat PWM (chong rung/troi).
// Trong luc xa hat, loop() van chay: RTC, nut bam, Blynk khong bi dung.
#pragma once
#include <ESP32Servo.h>
#include "hooks.h"

using namespace logic;

enum FeedPhase : uint8_t { PH_IDLE, PH_OPEN, PH_CLOSING };
static Servo     door;
static FeedPhase phase  = PH_IDLE;
static uint32_t  phaseT = 0;

inline bool feederBusy() { return phase != PH_IDLE; }

static void doorAttach() {
  door.setPeriodHertz(50);
  door.attach(PIN_SERVO, 500, 2400);
}

inline void feederBegin() {
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);
  doorAttach();
  door.write(DOOR_CLOSED_DEG);          // dua cua ve vi tri dong khi khoi dong
  phase = PH_CLOSING; phaseT = millis();
}

static void feederStart() {
  doorAttach();
  door.write(DOOR_OPEN_DEG);
  digitalWrite(PIN_LED, HIGH);
  phase = PH_OPEN; phaseT = millis();
}

inline void feederTick() {
  uint32_t now = millis();
  if (phase == PH_OPEN && now - phaseT >= S.portionMs) {
    door.write(DOOR_CLOSED_DEG);
    phase = PH_CLOSING; phaseT = now;
  } else if (phase == PH_CLOSING && now - phaseT >= DOOR_MOVE_MS) {
    door.detach();
    digitalWrite(PIN_LED, LOW);
    phase = PH_IDLE;
  }
}

inline const char* resultText(FeedResult r) {
  switch (r) {
    case FEED_OK:  return "OK";
    case REJ_GAP:  return "Tu choi: chua du 60 s tu lan truoc";
    case REJ_MAX:  return "Tu choi: da du so bua toi da hom nay";
    case REJ_BUSY: return "Tu choi: dang xa hat";
  }
  return "?";
}

inline uint32_t fedTodayNow() {
  return dayIndex(nowUnix()) == S.fedDay ? S.fedToday : 0;
}

// Diem DUY NHAT cho an: lich, nut bam, Blynk, Serial deu di qua day.
// Ghi Flash TRUOC khi xa -> neu reset giua chung, toi da lo 1 bua, khong bao gio an doi.
inline FeedResult feedNow(const char* source) {
  if (feederBusy()) return REJ_BUSY;
  uint32_t now = nowUnix();
  FeedResult r = checkFeed(now, S.lastFeedUnix, S.fedDay, S.fedToday, MIN_GAP_SEC, MAX_PER_DAY);
  if (r != FEED_OK) {
    Serial.printf("[feed:%s] %s\n", source, resultText(r));
    return r;
  }
  uint32_t d = dayIndex(now);
  if (d != S.fedDay) { S.fedDay = d; S.fedToday = 0; }
  S.fedToday++;
  S.lastFeedUnix = now;
  saveCounters();
  feederStart();
  Serial.printf("[feed:%s] CHO AN bua %u/%d, mo cua %u ms\n",
                source, (unsigned)S.fedToday, MAX_PER_DAY, (unsigned)S.portionMs);
  cloudOnFed();
  return FEED_OK;
}
