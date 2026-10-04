import { calculateElectricalLoad, calculateTreeLights } from '/assets/js/christmas-lights-core.mjs';

function addStyle() {
  if (document.querySelector('link[data-seasonal-opportunity-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/assets/css/seasonal-opportunity.css';
  link.dataset.seasonalOpportunityStyle = 'true';
  document.head.append(link);
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

function number(value, digits = 1) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

function addMeta(property, content) {
  if (document.head.querySelector(`meta[property="${property}"]`)) return;
  const meta = document.createElement('meta');
  meta.setAttribute('property', property);
  meta.content = content;
  document.head.append(meta);
}

function ensureSocialMeta() {
  const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
  const description = document.querySelector('meta[name="description"]')?.content || '';
  addMeta('og:title', document.title);
  addMeta('og:description', description);
  addMeta('og:url', canonical);
  addMeta('og:type', 'website');
  addMeta('og:image', 'https://quicklio.app/assets/brand/quicklio-favicon.png');
}

function buildReferenceRows() {
  const heights = [4, 5, 6, 7, 7.5, 8, 9, 10];
  return heights.map((height) => {
    const result = calculateTreeLights({
      heightFeet: height,
      baseDiameterFeet: height * 0.6,
      wrapSpacingInches: 8,
      strandLengthFeet: 25,
      lightsPerStrand: 100,
      bufferPercent: 10
    });
    return `<tr><td>${height} ft</td><td>${result.strands}</td><td>${result.totalLights.toLocaleString()}</td><td>${number(result.bufferedLength)} ft</td></tr>`;
  }).join('');
}

function enhanceChristmas() {
  addStyle();
  ensureSocialMeta();
  const workbench = document.querySelector('.tool-workbench');
  if (!workbench || document.querySelector('[data-christmas-opportunity]')) return;
  const section = document.createElement('section');
  section.className = 'shell seasonal-opportunity';
  section.dataset.christmasOpportunity = 'true';
  section.innerHTML = `
    <div class="seasonal-opportunity-grid">
      <article class="seasonal-card">
        <p class="seasonal-kicker">Quick reference</p>
        <h2>Christmas tree light count chart</h2>
        <p>This chart uses the same cone-and-spiral method as the calculator above. It assumes an 8-inch vertical wrap spacing, a base diameter about 60% of tree height, 25-foot strings with 100 lights each, and a 10% buffer. Use your own measurements above for a better estimate.</p>
        <div class="seasonal-table-wrap"><table class="seasonal-table"><thead><tr><th>Tree height</th><th>100-light strings</th><th>Approx. lights</th><th>Lighted length incl. buffer</th></tr></thead><tbody>${buildReferenceRows()}</tbody></table></div>
        <p class="seasonal-note">A denser wrap, wider tree, shorter string, or extra garland-like passes can increase the total. The chart is a planning reference, not a universal decorating rule.</p>
      </article>
      <article class="seasonal-card" data-wattage-card>
        <p class="seasonal-kicker">Electrical planning</p>
        <h2>Christmas light wattage calculator</h2>
        <p>Enter the wattage printed on the light-string package. Quicklio does not assume that all LED or incandescent strings use the same power.</p>
        <div class="seasonal-form-grid">
          <label><span>Strings</span><input id="seoStrings" type="number" min="1" step="1" value="1"></label>
          <label><span>Watts per string</span><input id="seoWattsPerString" type="number" min="0.1" step="0.1" value="5"></label>
          <label><span>Hours per day</span><input id="seoHoursPerDay" type="number" min="0" step="0.5" value="6"></label>
          <label><span>Days used</span><input id="seoDays" type="number" min="0" step="1" value="30"></label>
          <label><span>Electricity rate ($/kWh)</span><input id="seoRate" type="number" min="0" step="0.01" value="0.17"></label>
        </div>
        <div class="seasonal-result-grid">
          <div><span>Total load</span><strong id="seoTotalWatts">—</strong></div>
          <div><span>Energy use</span><strong id="seoKwh">—</strong></div>
          <div><span>Estimated energy cost</span><strong id="seoCost">—</strong></div>
        </div>
        <p class="seasonal-note">The default electricity rate is only an editable example. Use your local utility rate and the actual package wattage for a meaningful estimate. Follow the manufacturer’s connection limits and outdoor-use instructions.</p>
      </article>
    </div>
    <article class="seasonal-card seasonal-copy-card">
      <h2>How many Christmas lights do I need?</h2>
      <p>For a tree, the answer depends on height, base width, how tightly you spiral the lights, the lighted length of each string, and how many bulbs are on that string. Two trees with the same height can need very different amounts if one is much wider or wrapped more densely. That is why the calculator above uses measurements instead of a single lights-per-foot rule.</p>
      <p>For rooflines, fences, and railings, measure the path you actually plan to cover. For trunks and columns, measure the wrapped height, diameter, and spacing between turns. Add a small buffer so you are not left short at corners, plugs, or the final wrap.</p>
    </article>`;
  workbench.insertAdjacentElement('afterend', section);

  const strings = section.querySelector('#seoStrings');
  const watts = section.querySelector('#seoWattsPerString');
  const hours = section.querySelector('#seoHoursPerDay');
  const days = section.querySelector('#seoDays');
  const rate = section.querySelector('#seoRate');
  const totalWatts = section.querySelector('#seoTotalWatts');
  const kwh = section.querySelector('#seoKwh');
  const cost = section.querySelector('#seoCost');
  const existingStrands = document.querySelector('#strands');

  const syncStrings = () => {
    const value = Number(String(existingStrands?.textContent || '').replace(/[^0-9.]/g, ''));
    if (Number.isFinite(value) && value > 0) strings.value = String(value);
    renderLoad();
  };
  const renderLoad = () => {
    try {
      const result = calculateElectricalLoad({
        strings: strings.value,
        wattsPerString: watts.value,
        hoursPerDay: hours.value,
        days: days.value,
        electricityRatePerKwh: rate.value
      });
      totalWatts.textContent = `${number(result.totalWatts)} W`;
      kwh.textContent = `${number(result.totalKwh, 2)} kWh`;
      cost.textContent = money(result.estimatedCost);
    } catch {
      totalWatts.textContent = '—';
      kwh.textContent = '—';
      cost.textContent = '—';
    }
  };
  [strings, watts, hours, days, rate].forEach((input) => input.addEventListener('input', renderLoad));
  if (existingStrands) new MutationObserver(syncStrings).observe(existingStrands, { childList: true, characterData: true, subtree: true });
  syncStrings();
}

function setControl(id, value) {
  const element = document.getElementById(id);
  if (!element) return;
  element.value = String(value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function enhancePumpkin() {
  addStyle();
  ensureSocialMeta();
  const threshold = document.getElementById('threshold');
  const controls = threshold?.closest('.section-block');
  const workbench = document.querySelector('.tool-workbench');
  if (!threshold || !controls || !workbench || document.querySelector('[data-pumpkin-opportunity]')) return;

  const presets = document.createElement('div');
  presets.className = 'seasonal-presets';
  presets.innerHTML = `<span>Quick starting points</span><div><button type="button" data-pumpkin-preset="easy">Easy to carve</button><button type="button" data-pumpkin-preset="balanced">Balanced</button><button type="button" data-pumpkin-preset="detailed">More detail</button></div><small>These presets only set the existing controls. You can fine-tune every slider afterward.</small>`;
  controls.querySelector('h2')?.insertAdjacentElement('afterend', presets);

  const values = {
    easy: { threshold: 138, contrast: 75, blur: 2.4, tones: 2 },
    balanced: { threshold: 128, contrast: 45, blur: 1.2, tones: 2 },
    detailed: { threshold: 120, contrast: 25, blur: 0.6, tones: 3 }
  };
  presets.querySelectorAll('[data-pumpkin-preset]').forEach((button) => button.addEventListener('click', () => {
    const preset = values[button.dataset.pumpkinPreset];
    Object.entries(preset).forEach(([id, value]) => setControl(id, value));
    presets.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
  }));

  const section = document.createElement('section');
  section.className = 'shell seasonal-opportunity';
  section.dataset.pumpkinOpportunity = 'true';
  section.innerHTML = `
    <div class="seasonal-opportunity-grid">
      <article class="seasonal-card">
        <p class="seasonal-kicker">Carving workflow</p>
        <h2>Make a pumpkin carving stencil that is easier to cut</h2>
        <ol class="seasonal-steps"><li>Start with a photo that has a clear subject and simple background.</li><li>Use 2-tone mode for the simplest carve.</li><li>Increase contrast to separate the important shapes.</li><li>Increase smoothing when tiny details create fragile cuts.</li><li>Print close to the real pumpkin face size before judging whether a feature is practical.</li></ol>
      </article>
      <article class="seasonal-card">
        <p class="seasonal-kicker">Need structural checks?</p>
        <h2>Check islands and add bridges</h2>
        <p>A black-and-white image can still fail as a physical stencil if enclosed pieces would fall out. Quicklio’s advanced stencil tool can detect floating islands and add bridges before you print or cut.</p>
        <p><a class="button primary" href="/en/crafts/stencil-maker/">Open Advanced Stencil Maker</a></p>
        <p class="seasonal-note"><a href="/guides/stencil-islands-bridges/">Read the stencil islands & bridges guide</a> to understand why centers of letters, eyes, and enclosed shapes may need connectors.</p>
      </article>
    </div>
    <article class="seasonal-card seasonal-copy-card">
      <h2>Photo to pumpkin carving stencil</h2>
      <p>The best pumpkin stencil is usually simpler than the source photo. Threshold controls which tones become light or dark, contrast separates the subject from the background, and smoothing removes small texture that would be frustrating to carve. Use the preview at the intended print size rather than judging only from a zoomed-in screen.</p>
    </article>`;
  workbench.insertAdjacentElement('afterend', section);
}

const path = location.pathname.replace(/\/+$/, '/') || '/';
if (path === '/en/christmas/christmas-lights-calculator/') enhanceChristmas();
if (path === '/en/halloween/pumpkin-stencil-maker/') enhancePumpkin();
