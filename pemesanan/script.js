(() => {
  // Replace with the exact workshop/dispatch pin before using live distance estimates.
  const ORIGIN = { lat: -6.9375, lng: 107.7275 };
  const FREE_DELIVERY_LIMIT_KM = 40;
  const OJOL_FIRST_FOUR_KM_FEE = 10000;
  const OJOL_NEXT_KM_FEE = 2500;
  const form = document.querySelector('#order-form');
  const status = document.querySelector('#form-status');
  const routeButton = document.querySelector('#route-button');
  const locateButton = document.querySelector('#locate-button');
  const fieldset = document.querySelector('#shipping-fieldset');
  const result = document.querySelector('#delivery-result');
  const summaryDialog = document.querySelector('#summary-dialog');
  const dialogBackdrop = document.querySelector('#dialog-backdrop');
  const productList = [
    ['minimalis', 'Nomor Rumah Minimalis', 75000, '20 × 10 cm', 'PALING DIMINATI'],
    ['premium', 'Nomor Rumah Premium', 120000, '30 × 15 cm', 'UKURAN BESAR'],
    ['custom', 'Nomor Rumah Custom', 150000, 'Ukuran sesuai pesanan', 'BEBAS CUSTOM'],
    ['akrilik-hitam', 'Akrilik Hitam Elegan', 85000, '20 × 10 cm', 'WARNA HITAM'],
    ['akrilik-putih', 'Akrilik Putih Minimal', 85000, '20 × 10 cm', 'WARNA PUTIH'],
    ['akrilik-emas', 'Akrilik Nuansa Emas', 95000, '20 × 10 cm', 'AKSEN EMAS'],
    ['akrilik-silver', 'Akrilik Silver Modern', 95000, '20 × 10 cm', 'AKSEN SILVER'],
    ['nomor-timbul', 'Nomor Timbul 3D', 135000, '30 × 15 cm', 'MODEL TIMBUL'],
    ['nomor-dobel', 'Nomor Lapis Ganda', 165000, '30 × 15 cm', 'DUA LAPIS'],
    ['nomor-led', 'Nomor Rumah LED', 250000, '30 × 15 cm', 'DENGAN LAMPU'],
    ['nomor-jalan', 'Nomor + Nama Jalan', 185000, '30 × 15 cm', 'PAKET LENGKAP'],
    ['nomor-keluarga', 'Nomor + Nama Keluarga', 175000, '30 × 15 cm', 'PERSONAL']
  ].map(([id, name, price, size, badge], index) => ({
    id, name, price, size, badge,
    image: [
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=700&q=80'
    ][index % 3]
  }));
  const products = Object.fromEntries(productList.map((product) => [product.id, product]));
  const cart = new Map();
  let destination = null;
  let routeDistanceKm = null;
  let currentLayer = null;
  let map = null;
  let originMarker = null;

  const formatRupiah = (amount) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(amount);

  const ojolFare = (distance) => {
    const roundedKm = Math.ceil(distance);
    if (roundedKm <= 4) return OJOL_FIRST_FOUR_KM_FEE;
    return OJOL_FIRST_FOUR_KM_FEE + (roundedKm - 4) * OJOL_NEXT_KM_FEE;
  };

  function renderCart() {
    const list = document.querySelector('#cart-items');
    const entries = [...cart.entries()];
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'cart-empty';
      empty.innerHTML = 'Belum ada produk dipilih.<br>Klik tombol “Pilih” pada produk.';
      list.replaceChildren(empty);
    } else {
      list.replaceChildren(...entries.map(([id, quantity]) => {
        const product = products[id];
        const line = document.createElement('div');
        line.className = 'cart-line';
        const name = document.createElement('strong');
        name.textContent = product.name;
        const price = document.createElement('span');
        price.className = 'cart-line-price';
        price.textContent = formatRupiah(product.price * quantity);
        const controls = document.createElement('div');
        controls.className = 'cart-line-controls';
        const minus = document.createElement('button');
        minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', `Kurangi ${product.name}`);
        minus.addEventListener('click', () => { quantity <= 1 ? cart.delete(id) : cart.set(id, quantity - 1); renderCart(); });
        const count = document.createElement('span'); count.textContent = quantity;
        const plus = document.createElement('button');
        plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', `Tambah ${product.name}`);
        plus.addEventListener('click', () => { if (quantity < 20) cart.set(id, quantity + 1); renderCart(); });
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'remove-cart'; remove.innerHTML = '<i class="fa-regular fa-trash-can" aria-hidden="true"></i>'; remove.setAttribute('aria-label', `Hapus ${product.name}`);
        remove.addEventListener('click', () => { cart.delete(id); renderCart(); });
        controls.append(minus, count, plus, remove);
        line.append(name, price, controls);
        return line;
      }));
    }
    const subtotal = entries.reduce((sum, [id, quantity]) => sum + products[id].price * quantity, 0);
    document.querySelector('#cart-subtotal').textContent = formatRupiah(subtotal);
  }

  function renderProducts() {
    const list = document.querySelector('#product-list');
    list.replaceChildren(...productList.map((product) => {
      const card = document.createElement('article');
      card.className = 'product-card';
      const image = document.createElement('img');
      image.src = product.image; image.alt = product.name; image.loading = 'lazy';
      const body = document.createElement('div'); body.className = 'product-card-body';
      const badge = document.createElement('span'); badge.className = 'product-tag product-tag-light'; badge.textContent = product.badge;
      const title = document.createElement('h3'); title.textContent = product.name;
      const description = document.createElement('p'); description.textContent = 'Nomor rumah akrilik, dibuat sesuai pilihan dan tulisan Anda.';
      const bottom = document.createElement('div'); bottom.className = 'product-card-bottom';
      const price = document.createElement('strong'); price.textContent = formatRupiah(product.price);
      const button = document.createElement('button'); button.type = 'button'; button.className = 'add-product'; button.dataset.product = product.id;
      button.setAttribute('aria-label', `Pilih ${product.name}`); button.innerHTML = 'Pilih <i class="fa-solid fa-plus" aria-hidden="true"></i>';
      button.addEventListener('click', () => { cart.set(product.id, Math.min(20, (cart.get(product.id) || 0) + 1)); renderCart(); });
      bottom.append(price, button);
      const size = document.createElement('small'); size.textContent = `Contoh: ${product.size}`;
      body.append(badge, title, description, bottom, size); card.append(image, body);
      return card;
    }));
  }
  renderProducts();

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('error', isError);
  }

  function setDestination(latlng) {
    destination = { lat: latlng.lat, lng: latlng.lng };
    routeDistanceKm = null;
    if (currentLayer) currentLayer.remove();
    currentLayer = L.marker(latlng, {
      icon: L.divIcon({ className: '', html: '<span class="custom-marker"><i class="fa-solid fa-house"></i></span>', iconSize: [28, 28], iconAnchor: [13, 26] })
    }).addTo(map).bindPopup('Titik tujuan pengiriman');
    document.querySelector('#location-label').textContent = 'Lokasi tujuan dipilih';
    document.querySelector('#coordinate-label').textContent = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
    routeButton.disabled = false;
    routeButton.innerHTML = '<i class="fa-solid fa-route" aria-hidden="true"></i> Hitung jarak pengiriman';
    result.hidden = true;
    fieldset.disabled = true;
    document.querySelector('#shipping-options').replaceChildren();
    document.querySelector('#shipping-footnote').textContent = 'Hitung jarak untuk melihat pilihan pengiriman.';
  }

  function renderShippingOptions(distance) {
    const options = document.querySelector('#shipping-options');
    const near = distance < FREE_DELIVERY_LIMIT_KM;
    const entries = [];
    if (near) entries.push({ id: 'ojol', title: 'Ojek online', detail: 'Tarif berdasarkan km rute jalan', price: formatRupiah(ojolFare(distance)), icon: 'fa-motorcycle' });
    entries.push({ id: 'expedition', title: 'Kurir ekspedisi', detail: 'JNE, J&T, dan layanan tersedia', price: 'Dihitung saat backend aktif', icon: 'fa-box' });
    options.replaceChildren(...entries.map((entry, index) => {
      const label = document.createElement('label');
      label.className = 'shipping-option';
      label.innerHTML = `<input type="radio" name="shipping" value="${entry.id}" ${index === 0 ? 'required' : ''}><span class="shipping-option-icon"><i class="fa-solid ${entry.icon}" aria-hidden="true"></i></span><span class="shipping-option-copy"><strong>${entry.title}</strong><small>${entry.detail}</small></span><span class="shipping-option-price">${entry.price}</span>`;
      return label;
    }));
    fieldset.disabled = false;
    document.querySelector('#shipping-footnote').textContent = near
      ? 'Jarak di bawah 40 km: ojol atau kurir ekspedisi dapat dipilih.'
      : 'Jarak 40 km atau lebih: hanya kurir ekspedisi tersedia.';
  }

  async function calculateRoute() {
    if (!destination) return;
    routeButton.disabled = true;
    routeButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Menghitung rute…';
    setStatus('Mengambil estimasi rute jalan. Layanan rute prototipe bisa sewaktu-waktu tidak tersedia.');
    try {
      const coords = `${ORIGIN.lng},${ORIGIN.lat};${destination.lng},${destination.lat}`;
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Layanan rute tidak dapat dihubungi.');
      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes?.length) throw new Error('Rute jalan tidak ditemukan untuk titik ini.');
      routeDistanceKm = data.routes[0].distance / 1000;
      const roundedKm = Math.ceil(routeDistanceKm);
      document.querySelector('#distance-value').textContent = `${routeDistanceKm.toFixed(1)} km`;
      const fare = ojolFare(routeDistanceKm);
      document.querySelector('#distance-message').textContent = routeDistanceKm < FREE_DELIVERY_LIMIT_KM
        ? `Dibulatkan menjadi ${roundedKm} km untuk tarif ojol (${formatRupiah(fare)}).`
        : 'Jarak mencapai 40 km; pilihan yang tersedia adalah kurir ekspedisi.';
      result.hidden = false;
      renderShippingOptions(routeDistanceKm);
      setStatus('Estimasi berhasil. Tarif rute adalah perkiraan dan akan diverifikasi saat backend aktif.');
    } catch (error) {
      routeDistanceKm = null;
      fieldset.disabled = true;
      result.hidden = true;
      setStatus(`${error.message} Silakan coba lagi atau pilih titik lain.`, true);
    } finally {
      routeButton.disabled = !destination;
      routeButton.innerHTML = '<i class="fa-solid fa-route" aria-hidden="true"></i> Hitung ulang jarak';
    }
  }

  function initializeMap() {
    if (!window.L) {
      document.querySelector('#delivery-map').innerHTML = '<p class="map-error">Peta gagal dimuat. Periksa koneksi lalu muat ulang halaman.</p>';
      return;
    }
    map = L.map('delivery-map', { scrollWheelZoom: false }).setView([ORIGIN.lat, ORIGIN.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);
    originMarker = L.circleMarker([ORIGIN.lat, ORIGIN.lng], {
      radius: 7, color: '#fffefa', weight: 3, fillColor: '#394f41', fillOpacity: 1
    }).addTo(map).bindPopup('Titik asal pengiriman · Cimekar, Cileunyi');
    map.on('click', (event) => setDestination(event.latlng));
  }

  function showSummary(data) {
    const selectedShipping = form.querySelector('input[name="shipping"]:checked');
    const shippingName = selectedShipping?.value === 'ojol' ? 'Ojek online' : 'Kurir ekspedisi';
    const fee = selectedShipping?.value === 'ojol' && routeDistanceKm !== null ? formatRupiah(ojolFare(routeDistanceKm)) : 'Menunggu perhitungan API';
    const cartDescription = [...cart.entries()].map(([id, quantity]) => `${products[id].name} × ${quantity} — ${formatRupiah(products[id].price * quantity)}`).join('; ');
    const subtotal = [...cart.entries()].reduce((sum, [id, quantity]) => sum + products[id].price * quantity, 0);
    const rows = [
      ['Produk', cartDescription],
      ['Subtotal produk', formatRupiah(subtotal)],
      ['Nama penerima', data.get('customerName')],
      ['WhatsApp', data.get('phone')],
      ['Alamat', data.get('address')],
      ['Jarak jalan', `${routeDistanceKm.toFixed(1)} km`],
      ['Pengiriman', shippingName],
      ['Estimasi ongkir', fee]
    ];
    const summary = document.querySelector('#summary-content');
    summary.replaceChildren(...rows.map(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'summary-row';
      const key = document.createElement('span');
      const val = document.createElement('span');
      key.textContent = label;
      val.textContent = value;
      row.append(key, val);
      return row;
    }));
    dialogBackdrop.hidden = false;
    summaryDialog.showModal();
  }

  function closeSummary() {
    if (summaryDialog.open) summaryDialog.close();
    dialogBackdrop.hidden = true;
  }

  routeButton.addEventListener('click', calculateRoute);
  initializeMap();
  locateButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
      setStatus('Browser ini tidak mendukung pencarian lokasi otomatis. Pilih titik langsung di peta.', true);
      return;
    }
    locateButton.disabled = true;
    navigator.geolocation.getCurrentPosition((position) => {
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      map.setView([point.lat, point.lng], 16);
      setDestination(point);
      locateButton.disabled = false;
      setStatus('Lokasi terpilih. Tekan “Hitung jarak pengiriman” untuk estimasi ongkir.');
    }, () => {
      locateButton.disabled = false;
      setStatus('Lokasi tidak dapat diakses. Pilih titik secara manual pada peta.', true);
    }, { enableHighAccuracy: true, timeout: 10000 });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    setStatus('');
    if (!form.reportValidity()) return;
    if (cart.size === 0) {
      setStatus('Pilih setidaknya satu produk dari daftar terlebih dahulu.', true);
      document.querySelector('#product-list').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!destination || routeDistanceKm === null) {
      setStatus('Pilih titik rumah dan hitung jarak pengiriman terlebih dahulu.', true);
      document.querySelector('#delivery-map').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!form.querySelector('input[name="shipping"]:checked')) {
      setStatus('Pilih salah satu metode pengiriman.', true);
      return;
    }
    showSummary(new FormData(form));
  });

  document.querySelector('#close-dialog').addEventListener('click', closeSummary);
  document.querySelector('#back-to-form').addEventListener('click', closeSummary);
  dialogBackdrop.addEventListener('click', closeSummary);
  summaryDialog.addEventListener('close', () => { dialogBackdrop.hidden = true; });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSummary(); });
})();

