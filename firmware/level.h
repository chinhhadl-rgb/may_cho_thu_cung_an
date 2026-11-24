
 // level.h - do muc hat HC-SR04, loc trung binh 5 mau
 // Moi lan do cach nhau 40 ms; khong do khi dang xa hat.
#pragma once

#include "hooks.h"
#include "config.h"
#include "logic.h"

static int levelPct = -1;
static bool lowAlerted = false;
static bool lvActive = false, lvHave = false;
static uint8_t lvTaken = 0, lvValid = 0, lvFails = 0;
static float lvBuf[LEVEL_SAMPLES];
static uint32_t lvT = 0, lvLast = 0;

inline float readCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);

  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  long t = pulseIn(
    PIN_ECHO, HIGH, ECHO_TIMEOUT_US
  );

  return t ? t * 0.034f / 2.0f : -1.0f;
}

inline void levelTick() {
  uint32_t now = millis();

  // Bat dau mot chu ky lay mau moi
  if (!lvActive) {
    if (lvHave &&
        now - lvLast < LEVEL_INTERVAL_MS) {
      return;
    }

    if (feederBusy()) {
      return;
    }

    lvActive = true;
    lvTaken = 0;
    lvValid = 0;
    lvT = now - SAMPLE_GAP_MS;
  }

  // Lay mau cach nhau SAMPLE_GAP_MS
  if (now - lvT < SAMPLE_GAP_MS) {
    return;
  }

  lvT = now;

  float d = readCm();

  // Chi luu mau hop le, khong vuot kich thuoc mang
  if (d > 0 && lvValid < LEVEL_SAMPLES) {
    lvBuf[lvValid++] = d;
  }

  // Moi chu ky thu toi da LEVEL_SAMPLES lan
  if (++lvTaken < LEVEL_SAMPLES) {
    return;
  }

  lvActive = false;
  lvHave = true;
  lvLast = now;

  // Neu tat ca cac lan do deu loi
  if (lvValid == 0) {
    if (++lvFails == 3) {
      Serial.println(
        "[level] LOI: HC-SR04 khong tra ve tin hieu"
      );
    }
    return;
  }

  lvFails = 0;

  // Tinh trung binh cac mau do hop le
  float sum = 0.0f;

  for (uint8_t i = 0; i < lvValid; i++) {
    sum += lvBuf[i];
  }

  float avgCm = sum / lvValid;

  // Chuyen khoang cach thanh phan tram muc hat
  levelPct = logic::levelPercent(
    avgCm, EMPTY_CM, FULL_CM
  );

  // In ket qua de kiem tra tren Serial Monitor
  Serial.printf(
    "[level] Khoang cach TB: %.2f cm | Muc hat: %d%%\n",
    avgCm, levelPct
  );

  // Cap nhat du lieu va canh bao
  cloudOnLevel(levelPct);

  if (levelPct < LOW_PCT && !lowAlerted) {
    lowAlerted = true;
    cloudOnLow(levelPct);
  }

  if (levelPct >= RECOVER_PCT) {
    lowAlerted = false;
  }
}
