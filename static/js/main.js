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
  // IPL 2025 Matches
  { id:1,  type:'IPL', team1:'🟣', t1:'Mumbai Indians',      t1c:'MI',  team2:'🔵', t2:'Chennai Super Kings', t2c:'CSK', date:'22 Mar 2025', time:'7:30 PM', venue:'Wankhede Stadium, Mumbai',        seats:120, series:'IPL 2025 — Match 1' },
  { id:2,  type:'IPL', team1:'🔴', t1:'Royal Challengers',   t1c:'RCB', team2:'🟡', t2:'Chennai Super Kings', t2c:'CSK', date:'25 Mar 2025', time:'7:30 PM', venue:'Chinnaswamy Stadium, Bengaluru',  seats:340, series:'IPL 2025 — Match 4' },
  { id:3,  type:'IPL', team1:'🟣', t1:'Kolkata Knight Riders',t1c:'KKR', team2:'🔵', t2:'Mumbai Indians',     t2c:'MI',  date:'28 Mar 2025', time:'7:30 PM', venue:'Eden Gardens, Kolkata',           seats:0,   series:'IPL 2025 — Match 7' },
  { id:4,  type:'IPL', team1:'🟠', t1:'Sunrisers Hyderabad', t1c:'SRH', team2:'🔴', t2:'Royal Challengers',  t2c:'RCB', date:'31 Mar 2025', time:'7:30 PM', venue:'Rajiv Gandhi Stadium, Hyderabad', seats:500, series:'IPL 2025 — Match 10' },
  { id:5,  type:'IPL', team1:'🩵', t1:'Rajasthan Royals',    t1c:'RR',  team2:'🟡', t2:'Chennai Super Kings', t2c:'CSK', date:'3 Apr 2025',  time:'7:30 PM', venue:'Sawai Mansingh Stadium, Jaipur',  seats:45,  series:'IPL 2025 — Match 13' },
  { id:6,  type:'IPL', team1:'🟤', t1:'Punjab Kings',        t1c:'PBKS',team2:'🟣', t2:'Kolkata Knight Riders',t2c:'KKR',date:'6 Apr 2025',  time:'3:30 PM', venue:'Maharaja Yadavindra Stadium',     seats:600, series:'IPL 2025 — Match 16' },
  { id:7,  type:'IPL', team1:'🔵', t1:'Mumbai Indians',      t1c:'MI',  team2:'🔴', t2:'Royal Challengers',  t2c:'RCB', date:'9 Apr 2025',  time:'7:30 PM', venue:'Wankhede Stadium, Mumbai',        seats:200, series:'IPL 2025 — Match 19' },
  { id:8,  type:'IPL', team1:'🟡', t1:'Chennai Super Kings', t1c:'CSK', team2:'🟠', t2:'Sunrisers Hyderabad',t2c:'SRH', date:'12 Apr 2025', time:'7:30 PM', venue:'MA Chidambaram Stadium, Chennai',  seats:80,  series:'IPL 2025 — Match 22' },
  { id:9,  type:'IPL', team1:'🔵', t1:'Delhi Capitals',      t1c:'DC',  team2:'🟣', t2:'Kolkata Knight Riders',t2c:'KKR',date:'15 Apr 2025', time:'7:30 PM', venue:'Arun Jaitley Stadium, Delhi',     seats:350, series:'IPL 2025 — Match 25' },
  { id:10, type:'IPL', team1:'🩵', t1:'Rajasthan Royals',    t1c:'RR',  team2:'🟠', t2:'Sunrisers Hyderabad',t2c:'SRH', date:'18 Apr 2025', time:'7:30 PM', venue:'Sawai Mansingh Stadium, Jaipur',  seats:420, series:'IPL 2025 — Match 28' },
  { id:11, type:'IPL', team1:'🟣', t1:'Mumbai Indians',      t1c:'MI',  team2:'🟤', t2:'Punjab Kings',       t2c:'PBKS',date:'21 Apr 2025', time:'7:30 PM', venue:'Wankhede Stadium, Mumbai',        seats:0,   series:'IPL 2025 — Match 31' },
  { id:12, type:'IPL', team1:'🔴', t1:'Royal Challengers',   t1c:'RCB', team2:'🔵', t2:'Delhi Capitals',     t2c:'DC',  date:'24 Apr 2025', time:'7:30 PM', venue:'Chinnaswamy Stadium, Bengaluru',  seats:150, series:'IPL 2025 — Match 34' },
  { id:13, type:'IPL', team1:'🟡', t1:'Chennai Super Kings', t1c:'CSK', team2:'🟣', t2:'Kolkata Knight Riders',t2c:'KKR',date:'27 Apr 2025', time:'3:30 PM', venue:'MA Chidambaram Stadium, Chennai',  seats:60,  series:'IPL 2025 — Match 37' },
  { id:14, type:'IPL', team1:'🟠', t1:'Sunrisers Hyderabad', t1c:'SRH', team2:'🟤', t2:'Punjab Kings',       t2c:'PBKS',date:'30 Apr 2025', time:'7:30 PM', venue:'Rajiv Gandhi Stadium, Hyderabad', seats:280, series:'IPL 2025 — Match 40' },
  // Playoff Matches
  { id:15, type:'IPL', team1:'🏆', t1:'Qualifier 1',         t1c:'Q1',  team2:'🏆', t2:'Qualifier 2',        t2c:'Q2',  date:'20 May 2025', time:'7:30 PM', venue:'Eden Gardens, Kolkata',           seats:30,  series:'IPL 2025 — Qualifier 1' },
  { id:16, type:'IPL', team1:'🏆', t1:'Eliminator',          t1c:'EL',  team2:'🏆', t2:'Eliminator',         t2c:'EL',  date:'21 May 2025', time:'7:30 PM', venue:'Wankhede Stadium, Mumbai',        seats:25,  series:'IPL 2025 — Eliminator' },
  { id:17, type:'IPL', team1:'🏆', t1:'IPL Final',           t1c:'TBD', team2:'🏆', t2:'IPL Final',          t2c:'TBD', date:'25 May 2025', time:'7:30 PM', venue:'Narendra Modi Stadium, Ahmedabad',seats:0,   series:'IPL 2025 — GRAND FINAL' },
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
        <a href="/admin/login"><button class="nav-btn" style="border-color:rgba(255,214,0,0.3);color:var(--accent);">⚙️ Admin</button></a>
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
let currentMatches = [...allMatches]; // will be updated after DB load

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
  let filtered = currentMatches;
  if (type !== 'all') filtered = filtered.filter(m => m.type === type);
  if (search) filtered = filtered.filter(m =>
    m.t1.toLowerCase().includes(search) ||
    m.t2.toLowerCase().includes(search) ||
    m.venue.toLowerCase().includes(search) ||
    m.series.toLowerCase().includes(search)
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

// ===== LOAD MATCHES FROM DB =====
async function loadMatchesFromDB() {
  try {
    const res  = await fetch('/api/matches');
    const data = await res.json();

    if (data && data.length > 0) {
      const dbMatches = data.map(m => ({
        id:     m.id,
        type:   m.match_type || 'IPL',
        team1:  '🏏',
        t1:     m.team1,
        t1c:    m.team1_code || m.team1.substring(0,3).toUpperCase(),
        team2:  '🏏',
        t2:     m.team2,
        t2c:    m.team2_code || m.team2.substring(0,3).toUpperCase(),
        date:   m.match_date || '',
        time:   m.match_time || '7:30 PM',
        venue:  m.venue || '',
        seats:  m.available_seats || 0,
        series: m.series || 'IPL 2025'
      }));
      // Merge: DB matches first, then hardcoded
      currentMatches = [...dbMatches, ...allMatches];
    } else {
      currentMatches = [...allMatches];
    }
    renderMatches(currentMatches);
  } catch(e) {
    currentMatches = [...allMatches];
    renderMatches(allMatches);
  }
}

// ===== INIT =====
checkLogin();
loadMatchesFromDB();
loadBookings();