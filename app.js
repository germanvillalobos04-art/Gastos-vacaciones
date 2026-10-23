// Configuración
const FIREBASE_BASE_URL = "https://gastos-522f9-default-rtdb.firebaseio.com/";
const PIN_CORRECTO = "1610";

let chartInstance = null;
let cuentasCache = {};
let movimientosCache = {};
let creditosCache = {};
let tarjetasCreditoCache = {};
let ubicacionActualDetectada = "Chile";

function formatCLP(val) {
  return '$' + Number(val || 0).toLocaleString('es-CL');
}

function initIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Navegación entre pestañas permanentes
function cambiarPestana(tab) {
  const tabInicio = document.getElementById('tabInicio');
  const tabCreditos = document.getElementById('tabCreditos');
  const btnInicio = document.getElementById('btnNavInicio');
  const btnCreditos = document.getElementById('btnNavCreditos');

  if (tab === 'inicio') {
    tabInicio.style.display = 'block';
    tabCreditos.style.display = 'none';
    btnInicio.classList.add('active');
    btnCreditos.classList.remove('active');
  } else {
    tabInicio.style.display = 'none';
    tabCreditos.style.display = 'block';
    btnInicio.classList.remove('active');
    btnCreditos.classList.add('active');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  initIcons();
}

// Control de PIN
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

// Iniciar sesión persistente
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
// CLIMA Y ANIMACIONES
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
// GESTIÓN Y CARGA DE DATOS EN FIREBASE
// -------------------------------------------------------------
async function cargarDatos() {
  try {
    // 1. Cuentas de Débito/Efectivo
    const resCuentas = await fetch(FIREBASE_BASE_URL + "cuentas.json");
    const dataCuentas = await resCuentas.json();
    cuentasCache = dataCuentas || {};

    if (!dataCuentas || Object.keys(dataCuentas).length === 0) {
      const cuentasDefault = {
        c1: { nombre: "Mercado Pago", titular: "Germán", saldo: 150000 },
        c2: { nombre: "BCI Mach", titular: "Germán", saldo: 80000 },
        c3: { nombre: "BCI", titular: "Germán", saldo: 94413 },
        c4: { nombre: "Banco de Chile", titular: "Marcela", saldo: 0 }
      };
      await fetch(FIREBASE_BASE_URL + "cuentas.json", {
        method: 'PUT',
        body: JSON.stringify(cuentasDefault)
      });
      cuentasCache = cuentasDefault;
    }

    // 2. Tarjetas y Cuentas de Crédito
    const resTarjetas = await fetch(FIREBASE_BASE_URL + "tarjetas_credito.json");
    const dataTarjetas = await resTarjetas.json();
    tarjetasCreditoCache = dataTarjetas || {};

    // 3. Créditos en Cuotas
    const resCreditos = await fetch(FIREBASE_BASE_URL + "creditos.json");
    const dataCreditos = await resCreditos.json();
    creditosCache = dataCreditos || {};

    // 4. Movimientos
    const resGastos = await fetch(FIREBASE_BASE_URL + "gastos.json");
    const movData = await resGastos.json();
    movimientosCache = movData || {};

    // --- Procesar Cuentas de Inicio (Débito/Efectivo) ---
    let totalGlobalDisponible = 0;
    let totalEl = 0;
    let totalElla = 0;
    const listaCuentasGerman = [];
    const listaCuentasMarcela = [];

    Object.keys(cuentasCache).forEach(key => {
      const c = cuentasCache[key];
      const s = Number(c.saldo) || 0;
      totalGlobalDisponible += s;

      if (c.titular === 'Marcela' || c.titular === 'Ella') {
        totalElla += s;
        listaCuentasMarcela.push({ ...c, id: key });
      } else {
        totalEl += s;
        listaCuentasGerman.push({ ...c, id: key });
      }
    });

    document.getElementById('saldoDisponible').innerText = formatCLP(totalGlobalDisponible);
    document.getElementById('totalEl').innerText = formatCLP(totalEl);
    document.getElementById('totalElla').innerText = formatCLP(totalElla);
    
    const contCuentas = document.getElementById('contadorCuentas');
    if (contCuentas) contCuentas.innerText = (listaCuentasGerman.length + listaCuentasMarcela.length) + ' cuentas';

    renderizarCuentasInicioHTML(listaCuentasGerman, listaCuentasMarcela);
    actualizarSelectCuentas();

    // --- Procesar Cuentas de Crédito (Pantalla Créditos) ---
    let totalCupoDisponible = 0;
    let cupoEl = 0;
    let cupoElla = 0;
    const listaTarjetasGerman = [];
    const listaTarjetasMarcela = [];

    Object.keys(tarjetasCreditoCache).forEach(key => {
      const tc = tarjetasCreditoCache[key];
      const disp = Number(tc.cupoDisponible) || 0;
      totalCupoDisponible += disp;

      if (tc.titular === 'Marcela') {
        cupoElla += disp;
        listaTarjetasMarcela.push({ ...tc, id: key });
      } else {
        cupoEl += disp;
        listaTarjetasGerman.push({ ...tc, id: key });
      }
    });

    document.getElementById('cupoTotalDisponible').innerText = formatCLP(totalCupoDisponible);
    document.getElementById('cupoGerman').innerText = formatCLP(cupoEl);
    document.getElementById('cupoMarcela').innerText = formatCLP(cupoElla);

    const contTarjetas = document.getElementById('contadorTarjetasCredito');
    if (contTarjetas) contTarjetas.innerText = (listaTarjetasGerman.length + listaTarjetasMarcela.length) + ' tarjetas';

    renderizarTarjetasCreditoHTML(listaTarjetasGerman, listaTarjetasMarcela);

    // --- Procesar Créditos en Cuotas ---
    renderizarCreditosHTML();

    // --- Procesar Gastos y Categorías ---
    let totalGastado = 0;
    const categoriaTotales = {};
    const listaMovimientos = [];

    if (movData) {
      Object.keys(movData).forEach(key => {
        const item = movData[key];
        const m = Number(item.monto) || 0;
        const tipo = item.tipo || 'gasto';

        if (tipo === 'gasto') {
          totalGastado += m;
          categoriaTotales[item.categoria] = (categoriaTotales[item.categoria] || 0) + m;
        }

        listaMovimientos.push({ ...item, id: key });
      });
    }

    document.getElementById('chartTotalGastos').innerText = formatCLP(totalGastado);
    document.getElementById('contadorMovimientos').innerText = listaMovimientos.length + ' movimientos';

    // Gráfico de Dona
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

    // Lista de Movimientos
    listaMovimientos.reverse();
    const listaCont = document.getElementById('listaMovimientos');
    if (listaCont) {
      if (listaMovimientos.length === 0) {
        listaCont.innerHTML = '<div style="text-align:center; padding:15px; color:#9ca3af;">Aún no hay movimientos registrados</div>';
      } else {
        listaCont.innerHTML = listaMovimientos.map(m => {
          const esIngreso = m.tipo === 'ingreso';
          const signo = esIngreso ? '+' : '-';
          const claseMonto = esIngreso ? 'movement-amount-income' : 'movement-amount-expense';
          const nombreCuenta = m.cuentaNombre ? ` • 💳 ${m.cuentaNombre}` : '';

          return `
            <div class="movement-item" onclick="abrirModalEditar('${m.id}')">
              <div>
                <div class="movement-desc">${m.descripcion}</div>
                <div class="movement-sub">
                  <span>${m.fecha || 'Hoy'}</span> • 
                  <span>${m.categoria}</span>
                  ${nombreCuenta}
                  ${m.ubicacion ? ` • <span>📍 ${m.ubicacion}</span>` : ''}
                </div>
                <div class="tap-hint">Tocar para editar / borrar</div>
              </div>
              <div class="${claseMonto}">${signo}${formatCLP(m.monto)}</div>
            </div>
          `;
        }).join('');
      }
    }
    initIcons();
  } catch (err) {
    console.error("Error cargando datos:", err);
  }
}

// Render Cuentas en Pantalla de Inicio
function renderizarCuentasInicioHTML(cuentasGerman, cuentasMarcela) {
  const cont = document.getElementById('contenedorCuentas');
  if (!cont) return;

  if (cuentasGerman.length === 0 && cuentasMarcela.length === 0) {
    cont.innerHTML = '<div style="text-align:center; padding: 15px; color: #9ca3af;">No hay cuentas agregadas</div>';
    return;
  }

  let html = '';

  if (cuentasGerman.length > 0) {
    html += '<div class="accounts-section-title">Cuentas de Germán</div>';
    cuentasGerman.forEach(c => {
      html += `
        <div class="account-item" onclick="abrirModalEditarCuenta('${c.id}')">
          <div>
            <div class="account-name"><i data-lucide="wallet" style="width:16px;height:16px;color:#0056b3;"></i> ${c.nombre}</div>
            <div class="account-sub">Titular: Germán</div>
          </div>
          <div class="account-balance">${formatCLP(c.saldo)}</div>
        </div>
      `;
    });
  }

  if (cuentasMarcela.length > 0) {
    html += '<div class="accounts-section-title" style="margin-top:14px;">Cuentas de Marcela</div>';
    cuentasMarcela.forEach(c => {
      html += `
        <div class="account-item" onclick="abrirModalEditarCuenta('${c.id}')">
          <div>
            <div class="account-name"><i data-lucide="wallet" style="width:16px;height:16px;color:#0056b3;"></i> ${c.nombre}</div>
            <div class="account-sub">Titular: Marcela</div>
          </div>
          <div class="account-balance">${formatCLP(c.saldo)}</div>
        </div>
      `;
    });
  }

  cont.innerHTML = html;
}

// Render Cuentas y Tarjetas de Crédito
function renderizarTarjetasCreditoHTML(tarjetasGerman, tarjetasMarcela) {
  const cont = document.getElementById('contenedorCuentasCredito');
  if (!cont) return;

  if (tarjetasGerman.length === 0 && tarjetasMarcela.length === 0) {
    cont.innerHTML = '<div style="text-align:center; padding: 15px; color: #9ca3af;">No hay tarjetas de crédito registradas</div>';
    return;
  }

  let html = '';

  if (tarjetasGerman.length > 0) {
    html += '<div class="accounts-section-title">Tarjetas de Germán</div>';
    tarjetasGerman.forEach(tc => {
      const utilizado = Number(tc.cupoTotal) - Number(tc.cupoDisponible);
      html += `
        <div class="account-item" onclick="abrirModalEditarCuentaCredito('${tc.id}')">
          <div>
            <div class="account-name"><i data-lucide="credit-card" style="width:16px;height:16px;color:#0056b3;"></i> ${tc.nombre}</div>
            <div class="account-sub">Cupo Total: ${formatCLP(tc.cupoTotal)} • Utilizado: ${formatCLP(utilizado)}</div>
          </div>
          <div style="text-align:right;">
            <div class="account-balance">${formatCLP(tc.cupoDisponible)}</div>
            <div style="font-size:0.68rem; color:#10b981; font-weight:600;">Disponible</div>
          </div>
        </div>
      `;
    });
  }

  if (tarjetasMarcela.length > 0) {
    html += '<div class="accounts-section-title" style="margin-top:14px;">Tarjetas de Marcela</div>';
    tarjetasMarcela.forEach(tc => {
      const utilizado = Number(tc.cupoTotal) - Number(tc.cupoDisponible);
      html += `
        <div class="account-item" onclick="abrirModalEditarCuentaCredito('${tc.id}')">
          <div>
            <div class="account-name"><i data-lucide="credit-card" style="width:16px;height:16px;color:#0056b3;"></i> ${tc.nombre}</div>
            <div class="account-sub">Cupo Total: ${formatCLP(tc.cupoTotal)} • Utilizado: ${formatCLP(utilizado)}</div>
          </div>
          <div style="text-align:right;">
            <div class="account-balance">${formatCLP(tc.cupoDisponible)}</div>
            <div style="font-size:0.68rem; color:#10b981; font-weight:600;">Disponible</div>
          </div>
        </div>
      `;
    });
  }

  cont.innerHTML = html;
}

// Render Créditos en Cuotas
function renderizarCreditosHTML() {
  const cont = document.getElementById('contenedorCreditos');
  const contador = document.getElementById('contadorCreditos');
  const totalDeudaEl = document.getElementById('totalDeudaCreditos');
  if (!cont) return;

  const ids = Object.keys(creditosCache);
  if (contador) contador.innerText = ids.length + ' activos';

  let deudaAcumulada = 0;

  if (ids.length === 0) {
    cont.innerHTML = '<div style="text-align:center; padding: 15px; color: #9ca3af;">No hay créditos registrados aún</div>';
    if (totalDeudaEl) totalDeudaEl.innerText = "$0";
    return;
  }

  let html = '';
  ids.forEach(key => {
    const cr = creditosCache[key];
    const totalCuotas = Number(cr.cuotasTotales) || 1;
    const pagadas = Number(cr.cuotasPagadas) || 0;
    const valorCuota = Number(cr.valorCuota) || 0;
    const restantes = Math.max(0, totalCuotas - pagadas);
    const deudaRestante = restantes * valorCuota;
    deudaAcumulada += deudaRestante;
    const pct = Math.min(100, Math.round((pagadas / totalCuotas) * 100));

    html += `
      <div class="credit-card-item">
        <div class="credit-header">
          <div>
            <div class="credit-title">${cr.nombre}</div>
            <div style="font-size: 0.75rem; color: #6b7280; margin-top:2px;">Titular: ${cr.titular}</div>
          </div>
          <span class="credit-badge">${pagadas}/${totalCuotas} cuotas</span>
        </div>

        <div class="credit-progress-bg">
          <div class="credit-progress-fill" style="width: ${pct}%;"></div>
        </div>
        <div style="font-size: 0.72rem; color: #6b7280; text-align: right;">${pct}% amortizado</div>

        <div class="credit-info-grid">
          <div>
            <div class="credit-info-label">Deuda Restante</div>
            <div class="credit-info-val" style="color:#e63946;">${formatCLP(deudaRestante)}</div>
          </div>
          <div>
            <div class="credit-info-label">Valor Cuota</div>
            <div class="credit-info-val">${formatCLP(valorCuota)}</div>
          </div>
        </div>

        <div class="credit-actions">
          ${restantes > 0 ? `
            <button class="pay-installment-btn" onclick="pagarCuotaCredito('${key}')">
              <i data-lucide="check-circle" style="width:16px;height:16px;"></i> Pagar Cuota (${pagadas + 1}/${totalCuotas})
            </button>
          ` : `
            <div style="flex:1; text-align:center; padding:8px; font-weight:700; color:#10b981; font-size:0.85rem;">
              ✅ Crédito Pagado
            </div>
          `}
          <button class="edit-credit-btn" onclick="abrirModalEditarCredito('${key}')">Editar</button>
        </div>
      </div>
    `;
  });

  if (totalDeudaEl) totalDeudaEl.innerText = formatCLP(deudaAcumulada);
  cont.innerHTML = html;
}

function actualizarSelectCuentas() {
  const sel = document.getElementById('cuentaSeleccionada');
  if (!sel) return;

  sel.innerHTML = '';
  // Agregar cuentas de débito
  Object.keys(cuentasCache).forEach(key => {
    const c = cuentasCache[key];
    const titularLabel = (c.titular === 'Ella' || c.titular === 'Marcela') ? 'Marcela' : 'Germán';
    const opt = document.createElement('option');
    opt.value = key;
    opt.text = `${c.nombre} (${titularLabel}) - Saldo: ${formatCLP(c.saldo)}`;
    sel.appendChild(opt);
  });
}

// -------------------------------------------------------------
// GESTIÓN DE CUENTAS BANCARIAS (DÉBITO / EFECTIVO)
// -------------------------------------------------------------
function abrirModalCuenta() {
  document.getElementById('cuentaForm').reset();
  document.getElementById('cuentaId').value = "";
  document.getElementById('modalCuentaTitulo').innerText = "Agregar Cuenta Bancaria";
  document.getElementById('btnGuardarCuenta').innerText = "Guardar Cuenta";
  document.getElementById('btnBorrarCuenta').style.display = "none";
  document.getElementById('modalCuenta').classList.add('active');
}

function abrirModalEditarCuenta(id) {
  const c = cuentasCache[id];
  if (!c) return;

  document.getElementById('cuentaId').value = id;
  document.getElementById('nombreCuenta').value = c.nombre;
  document.getElementById('titularCuenta').value = (c.titular === 'Ella' || c.titular === 'Marcela') ? 'Marcela' : 'Germán';
  document.getElementById('saldoCuenta').value = c.saldo;

  document.getElementById('modalCuentaTitulo').innerText = "Editar Cuenta";
  document.getElementById('btnGuardarCuenta').innerText = "Actualizar Cuenta";
  document.getElementById('btnBorrarCuenta').style.display = "flex";
  document.getElementById('modalCuenta').classList.add('active');
  initIcons();
}

async function guardarCuenta(e) {
  e.preventDefault();
  const btn = document.getElementById('btnGuardarCuenta');
  btn.innerText = 'Guardando...';
  btn.disabled = true;

  const id = document.getElementById('cuentaId').value;
  const payload = {
    nombre: document.getElementById('nombreCuenta').value,
    titular: document.getElementById('titularCuenta').value,
    saldo: Number(document.getElementById('saldoCuenta').value)
  };

  try {
    if (id) {
      await fetch(`${FIREBASE_BASE_URL}cuentas/${id}.json`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      await fetch(FIREBASE_BASE_URL + "cuentas.json", {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
    btn.innerText = 'Guardado';
    btn.disabled = false;
    cerrarModal('modalCuenta');
    cargarDatos();
  } catch (err) {
    btn.innerText = 'Error al guardar';
    btn.disabled = false;
  }
}

async function eliminarCuentaActual() {
  const id = document.getElementById('cuentaId').value;
  if (!id) return;
  if (confirm("¿Estás seguro de que deseas eliminar esta cuenta?")) {
    await fetch(`${FIREBASE_BASE_URL}cuentas/${id}.json`, {
      method: 'DELETE'
    });
    cerrarModal('modalCuenta');
    cargarDatos();
  }
}

// -------------------------------------------------------------
// GESTIÓN DE TARJETAS Y CUENTAS DE CRÉDITO
// -------------------------------------------------------------
function abrirModalCuentaCredito() {
  document.getElementById('cuentaCreditoForm').reset();
  document.getElementById('cuentaCreditoId').value = "";
  document.getElementById('modalCuentaCreditoTitulo').innerText = "Agregar Tarjeta de Crédito";
  document.getElementById('btnGuardarTarjetaCredito').innerText = "Guardar Tarjeta";
  document.getElementById('btnBorrarTarjetaCredito').style.display = "none";
  document.getElementById('modalCuentaCredito').classList.add('active');
}

function abrirModalEditarCuentaCredito(id) {
  const tc = tarjetasCreditoCache[id];
  if (!tc) return;

  document.getElementById('cuentaCreditoId').value = id;
  document.getElementById('nombreTarjetaCredito').value = tc.nombre;
  document.getElementById('titularTarjetaCredito').value = tc.titular;
  document.getElementById('cupoTotalTarjeta').value = tc.cupoTotal;
  document.getElementById('cupoDisponibleTarjeta').value = tc.cupoDisponible;

  document.getElementById('modalCuentaCreditoTitulo').innerText = "Editar Tarjeta";
  document.getElementById('btnGuardarTarjetaCredito').innerText = "Actualizar Tarjeta";
  document.getElementById('btnBorrarTarjetaCredito').style.display = "flex";
  document.getElementById('modalCuentaCredito').classList.add('active');
  initIcons();
}

async function guardarCuentaCredito(e) {
  e.preventDefault();
  const btn = document.getElementById('btnGuardarTarjetaCredito');
  btn.innerText = 'Guardando...';
  btn.disabled = true;

  const id = document.getElementById('cuentaCreditoId').value;
  const payload = {
    nombre: document.getElementById('nombreTarjetaCredito').value,
    titular: document.getElementById('titularTarjetaCredito').value,
    cupoTotal: Number(document.getElementById('cupoTotalTarjeta').value),
    cupoDisponible: Number(document.getElementById('cupoDisponibleTarjeta').value)
  };

  try {
    if (id) {
      await fetch(`${FIREBASE_BASE_URL}tarjetas_credito/${id}.json`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      await fetch(FIREBASE_BASE_URL + "tarjetas_credito.json", {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
    btn.innerText = 'Guardado';
    btn.disabled = false;
    cerrarModal('modalCuentaCredito');
    cargarDatos();
  } catch (err) {
    btn.innerText = 'Error al guardar';
    btn.disabled = false;
  }
}

async function eliminarCuentaCreditoActual() {
  const id = document.getElementById('cuentaCreditoId').value;
  if (!id) return;
  if (confirm("¿Estás seguro de que deseas eliminar esta tarjeta de crédito?")) {
    await fetch(`${FIREBASE_BASE_URL}tarjetas_credito/${id}.json`, {
      method: 'DELETE'
    });
    cerrarModal('modalCuentaCredito');
    cargarDatos();
  }
}

// -------------------------------------------------------------
// GESTIÓN DE CRÉDITOS EN CUOTAS
// -------------------------------------------------------------
function abrirModalCredito() {
  document.getElementById('creditoForm').reset();
  document.getElementById('creditoId').value = "";
  document.getElementById('modalCreditoTitulo').innerText = "Registrar Crédito";
  document.getElementById('btnGuardarCredito').innerText = "Guardar Crédito";
  document.getElementById('btnBorrarCredito').style.display = "none";
  document.getElementById('modalCredito').classList.add('active');
}

function abrirModalEditarCredito(id) {
  const cr = creditosCache[id];
  if (!cr) return;

  document.getElementById('creditoId').value = id;
  document.getElementById('nombreCredito').value = cr.nombre;
  document.getElementById('titularCredito').value = cr.titular;
  document.getElementById('montoTotalCredito').value = cr.montoTotal;
  document.getElementById('cuotasTotales').value = cr.cuotasTotales;
  document.getElementById('cuotasPagadas').value = cr.cuotasPagadas;
  document.getElementById('valorCuota').value = cr.valorCuota;

  document.getElementById('modalCreditoTitulo').innerText = "Editar Crédito";
  document.getElementById('btnGuardarCredito').innerText = "Actualizar Crédito";
  document.getElementById('btnBorrarCredito').style.display = "flex";
  document.getElementById('modalCredito').classList.add('active');
  initIcons();
}

async function guardarCredito(e) {
  e.preventDefault();
  const btn = document.getElementById('btnGuardarCredito');
  btn.innerText = 'Guardando...';
  btn.disabled = true;

  const id = document.getElementById('creditoId').value;
  const payload = {
    nombre: document.getElementById('nombreCredito').value,
    titular: document.getElementById('titularCredito').value,
    montoTotal: Number(document.getElementById('montoTotalCredito').value),
    cuotasTotales: Number(document.getElementById('cuotasTotales').value),
    cuotasPagadas: Number(document.getElementById('cuotasPagadas').value),
    valorCuota: Number(document.getElementById('valorCuota').value)
  };

  try {
    if (id) {
      await fetch(`${FIREBASE_BASE_URL}creditos/${id}.json`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      await fetch(FIREBASE_BASE_URL + "creditos.json", {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
    btn.innerText = 'Guardado';
    btn.disabled = false;
    cerrarModal('modalCredito');
    cargarDatos();
  } catch (err) {
    btn.innerText = 'Error al guardar';
    btn.disabled = false;
  }
}

async function eliminarCreditoActual() {
  const id = document.getElementById('creditoId').value;
  if (!id) return;
  if (confirm("¿Estás seguro de que deseas eliminar este crédito?")) {
    await fetch(`${FIREBASE_BASE_URL}creditos/${id}.json`, {
      method: 'DELETE'
    });
    cerrarModal('modalCredito');
    cargarDatos();
  }
}

async function pagarCuotaCredito(creditoId) {
  const cr = creditosCache[creditoId];
  if (!cr) return;

  const cuentasKeys = Object.keys(cuentasCache);
  if (cuentasKeys.length === 0) {
    alert("No tienes cuentas de débito registradas para pagar la cuota.");
    return;
  }

  let mensajeCuentas = "Selecciona el número de la cuenta desde donde se pagará la cuota:\n";
  cuentasKeys.forEach((k, idx) => {
    mensajeCuentas += `${idx + 1}. ${cuentasCache[k].nombre} (${cuentasCache[k].titular}) - Saldo: ${formatCLP(cuentasCache[k].saldo)}\n`;
  });

  const seleccion = prompt(mensajeCuentas, "1");
  if (!seleccion) return;

  const idxCuenta = parseInt(seleccion) - 1;
  const cuentaKey = cuentasKeys[idxCuenta];
  if (!cuentaKey || !cuentasCache[cuentaKey]) {
    alert("Opción inválida.");
    return;
  }

  const cuentaSeleccionada = cuentasCache[cuentaKey];
  const valorCuota = Number(cr.valorCuota);
  const nuevaCuotaPagada = Number(cr.cuotasPagadas) + 1;

  cuentaSeleccionada.saldo = Number(cuentaSeleccionada.saldo) - valorCuota;
  await fetch(`${FIREBASE_BASE_URL}cuentas/${cuentaKey}.json`, {
    method: 'PUT',
    body: JSON.stringify(cuentaSeleccionada)
  });

  cr.cuotasPagadas = nuevaCuotaPagada;
  await fetch(`${FIREBASE_BASE_URL}creditos/${creditoId}.json`, {
    method: 'PUT',
    body: JSON.stringify(cr)
  });

  const hoy = new Date();
  const fechaStr = hoy.getDate().toString().padStart(2, '0') + '/' + (hoy.getMonth() + 1).toString().padStart(2, '0');

  const gastoMov = {
    tipo: 'gasto',
    monto: valorCuota,
    cuentaId: cuentaKey,
    cuentaNombre: cuentaSeleccionada.nombre,
    pagador: cuentaSeleccionada.titular,
    descripcion: `Cuota ${nuevaCuotaPagada}/${cr.cuotasTotales} • ${cr.nombre}`,
    categoria: 'Créditos y Cuotas',
    metodo: 'Transferencia',
    fecha: fechaStr,
    ubicacion: ubicacionActualDetectada
  };

  await fetch(FIREBASE_BASE_URL + "gastos.json", {
    method: 'POST',
    body: JSON.stringify(gastoMov)
  });

  alert(`¡Cuota ${nuevaCuotaPagada}/${cr.cuotasTotales} pagada! Se descontaron ${formatCLP(valorCuota)} de ${cuentaSeleccionada.nombre}`);
  cargarDatos();
}

// -------------------------------------------------------------
// GESTIÓN DE MOVIMIENTOS (GASTOS E INGRESOS)
// -------------------------------------------------------------
function abrirModalNuevo(tipo = 'gasto') {
  document.getElementById('gastoForm').reset();
  document.getElementById('movimientoId').value = "";
  document.getElementById('tipoMovimiento').value = tipo;
  document.getElementById('cuentaPreviaId').value = "";
  document.getElementById('montoPrevio').value = "0";
  document.getElementById('btnBorrar').style.display = "none";
  
  const titulo = document.getElementById('modalTitulo');
  const btn = document.getElementById('btnGuardar');
  const grupoCat = document.getElementById('grupoCategoria');
  const labelDesc = document.getElementById('labelDescripcion');
  const labelCuenta = document.getElementById('labelCuenta');

  if (tipo === 'ingreso') {
    titulo.innerText = "Añadir Ingreso";
    btn.innerText = "Guardar Ingreso";
    btn.classList.add('income-btn');
    grupoCat.style.display = "none";
    labelDesc.innerText = "Motivo del ingreso";
    document.getElementById('descripcion').placeholder = "Ej: Sueldo, depósito o transferencia";
    labelCuenta.innerText = "¿A qué cuenta entra el dinero?";
  } else {
    titulo.innerText = "Añadir Nuevo Gasto";
    btn.innerText = "Guardar Gasto";
    btn.classList.remove('income-btn');
    grupoCat.style.display = "block";
    labelDesc.innerText = "Descripción";
    document.getElementById('descripcion').placeholder = "Ej: Almuerzo costanera";
    labelCuenta.innerText = "¿De qué cuenta sale el dinero?";
  }

  const hoy = new Date();
  document.getElementById('fechaGasto').value = hoy.getDate().toString().padStart(2, '0') + '/' + (hoy.getMonth() + 1).toString().padStart(2, '0');
  
  document.getElementById('ubicacionGasto').value = ubicacionActualDetectada;
  document.getElementById('ubicacionTextoModal').innerText = `Ubicación: ${ubicacionActualDetectada}`;

  document.getElementById('modalGasto').classList.add('active');
  initIcons();
}

function abrirModalEditar(id) {
  const item = movimientosCache[id];
  if (!item) return;

  const tipo = item.tipo || 'gasto';
  document.getElementById('movimientoId').value = id;
  document.getElementById('tipoMovimiento').value = tipo;
  document.getElementById('cuentaPreviaId').value = item.cuentaId || '';
  document.getElementById('montoPrevio').value = item.monto || 0;

  document.getElementById('monto').value = item.monto;
  document.getElementById('descripcion').value = item.descripcion;
  document.getElementById('metodo').value = item.metodo || 'Tarjeta';
  document.getElementById('fechaGasto').value = item.fecha || '';
  if (item.cuentaId) document.getElementById('cuentaSeleccionada').value = item.cuentaId;

  const titulo = document.getElementById('modalTitulo');
  const btn = document.getElementById('btnGuardar');
  const grupoCat = document.getElementById('grupoCategoria');
  const labelDesc = document.getElementById('labelDescripcion');
  const labelCuenta = document.getElementById('labelCuenta');

  if (tipo === 'ingreso') {
    titulo.innerText = "Editar Ingreso";
    btn.innerText = "Actualizar Ingreso";
    btn.classList.add('income-btn');
    grupoCat.style.display = "none";
    labelDesc.innerText = "Motivo del ingreso";
    labelCuenta.innerText = "¿A qué cuenta entró el dinero?";
  } else {
    titulo.innerText = "Editar Gasto";
    btn.innerText = "Actualizar Gasto";
    btn.classList.remove('income-btn');
    grupoCat.style.display = "block";
    document.getElementById('categoria').value = item.categoria;
    labelDesc.innerText = "Descripción";
    labelCuenta.innerText = "¿De qué cuenta salió el dinero?";
  }

  document.getElementById('btnBorrar').style.display = "flex";

  const ubic = item.ubicacion || 'Sin ubicación';
  document.getElementById('ubicacionGasto').value = item.ubicacion || '';
  document.getElementById('ubicacionTextoModal').innerText = `Ubicación: ${ubic}`;

  document.getElementById('modalGasto').classList.add('active');
  initIcons();
}

function cerrarModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

async function guardarMovimiento(e) {
  e.preventDefault();
  const btn = document.getElementById('btnGuardar');
  btn.innerText = 'Guardando...';
  btn.disabled = true;

  const id = document.getElementById('movimientoId').value;
  const tipo = document.getElementById('tipoMovimiento').value;
  const montoNuevo = Number(document.getElementById('monto').value);
  const cuentaId = document.getElementById('cuentaSeleccionada').value;
  const cuentaObj = cuentasCache[cuentaId];
  const nombreCuenta = cuentaObj ? cuentaObj.nombre : 'General';
  const titular = cuentaObj ? cuentaObj.titular : 'Ambos';

  const cuentaPreviaId = document.getElementById('cuentaPreviaId').value;
  const montoPrevio = Number(document.getElementById('montoPrevio').value) || 0;

  const payload = {
    tipo: tipo,
    monto: montoNuevo,
    cuentaId: cuentaId,
    cuentaNombre: nombreCuenta,
    pagador: titular,
    descripcion: document.getElementById('descripcion').value,
    categoria: tipo === 'ingreso' ? 'Ingreso' : document.getElementById('categoria').value,
    metodo: document.getElementById('metodo').value,
    fecha: document.getElementById('fechaGasto').value,
    ubicacion: document.getElementById('ubicacionGasto').value || ubicacionActualDetectada
  };

  try {
    if (id && cuentaPreviaId && cuentasCache[cuentaPreviaId]) {
      const prevAccount = cuentasCache[cuentaPreviaId];
      const ajuste = tipo === 'gasto' ? montoPrevio : -montoPrevio;
      prevAccount.saldo = Number(prevAccount.saldo) + ajuste;
      await fetch(`${FIREBASE_BASE_URL}cuentas/${cuentaPreviaId}.json`, {
        method: 'PUT',
        body: JSON.stringify(prevAccount)
      });
    }

    if (cuentaObj) {
      const delta = tipo === 'gasto' ? -montoNuevo : montoNuevo;
      cuentaObj.saldo = Number(cuentaObj.saldo) + delta;
      await fetch(`${FIREBASE_BASE_URL}cuentas/${cuentaId}.json`, {
        method: 'PUT',
        body: JSON.stringify(cuentaObj)
      });
    }

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
    cerrarModal('modalGasto');
    cargarDatos();
  } catch (err) {
    btn.innerText = 'Error al guardar';
    btn.disabled = false;
  }
}

async function eliminarMovimientoActual() {
  const id = document.getElementById('movimientoId').value;
  if (!id) return;
  if (confirm("¿Estás seguro de que deseas eliminar este registro?")) {
    const item = movimientosCache[id];
    if (item && item.cuentaId && cuentasCache[item.cuentaId]) {
      const acc = cuentasCache[item.cuentaId];
      const ajuste = item.tipo === 'gasto' ? Number(item.monto) : -Number(item.monto);
      acc.saldo = Number(acc.saldo) + ajuste;
      await fetch(`${FIREBASE_BASE_URL}cuentas/${item.cuentaId}.json`, {
        method: 'PUT',
        body: JSON.stringify(acc)
      });
    }

    await fetch(`${FIREBASE_BASE_URL}gastos/${id}.json`, {
      method: 'DELETE'
    });
    cerrarModal('modalGasto');
    cargarDatos();
  }
}
