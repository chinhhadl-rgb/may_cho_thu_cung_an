# Smart Pet Feeder - Web Application (Layer 4)

Ứng dụng Web Dashboard & Telegram Mini App điều khiển trạm cho thú cưng ăn tự động qua MQTT WSS (EMQX Cloud).

---

## 📁 Cấu Trúc Dự Án (Modular & Dễ Bảo Trì)

```text
d:\web_iot\
├── index.html            # Khung giao diện HTML5 chuẩn (không chứa inline CSS/JS)
├── server.js             # Local Web Server thuần Node.js (chạy port 3000 không cần cài thêm npm)
├── css/
│   └── style.css         # Toàn bộ giao diện Dark Mode, Glassmorphism, Responsive & hiệu ứng
├── js/
│   ├── config.js         # Toàn bộ tham số cấu hình: Broker URL, Topics, Business Rules, LocalStorage
│   ├── mqtt-service.js   # Module quản lý kết nối MQTT.js, Subscribe QoS 1, Publish xả hạt
│   ├── ui.js             # Module cập nhật DOM: Vòng Gauge, Thẻ thống kê, Banner cảnh báo, Console Logs
│   └── app.js            # Controller chính: Xử lý 3 Business Rules, Cooldown 60s, Hysteresis, Telegram Web App
```

---

## ⚙️ Các Quy Tắc Nghiệp Vụ (Business Rules)
1. **Rule 1 - Chống spam (MIN_GAP = 60s):**
   - Vô hiệu hoá nút xả hạt trong 60 giây sau khi bấm.
   - Hiển thị đếm ngược thời gian thực trên nút.
   - Tự động lưu timestamp vào `localStorage` giúp bảo lưu đếm ngược cả khi F5 hoặc mở lại Telegram Web App.
2. **Rule 2 - Cảnh báo cạn hạt cơ chế trễ (Hysteresis):**
   - `< 20%`: Kích hoạt banner cảnh báo đỏ.
   - `>= 25%`: Tự động ẩn banner.
   - Trong khoảng `[20%, 25%)`: Giữ nguyên trạng thái trước đó chống chập chờn.
3. **Rule 3 - Giới hạn bữa ăn:**
   - Đạt trần `6/6 bữa/ngày` tự động khóa nút bấm và thông báo.

---

## 🚀 Cách Chạy Ứng Dụng

### Cách 1: Chạy qua Local Server (Khuyên dùng)
Mở terminal tại thư mục `d:\web_iot` và gõ:
```bash
node server.js
```
Sau đó truy cập trình duyệt: `http://localhost:3000`

### Cách 2: Mở trực tiếp file HTML
Double click file `index.html` để mở trong trình duyệt Chrome/Edge/Firefox.

---

## 🛠️ Thay Đổi Cấu Hình Nhanh
- **Giao diện:** Bấm nút **⚙️ (Bánh răng)** ở góc trên bên phải header để thay đổi Broker URL, Username, Password mà không cần sửa code.
- **File code:** Chỉnh sửa trực tiếp file [js/config.js](file:///d:/web_iot/js/config.js).
