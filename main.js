/*
 * LOGISNAKE — Arranque, navegación y control de la partida
 * --------------------------------------------------------
 * Aquí vive el único punto de entrada para cambiar el estado: dispatch(accion).
 *
 * FASE 2 (multijugador en línea con Firebase Realtime Database):
 *   - Crear sala: escribir el estado inicial en /salas/{codigo}/estado.
 *   - dispatch(): en lugar de aplicar la acción localmente, enviarla a
 *     /salas/{codigo}/acciones (o aplicar reducir() dentro de una transacción).
 *   - Todos los dispositivos escuchan /salas/{codigo}/estado y llaman a alCambiar().
 *   - Solo el dispositivo del equipo de turno habilita los botones de respuesta.
 *   El estado ya es un objeto JSON único y el azar está dentro de él, así que
 *   no hay que cambiar game.js.
 */
(function (root) {
  'use strict';

  var G = root.LogiGame;
  var UI = root.UI;
  var Audio = root.AudioJuego;
  var Tablero = root.Tablero;
  var $ = UI.$, $$ = UI.$$;

  /* ----------------------------- Configuración ----------------------------- */

  var CLAVE_CFG = 'logisnake.config';
  var cfg = { skin: 'halloween', tiempo: 30, musica: true, musicaVol: 0.45, efectos: true, efectosVol: 0.75 };

  function cargarCfg() {
    try {
      var t = root.localStorage.getItem(CLAVE_CFG);
      if (t) {
        var d = JSON.parse(t);
        Object.keys(cfg).forEach(function (k) { if (d[k] !== undefined && typeof d[k] === typeof cfg[k]) cfg[k] = d[k]; });
      }
    } catch (e) { /* sin almacenamiento */ }
  }

  function guardarCfg() {
    try { root.localStorage.setItem(CLAVE_CFG, JSON.stringify(cfg)); } catch (e) { /* sin acción */ }
  }

  function aplicarCfg() {
    if (['halloween', 'navidad', 'clasico'].indexOf(cfg.skin) < 0) cfg.skin = 'halloween';
    doc.documentElement.setAttribute('data-skin', cfg.skin);
    var colorTema = { halloween: '#170B2C', navidad: '#06261A', clasico: '#0B2239' }[cfg.skin];
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', colorTema);
    Audio.configurar({ musica: cfg.musica, musicaVol: cfg.musicaVol, efectos: cfg.efectos, efectosVol: cfg.efectosVol });
    $$('.btn-musica').forEach(function (b) {
      b.setAttribute('aria-pressed', String(cfg.musica));
      b.textContent = cfg.musica ? '🎵' : '🔇';
      b.title = cfg.musica ? 'Silenciar música' : 'Activar música';
      b.setAttribute('aria-label', b.title);
    });
    $$('.btn-efectos').forEach(function (b) {
      b.setAttribute('aria-pressed', String(cfg.efectos));
      b.textContent = cfg.efectos ? '🔊' : '🔈';
      b.title = cfg.efectos ? 'Silenciar efectos' : 'Activar efectos';
      b.setAttribute('aria-label', b.title);
    });
  }

  root.LogiConfig = { get: function () { return Object.assign({}, cfg); } };

  var doc = root.document;

  /* ------------------------------ Navegación ------------------------------ */

  var app = {
    modo: 'integral',
    etapa: 1,
    nEquipos: 2,
    equipos: G.EQUIPOS_BASE.map(function (e) { return { nombre: e.nombre, color: e.color, icono: e.icono }; }),
    orden: [0, 1],
    estado: null,
    ocupado: false,
    modalActual: null,
    ultimaConfig: null
  };

  function ir(pantalla) {
    if (pantalla === 'equipos') renderEquipos();
    if (pantalla === 'editor') root.Editor.montar();
    UI.mostrarPantalla(pantalla);
  }

  /* --------------------------- Modal de configuración --------------------------- */

  function abrirConfig() {
    var tiempos = [20, 30, 45, 60, 0];
    var m = UI.abrirModal({
      clase: 'modal-config', cerrable: true, etiqueta: 'Configuración',
      html:
        '<h2 class="modal-titulo">⚙️ Configuración</h2>' +
        '<div class="cfg-grupo"><h3>Tema visual</h3><div class="cfg-opciones" data-grupo="skin">' +
        [['halloween', '🎃 Halloween'], ['navidad', '🎄 Navidad'], ['clasico', '🏭 Clásico logística']].map(function (o) {
          return '<button class="chip-opcion" data-valor="' + o[0] + '" aria-pressed="' + (cfg.skin === o[0]) + '">' + o[1] + '</button>';
        }).join('') + '</div></div>' +
        '<div class="cfg-grupo"><h3>Tiempo por pregunta</h3><div class="cfg-opciones" data-grupo="tiempo">' +
        tiempos.map(function (t) {
          return '<button class="chip-opcion" data-valor="' + t + '" aria-pressed="' + (cfg.tiempo === t) + '">' + (t ? t + ' s' : 'Sin límite') + '</button>';
        }).join('') + '</div></div>' +
        '<div class="cfg-grupo"><h3>Sonido</h3>' +
        '<div class="cfg-fila"><label class="interruptor"><input type="checkbox" id="cfg-musica"' + (cfg.musica ? ' checked' : '') + '><span></span> Música</label>' +
        '<input type="range" id="cfg-musica-vol" min="0" max="1" step="0.05" value="' + cfg.musicaVol + '" aria-label="Volumen de la música"></div>' +
        '<div class="cfg-fila"><label class="interruptor"><input type="checkbox" id="cfg-efectos"' + (cfg.efectos ? ' checked' : '') + '><span></span> Efectos</label>' +
        '<input type="range" id="cfg-efectos-vol" min="0" max="1" step="0.05" value="' + cfg.efectosVol + '" aria-label="Volumen de los efectos"></div>' +
        '</div>' +
        '<div class="modal-botones"><button class="btn btn-verde btn-principal" data-cerrar>Listo</button></div>'
    });
    m.el.addEventListener('click', function (e) {
      var b = e.target.closest('.chip-opcion');
      if (b) {
        var grupo = b.parentElement.dataset.grupo;
        cfg[grupo] = grupo === 'tiempo' ? Number(b.dataset.valor) : b.dataset.valor;
        $$('.chip-opcion', b.parentElement).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        guardarCfg(); aplicarCfg();
        Audio.efecto('clic');
      }
      if (e.target.closest('[data-cerrar]')) m.cerrar();
    });
    m.el.addEventListener('input', function (e) {
      var id = e.target.id;
      if (id === 'cfg-musica') cfg.musica = e.target.checked;
      if (id === 'cfg-efectos') cfg.efectos = e.target.checked;
      if (id === 'cfg-musica-vol') cfg.musicaVol = Number(e.target.value);
      if (id === 'cfg-efectos-vol') cfg.efectosVol = Number(e.target.value);
      guardarCfg(); aplicarCfg();
      if (id === 'cfg-efectos-vol' || id === 'cfg-efectos') Audio.efecto('clic');
    });
  }

  /* ------------------------------ Modalidad ------------------------------ */

  function elegirModalidad(modo) {
    if (modo === 'etapa') {
      var m = UI.abrirModal({
        clase: 'modal-etapas', cerrable: true, etiqueta: 'Elige una etapa',
        html: '<h2 class="modal-titulo">Elige una etapa</h2><p class="modal-texto">Las 30 casillas tendrán preguntas de la etapa elegida.</p>' +
          '<div class="etapas-lista">' + G.ETAPAS.map(function (et) {
            return '<button class="btn-etapa" style="--etapa:' + et.color + '" data-etapa="' + et.id + '"><span class="etapa-icono">' + et.icono + '</span><span><small>Etapa ' + et.id + '</small>' + et.nombre + '</span></button>';
          }).join('') + '</div><div class="modal-botones"><button class="btn btn-gris" data-cerrar>Cancelar</button></div>'
      });
      m.el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-etapa]');
        if (b) { app.modo = 'etapa'; app.etapa = Number(b.dataset.etapa); m.cerrar(); ir('participacion'); }
        if (e.target.closest('[data-cerrar]')) m.cerrar();
      });
      return;
    }
    if (modo === 'personalizado') {
      var datos = root.Editor.cargar();
      if (datos.preguntas.length < root.Editor.MINIMO) {
        UI.confirmar({
          titulo: 'Faltan preguntas',
          texto: 'Para jugar el recorrido personalizado necesitas al menos ' + root.Editor.MINIMO + ' preguntas (tienes ' + datos.preguntas.length + '). ¿Quieres abrir el editor?',
          si: 'Abrir editor', claseSi: 'btn-verde', icono: '📝'
        }).then(function (ok) { if (ok) ir('editor'); });
        return;
      }
    }
    app.modo = modo;
    ir('participacion');
  }

  /* ---------------------------- Preparación de equipos ---------------------------- */

  function renderEquipos() {
    $$('#n-equipos .chip-opcion').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.n) === app.nEquipos)); });
    var cont = $('#equipos-tarjetas');
    var html = '';
    for (var i = 0; i < app.nEquipos; i++) {
      var e = app.equipos[i];
      html += '<div class="tarjeta-equipo" style="--color:' + e.color + '">' +
        '<div class="te-ficha" aria-hidden="true">' + e.icono + '</div>' +
        '<label class="campo"><span>Nombre del equipo</span><input type="text" maxlength="24" data-nombre="' + i + '" value="' + UI.esc(e.nombre) + '"></label>' +
        '<div class="te-iconos" role="group" aria-label="Ficha de ' + UI.esc(e.nombre) + '">' + G.ICONOS_FICHA.map(function (ic) {
          return '<button class="te-icono" data-equipo="' + i + '" data-icono="' + ic + '" aria-pressed="' + (ic === e.icono) + '" aria-label="Ficha ' + ic + '">' + ic + '</button>';
        }).join('') + '</div>' +
        '<div class="te-pie"><span>⭐ 0 pts</span>' + UI.corazones(3, 3) + '</div>' +
        '</div>';
    }
    cont.innerHTML = html;
    renderOrden();
  }

  function renderOrden() {
    $('#orden-turnos').innerHTML = app.orden.map(function (i, k) {
      var e = app.equipos[i];
      return (k ? '<span class="orden-flecha" aria-hidden="true">➜</span>' : '') +
        '<span class="orden-item" style="--color:' + e.color + '"><b>' + (k + 1) + '</b>' + e.icono + ' ' + UI.esc(e.nombre) + '</span>';
    }).join('');
  }

  function setNEquipos(n) {
    app.nEquipos = n;
    app.orden = [];
    for (var i = 0; i < n; i++) app.orden.push(i);
    renderEquipos();
  }

  function sortearOrden() {
    var a = app.orden.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    app.orden = a;
    renderOrden();
    Audio.efecto('dado');
    $('#orden-turnos').classList.remove('sorteado'); void $('#orden-turnos').offsetWidth; $('#orden-turnos').classList.add('sorteado');
  }

  /* ------------------------------ Partida ------------------------------ */

  function bancoSegunModo(modo) {
    if ((modo || app.modo) === 'personalizado') return root.Editor.obtener().preguntas;
    return root.PREGUNTAS || [];
  }

  function comenzar(configPrevia) {
    var c = configPrevia || {
      modo: app.modo,
      etapa: app.etapa,
      tema: app.modo === 'personalizado' ? root.Editor.obtener().tema : '',
      tiempo: cfg.tiempo,
      equipos: app.equipos.slice(0, app.nEquipos).map(function (e) {
        return { nombre: (e.nombre || '').trim() || 'Equipo', color: e.color, icono: e.icono };
      }),
      orden: app.orden.slice()
    };
    c.banco = bancoSegunModo(c.modo);
    c.semilla = Math.floor(Math.random() * 4294967295);
    app.ultimaConfig = c;
    dispatch({ tipo: 'INICIAR', config: c });
  }

  /**
   * Punto único de cambio de estado.
   * En línea, el anfitrión publica el nuevo estado (sin respuestas) después de cada acción.
   */
  function dispatch(accion) {
    var nuevo = G.reducir(app.estado, accion);
    if (nuevo === app.estado) return false;
    app.estado = nuevo;
    if (root.Sala) root.Sala.alDispatch(nuevo);
    alCambiar(nuevo, accion);
    return true;
  }

  /* ------------------------ Apoyo al modo en línea ------------------------ */

  function enLinea() { return !!(root.Sala && root.Sala.activo()); }

  /** Dibuja marcador y panel, con indicadores de conexión si la partida es en línea. */
  function render(est, extra) {
    var op = Object.assign({ ocupado: app.ocupado }, extra || {});
    if (enLinea()) op.conexion = root.Sala.conexion();
    UI.renderJuego(est, op);
    renderAvisoOnline(est);
  }

  function renderAvisoOnline(est) {
    var badge = $('#sala-badge'), aviso = $('#online-aviso');
    if (!badge || !aviso) return;
    if (!enLinea() || !est) { badge.hidden = true; aviso.hidden = true; return; }
    badge.hidden = false;
    badge.innerHTML = '🔑 Sala <strong>' + root.Sala.codigo() + '</strong>';
    var turno = G.equipoDeTurno(est);
    var e = est.equipos[turno];
    var html = '';
    if (root.Sala.necesitaAyuda(est)) {
      html = '<p>⚠️ <strong>' + UI.esc(e.nombre) + '</strong> no tiene un dispositivo conectado.</p>' +
        '<button class="btn btn-azul btn-chico" data-accion="forzar">🖥️ Jugar por este equipo</button>' +
        (est.fase === 'turno' ? '<button class="btn btn-gris btn-chico" data-accion="saltar">⏭️ Saltar turno</button>' : '');
    } else if (est.fase === 'turno' && !root.Sala.hostControla(turno)) {
      html = '<p>📱 <strong>' + UI.esc(e.nombre) + '</strong> tira el dado desde su dispositivo.</p>';
    }
    aviso.innerHTML = html;
    aviso.hidden = !html;
  }

  /** Lo llama sala.js cuando cambian equipos o conexiones. */
  function refrescar() {
    var est = app.estado;
    if (!est || !$('#pantalla-juego').classList.contains('activa')) return;
    render(est);
    var m = app.modalActual;
    if (m && m.esPregunta && m.setSoloLectura && est.preguntaActual && est.fase === 'pregunta') {
      m.setSoloLectura(!root.Sala.hostControla(est.preguntaActual.equipo));
    }
  }

  /**
   * Acción recibida de un dispositivo (ya validada por sala.js como del dueño del equipo).
   * Devuelve 'ok', 'ignorada' u 'ocupado' (reintentar más tarde).
   */
  function accionRemota(tipo, equipo, payload) {
    var est = app.estado;
    if (!est || est.fase === 'fin') return 'ignorada';
    if (app.ocupado) return 'ocupado';
    var turno = G.equipoDeTurno(est);
    var m = app.modalActual;
    switch (tipo) {
      case 'tirar':
        if (est.fase !== 'turno' || equipo !== turno) return 'ignorada';
        return dispatch({ tipo: 'TIRAR_DADO' }) ? 'ok' : 'ignorada';
      case 'relampago':
        if (est.fase !== 'turno' || equipo !== turno) return 'ignorada';
        return dispatch({ tipo: 'CANJEAR_RELAMPAGO' }) ? 'ok' : 'ignorada';
      case 'responder': {
        if (est.fase !== 'pregunta' || est.preguntaActual.equipo !== equipo) return 'ignorada';
        if (!m || !m.esPregunta) return 'ocupado';
        var op = Number(payload.opcion);
        if (!(op >= -1 && op < est.preguntaActual.opciones.length)) return 'ignorada';
        m.responder(op);
        return 'ok';
      }
      case 'continuar':
        if (est.fase !== 'resultado' || est.resultado.equipo !== equipo || est.resultado.pendienteCofre) return 'ignorada';
        if (!m || !m.esResultado) return 'ocupado';
        m.accion.continuar();
        return 'ok';
      case 'avance':
        if (est.fase !== 'resultado' || est.resultado.equipo !== equipo || !est.resultado.pendienteCofre) return 'ignorada';
        if (!m || !m.esResultado) return 'ocupado';
        m.accion.avance();
        return 'ok';
      case 'ataque':
        if (est.fase !== 'resultado' || est.resultado.equipo !== equipo || !est.resultado.pendienteCofre) return 'ignorada';
        if ((est.resultado.rivales || []).indexOf(Number(payload.rival)) < 0) return 'ignorada';
        if (!m || !m.esResultado) return 'ocupado';
        m.accion.ataque(Number(payload.rival));
        return 'ok';
    }
    return 'ignorada';
  }

  /** Monta la pantalla de juego a partir de un estado (inicio o recuperación). */
  function montarJuego(est) {
    UI.cerrarTodos();
    UI.mostrarPantalla('juego');
    $('#leyenda').innerHTML = UI.leyendaHTML();
    $('#dado').innerHTML = UI.caraDado(est.dado || 1);
    Tablero.montar($('#tablero-contenedor'), est);
    render(est);
  }

  /** El anfitrión recarga la página: retoma la partida tal como estaba. */
  function restaurar(est) {
    app.estado = est;
    app.ocupado = false;
    app.modalActual = null;
    // Para que "Jugar de nuevo" funcione después de recuperar la partida.
    app.ultimaConfig = {
      modo: est.config.modo,
      etapa: est.config.etapa || 1,
      tema: est.config.tema,
      tiempo: est.config.tiempo,
      equipos: est.equipos.map(function (e) { return { nombre: e.nombre, color: e.color, icono: e.icono }; }),
      orden: est.orden.slice()
    };
    if (est.fase === 'fin') { UI.renderFin(est); mostrarFin(); return; }
    montarJuego(est);
    if (est.fase === 'pregunta') abrirPregunta(est);
    else if (est.fase === 'resultado') abrirResultado(est);
    else anunciarTurno(est);
  }

  function mostrarFin() {
    var b = $('[data-accion="jugar-de-nuevo"]');
    if (b) b.hidden = false;
    UI.mostrarPantalla('fin');
  }

  function eventos(est, tipo) { return (est.eventos || []).filter(function (e) { return e.tipo === tipo; }); }

  async function animarMovimientos(est) {
    var movs = eventos(est, 'mover');
    for (var i = 0; i < movs.length; i++) {
      await Tablero.animarMovimiento(movs[i].equipo, movs[i].desde, movs[i].hasta);
    }
    if (eventos(est, 'meta').length) Audio.efecto('meta');
  }

  async function alCambiar(est, accion) {
    app.ocupado = true;
    UI.actualizarControles(est, true);
    try {
      switch (accion.tipo) {
        case 'INICIAR':
          montarJuego(est);
          anunciarTurno(est);
          break;

        case 'SALTAR_TURNO':
          UI.toast('⏭️ Turno saltado', 'especial', 1500);
          render(est);
          anunciarTurno(est);
          break;

        case 'TIRAR_DADO': {
          var d = eventos(est, 'dado')[0];
          await UI.animarDado($('#dado'), d.valor);
          $('#dado-texto').textContent = '¡Salió ' + d.valor + '!';
          await animarMovimientos(est);
          Tablero.sincronizar(est, true);
          render(est);
          if (est.fase === 'fin') { await terminar(est); return; }
          if (est.fase === 'pregunta') {
            var tipo = est.preguntaActual.tipo;
            if (tipo !== 'normal') Audio.efecto('especial');
            await UI.esperar(250);
            abrirPregunta(est);
          } else if (est.fase === 'resultado') abrirResultado(est);
          break;
        }

        case 'CANJEAR_RELAMPAGO':
          Audio.efecto('especial');
          render(est);
          abrirPregunta(est);
          break;

        case 'RESPONDER': {
          await UI.feedbackPregunta(app.modalActual, est);
          var perdidas = eventos(est, 'vida').map(function (e) { return e.equipo; });
          render(est, { vidasPerdidas: perdidas });
          if (perdidas.length) Audio.efecto('vida');
          if (eventos(est, 'eliminado').length) setTimeout(function () { Audio.efecto('eliminado'); }, 350);
          if (app.modalActual) app.modalActual.cerrar();
          abrirResultado(est);
          break;
        }

        case 'COFRE_AVANCE':
        case 'COFRE_ATAQUE':
          if (app.modalActual) app.modalActual.cerrar();
          await animarMovimientos(est);
          Tablero.sincronizar(est, true);
          var ult = est.resultado.mensajes[est.resultado.mensajes.length - 1];
          UI.toast((accion.tipo === 'COFRE_AVANCE' ? '🚀 ' : '⚔️ ') + UI.esc(ult), 'especial', 2400);
          await UI.esperar(500);
          app.ocupado = false;
          dispatch({ tipo: 'CONTINUAR' });
          return;

        case 'CONTINUAR':
          Tablero.sincronizar(est, true);
          render(est);
          if (est.fase === 'fin') { await terminar(est); return; }
          anunciarTurno(est);
          break;
      }
    } finally {
      if (app.estado === est) {
        app.ocupado = false;
        UI.actualizarControles(est, false);
      }
    }
  }

  function anunciarTurno(est) {
    var e = est.equipos[G.equipoDeTurno(est)];
    $('#dado-texto').textContent = 'Lanza el dado';
    UI.toast(UI.fichaHTML(e) + ' Turno de <strong>' + UI.esc(e.nombre) + '</strong>', 'turno', 1800);
  }

  function abrirPregunta(est) {
    var op = {};
    if (enLinea()) {
      // Reloj del servidor (igual en todos los dispositivos) y, si el equipo tiene
      // su propio dispositivo, la pregunta se muestra en modo solo lectura.
      op.reloj = root.Sala.relojPregunta(est);
      op.ahora = root.Sala.ahora;
      op.gracia = 800;
      op.soloLectura = !root.Sala.hostControla(est.preguntaActual.equipo);
    }
    app.modalActual = UI.abrirPregunta(est, function (opcion) {
      dispatch({ tipo: 'RESPONDER', opcion: opcion });
    }, op);
  }

  function abrirResultado(est) {
    app.modalActual = UI.abrirResultado(est, {
      continuar: async function () {
        var m = app.modalActual;
        if (m) m.cerrar();
        // Movimientos pendientes de la respuesta (retroceso por alerta, avance relámpago)
        if (eventos(app.estado, 'respuesta').length) {
          app.ocupado = true;
          await animarMovimientos(app.estado);
          app.ocupado = false;
        }
        dispatch({ tipo: 'CONTINUAR' });
      },
      avance: function () { dispatch({ tipo: 'COFRE_AVANCE' }); },
      ataque: function (rival) { dispatch({ tipo: 'COFRE_ATAQUE', rival: rival }); }
    }, { controlCofre: !enLinea() || root.Sala.hostControla(est.resultado.equipo) });
  }

  async function terminar(est) {
    UI.cerrarTodos();
    UI.detenerTemporizador();
    Audio.efecto('victoria');
    UI.confeti();
    await UI.esperar(UI.reducido() ? 200 : 1200);
    UI.renderFin(est);
    mostrarFin();
  }

  async function salirPartida() {
    if (enLinea()) {
      var cerrar = await UI.confirmar({ titulo: '¿Cerrar la sala?', texto: 'La partida en línea terminará para todos los equipos.', si: 'Cerrar sala', no: 'Seguir jugando', icono: '🏠' });
      if (!cerrar) return;
      await root.Sala.cerrar();
    } else {
      var ok = await UI.confirmar({ titulo: '¿Salir de la partida?', texto: 'Se perderá el progreso de esta partida.', si: 'Salir', no: 'Seguir jugando', icono: '🏠' });
      if (!ok) return;
    }
    UI.detenerTemporizador();
    UI.cerrarTodos();
    app.estado = null;
    app.modalActual = null;
    Tablero.desmontar();
    ir('portada');
  }

  /* ------------------------------ Teclado ------------------------------ */

  function alTeclado(e) {
    var m = UI.modalSuperior();
    var tag = (e.target.tagName || '').toLowerCase();
    var escribiendo = tag === 'input' || tag === 'textarea' || tag === 'select';
    if (e.key === 'Escape' && m && m.cerrable) { m.cerrar(); return; }
    if (escribiendo) return;
    if (m && m.esPregunta && !m.soloLectura && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var mapa = { a: 0, b: 1, c: 2, d: 3, 1: 0, 2: 1, 3: 2, 4: 3 };
      var k = e.key.toLowerCase();
      if (k in mapa) { e.preventDefault(); m.responder(mapa[k]); }
      return;
    }
    if (m && m.esResultado && e.key === 'Enter') {
      var b = $('[data-continuar]', m.el);
      if (b && doc.activeElement === doc.body) { e.preventDefault(); b.click(); }
      return;
    }
    // Pantalla de juego sin modales: Enter tira el dado
    if (!m && app.estado && $('#pantalla-juego').classList.contains('activa') && e.key === 'Enter' &&
        (doc.activeElement === doc.body || doc.activeElement === $('#btn-tirar'))) {
      e.preventDefault();
      $('#btn-tirar').click();
    }
  }

  /* ------------------------------ Decoración ------------------------------ */

  function crearDecoracion() {
    var est = $('#decor .estrellas');
    var h = '';
    for (var i = 0; i < 46; i++) {
      h += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 60).toFixed(1) + '%;animation-delay:' + (Math.random() * 3).toFixed(2) + 's;--t:' + (1 + Math.random() * 2.2).toFixed(1) + 'px"></i>';
    }
    est.innerHTML = h;
    var nieve = $('#decor .nieve');
    h = '';
    for (var k = 0; k < 50; k++) {
      h += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;animation-delay:-' + (Math.random() * 12).toFixed(1) + 's;animation-duration:' + (8 + Math.random() * 8).toFixed(1) + 's;--t:' + (3 + Math.random() * 5).toFixed(0) + 'px"></i>';
    }
    nieve.innerHTML = h;
    $$('[data-mascota]').forEach(function (m) { m.innerHTML = UI.mascotaSVG(m.dataset.mascota); });
  }

  /* -------------------------------- Inicio -------------------------------- */

  function enlazar() {
    // Primer gesto del usuario: habilita el audio
    var desbloqueado = false;
    function desbloquear() {
      if (desbloqueado) return;
      desbloqueado = true;
      Audio.desbloquear();
    }
    doc.addEventListener('pointerdown', desbloquear, { capture: true });
    doc.addEventListener('keydown', desbloquear, { capture: true });

    doc.addEventListener('click', function (e) {
      var t = e.target.closest('button, [data-ir]');
      if (!t) return;
      if (t.matches('.btn, .tarjeta-btn')) Audio.efecto('clic');
      if (t.dataset.ir) { ir(t.dataset.ir); return; }
      var accion = t.dataset.accion;
      switch (accion) {
        case 'config': abrirConfig(); break;
        case 'musica': cfg.musica = !cfg.musica; guardarCfg(); aplicarCfg(); break;
        case 'efectos': cfg.efectos = !cfg.efectos; guardarCfg(); aplicarCfg(); break;
        case 'modalidad': elegirModalidad(t.dataset.modo); break;
        case 'editar-preguntas': ir('editor'); break;
        case 'docente': ir('equipos'); break;
        case 'sortear': sortearOrden(); break;
        case 'comenzar': comenzar(); break;
        case 'tirar':
          if (!app.ocupado) dispatch({ tipo: 'TIRAR_DADO' });
          break;
        case 'relampago':
          if (!app.ocupado) dispatch({ tipo: 'CANJEAR_RELAMPAGO' });
          break;
        case 'inicio': salirPartida(); break;
        case 'jugar-de-nuevo':
          if (app.ultimaConfig) {
            var c = Object.assign({}, app.ultimaConfig);
            c.tiempo = cfg.tiempo;
            comenzar(c);
          }
          break;
        case 'menu':
          if (enLinea()) root.Sala.cerrar();
          if (root.Sala && root.Sala.esJugador()) root.Sala.salir();
          app.estado = null;
          Tablero.desmontar();
          ir('portada');
          break;
        // ----- Modo en línea -----
        case 'online': root.Sala.abrir(); break;
        case 'unirse-sala': root.Sala.abrir(''); break;
        case 'volver-sala': root.Sala.abrir(t.dataset.codigo); root.Sala.unirse(t.dataset.codigo); break;
        case 'forzar':
          if (app.estado) root.Sala.forzar(G.equipoDeTurno(app.estado));
          break;
        case 'saltar':
          if (!app.ocupado) dispatch({ tipo: 'SALTAR_TURNO' });
          break;
      }
      if (t.dataset.n) setNEquipos(Number(t.dataset.n));
      if (t.dataset.icono && t.dataset.equipo !== undefined) {
        var i = Number(t.dataset.equipo);
        app.equipos[i].icono = t.dataset.icono;
        renderEquipos();
        var b = $('.te-icono[data-equipo="' + i + '"][data-icono="' + t.dataset.icono + '"]');
        if (b) b.focus();
      }
    });

    doc.addEventListener('input', function (e) {
      if (e.target.dataset && e.target.dataset.nombre !== undefined) {
        app.equipos[Number(e.target.dataset.nombre)].nombre = e.target.value;
        renderOrden();
      }
    });

    doc.addEventListener('keydown', alTeclado);

    root.addEventListener('resize', function () { Tablero.redimensionar(); });
  }

  // Interfaz que usa sala.js (modo en línea) y que sirve para depurar.
  root.LogiApp = {
    dispatch: dispatch,
    estado: function () { return app.estado; },
    ir: ir,
    comenzar: comenzar,
    restaurar: restaurar,
    accionRemota: accionRemota,
    refrescar: refrescar,
    bancoDe: bancoSegunModo,
    temaDocente: function () { return root.Editor.obtener().tema; },
    config: function () { return { modo: app.modo, etapa: app.etapa, tiempo: cfg.tiempo }; },
    /** En el celular la música empieza apagada (sin guardar la preferencia). */
    musicaSesion: function (si) { cfg.musica = !!si; aplicarCfg(); }
  };

  cargarCfg();
  crearDecoracion();
  aplicarCfg();
  enlazar();
  UI.mostrarPantalla('portada');
  if (root.Sala) root.Sala.iniciar();
})(window);
