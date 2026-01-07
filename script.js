// 商品關鍵字配置（待用戶提供完整列表後填入）
const PRODUCT_KEYWORDS = [
    { name: '纖歲茶', keywords: ['纖歲'] },
    // 待添加其他 5 個品項...
];

// Google Apps Script Web App URL（待用戶提供）
const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_SCRIPT_URL_HERE';

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    const photoInput = document.getElementById('photo');
    const preview = document.getElementById('preview');
    const form = document.getElementById('uploadForm');
    
    // 照片預覽
    photoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" alt="預覽">`;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // 表單提交
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const photoFile = document.getElementById('photo').files[0];
        
        if (!photoFile) {
            showResult('請選擇要上傳的照片', 'error');
            return;
        }
        
        // 顯示載入中
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('submitBtn').disabled = true;
        hideResult();
        
        try {
            // OCR 辨識
            const ocrResult = await performOCR(photoFile);
            console.log('OCR 辨識結果:', ocrResult);
            
            // 比對關鍵字
            const matchResult = matchKeywords(ocrResult);
            console.log('比對結果:', matchResult);
            
            // 寫入 Google Sheet
            if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
                await saveToGoogleSheet(name, phone, ocrResult, matchResult);
            } else {
                console.warn('Google Script URL 尚未設定');
            }
            
            // 顯示結果
            if (matchResult.matched) {
                showResult(
                    `✓ 辨識成功！<br>` +
                    `辨識到的文字：${ocrResult}<br>` +
                    `符合品項：${matchResult.productName}<br>` +
                    `相似度：${(matchResult.similarity * 100).toFixed(1)}%<br>` +
                    `獲得積分：${matchResult.points} 點`,
                    'success'
                );
            } else {
                showResult(
                    `✗ 辨識失敗<br>` +
                    `辨識到的文字：${ocrResult}<br>` +
                    `未找到符合的商品關鍵字（相似度需 > 50%）`,
                    'error'
                );
            }
            
        } catch (error) {
            console.error('處理失敗:', error);
            showResult('處理失敗：' + error.message, 'error');
        } finally {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('submitBtn').disabled = false;
        }
    });
});

// OCR 辨識函數
async function performOCR(imageFile) {
    const { data: { text } } = await Tesseract.recognize(
        imageFile,
        'chi_tra+eng', // 支援繁體中文和英文
        {
            logger: m => {
                if (m.status === 'recognizing text') {
                    console.log('辨識進度:', Math.round(m.progress * 100) + '%');
                }
            }
        }
    );
    
    return text.trim();
}

// 關鍵字比對函數
function matchKeywords(ocrText) {
    let bestMatch = {
        matched: false,
        productName: '',
        similarity: 0,
        points: 0
    };
    
    // 清理辨識文字（移除空白、換行）
    const cleanText = ocrText.replace(/\s+/g, '');
    
    // 比對每個商品
    for (const product of PRODUCT_KEYWORDS) {
        for (const keyword of product.keywords) {
            const cleanKeyword = keyword.replace(/\s+/g, '');
            
            // 計算相似度（使用最長公共子序列或包含度）
            const similarity = calculateSimilarity(cleanText, cleanKeyword);
            
            if (similarity > bestMatch.similarity) {
                bestMatch.similarity = similarity;
                bestMatch.productName = product.name;
            }
        }
    }
    
    // 如果相似度 > 0.5 (50%)，則符合
    if (bestMatch.similarity >= 0.5) {
        bestMatch.matched = true;
        bestMatch.points = 1;
    }
    
    return bestMatch;
}

// 計算相似度（簡化版本：使用包含度和編輯距離概念）
function calculateSimilarity(text, keyword) {
    // 方法1: 如果文字包含關鍵字，相似度為 1.0
    if (text.includes(keyword)) {
        return 1.0;
    }
    
    // 方法2: 計算關鍵字在文字中的最大匹配度
    let maxMatch = 0;
    const keywordLength = keyword.length;
    
    // 滑動視窗檢查
    for (let i = 0; i <= text.length - keywordLength; i++) {
        const substring = text.substring(i, i + keywordLength);
        let matchCount = 0;
        
        for (let j = 0; j < keywordLength; j++) {
            if (substring[j] === keyword[j]) {
                matchCount++;
            }
        }
        
        const matchRate = matchCount / keywordLength;
        if (matchRate > maxMatch) {
            maxMatch = matchRate;
        }
    }
    
    // 如果關鍵字很短，也檢查部分匹配
    if (keywordLength <= 2 && maxMatch < 0.5) {
        // 檢查單個字元的匹配
        for (const char of keyword) {
            if (text.includes(char)) {
                maxMatch = Math.max(maxMatch, 0.6);
            }
        }
    }
    
    return maxMatch;
}

// 寫入 Google Sheet
async function saveToGoogleSheet(name, phone, ocrText, matchResult) {
    const data = {
        date: new Date().toLocaleString('zh-TW'),
        name: name,
        phone: phone,
        ocrText: ocrText,
        productName: matchResult.matched ? matchResult.productName : '不符合',
        similarity: (matchResult.similarity * 100).toFixed(1) + '%',
        points: matchResult.points,
        status: matchResult.matched ? '成功' : '失敗'
    };
    
    const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    
    // 注意：由於 no-cors，無法讀取 response
    // 但資料應該已經寫入
    console.log('已嘗試寫入 Google Sheet:', data);
}

// 顯示結果
function showResult(message, type) {
    const resultArea = document.getElementById('result');
    resultArea.innerHTML = message;
    resultArea.className = `result-area ${type}`;
}

function hideResult() {
    const resultArea = document.getElementById('result');
    resultArea.className = 'result-area';
}

