from flask import Flask, render_template, redirect, url_for, flash
from extensions import db, login_manager
from models import User
from routes import main_bp
import os

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'dev_key_secret_123' # En produccion usar variable de entorno
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite3'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'main.login'

    app.register_blueprint(main_bp)

    with app.app_context():
        db.create_all()

    return app

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
