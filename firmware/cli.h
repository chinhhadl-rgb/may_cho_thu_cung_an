// cli.h - lenh Serial (115200) de kiem thu va chan doan
//   help | status | feed | sched <1-3> <HH:MM|off> | portion <1-6> | settime <HH:MM> | resetday
#pragma once
#include <stdio.h>
#include <string.h>

static void printStatus() {
  uint32_t now = nowUnix();
  int mod = minuteOfDay(now);
  Serial.printf("--- TRANG THAI ---\n");
  Serial.printf("Gio RTC     : %02d:%02d (%s)\n", mod / 60, mod % 60,
                !rtcPresent ? "KHONG THAY RTC" : (S.timeOk ? "hop le" : "CHUA DONG BO - lich bi khoa"));
  Serial.printf("Muc hat     : %d%%\n", levelPct);
  Serial.printf("Hom nay     : %u/%d bua, khau phan %u ms\n", (unsigned)fedTodayNow(), MAX_PER_DAY, (unsigned)S.portionMs);
  for (int i = 0; i < NUM_SLOTS; i++)
    Serial.printf("Moc %d       : %02d:%02d %s%s\n", i + 1, S.slot[i].h, S.slot[i].m,
                  S.slot[i].enabled ? "BAT" : "TAT",
                  (S.slot[i].doneDay == dayIndex(now)) ? " (da xong hom nay)" : "");
}

static void cliExec(char* line) {
  int a, b; float f;
  if (!strcmp(line, "status")) printStatus();
  else if (!strcmp(line, "feed")) feedNow("serial");
  else if (!strncmp(line, "sched ", 6)) {
    int idx, h, m; char v[8];
    if (sscanf(line + 6, "%d %7s", &idx, v) == 2 && idx >= 1 && idx <= NUM_SLOTS && !strcmp(v, "off")) {
      setSlot(idx - 1, S.slot[idx - 1].h, S.slot[idx - 1].m, false); Serial.println("OK");
    } else if (sscanf(line + 6, "%d %d:%d", &idx, &h, &m) == 3 && idx >= 1 && idx <= NUM_SLOTS &&
               h >= 0 && h < 24 && m >= 0 && m < 60) {
      setSlot(idx - 1, h, m, true); Serial.println("OK");
    } else Serial.println("Cu phap: sched <1-3> <HH:MM|off>");
  }
  else if (!strncmp(line, "portion ", 8) && sscanf(line + 8, "%f", &f) == 1) {
    uint32_t ms = (uint32_t)(f * 1000);
    if (ms >= PORTION_MIN_MS && ms <= PORTION_MAX_MS) { S.portionMs = ms; savePortion(); Serial.println("OK"); }
    else Serial.println("Khau phan phai tu 1 den 6 giay");
  }
  else if (!strncmp(line, "settime ", 8) && sscanf(line + 8, "%d:%d", &a, &b) == 2 && a >= 0 && a < 24 && b >= 0 && b < 60) {
    clockSet(dayIndex(nowUnix()) * 86400UL + a * 3600UL + b * 60UL);
    Serial.println("OK (chi dung de kiem thu)");
  }
  else if (!strcmp(line, "resetday")) {
    S.fedToday = 0; S.lastFeedUnix = 0; saveCounters();
    for (int i = 0; i < NUM_SLOTS; i++) { S.slot[i].doneDay = 0; saveSlot(i); }
    Serial.println("Da dat lai bo dem ngay");
  }
  else Serial.println("Lenh: status | feed | sched <1-3> <HH:MM|off> | portion <1-6> | settime <HH:MM> | resetday");
}

inline void cliTick() {
  static char buf[48]; static uint8_t n = 0;
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\r' || c == '\n') { if (n) { buf[n] = 0; cliExec(buf); n = 0; } }
    else if (n < sizeof(buf) - 1) buf[n++] = c;
  }
}
