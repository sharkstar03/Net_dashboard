from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from models import User, MonitoredService, Notification, AppSettings
from extensions import db
import psutil
import socket
import time
import platform
import subprocess
import requests
import re

main_bp = Blueprint('main', __name__)

def send_telegram_alert(user, title, message):
    if not user.settings or not user.settings.telegram_bot_token or not user.settings.telegram_chat_id:
        return
    
    token = user.settings.telegram_bot_token
    chat_id = user.settings.telegram_chat_id
    text = f"🚨 *{title}*\n\n{message}\n\n_NetDashboard Alert_"
    
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'Markdown'
    }
    try:
        requests.post(url, json=payload, timeout=5)
    except Exception as e:
        print(f"Telegram Error: {e}")

def send_whatsapp_alert(user, title, message):
    if not user.settings or not user.settings.whatsapp_phone or not user.settings.whatsapp_apikey:
        return

    phone = user.settings.whatsapp_phone
    apikey = user.settings.whatsapp_apikey
    text = f"🚨 *{title}*\n\n{message}\n\n_NetDashboard Alert_"
    
    # URL Encode the text
    import urllib.parse
    encoded_text = urllib.parse.quote(text)
    
    url = f"https://api.callmebot.com/whatsapp.php?phone={phone}&text={encoded_text}&apikey={apikey}"
    
    try:
        requests.get(url, timeout=10)
    except Exception as e:
        print(f"WhatsApp Error: {e}")


@main_bp.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return redirect(url_for('main.login'))

@main_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('main.dashboard'))
        else:
            flash('Usuario o contraseña incorrectos', 'danger')
            
    return render_template('login.html')

@main_bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if User.query.filter_by(username=username).first():
            flash('El nombre de usuario ya existe', 'warning')
        else:
            new_user = User(username=username)
            new_user.set_password(password)
            db.session.add(new_user)
            db.session.commit()
            flash('Cuenta creada exitosamente. Por favor inicia sesión.', 'success')
            return redirect(url_for('main.login'))
            
    return render_template('register.html')

@main_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.login'))

@main_bp.route('/dashboard')
@login_required
def dashboard():
    if not current_user.settings:
        settings = AppSettings(user_id=current_user.id)
        db.session.add(settings)
        db.session.commit()
        
    services = MonitoredService.query.all()
    # Get unread count
    unread_count = Notification.query.filter_by(read=False).count()
    notifications = Notification.query.order_by(Notification.timestamp.desc()).limit(10).all()
    return render_template('dashboard.html', user=current_user, services=services, notifications=notifications, unread_count=unread_count)

@main_bp.route('/settings')
@login_required
def settings():
    if not current_user.settings:
        settings = AppSettings(user_id=current_user.id)
        db.session.add(settings)
        db.session.commit()
    return render_template('settings.html', user=current_user)

@main_bp.route('/about')
def about():
    return render_template('about.html', user=current_user if current_user.is_authenticated else None)

@main_bp.route('/api/settings', methods=['POST'])
@login_required
def update_settings():
    data = request.json
    if not current_user.settings:
        current_user.settings = AppSettings(user_id=current_user.id)
    
    current_user.settings.theme = data.get('theme', 'system')
    current_user.settings.show_public_ip = data.get('show_public_ip', False)
    current_user.settings.telegram_bot_token = data.get('telegram_bot_token', '')
    current_user.settings.telegram_chat_id = data.get('telegram_chat_id', '')
    current_user.settings.whatsapp_phone = data.get('whatsapp_phone', '')
    current_user.settings.whatsapp_apikey = data.get('whatsapp_apikey', '')
    current_user.settings.notifications_enabled = data.get('notifications_enabled', True)
    
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Configuración guardada'})

@main_bp.route('/api/services', methods=['GET', 'POST', 'PUT'])
@login_required
def services():
    if request.method == 'POST':
        data = request.json
        name = data.get('name')
        url = data.get('url')
        stype = data.get('type', 'http')
        if name and url:
            new_service = MonitoredService(name=name, url=url, type=stype)
            db.session.add(new_service)
            db.session.commit()
            return jsonify({'status': 'success', 'message': 'Service added'})
        return jsonify({'status': 'error', 'message': 'Missing data'}), 400
    
    if request.method == 'PUT':
        data = request.json
        sid = data.get('id')
        service = MonitoredService.query.get(sid)
        if service:
            service.name = data.get('name', service.name)
            service.url = data.get('url', service.url)
            service.type = data.get('type', service.type)
            db.session.commit()
            return jsonify({'status': 'success', 'message': 'Service updated'})
        return jsonify({'status': 'error', 'message': 'Service not found'}), 404

    # Check services status
    services = MonitoredService.query.all()
    results = []
    for service in services:
        try:
            start = time.time()
            if service.type == 'ping':
                # Ping Logic
                param = '-n' if platform.system().lower() == 'windows' else '-c'
                # Clean URL if it contains protocol
                target = service.url.replace('http://', '').replace('https://', '').split('/')[0]
                command = ['ping', param, '1', target]
                output = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                if output.returncode == 0:
                    service.status = 'Up'
                    # Try to parse ms if possible, or use wall clock
                    service.response_time = round((time.time() - start) * 1000, 2)
                else:
                    service.status = 'Down'
                    service.response_time = 0
            else:
                # HTTP Logic
                if not service.url.startswith('http'):
                    target_url = 'http://' + service.url
                else:
                    target_url = service.url
                response = requests.get(target_url, timeout=5)
                service.status = 'Up' if response.status_code == 200 else 'Down'
                service.response_time = round(response.elapsed.total_seconds() * 1000, 2)
        except Exception as e:
            service.status = 'Down'
            service.response_time = 0
        
        # Check for Down status and alert
        if service.status == 'Down':
             create_anomaly_notification('Servicio Caído', f'El servicio {service.name} ({service.url}) no responde.', 'danger')

        service.last_checked = db.func.now()
        results.append({
            'id': service.id,
            'name': service.name,
            'url': service.url,
            'type': service.type,
            'status': service.status,
            'response_time': service.response_time
        })
    db.session.commit()
    return jsonify(results)

@main_bp.route('/api/network/scan')
@login_required
def network_scan():
    # Simple ARP scan using system command
    devices = []
    try:
        command = ['arp', '-a']
        output = subprocess.check_output(command).decode('utf-8', errors='ignore')
        
        # Parse output (Windows format mostly)
        # Interface: 192.168.1.10 --- 0x12
        #   Internet Address      Physical Address      Type
        #   192.168.1.1           00-11-22-33-44-55     dynamic
        
        lines = output.split('\n')
        current_interface = ""
        
        for line in lines:
            line = line.strip()
            if not line: continue
            
            if line.startswith('Interface:'):
                current_interface = line.split()[1]
                continue
                
            # Match IP and MAC
            # Simple regex for IP
            parts = line.split()
            if len(parts) >= 2:
                ip = parts[0]
                mac = parts[1]
                # Validate IP structure
                if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", ip):
                    # Filter out multicast/broadcast if needed
                    if not ip.startswith('224.') and not ip.startswith('239.') and ip != '255.255.255.255':
                        devices.append({
                            'ip': ip,
                            'mac': mac,
                            'type': parts[2] if len(parts) > 2 else 'unknown',
                            'interface': current_interface
                        })
    except Exception as e:
        print(f"Scan error: {e}")
        
    return jsonify(devices)

@main_bp.route('/api/services/<int:id>', methods=['DELETE'])
@login_required
def delete_service(id):
    service = MonitoredService.query.get_or_404(id)
    db.session.delete(service)
    db.session.commit()
    return jsonify({'status': 'success'})

@main_bp.route('/api/metrics')
@login_required
def metrics():
    # System Metrics (Keep them as summary)
    cpu_percent = psutil.cpu_percent(interval=None)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')

    # Check for Anomalies (Simple Thresholds)
    if cpu_percent > 90:
        create_anomaly_notification('Alta Carga de CPU', f'La CPU está al {cpu_percent}%', 'danger')
    if memory.percent > 90:
        create_anomaly_notification('Uso de Memoria Crítico', f'La memoria está al {memory.percent}%', 'warning')
    
    # --- Advanced Network Metrics ---
    
    # 1. Per-Interface Traffic
    net_io_per_nic = psutil.net_io_counters(pernic=True)
    net_if_stats = psutil.net_if_stats()
    net_if_addrs = psutil.net_if_addrs()
    
    interfaces_data = {}
    for nic, stats in net_io_per_nic.items():
        if_info = net_if_stats.get(nic)
        if_addr = net_if_addrs.get(nic)
        
        # Only show interfaces that are UP to reduce clutter
        if if_info and if_info.isup:
            ip_address = "N/A"
            if if_addr:
                for addr in if_addr:
                    if addr.family == socket.AF_INET:
                        ip_address = addr.address
                        break
            
            interfaces_data[nic] = {
                'bytes_sent': stats.bytes_sent,
                'bytes_recv': stats.bytes_recv,
                'is_up': if_info.isup,
                'speed': if_info.speed,
                'ip': ip_address
            }

    # 2. Active Connections (Simplified for performance)
    # Getting process names can be slow, so we limit to top 15 ESTABLISHED connections
    connections = []
    try:
        # Requires permissions on some OS, handles errors gracefully
        conns = psutil.net_connections(kind='inet')
        established_conns = [c for c in conns if c.status == 'ESTABLISHED']
        
        # Sort by most recent (not exactly possible with psutil, just take first few)
        for c in established_conns[:15]: 
            try:
                process = psutil.Process(c.pid)
                process_name = process.name()
            except (psutil.NoSuchProcess, psutil.AccessDenied, AttributeError):
                process_name = "Unknown/System"
                
            connections.append({
                'fd': c.fd,
                'family': c.family,
                'type': c.type,
                'laddr': f"{c.laddr.ip}:{c.laddr.port}" if c.laddr else "N/A",
                'raddr': f"{c.raddr.ip}:{c.raddr.port}" if c.raddr else "N/A",
                'status': c.status,
                'pid': c.pid,
                'process': process_name
            })
    except Exception as e:
        print(f"Error getting connections: {e}")

    # 3. Global Total
    net_io_total = psutil.net_io_counters()

    return jsonify({
        'cpu': cpu_percent,
        'memory': {
            'total': memory.total,
            'percent': memory.percent,
            'used': memory.used
        },
        'disk': {
            'percent': disk.percent,
            'free': disk.free
        },
        'network': {
            'total': {
                'bytes_sent': net_io_total.bytes_sent,
                'bytes_recv': net_io_total.bytes_recv
            },
            'interfaces': interfaces_data,
            'connections': connections
        }
    })

def create_anomaly_notification(title, message, type):
    # Prevent duplicate notifications in short time window (simple logic)
    last_notif = Notification.query.filter_by(title=title).order_by(Notification.timestamp.desc()).first()
    if last_notif:
        # If less than 5 mins, skip
        delta = time.time() - last_notif.timestamp.timestamp()
        if delta < 300: 
            return

    notif = Notification(title=title, message=message, type=type)
    db.session.add(notif)
    db.session.commit()
    
    # Send Telegram Alert if enabled
    if current_user.is_authenticated and current_user.settings and current_user.settings.notifications_enabled:
        send_telegram_alert(current_user, title, message)
        send_whatsapp_alert(current_user, title, message)

@main_bp.route('/api/notifications')
@login_required
def get_notifications():
    notifications = Notification.query.order_by(Notification.timestamp.desc()).limit(10).all()
    unread_count = Notification.query.filter_by(read=False).count()
    return jsonify({
        'unread_count': unread_count,
        'list': [{
            'id': n.id,
            'title': n.title,
            'message': n.message,
            'type': n.type,
            'time': n.timestamp.strftime('%H:%M:%S'),
            'read': n.read
        } for n in notifications]
    })

@main_bp.route('/api/notifications/mark_read', methods=['POST'])
@login_required
def mark_notifications_read():
    Notification.query.filter_by(read=False).update({'read': True})
    db.session.commit()
    return jsonify({'status': 'success'})

@main_bp.route('/api/ping')
@login_required
def ping_check():
    target = "8.8.8.8" # Google DNS
    try:
        # Simple ping implementation
        # Windows uses -n, Linux uses -c
        param = '-n' if platform.system().lower() == 'windows' else '-c'
        command = ['ping', param, '1', target]
        
        # Don't use start/end time for latency, use parsing
        # Use cp850 for Windows encoding or utf-8 as fallback
        try:
            output = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='cp850')
        except:
            output = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='ignore')
        
        if output.returncode == 0:
            # Parse output for time=XXms or tiempo=XXms
            # Regex handles both English (time=) and Spanish (tiempo=) and < symbol
            match = re.search(r'(?:time|tiempo)[=<]([\d\.]+)(?: ?ms)?', output.stdout, re.IGNORECASE)
            if match:
                latency_ms = float(match.group(1))
            else:
                # Fallback if parsing fails but ping succeeded (e.g. rare output format)
                # Try to find any "ms" value
                match_ms = re.search(r'([\d\.]+) ?ms', output.stdout)
                if match_ms:
                    latency_ms = float(match_ms.group(1))
                else:
                    latency_ms = 10.0 # Default fallback
            
            return jsonify({'status': 'ok', 'latency': latency_ms, 'target': target})
        else:
            return jsonify({'status': 'error', 'latency': -1, 'target': target})
    except Exception as e:
        return jsonify({'status': 'error', 'latency': -1, 'error': str(e)})
