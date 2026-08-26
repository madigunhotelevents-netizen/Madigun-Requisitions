import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Serve static assets from the compiled React build folder 'dist'
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback all routes to index.html for Single Page Application (SPA) client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Helper to retrieve local IPv4 addresses for easy LAN/device sharing
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const netInterface of interfaces[name] || []) {
      // Filter only IPv4 addresses that are not loopback (internal)
      if (netInterface.family === 'IPv4' && !netInterface.internal) {
        addresses.push(netInterface.address);
      }
    }
  }
  return addresses;
}

app.listen(PORT, HOST, () => {
  console.log('===================================================');
  console.log('   MADIGUN HOTEL ELEVEN - OFFLINE SERVICE         ');
  console.log('===================================================');
  console.log(`Local Access URL:  http://localhost:${PORT}`);
  
  const localIps = getLocalIpAddresses();
  if (localIps.length > 0) {
    console.log('\nLAN / Wi-Fi Device Access URLs:');
    localIps.forEach(ip => {
      console.log(`   --> http://${ip}:${PORT}`);
    });
    console.log('\nTip: Open any of the above links on your phones, tablets, or other PCs');
    console.log('     connected to the same Wi-Fi/local network to access the system!');
  } else {
    console.log('\nLAN Access: Connect other devices to the same network and use');
    console.log('            your computer\'s Local IP address.');
  }
  console.log('===================================================');
  console.log(`Status: Active & serving from /dist`);
  console.log('Managed via PM2 (Process Manager 2)');
  console.log('===================================================');
});
