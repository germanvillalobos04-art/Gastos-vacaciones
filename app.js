lucide.createIcons();

const FIREBASE_BASE_URL = "https://gastos-522f9-default-rtdb.firebaseio.com/";
const PIN_CORRECTO = "1610";

let chartInstance = null;
let presupuestoActual = 400000;
let gastosCache = {};
let ubicacionActualDetectada = "Chile";

function formatCLP(val) {
  return '$' + Number(val || 0).toLocaleString('es-CL');
}

// Iniciar sesión persistente
if (localStorage.getItem('auth_vacaciones') === PIN_CORRECTO) {
  document.getElementById('pinScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'block';
  window.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    obtenerClimaYUbicacion();
  });
}

function verificarPin() {
  const pin = document.getElementById('pinInput').value;
  if (pin === PIN_CORRECTO) {
    localStorage.setItem('auth_vacaciones', PIN_CORRECTO);
    document.getElementById('pinScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    cargarDatos();
    obtenerClimaYUbicacion();
  } else {
    document.getElementById('pinError').style.display = 'block';
  }
}

function cerrarSesion() {
  if (confirm("¿Deseas cerrar sesión en esta app?")) {
    localStorage.removeItem('auth_vacaciones');
    location.reload();
  }
}

// -------------------------------------------------------------
// CLIMA Y GEOLOCALIZACIÓN
// -------------------------------------------------------------
async function obtenerClimaYUbicacion() {
  if (!navigator.geolocation) {
    document.getElementById('climaTexto').innerText = "Clima no disponible";
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    try {
      // 1. Obtener nombre de la ciudad vía OpenStreetMap (Nominatim)
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
      const geoData = await geoRes.json();
      const ciudad = geoData.address.city || geoData.address.town || geoData.address.county || geoData.address.state || "Ubicación actual";
      ubicacionActualDetectada = ciudad;

      // 2. Obtener Clima en tiempo real vía Open-Meteo
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`);
      const weatherData = await weatherRes.json();

      const temp = Math.round(weatherData.current.temperature_2m);
      const code = weatherData.current.weather_code;
      const isDay = weatherData.current.is_day === 1;

      aplicarEstiloClima(code, isDay, temp, ciudad);
    } catch (e) {
      console.error("Error obteniendo clima:", e);
      document.getElementById('climaTexto').innerText = "Modo vacaciones";
    }
  }, (err) => {
    document.getElementById('climaTexto').innerText = "Ubicación desactivada";
  });
}

function aplicarEstiloClima(code, isDay, temp, ciudad) {
  const header = document.getElementById('headerClima');
  const badgeText = document.getElementById('climaTexto');
  header.classList.remove('theme-sunny', 'theme-cloudy', 'theme-rainy', 'theme-night');

  let desc = "Despejado";
  let themeClass = "theme-sunny";

  if (!isDay) {
    themeClass = "theme-night";
    desc = "Noche";
  } else if (code === 0 || code === 1) {
    themeClass = "theme-sunny";
    desc = "Soleado";
  } else if (code >= 2 && code <= 48) {
    themeClass = "theme-cloudy";
    desc = "Nublado";
  } else if (code >= 51) {
    themeClass = "theme-rainy";
    desc = "Lluvia";
  }

  header.classList.add(themeClass);
  badgeText.innerText = `${ciudad} • ${temp}°C, ${desc}`;
  lucide.createIcons();
}

// -------------------------------------------------------------
// GESTIÓN DE DATOS (FIREBASE)
// -------------------------------------------------------------
async function cargarDatos() {
  try {
    const resPres = await fetch(FIREBASE_BASE_URL + "presupuesto.json");
    const presData = await resPres.json();
    if (presData) presupuestoActual = Number(presData);

    const resGastos = await fetch(FIREBASE_BASE_URL + "gastos.json");
    const gastosData = await resGastos.json();
    gastosCache = gastosData || {};

    let totalGastado = 0;
    let totalEl = 0;
    let totalElla = 0;
    const categoriaTotales = {};
    const lista = [];

    if (gastosData) {
      Object.keys(gastosData).forEach(key => {
        const g = gastosData[key];
        const m = Number(g.monto) || 0;
        totalGastado += m;
        categoriaTotales[g.categoria] = (categoriaTotales[g.categoria] || 0) + m;
        
        if (g.pagador === 'Él') totalEl += m;
        else if (g.pagador === 'Ella') totalElla += m;
        else if (g.pagador === 'Ambos') { totalEl += m / 2; totalElla += m / 2; }

        lista.push({ ...g, id: key });
      });
    }

    const saldoDisponible = presupuestoActual - totalGastado;
    document.getElementById('presupuestoTotal').innerText = formatCLP(presupuestoActual);
    document.getElementById('saldoDisponible').innerText = formatCLP(saldoDisponible);
    document.getElementById('chartTotalGastos').innerText = formatCLP(totalGastado);
    document.getElementById('pagoEl').innerText = formatCLP(totalEl);
    document.getElementById('pagoElla').innerText = formatCLP(totalElla);
    document.getElementById('contadorMovimientos').innerText = lista.length + ' gastos';

    const pct = presupuestoActual > 0 ? Math.min(100, Math.round((totalGastado / presupuestoActual) * 100)) : 0;
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('porcentajeTexto').innerText = pct + '% gastado del presupuesto';

    const labels = Object.keys(categoriaTotales);
    const dataValues = Object.values(categoriaTotales);

    const ctx = document.getElementById('gastosChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues.length > 0 ? dataValues : [1],
          backgroundColor: ['#e63946', '#457b9d', '#2a9d8f', '#e76f51', '#f4a261', '#9a8c98'],
          borderWidth: 0,
          cutout: '75%'
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });

    lista.reverse();
    const listaCont = document.getElementById('listaMovimientos');
    if (lista.length === 0) {
      listaCont.innerHTML = '<div style="text-align:center; padding:15px; color:#9ca3af;">Aún no hay movimientos registrados</div>';
    } else {
      listaCont.innerHTML = lista.map(m => `
        <div class="movement-item" onclick="abrirModalEditar('${m.id}')">
          <div>
            <div class="movement-desc">${m.descripcion}</div>
            <div class="movement-sub">
              <span>${m.fecha || 'Hoy'}</span> • 
              <span>${m.categoria} (${m.pagador})</span>
              ${m.ubicacion ? ` • <span>📍 ${m.ubicacion}</span>` : ''}
            </div>
            <div class="tap-hint">Tocar para editar / borrar</div>
          </div>
          <div class="movement-amount">-${formatCLP(m.monto)}</div>
        </div>
      `).join('');
    }
    lucide.createIcons();
  } catch (err) {
    console.error("Error al cargar datos:", err);
  }
}

async function editarPresupuesto() {
  const nuevo = prompt("Ingresa el presupuesto total de vacaciones ($):", presupuestoActual);
  if (nuevo && !isNaN(nuevo)) {
    await fetch(FIREBASE_BASE_URL + "presupuesto.json", {
      method: 'PUT',
      body: JSON.stringify(Number(nuevo))
    });
    cargarDatos();
  }
}

function abrirModalNuevo() {
  document.getElementById('modalTitulo').innerText = "Añadir Nuevo Gasto";
  document.getElementById('btnGuardar').innerText = "Guardar Gasto";
  document.getElementById('btnBorrar').style.display = "none";
  document.getElementById('gastoForm').reset();
  document.getElementById('gastoId').value = "";
  
  const hoy = new Date();
  document.getElementById('fechaGasto').value = hoy.getDate().toString().padStart(2, '0') + '/' + (hoy.getMonth() + 1).toString().padStart(2, '0');
  
  // Asignar ubicación detectada
  document.getElementById('ubicacionGasto').value = ubicacionActualDetectada;
  document.getElementById('ubicacionTextoModal').innerText = `Ubicación: ${ubicacionActualDetectada}`;

  document.getElementById('modalGasto').classList.add('active');
  lucide.createIcons();
}

function abrirModalEditar(id) {
  const item = gastosCache[id];
  if (!item) return;

  document.getElementById('modalTitulo').innerText = "Editar Gasto";
  document.getElementById('btnGuardar').innerText = "Actualizar Gasto";
  document.getElementById('btnBorrar').style.display = "flex";

  document.getElementById('gastoId').value = id;
  document.getElementById('monto').value = item.monto;
  document.getElementById('descripcion').value = item.descripcion;
  document.getElementById('categoria').value = item.categoria;
  document.getElementById('pagador').value = item.pagador;
  document.getElementById('metodo').value = item.metodo || 'Tarjeta';
  document.getElementById('fechaGasto').value = item.fecha || '';
  
  const ubic = item.ubicacion || 'Sin ubicación';
  document.getElementById('ubicacionGasto').value = item.ubicacion || '';
  document.getElementById('ubicacionTextoModal').innerText = `Ubicación: ${ubic}`;

  document.getElementById('modalGasto').classList.add('active');
  lucide.createIcons();
}

function cerrarModal() { document.getElementById('modalGasto').classList.remove('active'); }

async function guardarGasto(e) {
  e.preventDefault();
  const btn = document.getElementById('btnGuardar');
  btn.innerText = 'Guardando...';
  btn.disabled = true;

  const id = document.getElementById('gastoId').value;
  const payload = {
    monto: Number(document.getElementById('monto').value),
    descripcion: document.getElementById('descripcion').value,
    categoria: document.getElementById('categoria').value,
    pagador: document.getElementById('pagador').value,
    metodo: document.getElementById('metodo').value,
    fecha: document.getElementById('fechaGasto').value,
    ubicacion: document.getElementById('ubicacionGasto').value || ubicacionActualDetectada
  };

  try {
    if (id) {
      await fetch(`${FIREBASE_BASE_URL}gastos/${id}.json`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      await fetch(FIREBASE_BASE_URL + "gastos.json", {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
    btn.innerText = 'Guardado';
    btn.disabled = false;
    cerrarModal();
    cargarDatos();
  } catch (err) {
    btn.innerText = 'Error al guardar';
    btn.disabled = false;
  }
}

async function eliminarGastoActual() {
  const id = document.getElementById('gastoId').value;
  if (!id) return;
  if (confirm("¿Estás seguro de que deseas eliminar este gasto?")) {
    await fetch(`${FIREBASE_BASE_URL}gastos/${id}.json`, {
      method: 'DELETE'
    });
    cerrarModal();
    cargarDatos();
  }
}
