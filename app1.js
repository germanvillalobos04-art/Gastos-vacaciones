// Configuración
const FIREBASE_BASE_URL = "https://gastos-522f9-default-rtdb.firebaseio.com/";
const PIN_CORRECTO = "1610";

let chartInstance = null;
let cuentasCache = {};
let movimientosCache = {};
let ubicacionActualDetectada = "Chile";

function formatCLP(val) {
  return '$' + Number(val || 0).toLocaleString('es-CL');
}

function initIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
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
// GESTIÓN DE DATOS EN FIREBASE (CUENTAS Y GASTOS)
// -------------------------------------------------------------
async function cargarDatos() {
  try {
    // 1. Cargar Cuentas Bancarias
    const resCuentas = await fetch(FIREBASE_BASE_URL + "cuentas.json");
    const dataCuentas = await resCuentas.json();
    cuentasCache = dataCuentas || {};

    // Cuentas predeterminadas con sus nombres
    if (!dataCuentas || Object.keys(dataCuentas).length === 0) {
      const cuentasDefault = {
        c1: { nombre: "Mercado Pago", titular: "Germán", saldo: 150000 },
        c2: { nombre: "BCI Mach", titular: "Germán", saldo: 80000 },
        c3: { nombre: "BCI", titular: "Germán", saldo: 90000 },
        c4: { nombre: "Banco de Chile", titular: "Marcela", saldo: 80000 }
      };
      await fetch(FIREBASE_BASE_URL + "cuentas.json", {
        method: 'PUT',
        body: JSON.stringify(cuentasDefault)
      });
      cuentasCache = cuentasDefault;
    }

    // 2. Cargar Movimientos
    const resGastos = await fetch(FIREBASE_BASE_URL + "gastos.json");
    const movData = await resGastos.json();
    movimientosCache = movData || {};

    // Renderizar Cuentas y calcular total
    let totalGlobalDisponible = 0;
    let totalEl = 0;
    let totalElla = 0;
    const listaCuentasGerman = [];
    const listaCuentasMarcela = [];

    Object.keys(cuentasCache).forEach(key => {
      const c = cuentasCache[key];
      const s = Number(c.saldo) || 0;
      totalGlobalDisponible += s;

      // Compatibilidad con registros antiguos (Él / Ella) o nuevos (Germán / Marcela)
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
    document.getElementById('contadorCuentas').innerText = (listaCuentasGerman.length + listaCuentasMarcela.length) + ' cuentas';

    renderizarCuentasHTML(listaCuentasGerman, listaCuentasMarcela);
    actualizarSelectCuentas();

    // 3. Procesar Gastos y Categorías
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

function renderizarCuentasHTML(cuentasGerman, cuentasMarcela) {
  const cont = document.getElementById('contenedorCuentas');
  if (!cont) return;

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

function actualizarSelectCuentas() {
  const sel = document.getElementById('cuentaSeleccionada');
  if (!sel) return;

  sel.innerHTML = '';
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
// GESTIÓN DE CUENTAS
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
// GESTIÓN DE MOVIMIENTOS
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
    // Revertir saldo anterior si es edición
    if (id && cuentaPreviaId && cuentasCache[cuentaPreviaId]) {
      const prevAccount = cuentasCache[cuentaPreviaId];
      const ajuste = tipo === 'gasto' ? montoPrevio : -montoPrevio;
      prevAccount.saldo = Number(prevAccount.saldo) + ajuste;
      await fetch(`${FIREBASE_BASE_URL}cuentas/${cuentaPreviaId}.json`, {
        method: 'PUT',
        body: JSON.stringify(prevAccount)
      });
    }

    // Aplicar saldo a la cuenta seleccionada
    if (cuentaObj) {
      const delta = tipo === 'gasto' ? -montoNuevo : montoNuevo;
      cuentaObj.saldo = Number(cuentaObj.saldo) + delta;
      await fetch(`${FIREBASE_BASE_URL}cuentas/${cuentaId}.json`, {
        method: 'PUT',
        body: JSON.stringify(cuentaObj)
      });
    }

    // Guardar el registro
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
