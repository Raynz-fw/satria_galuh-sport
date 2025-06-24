// server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const EXCEL_FILE_PATH = path.join(DATA_DIR, 'Data_Pendaftaran.xlsx');
const KOMPETITOR_FILE_PATH = path.join(DATA_DIR, 'seluruh Kompetitor.xlsx');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// Fungsi Upload ke Google Drive (opsional)
async function uploadToGoogleDrive(filePath, fileName) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const drive = google.drive({ version: 'v3', auth });
  const fileMetadata = {
    name: fileName,
    parents: [process.env.GOOGLE_FOLDER_ID]
  };
  const media = {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    body: fs.createReadStream(filePath)
  };
  await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id'
  });
}

// Usia & Kelas
function getKategoriUsia(tanggalLahir) {
  const birth = new Date(tanggalLahir);
  const ranges = [
    { kategori: 'Senior', from: '2000-01-01', to: '2004-01-01' },
    { kategori: 'Under-21', from: '2004-01-01', to: '2007-01-01' },
    { kategori: 'Junior', from: '2007-01-01', to: '2010-01-01' },
    { kategori: 'Kadet', from: '2010-01-01', to: '2013-01-01' },
    { kategori: 'Pemula', from: '2013-01-01', to: '2016-01-01' },
    { kategori: 'Pra-Pemula', from: '2016-01-01', to: '2019-01-01' },
    { kategori: 'Usia Dini', from: '2019-01-01', to: '2021-01-01' },
    { kategori: 'Pra-Usia Dini', from: '2021-01-01', to: '2024-01-01' }
  ];
  return ranges.find(r => birth >= new Date(r.from) && birth < new Date(r.to))?.kategori || 'Lainnya';
}

function getKelasKumite(kategori, gender, berat) {
  const G = gender.toLowerCase() === 'putri' ? 'Putri' : 'Putra';
  const b = parseFloat(berat) || 0;
  const map = {
    'Pra-Usia Dini': [`${G}`],
    'Usia Dini': b <= 20 ? ['-20kg'] : ['+20kg'],
    'Pra-Pemula': G === 'Putra' ? (b <= 20 ? ['-20kg'] : b <= 25 ? ['-25kg'] : ['+25kg']) : (b <= 20 ? ['-20kg'] : ['+20kg']),
    'Pemula': G === 'Putra' ?
      (b <= 25 ? ['-25kg'] : b <= 30 ? ['-30kg'] : b <= 35 ? ['-35kg'] : ['+35kg']) :
      (b <= 25 ? ['-25kg'] : b <= 30 ? ['-30kg'] : ['+30kg']),
    'Kadet': G === 'Putra' ?
      (b <= 40 ? ['-40kg'] : b <= 45 ? ['-45kg'] : b <= 52 ? ['-52kg'] : b <= 57 ? ['-57kg'] : ['+57kg']) :
      (b <= 40 ? ['-40kg'] : b <= 47 ? ['-47kg'] : ['+47kg']),
    'Junior': G === 'Putra' ?
      (b <= 55 ? ['-55kg'] : b <= 61 ? ['-61kg'] : b <= 68 ? ['-68kg'] : ['+68kg']) :
      (b <= 48 ? ['-48kg'] : b <= 53 ? ['-53kg'] : b <= 59 ? ['-59kg'] : ['+59kg']),
    'Under-21': G === 'Putra' ?
      (b <= 60 ? ['-60kg'] : b <= 67 ? ['-67kg'] : b <= 75 ? ['-75kg'] : b <= 84 ? ['-84kg'] : ['+84kg']) :
      (b <= 50 ? ['-50kg'] : b <= 55 ? ['-55kg'] : b <= 61 ? ['-61kg'] : b <= 68 ? ['-68kg'] : ['+68kg']),
    'Senior': G === 'Putra' ?
      (b <= 60 ? ['-60kg'] : b <= 67 ? ['-67kg'] : b <= 75 ? ['-75kg'] : b <= 84 ? ['-84kg'] : ['+84kg']) :
      (b <= 50 ? ['-50kg'] : b <= 55 ? ['-55kg'] : b <= 61 ? ['-61kg'] : b <= 68 ? ['-68kg'] : ['+68kg'])
  };
  return `${map[kategori] || ['Umum']} ${G}`;
}

// Kelas Otomatis
function buatKelasOtomatis(data) {
  const kategori = getKategoriUsia(data.tanggal_lahir);
  const jenis = (data.pertandingan || '').toLowerCase();
  const isFestival = data['Kelas Pertandingan'] === 'Festival';
  const isBeregu = (data.beregu || '').trim() !== '';
  const sabuk = data.sabuk || '';
  const gender = (data.gender || '').toLowerCase() === 'putri' ? 'PUTRI' : 'PUTRA';
  const berat = parseFloat(data.berat) || 0;

  if (jenis === 'kumite') {
    const kelasBerat = getKelasKumite(kategori, gender, berat).toUpperCase();
    return isFestival
      ? `FESTIVAL KUMITE ${kategori.toUpperCase()} ${kelasBerat}`
      : `KUMITE ${kategori.toUpperCase()} ${kelasBerat}`;
  } else {
    const jenisKata = isBeregu ? 'KATA BEREGU' : 'KATA PERORANGAN';
    if (isFestival) {
      return `FESTIVAL ${jenisKata} ${kategori.toUpperCase()} SABUK ${sabuk.toUpperCase()} ${gender}`;
    } else {
      return `${jenisKata} ${kategori.toUpperCase()} ${gender}`;
    }
  }
}

// Format Excel
function formatHeader(sheet) {
  const row = sheet.getRow(1);
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF99' } };
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center' };
  });
  row.commit();
}

function formatIsi(sheet) {
  sheet.eachRow((row, idx) => {
    if (idx === 1) return;
    row.eachCell(cell => cell.alignment = { horizontal: 'left' });
    row.commit();
  });
}

function generateAgeCategorySheet(wb) {
  const s = wb.addWorksheet('Age Category');
  s.columns = [
    { header: 'Age Categories', width: 20 },
    { header: 'Tournament: Age Range (Year)', width: 30 },
    { header: 'Birthdate From', width: 18 },
    { header: 'Birthdate To', width: 18 },
    { header: 'Festival: Age Range (Year)', width: 30 },
    { header: 'Birthdate From', width: 18 },
    { header: 'Birthdate To', width: 18 }
  ];
  const now = new Date();
  const d = (y, m = 6, d = 24) => new Date(`${y}-${m}-${d}`);
  const data = [
    { kategori: 'BOB', range: '14-40 Year', from: d(1985), to: d(2011) },
    { kategori: 'SENIOR', range: '21-40 Year', from: d(1985), to: d(2004) },
    { kategori: 'UNDER 21', range: '18-20 Year', from: d(2005), to: d(2007) },
    { kategori: 'JUNIOR', range: '16-17 Year', from: d(2008), to: d(2009) },
    { kategori: 'KADET', range: '14-15 Year', from: d(2010), to: d(2011) },
    { kategori: 'PEMULA', range: '12-13 Year', from: d(2012), to: d(2013) },
    { kategori: 'PRA PEMULA', range: '10-11 Year', from: d(2014), to: d(2015) },
    { kategori: 'USIA DINI', range: '8-9 Year', from: d(2016), to: d(2017) },
    { kategori: 'PRA USIA DINI', range: '5-7 Year', from: d(2018), to: d(2020) },
  ];
  data.forEach(r => {
    s.addRow([
      r.kategori, r.range, r.from.toISOString().split('T')[0], r.to.toISOString().split('T')[0],
      r.range, r.from.toISOString().split('T')[0], r.to.toISOString().split('T')[0]
    ]);
  });
  formatHeader(s);
  formatIsi(s);
}

// Inisialisasi File
async function initExcelFiles() {
  const wb1 = new ExcelJS.Workbook();
  const wb2 = new ExcelJS.Workbook();

  if (!fs.existsSync(EXCEL_FILE_PATH)) {
    ['Festival', 'Open'].forEach(sheetName => {
      const s = wb1.addWorksheet(sheetName);
      s.columns = [
        { header: 'No', width: 3.5 },
        { header: 'Nama Lengkap', width: 35 },
        { header: 'Tanggal Lahir', width: 15 },
        { header: 'Jenis Kelamin', width: 15 },
        { header: 'Perguruan', width: 13 },
        { header: 'Nama Club', width: 20 },
        { header: 'Sabuk', width: 10 },
        { header: 'Berat', width: 8 },
        { header: 'Nama Beregu', width: 20 },
        { header: 'Jenis Pertandingan', width: 20 },
        { header: 'Kelas Pertandingan', width: 20 },
        { header: 'Kelas Otomatis', width: 60 },
        { header: 'Waktu Pendaftaran', width: 25 }
      ];
      formatHeader(s);
    });
    await wb1.xlsx.writeFile(EXCEL_FILE_PATH);
  }

  if (!fs.existsSync(KOMPETITOR_FILE_PATH)) {
    const s = wb2.addWorksheet('Competitors');
    s.columns = [
      { header: 'Nama Lengkap', width: 35 },
      { header: 'Perguruan', width: 15 },
      { header: 'Nama Club', width: 25 },
      { header: 'Gender', width: 15 },
      { header: 'Tanggal Lahir', width: 15 },
      { header: 'Country', width: 15 },
      { header: 'Berat Badan (kg)', width: 20 },
      { header: 'Prestasi/Age Category', width: 60 },
      { header: 'Festival/Age Category', width: 60 }
    ];
    formatHeader(s);
    generateAgeCategorySheet(wb2);
    await wb2.xlsx.writeFile(KOMPETITOR_FILE_PATH);
  }
}

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(express.static('public'));

// Daftar
app.post('/daftar', async (req, res) => {
  try {
    await initExcelFiles();
    const data = req.body;
    const waktu = new Date().toLocaleString('id-ID');
    const kelasOtomatis = buatKelasOtomatis(data);
    const sheetName = data['Kelas Pertandingan'] === 'Prestasi' ? 'Open' : 'Festival';

    const wb1 = new ExcelJS.Workbook();
    await wb1.xlsx.readFile(EXCEL_FILE_PATH);
    const s1 = wb1.getWorksheet(sheetName);
    const row1 = s1.addRow([
      s1.rowCount, data.nama, data.tanggal_lahir, data.gender,
      data.perguruan, data.club, data.sabuk, data.berat,
      data.beregu || '', data.pertandingan, data['Kelas Pertandingan'],
      kelasOtomatis, waktu
    ]);
    row1.getCell(12).font = { bold: true };
    row1.eachCell(c => c.alignment = { horizontal: 'left' });
    await wb1.xlsx.writeFile(EXCEL_FILE_PATH);

    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.readFile(KOMPETITOR_FILE_PATH);
    const s2 = wb2.getWorksheet('Competitors');
    const row2 = s2.addRow([
      data.nama, data.perguruan, data.club, data.gender,
      data.tanggal_lahir, data.negara || 'Indonesia', data.berat,
      data['Kelas Pertandingan'] === 'Prestasi' ? kelasOtomatis : '',
      data['Kelas Pertandingan'] === 'Festival' ? kelasOtomatis : ''
    ]);
    row2.getCell(8).font = { bold: true };
    row2.getCell(9).font = { bold: true };
    row2.eachCell(c => c.alignment = { horizontal: 'left' });
    await wb2.xlsx.writeFile(KOMPETITOR_FILE_PATH);

    res.json({ success: true });
  } catch (err) {
    console.error('❌ ERROR DAFTAR:', err);
    res.status(500).json({ success: false });
  }
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

// Unduh Excel
app.get('/unduh-excel', (req, res) => {
  if (fs.existsSync(EXCEL_FILE_PATH)) {
    res.download(EXCEL_FILE_PATH);
  } else {
    res.status(404).send('File tidak ditemukan.');
  }
});

// API Peserta
app.get('/api/peserta', async (req, res) => {
  try {
    await initExcelFiles();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(EXCEL_FILE_PATH);
    const result = {};
    wb.eachSheet(sheet => {
      const rows = [];
      sheet.eachRow((row, i) => {
        if (i === 1) return;
        const obj = {};
        sheet.getRow(1).eachCell((cell, j) => {
          obj[cell.value] = row.getCell(j).value;
        });
        rows.push(obj);
      });
      result[sheet.name] = rows;
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Gagal membaca file.' });
  }
});

// Jalankan Server
initExcelFiles().then(() => {
  app.listen(port, () => {
    console.log(`✅ Server aktif di http://localhost:${port}`);
  });
});
