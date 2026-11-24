// scheduler.h - lich 3 moc, chay doc lap voi WiFi/MQTT (chi can RTC + Flash)
#pragma once
#include "hooks.h"

// Doi lich. Neu khong thay doi gi -> khong lam gi (Blynk sync lai khi noi mang se KHONG cho an lai).
// Neu doi sang gio da qua trong hom nay -> danh dau da xong, tranh cho an ngay lap tuc.
inline void setSlot(int i, int h, int m, bool enabled) {
  Slot& s = S.slot[i];
  if (s.h == h && s.m == m && s.enabled == enabled) return;
  s.h = (int8_t)h; s.m = (int8_t)m; s.enabled = enabled;
  uint32_t now = nowUnix();
  s.doneDay = (enabled && minuteOfDay(now) > h * 60 + m) ? dayIndex(now) : 0;
  saveSlot(i);
}

inline void schedulerTick() {
  static uint32_t lastMs = 0;
  uint32_t ms = millis();
  if (ms - lastMs < 1000) return;
  lastMs = ms;
  if (!S.timeOk || !rtcPresent) return;      // RTC mat gio: khong chay lich cho toi khi dong bo NTP

  uint32_t now = nowUnix();
  uint32_t today = dayIndex(now);
  int nowMin = minuteOfDay(now);
  for (int i = 0; i < NUM_SLOTS; i++) {
    Slot& s = S.slot[i];
    if (!slotDue(s.enabled, s.h, s.m, nowMin, s.doneDay, today, GRACE_MIN)) continue;
    FeedResult r = feedNow("lich");
    // OK hoac da du bua: danh dau xong. Chua du 60 s / dang ban: thu lai o nhip sau (trong cua so 15 phut).
    if (r == FEED_OK || r == REJ_MAX) { s.doneDay = today; saveSlot(i); }
    break;                                   // moi nhip toi da 1 moc
  }
}
