# 商品積分上傳系統

這是一個靜態網頁，可以讓客人上傳商品照片，透過 OCR 辨識文字並累積積分，同時將記錄同步到 Google Sheet。

## 功能特色

- ✅ 完全免費（使用 Tesseract.js 純前端 OCR）
- ✅ 可部署在 Netlify
- ✅ 照片僅暫存，辨識後即可刪除
- ✅ 自動同步資料到 Google Sheet

## 設定步驟

### 1. 設定 Google Apps Script

1. 開啟您的 Google Sheet
2. 點選「擴充功能」→「Apps Script」
3. 將 `google-apps-script.js` 的內容貼上
4. 點選「部署」→「新增部署作業」
5. 類型選擇「網頁應用程式」
6. 執行身分選擇「我」
7. 存取權限選擇「所有人」
8. 點選「部署」
9. 複製產生的「網頁應用程式網址」

### 2. 設定產品關鍵字

編輯 `script.js`，在 `PRODUCT_KEYWORDS` 陣列中填入 6 個品項的關鍵字：

```javascript
const PRODUCT_KEYWORDS = [
    { name: '纖歲茶', keywords: ['纖歲', '纖歲茶'] },
    { name: '品項2', keywords: ['關鍵字1', '關鍵字2'] },
    // ... 其他 4 個品項
];
```

### 3. 設定 Google Script URL

編輯 `script.js`，將 `GOOGLE_SCRIPT_URL` 替換為步驟 1 取得的網址：

```javascript
const GOOGLE_SCRIPT_URL = 'https://script.google.com/...';
```

### 4. 部署到 Netlify

1. 將所有檔案上傳到 GitHub 儲存庫
2. 登入 [Netlify](https://www.netlify.com/)
3. 點選「Add new site」→「Import an existing project」
4. 選擇您的 GitHub 儲存庫
5. 建置指令留空，發佈目錄填寫 `/`
6. 點選「Deploy site」

完成！您的網頁即可使用。

## 檔案說明

- `index.html` - 主頁面
- `styles.css` - 樣式檔案
- `script.js` - 主要功能邏輯
- `google-apps-script.js` - Google Apps Script 程式碼（需手動貼到 Google Sheet）

## 技術說明

- **OCR 引擎**: Tesseract.js 4.1.1
- **辨識語言**: 繁體中文 + 英文
- **相似度計算**: 自訂演算法，支援包含度檢查和字元匹配
- **積分規則**: 相似度 ≥ 50% 即可獲得 1 點

