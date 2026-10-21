import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { initializeFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBHdtd1YLq8z_cuVgUDx33Z088okq0Sriw",
    authDomain: "servicio-tecnico-1d91f.firebaseapp.com",
    projectId: "servicio-tecnico-1d91f",
    storageBucket: "servicio-tecnico-1d91f.firebasestorage.app",
    messagingSenderId: "475926146823",
    appId: "1:475926146823:web:1bd26d301c1ad0d25f5fa2"
};

const CFG = { telefono: "", prefijo: "506" };

const ESTADOS = [
    "Recibido",
    "En diagnóstico",
    "Esperando repuesto",
    "En reparación",
    "Listo para entrega",
    "Entregado"
];

const $ = id => document.getElementById(id);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
}[c]));

const fmt = t => {
    const fecha = Number(t);
    if (!Number.isFinite(fecha) || fecha <= 0) return "Fecha no disponible";
    return new Date(fecha).toLocaleString("es-CR", {
        dateStyle: "medium",
        timeStyle: "short"
    });
};

const BADGE = estado => {
    const i = ESTADOS.indexOf(estado);
    return `<span class="badge s${Math.max(0, i)}">${esc(estado || "Sin estado")}</span>`;
};

const progress = estado => {
    const i = ESTADOS.indexOf(estado);
    return `<div class="steps">${
        ESTADOS.map((s, k) => `
            <div class="step ${i >= 0 && k <= i ? "d" : ""}">
                <i></i>${esc(s)}
            </div>
        `).join("")
    }</div>`;
};

function galeriaCliente(fotos = []) {
    if (!Array.isArray(fotos) || fotos.length === 0) {
        return `
            <section>
                <h3>📸 Fotografías de la reparación</h3>
                <div class="empty-photos">
                    Todavía no hay fotografías disponibles para este dispositivo.
                    Cuando el técnico agregue imágenes, aparecerán aquí.
                </div>
            </section>
        `;
    }

    return `
        <section>
            <h3>📸 Fotografías de la reparación</h3>
            <p class="mut">Imágenes compartidas por el técnico.</p>
            <div class="photo-grid">
                ${fotos.map(foto => {
                    if (!foto || typeof foto.url !== "string" || !/^https:\/\/.+/i.test(foto.url)) {
                        return "";
                    }

                    return `
                        <article class="photo-card">
                            <a href="${esc(foto.url)}" target="_blank" rel="noopener noreferrer">
                                <img src="${esc(foto.url)}"
                                     alt="${esc(foto.categoria || "Fotografía de la reparación")}"
                                     loading="lazy">
                            </a>
                            <strong>${esc(foto.categoria || "Foto del dispositivo")}</strong>
                            ${foto.fecha ? `<p><small>${esc(fmt(foto.fecha))}</small></p>` : ""}
                        </article>
                    `;
                }).join("")}
            </div>
        </section>
    `;
}

function detalle(reparacion) {
    const historial = Array.isArray(reparacion.historial)
        ? reparacion.historial
        : [];

    const historialHTML = historial.length
        ? historial.slice().reverse().map(h => `
            <div>
                ${esc(h.estado || "Actualización")}
                ${h.nota ? ` — ${esc(h.nota)}` : ""}
                <small>${esc(fmt(h.fecha))}</small>
            </div>
        `).join("")
        : "<p class='mut'>Todavía no hay actualizaciones del historial.</p>";

    return `
        <div class="dh">
            <div>
                <div class="mut">${esc(reparacion.tipo || "Dispositivo")}</div>
                <h2>${esc(reparacion.modelo || "Equipo registrado")}</h2>
            </div>
            ${BADGE(reparacion.estado)}
        </div>

        ${progress(reparacion.estado)}

        <p class="mut">
            <b>Problema reportado:</b>
            ${esc(reparacion.problema || "No especificado")}
            ${reparacion.costo
                ? `<br><b>Costo estimado:</b> ${esc(reparacion.costo)}`
                : ""}
        </p>

        <h3>Historial de la reparación</h3>
        <div class="tl">${historialHTML}</div>

        ${galeriaCliente(reparacion.fotos || [])}
    `;
}

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
});

$("yr").textContent = new Date().getFullYear();

if (CFG.telefono) {
    $("ct").innerHTML =
        'WhatsApp: <a href="https://wa.me/' +
        esc(CFG.prefijo + CFG.telefono) +
        '" target="_blank" rel="noopener noreferrer">' +
        esc(CFG.telefono) + '</a>';
}

function mostrar(html) {
    $("r").innerHTML = html;
    $("r").scrollIntoView({ behavior: "smooth", block: "center" });
}

async function buscar() {
    const codigo = $("q").value.trim().toUpperCase();

    if (!codigo) {
        mostrar('<div class="card">Escribí tu código de reparación.</div>');
        return;
    }

    if (!/^[A-Z0-9-]{3,20}$/.test(codigo)) {
        mostrar('<div class="card">El código no es válido. Revísalo e inténtalo de nuevo.</div>');
        return;
    }

    $("b").disabled = true;
    $("b").textContent = "Buscando...";
    mostrar('<div class="card">Consultando el estado de tu reparación...</div>');

    try {
        const resultado = await getDoc(doc(db, "repairs", codigo));

        if (!resultado.exists()) {
            mostrar('<div class="card">No encontramos ese código. Verificá que esté escrito correctamente.</div>');
            return;
        }

        mostrar(`<div class="card">${detalle(resultado.data())}</div>`);
    } catch (error) {
        console.error("Error al consultar reparación:", error);
        mostrar('<div class="card">No se pudo consultar la reparación. Intentá nuevamente más tarde.</div>');
    } finally {
        $("b").disabled = false;
        $("b").textContent = "Consultar";
    }
}

$("formConsulta").addEventListener("submit", evento => {
    evento.preventDefault();
    buscar();
});

const codigoURL = new URLSearchParams(location.search).get("c");

if (codigoURL) {
    $("q").value = codigoURL;
    buscar();
}