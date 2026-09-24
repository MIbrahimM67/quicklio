function positive(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw Error(`${label} must be greater than zero.`);
  return n;
}
function percent(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 200) throw Error('Buffer must be between 0% and 200%.');
  return n / 100;
}
export function calculatePurchase(requiredLengthFeet, strandLengthFeet, lightsPerStrand, bufferPercent = 10) {
  const baseLength = positive(requiredLengthFeet, 'Required length');
  const strandLength = positive(strandLengthFeet, 'Strand length');
  const lights = positive(lightsPerStrand, 'Lights per strand');
  const bufferedLength = baseLength * (1 + percent(bufferPercent));
  const strands = Math.ceil(bufferedLength / strandLength);
  const purchasedLength = strands * strandLength;
  return { baseLength, bufferedLength, strands, purchasedLength, spareLength: Math.max(0, purchasedLength - baseLength), totalLights: Math.round(strands * lights) };
}
export function calculateLinearLights({ lengthFeet, coverageMultiplier = 1, strandLengthFeet, lightsPerStrand, bufferPercent = 10 }) {
  const length = positive(lengthFeet, 'Measured length');
  const multiplier = positive(coverageMultiplier, 'Coverage multiplier');
  const purchase = calculatePurchase(length * multiplier, strandLengthFeet, lightsPerStrand, bufferPercent);
  return { ...purchase, measuredLength: length, coverageMultiplier: multiplier };
}
export function calculateTrunkLights({ heightFeet, diameterInches, wrapSpacingInches, strandLengthFeet, lightsPerStrand, bufferPercent = 10 }) {
  const height = positive(heightFeet, 'Height');
  const diameterFt = positive(diameterInches, 'Diameter') / 12;
  const spacingFt = positive(wrapSpacingInches, 'Wrap spacing') / 12;
  const turns = Math.max(1, Math.ceil(height / spacingFt));
  const risePerTurn = height / turns;
  const circumference = Math.PI * diameterFt;
  const pathPerTurn = Math.sqrt(circumference ** 2 + risePerTurn ** 2);
  const purchase = calculatePurchase(pathPerTurn * turns, strandLengthFeet, lightsPerStrand, bufferPercent);
  return { ...purchase, turns, circumference, risePerTurn };
}
export function calculateTreeLights({ heightFeet, baseDiameterFeet, wrapSpacingInches, strandLengthFeet, lightsPerStrand, bufferPercent = 10 }) {
  const height = positive(heightFeet, 'Tree height');
  const diameter = positive(baseDiameterFeet, 'Base diameter');
  const spacingFt = positive(wrapSpacingInches, 'Vertical wrap spacing') / 12;
  const turns = Math.max(1, Math.ceil(height / spacingFt));
  const risePerTurn = height / turns;
  let path = 0;
  for (let i = 0; i < turns; i++) {
    const midpointHeight = (i + 0.5) * risePerTurn;
    const fractionRemaining = Math.max(0, 1 - midpointHeight / height);
    const localDiameter = diameter * fractionRemaining;
    const circumference = Math.PI * localDiameter;
    path += Math.sqrt(circumference ** 2 + risePerTurn ** 2);
  }
  const purchase = calculatePurchase(path, strandLengthFeet, lightsPerStrand, bufferPercent);
  return { ...purchase, turns, risePerTurn };
}
