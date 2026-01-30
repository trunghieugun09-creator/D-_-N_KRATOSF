// Biến toàn cục
let currentModule = 'nuoi_acc';
let logsInterval = null;
let statusInterval = null;

// Cập nhật thời gian
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('vi-VN');
    document.getElementById('current_time').textContent = timeString;
}

// Chuyển tab
function switchTab(tabName) {
    // Ẩn tất cả tab
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Hiện tab được chọn
    document.getElementById(tabName).classList.add('active');
    
    // Cập nhật nút tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    currentModule = tabName;
    updateStatus();
    loadLogs(tabName);
}

// Kiểm tra cookies
async function checkCookies(module) {
    const textareaId = `${module}_cookies`;
    const cookies = document.getElementById(textareaId).value.trim();
    
    if (!cookies) {
        alert('Vui lòng nhập cookies!');
        return;
    }
    
    try {
        const response = await fetch(`/api/${module}/check-cookies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cookies })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Hiển thị thông tin cookies
            displayCookieInfo(module, data.results);
            
            // Hiện nút "Bắt đầu"
            document.getElementById(`${module}_start`).style.display = 'flex';
            document.getElementById(`${module}_stop`).style.display = 'none';
            document.getElementById(`${module}_continue`).style.display = 'none';
            document.getElementById(`${module}_end`).style.display = 'none';
            
            // Thêm log
            addLog(module, `✅ Đã kiểm tra ${data.total} cookies, ${data.live} LIVE`);
        } else {
            alert(`Lỗi: ${data.error}`);
        }
    } catch (error) {
        console.error('Lỗi kiểm tra cookies:', error);
        alert('Lỗi kết nối đến server!');
    }
}

// Hiển thị thông tin cookies
function displayCookieInfo(module, results) {
    const container = document.getElementById(`${module}_cookie_details`);
    container.innerHTML = '';
    
    if (results.length === 0) {
        container.innerHTML = '<p class="placeholder">Không có cookies hợp lệ</p>';
        return;
    }
    
    results.forEach(result => {
        const cookieDiv = document.createElement('div');
        cookieDiv.className = 'cookie-item';
        
        cookieDiv.innerHTML = `
            <div class="cookie-header">
                <span class="cookie-name">${result.name}</span>
                <span class="cookie-status ${result.status}">${result.status.toUpperCase()}</span>
            </div>
            <div class="cookie-uid">
                👤 Tên: ${result.name}<br>
                🆔 UID: ${result.uid}<br>
                📊 Trạng thái: ${result.message}
            </div>
        `;
        
        container.appendChild(cookieDiv);
    });
}

// Bắt đầu module
async function startModule(module) {
    // Lấy tham số
    let params = {};
    
    if (module === 'nuoi_acc') {
        params.delay = 60; // Default 60 seconds
    } else if (module === 'buff_share') {
        params.post_id = document.getElementById('share_post_id').value;
        params.delay = parseInt(document.getElementById('share_delay').value);
        params.total_shares = parseInt(document.getElementById('share_total').value);
    } else if (module === 'buff_cmt') {
        params.post_id = document.getElementById('cmt_post_id').value;
        params.message = document.getElementById('cmt_message').value;
        params.delay = parseInt(document.getElementById('cmt_delay').value);
        params.total_comments = parseInt(document.getElementById('cmt_total').value);
    }
    
    try {
        const response = await fetch(`/api/${module}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Đổi nút
            document.getElementById(`${module}_start`).style.display = 'none';
            document.getElementById(`${module}_stop`).style.display = 'flex';
            document.getElementById(`${module}_continue`).style.display = 'none';
            document.getElementById(`${module}_end`).style.display = 'none';
            
            updateStatus();
            addLog(module, '🚀 Đã bắt đầu chạy...');
        } else {
            alert(`Lỗi: ${data.error}`);
        }
    } catch (error) {
        console.error('Lỗi bắt đầu module:', error);
        alert('Lỗi kết nối đến server!');
    }
}

// Dừng module
async function stopModule(module) {
    try {
        const response = await fetch(`/api/${module}/stop`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Đổi nút
            document.getElementById(`${module}_stop`).style.display = 'none';
            document.getElementById(`${module}_continue`).style.display = 'flex';
            document.getElementById(`${module}_end`).style.display = 'flex';
            
            updateStatus();
            addLog(module, '⏸️ Đã tạm dừng');
        } else {
            alert(`Lỗi: ${data.error}`);
        }
    } catch (error) {
        console.error('Lỗi dừng module:', error);
        alert('Lỗi kết nối đến server!');
    }
}

// Tiếp tục module
async function continueModule(module) {
    try {
        const response = await fetch(`/api/${module}/continue`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Đổi nút
            document.getElementById(`${module}_continue`).style.display = 'none';
            document.getElementById(`${module}_end`).style.display = 'none';
            document.getElementById(`${module}_stop`).style.display = 'flex';
            
            updateStatus();
            addLog(module, '▶️ Đã tiếp tục chạy');
        } else {
            alert(`Lỗi: ${data.error}`);
        }
    } catch (error) {
        console.error('Lỗi tiếp tục module:', error);
        alert('Lỗi kết nối đến server!');
    }
}

// Kết thúc module
async function endModule(module) {
    try {
        const response = await fetch(`/api/${module}/end`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Reset nút
            document.getElementById(`${module}_start`).style.display = 'flex';
            document.getElementById(`${module}_stop`).style.display = 'none';
            document.getElementById(`${module}_continue`).style.display = 'none';
            document.getElementById(`${module}_end`).style.display = 'none';
            
            updateStatus();
            addLog(module, '⏹️ Đã kết thúc');
        } else {
            alert(`Lỗi: ${data.error}`);
        }
    } catch (error) {
        console.error('Lỗi kết thúc module:', error);
        alert('Lỗi kết nối đến server!');
    }
}

// Thêm log
function addLog(module, message, level = 'info') {
    const logBox = document.getElementById(`${module}_logs`);
    const now = new Date();
    const timeString = now.toLocaleTimeString('vi-VN');
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = timeString;
    
    const messageSpan = document.createElement('span');
    messageSpan.className = `log-message ${level}`;
    messageSpan.textContent = message;
    
    logEntry.appendChild(timeSpan);
    logEntry.appendChild(messageSpan);
    logBox.appendChild(logEntry);
    
    // Auto scroll to bottom
    logBox.scrollTop = logBox.scrollHeight;
}

// Tải logs từ server
async function loadLogs(module) {
    try {
        const response = await fetch(`/api/${module}/logs`);
        const data = await response.json();
        
        if (response.ok) {
            const logBox = document.getElementById(`${module}_logs`);
            logBox.innerHTML = '';
            
            data.logs.forEach(log => {
                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry';
                
                const timeSpan = document.createElement('span');
                timeSpan.className = 'log-time';
                timeSpan.textContent = log.time;
                
                const messageSpan = document.createElement('span');
                messageSpan.className = `log-message ${log.level}`;
                messageSpan.textContent = log.message;
                
                logEntry.appendChild(timeSpan);
                logEntry.appendChild(messageSpan);
                logBox.appendChild(logEntry);
            });
            
            // Auto scroll to bottom
            logBox.scrollTop = logBox.scrollHeight;
        }
    } catch (error) {
        console.error('Lỗi tải logs:', error);
    }
}

// Cập nhật trạng thái
async function updateStatus() {
    const modules = ['nuoi_acc', 'buff_share', 'buff_cmt'];
    
    for (const module of modules) {
        try {
            const response = await fetch(`/api/${module}/status`);
            const data = await response.json();
            
            const statusElement = document.getElementById(`status_${module.split('_')[1]}`);
            
            if (data.running) {
                statusElement.className = 'status-running';
                statusElement.textContent = '●';
            } else if (data.has_cookies) {
                statusElement.className = 'status-paused';
                statusElement.textContent = '●';
            } else {
                statusElement.className = 'status-idle';
                statusElement.textContent = '●';
            }
        } catch (error) {
            console.error('Lỗi cập nhật trạng thái:', error);
        }
    }
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', function() {
    // Cập nhật thời gian
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Cập nhật trạng thái mỗi 5 giây
    updateStatus();
    statusInterval = setInterval(updateStatus, 5000);
    
    // Tải logs mỗi 3 giây
    loadLogs(currentModule);
    logsInterval = setInterval(() => loadLogs(currentModule), 3000);
    
    // Tab click events
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Nuôi Acc events
    document.getElementById('nuoi_check').addEventListener('click', () => checkCookies('nuoi_acc'));
    document.getElementById('nuoi_start').addEventListener('click', () => startModule('nuoi_acc'));
    document.getElementById('nuoi_stop').addEventListener('click', () => stopModule('nuoi_acc'));
    document.getElementById('nuoi_continue').addEventListener('click', () => continueModule('nuoi_acc'));
    document.getElementById('nuoi_end').addEventListener('click', () => endModule('nuoi_acc'));
    
    // Buff Share events
    document.getElementById('share_check').addEventListener('click', () => checkCookies('buff_share'));
    document.getElementById('share_start').addEventListener('click', () => startModule('buff_share'));
    document.getElementById('share_stop').addEventListener('click', () => stopModule('buff_share'));
    document.getElementById('share_continue').addEventListener('click', () => continueModule('buff_share'));
    document.getElementById('share_end').addEventListener('click', () => endModule('buff_share'));
    
    // Buff Comment events
    document.getElementById('cmt_check').addEventListener('click', () => checkCookies('buff_cmt'));
    document.getElementById('cmt_start').addEventListener('click', () => startModule('buff_cmt'));
    document.getElementById('cmt_stop').addEventListener('click', () => stopModule('buff_cmt'));
    document.getElementById('cmt_continue').addEventListener('click', () => continueModule('buff_cmt'));
    document.getElementById('cmt_end').addEventListener('click', () => endModule('buff_cmt'));
    
    // Prevent form submission
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    });
});

// Clean up intervals
window.addEventListener('beforeunload', function() {
    if (logsInterval) clearInterval(logsInterval);
    if (statusInterval) clearInterval(statusInterval);
});
