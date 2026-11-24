# MQTT Topic Map V1
## Đề tài: Máy cho thú cưng ăn tự động

Broker: EMQX Cloud
Protocol: MQTT over TLS
Port: 8883
Device ID: esp32-feeder-01

| Topic | Direction | QoS | Retain | Purpose |
|---|---|---:|---|---|
| petfeeder/sensor | ESP32 -> Broker | 1 | No | Dữ liệu cảm biến và trạng thái thiết bị |
| petfeeder/control | Broker -> ESP32 | 1 | No | Nhận lệnh điều khiển |
| petfeeder/status | ESP32 -> Broker | 1 | Online/Offline retained | Trạng thái và phản hồi xử lý lệnh |

## Uplink
ESP32 publish dữ liệu cảm biến lên petfeeder/sensor.
ESP32 publish trạng thái và kết quả lệnh lên petfeeder/status.

## Downlink
ESP32 subscribe petfeeder/control với QoS 1.
Lệnh được kiểm tra trước khi chuyển đến logic điều khiển servo.

## Quy tắc
- Topic phân biệt chữ hoa và chữ thường.
- Mỗi lệnh điều khiển cần request_id riêng.
- Lệnh không hợp lệ phải bị từ chối.
- Lệnh vẫn phải tuân thủ giới hạn an toàn của firmware.