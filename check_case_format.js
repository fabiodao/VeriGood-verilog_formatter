const fs = require('fs');

// Check case statements Test 1
console.log('\n=== Case Statements Test 1 ===');
const caseExp = fs.readFileSync('tests/expected/04_case_statements.v', 'utf8').split('\n');
for (let i = 6; i <= 9; i++) {
  const line = caseExp[i];
  const colonPos = line.indexOf(':');
  const eqPos = line.indexOf('=');
  console.log(`Line ${i+1}: colon@${colonPos}, =@${eqPos}`);
  console.log(`  "${line.replace(/ /g, '·')}"`);
}

// Check always blocks Test 5
console.log('\n=== Always Blocks Test 5 ===');
const alwaysExp = fs.readFileSync('tests/expected/03_always_blocks.v', 'utf8').split('\n');
for (let i = 31; i <= 34; i++) {
  const line = alwaysExp[i];
  const colonPos = line.indexOf(':');
  const eqPos = line.indexOf('=');
  console.log(`Line ${i+1}: colon@${colonPos}, =@${eqPos}`);
  console.log(`  "${line.replace(/ /g, '·')}"`);
}
