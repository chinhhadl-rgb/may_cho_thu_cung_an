-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th10 24, 2026 lúc 06:39 PM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `pet_feeder_db`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `device_status_logs`
--

CREATE TABLE `device_status_logs` (
  `id` bigint(20) NOT NULL,
  `device_id` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL COMMENT 'online / offline',
  `detail` varchar(100) DEFAULT NULL COMMENT 'Chi tiết sự kiện (mqtt_connected / lwt_disconnect)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `device_status_logs`
--

INSERT INTO `device_status_logs` (`id`, `device_id`, `status`, `detail`, `created_at`) VALUES
(1, 'esp32-feeder-01', 'offline', '', '2026-11-18 12:08:19'),
(2, 'esp32-feeder-01', 'online', 'mqtt_connected', '2026-11-18 12:09:52'),
(3, 'esp32-feeder-01', 'feeding_started', 'command_accepted', '2026-11-18 12:10:00'),
(4, 'esp32-feeder-01', 'offline', '', '2026-11-18 12:10:33'),
(5, 'esp32-feeder-01', 'online', 'mqtt_connected', '2026-11-18 12:10:34'),
(6, 'esp32-feeder-01', 'feeding_started', 'command_accepted', '2026-11-18 12:11:02'),
(7, 'esp32-feeder-01', 'offline', '', '2026-11-18 12:11:59'),
(8, 'esp32-feeder-01', 'online', 'mqtt_connected', '2026-11-18 12:12:00'),
(9, 'esp32-feeder-01', 'low_food', 'low_food_threshold', '2026-11-18 12:12:02'),
(10, 'esp32-feeder-01', 'offline', '', '2026-11-18 12:12:59');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `feeding_logs`
--

CREATE TABLE `feeding_logs` (
  `id` bigint(20) NOT NULL,
  `request_id` varchar(100) NOT NULL COMMENT 'Mã định danh duy nhất của lệnh',
  `source` varchar(50) NOT NULL COMMENT 'Nguồn: web_app / telegram_bot / telegram_inline / schedule / button',
  `status` varchar(20) NOT NULL COMMENT 'SUCCESS (Được xả) hoặc REJECTED (Bị chặn do 60s/hết lượt)',
  `duration_ms` int(11) DEFAULT 2000 COMMENT 'Thời gian mở cửa xả hạt (ms)',
  `note` varchar(255) DEFAULT NULL COMMENT 'Lý do: Vi pham MIN_GAP 60s / Vuot MAX_DAY / Xa hat thanh cong',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `feeding_logs`
--

INSERT INTO `feeding_logs` (`id`, `request_id`, `source`, `status`, `duration_ms`, `note`, `created_at`) VALUES
(1, 'web-feed-1795003799340', 'web_custom_app', 'SUCCESS', 2000, 'Lệnh: FEED_NOW', '2026-11-18 12:09:59'),
(2, 'web-feed-1795003861322', 'web_custom_app', 'SUCCESS', 2000, 'Lệnh: FEED_NOW', '2026-11-18 12:11:01');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `sensor_logs`
--

CREATE TABLE `sensor_logs` (
  `id` bigint(20) NOT NULL,
  `device_id` varchar(50) DEFAULT 'esp32-feeder-01' COMMENT 'Mã thiết bị phát tin',
  `level_pct` int(11) NOT NULL COMMENT 'Mức hạt trong phễu (%)',
  `feeds_today` int(11) DEFAULT 0 COMMENT 'Số lần đã cho ăn trong ngày',
  `max_feeds_per_day` int(11) DEFAULT 6 COMMENT 'Trần số bữa ăn tối đa/ngày',
  `wifi_rssi` int(11) DEFAULT NULL COMMENT 'Cường độ sóng WiFi (dBm)',
  `sensor_ok` tinyint(1) DEFAULT 1 COMMENT 'Trạng thái cảm biến siêu âm',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `sensor_logs`
--

INSERT INTO `sensor_logs` (`id`, `device_id`, `level_pct`, `feeds_today`, `max_feeds_per_day`, `wifi_rssi`, `sensor_ok`, `created_at`) VALUES
(1, 'esp32-feeder-01', 0, 0, 6, -82, 1, '2026-11-05 17:18:52'),
(2, 'esp32-feeder-01', 0, 0, 6, -87, 1, '2026-11-05 17:18:53'),
(3, 'esp32-feeder-01', 0, 1, 6, -82, 1, '2026-11-05 17:19:24'),
(4, 'esp32-feeder-01', 0, 1, 6, -88, 1, '2026-11-05 17:19:32'),
(5, 'esp32-feeder-01', 82, 1, 6, -94, 1, '2026-11-05 17:19:53'),
(6, 'esp32-feeder-01', 0, 0, 6, -76, 1, '2026-11-18 11:47:46'),
(7, 'esp32-feeder-01', 0, 0, 6, -85, 1, '2026-11-18 11:47:47'),
(8, 'esp32-feeder-01', 0, 1, 6, -70, 1, '2026-11-18 11:48:04'),
(9, 'esp32-feeder-01', 35, 1, 6, -81, 1, '2026-11-18 11:48:22'),
(10, 'esp32-feeder-01', 35, 2, 6, -95, 1, '2026-11-18 11:50:03'),
(11, 'esp32-feeder-01', 35, 2, 6, -86, 1, '2026-11-18 11:50:04'),
(12, 'esp32-feeder-01', 35, 0, 6, -81, 1, '2026-11-18 11:51:02'),
(13, 'esp32-feeder-01', 100, 0, 6, -84, 1, '2026-11-18 11:51:04'),
(14, 'esp32-feeder-01', 100, 1, 6, -90, 1, '2026-11-18 11:51:33'),
(15, 'esp32-feeder-01', 100, 2, 6, -88, 1, '2026-11-18 11:53:15'),
(16, 'esp32-feeder-01', 0, 2, 6, -97, 1, '2026-11-18 11:53:15'),
(17, 'esp32-feeder-01', 0, 0, 6, -84, 1, '2026-11-18 11:57:43'),
(18, 'esp32-feeder-01', 0, 0, 6, -93, 1, '2026-11-18 11:57:44'),
(19, 'esp32-feeder-01', 0, 1, 6, -84, 1, '2026-11-18 11:57:48'),
(20, 'esp32-feeder-01', 0, 1, 6, -94, 1, '2026-11-18 11:58:08'),
(21, 'esp32-feeder-01', 0, 0, 6, -87, 1, '2026-11-18 12:09:52'),
(22, 'esp32-feeder-01', 0, 0, 6, -87, 1, '2026-11-18 12:09:52'),
(23, 'esp32-feeder-01', 0, 0, 6, -87, 1, '2026-11-18 12:09:54'),
(24, 'esp32-feeder-01', 0, 0, 6, -87, 1, '2026-11-18 12:09:54'),
(25, 'esp32-feeder-01', 0, 1, 6, -85, 1, '2026-11-18 12:10:00'),
(26, 'esp32-feeder-01', 0, 1, 6, -85, 1, '2026-11-18 12:10:00'),
(27, 'esp32-feeder-01', 0, 0, 6, -81, 1, '2026-11-18 12:10:34'),
(28, 'esp32-feeder-01', 0, 0, 6, -81, 1, '2026-11-18 12:10:34'),
(29, 'esp32-feeder-01', 0, 0, 6, -98, 1, '2026-11-18 12:10:35'),
(30, 'esp32-feeder-01', 0, 0, 6, -98, 1, '2026-11-18 12:10:35'),
(31, 'esp32-feeder-01', 100, 0, 6, -84, 1, '2026-11-18 12:10:57'),
(32, 'esp32-feeder-01', 100, 0, 6, -84, 1, '2026-11-18 12:10:57'),
(33, 'esp32-feeder-01', 100, 1, 6, -70, 1, '2026-11-18 12:11:01'),
(34, 'esp32-feeder-01', 100, 1, 6, -70, 1, '2026-11-18 12:11:02'),
(35, 'esp32-feeder-01', 100, 1, 6, -97, 1, '2026-11-18 12:11:21'),
(36, 'esp32-feeder-01', 100, 1, 6, -97, 1, '2026-11-18 12:11:21'),
(37, 'esp32-feeder-01', 100, 0, 6, -95, 1, '2026-11-18 12:12:01'),
(38, 'esp32-feeder-01', 100, 0, 6, -95, 1, '2026-11-18 12:12:01'),
(39, 'esp32-feeder-01', 0, 0, 6, -95, 1, '2026-11-18 12:12:02'),
(40, 'esp32-feeder-01', 0, 0, 6, -95, 1, '2026-11-18 12:12:02'),
(41, 'esp32-feeder-01', 85, 2, 6, -70, 1, '2026-11-20 03:23:14'),
(42, 'esp32-feeder-01', 85, 2, 6, -70, 1, '2026-11-20 03:25:23'),
(43, 'esp32-feeder-01', 85, 2, 6, -70, 1, '2026-11-20 03:27:28'),
(44, 'esp32-feeder-01', 0, 0, 6, -71, 1, '2026-11-22 15:18:44'),
(45, 'esp32-feeder-01', 0, 0, 6, -75, 1, '2026-11-22 15:18:44'),
(46, 'esp32-feeder-01', 0, 0, 6, -94, 1, '2026-11-22 15:19:07'),
(47, 'esp32-feeder-01', 0, 0, 6, -89, 1, '2026-11-22 15:19:28'),
(48, 'esp32-feeder-01', 0, 1, 6, -82, 1, '2026-11-22 15:19:45'),
(49, 'esp32-feeder-01', 6, 0, 6, -89, 1, '2026-11-22 15:21:21'),
(50, 'esp32-feeder-01', 6, 0, 6, -94, 1, '2026-11-22 15:21:22'),
(51, 'esp32-feeder-01', 85, 0, 6, -70, 1, '2026-11-22 15:46:09'),
(52, 'esp32-feeder-01', 0, 0, 6, -67, 1, '2026-11-22 15:52:34'),
(53, 'esp32-feeder-01', 0, 0, 6, -76, 1, '2026-11-22 15:52:34'),
(54, 'esp32-feeder-01', 100, 0, 6, -70, 1, '2026-11-22 15:52:44'),
(55, 'esp32-feeder-01', 100, 1, 6, -80, 1, '2026-11-22 15:52:50'),
(56, 'esp32-feeder-01', 88, 1, 6, -82, 1, '2026-11-22 15:52:55'),
(57, 'esp32-feeder-01', 85, 0, 6, -70, 1, '2026-11-22 16:03:31'),
(58, 'esp32-feeder-01', 88, 0, 6, -64, 1, '2026-11-22 16:04:24'),
(59, 'esp32-feeder-01', 88, 0, 6, -82, 1, '2026-11-22 16:04:25'),
(60, 'esp32-feeder-01', 88, 0, 6, -83, 1, '2026-11-22 16:04:33'),
(61, 'esp32-feeder-01', 88, 0, 6, -90, 1, '2026-11-22 16:04:42'),
(62, 'esp32-feeder-01', 88, 0, 6, -99, 1, '2026-11-22 16:04:51'),
(63, 'esp32-feeder-01', 88, 0, 6, -74, 1, '2026-11-22 16:34:40'),
(64, 'esp32-feeder-01', 24, 0, 6, -88, 1, '2026-11-22 16:34:41'),
(65, 'esp32-feeder-01', 23, 0, 6, -81, 1, '2026-11-22 16:34:49'),
(66, 'esp32-feeder-01', 24, 0, 6, -92, 1, '2026-11-22 16:34:58'),
(67, 'esp32-feeder-01', 24, 0, 6, -64, 1, '2026-11-22 16:35:07'),
(68, 'esp32-feeder-01', 24, 0, 6, -94, 1, '2026-11-22 16:35:15'),
(69, 'esp32-feeder-01', 24, 0, 6, -93, 1, '2026-11-22 16:35:24'),
(70, 'esp32-feeder-01', 24, 0, 6, -80, 1, '2026-11-22 16:35:33'),
(71, 'esp32-feeder-01', 24, 0, 6, -87, 1, '2026-11-22 16:35:42'),
(72, 'esp32-feeder-01', 23, 0, 6, -73, 1, '2026-11-22 16:35:51'),
(73, 'esp32-feeder-01', 24, 0, 6, -78, 1, '2026-11-22 16:35:59'),
(74, 'esp32-feeder-01', 0, 0, 6, -88, 1, '2026-11-22 16:36:08'),
(75, 'esp32-feeder-01', 0, 0, 6, -94, 1, '2026-11-22 16:36:16'),
(76, 'esp32-feeder-01', 85, 0, 6, -70, 1, '2026-11-22 18:35:00'),
(77, 'esp32-feeder-01', 0, 0, 6, -89, 1, '2026-11-22 18:43:54'),
(78, 'esp32-feeder-01', 0, 0, 6, -90, 1, '2026-11-22 18:43:55'),
(79, 'esp32-feeder-01', 0, 0, 6, -91, 1, '2026-11-22 18:44:04'),
(80, 'esp32-feeder-01', 0, 0, 6, -86, 1, '2026-11-22 18:46:08'),
(81, 'esp32-feeder-01', 0, 0, 6, -89, 1, '2026-11-22 18:46:10'),
(82, 'esp32-feeder-01', 0, 0, 6, -95, 1, '2026-11-22 18:46:21'),
(83, 'esp32-feeder-01', 0, 0, 6, -76, 1, '2026-11-22 18:46:31'),
(84, 'esp32-feeder-01', 0, 0, 6, -96, 1, '2026-11-22 18:46:40'),
(85, 'esp32-feeder-01', 0, 0, 6, -84, 1, '2026-11-22 18:46:50'),
(86, 'esp32-feeder-01', 85, 0, 6, -70, 1, '2026-11-22 18:47:26'),
(87, 'esp32-feeder-01', 85, 0, 6, -70, 1, '2026-11-22 18:47:58'),
(88, 'esp32-feeder-01', 85, 0, 6, -70, 1, '2026-11-22 18:48:40'),
(89, 'esp32-feeder-01', 0, 0, 6, -70, 1, '2026-11-22 19:05:05'),
(90, 'esp32-feeder-01', 0, 0, 6, -98, 1, '2026-11-22 19:05:06'),
(91, 'esp32-feeder-01', 0, 0, 6, -85, 1, '2026-11-22 19:05:14'),
(92, 'esp32-feeder-01', 0, 1, 6, -95, 1, '2026-11-22 19:05:20'),
(93, 'esp32-feeder-01', 0, 1, 6, -92, 1, '2026-11-22 19:05:25'),
(94, 'esp32-feeder-01', 0, 1, 6, -87, 1, '2026-11-22 19:05:33'),
(95, 'esp32-feeder-01', 0, 1, 6, -87, 1, '2026-11-22 19:05:42'),
(96, 'esp32-feeder-01', 0, 1, 6, -91, 1, '2026-11-22 19:05:51'),
(97, 'esp32-feeder-01', 0, 1, 6, -72, 1, '2026-11-22 19:05:59'),
(98, 'esp32-feeder-01', 0, 1, 6, -85, 1, '2026-11-22 19:06:08'),
(99, 'esp32-feeder-01', 0, 1, 6, -88, 1, '2026-11-22 19:06:16'),
(100, 'esp32-feeder-01', 0, 1, 6, -89, 1, '2026-11-22 19:06:25'),
(101, 'esp32-feeder-01', 0, 1, 6, -89, 1, '2026-11-22 19:06:33'),
(102, 'esp32-feeder-01', 0, 1, 6, -88, 1, '2026-11-22 19:06:41'),
(103, 'esp32-feeder-01', 0, 2, 6, -88, 1, '2026-11-22 19:06:43'),
(104, 'esp32-feeder-01', 0, 2, 6, -85, 1, '2026-11-22 19:06:50'),
(105, 'esp32-feeder-01', 0, 2, 6, -70, 1, '2026-11-22 19:06:58'),
(106, 'esp32-feeder-01', 0, 2, 6, -83, 1, '2026-11-22 19:07:07'),
(107, 'esp32-feeder-01', 0, 0, 6, -72, 1, '2026-11-22 19:19:38'),
(108, 'esp32-feeder-01', 0, 0, 6, -99, 1, '2026-11-22 19:19:39'),
(109, 'esp32-feeder-01', 0, 1, 6, -78, 1, '2026-11-22 19:19:46'),
(110, 'esp32-feeder-01', 0, 1, 6, -96, 1, '2026-11-22 19:19:55'),
(111, 'esp32-feeder-01', 0, 0, 6, -74, 1, '2026-11-22 19:23:33'),
(112, 'esp32-feeder-01', 0, 0, 6, -94, 1, '2026-11-22 19:23:34'),
(113, 'esp32-feeder-01', 18, 0, 6, -87, 1, '2026-11-22 19:23:44'),
(114, 'esp32-feeder-01', 100, 0, 6, -89, 1, '2026-11-22 19:24:27'),
(115, 'esp32-feeder-01', 0, 0, 6, -86, 1, '2026-11-22 19:24:40'),
(116, 'esp32-feeder-01', 0, 1, 6, -79, 1, '2026-11-22 19:24:58'),
(117, 'esp32-feeder-01', 0, 1, 6, -87, 1, '2026-11-22 19:25:20'),
(118, 'esp32-feeder-01', 0, 1, 6, -85, 1, '2026-11-22 19:25:31'),
(119, 'esp32-feeder-01', 0, 1, 6, -94, 1, '2026-11-22 19:25:40'),
(120, 'esp32-feeder-01', 0, 1, 6, -80, 1, '2026-11-22 19:25:50');

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `device_status_logs`
--
ALTER TABLE `device_status_logs`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `feeding_logs`
--
ALTER TABLE `feeding_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_feed_created_at` (`created_at`),
  ADD KEY `idx_feed_status` (`status`);

--
-- Chỉ mục cho bảng `sensor_logs`
--
ALTER TABLE `sensor_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sensor_device_time` (`device_id`,`created_at`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `device_status_logs`
--
ALTER TABLE `device_status_logs`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT cho bảng `feeding_logs`
--
ALTER TABLE `feeding_logs`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `sensor_logs`
--
ALTER TABLE `sensor_logs`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=121;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
