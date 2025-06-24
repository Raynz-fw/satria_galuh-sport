const BASE_URL = window.location.origin;

function getKategoriUsia(tanggal) {
  const date = new Date(tanggal);
  const ranges = [
    { label: "Senior", from: "2000-01-01", to: "2004-01-01" },
    { label: "Under-21", from: "2004-01-01", to: "2007-01-01" },
    { label: "Junior", from: "2007-01-01", to: "2010-01-01" },
    { label: "Kadet", from: "2010-01-01", to: "2013-01-01" },
    { label: "Pemula", from: "2013-01-01", to: "2016-01-01" },
    { label: "Pra-Pemula", from: "2016-01-01", to: "2019-01-01" },
    { label: "Usia Dini", from: "2019-01-01", to: "2021-01-01" },
    { label: "Pra-Usia Dini", from: "2021-01-01", to: "2024-01-01" }
  ];
  return ranges.find(r => date >= new Date(r.from) && date < new Date(r.to))?.label || "Lainnya";
}

function getKelasBerat(kategori, gender, berat) {
  const g = gender.toLowerCase();
  if (kategori === "Pra-Usia Dini") return "Umum";
  if (kategori === "Usia Dini") return berat < 20 ? "-20kg" : "+20kg";
  if (kategori === "Pra-Pemula") {
    if (g === "putra") return berat < 20 ? "-20kg" : berat < 25 ? "-25kg" : "+25kg";
    return berat < 20 ? "-20kg" : "+20kg";
  }
  if (kategori === "Pemula") {
    if (g === "putra") return berat < 25 ? "-25kg" : berat < 30 ? "-30kg" : berat < 35 ? "-35kg" : "+35kg";
    return berat < 25 ? "-25kg" : berat < 30 ? "-30kg" : "+30kg";
  }
  if (kategori === "Kadet") {
    if (g === "putra") return berat < 40 ? "-40kg" : berat < 45 ? "-45kg" : berat < 52 ? "-52kg" : berat < 57 ? "-57kg" : "+57kg";
    return berat < 40 ? "-40kg" : berat < 47 ? "-47kg" : "+47kg";
  }
  if (kategori === "Junior") {
    if (g === "putra") return berat < 55 ? "-55kg" : berat < 61 ? "-61kg" : berat < 68 ? "-68kg" : "+68kg";
    return berat < 48 ? "-48kg" : berat < 53 ? "-53kg" : berat < 59 ? "-59kg" : "+59kg";
  }
  if (kategori === "Under-21" || kategori === "Senior") {
    if (g === "putra") return berat < 60 ? "-60kg" : berat < 67 ? "-67kg" : berat < 75 ? "-75kg" : berat < 84 ? "-84kg" : "+84kg";
    return berat < 50 ? "-50kg" : berat < 55 ? "-55kg" : berat < 61 ? "-61kg" : berat < 68 ? "-68kg" : "+68kg";
  }
  return "Umum";
}

function generateKelasOtomatis({ tanggal_lahir, gender, pertandingan, kelas_pertandingan, berat, sabuk }) {
  const kategori = getKategoriUsia(tanggal_lahir);
  if (!tanggal_lahir || !gender || !pertandingan) return '';

  const GENDER = gender.toUpperCase();
  const upperKategori = kategori.toUpperCase();
  const upperSabuk = (sabuk || '').toUpperCase();

  if (pertandingan === 'Kumite') {
    const kelasBerat = getKelasBerat(kategori, gender, berat || 0);
    if (kelas_pertandingan === 'Festival') {
      return `FESTIVAL KUMITE ${upperKategori} ${kelasBerat.toUpperCase()} ${GENDER}`;
    } else {
      return `KUMITE ${upperKategori} ${kelasBerat.toUpperCase()} ${GENDER}`;
    }
  }

  if (pertandingan === 'Kata') {
    if (kelas_pertandingan === 'Festival') {
      return `FESTIVAL KATA PERORANGAN ${upperKategori} SABUK ${upperSabuk} ${GENDER}`;
    } else {
      return `KATA PERORANGAN ${upperKategori} ${GENDER}`;
    }
  }

  if (pertandingan === 'Kata Beregu') {
    if (kelas_pertandingan === 'Festival') {
      return `FESTIVAL KATA BEREGU ${upperKategori} SABUK ${upperSabuk} ${GENDER}`;
    } else {
      return `KATA BEREGU ${upperKategori} ${GENDER}`;
    }
  }

  return '';
}

function getFormData(formId) {
  const form = document.getElementById(formId);
  const kelas_pertandingan = form.querySelector('#kelas_pertandingan')?.value || '';
  const nama = form.querySelector('#nama')?.value.trim();
  const tanggal_lahir = form.querySelector('#tanggal_lahir')?.value.trim();
  const gender = form.querySelector('#gender')?.value || '';
  const club = form.querySelector('#club')?.value.trim();
  const perguruan = form.querySelector('#perguruan')?.value.trim() || '';
  const pertandingan = form.querySelector('input[name="pertandingan"]:checked')?.value || '';
  const sabuk = form.querySelector('#sabuk')?.value || '';
  const berat = parseFloat(form.querySelector('#berat')?.value || '0');
  const beregu = form.querySelector('#beregu')?.value || '';

  const kelas_otomatis = generateKelasOtomatis({ tanggal_lahir, gender, pertandingan, kelas_pertandingan, berat, sabuk });

  return {
    nama,
    tanggal_lahir,
    gender,
    club,
    perguruan,
    pertandingan,
    sabuk,
    berat,
    beregu,
    "Kelas Pertandingan": kelas_pertandingan,
    "Kelas": kelas_otomatis
  };
}

function showError(form, id, message) {
  const input = form.querySelector(`#${id}`);
  const errorEl = form.querySelector(`#${id}Error`);
  if (errorEl) errorEl.textContent = message;
  if (input) input.classList.add('is-invalid');
}

function clearErrors(form) {
  form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  form.querySelectorAll('small.text-danger').forEach(el => el.textContent = '');
}

function validateForm(formId) {
  const form = document.getElementById(formId);
  clearErrors(form);
  const data = getFormData(formId);
  let valid = true;

  if (!data.nama) { showError(form, 'nama', 'Nama wajib diisi'); valid = false; }
  if (!data.tanggal_lahir) { showError(form, 'tanggal_lahir', 'Tanggal lahir wajib diisi'); valid = false; }
  if (!data.gender) { showError(form, 'gender', 'Jenis kelamin wajib dipilih'); valid = false; }
  if (!data.club) { showError(form, 'club', 'Nama club wajib diisi'); valid = false; }
  if (!data.perguruan) { showError(form, 'perguruan', 'Perguruan wajib diisi'); valid = false; }

  if (!data.pertandingan) {
    const err = form.querySelector('#pertandinganError');
    if (err) err.textContent = 'Harap pilih jenis pertandingan';
    valid = false;
  }

  const isFestival = data["Kelas Pertandingan"] === "Festival";
  if (isFestival && !data.sabuk && data.pertandingan !== "Kumite") {
    showError(form, 'sabuk', 'Sabuk wajib dipilih'); valid = false;
  }

  if (data.pertandingan === 'Kumite' && !data.berat) {
    showError(form, 'berat', 'Berat badan wajib diisi'); valid = false;
  }

  if (data.pertandingan === 'Kata Beregu' && !data.beregu) {
    showError(form, 'beregu', 'Nama tim beregu wajib diisi'); valid = false;
  }

  return valid ? data : null;
}

function previewData(data, callback) {
  const {
    nama, tanggal_lahir, gender, club, perguruan, pertandingan,
    sabuk, berat, beregu, Kelas
  } = data;

  let html = `<ul style='text-align:left;'>`
    + `<li><b>Nama:</b> ${nama}</li>`
    + `<li><b>Tanggal Lahir:</b> ${tanggal_lahir}</li>`
    + `<li><b>Jenis Kelamin:</b> ${gender}</li>`
    + `<li><b>Dojo:</b> ${club}</li>`
    + `<li><b>Perguruan:</b> ${perguruan}</li>`
    + `<li><b>Jenis Pertandingan:</b> ${pertandingan}</li>`;
  if (sabuk) html += `<li><b>Sabuk:</b> ${sabuk}</li>`;
  if (berat) html += `<li><b>Berat:</b> ${berat} kg</li>`;
  if (beregu) html += `<li><b>Nama Tim Beregu:</b> ${beregu}</li>`;
  if (Kelas) html += `<li><b>Kelas:</b> <b>${Kelas}</b></li>`;
  html += `</ul>`;

  Swal.fire({
    title: 'Konfirmasi Data',
    html,
    icon: 'info',
    showCancelButton: true,
    confirmButtonText: 'Kirim',
    cancelButtonText: 'Batal'
  }).then(result => {
    if (result.isConfirmed) {
      callback();
    }
  });
}

function kirimData(data, formId) {
  const form = document.getElementById(formId);
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  fetch(`${BASE_URL}/daftar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(async res => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Terjadi kesalahan saat mengirim data.');
      }
      return res.json();
    })
    .then(resJson => {
      Swal.fire('Berhasil!', resJson.message || 'Data berhasil dikirim.', 'success');
      form.reset();
    })
    .catch(err => {
      Swal.fire('Gagal!', err.message || 'Terjadi kesalahan saat mengirim data.', 'error');
    })
    .finally(() => {
      if (submitBtn) submitBtn.disabled = false;
    });
}

['formFestival', 'formPrestasi'].forEach(formId => {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = validateForm(formId);
    if (data) {
      previewData(data, () => kirimData(data, formId));
    }
  });
});
