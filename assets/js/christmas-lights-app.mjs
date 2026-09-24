import { calculateLinearLights, calculateTreeLights, calculateTrunkLights } from '/assets/js/christmas-lights-core.mjs';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let mode = 'tree';
$$('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    mode = button.dataset.mode;
    $$('[data-mode]').forEach((b) => b.classList.toggle('active', b === button));
    $$('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== mode; });
    render();
  });
});
$$('input,select').forEach((el) => el.addEventListener('input', render));
function common() {
  return { strandLengthFeet: $('#strandLength').value, lightsPerStrand: $('#lightsPerStrand').value, bufferPercent: $('#buffer').value };
}
function formatFeet(v) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(v)} ft`;
}
function render() {
  try {
    let r;
    if (mode === 'tree') {
      r = calculateTreeLights({ heightFeet: $('#treeHeight').value, baseDiameterFeet: $('#treeDiameter').value, wrapSpacingInches: $('#treeSpacing').value, ...common() });
      $('#method').textContent = `Approx. ${r.turns} spiral wraps around a cone-shaped tree.`;
    } else if (mode === 'linear') {
      r = calculateLinearLights({ lengthFeet: $('#runLength').value, coverageMultiplier: $('#coverageMultiplier').value, ...common() });
      $('#method').textContent = `${r.measuredLength} ft measured × ${r.coverageMultiplier} coverage multiplier.`;
    } else {
      r = calculateTrunkLights({ heightFeet: $('#trunkHeight').value, diameterInches: $('#trunkDiameter').value, wrapSpacingInches: $('#trunkSpacing').value, ...common() });
      $('#method').textContent = `Approx. ${r.turns} spiral wraps around a constant-diameter trunk or column.`;
    }
    $('#error').textContent = '';
    $('#results').hidden = false;
    $('#requiredLength').textContent = formatFeet(r.bufferedLength);
    $('#strands').textContent = r.strands.toLocaleString();
    $('#totalLights').textContent = r.totalLights.toLocaleString();
    $('#purchasedLength').textContent = formatFeet(r.purchasedLength);
    $('#spareLength').textContent = formatFeet(r.spareLength);
  } catch (e) {
    $('#results').hidden = true;
    $('#error').textContent = e.message;
  }
}
render();
