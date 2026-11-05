-- TAI LIEU THAM KHAO: Schema nay chi de chay thu cong ben ngoai neu can.
-- Ung dung web hien tai khong doc, nap hay thuc thi file database.sql nay.
-- CAN THAN: Lenh DROP DATABASE ben duoi xoa database cu va toan bo du lieu.

"""-- Xóa Database cũ nếu đã tồn tại
DROP DATABASE IF EXISTS `pet_feeder_db`;

-- 1. Tạo lại Database mới hoàn toàn
CREATE DATABASE `pet_feeder_db` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `pet_feeder_db`;

-- 2. Bảng sensor_logs (Telemetry cảm biến)
CREATE TABLE `sensor_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `device_id` VARCHAR(50) DEFAULT 'esp32-feeder-01' COMMENT 'Mã thiết bị phát tin',
    `level_pct` INT NOT NULL COMMENT 'Mức hạt trong phễu (%)',
    `feeds_today` INT DEFAULT 0 COMMENT 'Số lần đã cho ăn trong ngày',
    `max_feeds_per_day` INT DEFAULT 6 COMMENT 'Trần số bữa ăn tối đa/ngày',
    `wifi_rssi` INT COMMENT 'Cường độ sóng WiFi (dBm)',
    `sensor_ok` BOOLEAN DEFAULT TRUE COMMENT 'Trạng thái cảm biến siêu âm',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_sensor_device_time` (`device_id`, `created_at`)
) ENGINE=InnoDB;

-- 3. Bảng feeding_logs (Nhật ký sự kiện cho ăn & Chặn Rule 1)
CREATE TABLE `feeding_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `request_id` VARCHAR(100) NOT NULL COMMENT 'Mã định danh duy nhất của lệnh',
    `source` VARCHAR(50) NOT NULL COMMENT 'Nguồn: web_app / telegram_bot / telegram_inline / schedule / button',
    `status` VARCHAR(20) NOT NULL COMMENT 'SUCCESS (Được xả) hoặc REJECTED (Bị chặn do 60s/hết lượt)',
    `duration_ms` INT DEFAULT 2000 COMMENT 'Thời gian mở cửa xả hạt (ms)',
    `note` VARCHAR(255) COMMENT 'Lý do: Vi pham MIN_GAP 60s / Vuot MAX_DAY / Xa hat thanh cong',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_feed_created_at` (`created_at`),
    INDEX `idx_feed_status` (`status`)
) ENGINE=InnoDB;

-- 4. Bảng device_status_logs (Nhật ký trạng thái kết nối LWT / Keepalive)
CREATE TABLE `device_status_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `device_id` VARCHAR(50) NOT NULL,
    `status` VARCHAR(20) NOT NULL COMMENT 'online / offline',
    `detail` VARCHAR(100) COMMENT 'Chi tiết sự kiện (mqtt_connected / lwt_disconnect)',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
"""