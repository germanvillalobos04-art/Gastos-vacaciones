// URL de Firebase y PIN de acceso
const FIREBASE_BASE_URL = "https://gastos-522f9-default-rtdb.firebaseio.com/";
const PIN_CORRECTO = "1610";

let chartInstance = null;
let presupuestoActual = 400000;
let gastosCache = {};
let ubicacionActualDetectada = "Chile";

function formatCLP(val) {
  return '$' + Number(val || 0).toLocaleString('es-CL');
}

function initIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Comprobación de PIN
function verificarPin() {
  const input = document.getElementById('pinInput');
  const errorMsg = document.getElementById('pinError');
  const pinScreen = document.getElementById('pinScreen');
  const appContainer = document.getElementById('appContainer');

  if (!input) return;

  if (input.value.trim() === PIN_CORRECTO) {
    localStorage.setItem('auth_vacaciones', PIN_CORRECTO);
    if (errorMsg) errorMsg.style.display = 'none';
    if (pinScreen) pinScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';

    initIcons();
    cargarDatos();
    obtenerClimaYUbicacion();
  } else {
    if (errorMsg) errorMsg.style.display = 'block';
  }
}

function cerrarSesion() {
  if (confirm("¿Deseas cerrar sesión en esta app?")) {
    localStorage.removeItem('auth_vacaciones');
    location.reload();
  }
}

// Auto-login al iniciar
window.addEventListener('DOMContentLoaded', () => {
  initIcons();
  
  const pinInput = document.getElementById('pinInput');
  if (pinInput) {
    pinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') verificarPin();
    });
  }

  if (localStorage.getItem('auth_vacaciones') === PIN_CORRECTO) {
    const pinScreen = document.getElementById('pinScreen');
    const appContainer = document.getElementById('appContainer');
    if (pinScreen) pinScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';
    
    cargarDatos();
    obtenerClimaYUbicacion();
  }
});

// -------------------------------------------------------------
// CLIMA, UBICACIÓN Y EFECTOS ANIMADOS
// -------------------------------------------------------------
async function obtenerClimaYUbicacion() {
  const badge = document.getElementById('climaTexto');
  if (!badge) return;

  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    
    const lat = data.latitude || -33.45;
    const lon = data.longitude || -70.66;
    const ciudad = data.city || data.region || "Chile";
    ubicacionActualDetectada = ciudad;

    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`);
    const weatherData = await weatherRes.json();

    const temp = Math.round(weatherData.current.temperature_2m);
    const code = weatherData.current.weather_code;
    const isDay = weatherData.current.is_day === 1;

    aplicarEstiloClima(code, isDay, temp, ciudad);
  } catch (e) {
    console.warn("Clima no disponible:", e);
    const b = document.getElementById('climaTexto');
    if (b) b.innerText = "Vacaciones 🌴";
  }
}

function aplicarEstiloClima(code, isDay, temp, ciudad) {
  const header = document.getElementById('headerClima');
  const badgeText = document.getElementById('climaTexto');
  const animContainer = document.getElementById('weatherAnimationLayer');
  if (!header || !badgeText) return;

  header.classList.remove('theme-sunny', 'theme-cloudy', 'theme-rainy', 'theme-night');
  if (animContainer) animContainer.innerHTML = '';

  let desc = "Despejado";
  let themeClass = "theme-sunny";

  if (!isDay) {
    themeClass = "theme-night";
    desc = "Noche";
    crearEstrellas(animContainer);
  } else if (code === 0 || code === 1) {
    themeClass = "theme-sunny";
    desc = "Soleado";
    crearSol(animContainer);
  } else if (code >= 2 && code <= 48) {
    themeClass = "theme-cloudy";
    desc = "Nublado";
    crearNubes(animContainer);
  } else if (code >= 51) {
    themeClass = "theme-rainy";
    desc = "Lluvia";
    crearLluvia(animContainer);
  }

  header.classList.add(themeClass);
  badgeText.innerText = `${ciudad} • ${temp}°C, ${desc}`;
  initIcons();
}

// Generadores de partículas animadas
function crearSol(container) {
  if (!container) return;
  const flare = document.createElement('div');
  flare.className = 'sun-flare';
  container.appendChild(flare);
}

function crearLluvia(container) {
  if (!container) return;
  for (let i = 0; i < 24; i++) {
    const drop = document.createElement('div');
    drop.className = 'rain-drop';
    drop.style.left = Math.random() * 100 + '%';
    drop.style.animationDelay = (Math.random() * 0.7) + 's';
    drop.style.animationDuration = (0.5 + Math.random() * 0.3) + 's';
    container.appendChild(drop);
  }
}

function crearNubes(container) {
  if (!container) return;
  for (let i = 0; i < 3; i++) {
    const cloud = document.createElement('div');
    cloud.className = 'cloud-shape';
    cloud.style.width = (90 + i * 40) + 'px';
    cloud.style.height = (28 + i * 10) + 'px';
    cloud.style.top = (15 + i * 35) + 'px';
    cloud.style.animationDelay = (i * 6) + 's';
    cloud.style.animationDuration = (16 + i * 4) + 's';
    container.appendChild(cloud);
  }
}

function crearEstrellas(container) {
  if (!container) return;
  for (let i = 0; i < 18; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = 1.5 + Math.random() * 2;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    star.style.left = Math.random() * 95 + '%';
    star.style.top = Math.random() * 85 + '%';
    star.style.animationDelay = (Math.random() * 3) + 's';
    container.appendChild(star);
  }
}

// -------------------------------------------------------------
// GESTIÓN DE DATOS EN FIREBASE
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
    
    const elPres = document.getElementById('presupuestoTotal');
    const elSaldo = document.getElementById('saldoDisponible');
    const elGastado = document.getElementById('chartTotalGastos');
    const elPagoEl = document.getElementById('pagoEl');
    const elPagoElla = document.getElementById('pagoElla');
    const elContador = document.getElementById('contadorMovimientos');

    if (elPres) elPres.innerText = formatCLP(presupuestoActual);
    if (elSaldo) elSaldo.innerText = formatCLP(saldoDisponible);
    if (elGastado) elGastado.innerText = formatCLP(totalGastado);
    if (elPagoEl) elPagoEl.innerText = formatCLP(totalEl);
    if (elPagoElla) elPagoElla.innerText = formatCLP(totalElla);
    if (elContador) elContador.innerText = lista.length + ' gastos';

    // Barra de consumo
    const pct = presupuestoActual > 0 ? Math.min(100, Math.round((totalGastado / presupuestoActual) * 100)) : 0;
    const bar = document.getElementById('progressBar');
    const pctTxt = document.getElementById('porcentajeTexto');
    if (bar) bar.style.width = pct + '%';
    if (pctTxt) pctTxt.innerText = pct + '% gastado del presupuesto';

    // Gráfico Dona
    const labels = Object.keys(categoriaTotales);
    const dataValues = Object.values(categoriaTotales);
    const chartEl = document.getElementById('gastosChart');

    if (chartEl && typeof Chart !== 'undefined') {
      const ctx = chartEl.getContext('2d');
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
    }

    // Lista de movimientos
    lista.reverse();
    const listaCont = document.getElementById('listaMovimientos');
    if (listaCont) {
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
    }
    initIcons();
  } catch (err) {
    console.error("Error cargando datos:", err);
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
  
  document.getElementById('ubicacionGasto').value = ubicacionActualDetectada;
  document.getElementById('ubicacionTextoModal').innerText = `Ubicación: ${ubicacionActualDetectada}`;

  document.getElementById('modalGasto').classList.add('active');
  initIcons();
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
  initIcons();
}

function cerrarModal() {
  const modal = document.getElementById('modalGasto');
  if (modal) modal.classList.remove('active');
}

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
