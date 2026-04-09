// 1. Importar Firebase modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  getDocs,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// 2. Tu configuración exacta
const firebaseConfig = {
  apiKey: "AIzaSyAmOIbNkqwMjIfhi87Zp6yO4QgNLdimSI",
  authDomain: "digitadores-cb225.firebaseapp.com",
  projectId: "digitadores-cb225",
  storageBucket: "digitadores-cb225.firebasestorage.app",
  messagingSenderId: "480756381767",
  appId: "1:480756381767:web:41b173d50ed12e01539962",
  measurementId: "G-2WRKRP4RNK"
};

// 3. Inicializar App y Base de Datos
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const registrosRef = collection(db, "registros_ampo");

let registros = [];

// Referencias del DOM
const form = document.getElementById('registroForm');
const tbodyPendientes = document.getElementById('tbodyPendientes');
const tbodyFinalizados = document.getElementById('tbodyFinalizados');
const spanTotalPendiente = document.getElementById('totalPendiente');
const spanTotalFinalizados = document.getElementById('totalFinalizados');
const btnLimpiar = document.getElementById('btnLimpiar');
const btnEliminarTodo = document.getElementById('btnEliminarTodo');
const btnDescargar = document.getElementById('btnDescargar');
const btnAgregar = document.getElementById('btnAgregar');
const toastContainer = document.getElementById('toast-container');

// Modal Elements
const modalOverlay = document.getElementById('confirmModal');
const btnCancelModal = document.getElementById('btnCancelModal');
const btnConfirmModal = document.getElementById('btnConfirmModal');
const confirmModalBody = document.getElementById('confirmModalBody');

// UI Helpers (Toasts y Modals)
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Iconos SVG o Emojis
  const iconMap = {
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };
  
  toast.innerHTML = `
    <span style="font-size: 1.2rem;">${iconMap[type]}</span>
    <span>${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
}

function openConfirmModal(message, onConfirm) {
  confirmModalBody.textContent = message;
  modalOverlay.classList.add('active');
  
  const handleConfirm = () => {
    modalOverlay.classList.remove('active');
    onConfirm();
    cleanup();
  };
  
  const handleCancel = () => {
    modalOverlay.classList.remove('active');
    cleanup();
  };
  
  const cleanup = () => {
    btnConfirmModal.removeEventListener('click', handleConfirm);
    btnCancelModal.removeEventListener('click', handleCancel);
  };
  
  btnConfirmModal.addEventListener('click', handleConfirm);
  btnCancelModal.addEventListener('click', handleCancel);
}

// 4. Escuchador en tiempo real de la Nube
onSnapshot(registrosRef, (snapshot) => {
  registros = [];
  snapshot.forEach((doc) => {
    registros.push({ id: doc.id, ...doc.data() });
  });
  render();
});

// Eventos
form.addEventListener('submit', agregarRegistro);
btnLimpiar.addEventListener('click', limpiarFormulario);
btnEliminarTodo.addEventListener('click', intentarEliminarTodo);
btnDescargar.addEventListener('click', exportarCSV);

// Funciones Principales
async function agregarRegistro(event) {
  event.preventDefault();

  const inputAmpo = document.getElementById('ampo');
  const inputDigitador = document.getElementById('digitador');
  const inputFecha = document.getElementById('fecha');
  const inputPendiente = document.getElementById('pendiente');

  const ampo = inputAmpo.value.trim();
  const digitador = inputDigitador.value.trim();
  const fecha = inputFecha.value;
  const pendiente = parseInt(inputPendiente.value, 10);

  if (!ampo || !digitador || !fecha || isNaN(pendiente)) {
    showToast("Por favor, completa todos los campos correctamente.", "warning");
    return;
  }

  try {
    // Estado de carga
    btnAgregar.disabled = true;
    btnAgregar.classList.add('loading');
    
    await addDoc(registrosRef, {
      ampo,
      digitador,
      fecha,
      pendiente,
      estado: 'Pendiente'
    });
    
    showToast("Registro agregado correctamente", "success");
    limpiarFormulario();
    inputAmpo.focus();
  } catch (error) {
    console.error("Error al agregar documento: ", error);
    showToast("Hubo un error al guardar. Revisa tu conexión.", "error");
  } finally {
    // Quitar estado de carga
    btnAgregar.disabled = false;
    btnAgregar.classList.remove('loading');
  }
}

async function finalizar(id) {
  try {
    const docRef = doc(db, "registros_ampo", id);
    await updateDoc(docRef, { estado: 'Finalizado' });
    showToast("Estado actualizado a finalizado.", "success");
  } catch (error) {
    console.error("Error al actualizar: ", error);
    showToast("Error al actualizar el estado.", "error");
  }
}

function intentarEliminarTodo() {
  if (registros.length === 0) {
    showToast("No hay registros para eliminar.", "warning");
    return;
  }

  openConfirmModal(
    '¿Estás seguro de que deseas eliminar TODOS los registros de forma permanente en la nube?',
    eliminarTodo
  );
}

async function eliminarTodo() {
  try {
    btnEliminarTodo.disabled = true;
    btnEliminarTodo.textContent = "Eliminando...";
    
    // Batch Write (Best Practice for bulk operations)
    const batch = writeBatch(db);
    const querySnapshot = await getDocs(registrosRef);
    
    querySnapshot.forEach((documento) => {
      batch.delete(doc(db, "registros_ampo", documento.id));
    });
    
    await batch.commit();
    showToast("Todos los registros han sido eliminados.", "success");
  } catch (error) {
    console.error("Error al eliminar todo: ", error);
    showToast("Error al eliminar los registros.", "error");
  } finally {
    btnEliminarTodo.disabled = false;
    btnEliminarTodo.textContent = "Eliminar Todo";
  }
}

function limpiarFormulario() {
  form.reset();
}

function render() {
  tbodyPendientes.innerHTML = '';
  tbodyFinalizados.innerHTML = '';

  let totalPendiente = 0;
  let totalFinalizados = 0;
  let countPendientes = 0;
  let countFinalizados = 0;

  registros.forEach(r => {
    if (r.estado === 'Pendiente') {
      totalPendiente += r.pendiente;
      countPendientes++;
      tbodyPendientes.appendChild(crearFilaPendiente(r));
    } else {
      totalFinalizados++;
      countFinalizados++;
      tbodyFinalizados.appendChild(crearFilaFinalizado(r));
    }
  });

  // Empty States
  if (countPendientes === 0) {
    tbodyPendientes.innerHTML = `<tr><td colspan="5" class="empty-state">No hay registros pendientes.</td></tr>`;
  }
  if (countFinalizados === 0) {
    tbodyFinalizados.innerHTML = `<tr><td colspan="4" class="empty-state">No hay registros finalizados.</td></tr>`;
  }

  spanTotalPendiente.textContent = totalPendiente;
  spanTotalFinalizados.textContent = totalFinalizados;
}

function crearFilaPendiente(registro) {
  const tr = document.createElement('tr');
  tr.appendChild(crearCelda(registro.ampo, 'AMPO'));
  tr.appendChild(crearCelda(registro.digitador, 'Digitador'));
  tr.appendChild(crearCelda(registro.fecha, 'Fecha'));
  tr.appendChild(crearCelda(registro.pendiente, 'Pendiente'));

  const tdAcciones = document.createElement('td');
  tdAcciones.setAttribute('data-label', 'Acciones');

  const btnFinalizar = document.createElement('button');
  btnFinalizar.innerHTML = '✔ Finalizar';
  btnFinalizar.className = 'success';
  btnFinalizar.ariaLabel = `Finalizar registro ${registro.ampo}`;
  // Closure en vez de global scope window.finalizar
  btnFinalizar.onclick = () => finalizar(registro.id);

  tdAcciones.appendChild(btnFinalizar);
  tr.appendChild(tdAcciones);
  return tr;
}

function crearFilaFinalizado(registro) {
  const tr = document.createElement('tr');
  tr.appendChild(crearCelda(registro.ampo, 'AMPO'));
  tr.appendChild(crearCelda(registro.digitador, 'Digitador'));
  tr.appendChild(crearCelda(registro.fecha, 'Fecha'));
  tr.appendChild(crearCelda(registro.pendiente, 'Cantidad'));
  return tr;
}

function crearCelda(texto, labelMobile) {
  const td = document.createElement('td');
  td.textContent = texto;
  if (labelMobile) {
    td.setAttribute('data-label', labelMobile);
  }
  return td;
}

// Función para exportar a CSV
function exportarCSV() {
  if (registros.length === 0) {
    showToast("No hay datos para exportar.", "warning");
    return;
  }

  let csvContent = "AMPO,Digitador,Fecha,Cantidad,Estado\n";

  registros.forEach(r => {
    // Escapar comillas dobles internas y encerrar en comillas (Best Practice CSV)
    const ampo = `"${r.ampo.toString().replace(/"/g, '""')}"`;
    const digitador = `"${r.digitador.toString().replace(/"/g, '""')}"`;
    const fecha = `"${r.fecha}"`;
    const pendiente = r.pendiente;
    const estado = `"${r.estado}"`;

    csvContent += `${ampo},${digitador},${fecha},${pendiente},${estado}\n`;
  });

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Reporte_Digitadores_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}