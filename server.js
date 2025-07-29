// server.js
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware untuk file statis
app.use(express.static(path.join(__dirname)));

// Route untuk homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'precison-steel.html'));
});

// Handle semua route untuk SPA (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'precison-steel.html'));
});

// Start server
app.listen(port, () => {
  console.log(`
  ======================================================
  🚀 Server berjalan di http://localhost:${port}
  ======================================================
  Tekan Ctrl+C untuk menghentikan server
  `);
  
  // Pesan troubleshooting
  console.log(`
  Jika terjadi error, pastikan:
  1. Telah menjalankan: npm install express
  2. File precison-steel.html ada di direktori yang sama
  3. Tidak ada aplikasi lain yang menggunakan port ${port}
  `);
});