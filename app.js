// app.js - Punto de entrada principal
// Refactorizado para funcionar sin modulos (file://)

window.LoveMap = window.LoveMap || {};

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Iniciando Nuestros Momentos...");

    // 1. Inicializar Base de Datos
    await window.LoveMap.db.init();
    
    // 2. Inicializar Mapa
    // Callback para cuando se selecciona ubicación en el mapa: window.LoveMap.ui.updateLocation
    window.LoveMap.map.init(40.4168, -3.7038, window.LoveMap.ui.updateLocation);

    // 3. Inicializar UI
    window.LoveMap.ui.init();

    // 4. Cargar y mostrar marcadores existentes
    const moments = window.LoveMap.db.getMoments();
    if (moments.length > 0) {
        console.log(`Cargando ${moments.length} momentos...`);
        window.LoveMap.map.renderMarkers(moments);
    }
});
