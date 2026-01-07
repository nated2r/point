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
    
    // 清理辨識文字（移除空白、換行），但保留中文字符
    const cleanText = ocrText.replace(/\s+/g, '');
    
    // 比對每個商品
    for (const product of PRODUCT_KEYWORDS) {
        for (const keyword of product.keywords) {
            const cleanKeyword = keyword.replace(/\s+/g, '');
            
            // 計算相似度（使用改進的匹配算法）
            const similarity = calculateSimilarity(cleanText, cleanKeyword);
            
            console.log(`關鍵字 "${keyword}" 相似度: ${(similarity * 100).toFixed(1)}%`);
            
            if (similarity > bestMatch.similarity) {
                bestMatch.similarity = similarity;
                bestMatch.productName = product.name;
            }
        }
    }
    
    // 降低門檻到 0.35 (35%)，讓匹配更容易
    if (bestMatch.similarity >= 0.35) {
        bestMatch.matched = true;
        bestMatch.points = 1;
    }
    
    return bestMatch;
}

// 計算相似度（改進版本：更好的關鍵字匹配）
function calculateSimilarity(text, keyword) {
    // 方法1: 如果文字包含完整的關鍵字，相似度為 1.0
    if (text.includes(keyword)) {
        return 1.0;
    }
    
    // 方法2: 使用正則表達式檢查關鍵字（允許中間有較多其他字符）
    // 對於「纖歲」這種兩個字的情況，允許中間有 0-10 個其他字符（更寬鬆）
    const keywordChars = keyword.split('');
    if (keywordChars.length >= 2) {
        // 建立靈活的正則表達式模式（允許中間有更多字符）
        const flexiblePattern = keywordChars.join('[\\s\\S]{0,10}'); // 允許中間有0-10個任意字符
        const regex = new RegExp(flexiblePattern);
        if (regex.test(text)) {
            return 0.85; // 如果找到靈活匹配，給較高的相似度
        }
        
        // 也嘗試反向匹配（順序相反但字符相同）
        const reversedPattern = keywordChars.reverse().join('[\\s\\S]{0,10}');
        const reversedRegex = new RegExp(reversedPattern);
        if (reversedRegex.test(text)) {
            return 0.75; // 反向匹配也給予較高相似度
        }
        keywordChars.reverse(); // 恢復原順序
    }
    
    // 方法3: 檢查關鍵字的所有字符是否都出現在文字中（順序可以不連續，更寬鬆）
    let allCharsFound = true;
    let foundPositions = [];
    
    // 不要求順序，只要所有字符都出現即可
    for (const char of keyword) {
        const foundPos = text.indexOf(char);
        if (foundPos >= 0) {
            foundPositions.push(foundPos);
        } else {
            allCharsFound = false;
            break;
        }
    }
    
    if (allCharsFound && foundPositions.length === keyword.length) {
        // 排序位置，檢查字符之間的距離
        foundPositions.sort((a, b) => a - b);
        const span = foundPositions[foundPositions.length - 1] - foundPositions[0];
        const idealSpan = keyword.length - 1;
        
        // 如果字符之間的距離不超過關鍵字長度的 10 倍（更寬鬆），認為匹配
        if (span <= idealSpan * 10) {
            return 0.7; // 所有字符都找到，即使距離較遠也匹配
        }
        
        // 即使距離很遠，如果所有字符都找到，也給一個基本分數
        return 0.5;
    }
    
    // 方法4: 計算部分匹配度（字符匹配百分比，降低門檻）
    let matchedChars = 0;
    for (const char of keyword) {
        if (text.includes(char)) {
            matchedChars++;
        }
    }
    
    const charMatchRate = matchedChars / keyword.length;
    if (charMatchRate >= 0.8) {
        return 0.65; // 80% 以上的字符匹配
    } else if (charMatchRate >= 0.5) {
        return 0.45; // 50% 以上的字符匹配也給分數
    }
    
    // 方法5: 傳統的滑動視窗方法（作為備用）
    let maxMatch = 0;
    const keywordLength = keyword.length;
    
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

