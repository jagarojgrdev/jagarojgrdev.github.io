// map.js - Lógica del mapa V5 (Fix Popup Events)

window.LoveMap = window.LoveMap || {};

(function() {
    let map = null;
    let markersCluster = null; 
    let tempMarker = null;

    const DEFAULT_ICON = '❤️';

    function getCategoryIcon(categoryName) {
        if (!window.LoveMap.ui || !window.LoveMap.ui.CATEGORIES) return DEFAULT_ICON;
        const cat = window.LoveMap.ui.CATEGORIES.find(c => c.name === categoryName);
        return cat ? cat.icon : DEFAULT_ICON;
    }

    function createEmojiIcon(emoji) {
        return L.divIcon({
            className: 'emoji-marker-wrapper', 
            html: `<div class="emoji-marker-icon">${emoji}</div>`,
            iconSize: [40, 40], 
            iconAnchor: [20, 20] 
        });
    }

    function createTempIcon() {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="background:#ff4081; width:15px; height:15px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px black;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    }

    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; 
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    function initMap(lat = 40.4168, lng = -3.7038) {
        map = L.map('map', { zoomControl: false }).setView([lat, lng], 6);
        L.control.zoom({ position: 'topleft' }).addTo(map);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        markersCluster = L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 50,
            iconCreateFunction: function(cluster) {
                return L.divIcon({ 
                    html: `<div class="custom-cluster">${cluster.getChildCount()}</div>`, 
                    className: 'custom-cluster-wrapper', 
                    iconSize: [40, 40] 
                });
            }
        });
        map.addLayer(markersCluster);

        map.on('click', handleMapClick);
    }

    function handleMapClick(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        let closestMoment = null;
        let minDist = 25; 
        const moments = window.LoveMap.db.getMoments(); 

        moments.forEach(moment => {
            const dist = getDistance(lat, lng, moment.lat, moment.lng);
            if (dist < minDist) {
                minDist = dist;
                closestMoment = moment;
            }
        });

        if (closestMoment) {
            if (window.LoveMap.ui && window.LoveMap.ui.openMomentModal) {
                window.LoveMap.ui.openMomentModal(closestMoment);
                map.flyTo([closestMoment.lat, closestMoment.lng], 15);
            }
        } else {
            // New Moment Logic
            if (tempMarker) map.removeLayer(tempMarker); 
            
            tempMarker = L.marker([lat, lng], { icon: createTempIcon() }).addTo(map);
            
            const popupContent = `
                <div class="confirm-popup-body">
                    <div class="confirm-title">¿Añadir momento aquí?</div>
                    <div class="popup-confirm-actions">
                        <button id="btn-popup-no" class="btn-popup btn-popup-no">No</button>
                        <button id="btn-popup-yes" class="btn-popup btn-popup-yes">Sí</button>
                    </div>
                </div>
            `;
            
            // 1. Bind Popup
            tempMarker.bindPopup(popupContent, { 
                closeButton: false, 
                offset: [0, -10],
                className: 'confirm-popup',
                autoClose: false // Keep open until explicitly processed
            });

            // 2. Setup Event Listeners BEFORE opening (listening for open event)
            tempMarker.on('popupopen', () => {
                setTimeout(() => { // Tiny delay to ensure DOM is ready
                    const btnYes = document.getElementById('btn-popup-yes');
                    const btnNo = document.getElementById('btn-popup-no');

                    if (btnYes) {
                        btnYes.onclick = (e) => {
                            e.stopPropagation(); // Avoid map click propagation
                            removeTempMarker();
                            if (window.LoveMap.ui) window.LoveMap.ui.openCreationModal(lat, lng);
                        };
                    }

                    if (btnNo) {
                        btnNo.onclick = (e) => {
                            e.stopPropagation();
                            removeTempMarker();
                        };
                    }
                }, 10);
            });

            // 3. Close event to cleanup if user clicks away
            tempMarker.on('popupclose', () => {
                // removeTempMarker(); // Optional: remove pin if popup closes? User choice. Let's keep it until explicitly closed or mapped.
                // Actually if user clicks elsewhere, handleMapClick runs, removing old tempMarker anyway.
            });

            // 4. Open
            tempMarker.openPopup();
            map.flyTo([lat, lng], 15);
        }
    }

    function removeTempMarker() {
        if (tempMarker && map) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }
    }

    function renderMarkers(moments) {
        markersCluster.clearLayers(); 

        moments.forEach(moment => {
            const emoji = getCategoryIcon(moment.categoria);
            const icon = createEmojiIcon(emoji);
            
            const marker = L.marker([moment.lat, moment.lng], { icon: icon });

            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                if (window.LoveMap.ui && window.LoveMap.ui.openMomentModal) {
                    window.LoveMap.ui.openMomentModal(moment);
                    map.flyTo([moment.lat, moment.lng], 15);
                }
            });
            
            markersCluster.addLayer(marker); 
        });
    }

    function filterMarkers(selectedCategories, allMoments) {
        if (selectedCategories.includes('Todos') || selectedCategories.length === 0) {
            renderMarkers(allMoments);
        } else {
            const filtered = allMoments.filter(m => selectedCategories.includes(m.categoria));
            renderMarkers(filtered);
        }
    }

    window.LoveMap.map = {
        init: initMap,
        renderMarkers: renderMarkers,
        filterMarkers: filterMarkers,
        removeTempMarker: removeTempMarker
    };
})();
