/*
 * LOGISNAKE — Editor de preguntas del docente (modo personalizado)
 * -----------------------------------------------------------------
 * Guarda en localStorage { tema, preguntas:[...] } con el mismo formato que preguntas.js.
 * Permite crear, editar, eliminar, exportar (JSON para copiar) e importar (pegar JSON).
 */
(function (root) {
  'use strict';

  var G = root.LogiGame;
  var UI = root.UI;
  var CLAVE = 'logisnake.docente';
  var MINIMO = 4;
  var datos = { tema: '', preguntas: [] };
  var editando = -1;   // índice en edición (-1 = nueva)

  var NOMBRES_TIPO = { normal: 'Normal', cofre: '🎁 Cofre', alerta: '⚠️ Alerta', auditoria: '🔍 Auditoría', relampago: '⚡ Relámpago' };

  /* Banco de ejemplo para mostrar cómo se usa el modo personalizado. */
  var EJEMPLO = {
    tema: 'Seguridad en el almacén',
    preguntas: [
      { etapa: 0, tipo: 'normal', pregunta: '¿Qué equipo de protección personal (EPP) es básico para trabajar en un almacén con montacargas?', opciones: ['Casco, chaleco reflectivo y zapatos de seguridad', 'Solo guantes de látex', 'Lentes de sol', 'Ropa deportiva'], correcta: 0, explicacion: 'El casco protege de caídas de objetos, el chaleco hace visible al trabajador y el calzado de seguridad protege los pies.' },
      { etapa: 0, tipo: 'normal', pregunta: '¿Cuál es la técnica correcta para levantar una caja pesada del suelo?', opciones: ['Doblar la espalda con las piernas rectas', 'Flexionar las rodillas, mantener la espalda recta y la carga cerca del cuerpo', 'Levantarla girando el tronco', 'Levantarla con un solo brazo'], correcta: 1, explicacion: 'La fuerza debe venir de las piernas; así se protege la columna.' },
      { etapa: 0, tipo: 'normal', pregunta: 'En la señalización de seguridad, ¿qué color indica prohibición?', opciones: ['Azul', 'Verde', 'Rojo', 'Amarillo'], correcta: 2, explicacion: 'Rojo: prohibición y equipos contra incendio. Amarillo: advertencia. Azul: obligación. Verde: salvamento.' },
      { etapa: 0, tipo: 'normal', pregunta: '¿Qué extintor es adecuado para un amago de incendio en un tablero eléctrico energizado?', opciones: ['Agua presurizada', 'CO₂ o polvo químico seco (PQS)', 'Espuma', 'Arena mojada'], correcta: 1, explicacion: 'En fuegos de clase C (equipos eléctricos energizados) no se usa agua; se usa CO₂ o PQS.' },
      { etapa: 0, tipo: 'alerta', pregunta: 'Un operario derrama aceite en un pasillo por donde circulan montacargas. ¿Qué se debe hacer?', opciones: ['Seguir trabajando y limpiarlo al final del turno', 'Señalizar y aislar la zona, limpiar con el kit antiderrames y reportar el incidente', 'Echarle agua', 'Cubrirlo con cartón'], correcta: 1, explicacion: 'Primero se evita que alguien resbale o que un montacargas patine; luego se limpia con el material adecuado y se reporta.' },
      { etapa: 0, tipo: 'auditoria', pregunta: 'La auditoría encuentra que un montacargas es operado por personal sin capacitación ni autorización. ¿Qué medida corresponde?', opciones: ['Permitirlo si tiene experiencia', 'Prohibir que opere hasta que sea capacitado y autorizado formalmente', 'Que opere solo de noche', 'Ninguna'], correcta: 1, explicacion: 'Solo el personal capacitado y autorizado puede operar equipos de manipulación de carga.' },
      { etapa: 0, tipo: 'cofre', pregunta: 'Un nivel de rack soporta como máximo 1 000 kg. ¿Cuántos pallets de 280 kg se pueden colocar como máximo en ese nivel?', opciones: ['2 pallets', '3 pallets', '4 pallets', '5 pallets'], correcta: 1, explicacion: '3 × 280 = 840 kg (permitido); 4 × 280 = 1 120 kg superaría la capacidad del rack.' },
      { etapa: 0, tipo: 'relampago', pregunta: 'En la señalización de seguridad, ¿qué indica una señal circular de color azul?', opciones: ['Prohibición', 'Obligación (por ejemplo, uso obligatorio de casco)', 'Salida de emergencia', 'Peligro'], correcta: 1, explicacion: 'Las señales azules circulares indican una obligación, como el uso de EPP.' }
    ]
  };

  /* ----------------------------- Persistencia ----------------------------- */

  function cargar() {
    try {
      var txt = root.localStorage.getItem(CLAVE);
      if (txt) {
        var d = JSON.parse(txt);
        datos.tema = typeof d.tema === 'string' ? d.tema : '';
        datos.preguntas = Array.isArray(d.preguntas) ? d.preguntas.filter(function (p) { return G.validarPregunta(p).ok; }) : [];
      }
    } catch (e) { /* almacenamiento no disponible */ }
    return datos;
  }

  function guardar() {
    try { root.localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { /* sin acción */ }
  }

  function obtener() { return { tema: datos.tema, preguntas: datos.preguntas.slice() }; }

  /* -------------------------------- Vista -------------------------------- */

  function montar() {
    var cont = UI.$('#editor-contenido');
    cont.innerHTML =
      '<div class="editor-grid">' +
      '  <div class="panel editor-lista-panel">' +
      '    <label class="campo"><span>Tema del recorrido</span><input id="ed-tema" maxlength="60" placeholder="Ej.: Gestión de RR. HH."></label>' +
      '    <div class="editor-acciones">' +
      '      <button class="btn btn-verde btn-chico" id="ed-nueva">➕ Nueva</button>' +
      '      <button class="btn btn-azul btn-chico" id="ed-ejemplo">📚 Cargar preguntas de ejemplo</button>' +
      '      <button class="btn btn-morado btn-chico" id="ed-exportar">📤 Exportar</button>' +
      '      <button class="btn btn-morado btn-chico" id="ed-importar">📥 Importar</button>' +
      '      <button class="btn btn-gris btn-chico" id="ed-vaciar">🗑️ Vaciar</button>' +
      '    </div>' +
      '    <p class="ed-contador" id="ed-contador"></p>' +
      '    <ol class="ed-lista" id="ed-lista"></ol>' +
      '  </div>' +
      '  <form class="panel editor-form" id="ed-form" novalidate>' +
      '    <h3 id="ed-form-titulo">Nueva pregunta</h3>' +
      '    <label class="campo"><span>Pregunta</span><textarea id="ed-pregunta" rows="3" maxlength="400"></textarea></label>' +
      '    <fieldset class="campo"><legend>Alternativas (marca la correcta)</legend>' +
      [0, 1, 2, 3].map(function (i) {
        return '<div class="ed-alt"><input type="radio" name="ed-correcta" value="' + i + '" id="ed-c' + i + '" aria-label="Alternativa ' + 'ABCD'[i] + ' es la correcta">' +
          '<label for="ed-c' + i + '" class="ed-letra">' + 'ABCD'[i] + '</label>' +
          '<input type="text" id="ed-op' + i + '" maxlength="200" placeholder="Alternativa ' + 'ABCD'[i] + (i > 1 ? ' (opcional)' : '') + '"></div>';
      }).join('') +
      '    </fieldset>' +
      '    <label class="campo"><span>Explicación (retroalimentación)</span><textarea id="ed-explicacion" rows="2" maxlength="400"></textarea></label>' +
      '    <label class="campo"><span>Tipo</span><select id="ed-tipo">' +
      Object.keys(NOMBRES_TIPO).map(function (t) { return '<option value="' + t + '">' + NOMBRES_TIPO[t] + '</option>'; }).join('') +
      '    </select></label>' +
      '    <div class="ed-errores" id="ed-errores" role="alert"></div>' +
      '    <div class="modal-botones"><button type="button" class="btn btn-gris" id="ed-cancelar">Limpiar</button><button type="submit" class="btn btn-verde">💾 Guardar pregunta</button></div>' +
      '  </form>' +
      '</div>';

    UI.$('#ed-tema').value = datos.tema;
    UI.$('#ed-tema').addEventListener('input', function (e) { datos.tema = e.target.value; guardar(); });
    UI.$('#ed-nueva').addEventListener('click', function () { limpiarForm(); UI.$('#ed-pregunta').focus(); });
    UI.$('#ed-cancelar').addEventListener('click', limpiarForm);
    UI.$('#ed-form').addEventListener('submit', function (e) { e.preventDefault(); guardarForm(); });
    UI.$('#ed-ejemplo').addEventListener('click', cargarEjemplo);
    UI.$('#ed-exportar').addEventListener('click', exportar);
    UI.$('#ed-importar').addEventListener('click', importar);
    UI.$('#ed-vaciar').addEventListener('click', vaciar);
    UI.$('#ed-lista').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]');
      if (!b) return;
      var i = Number(b.dataset.i);
      if (b.dataset.accion === 'editar') editar(i);
      else eliminar(i);
    });
    limpiarForm();
    renderLista();
  }

  function renderLista() {
    var n = datos.preguntas.length;
    var c = UI.$('#ed-contador');
    c.innerHTML = '<strong>' + n + '</strong> pregunta' + (n === 1 ? '' : 's') +
      (n < MINIMO ? ' · <span class="falta">Se necesitan al menos ' + MINIMO + ' para jugar.</span>' : ' · <span class="listo">✔ Listo para jugar</span>');
    UI.$('#ed-lista').innerHTML = n ? datos.preguntas.map(function (p, i) {
      return '<li class="' + (i === editando ? 'editando' : '') + '"><div class="ed-item-texto"><span class="chip chip-mini chip-' + p.tipo + '">' + NOMBRES_TIPO[p.tipo] + '</span>' + UI.esc(p.pregunta) + '</div>' +
        '<div class="ed-item-botones"><button class="btn btn-azul btn-mini" data-accion="editar" data-i="' + i + '" aria-label="Editar pregunta ' + (i + 1) + '">✏️ Editar</button>' +
        '<button class="btn btn-rojo btn-mini" data-accion="eliminar" data-i="' + i + '" aria-label="Eliminar pregunta ' + (i + 1) + '">🗑️</button></div></li>';
    }).join('') : '<li class="vacia">Aún no hay preguntas. Crea una o carga las de ejemplo.</li>';
  }

  function limpiarForm() {
    editando = -1;
    UI.$('#ed-form-titulo').textContent = 'Nueva pregunta';
    UI.$('#ed-pregunta').value = '';
    UI.$('#ed-explicacion').value = '';
    UI.$('#ed-tipo').value = 'normal';
    for (var i = 0; i < 4; i++) { UI.$('#ed-op' + i).value = ''; UI.$('#ed-c' + i).checked = false; }
    UI.$('#ed-errores').innerHTML = '';
    renderLista();
  }

  function editar(i) {
    var p = datos.preguntas[i];
    editando = i;
    UI.$('#ed-form-titulo').textContent = 'Editando pregunta ' + (i + 1);
    UI.$('#ed-pregunta').value = p.pregunta;
    UI.$('#ed-explicacion').value = p.explicacion || '';
    UI.$('#ed-tipo').value = p.tipo;
    for (var k = 0; k < 4; k++) {
      UI.$('#ed-op' + k).value = p.opciones[k] || '';
      UI.$('#ed-c' + k).checked = p.correcta === k;
    }
    UI.$('#ed-errores').innerHTML = '';
    renderLista();
    UI.$('#ed-form').scrollIntoView({ behavior: UI.reducido() ? 'auto' : 'smooth', block: 'start' });
    UI.$('#ed-pregunta').focus({ preventScroll: true });
  }

  function guardarForm() {
    var marcada = UI.$('input[name="ed-correcta"]:checked');
    var p = {
      etapa: 0,
      tipo: UI.$('#ed-tipo').value,
      pregunta: UI.$('#ed-pregunta').value,
      opciones: [0, 1, 2, 3].map(function (i) { return UI.$('#ed-op' + i).value; }),
      correcta: marcada ? Number(marcada.value) : -1,
      explicacion: UI.$('#ed-explicacion').value
    };
    var v = G.validarPregunta(p);
    if (!marcada) v.errores = v.errores.filter(function (e) { return e.indexOf('correcta') < 0; }).concat(['Marca cuál es la alternativa correcta']);
    if (!v.ok || !marcada) {
      UI.$('#ed-errores').innerHTML = '<ul>' + v.errores.map(function (e) { return '<li>' + UI.esc(e) + '</li>'; }).join('') + '</ul>';
      return;
    }
    if (editando >= 0) datos.preguntas[editando] = v.pregunta;
    else datos.preguntas.push(v.pregunta);
    guardar();
    UI.toast('💾 Pregunta guardada', 'ok');
    limpiarForm();
  }

  async function eliminar(i) {
    var ok = await UI.confirmar({ titulo: '¿Eliminar esta pregunta?', texto: datos.preguntas[i].pregunta, si: 'Eliminar', icono: '🗑️' });
    if (!ok) return;
    datos.preguntas.splice(i, 1);
    if (editando === i) editando = -1;
    guardar();
    limpiarForm();
  }

  async function vaciar() {
    if (!datos.preguntas.length) return;
    var ok = await UI.confirmar({ titulo: '¿Eliminar todas las preguntas?', texto: 'Esta acción no se puede deshacer. Puedes exportarlas antes como respaldo.', si: 'Eliminar todo', icono: '🗑️' });
    if (!ok) return;
    datos.preguntas = [];
    guardar();
    limpiarForm();
  }

  async function cargarEjemplo() {
    if (datos.preguntas.length) {
      var ok = await UI.confirmar({ titulo: '¿Cargar preguntas de ejemplo?', texto: 'Se agregarán 8 preguntas de ejemplo sobre «Seguridad en el almacén» a tu lista actual.', si: 'Agregar', claseSi: 'btn-verde', icono: '📚' });
      if (!ok) return;
    }
    if (!datos.tema) { datos.tema = EJEMPLO.tema; UI.$('#ed-tema').value = datos.tema; }
    datos.preguntas = datos.preguntas.concat(JSON.parse(JSON.stringify(EJEMPLO.preguntas)));
    guardar();
    limpiarForm();
    UI.toast('📚 Se cargaron ' + EJEMPLO.preguntas.length + ' preguntas de ejemplo', 'ok');
  }

  function exportar() {
    var json = JSON.stringify({ tema: datos.tema, preguntas: datos.preguntas }, null, 2);
    var m = UI.abrirModal({
      clase: 'modal-ancho', cerrable: true, etiqueta: 'Exportar preguntas',
      html: '<h2 class="modal-titulo">📤 Exportar preguntas</h2>' +
        '<p class="modal-texto">Copia este texto y guárdalo (por ejemplo, en un documento). Podrás importarlo después en cualquier equipo.</p>' +
        '<textarea class="json-area" readonly rows="12">' + UI.esc(json) + '</textarea>' +
        '<div class="modal-botones"><button class="btn btn-gris" data-cerrar>Cerrar</button><button class="btn btn-verde btn-principal" data-copiar>📋 Copiar</button></div>'
    });
    var area = m.el.querySelector('textarea');
    m.el.querySelector('[data-cerrar]').addEventListener('click', m.cerrar);
    m.el.querySelector('[data-copiar]').addEventListener('click', function () {
      function respaldo() {
        area.focus(); area.select();
        try { doc().execCommand('copy'); UI.toast('📋 Copiado', 'ok'); } catch (e) { UI.toast('Selecciona el texto y cópialo con Ctrl+C', 'mal'); }
      }
      if (root.navigator.clipboard && root.isSecureContext) {
        root.navigator.clipboard.writeText(json).then(function () { UI.toast('📋 Copiado al portapapeles', 'ok'); }, respaldo);
      } else respaldo();
    });
  }

  function doc() { return root.document; }

  function importar() {
    var m = UI.abrirModal({
      clase: 'modal-ancho', cerrable: true, etiqueta: 'Importar preguntas',
      html: '<h2 class="modal-titulo">📥 Importar preguntas</h2>' +
        '<p class="modal-texto">Pega aquí el JSON exportado (o un arreglo de preguntas con el formato de <code>preguntas.js</code>).</p>' +
        '<textarea class="json-area" rows="12" placeholder=\'{ "tema": "...", "preguntas": [ ... ] }\'></textarea>' +
        '<div class="ed-errores" role="alert"></div>' +
        '<div class="modal-botones"><button class="btn btn-gris" data-cerrar>Cancelar</button>' +
        '<button class="btn btn-azul" data-modo="agregar">➕ Agregar a la lista</button>' +
        '<button class="btn btn-verde btn-principal" data-modo="reemplazar">🔁 Reemplazar lista</button></div>'
    });
    var area = m.el.querySelector('textarea');
    var errores = m.el.querySelector('.ed-errores');
    m.el.querySelector('[data-cerrar]').addEventListener('click', m.cerrar);
    m.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-modo]');
      if (!b) return;
      var r = analizar(area.value);
      if (!r.ok) { errores.innerHTML = '<ul>' + r.errores.map(function (x) { return '<li>' + UI.esc(x) + '</li>'; }).join('') + '</ul>'; return; }
      datos.preguntas = b.dataset.modo === 'reemplazar' ? r.preguntas : datos.preguntas.concat(r.preguntas);
      if (r.tema && (b.dataset.modo === 'reemplazar' || !datos.tema)) { datos.tema = r.tema; UI.$('#ed-tema').value = r.tema; }
      guardar();
      m.cerrar();
      limpiarForm();
      UI.toast('📥 Se importaron ' + r.preguntas.length + ' preguntas' + (r.omitidas ? ' (' + r.omitidas + ' omitidas por formato inválido)' : ''), 'ok', 3200);
    });
  }

  /** Analiza y valida el JSON pegado. */
  function analizar(texto) {
    var d;
    try { d = JSON.parse(texto); } catch (e) { return { ok: false, errores: ['El texto no es un JSON válido. Revisa comillas, comas y corchetes.'] }; }
    var lista = Array.isArray(d) ? d : (d && Array.isArray(d.preguntas) ? d.preguntas : null);
    if (!lista) return { ok: false, errores: ['No se encontró una lista de preguntas. Se espera un arreglo o un objeto con la propiedad "preguntas".'] };
    var validas = [], errores = [];
    lista.forEach(function (p, i) {
      var v = G.validarPregunta(p);
      if (v.ok) { v.pregunta.etapa = 0; validas.push(v.pregunta); }
      else if (errores.length < 5) errores.push('Pregunta ' + (i + 1) + ': ' + v.errores.join(', '));
    });
    if (!validas.length) return { ok: false, errores: ['Ninguna pregunta tiene un formato válido.'].concat(errores) };
    return { ok: true, preguntas: validas, omitidas: lista.length - validas.length, tema: d && typeof d.tema === 'string' ? d.tema : '' };
  }

  cargar();

  root.Editor = {
    MINIMO: MINIMO,
    montar: montar,
    obtener: obtener,
    cargar: cargar
  };
})(window);
