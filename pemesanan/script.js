(() => {
  const form = document.querySelector('#order-form');
  const status = document.querySelector('#form-status');
  const summaryDialog = document.querySelector('#summary-dialog');
  const dialogBackdrop = document.querySelector('#dialog-backdrop');
  const mobileCartShortcut = document.querySelector('#mobile-cart-shortcut');
  const mobileCheckoutDialog = document.querySelector('#mobile-checkout-dialog');
  const checkoutPanel = document.querySelector('.checkout-panel');
  const productList = [
    ['minimalis', 'Nomor Rumah Minimalis', 75000, '20 x 10 cm', 'PALING DIMINATI'],
    ['premium', 'Nomor Rumah Premium', 120000, '30 x 15 cm', 'UKURAN BESAR'],
    ['custom', 'Nomor Rumah Custom', 150000, 'Ukuran sesuai pesanan', 'BEBAS CUSTOM'],
    ['akrilik-hitam', 'Akrilik Hitam Elegan', 85000, '20 x 10 cm', 'WARNA HITAM'],
    ['akrilik-putih', 'Akrilik Putih Minimal', 85000, '20 x 10 cm', 'WARNA PUTIH'],
    ['akrilik-emas', 'Akrilik Nuansa Emas', 95000, '20 x 10 cm', 'AKSEN EMAS'],
    ['akrilik-silver', 'Akrilik Silver Modern', 95000, '20 x 10 cm', 'AKSEN SILVER'],
    ['nomor-timbul', 'Nomor Timbul 3D', 135000, '30 x 15 cm', 'MODEL TIMBUL'],
    ['nomor-dobel', 'Nomor Lapis Ganda', 165000, '30 x 15 cm', 'DUA LAPIS'],
    ['nomor-led', 'Nomor Rumah LED', 250000, '30 x 15 cm', 'DENGAN LAMPU'],
    ['nomor-jalan', 'Nomor + Nama Jalan', 185000, '30 x 15 cm', 'PAKET LENGKAP'],
    ['nomor-keluarga', 'Nomor + Nama Keluarga', 175000, '30 x 15 cm', 'PERSONAL']
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
  const API_BASE = 'https://pemesanan-api.ajielt7.workers.dev';
  let selectedDestination = null;
  let selectedRate = null;
  let quoteTimer = null;
  let quoteController = null;
  let quoteRequestId = 0;
  let orderRequestId = null;
  let isSubmittingOrder = false;
  let currentOrder = null;
  let checkoutPanelVisible = false;

  const destinationInput = document.querySelector('#destination-search');
  const destinationCoordinates = document.querySelector('#destination-coordinates');
  const routeMap = new maplibregl.Map({
    container: 'destination-map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [107.7430814007, -6.9298300251],
    zoom: 12,
    attributionControl: true
  });
  routeMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  let destinationMarker = null;

  function chooseDestinationPoint(latitude, longitude) {
    selectedDestination = {
      id: '', label: destinationInput.value.trim(),
      latitude: Number(latitude), longitude: Number(longitude)
    };
    orderRequestId = null;
    if (!destinationMarker) {
      const markerElement = document.createElement('div');
      markerElement.className = 'custom-marker';
      markerElement.innerHTML = '<i class="fa-solid fa-location-dot" aria-hidden="true"></i>';
      destinationMarker = new maplibregl.Marker({ element: markerElement, draggable: true })
        .setLngLat([longitude, latitude])
        .addTo(routeMap);
      destinationMarker.on('dragend', () => {
        const point = destinationMarker.getLngLat();
        chooseDestinationPoint(point.lat, point.lng);
      });
    } else destinationMarker.setLngLat([longitude, latitude]);
    destinationCoordinates.textContent = `Pin: ${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`;
    scheduleShippingQuote();
  }

  routeMap.on('click', (event) => chooseDestinationPoint(event.lngLat.lat, event.lngLat.lng));

  if ('IntersectionObserver' in window && checkoutPanel) {
    new IntersectionObserver(([entry]) => {
      checkoutPanelVisible = entry.isIntersecting;
      mobileCartShortcut.hidden = checkoutPanelVisible;
    }, { threshold: 0.12 }).observe(checkoutPanel);
  }

  mobileCartShortcut.addEventListener('click', () => {
    mobileCheckoutDialog.showModal();
    setTimeout(() => routeMap.resize(), 100);
  });
  document.querySelector('#close-mobile-checkout').addEventListener('click', () => mobileCheckoutDialog.close());
  mobileCheckoutDialog.addEventListener('click', (event) => {
    if (event.target === mobileCheckoutDialog) mobileCheckoutDialog.close();
  });

  const formatRupiah = (amount) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(amount);

  function renderCart() {
    orderRequestId = null;
    clearTimeout(quoteTimer);
    if (quoteController) quoteController.abort();
    quoteRequestId += 1;
    selectedRate = null;
    document.querySelector('#shipping-rates').replaceChildren();
    const list = document.querySelector('#cart-items');
    const entries = [...cart.entries()];
    const itemCount = entries.reduce((sum, [, quantity]) => sum + quantity, 0);
    document.querySelector('#cart-count-label').textContent = itemCount
      ? `KERANJANG · ${itemCount} PRODUK` : 'KERANJANG ANDA';
    document.querySelectorAll('[data-product-id]').forEach((button) => {
      const quantity = cart.get(button.dataset.productId) || 0;
      button.classList.toggle('is-added', quantity > 0);
      button.innerHTML = quantity
        ? `Ditambahkan (${quantity}) <i class="fa-solid fa-check" aria-hidden="true"></i>`
        : 'Tambah <i class="fa-solid fa-plus" aria-hidden="true"></i>';
    });
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'cart-empty';
      empty.innerHTML = 'Belum ada produk dipilih.<br>Klik tombol Pilih pada produk.';
      list.replaceChildren(empty);
    } else {
      list.replaceChildren(...entries.map(([id, quantity]) => {
        const product = products[id];
        const line = document.createElement('div');
        line.className = 'cart-line';
        const name = document.createElement('strong'); name.textContent = product.name;
        const price = document.createElement('span'); price.className = 'cart-line-price';
        price.textContent = formatRupiah(product.price * quantity);
        const controls = document.createElement('div'); controls.className = 'cart-line-controls';
        const minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '-';
        minus.setAttribute('aria-label', `Kurangi ${product.name}`);
        minus.addEventListener('click', () => { quantity <= 1 ? cart.delete(id) : cart.set(id, quantity - 1); renderCart(); });
        const count = document.createElement('span'); count.textContent = quantity;
        const plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+';
        plus.setAttribute('aria-label', `Tambah ${product.name}`);
        plus.addEventListener('click', () => { if (quantity < 20) cart.set(id, quantity + 1); renderCart(); });
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-cart';
        remove.innerHTML = '<i class="fa-regular fa-trash-can" aria-hidden="true"></i>';
        remove.setAttribute('aria-label', `Hapus ${product.name}`);
        remove.addEventListener('click', () => { cart.delete(id); renderCart(); });
        controls.append(minus, count, plus, remove);
        line.append(name, price, controls);
        return line;
      }));
    }
    const subtotal = entries.reduce((sum, [id, quantity]) => sum + products[id].price * quantity, 0);
    document.querySelector('#cart-subtotal').textContent = formatRupiah(subtotal);
    document.querySelector('#mobile-cart-total').textContent = formatRupiah(subtotal);
    document.querySelector('#mobile-cart-count').textContent = `${itemCount} produk dipilih`;
    mobileCartShortcut.hidden = checkoutPanelVisible;
    scheduleShippingQuote();
  }
function scheduleShippingQuote() {
    if (!selectedDestination || cart.size === 0) {
      if (quoteController) quoteController.abort();
      return;
    }
    setStatus('Menghitung jarak dan ongkir dari titik toko...');
    quoteTimer = setTimeout(calculateShipping, 700);
  }

  async function calculateShipping() {
    if (!selectedDestination || cart.size === 0) return;
    clearTimeout(quoteTimer);
    if (quoteController) quoteController.abort();
    quoteController = new AbortController();
    const requestId = ++quoteRequestId;
    const rates = document.querySelector('#shipping-rates');
    selectedRate = null;
    rates.replaceChildren();
    try {
      const response = await fetch(`${API_BASE}/api/route-distance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: selectedDestination.latitude, longitude: selectedDestination.longitude }),
        signal: quoteController.signal
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Jarak rute belum dapat dihitung.');
      if (requestId !== quoteRequestId) return;
      selectedRate = { code: 'local', name: 'Pengantaran toko', service: 'Tarif berdasarkan jarak jalan', cost: Number(result.shippingCost) };
      const line = document.createElement('div'); line.className = 'shipping-rate-option selected';
      const copy = document.createElement('span'); copy.className = 'shipping-rate-copy';
      const title = document.createElement('strong'); title.textContent = `Jarak rute ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(result.distanceKm)} km`;
      const detail = document.createElement('small'); detail.textContent = '4 km pertama Rp10.000, selanjutnya Rp2.500 per km (dibulatkan ke atas)';
      const price = document.createElement('strong'); price.className = 'shipping-rate-price'; price.textContent = formatRupiah(selectedRate.cost);
      copy.append(title, detail); line.append(copy, price); rates.replaceChildren(line);
      selectedDestination.distanceKm = Number(result.distanceKm);
      setStatus(`Ongkir pengantaran dihitung dari jarak rute ${result.distanceKm} km.`);
    } catch (error) {
      if (error.name === 'AbortError' || requestId !== quoteRequestId) return;
      const message = document.createElement('p'); message.className = 'shipping-error'; message.textContent = error.message || 'Jarak rute belum dapat dihitung.';
      rates.replaceChildren(message);
      setStatus(error.message || 'Ongkir belum dapat dihitung.', true);
    }
  }

  function renderProducts() {
    const list = document.querySelector('#product-list');
    list.replaceChildren(...productList.map((product) => {
      const card = document.createElement('article'); card.className = 'product-card';
      const media = document.createElement('div'); media.className = 'product-card-media';
      const image = document.createElement('img'); image.src = product.image; image.alt = product.name; image.loading = 'lazy';
      const caption = document.createElement('div'); caption.className = 'product-card-caption';
      const badge = document.createElement('span'); badge.className = 'product-tag'; badge.textContent = product.badge;
      const title = document.createElement('h3'); title.textContent = product.name;
      caption.append(badge, title);
      media.append(image, caption);
      const body = document.createElement('div'); body.className = 'product-card-body';
      const bottom = document.createElement('div'); bottom.className = 'product-card-bottom';
      const price = document.createElement('strong'); price.textContent = formatRupiah(product.price);
      const button = document.createElement('button'); button.type = 'button'; button.className = 'add-product';
      button.dataset.productId = product.id;
      button.setAttribute('aria-label', `Pilih ${product.name}`); button.innerHTML = 'Pilih <i class="fa-solid fa-plus" aria-hidden="true"></i>';
      button.addEventListener('click', () => { cart.set(product.id, Math.min(20, (cart.get(product.id) || 0) + 1)); renderCart(); });
      bottom.append(price, button);
      body.append(bottom); card.append(media, body);
      return card;
    }));
  }

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('error', isError);
  }

  function showSummary(data, savedOrder) {
    currentOrder = savedOrder;
    const cartDescription = [...cart.entries()].map(([id, quantity]) =>
      `${products[id].name} x ${quantity} x ${formatRupiah(products[id].price * quantity)}`
    ).join('; ');
    const subtotal = [...cart.entries()].reduce((sum, [id, quantity]) => sum + products[id].price * quantity, 0);
    const rows = [
      ['Produk', cartDescription],
      ['Subtotal produk', formatRupiah(subtotal)],
      ['Nama penerima', data.get('customerName')],
      ['WhatsApp', data.get('phone')],
      ['Alamat', data.get('address')],
      ['Lokasi tujuan', selectedDestination.label],
      ['Pengiriman', `${selectedRate.name || selectedRate.code} ${selectedRate.service || ''}`.trim()],
      ['Jarak rute', `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(Number(selectedDestination.distanceKm))} km`],
      ['Ongkir', formatRupiah(Number(savedOrder.shippingCost))],
      ['Kode pembayaran', savedOrder.paymentCode],
      ['Total transfer', formatRupiah(Number(savedOrder.total))],
      ['Status', 'Menunggu pembayaran']
    ];
    const summary = document.querySelector('#summary-content');
    summary.replaceChildren(...rows.map(([label, value]) => {
      const row = document.createElement('div'); row.className = 'summary-row';
      const key = document.createElement('span'); key.textContent = label;
      const val = document.createElement('span'); val.textContent = value;
      row.append(key, val); return row;
    }));
    const warning = document.querySelector('.summary-warning');
    warning.textContent = `Pesanan sudah disimpan. Cantumkan kode ${savedOrder.paymentCode} pada deskripsi transfer. Unggah screenshot bukti pembayaran di bawah ini.`;
    document.querySelector('#proof-upload').hidden = false;
    document.querySelector('#payment-proof-file').value = '';
    document.querySelector('#payment-proof-file').disabled = false;
    document.querySelector('#upload-proof-button').disabled = true;
    document.querySelector('#proof-upload-status').textContent = '';
    dialogBackdrop.hidden = false;
    summaryDialog.showModal();
  }

  function closeSummary() {
    if (summaryDialog.open) summaryDialog.close();
    dialogBackdrop.hidden = true;
  }

  renderProducts();
  renderCart();
  destinationInput.addEventListener('input', () => {
    clearTimeout(quoteTimer);
    if (quoteController) quoteController.abort();
    quoteRequestId += 1;
    orderRequestId = null;
    if (selectedDestination) selectedDestination.label = destinationInput.value.trim();
    selectedRate = null;
    document.querySelector('#shipping-rates').replaceChildren();
    if (selectedDestination) scheduleShippingQuote();
  });
  form.addEventListener('input', () => { if (!isSubmittingOrder) orderRequestId = null; });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');
    if (!form.reportValidity()) return;
    if (cart.size === 0) {
      setStatus('Pilih setidaknya satu produk dari daftar terlebih dahulu.', true);
      document.querySelector('#product-list').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!selectedDestination || !selectedDestination.label) {
      setStatus('Isi kota atau kecamatan, lalu pilih titik tujuan pada peta.', true);
      destinationInput.focus();
      return;
    }
    if (!selectedRate) {
      setStatus('Tunggu perhitungan jarak dan ongkir selesai.', true);
      document.querySelector('#shipping-rates').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (isSubmittingOrder) return;
    isSubmittingOrder = true;
    const submitButton = form.querySelector('.submit-button');
    submitButton.disabled = true;
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Menyimpan pesanan...';
    setStatus('Menyimpan pesanan ke database...');
    if (!orderRequestId) orderRequestId = crypto.randomUUID();
    try {
      const response = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientRequestId: orderRequestId,
          customer: {
            name: form.elements.customerName.value.trim(),
            phone: form.elements.phone.value.trim(),
            address: form.elements.address.value.trim()
          },
          destination: selectedDestination,
          items: [...cart.entries()].map(([id, quantity]) => ({ id, quantity })),
          shipping: {
            code: selectedRate.code,
            name: selectedRate.name,
            service: selectedRate.service || selectedRate.description,
            description: selectedRate.description,
            cost: Number(selectedRate.cost)
          }
        })
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !result.order) throw new Error(result.error || 'Pesanan belum berhasil disimpan.');
      showSummary(new FormData(form), result.order);
      setStatus(`Pesanan tersimpan. Kode pembayaran: ${result.order.paymentCode}`);
    } catch (error) {
      setStatus(error.message || 'Pesanan belum berhasil disimpan. Coba lagi.', true);
    } finally {
      isSubmittingOrder = false;
      submitButton.disabled = false;
      submitButton.innerHTML = `${originalButtonText} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>`;
    }
  });
  document.querySelector('#close-dialog').addEventListener('click', closeSummary);
  document.querySelector('#back-to-form').addEventListener('click', closeSummary);
  const proofFileInput = document.querySelector('#payment-proof-file');
  const proofUploadButton = document.querySelector('#upload-proof-button');
  const proofUploadStatus = document.querySelector('#proof-upload-status');
  proofFileInput.addEventListener('change', () => {
    proofUploadButton.disabled = !proofFileInput.files?.length;
    proofUploadStatus.textContent = proofFileInput.files?.length ? `Dipilih: ${proofFileInput.files[0].name}` : '';
  });
  proofUploadButton.addEventListener('click', async () => {
    const file = proofFileInput.files?.[0];
    if (!file || !currentOrder) return;
    const form = document.querySelector('#order-form');
    const upload = new FormData();
    upload.append('orderId', currentOrder.orderId);
    upload.append('paymentCode', currentOrder.paymentCode);
    upload.append('phone', form.elements.phone.value.trim());
    upload.append('proof', file, file.name);
    proofUploadButton.disabled = true;
    proofFileInput.disabled = true;
    proofUploadButton.textContent = 'Mengunggah...';
    proofUploadStatus.textContent = 'Mengunggah bukti pembayaran secara privat...';
    proofUploadStatus.classList.remove('error');
    try {
      const response = await fetch(`${API_BASE}/api/orders/proof`, { method: 'POST', body: upload });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Bukti belum berhasil diunggah.');
      proofUploadStatus.textContent = 'Bukti pembayaran tersimpan. Admin akan mencocokkannya dengan mutasi.';
      proofUploadButton.textContent = 'Bukti berhasil diunggah';
    } catch (error) {
      proofUploadStatus.textContent = error.message || 'Bukti belum berhasil diunggah. Coba lagi.';
      proofUploadStatus.classList.add('error');
      proofFileInput.disabled = false;
      proofUploadButton.disabled = false;
      proofUploadButton.textContent = 'Coba unggah lagi';
    }
  });
  dialogBackdrop.addEventListener('click', closeSummary);
  summaryDialog.addEventListener('close', () => { dialogBackdrop.hidden = true; });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSummary(); });
})();




