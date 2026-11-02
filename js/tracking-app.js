/*
 * tracking-app.js
 * Logika Vue untuk halaman tracking.html (Tracking Delivery Order).
 */

// Fungsi bantu (di luar Vue): tanggal hari ini format YYYY-MM-DD,
// sesuai format input <input type="date">. Memakai objek Date (waktu lokal).
function hariIni() {
  var d = new Date();
  var m = String(d.getMonth() + 1).padStart(2, "0"); // bulan di JS mulai dari 0
  var t = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + t;
}

// Fungsi bantu: waktu sekarang "YYYY-MM-DD HH:MM:SS" untuk riwayat perjalanan.
function waktuSekarang() {
  var d = new Date();
  return hariIni() + " " + d.toTimeString().slice(0, 8);
}

var app = new Vue({
  // Vue dipasang pada elemen <main id="app"> di tracking.html
  el: '#app',

  /* ===================== DATA ===================== */
  data: {
    // Opsi ekspedisi untuk <select>
    pengirimanList: [
      { kode: "REG", nama: "Reguler (3-5 hari)" },
      { kode: "EXP", nama: "Ekspres (1-2 hari)" }
    ],

    // Daftar paket bahan ajar; isi = kode mata kuliah di dalam paket
    paket: [
      { kode: "PAKET-UT-001", nama: "PAKET IPS Dasar", isi: ["EKMA4116", "EKMA4115"], harga: 120000 },
      { kode: "PAKET-UT-002", nama: "PAKET IPA Dasar", isi: ["BIOL4201", "FISIP4001"], harga: 140000 }
    ],

    // Data mata kuliah, dipakai untuk menampilkan judul pada detail isi paket
    stok: [
      { kode: "EKMA4116", judul: "Pengantar Manajemen", harga: 65000 },
      { kode: "EKMA4115", judul: "Pengantar Akuntansi", harga: 60000 },
      { kode: "BIOL4201", judul: "Biologi Umum (Praktikum)", harga: 80000 },
      { kode: "FISIP4001", judul: "Dasar-Dasar Sosiologi", harga: 55000 }
    ],

    // Data DO berbentuk objek: key = nomor DO, value = detail DO.
    // Menambah key baru harus lewat this.$set agar reaktif (lihat method tambah).
    tracking: {
      "DO2025-001": {
        nim: "123456789",
        nama: "Rina Wulandari",
        status: "Dalam Perjalanan",
        ekspedisi: "JNE",
        tanggalKirim: "2025-08-25",
        paket: "PAKET-UT-001",
        total: 120000,
        perjalanan: [
          { waktu: "2025-08-25 10:12:20", keterangan: "Penerimaan di Loket: TANGSEL" },
          { waktu: "2025-08-25 14:07:56", keterangan: "Tiba di Hub: JAKSEL" },
          { waktu: "2025-08-26 08:44:01", keterangan: "Diteruskan ke Kantor Tujuan" }
        ]
      }
    },

    // State pencarian: nomor = input, hasil = DO yang ditemukan, pesan = error
    cari: { nomor: "", hasil: null, pesan: "" },

    // State form DO baru; tanggal kirim default hari ini
    form: { nim: "", nama: "", ekspedisi: "", paket: "", tanggalKirim: hariIni() },

    // Pesan error validasi form
    errors: {},

    // Pesan sukses di bagian atas halaman
    notice: ""
  },

  /* ===================== COMPUTED ===================== */
  computed: {
    // Mengubah objek tracking menjadi array (agar bisa di-v-for pada tabel),
    // diurutkan berdasarkan nomor DO. Nomor DO disisipkan sebagai properti "nomor".
    daftarDO: function () {
      var self = this;
      return Object.keys(this.tracking).sort().map(function (k) {
        return Object.assign({ nomor: k }, self.tracking[k]);
      });
    },

    // Generate nomor DO otomatis: "DO" + tahun berjalan + "-" + sequence 3 digit.
    // Sequence = nomor terbesar yang sudah ada + 1, contoh DO2025-001 -> ...-002.
    nomorBaru: function () {
      var maks = 0;
      Object.keys(this.tracking).forEach(function (k) {
        var m = /^DO\d{4}-(\d+)$/.exec(k);          // ambil angka sequence
        if (m) maks = Math.max(maks, parseInt(m[1], 10));
      });
      return "DO" + new Date().getFullYear() + "-" + String(maks + 1).padStart(3, "0");
    },

    // Objek paket yang dipilih di <select>; null jika belum memilih.
    paketTerpilih: function () {
      var kode = this.form.paket;
      return this.paket.find(function (p) { return p.kode === kode; }) || null;
    },

    // Detail isi paket: ubah daftar kode (mis. "EKMA4116") menjadi data lengkap
    // (kode + judul + harga) untuk ditampilkan di bawah <select> paket.
    isiPaketDetail: function () {
      if (!this.paketTerpilih) return [];
      var self = this;
      return this.paketTerpilih.isi.map(function (kode) {
        return self.stok.find(function (s) { return s.kode === kode; }) ||
               { kode: kode, judul: "(tidak ditemukan)", harga: 0 };
      });
    },

    // Total harga diambil dari properti harga pada paket yang dipilih (0 jika belum memilih).
    totalHarga: function () {
      return this.paketTerpilih ? this.paketTerpilih.harga : 0;
    }
  },

  /* ===================== WATCH ===================== */
  watch: {
    // Watcher 1: input NIM hanya boleh angka; karakter lain langsung dibuang.
    "form.nim": function (v) {
      var angka = String(v).replace(/\D/g, "");
      if (angka !== v) this.form.nim = angka;
    },

    // Watcher 2: ketika kata kunci pencarian diubah, hasil dan pesan lama dihapus
    // agar tidak membingungkan (hasil tidak cocok dengan teks yang sedang diketik).
    "cari.nomor": function () {
      this.cari.hasil = null;
      this.cari.pesan = "";
    },

    // Watcher 3: begitu pengguna memilih paket, pesan error "Pilih paket" dihapus.
    // $delete dipakai karena key errors ditambahkan secara dinamis.
    "form.paket": function () {
      this.$delete(this.errors, "paket");
    }
  },

  /* ===================== METHODS ===================== */
  methods: {
    // Format angka ke rupiah, contoh 120000 -> "Rp 120.000"
    formatRupiah: function (n) {
      return "Rp " + Number(n).toLocaleString("id-ID");
    },

    // Mencari nama paket dari kodenya (dipakai pada hasil pencarian).
    namaPaket: function (kode) {
      var p = this.paket.find(function (x) { return x.kode === kode; });
      return p ? p.nama : "-";
    },

    // Tombol "Cari" / tekan Enter: cari DO berdasarkan nomor yang diketik.
    // Hasil disimpan di cari.hasil, atau pesan error di cari.pesan.
    cariDO: function () {
      var nomor = this.cari.nomor.toUpperCase();
      var data = this.tracking[nomor];
      if (!nomor) {
        this.cari.pesan = "Masukkan nomor DO.";
        this.cari.hasil = null;
      } else if (!data) {
        this.cari.pesan = "Nomor DO " + nomor + " tidak ditemukan.";
        this.cari.hasil = null;
      } else {
        this.cari.pesan = "";
        this.cari.hasil = Object.assign({ nomor: nomor }, data);
      }
    },

    // Tombol "Lacak" pada tabel daftar DO: isi kolom pencarian lalu jalankan pencarian.
    // $nextTick dipakai karena watcher "cari.nomor" menghapus hasil terlebih dahulu;
    // pencarian dijalankan setelah watcher itu selesai.
    lihat: function (nomor) {
      this.cari.nomor = nomor;
      var self = this;
      this.$nextTick(function () { self.cariDO(); });
    },

    // Validasi sederhana form DO baru. Mengembalikan objek error (kosong = valid).
    validate: function () {
      var e = {}, f = this.form;
      if (!/^\d{9,12}$/.test(f.nim)) e.nim = "NIM harus 9-12 digit angka.";
      if (!f.nama || f.nama.length < 3) e.nama = "Nama minimal 3 karakter.";
      if (!f.ekspedisi) e.ekspedisi = "Pilih ekspedisi.";
      if (!f.paket) e.paket = "Pilih paket bahan ajar.";
      if (!f.tanggalKirim) e.tanggalKirim = "Tanggal kirim wajib diisi.";
      return e;
    },

    // Submit form DO baru: validasi -> simpan ke this.tracking -> reset form.
    // $set dipakai karena menambah key baru pada objek tidak otomatis reaktif di Vue 2.
    tambah: function () {
      this.errors = this.validate();
      if (Object.keys(this.errors).length) return;
      var f = this.form, nomor = this.nomorBaru;
      this.$set(this.tracking, nomor, {
        nim: f.nim,
        nama: f.nama,
        status: "Diproses",
        ekspedisi: f.ekspedisi,
        tanggalKirim: f.tanggalKirim,
        paket: f.paket,
        total: this.totalHarga,
        perjalanan: [{ waktu: waktuSekarang(), keterangan: "DO dibuat, menunggu pengiriman" }]
      });
      this.notice = "DO " + nomor + " berhasil dibuat.";
      this.resetForm();
    },

    // Mengosongkan form (tanggal kembali ke hari ini) dan pesan error.
    resetForm: function () {
      this.form = { nim: "", nama: "", ekspedisi: "", paket: "", tanggalKirim: hariIni() };
      this.errors = {};
    }
  }
});
