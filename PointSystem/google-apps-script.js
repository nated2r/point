// Google Apps Script 程式碼
// 請將此程式碼貼到您的 Google Sheet 的 Apps Script 編輯器中
// 步驟：
// 1. 開啟您的 Google Sheet
// 2. 點選「擴充功能」->「Apps Script」
// 3. 貼上以下程式碼
// 4. 儲存並部署為網頁應用程式

function doPost(e) {
  try {
    // 取得傳入的資料
    const data = JSON.parse(e.postData.contents);
    
    // 取得目前的 Google Sheet
    const sheet = SpreadsheetApp.getActiveSheet();
    
    // 如果是第一次執行，建立標題列
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        '日期',
        '姓名',
        '電話',
        '辨識文字',
        '商品名稱',
        '相似度',
        '積分',
        '狀態'
      ]);
    }
    
    // 新增一筆資料
    sheet.appendRow([
      data.date || new Date(),
      data.name || '',
      data.phone || '',
      data.ocrText || '',
      data.productName || '',
      data.similarity || '',
      data.points || 0,
      data.status || ''
    ]);
    
    // 回傳成功訊息（注意：由於 no-cors，前端可能無法接收）
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: '資料已成功寫入'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // 回傳錯誤訊息
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 測試函數（可選）
function test() {
  const testData = {
    date: new Date().toLocaleString('zh-TW'),
    name: '測試用戶',
    phone: '0912345678',
    ocrText: '測試文字',
    productName: '纖歲茶',
    similarity: '85%',
    points: 1,
    status: '成功'
  };
  
  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  doPost(e);
}

