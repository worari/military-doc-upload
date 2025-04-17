import os
from flask import Flask, render_template, request, redirect, url_for, flash
from werkzeug.utils import secure_filename
from datetime import datetime
import psycopg2
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")
app.config['UPLOAD_FOLDER'] = '../uploads'


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT", "5432")
    )


@app.route('/')
def index():
    return render_template('form.html')


@app.route('/submit', methods=['POST'])
def submit():
    conn = get_db_connection()
    cursor = conn.cursor()

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

    cursor.execute("SELECT COUNT(*) FROM submissions WHERE citizen_id = %s", (citizen_id,))
    if cursor.fetchone()[0] > 0:
        flash('มีข้อมูลของเลขบัตรประชาชนนี้แล้วในระบบ')
        cursor.close()
        conn.close()
        return redirect(url_for('index'))

    for field in files:
        file = files[field]
        if file and file.filename:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

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
    cursor.close()
    conn.close()

    flash('ส่งข้อมูลเรียบร้อยแล้ว')
    return redirect(url_for('dashboard'))


@app.route('/dashboard')
def dashboard():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT first_name, last_name, doc_number, doc_date, gov_type, created_at FROM submissions ORDER BY created_at DESC")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return render_template('dashboard.html', submissions=rows)


if __name__ == '__main__':
    os.makedirs('../uploads', exist_ok=True)
    app.run(debug=True)
    application = app