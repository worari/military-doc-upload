from flask import Flask, render_template, request, redirect, url_for, flash
from werkzeug.utils import secure_filename
import os
import psycopg2
from datetime import datetime

load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.secret_key = 'e3a91e6c77cb4bc8a4f1f5a13279924cddc5c94d65d9be9e6e738fbd22a1aab4'  # สำหรับ flash message
app.secret_key = os.getenv("SECRET_KEY")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False


# เชื่อมต่อ PostgreSQL (Railway)
conn = psycopg2.connect(
    host="postgres.railway.internal",
    database="railway",
    user="postgres",
    password="lNSmektsHjEYXfAZveNvADUzFcuvoCXw",
    port="5432"
) 
cursor = conn.cursor()

@app.route('/')
def index():
    return render_template('form.html')

@app.route('/submit', methods=['POST'])
def submit():
    data = request.form
    files = request.files

    citizen_id = data.get('citizen_id')
    prefix = data.get('prefix')
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    origin_unit = data.get('origin_unit')
    doc_number = data.get('doc_number')
    doc_date = data.get('doc_date')
    gov_type = data.get('gov_type')

    # ตรวจสอบว่าเลขบัตรประชาชนซ้ำหรือไม่
    cursor.execute("SELECT COUNT(*) FROM submissions WHERE citizen_id = %s", (citizen_id,))
    if cursor.fetchone()[0] > 0:
        flash('มีข้อมูลของเลขบัตรประชาชนนี้แล้วในระบบ')
        return redirect(url_for('index'))

    upload_paths = {}
    for field in files:
        file = files[field]
        if file and file.filename:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            upload_paths[field] = filepath

    cursor.execute("""
        INSERT INTO submissions (
            citizen_id, prefix, first_name, last_name, origin_unit,
            doc_number, doc_date, gov_type, created_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        citizen_id, prefix, first_name, last_name, origin_unit,
        doc_number, doc_date, gov_type, datetime.now()
    ))
    conn.commit()

    flash('ส่งข้อมูลเรียบร้อยแล้ว')
    return redirect(url_for('dashboard'))

@app.route('/dashboard')
def dashboard():
    cursor.execute("SELECT first_name, last_name, doc_number, doc_date, gov_type, created_at FROM submissions ORDER BY created_at DESC")
    rows = cursor.fetchall()
    return render_template('dashboard.html', submissions=rows)

if __name__ == '__main__':
    os.makedirs('uploads', exist_ok=True)
    app.run(debug=True)
