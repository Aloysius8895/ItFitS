/* =========================================================
   FLOWFIT — Personal Fit Intelligence
   Existing modal experience + real FastAPI integration.
   The visual system and interaction model remain unchanged.
   ========================================================= */

const modal = document.querySelector('#modal');
const body = document.querySelector('#modal-body');
let returnFocus;

const API_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000'
    : '';

const stories = [
  {
    title: 'Beyond the size on the label.',
    text: 'A clothing size is a starting point, not a universal standard. FLOWFIT goes one step further by using historical fashion-fit patterns to estimate how a selected size is likely to fit your profile.'
  },
  {
    title: 'Made for your proportions.',
    text: 'Good fit is about more than a number on a label. FLOWFIT combines profile characteristics, garment category, current size and historical fit outcomes to produce a more personal fit signal.'
  },
  {
    title: 'Less guesswork. More you.',
    text: 'FLOWFIT turns a few profile details into a data-driven fit recommendation. The result is a predictive signal, not a guarantee — but it gives you a smarter starting point before choosing a size.'
  }
];

function show(content) {
  returnFocus = document.activeElement;
  body.innerHTML = content;
  if (!modal.open) modal.showModal();
}

function option(value, label, selected = false) {
  return `<option value="${escapeHTML(value)}"${selected ? ' selected' : ''}>${escapeHTML(label)}</option>`;
}

function field(label, name, control, extraClass = '') {
  return `<label class="flow-field ${extraClass}" data-field="${escapeHTML(name)}"><span>${escapeHTML(label)}</span>${control}</label>`;
}

function input(name, value, type = 'text', attrs = '') {
  return `<input type="${type}" name="${escapeHTML(name)}" value="${escapeHTML(value)}" ${attrs} required>`;
}

function select(name, options, selected = '') {
  return `<select name="${escapeHTML(name)}" required>${options.map(item => option(item[0], item[1], item[0] === selected)).join('')}</select>`;
}

function showError(message) {
  const safe = escapeHTML(message || 'Something went wrong. Please try again.');
  show(`
    <div class="eyebrow">FLOWFIT INTELLIGENCE</div>
    <h2>We couldn't complete the analysis.</h2>
    <div class="api-error">
      <strong>CONNECTION CHECK</strong>
      <p>${safe}</p>
      <p>Make sure the FLOWFIT FastAPI backend is running on port 8000, then try again.</p>
    </div>
    <button class="cta cta-outline" data-action="fit">TRY AGAIN →</button>
  `);
}

function openFit() {
  show(`
    <div class="eyebrow">YOUR PERSONAL FIT PROFILE</div>
    <h2>Let's find your fit.</h2>
    <p class="dialog-subtitle">A few profile details. A more personal fit signal.</p>

    <form class="fit-form" id="fit-form" novalidate>
      ${field('Age', 'age', input('age', 22, 'number', 'min="13" max="100" step="1" placeholder="22"'))}
      ${field('Height (cm)', 'height', input('height', 165, 'number', 'min="120" max="230" step="0.1" placeholder="165"'))}
      ${field('Weight (kg)', 'weight', input('weight', 58, 'number', 'min="30" max="250" step="0.1" placeholder="58"'))}
      ${field('Body type', 'body_type', select('body_type', [
        ['hourglass', 'Hourglass'],
        ['pear', 'Pear'],
        ['apple', 'Apple'],
        ['rectangle', 'Rectangle'],
        ['athletic', 'Athletic'],
        ['full bust', 'Full Bust'],
        ['straight & narrow', 'Straight & Narrow']
      ], 'hourglass'))}
      ${field('Bust size', 'bust_size', input('bust_size', '34b', 'text', 'placeholder="34b"'))}
      ${field('Garment category', 'category', select('category', [
        ['dress', 'Dress'],
        ['gown', 'Gown'],
        ['top', 'Top'],
        ['shirt', 'Shirt'],
        ['blouse', 'Blouse'],
        ['skirt', 'Skirt'],
        ['pants', 'Pants'],
        ['jeans', 'Jeans'],
        ['jumpsuit', 'Jumpsuit'],
        ['romper', 'Romper'],
        ['sweater', 'Sweater'],
        ['coat', 'Coat'],
        ['jacket', 'Jacket']
      ], 'dress'))}
      ${field('Current size', 'size', input('size', 8, 'number', 'min="0" max="30" step="1" placeholder="8"'))}
      ${field('Rating', 'rating', select('rating', [
        ['5', '5 — Excellent'],
        ['4', '4 — Good'],
        ['3', '3 — Average'],
        ['2', '2 — Poor'],
        ['1', '1 — Very Poor']
      ], '5'))}
      ${field('Rented for', 'rented_for', select('rented_for', [
        ['wedding', 'Wedding'],
        ['party', 'Party'],
        ['formal affair', 'Formal Affair'],
        ['work', 'Work'],
        ['everyday', 'Everyday'],
        ['date', 'Date'],
        ['vacation', 'Vacation'],
        ['other', 'Other']
      ], 'party'), 'full-span')}

      <div class="measure-guide full-span">
        <div class="eyebrow">FLOWFIT FIT INTELLIGENCE</div>
        <p>These inputs match the features used by the trained FLOWFIT pipeline. Your information is sent to the prediction API only when you submit the analysis.</p>
      </div>

      <p class="form-note full-span">Historical fashion-fit prediction · No guarantee of garment fit or returns.</p>
      <button class="cta full-span" type="submit">ANALYZE MY FIT →</button>
    </form>
  `);

  const form = document.querySelector('#fit-form');
  form.addEventListener('input', () => clearFieldErrors(form));
  form.addEventListener('change', () => clearFieldErrors(form));
  form.addEventListener('submit', submitFit);
}

function validateForm(form) {
  let valid = true;
  const fields = ['age', 'height', 'weight', 'body_type', 'bust_size', 'category', 'size', 'rating', 'rented_for'];

  fields.forEach(name => {
    const control = form.elements[name];
    const wrapper = form.querySelector(`[data-field="${name}"]`);
    if (!control || !wrapper) return;

    let error = '';
    if (!String(control.value).trim()) error = 'Required.';

    if (!error && ['age', 'height', 'weight', 'size', 'rating'].includes(name)) {
      const value = Number(control.value);
      const ranges = {
        age: [13, 100],
        height: [120, 230],
        weight: [30, 250],
        size: [0, 30],
        rating: [1, 5]
      };
      const [min, max] = ranges[name];
      if (Number.isNaN(value) || value < min || value > max) {
        error = `Expected ${min}–${max}.`;
      }
    }

    wrapper.classList.toggle('field-invalid', Boolean(error));
    const old = wrapper.querySelector('.field-flag');
    if (old) old.remove();
    if (error) {
      wrapper.insertAdjacentHTML('beforeend', `<span class="field-flag">${escapeHTML(error)}</span>`);
      valid = false;
    }
  });

  return valid;
}

function clearFieldErrors(form) {
  form.querySelectorAll('.field-invalid').forEach(el => el.classList.remove('field-invalid'));
  form.querySelectorAll('.field-flag').forEach(el => el.remove());
}

async function submitFit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!validateForm(form)) return;

  const button = form.querySelector('button[type="submit"]');
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = 'ANALYZING YOUR FIT <span class="flowfit-spinner">◌</span>';

  const data = new FormData(form);
  const payload = {
    age: Number(data.get('age')),
    height: Number(data.get('height')),
    weight: Number(data.get('weight')),
    body_type: String(data.get('body_type')).trim().toLowerCase(),
    bust_size: String(data.get('bust_size')).trim().toLowerCase(),
    category: String(data.get('category')).trim().toLowerCase(),
    size: Number(data.get('size')),
    rating: Number(data.get('rating')),
    rented_for: String(data.get('rented_for')).trim().toLowerCase()
  };

  try {
    const response = await fetch(`${API_URL}/api/fit-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = Array.isArray(result.detail)
        ? result.detail.map(item => item.msg).join(', ')
        : result.detail;
      throw new Error(detail || `API request failed (${response.status})`);
    }

    renderFitResult(result, payload);
  } catch (error) {
    console.error('FLOWFIT prediction error:', error);
    showError(error.message);
  } finally {
    if (button.isConnected) {
      button.disabled = false;
      button.innerHTML = original;
    }
  }
}

function renderFitResult(result, payload) {
  const fit = String(result.fit || 'unknown').toLowerCase();
  const confidence = Number(result.confidence || 0);
  const probabilities = result.probabilities || {};
  const explanation = result.explanation;
  const guidance = result.guidance || {};

  updateHomeConfidence(fit, confidence, guidance);

  show(`
    <div class="eyebrow">AI FIT ANALYSIS</div>
    <h2>Your fit, a little clearer.</h2>

    <div class="live-fit-result">
      <div class="live-fit-hero">
        <div class="eyebrow">PREDICTED FIT</div>
        <div class="result-fit">${escapeHTML(fit.toUpperCase())}</div>
        <div class="result-confidence">${confidence.toFixed(1)}% <span>CONFIDENCE</span></div>
      </div>

      <div class="live-stat-grid">
        ${resultStat('CURRENT SIZE', result.current_size ?? payload.size)}
        ${resultStat('RECOMMENDED SIZE', result.recommended_size ?? '—')}
        ${resultStat('FIT RISK', String(result.fit_risk || '—').toUpperCase())}
      </div>

      <div class="live-detail-grid">
        <div class="live-detail-card">
          <div class="eyebrow">WHY THIS FIT</div>
          <div id="live-explanation" class="live-explanation"></div>
        </div>
        <div class="live-detail-card">
          <div class="eyebrow">FIT GUIDANCE</div>
          <h3>${escapeHTML(guidance.headline || 'Analysis complete.')}</h3>
          <p>${escapeHTML(guidance.message || 'Review the predicted fit and recommended size as a data-driven starting point.')}</p>
          ${guidance.action ? `<div class="guidance-action">${escapeHTML(guidance.action)}</div>` : ''}
        </div>
      </div>

      <div class="probability-card">
        <div class="eyebrow">FIT SIGNALS</div>
        ${probabilityRow('FIT', probabilities.fit)}
        ${probabilityRow('SMALL', probabilities.small)}
        ${probabilityRow('LARGE', probabilities.large)}
      </div>

      <p class="form-note live-disclaimer">FLOWFIT predicts historical fit patterns. Fit risk is a proxy and size guidance is heuristic; this is not a guarantee of garment fit or returns.</p>
    </div>

    <button class="cta cta-outline" data-action="fit">REFINE MY PROFILE →</button>
  `);

  renderExplanationInto(document.querySelector('#live-explanation'), explanation);
}

function resultStat(label, value) {
  return `<div class="live-stat"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`;
}

function probabilityRow(label, value) {
  let percentage = Number(value || 0);
  if (percentage <= 1) percentage *= 100;
  percentage = Math.max(0, Math.min(100, percentage));
  return `<div class="probability-row"><span>${label}</span><div class="probability-track"><i style="width:${percentage.toFixed(1)}%"></i></div><b>${percentage.toFixed(1)}%</b></div>`;
}

function renderExplanationInto(target, explanation) {
  if (!target) return;
  if (!explanation) {
    target.textContent = 'FLOWFIT generated this result from the profile and garment context you provided.';
    return;
  }

  const values = [];
  if (Array.isArray(explanation)) {
    explanation.forEach(item => values.push(String(item)));
  } else if (typeof explanation === 'object') {
    Object.entries(explanation).forEach(([key, value]) => values.push(`${formatLabel(key)}: ${value}`));
  } else {
    values.push(String(explanation));
  }

  const list = document.createElement('ul');
  values.forEach(value => {
    const li = document.createElement('li');
    li.textContent = value;
    list.appendChild(li);
  });
  target.appendChild(list);
}

function updateHomeConfidence(fit, confidence, guidance) {
  const score = document.querySelector('#live-home-confidence');
  const label = document.querySelector('#live-home-fit-label');
  const caption = document.querySelector('#live-home-fit-caption');
  if (!score || !label || !caption) return;

  score.textContent = `${confidence.toFixed(1)}%`;
  label.textContent = fit === 'fit' ? 'STRONG FIT MATCH' : `${fit.toUpperCase()} SIGNAL`;
  caption.innerHTML = '';
  const icon = document.createElement('span');
  icon.textContent = fit === 'fit' ? '✓' : '•';
  icon.className = 'live-caption-icon';
  const text = document.createElement('span');
  text.textContent = guidance?.headline || 'Your latest AI fit analysis is shown here.';
  caption.append(icon, text);
}

async function openAnalytics() {
  show(`
    <div class="eyebrow">DATA INTELLIGENCE</div>
    <h2>A more personal perspective.</h2>
    <p class="dialog-subtitle">Live dataset signals from the FLOWFIT backend.</p>
    <div class="analytics-loading">LOADING DATA INTELLIGENCE <span class="flowfit-spinner">◌</span></div>
  `);

  try {
    const response = await fetch(`${API_URL}/api/analytics`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `Analytics request failed (${response.status})`);

    const fitRows = Object.entries(data.fit_distribution || {})
      .map(([key, value]) => `<div class="analytics-row"><span>${escapeHTML(key.toUpperCase())}</span><strong>${escapeHTML(value)}</strong></div>`)
      .join('');

    const categories = Object.entries(data.top_categories || {})
      .slice(0, 5)
      .map(([key, value]) => `<div class="analytics-row"><span>${escapeHTML(key)}</span><strong>${escapeHTML(value)}</strong></div>`)
      .join('');

    show(`
      <div class="eyebrow">DATA INTELLIGENCE</div>
      <h2>A more personal perspective.</h2>
      <p class="dialog-subtitle">Live signals from the cleaned Rent the Runway dataset.</p>
      <div class="analytics-grid">
        ${analyticsStat('RECORDS', data.total_records)}
        ${analyticsStat('AVG AGE', formatNumber(data.average_age))}
        ${analyticsStat('AVG RATING', formatNumber(data.average_rating))}
        ${analyticsStat('AVG SIZE', formatNumber(data.average_size))}
      </div>
      <div class="analytics-panels">
        <div><div class="eyebrow">FIT DISTRIBUTION</div>${fitRows || '<p class="form-note">No distribution available.</p>'}</div>
        <div><div class="eyebrow">TOP CATEGORIES</div>${categories || '<p class="form-note">No category data available.</p>'}</div>
      </div>
    `);
  } catch (error) {
    console.error('FLOWFIT analytics error:', error);
    showError(error.message);
  }
}

async function openModelLab() {
  show(`
    <div class="eyebrow">MODEL LAB</div>
    <h2>Inside the intelligence.</h2>
    <p class="dialog-subtitle">Loading the trained FLOWFIT model metadata.</p>
    <div class="analytics-loading">LOADING MODEL METRICS <span class="flowfit-spinner">◌</span></div>
  `);

  try {
    const response = await fetch(`${API_URL}/api/analytics`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `Model metadata request failed (${response.status})`);

    const metadata = data.model_metadata || {};
    const metrics = metadata.results || metadata.metrics || {};
    const metricRows = Object.entries(metrics).map(([name, values]) => {
      if (typeof values !== 'object' || values === null) return '';
      const summary = Object.entries(values).slice(0, 4).map(([key, value]) => `${formatLabel(key)} ${formatNumber(value)}`).join(' · ');
      return `<div class="model-row"><span>${escapeHTML(name)}</span><strong>${escapeHTML(summary)}</strong></div>`;
    }).join('');

    show(`
      <div class="eyebrow">MODEL LAB</div>
      <h2>Inside the intelligence.</h2>
      <p class="dialog-subtitle">The live metadata returned by the FLOWFIT backend.</p>
      <div class="model-summary">
        <div class="model-chip"><span>BEST MODEL</span><strong>${escapeHTML(metadata.best_model || '—')}</strong></div>
        <div class="model-chip"><span>TARGET</span><strong>${escapeHTML(metadata.target || 'fit')}</strong></div>
      </div>
      <div class="model-metrics">${metricRows || '<p class="form-note">Model metrics are available after training metadata is generated.</p>'}</div>
    `);
  } catch (error) {
    console.error('FLOWFIT model lab error:', error);
    showError(error.message);
  }
}

function analyticsStat(label, value) {
  return `<div class="analytics-stat"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value ?? '—')}</strong></div>`;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : String(value);
}

function formatLabel(value) {
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control) return;

  const action = control.dataset.action;

  if (action === 'fit') {
    event.preventDefault();
    openFit();
    return;
  }

  if (action === 'menu') {
    const nav = document.querySelector('.nav-links');
    nav.classList.toggle('is-open');
    control.setAttribute('aria-expanded', nav.classList.contains('is-open'));
    return;
  }

  if (action === 'article') {
    const story = stories[Number(control.dataset.index)];
    if (story) {
      show(`<div class="eyebrow">FLOWFIT JOURNAL</div><h2>${escapeHTML(story.title)}</h2><p class="article-body">${escapeHTML(story.text)}</p>`);
    }
    return;
  }

  if (action === 'data') {
    event.preventDefault();
    openAnalytics();
    return;
  }

  if (action === 'lab') {
    event.preventDefault();
    openModelLab();
  }
});

document.querySelector('.modal-close').addEventListener('click', () => modal.close());

modal.addEventListener('click', event => {
  if (event.target === modal) {
    const r = modal.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close();
  }
});

modal.addEventListener('close', () => {
  body.innerHTML = '';
  if (returnFocus?.isConnected) returnFocus.focus();
});

document.querySelectorAll('.nav-links a').forEach(a =>
  a.addEventListener('click', () => document.querySelector('.nav-links').classList.remove('is-open'))
);
