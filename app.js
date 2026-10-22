// -------------------------------------------------------------
// CLIMA Y GEOLOCALIZACIÓN (ROBUSTA Y SIN BLOQUEOS)
// -------------------------------------------------------------
async function obtenerClimaYUbicacion() {
  const badge = document.getElementById('climaTexto');
  if (badge) badge.innerText = "Consultando...";

  if (!navigator.geolocation) {
    cargarClimaPorIP();
    return;
  }

  // Opciones con timeout para evitar que se quede esperando eternamente
  const geoOpciones = {
    enableHighAccuracy: false,
    timeout: 6000,
    maximumAge: 300000 // 5 minutos de cache
  };

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      await consultarClima(lat, lon);
    },
    (err) => {
      console.warn("Fallo GPS o permiso denegado, usando respaldo:", err.message);
      // Respaldo automático sin pedir permisos: Geocodificación por IP
      cargarClimaPorIP();
    },
    geoOpciones
  );
}

// Respaldo que no requiere permisos de GPS (detecta ciudad por conexión)
async function cargarClimaPorIP() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    if (data.latitude && data.longitude) {
      ubicacionActualDetectada = data.city || data.region || "Chile";
      await consultarClima(data.latitude, data.longitude, ubicacionActualDetectada);
    } else {
      document.getElementById('climaTexto').innerText = "Vacaciones 🌴";
    }
  } catch (e) {
    document.getElementById('climaTexto').innerText = "Modo Vacaciones";
  }
}

async function consultarClima(lat, lon, ciudadNombre = null) {
  try {
    // 1. Obtener nombre de la comuna o ciudad (si no vino por IP)
    let ciudad = ciudadNombre;
    if (!ciudad) {
      try {
        const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`);
        const geoData = await geoRes.json();
        ciudad = geoData.locality || geoData.city || geoData.principalSubdivision || "Ubicación actual";
      } catch (e) {
        ciudad = "Ubicación actual";
      }
    }
    ubicacionActualDetectada = ciudad;

    // 2. Consultar Open-Meteo
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const weatherRes = await fetch(url);
    const weatherData = await weatherRes.json();

    const temp = Math.round(weatherData.current.temperature_2m);
    const code = weatherData.current.weather_code;
    const isDay = weatherData.current.is_day === 1;

    aplicarEstiloClima(code, isDay, temp, ciudad);
  } catch (err) {
    console.error("Error al procesar el clima:", err);
    document.getElementById('climaTexto').innerText = `${ubicacionActualDetectada} 🌴`;
  }
}

function aplicarEstiloClima(code, isDay, temp, ciudad) {
  const header = document.getElementById('headerClima');
  const badgeText = document.getElementById('climaTexto');
  if (!header || !badgeText) return;

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
