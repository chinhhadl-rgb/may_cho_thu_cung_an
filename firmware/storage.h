// storage.h - luu cau hinh va bo dem vao Flash (Preferences / NVS), khong mat khi reset
#pragma once
#include <Preferences.h>
#include <stdio.h>

struct Slot { int8_t h; int8_t m; bool enabled; uint32_t doneDay; };
struct State {
  Slot     slot[NUM_SLOTS];
  uint32_t portionMs;
  uint32_t lastFeedUnix;   // thoi diem cho an gan nhat (gio RTC)
  uint32_t fedDay;         // chi so ngay cua bo dem fedToday
  uint32_t fedToday;
  bool     timeOk;         // false: RTC mat gio, cho NTP moi chay lich
};
static State S;
static Preferences pref;

inline void storageLoad() {
  // Luon mo che do ghi: mo chi-doc se loi neu namespace chua ton tai.
  pref.begin("feeder", false);
  static const int8_t defH[NUM_SLOTS] = {7, 12, 18};
  for (int i = 0; i < NUM_SLOTS; i++) {
    char k[8];
    snprintf(k, sizeof k, "h%d", i);  S.slot[i].h = pref.getChar(k, defH[i]);
    snprintf(k, sizeof k, "m%d", i);  S.slot[i].m = pref.getChar(k, 0);
    snprintf(k, sizeof k, "en%d", i); S.slot[i].enabled = pref.getBool(k, true);
    snprintf(k, sizeof k, "dd%d", i); S.slot[i].doneDay = pref.getUInt(k, 0);
  }
  S.portionMs    = pref.getUInt("portion", PORTION_DEFAULT_MS);
  S.lastFeedUnix = pref.getUInt("last", 0);
  S.fedDay       = pref.getUInt("fday", 0);
  S.fedToday     = pref.getUInt("fcnt", 0);
  S.timeOk       = pref.getBool("timeok", true);
  if (S.portionMs < PORTION_MIN_MS || S.portionMs > PORTION_MAX_MS) S.portionMs = PORTION_DEFAULT_MS;
}

inline void saveSlot(int i) {
  char k[8];
  snprintf(k, sizeof k, "h%d", i);  pref.putChar(k, S.slot[i].h);
  snprintf(k, sizeof k, "m%d", i);  pref.putChar(k, S.slot[i].m);
  snprintf(k, sizeof k, "en%d", i); pref.putBool(k, S.slot[i].enabled);
  snprintf(k, sizeof k, "dd%d", i); pref.putUInt(k, S.slot[i].doneDay);
}
inline void saveCounters() {
  pref.putUInt("last", S.lastFeedUnix);
  pref.putUInt("fday", S.fedDay);
  pref.putUInt("fcnt", S.fedToday);
}
inline void savePortion() { pref.putUInt("portion", S.portionMs); }
inline void saveTimeOk()  { pref.putBool("timeok", S.timeOk); }
