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

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// 🔄 Upload ke Google Drive
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

  const response = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id'
  });

  console.log('✅ File diupload ke Google Drive. ID:', response.data.id);
}

// 🧠 Logika Kelas Otomatis
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

  const kategoriMap = {
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

  const kelas = kategoriMap[kategori] || ['Umum'];
  return `${kelas[0]} ${G}`;
}

function buatKelasOtomatis(data) {
  const kategori = getKategoriUsia(data.tanggal_lahir);
  const jenis = data.pertandingan;
  const gender = (data.gender || '').toLowerCase() === 'putri' ? 'Putri' : 'Putra';
  const labelPrefix = data['Kelas Pertandingan'] === 'Festival' ? 'Festival ' : '';
  const berat = parseFloat(data.berat) || 0;

  if (jenis === 'Kumite') {
    const kelasBerat = getKelasKumite(kategori, gender, berat);
    return `${labelPrefix}${jenis} ${kategori} ${kelasBerat}`;
  } else {
    return `${labelPrefix}${jenis} ${kategori} ${gender}`;
  }
}

// 🧾 Inisialisasi Excel
async function initializeExcel() {
  if (fs.existsSync(EXCEL_FILE_PATH)) return;

  const workbook = new ExcelJS.Workbook();
  const createSheet = (name) => {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Nama Lengkap', key: 'nama', width: 25 },
      { header: 'Tanggal Lahir', key: 'tanggal_lahir', width: 15 },
      { header: 'Jenis Kelamin', key: 'gender', width: 15 },
      { header: 'Perguruan', key: 'perguruan', width: 20 },
      { header: 'Nama Club', key: 'club', width: 25 },
      { header: 'Sabuk', key: 'sabuk', width: 12 },
      { header: 'Berat', key: 'berat', width: 10 },
      { header: 'Nama Beregu', key: 'beregu', width: 20 },
      { header: 'Jenis Pertandingan', key: 'pertandingan', width: 18 },
      { header: 'Kelas Pertandingan', key: 'kelas', width: 20 },
      { header: 'Kelas Otomatis', key: 'kelas_otomatis', width: 30 },
      { header: 'Waktu Pendaftaran', key: 'waktu', width: 25 }
    ];
    sheet.getRow(1).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  };

  createSheet('Festival');
  createSheet('Open');
  await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
}

// 📦 Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// 🔐 Login Admin
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.admin = true;
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Username atau password salah' });
  }
});

// 🛡️ Middleware admin
function isAdmin(req, res, next) {
  if (req.session && req.session.admin) next();
  else res.status(403).send('Akses ditolak. Silakan login sebagai admin.');
}

// ✍️ Simpan Pendaftaran
app.post('/daftar', async (req, res) => {
  try {
    await initializeExcel();
    const data = req.body;
    const sheetName = data['Kelas Pertandingan'] === 'Prestasi' ? 'Open' : 'Festival';
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_FILE_PATH);
    const sheet = workbook.getWorksheet(sheetName);

    const lastRow = sheet.lastRow ? sheet.lastRow.number + 1 : 2;
    const kelasOtomatis = buatKelasOtomatis(data);

    const newRow = sheet.addRow([
      lastRow - 1,
      data.nama,
      data.tanggal_lahir,
      data.gender || '',
      data.perguruan || '',
      data.club,
      data.kelas || data.sabuk || '',
      data.berat || '',
      data.beregu || '',
      data.pertandingan,
      data['Kelas Pertandingan'],
      kelasOtomatis,
      new Date().toLocaleString('id-ID')
    ]);

    newRow.eachCell(cell => {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    await workbook.xlsx.writeFile(EXCEL_FILE_PATH);
    await uploadToGoogleDrive(EXCEL_FILE_PATH, `Data_Pendaftaran_${Date.now()}.xlsx`);
    res.json({ success: true, message: `Data berhasil ditambahkan ke sheet ${sheetName}` });
  } catch (err) {
    console.error('❌ Gagal simpan:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
});

// 📥 Unduh file Excel
app.get('/unduh-excel', isAdmin, (req, res) => {
  if (fs.existsSync(EXCEL_FILE_PATH)) {
    res.download(EXCEL_FILE_PATH);
  } else {
    res.status(404).send('File tidak ditemukan.');
  }
});

// 📖 Lihat data peserta
app.get('/api/peserta', async (req, res) => {
  try {
    await initializeExcel();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_FILE_PATH);
    const data = {};
    workbook.eachSheet(sheet => {
      const rows = [];
      sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
        if (rowIndex === 1) return;
        const obj = {};
        sheet.getRow(1).eachCell((cell, colIndex) => {
          obj[cell.value] = row.getCell(colIndex).value;
        });
        rows.push(obj);
      });
      data[sheet.name] = rows;
    });
    res.json(data);
  } catch (err) {
    console.error('❌ Gagal baca peserta:', err);
    res.status(500).json({ error: 'Gagal membaca file peserta' });
  }
});

// 🏁 Jalankan server
initializeExcel().then(() => {
  app.listen(port, () => {
    console.log(`✅ Server berjalan di http://localhost:${port}`);
  });
});
