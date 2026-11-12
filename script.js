/* ---------- Data & storage ---------- */
const KEY = 'industryConnectData';
const CERTS = ["Python","SQL","Power BI","JavaScript","React","AWS Cloud","Docker","Java"];

const defaults = {
  students: [
    { name:"Manoj", email:"vrmk@gmail.com", phone:"9876543210", password:"manoj@123", degree:"B.Tech Computer Science", gradYear:"2026", certs:["Python","SQL","Power BI"] },
    { name:"Rahul Verma", email:"rahul@example.com", phone:"9876500002", password:"123456", degree:"BCA / B.Sc Computer Science", gradYear:"2025", certs:["JavaScript","React"] }
  ],
  recruiters: [{ name:"TechCorp HR", email:"recruit@gmail.com", phone:"9876543210", password:"recruit @123" }],
  jobs: [
    { role:"Data Analyst Intern", company:"FinTech Corp", type:"Internship", required:["Python","SQL","Power BI"] },
    { role:"Frontend Developer", company:"Pixel Labs", type:"Full-time", required:["JavaScript","React"] },
    { role:"Cloud & DevOps Associate", company:"CloudScale Inc", type:"Full-time", required:["AWS Cloud","Docker","Python"] },
    { role:"Backend Software Engineer", company:"Nexus Tech", type:"Full-time", required:["Java","SQL","Docker"] }
  ],
  offers: {},
  session: null
};

function loadData() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.students && d.recruiters && d.jobs) {
      d.offers = d.offers || {};
      return d;
    }
  } catch (e) {}

  return JSON.parse(JSON.stringify(defaults));
}

function saveData() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('Could not save', e);
  }
}

let db = loadData();

let currentRole = 'student', currentMode = 'login';
let screenHistory = [];
let pendingOffer = null;

const otpVerified = {
  'rec-login': null,
  'rec-sign': null
};

/* ---------- Helpers ---------- */

const $ = id => document.getElementById(id);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]));

const validPhone = p => /^\d{10}$/.test(p);

const normEmail = e => e.trim().toLowerCase();

const currentStudent = () =>
  db.students.find(s => s.email === db.session?.email);

const currentRecruiter = () =>
  db.recruiters.find(r => r.email === db.session?.email);

const hasAccepted = email =>
  (db.offers[email] || []).some(o => o.status === 'accepted');


function calcMatch(required, certs) {

  const have = certs.map(c => c.toLowerCase());

  const matched = required.filter(r =>
    have.includes(r.toLowerCase())
  );

  const missing = required.filter(r =>
    !have.includes(r.toLowerCase())
  );

  const percentage = required.length
    ? Math.round(matched.length / required.length * 100)
    : 0;

  return { matched, missing, percentage };
}

const badgeFor = p =>
  p >= 70 ? 'badge-high' : p >= 40 ? 'badge-mid' : 'badge-low';

const colorFor = p =>
  p >= 70 ? '#16a34a' : p >= 40 ? '#d97706' : '#dc2626';

const tagsHtml = (m, x) =>
  m.map(c => `<span class="tag tag-match">✓ ${esc(c)}</span>`).join('') +
  x.map(c => `<span class="tag tag-missing">✗ Missing: ${esc(c)}</span>`).join('');


function renderChecks(containerId, name, selected = []) {

  const have = selected.map(s => s.toLowerCase());

  $(containerId).innerHTML = CERTS.map(c =>
    `<label class="checkbox-label">
      <input type="checkbox" name="${name}" value="${esc(c)}"
      ${have.includes(c.toLowerCase()) ? 'checked' : ''}/>
      ${esc(c)}
    </label>`
  ).join('');
}

const checked = name =>
  Array.from(
    document.querySelectorAll(`input[name="${name}"]:checked`)
  ).map(e => e.value);


/* ---------- Navigation ---------- */

function showScreen(id) {

  document.querySelectorAll('.screen').forEach(s =>
    s.classList.remove('active')
  );

  $(id).classList.add('active');

  const auth = id === 'screen-auth';

  $('logout-btn').style.display = auth ? 'none' : 'block';

  if (auth) screenHistory = [];

  $('header-back-btn').style.display =
    (!auth && screenHistory.length) ? 'inline-block' : 'none';


  if (id === 'screen-profile') {

    const s = currentStudent();

    if (s) {

      $('profile-welcome').textContent =
        `Welcome, ${s.name}! Your details are saved automatically.`;

      $('degree').value = s.degree || '';

      $('grad-year').value = s.gradYear || '2026';

      renderChecks('profile-certs', 'certs', s.certs);
    }

    renderStudentOffers();
  }


  if (id === 'screen-recruiter-dash') {

    const r = currentRecruiter();

    if (r) {
      $('rec-welcome').textContent = `Welcome, ${r.name}`;
    }

    renderChecks('job-certs', 'job-req-certs');

    renderSentOffers();
  }
}


function navigateWithHistory(target) {

  const active = document.querySelector('.screen.active');

  if (active && active.id !== target) {
    screenHistory.push(active.id);
  }

  showScreen(target);
}


function goBack() {

  if (screenHistory.length) {
    showScreen(screenHistory.pop());
  }
}


function setRole(role) {

  currentRole = role;

  $('btn-role-student').classList.toggle(
    'active', role === 'student'
  );

  $('btn-role-recruiter').classList.toggle(
    'active', role === 'recruiter'
  );

  updateFormVisibility();
}


function setMode(mode) {

  currentMode = mode;

  $('btn-mode-login').classList.toggle(
    'active', mode === 'login'
  );

  $('btn-mode-signup').classList.toggle(
    'active', mode === 'signup'
  );

  updateFormVisibility();
}


function updateFormVisibility() {

  clearAlert();

  const show = (id, on) =>
    $(id).style.display = on ? 'block' : 'none';

  show(
    'form-student-login',
    currentRole === 'student' && currentMode === 'login'
  );

  show(
    'form-student-signup',
    currentRole === 'student' && currentMode === 'signup'
  );

  show(
    'form-recruiter-login',
    currentRole === 'recruiter' && currentMode === 'login'
  );

  show(
    'form-recruiter-signup',
    currentRole === 'recruiter' && currentMode === 'signup'
  );
}


function showAlert(text, cls) {

  const el = $('auth-alert');

  el.className = `alert-box ${cls}`;

  el.textContent = text;

  el.style.display = 'block';
}


function clearAlert() {
  $('auth-alert').style.display = 'none';
}


/* ---------- OTP ---------- */

function sendOtp(prefix) {

  const phone = $(`${prefix}-phone`).value.trim();

  if (!validPhone(phone)) {
    return showAlert(
      '❌ Mobile number must be exactly 10 digits.',
      'alert-error'
    );
  }

  $(`${prefix}-otp-group`).style.display = 'block';

  showAlert(
    `📲 OTP sent to ${phone}! (Demo OTP: 1234)`,
    'alert-success'
  );
}


function verifyOtp(prefix) {

  const phone = $(`${prefix}-phone`).value.trim();

  if (!validPhone(phone)) {
    return showAlert(
      '❌ Mobile number must be exactly 10 digits.',
      'alert-error'
    );
  }

  if ($(`${prefix}-otp`).value.trim() === '1234') {

    otpVerified[prefix] = phone;

    showAlert(
      '✅ OTP verified successfully!',
      'alert-success'
    );

  } else {

    otpVerified[prefix] = null;

    showAlert(
      '❌ Invalid OTP. Enter 1234.',
      'alert-error'
    );
  }
}


const isOtpOk = prefix =>
  otpVerified[prefix] &&
  otpVerified[prefix] === $(`${prefix}-phone`).value.trim();


/* ---------- Authentication ---------- */

function startSession(role, email) {

  db.session = { role, email };

  saveData();

  screenHistory = [];

  showScreen(
    role === 'student'
      ? 'screen-profile'
      : 'screen-recruiter-dash'
  );
}


function handleStudentSignup(e) {

  e.preventDefault();

  const name = $('stu-sign-name').value.trim();

  const email = normEmail($('stu-sign-email').value);

  const phone = $('stu-sign-phone').value.trim();

  const pass = $('stu-sign-pass').value;


  if (!validPhone(phone)) {
    return showAlert(
      '❌ Mobile number must be exactly 10 digits.',
      'alert-error'
    );
  }

  if (pass !== $('stu-sign-confirm').value) {
    return showAlert(
      '❌ Passwords do not match.',
      'alert-error'
    );
  }

  if (db.students.some(u => u.email === email)) {
    return showAlert(
      '❌ This email is already registered.',
      'alert-error'
    );
  }

  db.students.push({
    name,
    email,
    phone,
    password: pass,
    degree: '',
    gradYear: '2026',
    certs: []
  });

  db.offers[email] = [];

  saveData();

  e.target.reset();

  setMode('login');

  $('stu-login-email').value = email;

  showAlert(
    '🎉 Account created and saved! Please log in.',
    'alert-success'
  );
}


function handleStudentLogin(e) {

  e.preventDefault();

  const email = normEmail($('stu-login-email').value);

  const user = db.students.find(u =>
    u.email === email &&
    u.password === $('stu-login-pass').value
  );

  if (!user) {
    return showAlert(
      '❌ Incorrect email or password.',
      'alert-error'
    );
  }

  startSession('student', user.email);
}


function handleRecruiterSignup(e) {

  e.preventDefault();

  const name = $('rec-sign-name').value.trim();

  const email = normEmail($('rec-sign-email').value);

  const phone = $('rec-sign-phone').value.trim();

  const pass = $('rec-sign-pass').value;


  if (!validPhone(phone)) {
    return showAlert(
      '❌ Mobile number must be exactly 10 digits.',
      'alert-error'
    );
  }

  if (pass !== $('rec-sign-confirm').value) {
    return showAlert(
      '❌ Passwords do not match.',
      'alert-error'
    );
  }

  if (db.recruiters.some(u => u.email === email)) {
    return showAlert(
      '❌ This email is already registered.',
      'alert-error'
    );
  }

  if (!isOtpOk('rec-sign')) {
    return showAlert(
      '❌ Please send and verify OTP for this number.',
      'alert-error'
    );
  }

  db.recruiters.push({
    name,
    email,
    phone,
    password: pass
  });

  saveData();

  e.target.reset();

  otpVerified['rec-sign'] = null;

  $('rec-sign-otp-group').style.display = 'none';

  setMode('login');

  $('rec-login-email').value = email;

  showAlert(
    '🎉 Recruiter account created and saved! Please log in.',
    'alert-success'
  );
}


function handleRecruiterLogin(e) {

  e.preventDefault();

  const email = normEmail($('rec-login-email').value);

  const user = db.recruiters.find(u =>
    u.email === email &&
    u.password === $('rec-login-pass').value
  );

  if (!user) {
    return showAlert(
      '❌ Incorrect email or password.',
      'alert-error'
    );
  }

  if (!validPhone($('rec-login-phone').value.trim())) {
    return showAlert(
      '❌ Mobile number must be exactly 10 digits.',
      'alert-error'
    );
  }

  if (!isOtpOk('rec-login')) {
    return showAlert(
      '❌ Please send and verify OTP for this number.',
      'alert-error'
    );
  }

  startSession('recruiter', user.email);
}


function logout() {

  db.session = null;

  saveData();

  otpVerified['rec-login'] = otpVerified['rec-sign'] = null;

  document.querySelectorAll('form').forEach(f => f.reset());

  [
    'rec-login-otp-group',
    'rec-sign-otp-group'
  ].forEach(id => $(id).style.display = 'none');

  showScreen('screen-auth');
}


/* ---------- Student: profile, matches, guide ---------- */

function handleProfileSubmit(e) {

  e.preventDefault();

  const selected = checked('certs');

  if (!selected.length) {
    return alert(
      "Please select certifications or click 'I don't have certifications'."
    );
  }

  const s = currentStudent();

  s.certs = selected;

  s.degree = $('degree').value;

  s.gradYear = $('grad-year').value;

  saveData();

  renderStudentMatches(selected);

  navigateWithHistory('screen-matches');
}


function renderStudentMatches(userCerts) {

  const list = $('matches-list');

  list.innerHTML = '';

  db.jobs
    .map((job, idx) => ({
      job,
      idx,
      ...calcMatch(job.required, userCerts)
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .forEach(({ job, idx, matched, missing, percentage }) => {

      const card = document.createElement('div');

      card.className = 'card-item';

      card.innerHTML = `
        <div class="card-header">
          <h4>${esc(job.role)}</h4>
          <span class="badge ${badgeFor(percentage)}">
            ${percentage}% Match
          </span>
        </div>

        <p class="company-name">
          🏢 ${esc(job.company)} • 🗂️ ${esc(job.type || 'Role')}
        </p>

        <div class="tag-container">
          ${tagsHtml(matched, missing)}
        </div>

        <button class="btn btn-recruit"
          style="background:#2563eb"
          onclick="applyJob(${idx})">
          Apply Now 🚀
        </button>
      `;

      list.appendChild(card);
    });
}


function applyJob(idx) {

  const j = db.jobs[idx];

  if (j) {
    alert(
      `Applied successfully for ${j.role} at ${j.company}! 🎉`
    );
  }
}


function goToCompanyGuide() {

  const list = $('guide-list');

  list.innerHTML = '';

  db.jobs.forEach(job => {

    const card = document.createElement('div');

    card.className = 'card-item';

    card.innerHTML = `
      <div class="card-header">
        <h4>${esc(job.role)}</h4>
      </div>

      <p class="company-name">
        🏢 ${esc(job.company)} • 🗂️ ${esc(job.type || 'Role')}
      </p>

      <div class="tag-container">
        ${job.required.map(c =>
          `<span class="tag tag-guide">📜 ${esc(c)}</span>`
        ).join('')}
      </div>
    `;

    list.appendChild(card);
  });

  navigateWithHistory('screen-guide');
}


/* ---------- Student: company > role type > role analysis ---------- */

function fillSelect(id, items, emptyText) {

  $(id).innerHTML = items.length
    ? items.map(i =>
        `<option value="${esc(i.value)}">${esc(i.label)}</option>`
      ).join('')
    : `<option value="">${esc(emptyText)}</option>`;
}


function openCheck() {

  const companies = [
    ...new Set(db.jobs.map(j => j.company))
  ];

  fillSelect(
    'check-company',
    companies.map(c => ({ value: c, label: c })),
    'No companies yet'
  );

  renderChecks(
    'check-certs',
    'check-certs',
    currentStudent()?.certs || []
  );

  $('check-result').innerHTML = '';

  onCompanyChange();

  navigateWithHistory('screen-check');
}


function onCompanyChange() {

  const company = $('check-company').value;

  const types = [
    ...new Set(
      db.jobs
        .filter(j => j.company === company)
        .map(j => j.type || 'Role')
    )
  ];

  fillSelect(
    'check-type',
    types.map(t => ({ value: t, label: t })),
    'No role types'
  );

  onTypeChange();
}


function onTypeChange() {

  const company = $('check-company').value;

  const type = $('check-type').value;

  const roles = db.jobs
    .map((j, idx) => ({ j, idx }))
    .filter(({ j }) =>
      j.company === company &&
      (j.type || 'Role') === type
    )
    .map(({ j, idx }) => ({
      value: idx,
      label: j.role
    }));

  fillSelect(
    'check-role',
    roles,
    'No roles available'
  );

  $('check-result').innerHTML = '';
}


function analyzeRole() {

  const idx = $('check-role').value;

  const job = db.jobs[idx];

  if (!job) {
    return alert(
      'Please select a company, role type and role.'
    );
  }

  const {
    matched,
    missing,
    percentage
  } = calcMatch(
    job.required,
    checked('check-certs')
  );

  const verdict = percentage >= 70
    ? '✅ Strong match, you can apply!'
    : percentage >= 40
      ? '⚠️ Partial match, build the missing skills.'
      : '❌ Low match, focus on the missing certifications.';

  $('check-result').innerHTML = `
    <div class="card-item">

      <div class="card-header">
        <h4>${esc(job.role)}</h4>
        <span class="badge ${badgeFor(percentage)}">
          ${esc(job.type || 'Role')}
        </span>
      </div>

      <p class="company-name">
        🏢 ${esc(job.company)}
      </p>

      <div class="big-pct"
        style="color:${colorFor(percentage)}">
        ${percentage}%
      </div>

      <div class="meter">
        <div style="width:${percentage}%;background:${colorFor(percentage)}"></div>
      </div>

      <p style="text-align:center;font-size:.85rem;margin-bottom:.5rem">
        ${verdict}
      </p>

      <div class="tag-container">
        ${tagsHtml(matched, missing)}
      </div>

    </div>
  `;
}


/* ---------- Student: offer letters ---------- */

function renderStudentOffers() {

  const s = currentStudent();

  const offers = (s && db.offers[s.email]) || [];

  $('student-offers-area').style.display =
    offers.length ? 'block' : 'none';

  const list = $('student-offers-list');

  list.innerHTML = '';

  offers.slice().reverse().forEach(o => {

    const div = document.createElement('div');

    div.className = 'offer-card';

    div.innerHTML = `
      <strong>📩 Offer from ${esc(o.company)}</strong>

      <div class="letter">

        Dear ${esc(s.name)},<br><br>

        We are pleased to offer you the position of
        <strong>${esc(o.role)}</strong>
        (${esc(o.type)}) at
        <strong>${esc(o.company)}</strong>.<br>

        • Stipend / Salary: <strong>${esc(o.pay)}</strong><br>

        • Joining date: <strong>${esc(o.joinDate)}</strong><br>

        • Location: <strong>${esc(o.location)}</strong><br>

        ${o.message ? `<br>${esc(o.message)}<br>` : ''}

        <br>Regards,<br>
        ${esc(o.recruiterName)}
        <br><small>Sent ${esc(o.time)}</small>

      </div>

      <div class="notif-actions">

        ${
          o.status === 'pending'
            ? `<button class="btn-accept"
                onclick="respondOffer(${o.id}, 'accepted')">
                Accept Offer 🤝
              </button>

              <button class="btn-decline"
                onclick="respondOffer(${o.id}, 'declined')">
                Decline
              </button>`

            : o.status === 'closed'
              ? `<span style="font-weight:600;color:#64748b">
                  Closed: you already accepted another offer
                </span>`

              : `<span style="font-weight:600;color:${o.status === 'accepted' ? '#059669' : '#dc2626'}">
                  Status: ${esc(o.status.toUpperCase())}
                </span>`
        }

      </div>
    `;

    list.appendChild(div);
  });
}


function respondOffer(id, action) {

  const s = currentStudent();

  const offers = db.offers[s.email] || [];

  const o = offers.find(x => x.id === id);

  if (!o || o.status !== 'pending') return;

  if (action === 'accepted') {

    if (hasAccepted(s.email)) {
      return alert(
        'You have already accepted an offer. Only one offer can be accepted.'
      );
    }

    if (!confirm(
      `Accept the offer from ${o.company}? You can accept only one offer, and your other pending offers will be closed.`
    )) return;

    o.status = 'accepted';

    offers.forEach(x => {
      if (x !== o && x.status === 'pending') {
        x.status = 'closed';
      }
    });

  } else {

    o.status = 'declined';
  }

  saveData();

  alert(`You have ${action} the offer! 🎉`);

  renderStudentOffers();
}


/* ---------- Recruiter ---------- */

function showJobCreationForm() {

  const box = $('job-creation-box');

  box.style.display =
    box.style.display === 'none' ? 'block' : 'none';
}


function handleCreateJob(e) {

  e.preventDefault();

  const required = checked('job-req-certs');

  if (!required.length) {
    return alert(
      'Please check at least one required certification.'
    );
  }

  db.jobs.push({

    role: $('new-job-title').value.trim(),

    company: $('new-job-company').value.trim(),

    type: $('new-job-type').value,

    required

  });

  saveData();

  alert('New job opening added and saved! ✅');

  e.target.reset();

  renderChecks('job-certs', 'job-req-certs');

  $('job-creation-box').style.display = 'none';
}


function reviewCandidateMatches() {

  fillSelect(
    'match-role-select',

    db.jobs.map((j, i) => ({
      value: i,
      label: `${j.role} (${j.company}, ${j.type || 'Role'})`
    })),

    'No jobs posted'
  );

  renderCandidateMatches();

  navigateWithHistory('screen-candidate-matches');
}


function renderCandidateMatches() {

  const idx = $('match-role-select').value;

  const job = db.jobs[idx];

  const list = $('candidates-list');

  list.innerHTML = '';

  if (!job) return;

  db.students

    .map(c => ({
      c,
      ...calcMatch(job.required, c.certs)
    }))

    .sort((a, b) => b.percentage - a.percentage)

    .forEach(({ c, matched, missing, percentage }) => {

      const sent = (db.offers[c.email] || []).some(o =>
        o.role === job.role &&
        o.company === job.company
      );

      const taken = hasAccepted(c.email);

      const card = document.createElement('div');

      card.className = 'card-item';

      card.innerHTML = `

        <div class="card-header">

          <h4>👤 ${esc(c.name)}</h4>

          <span class="badge ${badgeFor(percentage)}">
            ${percentage}% Suitable
          </span>

        </div>

        <p class="company-name">
          🎓 ${esc(c.degree || 'Degree not added')}
          • ✉️ ${esc(c.email)}
        </p>

        <div class="tag-container">
          ${tagsHtml(matched, missing)}
        </div>

        <button class="btn btn-recruit"
          ${sent || taken ? 'disabled style="opacity:.6;cursor:default"' : ''}

          data-email="${esc(c.email)}"

          onclick="openOfferForm(this.dataset.email, ${idx})">

          ${
            taken
              ? '🔒 Already accepted another offer'
              : sent
                ? '✅ Offer Letter Sent'
                : '📨 Send Offer Letter'
          }

        </button>

      `;

      list.appendChild(card);
    });
}


function openOfferForm(email, jobIdx) {

  const s = db.students.find(u => u.email === email);

  const job = db.jobs[jobIdx];

  if (!s || !job) return;

  pendingOffer = { email, jobIdx };

  $('offer-subtitle').textContent =
    `To ${s.name} for ${job.role} at ${job.company}`;

  $('offer-date').min =
    new Date().toISOString().split('T')[0];

  navigateWithHistory('screen-offer');
}


function handleSendOffer(e) {

  e.preventDefault();

  if (!pendingOffer) return;

  const job = db.jobs[pendingOffer.jobIdx];

  const s = db.students.find(u =>
    u.email === pendingOffer.email
  );

  const rec = currentRecruiter();

  if (hasAccepted(s.email)) {

    alert(`${s.name} has already accepted another offer.`);

    pendingOffer = null;

    goBack();

    renderCandidateMatches();

    return;
  }

  (db.offers[s.email] ||= []).push({

    id: Date.now(),

    role: job.role,

    company: job.company,

    type: job.type || 'Role',

    pay: $('offer-pay').value.trim(),

    joinDate: $('offer-date').value,

    location: $('offer-location').value.trim(),

    message: $('offer-msg').value.trim(),

    recruiterEmail: rec?.email,

    recruiterName: rec?.name || 'Recruiter',

    time: new Date().toLocaleString(
      [],
      {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    ),

    status: 'pending'

  });

  saveData();

  alert(`Offer letter sent to ${s.name}! 🚀`);

  e.target.reset();

  pendingOffer = null;

  goBack();

  renderCandidateMatches();
}


function renderSentOffers() {

  const rec = currentRecruiter();

  const list = $('sent-offers-list');

  const rows = [];

  db.students.forEach(s =>
    (db.offers[s.email] || []).forEach(o => {

      if (o.recruiterEmail === rec?.email) {
        rows.push({ s, o });
      }

    })
  );

  list.innerHTML = rows.length

    ? rows.map(({ s, o }) => `

        <div class="card-item" style="margin-bottom:.5rem">

          <div class="card-header">

            <strong>${esc(s.name)}</strong>

            <span class="badge badge-status">
              ${esc(o.status.toUpperCase())}
            </span>

          </div>

          <p class="company-name" style="margin:0">
            ${esc(o.role)} at ${esc(o.company)} • ${esc(o.time)}
          </p>

        </div>

      `).join('')

    : '<p class="empty">No offer letters sent yet.</p>';
}


/* ---------- Delete account ---------- */

function openDelete() {

  $('delete-subtitle').textContent =
    db.session.role === 'student'

      ? 'This permanently removes your profile and all your offer letters.'

      : 'This permanently removes your recruiter account and withdraws your pending offers.';

  $('delete-pass').value = '';

  navigateWithHistory('screen-delete');
}


function handleDeleteAccount(e) {

  e.preventDefault();

  const { role, email } = db.session;

  const user = role === 'student'
    ? currentStudent()
    : currentRecruiter();

  if (!user || user.password !== $('delete-pass').value) {
    return alert(
      '❌ Incorrect password. Account not deleted.'
    );
  }

  if (!confirm('Are you sure? This cannot be undone.')) {
    return;
  }

  if (role === 'student') {

    db.students = db.students.filter(x =>
      x.email !== email
    );

    delete db.offers[email];

  } else {

    db.recruiters = db.recruiters.filter(x =>
      x.email !== email
    );

    Object.keys(db.offers).forEach(k => {

      db.offers[k] = db.offers[k].filter(o =>
        !(o.recruiterEmail === email && o.status === 'pending')
      );

    });
  }

  saveData();

  logout();

  showAlert(
    '🗑️ Your account has been deleted.',
    'alert-success'
  );
}


/* ---------- Start up ---------- */

document.querySelectorAll('input.phone').forEach(inp =>

  inp.addEventListener('input', () => {

    inp.value = inp.value.replace(/\D/g, '').slice(0, 10);

  })

);


['rec-login', 'rec-sign'].forEach(p =>

  $(`${p}-phone`).addEventListener('input', () => {

    otpVerified[p] = null;

  })

);


// Restore the saved login after a page refresh

(function restoreSession() {

  const s = db.session;

  if (s && s.role === 'student' && currentStudent()) {

    showScreen('screen-profile');

  } else if (
    s && s.role === 'recruiter' && currentRecruiter()
  ) {

    showScreen('screen-recruiter-dash');

  } else {

    db.session = null;

    showScreen('screen-auth');

  }

})();