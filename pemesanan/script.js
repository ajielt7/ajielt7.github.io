(() => {
  const form = document.querySelector('#order-form');
  const status = document.querySelector('#form-status');
  const summaryDialog = document.querySelector('#summary-dialog');
  const dialogBackdrop = document.querySelector('#dialog-backdrop');
  const productList = [
    ['minimalis', 'Nomor Rumah Minimalis', 75000, '20 � 10 cm', 'PALING DIMINATI'],
    ['premium', 'Nomor Rumah Premium', 120000, '30 � 15 cm', 'UKURAN BESAR'],
    ['custom', 'Nomor Rumah Custom', 150000, 'Ukuran sesuai pesanan', 'BEBAS CUSTOM'],
    ['akrilik-hitam', 'Akrilik Hitam Elegan', 85000, '20 � 10 cm', 'WARNA HITAM'],
    ['akrilik-putih', 'Akrilik Putih Minimal', 85000, '20 � 10 cm', 'WARNA PUTIH'],
    ['akrilik-emas', 'Akrilik Nuansa Emas', 95000, '20 � 10 cm', 'AKSEN EMAS'],
    ['akrilik-silver', 'Akrilik Silver Modern', 95000, '20 � 10 cm', 'AKSEN SILVER'],
    ['nomor-timbul', 'Nomor Timbul 3D', 135000, '30 � 15 cm', 'MODEL TIMBUL'],
    ['nomor-dobel', 'Nomor Lapis Ganda', 165000, '30 � 15 cm', 'DUA LAPIS'],
    ['nomor-led', 'Nomor Rumah LED', 250000, '30 � 15 cm', 'DENGAN LAMPU'],
    ['nomor-jalan', 'Nomor + Nama Jalan', 185000, '30 � 15 cm', 'PAKET LENGKAP'],
    ['nomor-keluarga', 'Nomor + Nama Keluarga', 175000, '30 � 15 cm', 'PERSONAL']
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
  let quoteTimer = null;
  let quoteController = null;
  let quoteRequestId = 0;
  let orderRequestId = null;
  let isSubmittingOrder = false;

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
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'cart-empty';
      empty.innerHTML = 'Belum ada produk dipilih.<br>Klik tombol �Pilih� pada produk.';
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
    scheduleShippingQuote();
  }
function scheduleShippingQuote() {
    if (!selectedDestination || cart.size === 0) {
      if (quoteController) quoteController.abort();
      return;
    }
    setStatus('Alamat tujuan dipilih. Menyiapkan perbandingan ongkir�');
    quoteTimer = setTimeout(calculateShipping, 700);
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
          orderRequestId = null;
          if (quoteController) quoteController.abort();
          quoteRequestId += 1;
          document.querySelector('#destination-search').value = selectedDestination.label;
          document.querySelector('#destination-id').value = selectedDestination.id;
          results.replaceChildren();
          document.querySelector('#shipping-rates').replaceChildren();
          selectedRate = null;
          scheduleShippingQuote();
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
    clearTimeout(quoteTimer);
    if (quoteController) quoteController.abort();
    quoteController = new AbortController();
    const requestId = ++quoteRequestId;
    const rates = document.querySelector('#shipping-rates');
    selectedRate = null;
    rates.replaceChildren();
    try {
      const response = await fetch(`${API_BASE}/api/shipping-cost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationId: selectedDestination.id, items: [...cart.entries()].map(([id, quantity]) => ({ id, quantity })) }),
        signal: quoteController.signal
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Ongkir belum dapat dihitung.');
      if (requestId !== quoteRequestId) return;
      const options = (result.data || []).filter((option) => Number.isFinite(Number(option.cost)) && Number(option.cost) >= 0)
        .map((option) => {
          const serviceInfo = [option.name, option.code, option.service, option.description, option.category, option.service_type].join(' ').toLocaleLowerCase('id-ID');
          return { ...option, shippingCategory: /(cargo|kargo|trucking|jtr|big.?pack|freight)/.test(serviceInfo) ? 'cargo' : 'regular' };
        })
        .sort((a, b) => Number(a.cost) - Number(b.cost));
      if (!options.length) throw new Error('Belum ada layanan ekspedisi untuk alamat ini.');
      const courierMap = new Map();
      options.forEach((option) => {
        const key = String(option.code || option.name || 'kurir').trim().toLocaleLowerCase('id-ID');
        if (!courierMap.has(key)) courierMap.set(key, { key, name: option.name || option.code || 'Kurir', options: [] });
        courierMap.get(key).options.push(option);
      });
      const couriers = [...courierMap.values()]
        .map((courier) => ({ ...courier, options: courier.options.sort((a, b) => Number(a.cost) - Number(b.cost)) }))
        .sort((a, b) => Number(a.options[0].cost) - Number(b.options[0].cost));
      selectedRate = couriers[0].options[0];
      const cheapestCourier = couriers[0];
      const regularAlternatives = couriers.filter((courier) => courier !== cheapestCourier && courier.options.some((option) => option.shippingCategory === 'regular')).slice(0, 2);
      const cargoAlternative = couriers.find((courier) => courier !== cheapestCourier && courier.options.some((option) => option.shippingCategory === 'cargo'));
      const recommendedCouriers = [...new Set([cheapestCourier, ...regularAlternatives, cargoAlternative].filter(Boolean))]
        .sort((a, b) => Number(a.options[0].cost) - Number(b.options[0].cost));
      const otherCouriers = couriers.filter((courier) => !recommendedCouriers.includes(courier));
      let selectedCourier = cheapestCourier;
      selectedRate = cheapestCourier.options[0];

      const picker = document.createElement('details'); picker.className = 'shipping-courier-picker';
      const pickerSummary = document.createElement('summary'); pickerSummary.className = 'shipping-picker-summary';
      const pickerCopy = document.createElement('span'); pickerCopy.className = 'shipping-picker-copy';
      const pickerName = document.createElement('strong');
      const pickerPrice = document.createElement('small');
      pickerCopy.append(pickerName, pickerPrice);
      const pickerBadge = document.createElement('small'); pickerBadge.className = 'shipping-cheapest-badge'; pickerBadge.textContent = 'Termurah';
      pickerSummary.append(pickerCopy, pickerBadge);
      const pickerMenu = document.createElement('div'); pickerMenu.className = 'shipping-picker-menu';
      picker.append(pickerSummary, pickerMenu);
      const services = document.createElement('div'); services.className = 'shipping-services';
      rates.append(picker, services);

      const renderServices = (courier) => {
        services.replaceChildren(...courier.options.map((option, serviceIndex) => {
          const label = document.createElement('label'); label.className = 'shipping-rate-option';
          const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'shippingRate'; radio.value = `${courier.key}-${serviceIndex}`; radio.required = true;
          radio.checked = option === selectedRate;
          label.classList.toggle('selected', radio.checked);
          radio.addEventListener('change', () => {
            selectedRate = option;
            orderRequestId = null;
            services.querySelectorAll('.shipping-rate-option').forEach((rateLabel) => rateLabel.classList.remove('selected'));
            label.classList.add('selected');
            pickerPrice.textContent = `${option.service || option.description || option.name || option.code} - ${formatRupiah(Number(option.cost))}`;
            services.hidden = true;
            setStatus(`Pilihan ${pickerName.textContent} - ${formatRupiah(Number(option.cost))} tersimpan. Klik dropdown untuk mengganti kurir atau layanan.`);
          });
          const copy = document.createElement('span'); copy.className = 'shipping-rate-copy';
          const title = document.createElement('strong'); title.textContent = `${option.service || option.description || option.name || option.code}${option.shippingCategory === 'cargo' ? ' - Kargo' : ''}`;
          const detail = document.createElement('small'); detail.textContent = [serviceIndex === 0 ? 'Layanan termurah kurir ini' : '', option.description, option.etd ? `Estimasi ${option.etd}` : ''].filter(Boolean).join(' / ');
          const price = document.createElement('strong'); price.className = 'shipping-rate-price'; price.textContent = formatRupiah(Number(option.cost));
          copy.append(title, detail); label.append(radio, copy, price); return label;
        }));
      };
      const chooseCourier = (courier, revealServices = true) => {
        orderRequestId = null;
        selectedRate = courier.options[0];
        const isCheapest = courier === cheapestCourier;
        pickerName.textContent = courier.name;
        pickerPrice.textContent = `Mulai ${formatRupiah(Number(courier.options[0].cost))}`;
        pickerBadge.textContent = isCheapest ? 'Termurah' : courier.options.some((option) => option.shippingCategory === 'cargo') ? 'Kargo tersedia' : 'Rekomendasi';
        pickerBadge.hidden = !isCheapest && !courier.options.some((option) => option.shippingCategory === 'cargo');
        picker.open = false;
        renderServices(courier);
        services.hidden = !revealServices;
        setStatus(`Kurir ${courier.name} dipilih. Pilih layanan dan harga pengiriman di bawah.`);
      };
      const renderCourierChoice = (courier) => {
        const choice = document.createElement('button'); choice.type = 'button'; choice.className = 'shipping-courier-choice';
        const name = document.createElement('strong'); name.textContent = courier.name;
        const cost = document.createElement('span'); cost.textContent = formatRupiah(Number(courier.options[0].cost));
        const detail = document.createElement('small');
        detail.textContent = courier === cheapestCourier ? 'Termurah' : courier.options.some((option) => option.shippingCategory === 'cargo') ? 'Kargo tersedia' : 'Rekomendasi';
        choice.append(name, cost, detail);
        choice.addEventListener('click', () => chooseCourier(courier));
        return choice;
      };
      pickerMenu.append(...recommendedCouriers.map(renderCourierChoice));
      if (otherCouriers.length) {
        const more = document.createElement('details'); more.className = 'shipping-picker-more';
        const moreSummary = document.createElement('summary'); moreSummary.textContent = `Kurir lainnya (${otherCouriers.length})`;
        more.append(moreSummary, ...otherCouriers.map(renderCourierChoice));
        pickerMenu.append(more);
      }
      chooseCourier(cheapestCourier, false);
      picker.open = false;
      const weightNote = document.createElement('p'); weightNote.className = 'shipping-result-note';
      weightNote.textContent = `Pilihan termurah dipilih otomatis. Tarif dihitung untuk estimasi berat ${new Intl.NumberFormat('id-ID').format(result.weightGrams)} gram. Ketersediaan layanan kargo mengikuti rute dan hasil RajaOngkir.`;
      rates.append(weightNote);
      setStatus('Tarif termurah dipilih otomatis. Anda bisa memilih jasa kirim atau layanan kargo lain yang tersedia.');
    } catch (error) {
      if (error.name === 'AbortError' || requestId !== quoteRequestId) return;
      const message = document.createElement('p'); message.className = 'shipping-error'; message.textContent = error.message || 'Layanan RajaOngkir sedang tidak tersedia.';
      rates.replaceChildren(message);
      setStatus(error.message || 'Ongkir belum dapat dihitung.', true);
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

  function showSummary(data, savedOrder) {
    const cartDescription = [...cart.entries()].map(([id, quantity]) =>
      `${products[id].name} � ${quantity} � ${formatRupiah(products[id].price * quantity)}`
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
    warning.textContent = `Pesanan sudah disimpan. Cantumkan kode ${savedOrder.paymentCode} pada deskripsi transfer. Informasi rekening dan upload bukti akan ditambahkan pada tahap pembayaran berikutnya.`;
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
    clearTimeout(quoteTimer);
    if (quoteController) quoteController.abort();
    quoteRequestId += 1;
    selectedDestination = null;
    selectedRate = null;
    document.querySelector('#destination-id').value = '';
    document.querySelector('#destination-results').replaceChildren();
    document.querySelector('#shipping-rates').replaceChildren();
    const search = destinationInput.value.trim();
    clearTimeout(searchTimer);
    if (search.length >= 3) searchTimer = setTimeout(() => searchDestinations(search), 350);
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
    if (!selectedDestination) {
      setStatus('Pilih kelurahan, kecamatan, atau kota dari hasil pencarian terlebih dahulu.', true);
      destinationInput.focus();
      return;
    }
    if (!selectedRate) {
      setStatus('Tunggu estimasi ongkir selesai, lalu pilih salah satu layanan pengiriman.', true);
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
  dialogBackdrop.addEventListener('click', closeSummary);
  summaryDialog.addEventListener('close', () => { dialogBackdrop.hidden = true; });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSummary(); });
})();
