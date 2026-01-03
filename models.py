from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class MonitoredService(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    url = db.Column(db.String(200), nullable=False) # Can be URL or IP
    type = db.Column(db.String(20), default='http') # http, ping
    status = db.Column(db.String(20), default='Unknown') # Up, Down, Unknown
    last_checked = db.Column(db.DateTime)
    response_time = db.Column(db.Float, default=0.0)

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(20), default='info') # info, warning, danger
    timestamp = db.Column(db.DateTime, default=db.func.now())
    read = db.Column(db.Boolean, default=False)

class AppSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    theme = db.Column(db.String(20), default='system') # light, dark, system
    show_public_ip = db.Column(db.Boolean, default=False)
    telegram_bot_token = db.Column(db.String(100), nullable=True)
    telegram_chat_id = db.Column(db.String(50), nullable=True)
    whatsapp_phone = db.Column(db.String(20), nullable=True)
    whatsapp_apikey = db.Column(db.String(50), nullable=True)
    notifications_enabled = db.Column(db.Boolean, default=True)

    user = db.relationship('User', backref=db.backref('settings', uselist=False))
