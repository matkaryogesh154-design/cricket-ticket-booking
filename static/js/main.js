// ===========================
//  CRICKETPASS — main.js
// ===========================

const STAND_PRICES = {
  general:  500,
  pavilion: 1200,
  premium:  2500,
  vip:      6000
};

const STAND_NAMES = {
  general:  'General Stand',
  pavilion: 'Pavilion',
  premium:  'Premium Covered',
  vip:      'VIP Box'
};

const allMatches = [
  { id:1, type:'T20',  team1:'🇮🇳', t1:'India', t1c:'IND', team2:'🇦🇺', t2:'Australia',   t2c:'AUS', date:'22 Mar 2025', time:'7:30 PM', venue:'Wankhede, Mumbai',          seats:120, series:'India vs Australia T20 Series' },
  { id:2, type:'ODI',  team1:'🇮🇳', t1:'India', t1c:'IND', team2:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', t2:'England',    t2c:'ENG', date:'28 Mar 2025', time:'2:00 PM', venue:'Eden Gardens, Kolkata',     seats:340, series:'India vs England ODI Series' },
  { id:3, type:'T20',  team1:'🇮🇳', t1:'India', t1c:'IND', team2:'🇿🇦', t2:'S. Africa',   t2c:'SA',  date:'3 Apr 2025',  time:'7:00 PM', venue:'Chinnaswamy, Bengaluru',    seats:0,   series:'India vs South Africa T20' },
  { id:4, type:'TEST', team1:'🇮🇳', t1:'India', t1c:'IND', team2:'🇳🇿', t2:'New Zealand', t2c:'NZ',  date:'10 Apr 2025', time:'9:30 AM', venue:'JSCA Stadium, Ranchi',       seats:800, series:'India vs New Zealand Test Series' },
  { id:5, type:'T20',  team1:'🇮🇳', t1:'India', t1c:'IND', team2:'🇵🇰', t2:'Pakistan',    t2c:'PAK', date:'19 Apr 2025', time:'7:30 PM', venue:'Narendra Modi, Ahmedabad',  seats:45,  series:'Asia Cup 2025' },
  { id:6, type:'ODI',  team1:'🇮🇳', t1:'India', t1c:'IND', team2:'🇱🇰', t2:'Sri Lanka',   t2c:'SL',  date:'25 Apr 2025', time:'1:30 PM', venue:'PCA Stadium, Mohali',       seats:510, series:'India vs Sri Lanka ODI Series' },
];

let selectedMatch = null;
let currentFilter = 'all';
let currentUser   = null;

// ===== CHECK LOGIN =====
async function checkLogin() {
  try {
    const res  = await fetch('/api/me');
    const user = await res.json();
    currentUser = user;
    const navRight = document.querySelector('.nav-right');
    if (user && navRight) {
      navRight.innerHTML = `
        <span style="color:var(--muted);font-size:0.88rem;">👋 ${user.name}</span>
        <button class="nav-btn" onclick="doLogout()">Logout</button>
      `;
    }
  } catch(e) { console.log('Login check failed:', e); }
}

async function doLogout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.reload();
}

// ===== RENDER MATCHES =====
function renderMatches(matches) {
  const grid = document.getElementById('matchGrid');
  if (!grid) return;
  if (matches.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:60px;">No matches found</div>`;
    return;
  }
  grid.innerHTML = matches.map(m => `
    <div class="match-card">
      <div class="match-type-row">
        <span class="match-type ${m.type.toLowerCase()}">${m.type} INTERNATIONAL</span>
        <span class="match-series">${m.series}</span>
      </div>
      <div class="teams">
        <div class="team">
          <span class="team-flag">${m.team1}</span>
          <span class="team-name">${m.t1}</span>
          <span class="team-code">${m.t1c}</span>
        </div>
        <div class="vs">VS</div>
        <div class="team">
          <span class="team-flag">${m.team2}</span>
          <span class="team-name">${m.t2}</span>
          <span class="team-code">${m.t2c}</span>
        </div>
      </div>
      <div class="match-meta">
        <span>📅 ${m.date}</span>
        <span>⏰ ${m.time}</span>
        <span>📍 ${m.venue}</span>
      </div>
      ${m.seats > 0 && m.seats < 200 ? `<div class="seats-badge">⚡ Only ${m.seats} seats left!</div>` : ''}
      <div class="match-footer">
        <div class="price">
          <span class="amount">From Rs.${STAND_PRICES.general.toLocaleString()}</span>
          <span class="label">per ticket</span>
        </div>
        ${m.seats === 0
          ? `<button class="sold-out-btn">SOLD OUT</button>`
          : `<button class="book-btn" onclick="window.location.href='/seats?match=${m.id}'">Book Now</button>`
        }
      </div>
    </div>
  `).join('');
}

// ===== FILTERS =====
function filterByType(type, btn) {
  currentFilter = type;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters(document.getElementById('searchInput').value.toLowerCase(), type);
}

function filterMatches() {
  const val = document.getElementById('searchInput');
  applyFilters(val ? val.value.toLowerCase() : '', currentFilter);
}

function applyFilters(search, type) {
  let filtered = allMatches;
  if (type !== 'all') filtered = filtered.filter(m => m.type === type);
  if (search) filtered = filtered.filter(m =>
    m.t1.toLowerCase().includes(search) ||
    m.t2.toLowerCase().includes(search) ||
    m.venue.toLowerCase().includes(search)
  );
  renderMatches(filtered);
}

// ===== OPEN BOOKING =====
function openBooking(matchId) {
  selectedMatch = allMatches.find(m => m.id === matchId);
  if (!selectedMatch) return;

  if (currentUser) {
    document.getElementById('buyerName').value  = currentUser.name  || '';
    document.getElementById('buyerEmail').value = currentUser.email || '';
  }

  document.getElementById('modalMatchName').textContent = `${selectedMatch.t1} vs ${selectedMatch.t2}`;
  document.getElementById('modalMatchMeta').textContent = `${selectedMatch.date} • ${selectedMatch.time} • ${selectedMatch.venue}`;
  document.getElementById('bookingOverlay').classList.add('active');
  updateSummary();
}

function closeBooking() {
  document.getElementById('bookingOverlay').classList.remove('active');
}

// ===== UPDATE SUMMARY =====
function updateSummary() {
  const stand    = document.getElementById('standSelect').value;
  const count    = parseInt(document.getElementById('ticketCount').value);
  const price    = STAND_PRICES[stand];
  const subtotal = price * count;
  const fee      = Math.round(subtotal * 0.06);
  const total    = subtotal + fee;

  document.getElementById('sumCat').textContent   = STAND_NAMES[stand];
  document.getElementById('sumPrice').textContent = `Rs.${price.toLocaleString()}`;
  document.getElementById('sumCount').textContent = count;
  document.getElementById('sumFee').textContent   = `Rs.${fee.toLocaleString()}`;
  document.getElementById('sumTotal').textContent = `Rs.${total.toLocaleString()}`;
}

// ===== CONFIRM BOOKING =====
async function confirmBooking() {
  const name  = document.getElementById('buyerName').value.trim();
  const phone = document.getElementById('buyerPhone').value.trim();
  const email = document.getElementById('buyerEmail').value.trim();

  if (!name)  { showToast('Please enter your name!'); return; }
  if (!phone) { showToast('Please enter your phone number!'); return; }
  if (!email) { showToast('Please enter your email address!'); return; }
  if (!email.includes('@')) { showToast('Please enter a valid email address!'); return; }

  const stand    = document.getElementById('standSelect').value;
  const quantity = parseInt(document.getElementById('ticketCount').value);
  const totalStr = document.getElementById('sumTotal').textContent.replace('Rs.','').replace(/,/g,'');
  const total    = parseInt(totalStr);

  const btn = document.querySelector('.btn-confirm');
  btn.textContent = 'Processing...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, phone, email,
        match:    `${selectedMatch.t1} vs ${selectedMatch.t2}`,
        stand,
        quantity,
        total
      })
    });

    const result = await res.json();

    if (result.success) {
      closeBooking();
      document.getElementById('successTicketId').textContent = result.ticket_id;
      document.getElementById('successMatch').textContent    = `${selectedMatch.t1} vs ${selectedMatch.t2}`;
      document.getElementById('successStand').textContent    = STAND_NAMES[stand];
      document.getElementById('successQty').textContent      = quantity;
      document.getElementById('successTotal').textContent    = `Rs.${total.toLocaleString()}`;
      document.getElementById('successOverlay').classList.add('active');
      loadBookings();
    } else {
      showToast('Booking failed! Try again.');
    }
  } catch(err) {
    console.error('Booking error:', err);
    showToast('Server error! Please check if app.py is running.');
  }

  btn.textContent = 'Pay & Confirm';
  btn.disabled = false;
}

// ===== CLOSE SUCCESS =====
function closeSuccess() {
  document.getElementById('successOverlay').classList.remove('active');
}

// ===== LOAD BOOKINGS =====
async function loadBookings() {
  const tbody = document.getElementById('bookingsBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" class="empty-row">Loading...</td></tr>`;

  try {
    const res  = await fetch('/api/bookings');
    const data = await res.json();

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No bookings yet. Book your first ticket!</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(b => `
      <tr>
        <td><strong style="color:var(--green);font-family:'Bebas Neue',cursive;letter-spacing:1px;">${b.ticket_id}</strong></td>
        <td>${b.match_name}</td>
        <td>${b.name}</td>
        <td>${STAND_NAMES[b.stand] || b.stand}</td>
        <td>${b.quantity}</td>
        <td>Rs.${b.total_price.toLocaleString()}</td>
        <td><span class="status-badge">${b.payment_status === 'paid' ? '✅ Paid' : '🎫 Demo'}</span></td>
      </tr>
    `).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">Could not load bookings.</td></tr>`;
  }
}

// ===== TOAST =====
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== OUTSIDE CLICK =====
document.getElementById('bookingOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeBooking();
});
document.getElementById('successOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeSuccess();
});

// ===== INIT =====
checkLogin();
renderMatches(allMatches);
loadBookings();