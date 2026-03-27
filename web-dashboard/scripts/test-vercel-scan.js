const https = require('https');

const data = JSON.stringify({
    // 1x1 pixel transparent gif base64
    image: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    latitude: -6.200000,
    longitude: 106.816666,
});

const options = {
    hostname: 'kacc-hris-ggvc.vercel.app',
    port: 443,
    path: '/api/attendance/scan',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
    },
};

console.log("Sending request to Vercel...");
const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        body += chunk;
    });
    res.on('end', () => {
        console.log('BODY:', body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
