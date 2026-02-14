// ui.js - Interfaz de Usuario V5 (Limpieza y Scroll)

window.LoveMap = window.LoveMap || {};

(function() {
    let currentLat = null;
    let currentLng = null;
    let currentPhoto = null;
    let currentMomentId = null;

    // Estado filtros
    let activeFilters = ['Todos']; 

    // Categorías y Emojis Centralizados
    const CATEGORIES = [
        { name: 'Beso', icon: '💋', color: '#e91e63' },
        { name: 'Cita', icon: '🍽️', color: '#9c27b0' },
        { name: 'Viaje', icon: '✈️', color: '#2196f3' },
        { name: 'Hogar', icon: '🏠', color: '#4caf50' },
        { name: 'Especial', icon: '❤️', color: '#f44336' },
        { name: 'Celebración', icon: '🎉', color: '#ffeb3b' },
        { name: 'Primera vez', icon: '🌅', color: '#ff9800' },
        { name: 'Música', icon: '🎵', color: '#00bcd4' },
        { name: 'Día raro', icon: '🌧️', color: '#607d8b' },
        { name: 'Favorito', icon: '⭐', color: '#ffc107' }
    ];

    // Referencias DOM
    let form, descriptionInput, dateInput, categorySelect, photoInput, previewImage, filterContainer, allFiltersModal, allFiltersGrid;
    let dropzone, creationModal, creationClose, btnCancel;
    let modal, modalImage, modalHeaderIcon, modalCategory, modalDate, modalDescription, btnDelete, modalClose;
    let lightbox, lightboxImage, lightboxClose;
    // Removed old confirmation refs

    function initUI() {
        // Elementos Formulario
        form = document.getElementById('memory-form');
        descriptionInput = document.getElementById('description');
        dateInput = document.getElementById('date');
        categorySelect = document.getElementById('category');
        photoInput = document.getElementById('photo');
        previewImage = document.getElementById('preview');
        dropzone = document.getElementById('dropzone');
        
        // Modal Creación
        creationModal = document.getElementById('creation-modal');
        creationClose = document.getElementById('creation-close');
        btnCancel = document.getElementById('btn-cancel');

        // Filtros
        filterContainer = document.getElementById('filters-bar');
        allFiltersModal = document.getElementById('all-filters-modal');
        allFiltersGrid = document.getElementById('all-filters-grid');
        document.getElementById('close-all-filters').addEventListener('click', () => allFiltersModal.classList.add('hidden'));
        document.getElementById('apply-filters').addEventListener('click', () => allFiltersModal.classList.add('hidden'));

        // Modal Ver Recuerdo
        modal = document.getElementById('moment-modal');
        modalImage = document.getElementById('modal-image');
        modalHeaderIcon = document.getElementById('driver-icon');
        modalCategory = document.getElementById('modal-category');
        modalDate = document.getElementById('modal-date');
        modalDescription = document.getElementById('modal-description');
        btnDelete = document.getElementById('btn-delete');
        modalClose = document.getElementById('modal-close');

        // Lightbox
        lightbox = document.getElementById('lightbox');
        lightboxImage = document.getElementById('lightbox-image');
        lightboxClose = document.querySelector('.lightbox-close');

        dateInput.valueAsDate = new Date();

        // Listeners
        form.addEventListener('submit', handleFormSubmit);
        setupDropzone();
        setupVisualModal();
        setupCreationModal();
        setupLightbox();
        
        renderFilters();
    }

    // --- Filtros Responsivos (Scroll logic is in CSS now) ---
    function renderFilters() {
        // En V5, mostramos TODOS los chips y dejamos que CSS haga el scroll
        filterContainer.innerHTML = ''; 
        
        // Botón "Todos"
        const allChip = createFilterChip('Todos', '🔄 Ver Todo');
        filterContainer.appendChild(allChip);

        // Renderizar TODAS las Categorías directamente
        // El CSS .filters-bar se encarga del scroll y límites
        CATEGORIES.forEach(cat => {
            const chip = createFilterChip(cat.name, `${cat.icon} ${cat.name}`);
            filterContainer.appendChild(chip);
        });
    }

    function createFilterChip(catName, label) {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        if (activeFilters.includes(catName)) chip.classList.add('active');
        chip.innerHTML = label;
        chip.onclick = () => toggleFilter(catName);
        return chip;
    }

    function toggleFilter(category) {
        if (category === 'Todos') {
            activeFilters = ['Todos'];
            filterContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            filterContainer.querySelector('div:first-child').classList.add('active');
        } else {
            if (activeFilters.includes('Todos')) {
                activeFilters = []; 
                filterContainer.querySelector('div:first-child').classList.remove('active');
            }
            
            if (activeFilters.includes(category)) {
                activeFilters = activeFilters.filter(f => f !== category);
            } else {
                activeFilters.push(category);
            }

            if (activeFilters.length === 0) {
                activeFilters = ['Todos'];
                filterContainer.querySelector('div:first-child').classList.add('active');
            }
        }
        
        // Re-render visual active states efficiently (optional, or full re-render)
        renderFilters(); 
        updateMapWithFilters();
    }

    function updateMapWithFilters() {
        const allMoments = window.LoveMap.db.getMoments();
        window.LoveMap.map.filterMarkers(activeFilters, allMoments);
    }

    // --- Lógica Creación y Visualización ---

    function openCreationModal(lat, lng) {
        currentLat = lat;
        currentLng = lng;
        
        form.reset();
        currentPhoto = null;
        previewImage.style.display = 'none';
        previewImage.src = "";
        dropzone.querySelector('.dropzone-content p').textContent = "Toca o arrastra una foto";
        dateInput.valueAsDate = new Date();
        creationModal.classList.remove('hidden');
    }

    function closeCreationModal() {
        creationModal.classList.add('hidden');
        if (window.LoveMap.map.removeTempMarker) {
            window.LoveMap.map.removeTempMarker();
        }
    }

    function setupCreationModal() {
        creationClose.addEventListener('click', closeCreationModal);
        btnCancel.addEventListener('click', closeCreationModal);
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        const newMoment = {
            descripcion: descriptionInput.value,
            fecha: dateInput.value,
            categoria: categorySelect.value,
            foto: currentPhoto,
            lat: currentLat,
            lng: currentLng
        };
        window.LoveMap.db.addMoment(newMoment);
        closeCreationModal();
        updateMapWithFilters(); 
    }

    function openMomentModal(moment) {
        currentMomentId = moment.id;
        const catInfo = CATEGORIES.find(c => c.name === moment.categoria) || { icon: '❤️', color: '#ccc' };
        
        modalCategory.textContent = moment.categoria;
        modalCategory.style.color = catInfo.color;
        
        modalHeaderIcon.textContent = catInfo.icon;

        modalDate.textContent = new Date(moment.fecha).toLocaleDateString();
        modalDescription.textContent = moment.descripcion;
        
        if (moment.foto) {
            modalImage.src = moment.foto;
            document.getElementById('modal-image-container').style.display = 'block';
        } else {
            document.getElementById('modal-image-container').style.display = 'none';
        }

        document.getElementById('moment-modal').classList.remove('hidden');
    }

    // --- Utils ---
    function setupDropzone() {
        photoInput.addEventListener('change', (e) => processImage(e.target.files[0]));
        dropzone.addEventListener('click', () => photoInput.click()); 
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', (e) => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', (e) => { 
            e.preventDefault(); 
            dropzone.classList.remove('dragover');
            processImage(e.dataTransfer.files[0]);
        });
    }

    function processImage(file) {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            currentPhoto = e.target.result;
            previewImage.src = currentPhoto;
            previewImage.style.display = 'block';
            dropzone.querySelector('.dropzone-content p').textContent = "¡Foto lista!";
        };
        reader.readAsDataURL(file);
    }

    function setupVisualModal() {
        const m = document.getElementById('moment-modal');
        modalClose.addEventListener('click', () => m.classList.add('hidden'));
        m.addEventListener('click', (e) => { if(e.target === m) m.classList.add('hidden'); });
        
        btnDelete.addEventListener('click', () => {
             if(confirm("¿Borrar este recuerdo?")) {
                 window.LoveMap.db.deleteMoment(currentMomentId);
                 updateMapWithFilters();
                 m.classList.add('hidden');
             }
        });
        modalImage.addEventListener('click', () => openLightbox(modalImage.src));
    }

    function setupLightbox() { 
        if (lightboxClose) lightboxClose.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });
        lightbox.addEventListener('click', closeLightbox);
    }
    
    function openLightbox(src) { lightboxImage.src = src; lightbox.classList.remove('hidden'); }
    function closeLightbox(e) { if (!e || e.target !== lightboxImage) lightbox.classList.add('hidden'); }

    // Public API
    window.LoveMap.ui = {
        init: initUI,
        openCreationModal: openCreationModal,
        openMomentModal: openMomentModal,
        CATEGORIES: CATEGORIES 
    };
})();
