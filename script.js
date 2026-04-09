// Obtener datos existentes y asegurar compatibilidad de los identificadores
let registros = JSON.parse(localStorage.getItem('registros')) || [];
let needsSave = false;
registros.forEach((r, i) => {
  if (!r.id) {
    r.id = Date.now().toString() + i;
    needsSave = true;
  }
});
if (needsSave) guardar();

// Referencias a Elementos del DOM
const form = document.getElementById('registroForm');
const tbodyPendientes = document.getElementById('tbodyPendientes');
const tbodyFinalizados = document.getElementById('tbodyFinalizados');
const spanTotalPendiente = document.getElementById('totalPendiente');
const spanTotalFinalizados = document.getElementById('totalFinalizados');

const btnLimpiar = document.getElementById('btnLimpiar');
const btnEliminarTodo = document.getElementById('btnEliminarTodo');

// Inicialización de Eventos y UI
document.addEventListener('DOMContentLoaded', () => {
  render();
});

form.addEventListener('submit', agregarRegistro);
btnLimpiar.addEventListener('click', limpiarFormulario);
btnEliminarTodo.addEventListener('click', eliminarTodo);

// Funciones Principales
function guardar() {
  localStorage.setItem('registros', JSON.stringify(registros));
}

function agregarRegistro(event) {
  event.preventDefault(); // Evita que la página se recargue al enviar el formulario
  
  const inputAmpo = document.getElementById('ampo');
  const inputDigitador = document.getElementById('digitador');
  const inputFecha = document.getElementById('fecha');
  const inputPendiente = document.getElementById('pendiente');

  const ampo = inputAmpo.value.trim();
  const digitador = inputDigitador.value.trim();
  const fecha = inputFecha.value;
  const pendiente = parseInt(inputPendiente.value, 10);
  
  // Pequeña validación extra
  if (!ampo || !digitador || !fecha || isNaN(pendiente)) {
    alert("Por favor, completa todos los campos correctamente.");
    return;
  }
  
  registros.push({
    id: Date.now().toString(), // ID único
    ampo,
    digitador,
    fecha,
    pendiente,
    estado: 'Pendiente'
  });
  
  guardar();
  render();
  limpiarFormulario();
  inputAmpo.focus(); // Retorna el foco al primer input
}

function finalizar(id) {
  const index = registros.findIndex(r => r.id === id);
  if (index !== -1) {
    registros[index].estado = 'Finalizado';
    guardar();
    render();
  }
}

function eliminarTodo() {
  if (registros.length === 0) return;
  
  if (confirm('¿Estás seguro de que deseas eliminar todos los registros de forma permanente?')) {
    registros = [];
    guardar();
    render();
  }
}

function limpiarFormulario() {
  form.reset();
}

/**
 * Función que renderiza ambas tablas y reinicia los contadores.
 */
function render() {
  // Limpiar el contenido actual para evitar duplicados
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
  
  // Actualización del texto utilizando las variables DOM correctas
  spanTotalPendiente.textContent = totalPendiente;
  spanTotalFinalizados.textContent = totalFinalizados;
}

/**
 * Crea una fila en la tabla de Pendientes previniendo ataques de tipo inyección XSS
 */
function crearFilaPendiente(registro) {
  const tr = document.createElement('tr');
  
  tr.appendChild(crearCelda(registro.ampo, 'AMPO'));
  tr.appendChild(crearCelda(registro.digitador, 'Digitador'));
  tr.appendChild(crearCelda(registro.fecha, 'Fecha'));
  tr.appendChild(crearCelda(registro.pendiente, 'Pendiente'));
  
  // Columna de Acciones
  const tdAcciones = document.createElement('td');
  tdAcciones.setAttribute('data-label', 'Acciones');
  
  const btnFinalizar = document.createElement('button');
  btnFinalizar.textContent = '✔ Finalizar';
  btnFinalizar.className = 'success';
  btnFinalizar.ariaLabel = `Finalizar registro ${registro.ampo}`;
  
  // Asignamos el evento de esta manera para evitar el uso de eval() oculto y strings
  btnFinalizar.onclick = () => finalizar(registro.id);
  
  tdAcciones.appendChild(btnFinalizar);
  tr.appendChild(tdAcciones);
  
  return tr;
}

/**
 * Crea una fila en la tabla de Finalizados previniendo ataques XSS
 */
function crearFilaFinalizado(registro) {
  const tr = document.createElement('tr');
  
  tr.appendChild(crearCelda(registro.ampo, 'AMPO'));
  tr.appendChild(crearCelda(registro.digitador, 'Digitador'));
  tr.appendChild(crearCelda(registro.fecha, 'Fecha'));
  tr.appendChild(crearCelda(registro.pendiente, 'Cantidad'));
  
  return tr;
}

/**
 * Función auxiliar para crear y poblar celdas td previniendo XSS.
 * El data-label es útil para simular encabezados en la vista móvil.
 */
function crearCelda(texto, labelMobile) {
  const td = document.createElement('td');
  td.textContent = texto; // textContent es seguro contra XSS, porque escapa etiquetas HTML
  if(labelMobile) {
    td.setAttribute('data-label', labelMobile);
  }
  return td;
}
