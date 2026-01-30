from flask import Flask, render_template, request, jsonify, session
import json
import os
import sys
import threading
import time
from datetime import datetime

# Thêm thư mục modules vào path
sys.path.append('modules')

from modules.nuoi_acc import NuoiAcc
from modules.buff_share import BuffShare
from modules.buff_cmt import BuffCmt

app = Flask(__name__)
app.secret_key = 'facebook_tools_secret_key_2024'
app.config['SESSION_TYPE'] = 'filesystem'

# Trạng thái chạy
running_status = {
    'nuoi_acc': False,
    'buff_share': False,
    'buff_cmt': False,
    'current_module': None
}

# Threads đang chạy
active_threads = {}

# Cookie data
cookie_data = {
    'nuoi_acc': [],
    'buff_share': [],
    'buff_cmt': []
}

# Logs
logs = {
    'nuoi_acc': [],
    'buff_share': [],
    'buff_cmt': []
}

def add_log(module, message, level='info'):
    """Thêm log vào hệ thống"""
    timestamp = datetime.now().strftime('%H:%M:%S')
    log_entry = {
        'time': timestamp,
        'message': message,
        'level': level
    }
    logs[module].append(log_entry)
    
    # Giữ tối đa 100 log mỗi module
    if len(logs[module]) > 100:
        logs[module].pop(0)

@app.route('/')
def index():
    """Trang chủ"""
    return render_template('index.html')

@app.route('/api/<module>/check-cookies', methods=['POST'])
def check_cookies(module):
    """Kiểm tra cookies"""
    try:
        cookies_text = request.json.get('cookies', '')
        if not cookies_text:
            return jsonify({'error': 'Vui lòng nhập cookies!'}), 400
        
        # Tách cookies
        cookies_list = [c.strip() for c in cookies_text.split('\n') if c.strip()]
        
        # Lưu cookies tạm thời
        cookie_data[module] = cookies_list
        
        # Check live cookies
        if module == 'nuoi_acc':
            handler = NuoiAcc(cookies_list)
        elif module == 'buff_share':
            handler = BuffShare(cookies_list)
        elif module == 'buff_cmt':
            handler = BuffCmt(cookies_list)
        else:
            return jsonify({'error': 'Module không hợp lệ!'}), 400
        
        results = handler.check_cookies_live()
        
        # Thêm log
        live_count = sum(1 for r in results if r['status'] == 'live')
        add_log(module, f'Đã kiểm tra {len(results)} cookies, {live_count} LIVE')
        
        return jsonify({
            'success': True,
            'results': results,
            'total': len(results),
            'live': live_count
        })
        
    except Exception as e:
        add_log(module, f'Lỗi khi kiểm tra cookies: {str(e)}', 'error')
        return jsonify({'error': str(e)}), 500

@app.route('/api/<module>/start', methods=['POST'])
def start_module(module):
    """Bắt đầu chạy module"""
    try:
        if running_status[module]:
            return jsonify({'error': 'Module đang chạy!'}), 400
        
        # Lấy tham số từ request
        params = request.json
        
        # Khởi tạo handler
        if module == 'nuoi_acc':
            handler = NuoiAcc(cookie_data[module])
            thread = threading.Thread(target=handler.run, args=(params, add_log))
        elif module == 'buff_share':
            handler = BuffShare(cookie_data[module])
            thread = threading.Thread(target=handler.run, args=(params, add_log))
        elif module == 'buff_cmt':
            handler = BuffCmt(cookie_data[module])
            thread = threading.Thread(target=handler.run, args=(params, add_log))
        else:
            return jsonify({'error': 'Module không hợp lệ!'}), 400
        
        # Lưu thread và bắt đầu
        active_threads[module] = {
            'thread': thread,
            'handler': handler,
            'params': params
        }
        
        running_status[module] = True
        thread.daemon = True
        thread.start()
        
        add_log(module, f'Đã bắt đầu chạy {module}')
        
        return jsonify({'success': True})
        
    except Exception as e:
        add_log(module, f'Lỗi khi bắt đầu: {str(e)}', 'error')
        return jsonify({'error': str(e)}), 500

@app.route('/api/<module>/stop', methods=['POST'])
def stop_module(module):
    """Dừng module"""
    try:
        if not running_status[module]:
            return jsonify({'error': 'Module không chạy!'}), 400
        
        if module in active_threads:
            # Gửi tín hiệu dừng
            active_threads[module]['handler'].stop()
        
        running_status[module] = False
        add_log(module, 'Đã dừng')
        
        return jsonify({'success': True})
        
    except Exception as e:
        add_log(module, f'Lỗi khi dừng: {str(e)}', 'error')
        return jsonify({'error': str(e)}), 500

@app.route('/api/<module>/continue', methods=['POST'])
def continue_module(module):
    """Tiếp tục module"""
    try:
        if running_status[module]:
            return jsonify({'error': 'Module đang chạy!'}), 400
        
        # Lấy params cũ
        if module not in active_threads:
            return jsonify({'error': 'Không tìm thấy thông tin module!'}), 400
        
        params = active_threads[module]['params']
        
        # Khởi tạo handler mới
        if module == 'nuoi_acc':
            handler = NuoiAcc(cookie_data[module])
            thread = threading.Thread(target=handler.run, args=(params, add_log))
        elif module == 'buff_share':
            handler = BuffShare(cookie_data[module])
            thread = threading.Thread(target=handler.run, args=(params, add_log))
        elif module == 'buff_cmt':
            handler = BuffCmt(cookie_data[module])
            thread = threading.Thread(target=handler.run, args=(params, add_log))
        
        # Cập nhật thread
        active_threads[module] = {
            'thread': thread,
            'handler': handler,
            'params': params
        }
        
        running_status[module] = True
        thread.daemon = True
        thread.start()
        
        add_log(module, 'Đã tiếp tục chạy')
        
        return jsonify({'success': True})
        
    except Exception as e:
        add_log(module, f'Lỗi khi tiếp tục: {str(e)}', 'error')
        return jsonify({'error': str(e)}), 500

@app.route('/api/<module>/end', methods=['POST'])
def end_module(module):
    """Kết thúc module"""
    try:
        # Dừng nếu đang chạy
        if running_status[module]:
            if module in active_threads:
                active_threads[module]['handler'].stop()
        
        # Reset trạng thái
        running_status[module] = False
        if module in active_threads:
            del active_threads[module]
        
        add_log(module, 'Đã kết thúc')
        
        return jsonify({'success': True})
        
    except Exception as e:
        add_log(module, f'Lỗi khi kết thúc: {str(e)}', 'error')
        return jsonify({'error': str(e)}), 500

@app.route('/api/<module>/logs', methods=['GET'])
def get_logs(module):
    """Lấy log của module"""
    if module not in logs:
        return jsonify({'error': 'Module không hợp lệ!'}), 400
    
    return jsonify({'logs': logs[module]})

@app.route('/api/<module>/status', methods=['GET'])
def get_status(module):
    """Lấy trạng thái module"""
    return jsonify({
        'running': running_status[module],
        'has_cookies': len(cookie_data[module]) > 0
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
