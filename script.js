// 1. Importar Firebase modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  deleteDoc,
  getDocs
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
btnEliminarTodo.addEventListener('click', eliminarTodo);
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
    alert("Por favor, completa todos los campos correctamente.");
    return;
  }

  try {
    await addDoc(registrosRef, {
      ampo,
      digitador,
      fecha,
      pendiente,
      estado: 'Pendiente'
    });
    limpiarFormulario();
    inputAmpo.focus();
  } catch (error) {
    console.error("Error al agregar documento: ", error);
    alert("Hubo un error al guardar. Revisa tu conexión a internet.");
  }
}

window.finalizar = async function (id) {
  try {
    const docRef = doc(db, "registros_ampo", id);
    await updateDoc(docRef, { estado: 'Finalizado' });
  } catch (error) {
    console.error("Error al actualizar: ", error);
  }
};

async function eliminarTodo() {
  if (registros.length === 0) return;

  if (confirm('¿Estás seguro de que deseas eliminar TODOS los registros de forma permanente en la nube?')) {
    try {
      const querySnapshot = await getDocs(registrosRef);
      querySnapshot.forEach(async (documento) => {
        await deleteDoc(doc(db, "registros_ampo", documento.id));
      });
    } catch (error) {
      console.error("Error al eliminar todo: ", error);
    }
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

  registros.forEach(r => {
    if (r.estado === 'Pendiente') {
      totalPendiente += r.pendiente;
      tbodyPendientes.appendChild(crearFilaPendiente(r));
    } else {
      totalFinalizados++;
      tbodyFinalizados.appendChild(crearFilaFinalizado(r));
    }
  });

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
  btnFinalizar.textContent = '✔ Finalizar';
  btnFinalizar.className = 'success';
  btnFinalizar.ariaLabel = `Finalizar registro ${registro.ampo}`;
  btnFinalizar.onclick = () => window.finalizar(registro.id);

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
    alert("No hay datos para exportar.");
    return;
  }

  let csvContent = "AMPO,Digitador,Fecha,Cantidad,Estado\n";

  registros.forEach(r => {
    const ampo = `"${r.ampo}"`;
    const digitador = `"${r.digitador}"`;
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