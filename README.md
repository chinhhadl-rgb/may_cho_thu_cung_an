# 🐾 HỆ THỐNG MÁY CHO THÚ CƯNG ĂN TỰ ĐỘNG TỪ XA (SMART PET FEEDER IOT)

> **Đồ án IoT Kiến trúc 4 tầng chuẩn (4-Layer IoT Architecture)**  
> **Nhóm thực hiện:** Nhóm 8 (Phạm Trí Tín, Lê Quốc Thông, Hà Triệu Chính)  
> **Repository GitHub:** [may_cho_thu_cung_an](https://github.com/chinhhadl-rgb/may_cho_thu_cung_an)

---

## 🏛️ KIẾN TRÚC 4 TẦNG HỆ THỐNG (4-LAYER ARCHITECTURE)

| Tầng (Layer) | Thành phần chính | Chức năng |
|---|---|---|
| **Tầng 1: Perception (Cảm biến & Chấp hành)** | ESP32, Servo SG90, HC-SR04, DS1307/DS3231, Nút bấm | Đo mức hạt trong phễu, cửa xả hạt servo, thời gian thực RTC, nút bấm thủ công. |
| **Tầng 2: Network (Truyền thông mạng)** | Wi-Fi 2.4GHz, MQTT TLS (EMQX Cloud), WebSocket Secure (WSS) | Giao tiếp 2 chiều QoS 1: `petfeeder/sensor`, `petfeeder/control`, `petfeeder/status`. |
| **Tầng 3: Middleware & Data (Trung gian & Dữ liệu)** | Node-RED (`nodered/flows.json`), MySQL XAMPP (`pet_feeder_db`), Node.js Server | Xử lý logic trung gian, đồng bộ dữ liệu, lưu trữ lịch sử cảm biến & nhật ký cho ăn. |
| **Tầng 4: Application (Ứng dụng người dùng)** | Custom Web Dashboard, Telegram Web App / Mini App | Giám sát mức hạt (Gauge), điều khiển xả hạt, chống spam 60s, giới hạn 6 bữa/ngày. |

---

## 📁 CẤU TRÚC THƯ MỤC DỰ ÁN (PROJECT STRUCTURE)

```text
d:\web_iot\
├── .vscode/                     # Cấu hình Visual Studio Code
│   ├── extensions.json          # Khuyến nghị cài đặt extension Wokwi Simulator & PlatformIO
│   └── settings.json            # Thiết lập liên kết diagram Wokwi
│
├── firmware/                    # [TẦNG 1 & 2] Mã nguồn ESP32 & Mô phỏng Wokwi
│   ├── sketch.ino               # Chương trình C++ chính điều khiển ESP32
│   ├── diagram.json             # Sơ đồ mạch điện tử mô phỏng Wokwi
│   ├── libraries.txt            # Danh sách thư viện Wokwi (RTClib, ESP32Servo, MQTT, ArduinoJson)
│   ├── wokwi.toml               # File cấu hình chạy Wokwi Simulator trên VS Code
│   ├── platformio.ini           # Cấu hình biên dịch PlatformIO cho ESP32
│   ├── wokwi-project.txt        # Link dự án gốc trên Wokwi Cloud
│   ├── config.h                 # Định nghĩa chân GPIO, hằng số cấu hình
│   ├── clock.h                  # Quản lý thời gian thực RTC
│   ├── cloud.h                  # Giao tiếp MQTT Broker EMQX Cloud
│   ├── feeder.h                 # Điều khiển động cơ Servo đóng/mở cửa hạt
│   ├── hooks.h                  # Trigger các sự kiện trạng thái
│   ├── level.h                  # Đo khoảng cách & tính % phễu thức ăn (HC-SR04)
│   ├── logic.h                  # Logic nghiệp vụ (MIN_GAP 60s, MAX_DAY 6 bữa)
│   ├── mqtt_secrets.h           # Thông tin tài khoản Wi-Fi & MQTT
│   ├── scheduler.h              # Lập lịch cho ăn tự động theo giờ
│   ├── storage.h                # Lưu trữ cấu hình vào bộ nhớ Flash
│   ├── cli.h                    # Giao diện dòng lệnh Serial Monitor
│   └── emqx_ca.h                # Chứng chỉ SSL/TLS CA cho EMQX Cloud
│
├── nodered/                     # [TẦNG 3] Dịch vụ trung gian Node-RED
│   └── flows.json               # Kịch bản luồng xử lý Node-RED Dashboard & MQTT
│
├── database/                    # [TẦNG 3] Cơ sở dữ liệu MySQL (XAMPP)
│   ├── database.sql             # Kịch bản khởi tạo database `pet_feeder_db` và 3 bảng
│   └── pet_feeder_db.sql        # Bản sao lưu toàn vẹn dữ liệu từ phpMyAdmin
│
├── docs/                        # Tài liệu đặc tả kỹ thuật & giao thức
│   ├── JSON_Schema_V1.md        # Đặc tả cấu trúc gói tin JSON (Sensor, Control, Status)
│   └── MQTT_Topic_Map.md        # Bản đồ Topic MQTT và hướng truyền gói tin
│
├── css/                         # [TẦNG 4] Giao diện người dùng
│   └── style.css                # CSS Dark Mode, Glassmorphism & Responsive Mobile
│
├── js/                          # [TẦNG 4] Mã nguồn xử lý phía Client
│   ├── config.js                # Cấu hình WSS Broker, credentials, topics, rules
│   ├── mqtt-service.js          # Module kết nối MQTT WebSocket an toàn (QoS 1)
│   ├── ui.js                    # Quản lý giao diện, vòng tròn Gauge, vạch sóng Wi-Fi, logs
│   └── app.js                   # Controller: Cooldown 60s, Hysteresis <20%, Telegram Web App
│
├── scripts/
│   └── init-db.js               # Script 1-click tự động kết nối và tạo DB trên XAMPP
│
├── index.html                   # Giao diện chính Web Dashboard & Telegram Mini App
├── server.js                    # Backend Node.js: Web Server + REST API + MQTT Background Worker
├── db.js                        # Module kết nối MySQL Connection Pool (mysql2)
├── package.json                 # Quản lý thư viện phụ thuộc Node.js (mysql2, mqtt)
├── wokwi.toml                   # Cấu hình Wokwi Simulator ở thư mục gốc
├── .gitignore                   # Loại trừ các file rác, node_modules, build artifacts
└── README.md                    # Tài liệu tổng quan dự án
```

---

## 🛠️ HƯỚNG DẪN CHẠY WOKWI SIMULATOR TRÊN VISUAL STUDIO CODE

Dự án đã được cấu hình sẵn sàng với extension **Wokwi Simulator** trên VS Code. Bạn có 2 cách chạy như sau:

### Cách 1: Chạy mô phỏng trực tiếp trên Visual Studio Code (Khuyên dùng)
1. **Cài đặt Extension:**
   * Tôi đã cài đặt sẵn extension **Wokwi Simulator** (`wokwi.wokwi-vscode`) vào VS Code của bạn.
   * Nếu mở máy khác, bạn chỉ cần nhấn `Ctrl + Shift + X`, tìm **Wokwi Simulator** và nhấn **Install**.
2. **Kích hoạt mô phỏng:**
   * Mở thư mục dự án `d:\web_iot` trong VS Code.
   * Mở file: [`firmware/diagram.json`](file:///d:/web_iot/firmware/diagram.json).
   * Nhấn tổ hợp phím **`F1`** (hoặc `Ctrl + Shift + P`) $\to$ Gõ và chọn:
     > **`Wokwi: Start Simulator`**
   * Màn hình mô phỏng gồm ESP32, Servo SG90, Cảm biến siêu âm HC-SR04, DS1307 và Nút bấm sẽ xuất hiện và chạy ngay trong tab chia đôi của VS Code!

### Cách 2: Chạy trực tiếp trên trình duyệt Wokwi Cloud (Không cần cài đặt)
* Truy cập link dự án đã tạo sẵn: 👉 **[https://wokwi.com/projects/478289666845553665](https://wokwi.com/projects/478289666845553665)**
* Nhấn nút **Play (▶️)** màu xanh lá ở góc phải để bắt đầu mô phỏng ngay lập tức.

---

## 🌐 HƯỚNG DẪN IMPORT FLOW NODE-RED (TẦNG 3)

1. Khởi động Node-RED trên máy tính bằng lệnh: `node-red` (hoặc mở ứng dụng Node-RED).
2. Mở trình duyệt vào trang quản trị: `http://localhost:1880`.
3. Bấm vào biểu tượng **Menu (☰)** ở góc trên bên phải $\to$ chọn **Import**.
4. Chọn file [`nodered/flows.json`](file:///d:/web_iot/nodered/flows.json) (hoặc copy nội dung file dán vào khung text) $\to$ Bấm **Import**.
5. Nhấn nút **Deploy** màu đỏ để kích hoạt luồng điều khiển và mở Dashboard tại: `http://localhost:1880/ui`.

---

## 💻 HƯỚNG DẪN CHẠY WEB DASHBOARD & BACKEND (TẦNG 4)

1. **Khởi động MySQL:** Mở **XAMPP Control Panel** và nhấn **Start** tại dòng **MySQL** (cổng 3306).
2. **Khởi động Server Backend & Web App:**
   ```bash
   node server.js
   ```
3. **Mở trình duyệt:** Truy cập **`http://localhost:3000`**
   * Giao diện Dashboard Dark Mode sẽ hiện lên với trạng thái:
     * `MQTT: Đã kết nối`
     * `MySQL: Sẵn sàng`
     * Vòng đo lượng hạt Gauge SVG động.
     * Nút **🍖 CHO ĂN NGAY** (giãn cách an toàn 60s và giới hạn 6 bữa/ngày).

---

## 📤 HƯỚNG DẪN PUSH TOÀN BỘ CODE LÊN GITHUB

Mở Terminal tại thư mục dự án và chạy các lệnh sau để đẩy toàn bộ mã nguồn lên GitHub:

```bash
git add .
git commit -m "feat: restructure 4-layer IoT project, add wokwi vscode config, nodered flow, and database"
git push origin master
```
*(Nếu cần nhập thông tin xác thực, nhập GitHub Personal Access Token khi được hỏi).*
