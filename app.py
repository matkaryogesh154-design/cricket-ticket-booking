# ===============================
#  CRICKETPASS — app.py
#  Features: Login, Razorpay, Email, Admin, PDF Ticket
# ===============================

from flask import Flask, request, jsonify, render_template, redirect, session, send_file
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import sqlite3
import random
import string
import razorpay
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from dotenv import load_dotenv
import os
import io

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'cricketpass-secret-2025')
CORS(app)
bcrypt = Bcrypt(app)

# ===== RAZORPAY CONFIG =====
RAZORPAY_KEY_ID     = os.getenv('RAZORPAY_KEY_ID', 'YOUR_KEY_ID')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', 'YOUR_KEY_SECRET')
rz_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# ===== EMAIL CONFIG =====
EMAIL_ADDRESS  = os.getenv('EMAIL_ADDRESS', 'your@gmail.com')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', 'your_app_password')

# ===== ADMIN CONFIG =====
ADMIN_EMAIL    = os.getenv('ADMIN_EMAIL', 'admin@cricketpass.com')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin123')

# ===========================
#  DATABASE
# ===========================
def get_db():
    conn = sqlite3.connect('cricket.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id TEXT UNIQUE,
            user_id INTEGER,
            name TEXT,
            phone TEXT,
            email TEXT,
            match_name TEXT,
            stand TEXT,
            quantity INTEGER,
            seat_numbers TEXT,
            total_price INTEGER,
            payment_id TEXT,
            payment_status TEXT DEFAULT 'pending',
            booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_type TEXT DEFAULT 'IPL',
            team1 TEXT NOT NULL,
            team2 TEXT NOT NULL,
            team1_code TEXT,
            team2_code TEXT,
            match_date TEXT,
            match_time TEXT,
            venue TEXT,
            series TEXT,
            total_seats INTEGER DEFAULT 500,
            available_seats INTEGER DEFAULT 500,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def generate_ticket_id():
    return 'CP' + ''.join(random.choices(string.digits, k=6))

# ===========================
#  PDF TICKET GENERATOR
# ===========================
def generate_pdf_ticket(ticket_id, name, match, stand, qty, total, seats='', booked_at=''):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas
        from reportlab.lib.utils import ImageReader
        import qrcode
        import qrcode.image.pil

        buffer = io.BytesIO()
        w, h = A4
        c = canvas.Canvas(buffer, pagesize=A4)

        # Background
        c.setFillColor(colors.HexColor('#0a0f1e'))
        c.rect(0, 0, w, h, fill=1, stroke=0)

        # Green header bar
        c.setFillColor(colors.HexColor('#00C853'))
        c.rect(0, h - 90*mm, w, 90*mm, fill=1, stroke=0)

        # Title
        c.setFillColor(colors.HexColor('#000000'))
        c.setFont('Helvetica-Bold', 36)
        c.drawCentredString(w/2, h - 28*mm, 'CRICKETPASS')
        c.setFont('Helvetica', 14)
        c.drawCentredString(w/2, h - 40*mm, 'Official E-Ticket')

        # Ticket card background
        c.setFillColor(colors.HexColor('#161f33'))
        c.roundRect(20*mm, h - 200*mm, w - 40*mm, 105*mm, 8*mm, fill=1, stroke=0)

        # Green border
        c.setStrokeColor(colors.HexColor('#00C853'))
        c.setLineWidth(1.5)
        c.roundRect(20*mm, h - 200*mm, w - 40*mm, 105*mm, 8*mm, fill=0, stroke=1)

        # Ticket ID label
        c.setFillColor(colors.HexColor('#7e8fa6'))
        c.setFont('Helvetica', 9)
        c.drawCentredString(w/2, h - 105*mm, 'YOUR TICKET ID')

        # Ticket ID value
        c.setFillColor(colors.HexColor('#00C853'))
        c.setFont('Helvetica-Bold', 42)
        c.drawCentredString(w/2, h - 120*mm, ticket_id)

        # Divider
        c.setStrokeColor(colors.HexColor('#1e2d45'))
        c.setLineWidth(1)
        c.line(30*mm, h - 130*mm, w - 30*mm, h - 130*mm)

        # Details
        details = [
            ('Match', match),
            ('Stand', stand),
            ('Tickets', str(qty)),
            ('Seats', seats if seats else 'General'),
            ('Total Paid', f'Rs.{int(total):,}'),
            ('Booked At', booked_at[:16] if booked_at else ''),
        ]

        c.setFont('Helvetica', 10)
        y_start = h - 145*mm
        for i, (label, value) in enumerate(details):
            col = i % 2
            row = i // 2
            x = 30*mm + col * 85*mm
            y = y_start - row * 14*mm
            c.setFillColor(colors.HexColor('#7e8fa6'))
            c.setFont('Helvetica', 8)
            c.drawString(x, y + 5, label.upper())
            c.setFillColor(colors.HexColor('#e8eaf6'))
            c.setFont('Helvetica-Bold', 10)
            # Truncate long values
            val = str(value)
            if len(val) > 28: val = val[:25] + '...'
            c.drawString(x, y - 4, val)

        # QR Code
        try:
            qr = qrcode.QRCode(version=1, box_size=4, border=2)
            qr.add_data(f'CRICKETPASS:{ticket_id}:{match}:{stand}:{qty}')
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color='black', back_color='white')
            qr_buffer = io.BytesIO()
            qr_img.save(qr_buffer, format='PNG')
            qr_buffer.seek(0)
            qr_reader = ImageReader(qr_buffer)
            c.drawImage(qr_reader, w/2 - 22*mm, h - 265*mm, 44*mm, 44*mm)
        except:
            pass

        # QR label
        c.setFillColor(colors.HexColor('#7e8fa6'))
        c.setFont('Helvetica', 8)
        c.drawCentredString(w/2, h - 272*mm, 'Scan at stadium gate')

        # Footer
        c.setFillColor(colors.HexColor('#00C853'))
        c.rect(0, 0, w, 20*mm, fill=1, stroke=0)
        c.setFillColor(colors.HexColor('#000000'))
        c.setFont('Helvetica-Bold', 10)
        c.drawCentredString(w/2, 8*mm, 'CricketPass — Official Ticket | cricketpass.com')

        # Watermark
        c.setFillColor(colors.HexColor('#0d1526'))
        c.setFont('Helvetica-Bold', 60)
        c.saveState()
        c.translate(w/2, h/2)
        c.rotate(45)
        c.drawCentredString(0, 0, 'CRICKETPASS')
        c.restoreState()

        c.save()
        buffer.seek(0)
        return buffer
    except ImportError:
        # Fallback: simple PDF without reportlab extras
        return generate_simple_pdf(ticket_id, name, match, stand, qty, total, seats, booked_at)

def generate_simple_pdf(ticket_id, name, match, stand, qty, total, seats='', booked_at=''):
    """Simple PDF fallback using only basic reportlab"""
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors

    buffer = io.BytesIO()
    w, h = A4
    c = canvas.Canvas(buffer, pagesize=A4)

    c.setFillColor(colors.HexColor('#0a0f1e'))
    c.rect(0, 0, w, h, fill=1, stroke=0)

    c.setFillColor(colors.HexColor('#00C853'))
    c.setFont('Helvetica-Bold', 32)
    c.drawCentredString(w/2, h - 60, 'CRICKETPASS')

    c.setFillColor(colors.HexColor('#e8eaf6'))
    c.setFont('Helvetica', 14)
    c.drawCentredString(w/2, h - 90, 'E-Ticket Confirmed!')

    c.setFillColor(colors.HexColor('#00C853'))
    c.setFont('Helvetica-Bold', 28)
    c.drawCentredString(w/2, h - 150, ticket_id)

    fields = [
        ('Passenger', name), ('Match', match), ('Stand', stand),
        ('Tickets', str(qty)), ('Seats', seats or 'General'),
        ('Total', f'Rs.{int(total):,}')
    ]
    c.setFont('Helvetica', 12)
    y = h - 200
    for label, value in fields:
        c.setFillColor(colors.HexColor('#7e8fa6'))
        c.drawString(80, y, f'{label}:')
        c.setFillColor(colors.HexColor('#e8eaf6'))
        c.drawString(200, y, str(value)[:40])
        y -= 30

    c.setFillColor(colors.HexColor('#00C853'))
    c.rect(0, 0, w, 30, fill=1, stroke=0)
    c.setFillColor(colors.HexColor('#000'))
    c.setFont('Helvetica-Bold', 10)
    c.drawCentredString(w/2, 10, 'CricketPass — Official Ticket')

    c.save()
    buffer.seek(0)
    return buffer

# ===========================
#  EMAIL SENDER
# ===========================
def send_ticket_email(to_email, name, ticket_id, match, stand, qty, total, pdf_buffer=None):
    try:
        msg = MIMEMultipart('mixed')
        msg['Subject'] = f'CricketPass Ticket Confirmed - {ticket_id}'
        msg['From']    = EMAIL_ADDRESS
        msg['To']      = to_email

        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0f1e;color:#e8eaf6;padding:30px;border-radius:16px;">
          <h1 style="color:#00C853;">CricketPass</h1>
          <p style="color:#7e8fa6;">Your ticket is confirmed! PDF is attached below.</p>
          <div style="background:#161f33;border:1px solid rgba(0,200,83,0.3);border-radius:12px;padding:24px;margin-bottom:20px;">
            <p style="color:#7e8fa6;font-size:0.8rem;letter-spacing:2px;">TICKET ID</p>
            <h2 style="color:#00C853;letter-spacing:4px;">{ticket_id}</h2>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:10px 0;color:#7e8fa6;">Match</td><td style="font-weight:bold;">{match}</td></tr>
            <tr><td style="padding:10px 0;color:#7e8fa6;">Stand</td><td>{stand}</td></tr>
            <tr><td style="padding:10px 0;color:#7e8fa6;">Tickets</td><td>{qty}</td></tr>
            <tr><td style="padding:10px 0;color:#7e8fa6;">Total Paid</td><td style="color:#00C853;font-weight:bold;">Rs.{total}</td></tr>
          </table>
          <p style="margin-top:24px;color:#7e8fa6;">PDF ticket attached — print it or show on your phone at the stadium gate!</p>
        </div>
        """
        alt = MIMEMultipart('alternative')
        alt.attach(MIMEText(html, 'html'))
        msg.attach(alt)

        # Attach PDF
        if pdf_buffer is not None:
            try:
                pdf_attach = MIMEBase('application', 'pdf')
                pdf_attach.set_payload(pdf_buffer.read())
                encoders.encode_base64(pdf_attach)
                pdf_attach.add_header('Content-Disposition', f'attachment; filename="CricketPass_{ticket_id}.pdf"')
                msg.attach(pdf_attach)
            except Exception as pe:
                print(f'PDF attach error: {pe}')

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.sendmail(EMAIL_ADDRESS, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f'Email error: {e}')
        return False

# ===========================
#  PAGES
# ===========================
@app.route('/')
def home():
    return render_template('index.html', user=session.get('user'), razorpay_key=RAZORPAY_KEY_ID)

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

# ===========================
#  AUTH APIs
# ===========================
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    hashed_pw = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    try:
        conn = get_db()
        conn.execute('INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)',
            (data['name'], data['email'], data.get('phone', ''), hashed_pw))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Account created!'})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Email already registered!'})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (data['email'],)).fetchone()
    conn.close()
    if user and bcrypt.check_password_hash(user['password'], data['password']):
        session['user'] = {'id': user['id'], 'name': user['name'], 'email': user['email']}
        return jsonify({'success': True, 'name': user['name']})
    return jsonify({'success': False, 'message': 'Invalid email or password!'})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({'success': True})

@app.route('/api/me', methods=['GET'])
def me():
    user = session.get('user')
    if user:
        user['is_admin'] = session.get('admin', False)
    return jsonify(user)

# ===========================
#  RAZORPAY APIs
# ===========================
@app.route('/api/create-order', methods=['POST'])
def create_order():
    data = request.json
    amount = int(data['amount']) * 100
    order = rz_client.order.create({'amount': amount, 'currency': 'INR', 'payment_capture': 1})
    return jsonify({'order_id': order['id'], 'amount': amount})

@app.route('/api/verify-payment', methods=['POST'])
def verify_payment():
    data = request.json
    try:
        rz_client.utility.verify_payment_signature({
            'razorpay_order_id':   data['razorpay_order_id'],
            'razorpay_payment_id': data['razorpay_payment_id'],
            'razorpay_signature':  data['razorpay_signature']
        })
        ticket_id = generate_ticket_id()
        user_id   = session.get('user', {}).get('id')
        conn = get_db()
        conn.execute('''INSERT INTO bookings
            (ticket_id, user_id, name, phone, email, match_name, stand, quantity, seat_numbers, total_price, payment_id, payment_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (ticket_id, user_id, data['name'], data['phone'], data['email'],
             data['match'], data['stand'], data['quantity'], data.get('seat_numbers',''),
             data['total'], data['razorpay_payment_id'], 'paid'))
        conn.commit()
        conn.close()
        pdf = generate_pdf_ticket(ticket_id, data['name'], data['match'], data['stand'],
                                   data['quantity'], data['total'], data.get('seat_numbers',''))
        pdf2 = generate_pdf_ticket(ticket_id, data['name'], data['match'], data['stand'],
                                    data['quantity'], data['total'], data.get('seat_numbers',''))
        send_ticket_email(data['email'], data['name'], ticket_id, data['match'],
                          data['stand'], data['quantity'], data['total'], pdf2)
        return jsonify({'success': True, 'ticket_id': ticket_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# ===========================
#  BOOKING APIs
# ===========================
@app.route('/api/book', methods=['POST'])
def book_ticket():
    data      = request.json
    ticket_id = generate_ticket_id()
    user_id   = session.get('user', {}).get('id')
    conn = get_db()
    conn.execute('''INSERT INTO bookings
        (ticket_id, user_id, name, phone, email, match_name, stand, quantity, seat_numbers, total_price, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (ticket_id, user_id, data['name'], data['phone'], data['email'],
         data['match'], data['stand'], data['quantity'], data.get('seat_numbers',''),
         data['total'], 'demo'))
    conn.commit()
    conn.close()
    try:
        pdf = generate_pdf_ticket(ticket_id, data['name'], data['match'], data['stand'],
                                   data['quantity'], data['total'], data.get('seat_numbers',''))
        send_ticket_email(data['email'], data['name'], ticket_id, data['match'],
                          data['stand'], data['quantity'], data['total'], pdf)
    except Exception as e:
        print(f'PDF/Email error (non-critical): {e}')
        send_ticket_email(data['email'], data['name'], ticket_id, data['match'],
                          data['stand'], data['quantity'], data['total'], None)
    return jsonify({'success': True, 'ticket_id': ticket_id})

@app.route('/api/bookings', methods=['GET'])
def get_bookings():
    user_id = session.get('user', {}).get('id')
    conn    = get_db()
    if user_id:
        rows = conn.execute('SELECT * FROM bookings WHERE user_id = ? ORDER BY booked_at DESC', (user_id,)).fetchall()
    else:
        rows = conn.execute('SELECT * FROM bookings ORDER BY booked_at DESC LIMIT 20').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

# ===========================
#  MATCHES API (Public)
# ===========================
@app.route('/api/matches', methods=['GET'])
def get_matches():
    conn = get_db()
    rows = conn.execute('SELECT * FROM matches WHERE is_active=1 ORDER BY match_date ASC').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

# ===========================
#  ADMIN MATCH CRUD
# ===========================
@app.route('/api/admin/matches', methods=['GET'])
def admin_get_matches():
    if not session.get('admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db()
    rows = conn.execute('SELECT * FROM matches ORDER BY match_date ASC').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/admin/matches', methods=['POST'])
def admin_add_match():
    if not session.get('admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    d = request.json
    conn = get_db()
    conn.execute('''INSERT INTO matches
        (match_type, team1, team2, team1_code, team2_code, match_date, match_time, venue, series, total_seats, available_seats)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (d.get('match_type','IPL'), d['team1'], d['team2'],
         d.get('team1_code',''), d.get('team2_code',''),
         d['match_date'], d.get('match_time','7:30 PM'),
         d.get('venue',''), d.get('series','IPL 2025'),
         int(d.get('total_seats', 500)), int(d.get('total_seats', 500))))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Match added successfully!'})

@app.route('/api/admin/matches/<int:match_id>', methods=['PUT'])
def admin_edit_match(match_id):
    if not session.get('admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    d = request.json
    conn = get_db()
    conn.execute('''UPDATE matches SET
        match_type=?, team1=?, team2=?, team1_code=?, team2_code=?,
        match_date=?, match_time=?, venue=?, series=?, total_seats=?, available_seats=?, is_active=?
        WHERE id=?''',
        (d.get('match_type','IPL'), d['team1'], d['team2'],
         d.get('team1_code',''), d.get('team2_code',''),
         d['match_date'], d.get('match_time','7:30 PM'),
         d.get('venue',''), d.get('series','IPL 2025'),
         int(d.get('total_seats',500)), int(d.get('available_seats',500)),
         int(d.get('is_active',1)), match_id))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Match updated successfully!'})

@app.route('/api/admin/matches/<int:match_id>', methods=['DELETE'])
def admin_delete_match(match_id):
    if not session.get('admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db()
    conn.execute('DELETE FROM matches WHERE id=?', (match_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Match deleted!'})

# ===========================
#  PDF DOWNLOAD ROUTE
# ===========================
@app.route('/api/ticket/download/<ticket_id>')
def download_ticket(ticket_id):
    conn   = get_db()
    row    = conn.execute('SELECT * FROM bookings WHERE ticket_id = ?', (ticket_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({'error': 'Ticket not found'}), 404
    b = dict(row)
    pdf = generate_pdf_ticket(
        b['ticket_id'], b['name'], b['match_name'], b['stand'],
        b['quantity'], b['total_price'], b.get('seat_numbers',''), b.get('booked_at','')
    )
    return send_file(pdf, mimetype='application/pdf',
                     as_attachment=True,
                     download_name=f"CricketPass_{ticket_id}.pdf")

# ===========================
#  SEAT MAP ROUTE
# ===========================
@app.route('/seats')
def seat_map():
    return render_template('seat_map.html')

# ===========================
#  ADMIN ROUTES
# ===========================
@app.route('/admin/login')
def admin_login_page():
    if session.get('admin'):
        return redirect('/admin')
    return render_template('admin_login.html')

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    if data['email'] == ADMIN_EMAIL and data['password'] == ADMIN_PASSWORD:
        session['admin'] = True
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Wrong credentials!'})

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin', None)
    return jsonify({'success': True})

@app.route('/admin')
def admin_dashboard():
    if not session.get('admin'):
        return redirect('/admin/login')
    return render_template('admin.html')

@app.route('/api/admin/stats', methods=['GET'])
def admin_stats():
    if not session.get('admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db()
    total_bookings = conn.execute('SELECT COUNT(*) FROM bookings').fetchone()[0]
    total_revenue  = conn.execute('SELECT SUM(total_price) FROM bookings').fetchone()[0] or 0
    total_users    = conn.execute('SELECT COUNT(*) FROM users').fetchone()[0]
    paid_bookings  = conn.execute("SELECT COUNT(*) FROM bookings WHERE payment_status='paid'").fetchone()[0]
    match_stats    = conn.execute('SELECT match_name, COUNT(*) as total, SUM(total_price) as revenue FROM bookings GROUP BY match_name ORDER BY total DESC').fetchall()
    stand_stats    = conn.execute('SELECT stand, COUNT(*) as total, SUM(quantity) as tickets FROM bookings GROUP BY stand ORDER BY total DESC').fetchall()
    conn.close()
    return jsonify({
        'total_bookings': total_bookings,
        'total_revenue':  total_revenue,
        'total_users':    total_users,
        'paid_bookings':  paid_bookings,
        'match_stats':    [dict(r) for r in match_stats],
        'stand_stats':    [dict(r) for r in stand_stats]
    })

@app.route('/api/admin/bookings', methods=['GET'])
def admin_bookings():
    if not session.get('admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db()
    rows = conn.execute('SELECT * FROM bookings ORDER BY booked_at DESC').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/admin/users', methods=['GET'])
def admin_users():
    if not session.get('admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db()
    rows = conn.execute('SELECT id, name, email, phone, created_at FROM users ORDER BY created_at DESC').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/admin/bookings/<int:booking_id>', methods=['DELETE'])
def delete_booking(booking_id):
    if not session.get('admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db()
    conn.execute('DELETE FROM bookings WHERE id = ?', (booking_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ===========================
#  RUN
# ===========================
if __name__ == '__main__':
    init_db()
    app.run(debug=True)