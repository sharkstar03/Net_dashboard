// Initialize Charts with Modern Design
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';

// --- Contexts ---
const networkCtx = document.getElementById('networkChart').getContext('2d');
const pingCtx = document.getElementById('pingChart').getContext('2d');

// --- Charts ---

// 1. Network Traffic Chart (Area/Line) - Smoother Animation
const networkChart = new Chart(networkCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Subida',
                data: [],
                borderColor: '#ef4444',
                backgroundColor: (context) => {
                    const bg = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
                    bg.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
                    bg.addColorStop(1, 'rgba(239, 68, 68, 0)');
                    return bg;
                },
                tension: 0.4, // Smooth curve
                fill: true,
                pointRadius: 0,
                cubicInterpolationMode: 'monotone'
            },
            {
                label: 'Bajada',
                data: [],
                borderColor: '#10b981',
                backgroundColor: (context) => {
                    const bg = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
                    bg.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
                    bg.addColorStop(1, 'rgba(16, 185, 129, 0)');
                    return bg;
                },
                tension: 0.4, // Smooth curve
                fill: true,
                pointRadius: 0,
                cubicInterpolationMode: 'monotone'
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: { usePointStyle: true, boxWidth: 8 }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { borderDash: [5, 5] },
                ticks: { callback: (val) => val + ' KB/s' }
            },
            x: { display: false }
        },
        animation: {
            duration: 1000,
            easing: 'easeOutQuart'
        },
        interaction: {
            mode: 'index',
            intersect: false,
        }
    }
});

// 2. Ping Latency Chart (Line) - Smoother
const pingChart = new Chart(pingCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Latencia (ms)',
            data: [],
            borderColor: '#f59e0b', // Warning/Yellow
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            cubicInterpolationMode: 'monotone'
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: {
                beginAtZero: true,
                suggestedMax: 100,
                grid: { borderDash: [5, 5] }
            },
            x: { display: false }
        },
        animation: {
            duration: 1000,
            easing: 'easeOutQuart'
        }
    }
});

// --- State Variables ---
let prevNetData = {}; // Stores previous bytes per interface
let lastFetchTime = Date.now();
let selectedInterface = 'total'; // Default to total

// --- Helper Functions ---
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateIP(ip) {
    const el = document.getElementById('publicIP');
    if (el) el.innerText = ip || 'Desconocida';
}

// Number Interpolation for Smooth Counters
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = (progress * (end - start) + start).toFixed(2);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Fetch Public IP once
fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(data => updateIP(data.ip))
    .catch(() => updateIP('N/A'));

// --- Services Management ---
let serviceModal = null;

function resetServiceForm() {
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceId').value = '';
    document.getElementById('serviceModalLabel').innerText = 'Agregar Monitor';
}

function openEditService(id, name, url, type) {
    document.getElementById('serviceId').value = id;
    document.getElementById('serviceName').value = name;
    document.getElementById('serviceUrl').value = url;
    document.getElementById('serviceType').value = type;
    document.getElementById('serviceModalLabel').innerText = 'Editar Monitor';
    
    // Open Modal
    if (!serviceModal) serviceModal = new bootstrap.Modal(document.getElementById('serviceModal'));
    serviceModal.show();
}

function saveService() {
    const id = document.getElementById('serviceId').value;
    const name = document.getElementById('serviceName').value;
    const url = document.getElementById('serviceUrl').value;
    const type = document.getElementById('serviceType').value;

    if (!name || !url) {
        alert("Por favor completa todos los campos.");
        return;
    }

    const method = id ? 'PUT' : 'POST';
    const body = { name, url, type };
    if (id) body.id = id;

    fetch('/api/services', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then(res => res.json())
      .then(data => {
          if(data.status === 'success') {
              updateServices();
              // Close modal
              const modalEl = document.getElementById('serviceModal');
              const modal = bootstrap.Modal.getInstance(modalEl);
              modal.hide();
          } else {
              alert('Error: ' + data.message);
          }
      });
}

function deleteService(id) {
    if(!confirm("¿Eliminar este monitor?")) return;
    fetch(`/api/services/${id}`, { method: 'DELETE' })
        .then(() => updateServices());
}

function updateServices() {
    fetch('/api/services')
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('servicesTableBody');
            tbody.innerHTML = '';
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No hay servicios monitoreados.</td></tr>';
                return;
            }
            data.forEach(svc => {
                const statusBadge = svc.status === 'Up' 
                    ? '<span class="badge bg-success">Online</span>' 
                    : '<span class="badge bg-danger">Offline</span>';
                
                const typeIcon = svc.type === 'http' 
                    ? '<i class="fa-solid fa-globe text-info" title="Web"></i>' 
                    : '<i class="fa-solid fa-laptop text-warning" title="Dispositivo"></i>';

                tbody.innerHTML += `
                    <tr>
                        <td class="ps-4 fw-bold text-white">${svc.name}</td>
                        <td class="text-muted small text-truncate" style="max-width: 150px;">${svc.url}</td>
                        <td class="text-center">${typeIcon}</td>
                        <td>${statusBadge}</td>
                        <td class="font-monospace small">${svc.response_time} ms</td>
                        <td class="text-end pe-4">
                            <button class="btn btn-sm btn-outline-primary border-0 me-1" onclick="openEditService('${svc.id}', '${svc.name}', '${svc.url}', '${svc.type}')"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteService(${svc.id})"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        });
}

// --- Network Scanner ---
function scanNetwork() {
    const tbody = document.getElementById('networkScanBody');
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-info py-3"><i class="fa-solid fa-circle-notch fa-spin me-2"></i>Escaneando red local...</td></tr>';
    
    fetch('/api/network/scan')
        .then(res => res.json())
        .then(data => {
            tbody.innerHTML = '';
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No se encontraron dispositivos.</td></tr>';
                return;
            }
            data.forEach(dev => {
                tbody.innerHTML += `
                    <tr>
                        <td class="ps-4 font-monospace">${dev.ip}</td>
                        <td class="text-muted small font-monospace">${dev.mac}</td>
                        <td class="text-end pe-4">
                            <button class="btn btn-sm btn-outline-success" onclick="addFromScan('${dev.ip}')" title="Monitorear">
                                <i class="fa-solid fa-plus"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        })
        .catch(err => {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-3">Error al escanear.</td></tr>';
        });
}

function addFromScan(ip) {
    document.getElementById('serviceName').value = 'Dispositivo ' + ip;
    document.getElementById('serviceUrl').value = ip;
    document.getElementById('serviceType').value = 'ping';
    
    if (!serviceModal) serviceModal = new bootstrap.Modal(document.getElementById('serviceModal'));
    serviceModal.show();
}

let lastSeenNotifId = 0;

function updateNotifications() {
    fetch('/api/notifications')
        .then(res => res.json())
        .then(data => {
            // Check if it's the new format {unread_count, list} or old array
            const listData = data.list ? data.list : data; // Fallback
            const unreadCount = data.unread_count !== undefined ? data.unread_count : 0;

            // Update Badge
            const badge = document.getElementById('notifBadge');
            if (badge) {
                if (unreadCount > 0) {
                    badge.innerText = unreadCount;
                    badge.style.display = 'block';
                } else {
                    badge.style.display = 'none';
                }
            }
            
            // Update List (Navbar Dropdown)
            const list = document.getElementById('notifList');
            if(list) {
                // Keep header
                const header = list.querySelector('.dropdown-header') ? list.querySelector('.dropdown-header').parentNode.outerHTML : '';
                const divider = list.querySelector('.dropdown-divider') ? list.querySelector('.dropdown-divider').parentNode.outerHTML : '';
                
                let itemsHtml = '';
                if (listData.length === 0) {
                    itemsHtml = '<li class="text-center p-3 text-muted small">Sin notificaciones nuevas</li>';
                } else {
                    listData.forEach(n => {
                        const icon = n.type === 'danger' ? 'fa-triangle-exclamation text-danger' : 
                                   (n.type === 'warning' ? 'fa-circle-exclamation text-warning' : 'fa-circle-info text-info');
                        const bgClass = n.read ? '' : 'bg-secondary bg-opacity-10';
                        
                        itemsHtml += `
                            <li class="${bgClass} border-bottom border-secondary border-opacity-10">
                                <a class="dropdown-item py-2" href="#">
                                    <div class="d-flex align-items-start">
                                        <i class="fa-solid ${icon} mt-1 me-2"></i>
                                        <div>
                                            <small class="d-block fw-bold ${n.type === 'danger' ? 'text-danger' : 'text-light'}">${n.title}</small>
                                            <small class="text-muted" style="font-size: 0.75rem;">${n.message}</small>
                                            <div class="text-end"><small class="text-secondary" style="font-size: 0.65rem;">${n.time}</small></div>
                                        </div>
                                    </div>
                                </a>
                            </li>
                        `;

                        // Toast Logic
                        if (!n.read && n.id > lastSeenNotifId && lastSeenNotifId !== 0) {
                            showToast(n);
                        }
                    });
                    
                    // Update last ID
                    if (listData.length > 0) {
                        const maxId = Math.max(...listData.map(n => n.id));
                        if (maxId > lastSeenNotifId) lastSeenNotifId = maxId;
                    }
                }
                list.innerHTML = (header || '') + (divider || '') + itemsHtml;
            }
        });
}

function showToast(n) {
    const container = document.getElementById('toastContainer');
    if(!container) return;
    
    const icon = n.type === 'danger' ? 'fa-triangle-exclamation text-danger' : 
               (n.type === 'warning' ? 'fa-circle-exclamation text-warning' : 'fa-circle-info text-info');
    
    const toastHtml = `
        <div class="toast show glass-card border-${n.type === 'danger' ? 'danger' : 'secondary'}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-transparent border-bottom border-secondary">
                <i class="fa-solid ${icon} me-2"></i>
                <strong class="me-auto text-white">${n.title}</strong>
                <small class="text-muted">Justo ahora</small>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body text-light">
                ${n.message}
            </div>
        </div>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = toastHtml;
    const toastEl = div.firstElementChild;
    container.appendChild(toastEl);
    
    setTimeout(() => {
        toastEl.classList.remove('show');
        setTimeout(() => toastEl.remove(), 500);
    }, 5000);
}

function markAllRead() {
    fetch('/api/notifications/mark_read', { method: 'POST' })
        .then(() => updateNotifications());
}

function toggleIpVisibility() {
    showIp = !showIp;
    const publicIpEl = document.getElementById('publicIP');
    const interfaceIpEl = document.getElementById('interfaceIP');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (showIp) {
        if(publicIpEl) publicIpEl.classList.remove('blur-ip');
        if(interfaceIpEl) interfaceIpEl.classList.remove('blur-ip');
        if(eyeIcon) {
            eyeIcon.classList.remove('fa-eye');
            eyeIcon.classList.add('fa-eye-slash');
        }
    } else {
        if(publicIpEl) publicIpEl.classList.add('blur-ip');
        if(interfaceIpEl) interfaceIpEl.classList.add('blur-ip');
        if(eyeIcon) {
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
        }
    }
}

// --- Main Update Loop ---
function updateDashboard() {
    // 1. Fetch Metrics
    fetch('/api/metrics')
        .then(response => response.json())
        .then(data => {
            const now = new Date();
            const timeLabel = now.toLocaleTimeString();
            const currentTime = Date.now();
            const timeDiff = (currentTime - lastFetchTime) / 1000;

            // Update System Summary (Top Right)
            document.getElementById('cpuValue').innerText = data.cpu + '%';
            document.getElementById('ramValue').innerText = data.memory.percent + '%';

            // --- Network Interfaces Handling ---
            const interfaceSelect = document.getElementById('interfaceSelect');
            
            // Populate Dropdown if empty (first run)
            if (interfaceSelect.options.length === 1) {
                for (const [nic, info] of Object.entries(data.network.interfaces)) {
                    const option = document.createElement('option');
                    option.value = nic;
                    option.text = nic + (info.ip !== 'N/A' ? ` (${info.ip})` : '');
                    interfaceSelect.appendChild(option);
                }
            }

            // Get Current Interface Data
            let currentBytesSent = 0;
            let currentBytesRecv = 0;
            let currentIP = 'IP: --';

            if (selectedInterface === 'total') {
                currentBytesSent = data.network.total.bytes_sent;
                currentBytesRecv = data.network.total.bytes_recv;
                currentIP = 'IP: Agregada';
            } else if (data.network.interfaces[selectedInterface]) {
                const nicData = data.network.interfaces[selectedInterface];
                currentBytesSent = nicData.bytes_sent;
                currentBytesRecv = nicData.bytes_recv;
                currentIP = `IP: ${nicData.ip}`;
            }

            document.getElementById('interfaceIP').innerText = currentIP;

            // Calculate Speeds
            if (prevNetData[selectedInterface] && timeDiff > 0) {
                const prevSent = prevNetData[selectedInterface].sent;
                const prevRecv = prevNetData[selectedInterface].recv;

                const sentBps = (currentBytesSent - prevSent) / timeDiff;
                const recvBps = (currentBytesRecv - prevRecv) / timeDiff;

                const sentKBps = (sentBps / 1024).toFixed(2);
                const recvKBps = (recvBps / 1024).toFixed(2);

                // Update Big Numbers with Animation
                // Note: Simple text update for now to avoid flickering, Chart handles smooth lines
                document.getElementById('globalUpload').innerText = sentKBps;
                document.getElementById('globalDownload').innerText = recvKBps;

                // Update Chart
                if (networkChart.data.labels.length > 30) {
                    networkChart.data.labels.shift();
                    networkChart.data.datasets[0].data.shift();
                    networkChart.data.datasets[1].data.shift();
                }
                networkChart.data.labels.push(timeLabel);
                networkChart.data.datasets[0].data.push(sentKBps);
                networkChart.data.datasets[1].data.push(recvKBps);
                networkChart.update(); // Chart.js handles animation based on config
            }

            // Store current data for next iteration
            prevNetData[selectedInterface] = {
                sent: currentBytesSent,
                recv: currentBytesRecv
            };
            
            // Also store 'total' if we are not viewing it, to keep history correct when switching
            if (selectedInterface !== 'total') {
                prevNetData['total'] = {
                    sent: data.network.total.bytes_sent,
                    recv: data.network.total.bytes_recv
                };
            }
            // Store all other interfaces too to avoid spikes when switching
             for (const [nic, info] of Object.entries(data.network.interfaces)) {
                prevNetData[nic] = { sent: info.bytes_sent, recv: info.bytes_recv };
             }


            lastFetchTime = currentTime;

            // --- Update Connections Table ---
            const tbody = document.getElementById('connectionsTableBody');
            tbody.innerHTML = '';
            
            if (data.network.connections.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay conexiones activas reportadas o permisos insuficientes.</td></tr>';
            } else {
                data.network.connections.forEach(conn => {
                    const row = `
                        <tr>
                            <td class="ps-4 fw-bold text-primary-accent">${conn.process}</td>
                            <td class="text-secondary">${conn.pid}</td>
                            <td class="font-monospace small">${conn.laddr}</td>
                            <td class="font-monospace small">${conn.raddr}</td>
                            <td><span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">${conn.status}</span></td>
                        </tr>
                    `;
                    tbody.innerHTML += row;
                });
            }
        })
        .catch(err => console.error('Metrics Error:', err));
}

// --- Ping Update Loop (Slower, every 5s) ---
function updatePing() {
    fetch('/api/ping')
        .then(res => res.json())
        .then(data => {
            const now = new Date();
            const timeLabel = now.toLocaleTimeString();

            let latency = 0;
            if (data.status === 'ok') {
                latency = data.latency;
                document.getElementById('pingValue').innerText = latency;
                document.getElementById('pingValue').className = latency < 100 ? 'text-success' : (latency < 200 ? 'text-warning' : 'text-danger');
            } else {
                document.getElementById('pingValue').innerText = 'Err';
                document.getElementById('pingValue').className = 'text-danger';
            }

            // Update Ping Chart
            if (pingChart.data.labels.length > 20) {
                pingChart.data.labels.shift();
                pingChart.data.datasets[0].data.shift();
            }
            pingChart.data.labels.push(timeLabel);
            pingChart.data.datasets[0].data.push(latency);
            pingChart.update();
        })
        .catch(err => console.error('Ping Error:', err));
}

// Event Listeners
document.getElementById('interfaceSelect').addEventListener('change', (e) => {
    selectedInterface = e.target.value;
    // Reset prev data to avoid calculation spikes
    prevNetData[selectedInterface] = null; 
});

// Start Loops
setInterval(updateDashboard, 2000); // Metrics every 2s
setInterval(updatePing, 5000);      // Ping every 5s
setInterval(updateServices, 10000); // Services every 10s
setInterval(updateNotifications, 5000); // Notifications every 5s

// Initial Calls
updateDashboard();
updatePing();
updateServices();
updateNotifications();
