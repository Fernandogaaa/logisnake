/*
 * LOGISNAKE — Interfaz
 * --------------------
 * Pantallas, modales propios (sin alert/confirm/prompt), marcador, dado, temporizador,
 * modal de pregunta, modal de resultado, pantalla final y confeti.
 * No contiene reglas del juego: solo muestra el estado y avisa de lo que hace el usuario.
 */
(function (root) {
  'use strict';

  var G = root.LogiGame;
  var doc = root.document;

  /* ---------------------------- Utilidades ---------------------------- */

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  function esc(txt) {
    return String(txt == null ? '' : txt)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function reducido() {
    return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function corazones(vidas, max, perdido) {
    var h = '';
    for (var i = 0; i < (max || 3); i++) {
      var cls = i < vidas ? 'lleno' : 'vacio';
      if (perdido && i === vidas) cls += ' pierde';
      h += '<span class="corazon ' + cls + '" aria-hidden="true">' + (i < vidas ? '❤️' : '🖤') + '</span>';
    }
    return '<span class="corazones" aria-label="' + vidas + ' vidas">' + h + '</span>';
  }

  function fichaHTML(e, extra) {
    return '<span class="ficha-mini ' + (extra || '') + '" style="--color:' + e.color + '">' + e.icono + '</span>';
  }

  /* ----------------------------- Pantallas ----------------------------- */

  function mostrarPantalla(id) {
    $$('.pantalla').forEach(function (p) {
      var activa = p.id === 'pantalla-' + id;
      p.classList.toggle('activa', activa);
      p.hidden = !activa;
    });
    root.scrollTo(0, 0);
    var h = $('#pantalla-' + id + ' h1, #pantalla-' + id + ' h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  /* ------------------------------ Modales ------------------------------ */

  var pila = [];

  /**
   * Abre un modal. opciones: { html, clase, cerrable, alCerrar, etiqueta }
   * Devuelve { el, cerrar }.
   */
  function abrirModal(op) {
    var capa = doc.createElement('div');
    capa.className = 'modal-capa';
    capa.innerHTML = '<div class="modal ' + (op.clase || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(op.etiqueta || 'Ventana') + '">' + op.html + '</div>';
    doc.body.appendChild(capa);
    var anterior = doc.activeElement;
    var m = {
      el: capa.querySelector('.modal'),
      capa: capa,
      cerrable: !!op.cerrable,
      cerrar: function () {
        var i = pila.indexOf(m);
        if (i < 0) return;
        pila.splice(i, 1);
        capa.classList.add('saliendo');
        setTimeout(function () { capa.remove(); }, reducido() ? 0 : 160);
        if (op.alCerrar) op.alCerrar();
        if (anterior && anterior.focus && doc.body.contains(anterior)) anterior.focus({ preventScroll: true });
      }
    };
    if (op.cerrable) {
      capa.addEventListener('mousedown', function (ev) { if (ev.target === capa) m.cerrar(); });
    }
    pila.push(m);
    requestAnimationFrame(function () {
      var f = m.el.querySelector('[autofocus], .btn-principal, button, input, select, textarea');
      if (f) f.focus({ preventScroll: true });
    });
    return m;
  }

  function modalSuperior() { return pila[pila.length - 1] || null; }

  function cerrarTodos() { pila.slice().reverse().forEach(function (m) { m.cerrar(); }); }

  /** Modal de confirmación. Devuelve una promesa con true/false. */
  function confirmar(op) {
    return new Promise(function (resolver) {
      var respondido = false;
      var m = abrirModal({
        clase: 'modal-chico',
        cerrable: true,
        etiqueta: op.titulo,
        alCerrar: function () { if (!respondido) resolver(false); },
        html:
          '<div class="modal-icono">' + (op.icono || '❓') + '</div>' +
          '<h2 class="modal-titulo">' + esc(op.titulo) + '</h2>' +
          (op.texto ? '<p class="modal-texto">' + esc(op.texto) + '</p>' : '') +
          '<div class="modal-botones">' +
          '<button class="btn btn-gris" data-r="no">' + esc(op.no || 'Cancelar') + '</button>' +
          '<button class="btn ' + (op.claseSi || 'btn-rojo') + ' btn-principal" data-r="si">' + esc(op.si || 'Aceptar') + '</button>' +
          '</div>'
      });
      m.el.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-r]');
        if (!b) return;
        respondido = true;
        m.cerrar();
        resolver(b.dataset.r === 'si');
      });
    });
  }

  /** Mensaje simple con un botón. */
  function aviso(op) {
    return new Promise(function (resolver) {
      var m = abrirModal({
        clase: 'modal-chico',
        cerrable: true,
        etiqueta: op.titulo,
        alCerrar: function () { resolver(); },
        html:
          '<div class="modal-icono">' + (op.icono || 'ℹ️') + '</div>' +
          '<h2 class="modal-titulo">' + esc(op.titulo) + '</h2>' +
          (op.html || (op.texto ? '<p class="modal-texto">' + esc(op.texto) + '</p>' : '')) +
          '<div class="modal-botones"><button class="btn btn-verde btn-principal" data-ok>' + esc(op.boton || 'Entendido') + '</button></div>'
      });
      m.el.querySelector('[data-ok]').addEventListener('click', function () { m.cerrar(); });
    });
  }

  /* ------------------------------ Avisos ------------------------------ */

  function toast(html, clase, ms) {
    var cont = $('#toasts');
    if (!cont) return;
    var t = doc.createElement('div');
    t.className = 'toast ' + (clase || '');
    t.setAttribute('role', 'status');
    t.innerHTML = html;
    cont.appendChild(t);
    setTimeout(function () { t.classList.add('saliendo'); }, ms || 2200);
    setTimeout(function () { t.remove(); }, (ms || 2200) + 400);
  }

  /* ------------------------------ Mascota ------------------------------ */

  function mascotaSVG(clase) {
    return '<svg class="mascota ' + (clase || '') + '" viewBox="0 -40 200 270" role="img" aria-label="Mascota de LOGISNAKE: una serpiente verde">' +
      '<ellipse cx="100" cy="222" rx="74" ry="9" fill="rgba(0,0,0,.28)"/>' +
      // cola
      '<path d="M158 206 C190 204 196 178 180 170" fill="none" stroke="#1E7A35" stroke-width="14" stroke-linecap="round"/>' +
      '<path d="M158 206 C190 204 196 178 180 170" fill="none" stroke="#4CD964" stroke-width="8" stroke-linecap="round"/>' +
      // espirales
      '<ellipse cx="100" cy="198" rx="72" ry="22" fill="#2FA84A" stroke="#1E7A35" stroke-width="5"/>' +
      '<ellipse cx="100" cy="192" rx="60" ry="12" fill="#4CD964" opacity=".55"/>' +
      '<ellipse cx="102" cy="170" rx="56" ry="19" fill="#38B84F" stroke="#1E7A35" stroke-width="5"/>' +
      '<ellipse cx="102" cy="165" rx="44" ry="9" fill="#6EE06A" opacity=".55"/>' +
      // cuello
      '<path d="M96 168 C 66 140, 70 112, 104 96" fill="none" stroke="#1E7A35" stroke-width="40" stroke-linecap="round"/>' +
      '<path d="M96 168 C 66 140, 70 112, 104 96" fill="none" stroke="#4CD964" stroke-width="31" stroke-linecap="round"/>' +
      '<path d="M98 162 C 78 140, 80 118, 104 104" fill="none" stroke="#C9F7A8" stroke-width="12" stroke-linecap="round" stroke-dasharray="7 6"/>' +
      // manchas
      '<circle cx="70" cy="196" r="6" fill="#2A9944"/><circle cx="132" cy="200" r="7" fill="#2A9944"/><circle cx="120" cy="168" r="5" fill="#2A9944"/>' +
      // cabeza
      '<ellipse cx="106" cy="76" rx="52" ry="40" fill="#1E7A35"/>' +
      '<ellipse cx="106" cy="76" rx="47" ry="35" fill="#4CD964"/>' +
      '<ellipse cx="112" cy="94" rx="30" ry="12" fill="#9BF59B" opacity=".7"/>' +
      // ojos
      '<ellipse cx="88" cy="66" rx="14" ry="16" fill="#fff" stroke="#1E7A35" stroke-width="2"/>' +
      '<ellipse cx="124" cy="66" rx="14" ry="16" fill="#fff" stroke="#1E7A35" stroke-width="2"/>' +
      '<circle class="pupila" cx="91" cy="69" r="7" fill="#1b1b2f"/><circle class="pupila" cx="127" cy="69" r="7" fill="#1b1b2f"/>' +
      '<circle cx="93.5" cy="66" r="2.6" fill="#fff"/><circle cx="129.5" cy="66" r="2.6" fill="#fff"/>' +
      // mejillas y sonrisa
      '<ellipse cx="72" cy="88" rx="8" ry="5" fill="#FF8FA3" opacity=".7"/><ellipse cx="142" cy="88" rx="8" ry="5" fill="#FF8FA3" opacity=".7"/>' +
      '<path d="M92 92 Q106 106 122 92" fill="none" stroke="#14532d" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M106 101 l0 14 m0 0 l-5 6 m5 -6 l5 6" fill="none" stroke="#E5484D" stroke-width="3.5" stroke-linecap="round"/>' +
      // sombrero de bruja (Halloween)
      '<g class="sombrero sombrero-bruja">' +
      '<ellipse cx="104" cy="44" rx="58" ry="11" fill="#2A1450" stroke="#12062a" stroke-width="3"/>' +
      '<path d="M74 44 L104 -26 Q110 -36 118 -26 Q122 -18 116 -12 L134 44 Z" fill="#4B2A86" stroke="#12062a" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M78 34 L131 34 L134 44 L75 44 Z" fill="#FF8A1F"/>' +
      '<rect x="98" y="33" width="13" height="12" rx="2" fill="none" stroke="#FFD43B" stroke-width="3"/>' +
      '</g>' +
      // gorro de Papá Noel (Navidad)
      '<g class="sombrero sombrero-noel">' +
      '<path d="M66 46 Q90 -18 140 6 Q160 18 160 40 L146 46 Z" fill="#E53935" stroke="#8E1B1B" stroke-width="3" stroke-linejoin="round"/>' +
      '<rect x="60" y="36" width="94" height="18" rx="9" fill="#fff" stroke="#d8d8d8" stroke-width="2"/>' +
      '<circle cx="160" cy="44" r="11" fill="#fff" stroke="#d8d8d8" stroke-width="2"/>' +
      '</g>' +
      // casco de seguridad (Clásico)
      '<g class="sombrero sombrero-casco">' +
      '<path d="M64 46 Q64 4 106 2 Q148 4 148 46 Z" fill="#FFC21A" stroke="#9A6B00" stroke-width="3"/>' +
      '<rect x="54" y="42" width="104" height="10" rx="5" fill="#FFB000" stroke="#9A6B00" stroke-width="3"/>' +
      '<path d="M106 4 L106 42" stroke="#E0A000" stroke-width="8"/>' +
      '<path d="M84 12 Q80 26 80 42 M128 12 Q132 26 132 42" stroke="#E0A000" stroke-width="3" fill="none"/>' +
      '</g>' +
      '</svg>';
  }

  /* -------------------------------- Dado -------------------------------- */

  var PUNTOS_DADO = {
    1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9]
  };

  function caraDado(v) {
    var h = '';
    for (var i = 1; i <= 9; i++) h += '<span class="pip' + (PUNTOS_DADO[v].indexOf(i) >= 0 ? ' on' : '') + '"></span>';
    return h;
  }

  async function animarDado(dadoEl, valor) {
    root.AudioJuego.efecto('dado');
    dadoEl.setAttribute('aria-label', 'Dado: ' + valor);
    if (reducido()) { dadoEl.innerHTML = caraDado(valor); await esperar(250); return; }
    dadoEl.classList.add('rodando');
    for (var i = 0; i < 9; i++) {
      dadoEl.innerHTML = caraDado(1 + Math.floor(Math.random() * 6));
      await esperar(70);
    }
    dadoEl.innerHTML = caraDado(valor);
    dadoEl.classList.remove('rodando');
    dadoEl.classList.add('cayo');
    await esperar(380);
    dadoEl.classList.remove('cayo');
  }

  /* ---------------------------- Temporizador ----------------------------
   * Solo descuenta mientras el modal de la pregunta está en primer plano.
   */
  var crono = { id: null };

  /**
   * Temporizador sincronizado con el reloj del servidor (modo en línea).
   * reloj: { inicio: ms del servidor, duracion: segundos (0 = sin límite) }
   * ahora(): hora estimada del servidor. gracia: ms extra antes de dar por agotado.
   */
  function iniciarTemporizadorServidor(reloj, ahora, cont, alAgotar, gracia) {
    detenerTemporizador();
    if (!cont) return;
    if (!reloj || !reloj.duracion) { cont.classList.add('sin-limite'); return; }
    var total = reloj.duracion * 1000;
    var fin = reloj.inicio + total;
    var circ = 2 * Math.PI * 26;
    var ultimoTic = null;
    function pintar() {
      var restante = Math.max(0, fin - ahora());
      var s = Math.ceil(restante / 1000);
      var num = $('.temp-num', cont), arco = $('.temp-arco', cont);
      if (num) num.textContent = s;
      if (arco) arco.style.strokeDashoffset = (circ * (1 - restante / total)).toFixed(1);
      cont.classList.toggle('alerta', s <= 5);
      root.AudioJuego.urgente(s < 10 && s > 0);
      if (s <= 5 && s > 0 && s !== ultimoTic) { ultimoTic = s; root.AudioJuego.efecto('tic'); }
      return fin - ahora();
    }
    pintar();
    crono.id = setInterval(function () {
      if (pintar() <= -(gracia || 0)) {
        detenerTemporizador();
        if (alAgotar) alAgotar();
      }
    }, 150);
  }

  function iniciarTemporizador(segundos, modal, alAgotar) {
    detenerTemporizador();
    var cont = $('.temporizador', modal.el);
    if (!segundos) {
      if (cont) cont.classList.add('sin-limite');
      return;
    }
    var restante = segundos * 1000;
    var ultimo = performance.now();
    var ultimoTic = null;
    var circ = 2 * Math.PI * 26;
    function pintar() {
      var s = Math.ceil(restante / 1000);
      $('.temp-num', cont).textContent = s;
      $('.temp-arco', cont).style.strokeDashoffset = (circ * (1 - restante / (segundos * 1000))).toFixed(1);
      cont.classList.toggle('alerta', s <= 5);
      root.AudioJuego.urgente(s < 10);
      if (s <= 5 && s > 0 && s !== ultimoTic) { ultimoTic = s; root.AudioJuego.efecto('tic'); }
    }
    pintar();
    crono.id = setInterval(function () {
      var ahora = performance.now();
      if (modalSuperior() === modal) restante -= ahora - ultimo;
      ultimo = ahora;
      if (restante <= 0) {
        restante = 0;
        pintar();
        detenerTemporizador();
        alAgotar();
        return;
      }
      pintar();
    }, 100);
  }

  function detenerTemporizador() {
    clearInterval(crono.id);
    crono.id = null;
    root.AudioJuego.urgente(false);
  }

  /* -------------------------- Pantalla de juego -------------------------- */

  function textoEtapa(estado) {
    var cfg = estado.config;
    if (cfg.modo === 'personalizado') {
      return { icono: '📝', texto: cfg.tema ? cfg.tema : 'Recorrido personalizado', color: '#7B5CD6' };
    }
    var turno = G.equipoDeTurno(estado);
    var pos = Math.max(1, estado.equipos[turno].pos);
    var et = G.etapaPorId(G.etapaDeCasilla(pos, cfg));
    return { icono: et.icono, texto: 'Etapa ' + et.id + ' · ' + et.nombre, color: et.color };
  }

  function renderJuego(estado, opciones) {
    opciones = opciones || {};
    var turno = G.equipoDeTurno(estado);
    var eqT = estado.equipos[turno];

    // Cartel de etapa
    var et = textoEtapa(estado);
    var cartel = $('#cartel-etapa');
    cartel.style.setProperty('--etapa', et.color);
    cartel.innerHTML = '<span class="cartel-etapa-icono">' + et.icono + '</span><span>' + esc(et.texto) + '</span>';

    // Marcador
    var perdidas = {};
    (opciones.vidasPerdidas || []).forEach(function (i) { perdidas[i] = true; });
    var conexion = opciones.conexion || null;
    $('#marcador').innerHTML = '<h2 class="panel-titulo">Equipos</h2>' + estado.orden.map(function (i) {
      var e = estado.equipos[i];
      var etiqueta = e.enMeta ? '<span class="tag tag-meta">🏆 En META</span>'
        : e.eliminado ? '<span class="tag tag-elim">Eliminado</span>'
        : (i === turno && estado.fase !== 'fin') ? '<span class="tag tag-turno">Turno</span>' : '';
      return '<div class="equipo-fila' + (i === turno && estado.fase !== 'fin' ? ' de-turno' : '') + (e.eliminado ? ' eliminado' : '') + '" style="--color:' + e.color + '">' +
        fichaHTML(e) +
        '<div class="equipo-datos">' +
        '<div class="equipo-nombre">' + esc(e.nombre) + (conexion ? conexionHTML(conexion[i]) : '') + '</div>' +
        '<div class="equipo-stats"><span class="pts">⭐ ' + e.puntos + ' pts</span>' + corazones(e.vidas, G.REGLAS.VIDAS_INICIALES, perdidas[i]) + '</div>' +
        '<div class="equipo-pos">Casilla ' + e.pos + ' ' + etiqueta + '</div>' +
        '</div></div>';
    }).join('');

    // Panel de turno
    $('#turno-equipo').innerHTML = fichaHTML(eqT, 'grande') + '<div><small>Turno de</small><strong>' + esc(eqT.nombre) + '</strong>' +
      '<div class="turno-mini">⭐ ' + eqT.puntos + ' · ' + corazones(eqT.vidas, 3) + '</div></div>';
    $('#turno-equipo').style.setProperty('--color', eqT.color);
    $('#ronda').textContent = 'Ronda ' + estado.ronda;
    actualizarControles(estado, !!opciones.ocupado);
  }

  /** Indicador de conexión de un equipo (modo en línea). */
  function conexionHTML(c) {
    if (c === 'online') return ' <span class="conexion conexion-on" title="Dispositivo conectado">📶</span>';
    if (c === 'offline') return ' <span class="conexion conexion-off" title="Dispositivo desconectado">⚠️ desconectado</span>';
    if (c === 'anfitrion') return ' <span class="conexion conexion-host" title="Lo controla el anfitrión">🖥️</span>';
    return '';
  }

  // Permiso para controlar al equipo de turno desde esta pantalla (en línea: solo si lo controla el anfitrión).
  var permiso = function () { return true; };
  function ponerPermiso(fn) { permiso = fn || function () { return true; }; }

  function actualizarControles(estado, ocupado) {
    var btnDado = $('#btn-tirar'), btnRel = $('#btn-relampago');
    if (!btnDado) return;
    var turno = estado ? G.equipoDeTurno(estado) : 0;
    var puede = !!estado && estado.fase === 'turno' && !ocupado && permiso(turno);
    btnDado.disabled = !puede;
    var pts = estado ? estado.equipos[turno].puntos : 0;
    btnRel.disabled = !puede || pts < G.REGLAS.COSTO_RELAMPAGO;
    $('#relampago-ayuda').textContent = pts >= G.REGLAS.COSTO_RELAMPAGO
      ? 'Canjea 5 puntos: si aciertas, avanzas 3 casillas.'
      : 'Disponible con 5 puntos (' + pts + '/5).';
  }

  function leyendaHTML() {
    var t = G.TIPOS_CASILLA;
    return '<h2 class="panel-titulo">Casillas especiales</h2><ul class="leyenda">' +
      ['cofre', 'alerta', 'auditoria', 'relampago'].map(function (k) {
        var d = {
          cofre: 'Acierta y elige: avanzar 3 o hacer retroceder 3 a un rival.',
          alerta: 'Error: −1 vida y retrocedes 2.',
          auditoria: 'Acierto vale +2 puntos.',
          relampago: 'Canje de 5 pts (no es casilla): avanza 3.'
        }[k];
        return '<li class="leyenda-' + k + '"><span class="leyenda-icono">' + t[k].icono + '</span><div><strong>' + t[k].nombre + '</strong><small>' + d + '</small></div></li>';
      }).join('') + '</ul>';
  }

  /* -------------------------- Modal de pregunta -------------------------- */

  var LETRAS = ['A', 'B', 'C', 'D'];

  /**
   * opciones (modo en línea): { soloLectura, reloj, ahora, gracia }
   *   soloLectura: la pregunta se muestra pero se responde desde el dispositivo del equipo.
   *   reloj/ahora: temporizador sincronizado con el servidor.
   */
  function abrirPregunta(estado, alResponder, op) {
    op = op || {};
    var p = estado.preguntaActual;
    var e = estado.equipos[p.equipo];
    var info = G.TIPOS_CASILLA[p.tipo];
    var et = G.etapaPorId(p.etapa);
    var titulo = p.tipo === 'relampago' ? '⚡ Pregunta relámpago' : 'Casilla ' + p.casilla + (p.tipo !== 'normal' ? ' · ' + info.icono + ' ' + info.nombre : '');
    var circ = (2 * Math.PI * 26).toFixed(1);
    var html =
      '<div class="preg-cabecera">' +
      '  <span class="chip chip-tipo chip-' + p.tipo + '">' + esc(titulo) + '</span>' +
      '  <span class="chip chip-equipo" style="--color:' + e.color + '">' + fichaHTML(e) + esc(e.nombre) + ' ' + corazones(e.vidas, 3) + '</span>' +
      '  <div class="temporizador" aria-live="off"><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="26" class="temp-fondo"/>' +
      '     <circle cx="30" cy="30" r="26" class="temp-arco" style="stroke-dasharray:' + circ + ';stroke-dashoffset:0"/></svg>' +
      '     <span class="temp-num">∞</span><small>seg</small></div>' +
      '</div>' +
      (et ? '<div class="preg-etapa" style="--etapa:' + et.color + '">' + et.icono + ' ' + esc(et.nombre) + '</div>' : '') +
      '<p class="preg-rol">🎤 ' + esc(p.rol) + '</p>' +
      '<h2 class="preg-texto">' + esc(p.texto) + '</h2>' +
      '<div class="opciones">' + p.opciones.map(function (o, i) {
        return '<button class="opcion opcion-' + i + '" data-op="' + i + '"><span class="opcion-letra">' + LETRAS[i] + '</span><span class="opcion-texto">' + esc(o.texto) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="en-juego">🎯 ' + esc(p.enJuego) + '</div>' +
      '<p class="nota-remota" hidden>📱 ' + esc(e.nombre) + ' responde desde su dispositivo.</p>' +
      '<p class="atajos">Atajos: teclas <kbd>A</kbd>–<kbd>D</kbd> o <kbd>1</kbd>–<kbd>4</kbd></p>';
    var m = abrirModal({ html: html, clase: 'modal-pregunta tipo-' + p.tipo, etiqueta: 'Pregunta', cerrable: false });
    var respondido = false;
    function responder(i) {
      if (respondido) return;
      respondido = true;
      detenerTemporizador();
      $$('.opcion', m.el).forEach(function (b) { b.disabled = true; });
      alResponder(i);
    }
    m.el.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-op]');
      if (b && !m.soloLectura) responder(Number(b.dataset.op));
    });
    m.responder = function (i) { if (i < p.opciones.length) responder(i); };
    m.esPregunta = true;
    m.setSoloLectura = function (si) {
      m.soloLectura = !!si;
      m.el.classList.toggle('solo-lectura', m.soloLectura);
      $('.nota-remota', m.el).hidden = !m.soloLectura;
      if (!respondido) $$('.opcion', m.el).forEach(function (b) { b.disabled = m.soloLectura; });
    };
    m.setSoloLectura(op.soloLectura);
    if (op.reloj) {
      iniciarTemporizadorServidor(op.reloj, op.ahora, $('.temporizador', m.el), function () { responder(-1); }, op.gracia);
    } else {
      var cfgTiempo = root.LogiConfig ? root.LogiConfig.get().tiempo : estado.config.tiempo;
      iniciarTemporizador(cfgTiempo, m, function () { responder(-1); });
    }
    return m;
  }

  /** Colorea las alternativas (verde la correcta, rojo la elegida si es incorrecta). */
  async function feedbackPregunta(m, estado) {
    var r = estado.resultado;
    var correcta = estado.preguntaActual.correcta;
    $$('.opcion', m.el).forEach(function (b, i) {
      if (i === correcta) b.classList.add('correcta');
      else if (i === r.opcion) b.classList.add('incorrecta');
      else b.classList.add('apagada');
    });
    if (r.tiempoAgotado) {
      var t = $('.temporizador', m.el);
      if (t) t.classList.add('agotado');
    }
    root.AudioJuego.efecto(r.correcto ? 'acierto' : 'error');
    await esperar(reducido() ? 500 : 1300);
  }

  /* -------------------------- Modal de resultado -------------------------- */

  /**
   * acciones: { continuar(), avance(), ataque(rival) }
   */
  function abrirResultado(estado, acciones, op) {
    op = op || {};
    var controlCofre = op.controlCofre !== false;
    var r = estado.resultado;
    var e = estado.equipos[r.equipo];
    var html;
    if (r.sinPregunta) {
      html = '<div class="res-cabecera"><div class="res-titulo">Sin preguntas</div></div><p class="modal-texto">' + esc(r.mensajes[0]) + '</p>' +
        '<div class="modal-botones"><button class="btn btn-verde btn-principal" data-continuar>Continuar ➜</button></div>';
    } else {
      var titulo = r.correcto ? '¡Correcto!' : (r.tiempoAgotado ? '¡Tiempo agotado!' : '¡Incorrecto!');
      var icono = r.correcto ? '✔' : (r.tiempoAgotado ? '⏰' : '✖');
      html =
        '<div class="res-cabecera ' + (r.correcto ? 'ok' : 'mal') + '">' +
        '  <div class="res-sello">' + icono + '</div>' +
        '  <div><div class="res-titulo">' + titulo + '</div>' +
        '  <div class="res-equipo">' + fichaHTML(e) + esc(e.nombre) + ' · ⭐ ' + e.puntos + ' · ' + corazones(e.vidas, 3) + '</div></div>' +
        '  <div class="res-mascota">' + mascotaSVG('mini') + '</div>' +
        '</div>' +
        '<ul class="res-efectos">' + r.mensajes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
        (!r.correcto ? '<div class="res-correcta"><small>Respuesta correcta</small>' + esc(r.correctaTexto) + '</div>' : '') +
        (r.explicacion ? '<div class="res-explicacion"><strong>📘 Explicación</strong><p>' + esc(r.explicacion) + '</p></div>' : '');
      if (r.pendienteCofre && !controlCofre) {
        html += '<div class="cofre-eleccion"><h3>🎁 ' + esc(e.nombre) + ' está eligiendo su recompensa…</h3>' +
          '<p class="nota">Avance estratégico o ataque estratégico, desde su dispositivo.</p></div>';
      } else if (r.pendienteCofre) {
        html += '<div class="cofre-eleccion"><h3>🎁 Elige tu recompensa</h3><div class="cofre-opciones">' +
          '<button class="btn btn-verde btn-principal" data-avance>🚀 Avance estratégico<small>Avanzas 3 casillas</small></button>' +
          (r.rivales.length
            ? '<button class="btn btn-rojo" data-ataque>⚔️ Ataque estratégico<small>Un rival retrocede 3</small></button>'
            : '<p class="nota">No hay rivales válidos para atacar (deben estar en juego y fuera de la casilla 0).</p>') +
          '</div><div class="rivales" hidden><p>¿A qué equipo atacas?</p>' + r.rivales.map(function (i) {
            var rv = estado.equipos[i];
            return '<button class="btn btn-rival" style="--c:' + rv.color + '" data-rival="' + i + '">' + rv.icono + ' ' + esc(rv.nombre) + ' <small>casilla ' + rv.pos + '</small></button>';
          }).join('') + '<button class="btn btn-gris" data-volver-cofre>Volver</button></div></div>';
      } else {
        html += '<div class="modal-botones"><button class="btn btn-verde btn-principal" data-continuar>Continuar ➜</button></div>';
      }
    }
    var m = abrirModal({ html: html, clase: 'modal-resultado ' + (r.correcto ? 'es-ok' : 'es-mal'), etiqueta: 'Resultado', cerrable: false });
    var usado = false;
    function una(fn) { return function () { if (usado) return; usado = true; fn.apply(null, arguments); }; }
    // Acciones protegidas (una sola vez), también usadas por el modo en línea.
    m.accion = {
      continuar: una(acciones.continuar),
      avance: una(acciones.avance),
      ataque: una(acciones.ataque)
    };
    m.el.addEventListener('click', function (ev) {
      var t = ev.target;
      if (t.closest('[data-continuar]')) m.accion.continuar();
      else if (t.closest('[data-avance]')) m.accion.avance();
      else if (t.closest('[data-ataque]')) {
        $('.cofre-opciones', m.el).hidden = true;
        $('.rivales', m.el).hidden = false;
        $('.rivales button', m.el).focus();
      } else if (t.closest('[data-volver-cofre]')) {
        $('.cofre-opciones', m.el).hidden = false;
        $('.rivales', m.el).hidden = true;
      } else if (t.closest('[data-rival]')) {
        m.accion.ataque(Number(t.closest('[data-rival]').dataset.rival));
      }
    });
    m.esResultado = true;
    return m;
  }

  /* ---------------------------- Pantalla final ---------------------------- */

  function renderFin(estado) {
    var fin = estado.fin;
    var g = estado.equipos[fin.ganador];
    $('#fin-subtitulo').textContent = fin.motivo === 'meta'
      ? '¡' + g.nombre + ' llegó a la META!'
      : 'Todos los equipos fueron eliminados. Gana ' + g.nombre + ' por tener más puntos.';
    var lugares = fin.clasificacion;
    var ordenPodio = [1, 0, 2, 3].filter(function (k) { return k < lugares.length; });
    $('#podio').innerHTML = ordenPodio.map(function (k) {
      var i = lugares[k], e = estado.equipos[i];
      return '<div class="podio-lugar lugar-' + (k + 1) + '" style="--color:' + e.color + '">' +
        (k === 0 ? '<div class="corona">👑</div>' : '') +
        '<div class="podio-ficha">' + e.icono + '</div>' +
        '<div class="podio-nombre">' + esc(e.nombre) + '</div>' +
        '<div class="podio-datos">⭐ ' + e.puntos + ' pts · ' + corazones(e.vidas, 3) + '</div>' +
        '<div class="podio-datos">✅ ' + e.aciertos + '/' + e.respondidas + ' aciertos · casilla ' + e.pos + '</div>' +
        (e.eliminado ? '<div class="tag tag-elim">Eliminado</div>' : (e.enMeta ? '<div class="tag tag-meta">🏆 META</div>' : '')) +
        '<div class="podio-base"><span>' + (k + 1) + '°</span></div>' +
        '</div>';
    }).join('');
    // En línea, el anfitrión publica la lista ya calculada (los jugadores no tienen el banco).
    var repaso = fin.repaso || G.preguntasParaRepasar(estado, 6);
    $('#repaso').innerHTML = repaso.length
      ? repaso.map(function (r) {
        var p = r.pregunta;
        var et = G.etapaPorId(p.etapa);
        return '<details class="repaso-item"><summary><span class="repaso-fallos">' + r.fallos + ' ✖</span>' + esc(p.pregunta) + '</summary>' +
          '<div class="repaso-cuerpo">' + (et ? '<small>' + et.icono + ' ' + esc(et.nombre) + '</small>' : '') +
          '<p><strong>✔ Correcta:</strong> ' + esc(p.opciones[p.correcta]) + '</p>' +
          (p.explicacion ? '<p>📘 ' + esc(p.explicacion) + '</p>' : '') + '</div></details>';
      }).join('')
      : '<p class="nota">¡Excelente! No hubo preguntas falladas en esta partida.</p>';
  }

  function confeti() {
    if (reducido()) return;
    var capa = $('#confeti');
    var colores = ['#FF8A1F', '#3D8BFD', '#2BC46A', '#A259FF', '#FFD43B', '#E5484D'];
    var html = '';
    for (var i = 0; i < 120; i++) {
      html += '<i style="left:' + (Math.random() * 100) + '%;background:' + colores[i % colores.length] +
        ';animation-delay:' + (Math.random() * 1.2).toFixed(2) + 's;animation-duration:' + (2.4 + Math.random() * 2).toFixed(2) + 's;' +
        'transform:rotate(' + Math.round(Math.random() * 360) + 'deg);width:' + (6 + Math.random() * 8).toFixed(0) + 'px"></i>';
    }
    capa.innerHTML = html;
    setTimeout(function () { capa.innerHTML = ''; }, 5200);
  }

  root.UI = {
    $: $, $$: $$, esc: esc, esperar: esperar, reducido: reducido,
    corazones: corazones, fichaHTML: fichaHTML,
    mostrarPantalla: mostrarPantalla,
    abrirModal: abrirModal, modalSuperior: modalSuperior, cerrarTodos: cerrarTodos,
    confirmar: confirmar, aviso: aviso, toast: toast,
    mascotaSVG: mascotaSVG, caraDado: caraDado, animarDado: animarDado,
    detenerTemporizador: detenerTemporizador, iniciarTemporizadorServidor: iniciarTemporizadorServidor,
    renderJuego: renderJuego, actualizarControles: actualizarControles, leyendaHTML: leyendaHTML,
    ponerPermiso: ponerPermiso, conexionHTML: conexionHTML,
    abrirPregunta: abrirPregunta, feedbackPregunta: feedbackPregunta, abrirResultado: abrirResultado,
    renderFin: renderFin, confeti: confeti
  };
})(window);
