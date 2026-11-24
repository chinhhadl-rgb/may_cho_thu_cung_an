# JSON Schema V1
## 1. Sensor telemetry
Topic: petfeeder/sensor

{
  "device_id": "esp32-feeder-01",
  "event_type": "sensor_update",
  "sensor_ok": true,
  "level_pct": 77,
  "servo_busy": false,
  "feeds_today": 1,
  "max_feeds_per_day": 6,
  "portion_ms": 2000,
  "wifi_rssi": -50,
  "timestamp": "2026-10-20T10:00:00+07:00"
}

## 2. Control command
Topic: petfeeder/control

{
  "command": "FEED_NOW",
  "request_id": "wokwi-feed-001"
}

## 3. Device status
Topic: petfeeder/status

{
  "device_id": "esp32-feeder-01",
  "status": "feeding_started",
  "feeds_today": 1,
  "max_feeds_per_day": 6,
  "request_id": "wokwi-feed-001",
  "detail": "command_accepted",
  "timestamp": "2026-10-20T10:00:02+07:00"
}

## 4. Field definitions

- device_id: ID của thiết bị.
- event_type: loại sự kiện gửi lên.
- sensor_ok: cảm biến có dữ liệu hợp lệ hay không.
- level_pct: phần trăm mức thức ăn ước tính; có thể null khi chưa có số đo hợp lệ.
- servo_busy: servo đang thực hiện chu kỳ cấp thức ăn hay không.
- feeds_today: số bữa đã ghi nhận trong ngày.
- max_feeds_per_day: giới hạn số bữa mỗi ngày.
- portion_ms: thời lượng mở cửa cấp thức ăn, tính bằng mili giây.
- wifi_rssi: cường độ tín hiệu Wi-Fi.
- command: tên lệnh điều khiển.
- request_id: mã định danh riêng của mỗi yêu cầu.
- status: kết quả hoặc trạng thái thiết bị.
- detail: thông tin bổ sung hoặc lý do từ chối.
- timestamp: thời gian dạng ISO 8601, theo quy ước GMT+7.