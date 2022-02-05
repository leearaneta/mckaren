import os
import psycopg2
import psycopg2.extras
import pytz
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS


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
def hello_world():
    conn = psycopg2.connect(conn_str)
    with conn:
        with conn.cursor(cursor_factory = psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute('SELECT * from openings;')
            rows = cursor.fetchall()
    conn.close()
    est = pytz.timezone('EST')
    with_timezone = [{**row, "datetime": est.localize(row["datetime"])} for row in rows]
    return jsonify(with_timezone)