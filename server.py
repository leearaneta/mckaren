import os
import psycopg2
import psycopg2.extras
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from cryptography.fernet import Fernet


app = Flask(__name__)

if os.environ.get('ENVIRONMENT') != 'production':
    CORS(app)

conn_str = os.environ.get('DATABASE_URL')

@app.route("/")
def base():
    return send_from_directory('client/dist', 'index.html')

@app.route("/<path:path>")
def home(path):
    return send_from_directory('client/dist', path)

@app.route("/openings")
def openings():
    conn = psycopg2.connect(conn_str)
    with conn:
        with conn.cursor(cursor_factory = psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute('SELECT * from openings;')
            rows = cursor.fetchall()
    conn.close()
    return jsonify(rows)

@app.route('/subscriptions', methods = ['POST'])
def subscriptions():
    if request.method == 'POST':
        conn = psycopg2.connect(conn_str)
        with conn:
            with conn.cursor(cursor_factory = psycopg2.extras.RealDictCursor) as cursor:
                params = request.json
                email = params['email']
                def format_filter(filter):
                    return f"('{email}', ARRAY{filter['weekdays']}, {filter['min_start_hour']}, {filter['max_end_hour']}, {filter['length']})"
                values = [format_filter(f) for f in params['filters']]
                cursor.execute("DELETE FROM subscriptions WHERE email = %s;", (email,))
                cursor.execute(f"INSERT INTO subscriptions VALUES {','.join(values)}")
        conn.commit()
        conn.close()
        return {}

# this should probably be a DELETE or something
# but it's only accessed through the email which has no javascript
@app.route("/unsubscribe/<email>")
def unsubscribe(email):
    encryption_key = os.environ.get('EMAIL_ENCRYPTION_KEY')
    decrypted_email = Fernet(encryption_key).decrypt(email.encode()).decode()
    conn = psycopg2.connect(conn_str)
    with conn:
        with conn.cursor(cursor_factory = psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute("DELETE FROM subscriptions WHERE email = %s;", (decrypted_email,))
    conn.commit()
    conn.close()
    return f'<div> unsubscribed {decrypted_email}! </div>'

