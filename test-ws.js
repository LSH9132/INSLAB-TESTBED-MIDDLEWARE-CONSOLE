const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3011/ws/terminal/pi1');
ws.on('open', () => console.log('Connected'));
ws.on('message', data => console.log('Message:', data.toString()));
ws.on('close', () => console.log('Disconnected'));
ws.on('error', err => console.log('Error:', err));
