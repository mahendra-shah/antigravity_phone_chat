const qrcode = require('qrcode-terminal');

const url = process.argv[2];
if (!url) {
    console.error('Usage: node qr.js <url>');
    process.exit(1);
}

qrcode.generate(url, { small: true }, function (qrcode) {
    console.log(qrcode);
});
