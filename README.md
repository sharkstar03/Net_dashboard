<div align="center">
  <img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/network-wired.svg" width="120" alt="NetDashboard Logo">
  <h1 style="margin-top: 20px;">Net Dashboard</h1>
  <p>
    <b>Monitoreo de Red y Sistema en Tiempo Real</b>
  </p>
</div>

Un dashboard profesional y moderno para el monitoreo de métricas de red y sistema en tiempo real. Diseñado para entornos internos, este proyecto combina una estética "Glassmorphism" con potentes capacidades de monitoreo, gestión de usuarios y alertas multicanal.

![Net Dashboard Badge](https://img.shields.io/badge/Status-Active-success)
![Python Version](https://img.shields.io/badge/Python-3.8%2B-blue)
![License](https://img.shields.io/badge/License-Proprietary-orange)

## ✨ Características Principales

### 📊 Monitoreo Integral
- **Tráfico de Red**: Visualización en tiempo real de bytes enviados/recibidos por interfaz de red.
- **Métricas de Sistema**: Monitoreo de uso de CPU, Memoria RAM y Disco.
- **Conexiones Activas**: Tabla detallada de las conexiones de red establecidas por procesos.
- **Latencia (Ping)**: Gráficos de latencia en tiempo real hacia objetivos externos (ej. Google DNS).

### 🛠️ Gestión de Servicios (Estilo Uptime Kuma)
- Agrega servicios HTTP/HTTPS o Ping para monitorear su disponibilidad.
- Detección automática de estado **Up** (Arriba) o **Down** (Caído).
- Medición de tiempos de respuesta.

### 🔔 Sistema de Alertas Inteligente
Notificaciones inmediatas sobre anomalías (alto uso de recursos) o caída de servicios a través de:
1.  **Dashboard Web**: Notificaciones visuales (Toasts) y centro de notificaciones en la barra de navegación.
2.  **Telegram**: Integración directa con bots de Telegram.
3.  **WhatsApp**: Alertas al móvil mediante la API de CallMeBot.

### 🎨 Diseño y Personalización
- **Temas Dinámicos**: Soporte completo para Tema Claro, Oscuro y Automático (Sistema).
- **Glassmorphism UI**: Interfaz moderna con efectos de desenfoque y transparencias.
- **Privacidad**: Opción para ocultar/desenfocar la IP Pública en el dashboard.

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- Python 3.8 o superior.
- Git (opcional, para clonar).

### Pasos

1.  **Clonar el repositorio**
    ```bash
    git clone https://github.com/sharkstar03/Net_dashboard.git
    cd Net_dashboard
    ```

2.  **Crear un entorno virtual** (Recomendado)
    ```bash
    # Windows
    python -m venv venv
    venv\Scripts\activate

    # Linux/macOS
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Instalar dependencias**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Inicializar la Base de Datos**
    La base de datos SQLite se creará automáticamente en la carpeta `instance/` al iniciar la aplicación por primera vez.

5.  **Ejecutar la aplicación**
    ```bash
    python app.py
    ```

6.  **Acceso**
    Abre tu navegador web y visita: `http://localhost:5000`

## ⚙️ Configuración

Una vez iniciada la sesión, dirígete al apartado de **Configuración** (ícono de engranaje en el menú de usuario) para personalizar tu experiencia:

- **Apariencia**: Elige entre tema Claro, Oscuro o sincronizado con el Sistema.
- **Telegram**: Ingresa tu `Bot Token` y `Chat ID` para recibir alertas.
- **WhatsApp**: Configura tu número y `API Key` de CallMeBot para recibir mensajes de WhatsApp.
- **Privacidad**: Activa o desactiva la visualización de tu IP Pública.

## 🛠️ Tecnologías Utilizadas

- **Backend**: 
  - [Flask](https://flask.palletsprojects.com/) (Framework Web)
  - [Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/) (ORM)
  - [Flask-Login](https://flask-login.readthedocs.io/) (Autenticación)
  - [Psutil](https://psutil.readthedocs.io/) (Métricas del Sistema)
- **Frontend**: 
  - [Bootstrap 5](https://getbootstrap.com/) (Framework CSS)
  - [Chart.js](https://www.chartjs.org/) (Gráficos)
  - [FontAwesome](https://fontawesome.com/) (Iconos)
- **Base de Datos**: SQLite

## 📝 Notas del Desarrollador

Este proyecto fue desarrollado para **Quantium Crew** como una herramienta de gestión y monitoreo de entornos internos, demostrando capacidades de desarrollo Full Stack con Python.

---
© 2026 Quantium Crew - Desarrollado por sharkstar03
