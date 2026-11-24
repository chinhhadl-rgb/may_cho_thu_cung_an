// logic.h - logic THUAN (khong phu thuoc Arduino) -> kiem thu duoc tren may tinh
#pragma once
#include <stdint.h>

namespace logic {

enum FeedResult { FEED_OK = 0, REJ_GAP, REJ_MAX, REJ_BUSY };

inline uint32_t dayIndex(uint32_t unixTime)    { return unixTime / 86400UL; }
inline int      minuteOfDay(uint32_t unixTime) { return (int)((unixTime % 86400UL) / 60UL); }

// Kiem tra gioi han lieu: tran so bua/ngay + khoang cach toi thieu giua 2 lan.
inline FeedResult checkFeed(uint32_t now, uint32_t lastFeed, uint32_t fedDay, uint32_t fedToday,
                            uint32_t minGapSec, int maxPerDay) {
  uint32_t today = (dayIndex(now) == fedDay) ? fedToday : 0;
  if ((int)today >= maxPerDay) return REJ_MAX;
  // now < lastFeed: dong ho bi chinh lui -> bo qua kiem tra khoang cach
  if (lastFeed != 0 && now >= lastFeed && (now - lastFeed) < minGapSec) return REJ_GAP;
  return FEED_OK;
}

// Moc gio den han? Moi moc chi chay 1 lan/ngay (doneDay) va chi trong cua so "graceMin" phut
// sau gio hen -> tu bu bua khi mat dien ngan, khong cho an lap sau reset.
inline bool slotDue(bool enabled, int h, int m, int nowMin,
                    uint32_t doneDay, uint32_t today, int graceMin) {
  if (!enabled || doneDay == today) return false;
  int diff = nowMin - (h * 60 + m);
  return diff >= 0 && diff <= graceMin;
}

// Trung vi cua n gia tri (sap xep chen, n nho). n == 0 -> -1.
inline float median(float* a, int n) {
  if (n <= 0) return -1.0f;
  for (int i = 1; i < n; i++) {
    float v = a[i]; int j = i - 1;
    while (j >= 0 && a[j] > v) { a[j + 1] = a[j]; j--; }
    a[j + 1] = v;
  }
  return a[n / 2];
}

// Quy doi khoang cach (cm) -> % muc hat theo chieu cao, gioi han 0..100.
inline int levelPercent(float d, float emptyCm, float fullCm) {
  float p = (emptyCm - d) * 100.0f / (emptyCm - fullCm);
  if (p < 0) p = 0;
  if (p > 100) p = 100;
  return (int)(p + 0.5f);
}

}  // namespace logic
