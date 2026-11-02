(() => {
  const API_BASE = 'https://pemesanan-api.ajielt7.workers.dev';
  const form = document.querySelector('#status-form');
  const button = document.querySelector('#lookup-button');
  const message = document.querySelector('#form-message');
  const result = document.querySelector('#result');
  const labels = {
    MENUNGGU_PEMBAYARAN: 'Menunggu pembayaran',
    MENUNGGU_VERIFIKASI: 'Bukti pembayaran sedang diperiksa',
    DIPROSES: 'Pesanan sedang dibuat / diproses',
    SELESAI: 'Pesanan selesai diproses'
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    button.disabled = true;
    button.textContent = 'Mencari pesanan...';
    message.textContent = '';
    result.hidden = true;
    try {
      const response = await fetch(`${API_BASE}/api/orders/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentCode: form.elements.paymentCode.value.trim() })
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.order) throw new Error(data.error || 'Status pesanan gagal dimuat.');
      renderOrder(data.order);
    } catch (error) {
      message.textContent = error.message || 'Periksa koneksi lalu coba lagi.';
    } finally {
      button.disabled = false;
      button.textContent = 'Lihat status pesanan';
    }
  });
  function renderOrder(order) {
    const statuses = Object.keys(labels);
    const current = statuses.indexOf(order.status);
    const heading = document.createElement('h2');
    heading.textContent = labels[order.status] || 'Status pesanan';
    const code = document.createElement('p');
    code.className = 'code';
    code.textContent = `Kode pesanan ${order.paymentCode}`;
    const steps = document.createElement('ol');
    steps.className = 'steps';
    statuses.forEach((status, index) => {
      const item = document.createElement('li');
      if (index <= current) item.className = 'done';
      item.textContent = labels[status];
      steps.append(item);
    });
    result.replaceChildren(heading, code, steps);
    if (order.courierName && current >= 2) {
      const courier = document.createElement('p');
      courier.className = 'courier';
      courier.textContent = `Kurir: ${[order.courierName, order.courierService].filter(Boolean).join(' · ')}`;
      result.append(courier);
    }
    if (order.trackingUrl && current >= 2) {
      try {
        const url = new URL(order.trackingUrl);
        if (url.protocol === 'https:') {
          const link = document.createElement('a');
          link.className = 'tracking';
          link.href = url.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'Lacak pengiriman di situs kurir';
          result.append(link);
        }
      } catch (_) { /* Ignore malformed tracking links. */ }
    } else if (current >= 2) {
      const note = document.createElement('p');
      note.className = 'courier';
      note.textContent = 'Tautan pelacakan akan muncul setelah pesanan diserahkan ke kurir.';
      result.append(note);
    }
    result.hidden = false;
  }
})();

