/* FLOWFIT — Virtual try-on page */

const API_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000'
    : '';

const $ = (selector) => document.querySelector(selector);

const form = $('#tryon-form');
const chartBody = $('#chart tbody');
const state = { personImage: null, garmentImage: null, lastRequest: null, predictionId: null, review: null };

const BASE_ROWS = [
  ['S', 84, 66, 92],
  ['M', 92, 74, 100],
  ['L', 104, 86, 112],
];

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ---------- size chart editor ---------- */

function addRow(label = '', bust = '', waist = '', hip = '') {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input name="label" value="${escapeHTML(label)}" maxlength="12" placeholder="M" aria-label="Size label"></td>
    <td><input name="bust" type="number" step="0.1" min="1" value="${escapeHTML(bust)}" aria-label="Garment bust"></td>
    <td><input name="waist" type="number" step="0.1" min="1" value="${escapeHTML(waist)}" aria-label="Garment waist"></td>
    <td><input name="hip" type="number" step="0.1" min="1" value="${escapeHTML(hip)}" aria-label="Garment hip"></td>
    <td><button type="button" class="rm" aria-label="Remove size">×</button></td>`;
  chartBody.appendChild(tr);
}

BASE_ROWS.forEach((row) => addRow(...row));
$('#add-row').addEventListener('click', () => addRow());
chartBody.addEventListener('click', (event) => {
  if (event.target.closest('.rm') && chartBody.rows.length > 1) event.target.closest('tr').remove();
});

/* ---------- images ---------- */

// Downscale before upload: keeps the request small and Gemini fast.
function readImage(file, maxSide = 1024) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image.'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function bindUpload(inputSelector, previewSelector, key) {
  $(inputSelector).addEventListener('change', async (event) => {
    const file = event.target.files[0];
    const preview = $(previewSelector);
    state[key] = null;
    preview.hidden = true;
    if (!file) return;
    try {
      state[key] = await readImage(file);
      preview.src = state[key];
      preview.hidden = false;
    } catch (error) {
      showFormError(error.message);
    }
  });
}

bindUpload('#person-file', '#person-preview', 'personImage');
bindUpload('#garment-file', '#garment-preview', 'garmentImage');

/* ---------- API ---------- */

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('Cannot reach the FLOWFIT backend. Is it running on port 8000?');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((d) => `${d.loc.slice(1).join('.')}: ${d.msg}`).join('; ')
      : data.detail;
    throw new Error(detail || `Request failed (${response.status}).`);
  }
  return data;
}

/* ---------- form -> request ---------- */

function showFormError(message) {
  const el = $('#form-error');
  el.textContent = message || '';
  el.hidden = !message;
}

function collectRequest() {
  const value = (name) => parseFloat(form.elements[name].value);
  const body = {};
  for (const key of ['age', 'height', 'weight', 'bust', 'waist', 'hip']) body[key] = value(key);

  const size_chart = [...chartBody.rows].map((tr) => {
    const get = (name) => tr.querySelector(`[name=${name}]`).value.trim();
    const num = (name) => (get(name) === '' ? null : parseFloat(get(name)));
    return { label: get('label'), bust: num('bust'), waist: num('waist'), hip: num('hip') };
  });

  return {
    body,
    garment: { category: form.elements.category.value, stretch: form.elements.stretch.value, size_chart },
  };
}

function validate(request) {
  const labels = request.garment.size_chart.map((r) => r.label);
  if (Object.values(request.body).some((v) => Number.isNaN(v))) return 'Fill in all your measurements.';
  if (labels.some((l) => !l)) return 'Every size in the chart needs a label.';
  if (new Set(labels).size !== labels.length) return 'Size labels must be unique.';
  if (!state.personImage) return 'Upload a full-body photo of yourself.';
  if (!state.garmentImage) return 'Upload a photo of the garment.';
  return '';
}

/* ---------- compare sizes ---------- */

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const request = collectRequest();
  const problem = validate(request);
  showFormError(problem);
  if (problem) return;

  const button = $('#compare-btn');
  button.disabled = true;
  button.textContent = 'ANALYSING…';
  try {
    const result = await api('/api/tryon/analyze', { method: 'POST', body: JSON.stringify(request) });
    state.lastRequest = request;
    renderComparison(result);
  } catch (error) {
    showFormError(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'COMPARE SIZES →';
  }
});

function renderComparison(result) {
  const used = result.measurements_used.join(' / ');
  $('#compare-summary').textContent =
    `Body shape read as “${result.body_type}”. Compared on ${used}. ` +
    'Ease = how much bigger (+) or smaller (−) the garment is than your body.';

  $('#sizes-table tbody').innerHTML = result.sizes.map((s) => {
    const ease = Object.entries(s.ease_pct)
      .map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}%`).join('<br>');
    const rec = s.size === result.recommended_size ? '<span class="rec">BEST MATCH</span>' : '';
    return `<tr data-size="${escapeHTML(s.size)}"${rec ? ' class="picked"' : ''}>
      <td><strong>${escapeHTML(s.size)}</strong>${rec}</td>
      <td><span class="badge ${s.level}">${escapeHTML(s.label.toUpperCase())}</span></td>
      <td class="ease">${ease}</td>
      <td><button type="button" data-try="${escapeHTML(s.size)}">TRY ON</button></td>
    </tr>`;
  }).join('');

  $('#compare-panel').hidden = false;
  $('#tryon-panel').hidden = true;
  $('#review-panel').hidden = true;
  $('#compare-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ---------- try-on ---------- */

$('#sizes-table').addEventListener('click', (event) => {
  const button = event.target.closest('[data-try]');
  if (button) tryOn(button.dataset.try, button);
});

async function tryOn(size, button) {
  const view = $('#tryon-view');
  $('#tryon-panel').hidden = false;
  $('#review-panel').hidden = true;
  view.innerHTML = `<div class="loading">GENERATING SIZE ${escapeHTML(size)} ON YOU… (10–40 s)</div>`;
  document.querySelectorAll('[data-try]').forEach((b) => { b.disabled = true; });
  $('#tryon-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  try {
    const result = await api('/api/tryon/generate', {
      method: 'POST',
      body: JSON.stringify({
        ...state.lastRequest,
        size,
        person_image: state.personImage,
        garment_image: state.garmentImage,
      }),
    });
    renderTryOn(result);
  } catch (error) {
    view.innerHTML = `<div class="notice">${escapeHTML(error.message)}</div>`;
  } finally {
    document.querySelectorAll('[data-try]').forEach((b) => { b.disabled = false; });
  }
}

const LEVEL_TEXT = {
  too_tight: 'This size will be visibly tight on you.',
  fitted: 'This size should fit you closely and cleanly.',
  relaxed: 'This size will fit with a little extra room.',
  oversize: 'This size will look oversize on you.',
};

function renderTryOn(result) {
  const a = result.assessment;
  const image = result.image
    ? `<img class="tryon-img" src="${result.image}" alt="You wearing size ${escapeHTML(a.size)}">`
    : `<img class="tryon-img" src="${state.personImage}" alt="Your photo">
       <div class="notice">${escapeHTML(result.image_error || 'No try-on image was produced.')}
       ${result.image_status === 'no_api_key' ? 'The size verdict above is still valid.' : ''}</div>`;

  const ml = a.ml
    ? `The trained model read this as “${escapeHTML(a.ml.fit)}” (${a.ml.confidence}% confidence) and nudged the ease by ${a.ml.ease_shift > 0 ? '+' : ''}${a.ml.ease_shift} points.`
    : '';

  $('#tryon-view').innerHTML = `
    <div class="verdict">
      <strong>Size ${escapeHTML(a.size)}</strong>
      <span class="badge ${a.level}">${escapeHTML(a.label.toUpperCase())}</span>
    </div>
    <p class="form-note">${LEVEL_TEXT[a.level]} ${ml}</p>
    ${image}`;

  state.predictionId = result.prediction_id;
  state.review = null;
  $('#review-panel').hidden = false;
  $('#review-msg').textContent = '';
  document.querySelectorAll('#review-choices button').forEach((b) => {
    b.disabled = false;
    b.classList.remove('on');
  });
  refreshLoop();
}

/* ---------- reviews ---------- */

$('#review-choices').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-actual]');
  if (!button || !state.predictionId) return;

  const buttons = document.querySelectorAll('#review-choices button');
  buttons.forEach((b) => { b.disabled = true; });
  button.classList.add('on');

  try {
    const result = await api('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ prediction_id: state.predictionId, actual: button.dataset.actual }),
    });
    $('#review-msg').textContent = result.retrain_triggered
      ? 'Thanks — enough reviews disagreed with FLOWFIT, so the model is retraining itself now.'
      : 'Thanks — your review was recorded.';
    renderLoop(result);
  } catch (error) {
    $('#review-msg').textContent = error.message;
    buttons.forEach((b) => { b.disabled = false; });
    button.classList.remove('on');
  }
});

function renderLoop(s) {
  const pct = Math.min(100, s.mismatch_rate * 100);
  const marker = s.mismatch_threshold * 100;
  $('#loop-status').innerHTML = `
    <span>MODEL v${s.model_version} · ${s.pending_reviews}/${s.min_reviews} reviews before the next check ·
      ${s.pending_mismatches} disagree with FLOWFIT${s.retraining ? ' · RETRAINING…' : ''}</span>
    <div class="bar" title="Disagreement rate vs retrain threshold">
      <i style="width:${pct}%"></i><b style="left:${marker}%"></b>
    </div>
    <span>Disagreement ${pct.toFixed(0)}% — retrains at ${marker.toFixed(0)}%.</span>`;
}

async function refreshLoop() {
  try {
    renderLoop(await api('/api/reviews/status'));
  } catch {
    $('#loop-status').innerHTML = '';
  }
}
