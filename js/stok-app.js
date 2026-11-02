/*
 * stok-app.js
 * Logika Vue untuk halaman stok.html (Stok Bahan Ajar).
 *
 * Struktur instance Vue:
 *   data     -> state/data aplikasi (dummy data, filter, sort, form)
 *   computed -> nilai turunan yang di-cache (hasil filter+sort, ringkasan, dll.)
 *   watch    -> memantau perubahan data tertentu lalu menjalankan aksi
 *   methods  -> fungsi yang dipanggil dari template (klik tombol, submit form, dll.)
 */
var app = new Vue({
  // Vue "memasang" dirinya pada elemen <main id="app"> di stok.html
  el: '#app',

  /* ===================== DATA ===================== */
  data: {
    // Daftar UT-Daerah, dipakai untuk opsi <select> filter dan form
    upbjjList: ["Jakarta", "Surabaya", "Makassar", "Padang", "Denpasar"],

    // Daftar kategori mata kuliah, dipakai untuk opsi <select>
    kategoriList: ["MK Wajib", "MK Pilihan", "Praktikum", "Problem-Based"],

    // Dummy data stok bahan ajar (dari dataBahanAjar.js).
    // catatanHTML berisi tag HTML sehingga ditampilkan dengan v-html di template.
    stok: [
      { kode: "EKMA4116", judul: "Pengantar Manajemen", kategori: "MK Wajib", upbjj: "Jakarta", lokasiRak: "R1-A3", harga: 65000, qty: 28, safety: 20, catatanHTML: "<em>Edisi 2024, cetak ulang</em>" },
      { kode: "EKMA4115", judul: "Pengantar Akuntansi", kategori: "MK Wajib", upbjj: "Jakarta", lokasiRak: "R1-A4", harga: 60000, qty: 7, safety: 15, catatanHTML: "<strong>Cover baru</strong>" },
      { kode: "BIOL4201", judul: "Biologi Umum (Praktikum)", kategori: "Praktikum", upbjj: "Surabaya", lokasiRak: "R3-B2", harga: 80000, qty: 12, safety: 10, catatanHTML: "Butuh <u>pendingin</u> untuk kit basah" },
      { kode: "FISIP4001", judul: "Dasar-Dasar Sosiologi", kategori: "MK Pilihan", upbjj: "Makassar", lokasiRak: "R2-C1", harga: 55000, qty: 2, safety: 8, catatanHTML: "Stok <i>menipis</i>, prioritaskan reorder" }
    ],

    // State filter; di-bind dengan v-model pada elemen select/checkbox
    filter: { upbjj: "", kategori: "", reorderOnly: false },

    // State pengurutan: by = kolom (judul/qty/harga), dir = arah (asc/desc)
    sort: { by: "judul", dir: "asc" },

    // State form "Tambah Bahan Ajar Baru"
    form: { kode: "", judul: "", kategori: "", upbjj: "", lokasiRak: "", harga: null, qty: null, safety: null, catatan: "" },

    // Pesan error validasi form tambah, contoh: { kode: "Kode wajib diisi." }
    errors: {},

    // Data yang sedang diedit; null berarti form edit disembunyikan (v-if)
    editing: null,

    // Pesan error validasi form edit
    editErrors: {},

    // Pesan sukses/informasi di bagian atas halaman
    notice: ""
  },

  /* ===================== COMPUTED ===================== */
  /*
   * Computed property di-cache: hanya dihitung ulang jika data yang dipakainya
   * berubah. Inilah yang membuat filter/sort "tidak perlu recompute" setiap kali
   * halaman dirender ulang.
   */
  computed: {
    /*
     * Opsi kategori untuk dependent select. Hanya kategori yang benar-benar
     * ada pada UT-Daerah yang sedang dipilih. Filter kategori sendiri baru
     * ditampilkan di template jika filter.upbjj sudah terisi (v-if).
     */
    kategoriOptions: function () {
      var self = this;
      return this.kategoriList.filter(function (k) {
        // some(): true jika ada minimal satu stok dengan upbjj & kategori tsb
        return self.stok.some(function (s) {
          return s.upbjj === self.filter.upbjj && s.kategori === k;
        });
      });
    },

    /*
     * Hasil akhir tabel: stok yang sudah difilter lalu diurutkan.
     * Tahap 1: filter berdasarkan UT-Daerah, kategori, dan status re-order.
     * Tahap 2: sort berdasarkan judul (teks) atau qty/harga (angka).
     */
    filteredStok: function () {
      var self = this;

      // Tahap 1 - filter
      var hasil = this.stok.filter(function (s) {
        if (self.filter.upbjj && s.upbjj !== self.filter.upbjj) return false;
        if (self.filter.kategori && s.kategori !== self.filter.kategori) return false;
        // Re-order: stok di bawah safety atau stok = 0
        if (self.filter.reorderOnly && !(s.qty < s.safety || s.qty === 0)) return false;
        return true;
      });

      // Tahap 2 - sort. slice() membuat salinan agar array asli tidak berubah urutannya.
      var by = this.sort.by;
      var arah = this.sort.dir === "asc" ? 1 : -1;
      return hasil.slice().sort(function (a, b) {
        if (by === "judul") return a.judul.localeCompare(b.judul) * arah; // teks
        return (a[by] - b[by]) * arah;                                    // angka
      });
    },

    /*
     * Hitung jumlah item per status dari data yang sedang ditampilkan.
     * Dipakai untuk badge ringkasan di atas tabel.
     */
    ringkasan: function () {
      var r = { aman: 0, menipis: 0, kosong: 0 };
      this.filteredStok.forEach(function (s) {
        if (s.qty === 0) r.kosong++;
        else if (s.qty < s.safety) r.menipis++;
        else r.aman++;
      });
      return r;
    },

    /*
     * Pratinjau status stok pada form tambah (muncul begitu qty & safety terisi),
     * dengan aturan yang sama seperti status di tabel.
     */
    formStatusPreview: function () {
      var q = this.form.qty, s = this.form.safety;
      if (typeof q !== "number" || typeof s !== "number") return "";
      if (q === 0) return "⛔ Kosong";
      return q < s ? "⚠️ Menipis" : "✅ Aman";
    }
  },

  /* ===================== WATCH ===================== */
  /*
   * Watcher memantau satu data dan menjalankan fungsi saat nilainya berubah.
   * Berbeda dengan computed, watcher dipakai untuk "efek samping" (mengubah
   * data lain, menampilkan pesan), bukan untuk menghasilkan nilai.
   */
  watch: {
    // Watcher 1: saat UT-Daerah berganti, kategori yang dipilih sebelumnya bisa
    // tidak valid lagi (opsinya berubah), jadi direset ke "Semua Kategori".
    "filter.upbjj": function () {
      this.filter.kategori = "";
    },

    // Watcher 2: saat checkbox re-order diubah, tampilkan pesan jumlah item
    // yang perlu di-reorder; kosongkan pesan saat dimatikan.
    "filter.reorderOnly": function (aktif) {
      this.notice = aktif
        ? "Menampilkan bahan ajar yang perlu di-reorder (" + this.filteredStok.length + " item)."
        : "";
    },

    // Watcher 3: kode pada form otomatis huruf besar dan tanpa spasi.
    // Kondisi (bersih !== v) mencegah loop tak berujung, karena mengubah
    // form.kode akan memicu watcher ini sekali lagi.
    "form.kode": function (v) {
      var bersih = String(v).toUpperCase().replace(/\s/g, "");
      if (bersih !== v) this.form.kode = bersih;
    }
  },

  /* ===================== METHODS ===================== */
  methods: {
    // Format angka ke rupiah, contoh 65000 -> "Rp 65.000"
    formatRupiah: function (n) {
      return "Rp " + Number(n).toLocaleString("id-ID");
    },

    // Mengganti karakter &, <, > agar teks catatan dari pengguna tidak dieksekusi
    // sebagai HTML ketika ditampilkan dengan v-html (mencegah XSS).
    escapeHtml: function (t) {
      return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },

    /*
     * Validasi sederhana, dipakai oleh form tambah dan form edit.
     *   d        : objek data yang divalidasi
     *   cekKode  : true untuk form tambah (kode, judul, kategori, upbjj ikut dicek)
     * Mengembalikan objek error; objek kosong berarti data valid.
     */
    validate: function (d, cekKode) {
      var e = {};
      if (cekKode) {
        if (!d.kode) e.kode = "Kode wajib diisi.";
        else if (!/^[A-Z]{3,6}\d{4}$/.test(d.kode)) e.kode = "Format kode: huruf + 4 angka (mis. EKMA4117).";
        // Cegah duplikat: kombinasi kode + UT-Daerah harus unik
        else if (this.stok.some(function (s) { return s.kode === d.kode && s.upbjj === d.upbjj; })) e.kode = "Kode sudah ada untuk UT-Daerah ini.";
        if (!d.judul || d.judul.length < 3) e.judul = "Judul minimal 3 karakter.";
        if (!d.kategori) e.kategori = "Pilih kategori.";
        if (!d.upbjj) e.upbjj = "Pilih UT-Daerah.";
      }
      if (!/^R\d+-[A-Z]\d+$/.test(d.lokasiRak || "")) e.lokasiRak = "Format rak: R1-A3.";
      if (typeof d.harga !== "number" || !(d.harga > 0)) e.harga = "Harga harus lebih dari 0.";
      if (typeof d.qty !== "number" || !Number.isInteger(d.qty) || d.qty < 0) e.qty = "Stok harus bilangan bulat >= 0.";
      if (typeof d.safety !== "number" || !Number.isInteger(d.safety) || d.safety < 0) e.safety = "Safety harus bilangan bulat >= 0.";
      return e;
    },

    // Dipanggil saat form tambah di-submit (@submit.prevent).
    // Alur: validasi -> jika ada error berhenti -> push ke array stok -> reset form.
    tambah: function () {
      this.errors = this.validate(this.form, true);
      if (Object.keys(this.errors).length) return; // masih ada error, jangan simpan
      var f = this.form;
      this.stok.push({
        kode: f.kode, judul: f.judul, kategori: f.kategori, upbjj: f.upbjj,
        lokasiRak: f.lokasiRak, harga: f.harga, qty: f.qty, safety: f.safety,
        catatanHTML: this.escapeHtml(f.catatan || "")
      });
      this.notice = "Data " + f.kode + " berhasil ditambahkan.";
      this.resetForm();
    },

    // Mengosongkan form tambah beserta pesan errornya.
    resetForm: function () {
      this.form = { kode: "", judul: "", kategori: "", upbjj: "", lokasiRak: "", harga: null, qty: null, safety: null, catatan: "" };
      this.errors = {};
    },

    // Dipanggil tombol "Edit". Data disalin ke this.editing agar perubahan
    // baru berlaku setelah tombol Simpan; "ref" menyimpan objek aslinya.
    mulaiEdit: function (item) {
      this.editing = {
        ref: item, kode: item.kode, judul: item.judul, lokasiRak: item.lokasiRak,
        harga: item.harga, qty: item.qty, safety: item.safety,
        // buang tag HTML supaya mudah diedit sebagai teks biasa
        catatan: item.catatanHTML.replace(/<[^>]*>/g, "")
      };
      this.editErrors = {};
    },

    // Tombol "Simpan" pada form edit: validasi, lalu tulis balik ke objek asli.
    simpanEdit: function () {
      this.editErrors = this.validate(this.editing, false);
      if (Object.keys(this.editErrors).length) return;
      var e = this.editing, r = e.ref;
      r.lokasiRak = e.lokasiRak; r.harga = e.harga; r.qty = e.qty; r.safety = e.safety;
      r.catatanHTML = this.escapeHtml(e.catatan || "");
      this.notice = "Data " + e.kode + " berhasil diperbarui.";
      this.editing = null; // sembunyikan form edit
    },

    // Tombol "Batal": tutup form edit tanpa menyimpan.
    batalEdit: function () {
      this.editing = null;
      this.editErrors = {};
    },

    // Tombol "Reset Filter": kembalikan semua filter dan sort ke nilai awal.
    resetFilter: function () {
      this.filter = { upbjj: "", kategori: "", reorderOnly: false };
      this.sort = { by: "judul", dir: "asc" };
      this.notice = "";
    }
  }
});
