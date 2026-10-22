(() => {
  const form = document.querySelector('#order-form');
  const status = document.querySelector('#form-status');
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
  const API_BASE = 'https://pemesanan-api.ajielt7.workers.dev';
  let selectedDestination = null;
  let selectedRate = null;
  let searchTimer = null;
  let searchController = null;

  const formatRupiah = (amount) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(amount);

  function renderCart() {
    selectedRate = null;
    document.querySelector('#shipping-rates').replaceChildren();
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
        const name = document.createElement('strong'); name.textContent = product.name;
        const price = document.createElement('span'); price.className = 'cart-line-price';
        price.textContent = formatRupiah(product.price * quantity);
        const controls = document.createElement('div'); controls.className = 'cart-line-controls';
        const minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '−';
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
    updateQuoteButton();
  }

  function updateQuoteButton() {
    document.querySelector('#shipping-quote-button').disabled = cart.size === 0 || !selectedDestination;
  }

  function destinationLabel(item) {
    return item.label || [item.subdistrict, item.district, item.city, item.province, item.zip_code].filter(Boolean).join(', ');
  }

  async function searchDestinations(search) {
    const results = document.querySelector('#destination-results');
    if (searchController) searchController.abort();
    searchController = new AbortController();
    try {
      const cacheSearch = search.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
      const response = await fetch(`${API_BASE}/api/destinations?search=${encodeURIComponent(cacheSearch)}`, { signal: searchController.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Pencarian lokasi gagal.');
      results.replaceChildren();
      if (!result.data?.length) {
        const empty = document.createElement('span'); empty.className = 'destination-empty'; empty.textContent = 'Lokasi tidak ditemukan.';
        results.append(empty);
        return;
      }
      result.data.forEach((location) => {
        const option = document.createElement('button'); option.type = 'button'; option.className = 'destination-option';
        option.setAttribute('role', 'option'); option.textContent = destinationLabel(location);
        option.addEventListener('click', () => {
          selectedDestination = { id: String(location.id), label: destinationLabel(location) };
          document.querySelector('#destination-search').value = selectedDestination.label;
          document.querySelector('#destination-id').value = selectedDestination.id;
          results.replaceChildren();
          document.querySelector('#shipping-rates').replaceChildren();
          selectedRate = null;
          updateQuoteButton();
          setStatus('Lokasi tujuan dipilih. Hitung ongkir untuk melihat tarif JNE dan J&T.');
        });
        results.append(option);
      });
    } catch (error) {
      if (error.name === 'AbortError') return;
      results.replaceChildren();
      setStatus(error.message || 'Layanan pencarian lokasi sedang tidak tersedia.', true);
    }
  }

  async function calculateShipping() {
    if (!selectedDestination || cart.size === 0) return;
    const button = document.querySelector('#shipping-quote-button');
    const rates = document.querySelector('#shipping-rates');
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Menghitung ongkir…';
    selectedRate = null;
    rates.replaceChildren();
    try {
      const response = await fetch(`${API_BASE}/api/shipping-cost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationId: selectedDestination.id, items: [...cart.entries()].map(([id, quantity]) => ({ id, quantity })) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Ongkir belum dapat dihitung.');
      if (!result.data?.length) throw new Error('Tidak ada layanan JNE atau J&T untuk alamat ini.');
      result.data.forEach((option, index) => {
        const label = document.createElement('label'); label.className = 'shipping-rate-option';
        const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'shippingRate'; radio.value = String(index); radio.required = true;
        radio.addEventListener('change', () => { selectedRate = option; });
        const copy = document.createElement('span'); copy.className = 'shipping-rate-copy';
        const title = document.createElement('strong'); title.textContent = `${option.name || option.code} ${option.service || ''}`.trim();
        const detail = document.createElement('small'); detail.textContent = [option.description, option.etd ? `Estimasi ${option.etd}` : ''].filter(Boolean).join(' · ');
        const price = document.createElement('strong'); price.className = 'shipping-rate-price'; price.textContent = formatRupiah(Number(option.cost));
        copy.append(title, detail); label.append(radio, copy, price); rates.append(label);
      });
      const weightNote = document.createElement('p'); weightNote.className = 'shipping-result-note';
      weightNote.textContent = `Tarif dihitung untuk estimasi berat ${new Intl.NumberFormat('id-ID').format(result.weightGrams)} gram.`;
      rates.append(weightNote);
      setStatus('Pilih salah satu layanan agar ongkir masuk ke ringkasan.');
    } catch (error) {
      const message = document.createElement('p'); message.className = 'shipping-error'; message.textContent = error.message || 'Layanan RajaOngkir sedang tidak tersedia.';
      rates.replaceChildren(message);
      setStatus(error.message || 'Ongkir belum dapat dihitung.', true);
    } finally {
      button.innerHTML = '<i class="fa-solid fa-truck-fast" aria-hidden="true"></i> Hitung ulang ongkir JNE / J&T';
      updateQuoteButton();
    }
  }

  function renderProducts() {
    const list = document.querySelector('#product-list');
    list.replaceChildren(...productList.map((product) => {
      const card = document.createElement('article'); card.className = 'product-card';
      const image = document.createElement('img'); image.src = product.image; image.alt = product.name; image.loading = 'lazy';
      const body = document.createElement('div'); body.className = 'product-card-body';
      const badge = document.createElement('span'); badge.className = 'product-tag product-tag-light'; badge.textContent = product.badge;
      const title = document.createElement('h3'); title.textContent = product.name;
      const description = document.createElement('p'); description.textContent = 'Nomor rumah akrilik, dibuat sesuai pilihan Anda.';
      const bottom = document.createElement('div'); bottom.className = 'product-card-bottom';
      const price = document.createElement('strong'); price.textContent = formatRupiah(product.price);
      const button = document.createElement('button'); button.type = 'button'; button.className = 'add-product';
      button.setAttribute('aria-label', `Pilih ${product.name}`); button.innerHTML = 'Pilih <i class="fa-solid fa-plus" aria-hidden="true"></i>';
      button.addEventListener('click', () => { cart.set(product.id, Math.min(20, (cart.get(product.id) || 0) + 1)); renderCart(); });
      bottom.append(price, button);
      const size = document.createElement('small'); size.textContent = `Contoh: ${product.size}`;
      body.append(badge, title, description, bottom, size); card.append(image, body);
      return card;
    }));
  }

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('error', isError);
  }

  function showSummary(data) {
    const cartDescription = [...cart.entries()].map(([id, quantity]) =>
      `${products[id].name} × ${quantity} — ${formatRupiah(products[id].price * quantity)}`
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
      ['Ongkir', formatRupiah(Number(selectedRate.cost))],
      ['Total sementara', formatRupiah(subtotal + Number(selectedRate.cost))]
    ];
    const summary = document.querySelector('#summary-content');
    summary.replaceChildren(...rows.map(([label, value]) => {
      const row = document.createElement('div'); row.className = 'summary-row';
      const key = document.createElement('span'); key.textContent = label;
      const val = document.createElement('span'); val.textContent = value;
      row.append(key, val); return row;
    }));
    dialogBackdrop.hidden = false;
    summaryDialog.showModal();
  }

  function closeSummary() {
    if (summaryDialog.open) summaryDialog.close();
    dialogBackdrop.hidden = true;
  }

  renderProducts();
  const destinationInput = document.querySelector('#destination-search');
  destinationInput.addEventListener('input', () => {
    if (searchController) searchController.abort();
    selectedDestination = null;
    selectedRate = null;
    document.querySelector('#destination-id').value = '';
    document.querySelector('#destination-results').replaceChildren();
    document.querySelector('#shipping-rates').replaceChildren();
    updateQuoteButton();
    const search = destinationInput.value.trim();
    clearTimeout(searchTimer);
    if (search.length >= 3) searchTimer = setTimeout(() => searchDestinations(search), 350);
  });
  document.querySelector('#shipping-quote-button').addEventListener('click', calculateShipping);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    setStatus('');
    if (!form.reportValidity()) return;
    if (cart.size === 0) {
      setStatus('Pilih setidaknya satu produk dari daftar terlebih dahulu.', true);
      document.querySelector('#product-list').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!selectedDestination) {
      setStatus('Pilih kelurahan, kecamatan, atau kota dari hasil pencarian terlebih dahulu.', true);
      destinationInput.focus();
      return;
    }
    if (!selectedRate) {
      setStatus('Hitung ongkir dan pilih layanan JNE atau J&T terlebih dahulu.', true);
      document.querySelector('#shipping-quote-button').scrollIntoView({ behavior: 'smooth', block: 'center' });
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

