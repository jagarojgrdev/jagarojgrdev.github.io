// database.js - Manejo de SQLite y persistencia en servidor (con fallback)
// Refactorizado para V3.1 (Reset y CORS Check) + V5 Fix (GH Pages Support)

window.LoveMap = window.LoveMap || {};

(function() {
    let db = null;
    let serverAvailable = true; // Asumimos que sí al principio
    // CAMBIAMOS NOMBRE PARA RESETEAR DATOS 
    const DB_NAME = 'nuestros_momentos_db_v3'; 
    const SERVER_URL = 'db.php';

    // Detectar si estamos en local (file://)
    const isLocal = window.location.protocol === 'file:';

    // Inicializar base de datos
    async function initDatabase() {
        const config = {
            locateFile: filename => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${filename}`
        };
        
        // Si es local, anulamos servidor desde el principio
        if (isLocal) serverAvailable = false;

        try {
            // Cargar sql.js
            const SQL = await initSqlJs(config);
            let loadedFromServer = false;

            // Intentar cargar desde SERVIDOR (Solo si creemos que está disponible)
            if (serverAvailable) {
                try {
                    const response = await fetch(SERVER_URL);
                    if (response.ok) {
                        const buffer = await response.arrayBuffer();
                        const u8 = new Uint8Array(buffer);

                        // VALIDACIÓN MAGIC HEADER SQLITE
                        // "SQLite format 3\0" => 16 bytes
                        const magic = [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00];
                        let isSQLite = true;
                        if (u8.length < 16) isSQLite = false;
                        else {
                            for(let i=0; i<16; i++) {
                                if(u8[i] !== magic[i]) {
                                    isSQLite = false;
                                    break;
                                }
                            }
                        }

                        if (isSQLite) {
                            db = new SQL.Database(u8);
                            console.log("Base de datos cargada desde el SERVIDOR.");
                            loadedFromServer = true;
                        } else {
                            console.warn("La respuesta del servidor no es una DB válida (probablemente es GitHub Pages). Desactivando sincronización servidor.");
                            serverAvailable = false;
                        }
                    } else {
                        // 404 o 500
                        console.warn("Servidor devolvió error. Desactivando.");
                        serverAvailable = false;
                    }
                } catch (serverError) {
                    console.warn("Servidor no disponible (Network Error). Usando modo offline.", serverError);
                    serverAvailable = false;
                }
            } else {
                console.log("Modo local o servidor desactivado.");
            }

            if (!loadedFromServer) {
                // Fallback: localStorage
                const savedDb = localStorage.getItem(DB_NAME);
                if (savedDb) {
                    try {
                        const binaryString = atob(savedDb);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        db = new SQL.Database(bytes);
                        console.log("Base de datos restaurada desde localStorage.");
                    } catch (e) {
                         console.error("Error al restaurar localStorage, creando nueva.", e);
                         db = new SQL.Database();
                         createTable();
                         saveDatabase();
                    }
                } else {
                    // Crear nueva base de datos limpia
                    db = new SQL.Database();
                    createTable();
                    saveDatabase(); 
                    console.log("Nueva base de datos creada (Limpia).");
                }
            }
        } catch (e) {
            console.error("Error crítico inicializando BD:", e);
        }
    }

    // Crear tabla
    function createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS momentos (
                id TEXT PRIMARY KEY,
                descripcion TEXT,
                fecha TEXT,
                categoria TEXT,
                foto TEXT,
                lat REAL,
                lng REAL
            );
        `;
        db.run(query);
    }

    // Guardar base de datos
    async function saveDatabase() {
        if (!db) return;
        const data = db.export(); 
        
        // 1. Guardar en Servidor (Solo si está validado como disponible)
        if (serverAvailable) {
            try {
                // En un hosting real esto iría a db.php
                // En GH Pages, esto dará error 405 (Method Not Allowed) o similar, 
                // pero como ya validamos en init, seguramente serverAvailable sea false si es GH Pages.
                await fetch(SERVER_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream'
                    },
                    body: data
                });
                console.log("Base de datos sincronizada con el servidor.");
            } catch (e) {
                console.error("Error guardando en servidor (desactivando):", e);
                serverAvailable = false;
            }
        }

        // 2. Guardar en LocalStorage (Siempre)
        let binary = '';
        const len = data.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(data[i]);
        }
        const base64 = btoa(binary);
        localStorage.setItem(DB_NAME, base64);
    }

    function addMoment(moment) {
        if (!db) return;
        const query = `
            INSERT INTO momentos (id, descripcion, fecha, categoria, foto, lat, lng)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        try {
            db.run(query, [
                id, moment.descripcion, moment.fecha, moment.categoria, moment.foto, moment.lat, moment.lng
            ]);
            saveDatabase();
        } catch(e) {
            console.error(e);
        }
        return id;
    }

    function deleteMoment(id) {
        if (!db) return;
        try {
            db.run("DELETE FROM momentos WHERE id = ?", [id]);
            saveDatabase();
            return true;
        } catch (e) {
            console.error("Error eliminando:", e);
            return false;
        }
    }

    function getMoments() {
        if (!db) return [];
        try {
            const result = db.exec("SELECT * FROM momentos");
            if (result.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values;
                return values.map(row => {
                    let obj = {};
                    columns.forEach((col, index) => obj[col] = row[index]);
                    return obj;
                });
            }
            return [];
        } catch (e) {
            return [];
        }
    }

    window.LoveMap.db = {
        init: initDatabase,
        addMoment: addMoment,
        getMoments: getMoments,
        deleteMoment: deleteMoment
    };
})();
