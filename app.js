// VARIABLES GLOBALES
let equiposData = [];
let favoritos = JSON.parse(localStorage.getItem('bt_favoritos')) || [];
let historial = JSON.parse(localStorage.getItem('bt_historial')) || [];
let filtroActual = { texto: '', categoria: 'all', marca: 'all', modo: 'all' }; // modos: all, fav, hist

// ELEMENTOS DEL DOM
const searchInput = document.getElementById('search-input');
const categoriesContainer = document.getElementById('categories-container');
const brandSelect = document.getElementById('brand-select');
const resultsGrid = document.getElementById('results-grid');
const sectionTitle = document.getElementById('section-title');
const btnFavorites = document.getElementById('btn-favorites');
const btnHistory = document.getElementById('btn-history');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('close-modal');
const modalBody = document.getElementById('modal-body');
const themeToggle = document.getElementById('theme-toggle');

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadData();
    setupEventListeners();
    registerServiceWorker();
});

// CARGA DE DATOS (Preparado para el futuro: fetch a una API protegida en vez de JSON local)
async function loadData() {
    try {
        const response = await fetch('manuales.json');
        if (!response.ok) throw new Error('Error al cargar datos');
        equiposData = await response.json();
        
        populateBrands();
        renderEquipos(equiposData);
    } catch (error) {
        console.error(error);
        resultsGrid.innerHTML = `<p>Error al cargar la base de datos de manuales.</p>`;
    }
}

// UTILIDAD: NORMALIZAR TEXTO (ignorar acentos y mayúsculas)
const normalizeText = (text) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

// RENDERIZAR TARJETAS
function renderEquipos(data) {
    resultsGrid.innerHTML = '';
    
    if (data.length === 0) {
        resultsGrid.innerHTML = `<p>No se encontraron equipos que coincidan con la búsqueda.</p>`;
        return;
    }

    data.forEach(equipo => {
        const isFav = favoritos.includes(equipo.id);
        
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <span class="card-brand">📹 ${equipo.marca}</span>
                <button class="star-btn ${isFav ? 'fav' : ''}" data-id="${equipo.id}" aria-label="Favorito">
                    ${isFav ? '★' : '☆'}
                </button>
            </div>
            <div class="card-model">${equipo.modelo}</div>
            <div class="card-type">${equipo.tipo}</div>
            <button class="btn-view" data-id="${equipo.id}">Ver equipo</button>
        `;
        resultsGrid.appendChild(card);
    });
}

// FILTRADO PRINCIPAL
function applyFilters() {
    let filtrados = equiposData;

    // Filtro por modo (Favoritos o Historial)
    if (filtroActual.modo === 'fav') {
        filtrados = filtrados.filter(eq => favoritos.includes(eq.id));
        sectionTitle.textContent = "⭐ Mis Favoritos";
    } else if (filtroActual.modo === 'hist') {
        // Ordenar según historial
        filtrados = historial.map(id => filtrados.find(eq => eq.id === id)).filter(Boolean);
        sectionTitle.textContent = "🕘 Consultados recientemente";
    } else {
        sectionTitle.textContent = "Todos los equipos";
    }

    // Filtro por Categoría
    if (filtroActual.categoria !== 'all' && filtroActual.modo === 'all') {
        filtrados = filtrados.filter(eq => eq.categoria === filtroActual.categoria);
        sectionTitle.textContent = `Categoría: ${filtroActual.categoria}`;
    }

    // Filtro por Marca
    if (filtroActual.marca !== 'all') {
        filtrados = filtrados.filter(eq => eq.marca === filtroActual.marca);
    }

    // Filtro por Búsqueda (Texto)
    if (filtroActual.texto) {
        const textBusqueda = normalizeText(filtroActual.texto);
        filtrados = filtrados.filter(eq => {
            const searchableText = `${eq.marca} ${eq.modelo} ${eq.tipo} ${eq.descripcion} ${eq.tags.join(' ')}`;
            return normalizeText(searchableText).includes(textBusqueda);
        });
    }

    renderEquipos(filtrados);
}

// RELLENAR SELECT DE MARCAS DINÁMICAMENTE
function populateBrands() {
    const marcas = [...new Set(equiposData.map(item => item.marca))].sort();
    marcas.forEach(marca => {
        const option = document.createElement('option');
        option.value = marca;
        option.textContent = marca;
        brandSelect.appendChild(option);
    });
}

// EVENT LISTENERS
function setupEventListeners() {
    // Buscador
    searchInput.addEventListener('input', (e) => {
        filtroActual.texto = e.target.value;
        applyFilters();
    });

    // Categorías
    categoriesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('cat-btn')) {
            document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            filtroActual.categoria = e.target.dataset.cat;
            filtroActual.modo = 'all'; // Resetea vista de fav/historial
            btnFavorites.classList.remove('active');
            btnHistory.classList.remove('active');
            applyFilters();
        }
    });

    // Marcas
    brandSelect.addEventListener('change', (e) => {
        filtroActual.marca = e.target.value;
        applyFilters();
    });

    // Favoritos Vista
    btnFavorites.addEventListener('click', () => {
        filtroActual.modo = filtroActual.modo === 'fav' ? 'all' : 'fav';
        btnFavorites.classList.toggle('active');
        btnHistory.classList.remove('active');
        document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
        applyFilters();
    });

    // Historial Vista
    btnHistory.addEventListener('click', () => {
        filtroActual.modo = filtroActual.modo === 'hist' ? 'all' : 'hist';
        btnHistory.classList.toggle('active');
        btnFavorites.classList.remove('active');
        document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
        applyFilters();
    });

    // Clics en la cuadrícula (Favoritos y Ver equipo)
    resultsGrid.addEventListener('click', (e) => {
        // Toggle Favorito
        if (e.target.classList.contains('star-btn')) {
            const id = e.target.dataset.id;
            toggleFavorite(id, e.target);
        }
        
        // Abrir Modal
        if (e.target.classList.contains('btn-view')) {
            const id = e.target.dataset.id;
            openModal(id);
        }
    });

    // Cerrar Modal
    closeModal.addEventListener('click', () => modal.classList.add('hidden'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    // Tema
    themeToggle.addEventListener('click', toggleTheme);
}

// FAVORITOS LOGICA
function toggleFavorite(id, buttonElement) {
    const index = favoritos.indexOf(id);
    if (index > -1) {
        favoritos.splice(index, 1);
        buttonElement.classList.remove('fav');
        buttonElement.textContent = '☆';
    } else {
        favoritos.push(id);
        buttonElement.classList.add('fav');
        buttonElement.textContent = '★';
    }
    localStorage.setItem('bt_favoritos', JSON.stringify(favoritos));
    
    if (filtroActual.modo === 'fav') applyFilters(); // Actualizar si estamos en la vista favoritos
}

// HISTORIAL LOGICA
function addToHistory(id) {
    historial = historial.filter(item => item !== id); // Eliminar duplicado si existe
    historial.unshift(id); // Añadir al inicio
    if (historial.length > 10) historial.pop(); // Mantener máximo 10
    localStorage.setItem('bt_historial', JSON.stringify(historial));
}

// FICHA DE EQUIPO (MODAL)
function openModal(id) {
    const equipo = equiposData.find(eq => eq.id === id);
    if (!equipo) return;

    addToHistory(id);

    // Generar botones de documentos solo si existen (no son null)
    let docsHtml = '';
    const docs = equipo.documentos;
    
    if (docs.manual) docsHtml += `<a href="${docs.manual}" target="_blank" class="doc-btn">📕 Manual de usuario</a>`;
    if (docs.instalacion) docsHtml += `<a href="${docs.instalacion}" target="_blank" class="doc-btn">🛠️ Manual de instalación</a>`;
    if (docs.ficha) docsHtml += `<a href="${docs.ficha}" target="_blank" class="doc-btn">⚙️ Ficha técnica</a>`;
    if (docs.firmware) docsHtml += `<a href="${docs.firmware}" target="_blank" class="doc-btn">💾 Firmware</a>`;
    if (equipo.fabricante) docsHtml += `<a href="${equipo.fabricante}" target="_blank" class="doc-btn external">🔗 Página del fabricante</a>`;

    const tagsHtml = equipo.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

    modalBody.innerHTML = `
        <div class="modal-header">
            <h2>${equipo.marca} ${equipo.modelo}</h2>
            <p><strong>Categoría:</strong> ${equipo.categoria}</p>
            <p><strong>Tipo:</strong> ${equipo.tipo}</p>
        </div>
        <div class="modal-desc" style="margin-top: 15px;">
            <p><strong>Descripción:</strong><br>${equipo.descripcion}</p>
        </div>
        <div class="modal-tags">
            ${tagsHtml}
        </div>
        <div class="doc-list">
            ${docsHtml || '<p>No hay documentos disponibles para este equipo.</p>'}
        </div>
    `;

    modal.classList.remove('hidden');
}

// MODO OSCURO
function initTheme() {
    const isDark = localStorage.getItem('bt_theme') === 'dark';
    if (isDark) document.body.classList.add('dark-mode');
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('bt_theme', isDark ? 'dark' : 'light');
}

// PWA: SERVICE WORKER REGISTRATION
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registrado', reg))
            .catch(err => console.error('Error al registrar Service Worker', err));
    }
}
