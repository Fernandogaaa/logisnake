/*
 * LOGISNAKE — Modo Multijugador en línea: pantallas y coordinación
 * ----------------------------------------------------------------
 * Modelo "anfitrión con autoridad":
 *   - El ANFITRIÓN (quien crea la sala, normalmente el docente con el tablero proyectado)
 *     es el único que ejecuta las reglas (game.js) mediante el mismo dispatch() de la Fase 1.
 *     Recibe acciones de la red, las valida y publica el estado público.
 *   - Los JUGADORES (un dispositivo por equipo) solo envían acciones y dibujan el estado.
 *
 * El estado público nunca incluye el banco de preguntas ni la respuesta correcta de la
 * pregunta en curso: la correcta y la explicación se publican después de responder.
 */
(function (root) {
  'use strict';

  var G = root.LogiGame;
  var UI = root.UI;
  var Online = root.Online;
  var Audio = root.AudioJuego;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc;
  var QR_URL = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';

  function App() { return root.LogiApp; }
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var s = {
    rol: null, codigo: null, meta: null, equipos: {}, presencia: {},
    // anfitrión
    enPartida: false, reloj: null, partida: null, forzados: {}, cola: [], procesando: false, vistos: {},
    // jugador
    miEquipo: null, pub: null, clave: null, firmaZona: null, enviado: null, cofreAtaque: false, primera: true, ljFirma: null
  };
  var form = { modo: 'integral', etapa: 1, n: 2, tiempo: 30 };

  /* ------------------------------ Utilidades ------------------------------ */

  function idx(teamId) { return teamId ? Number(String(teamId).slice(1)) : -1; }

  /** Firebase puede devolver una lista como objeto { "0": …, "1": … }. */
  function comoLista(x) {
    if (Array.isArray(x)) return x;
    if (x && typeof x === 'object') return Object.keys(x).sort(function (a, b) { return a - b; }).map(function (k) { return x[k]; });
    return null;
  }
  function ordenSala() {
    return comoLista(s.meta && s.meta.orden) || listaEquipos().map(function (e) { return e.idx; });
  }
  function pantallaActiva(id) { var p = $('#pantalla-' + id); return !!p && p.classList.contains('activa'); }
  function enLinea(uid) { var p = uid && s.presencia[uid]; return !!(p && p.online); }
  function hostEnLinea() { return !!s.meta && enLinea(s.meta.hostUid); }
  function enlaceSala(c) { return root.location.href.split(/[?#]/)[0] + '?sala=' + c; }

  function listaEquipos() {
    return Object.keys(s.equipos).sort().map(function (id) {
      return Object.assign({ id: id, idx: idx(id) }, s.equipos[id]);
    });
  }

  function miTeamId() {
    var mio = null;
    Object.keys(s.equipos).forEach(function (k) { if (s.equipos[k].ownerUid === Online.uid()) mio = k; });
    return mio;
  }

  function textoModo(m) {
    if (!m) return '';
    if (m.modo === 'etapa') { var et = G.etapaPorId(m.etapa); return 'Por etapa: ' + (et ? et.nombre : ''); }
    if (m.modo === 'personalizado') return 'Personalizado' + (m.tema ? ': ' + m.tema : '');
    return 'Recorrido integral (50 casillas)';
  }
  function textoTiempo(t) { return t ? t + ' s por pregunta' : 'Sin límite de tiempo'; }

  function errorTexto(e) {
    var msg = (e && (e.code || e.message)) || '';
    if (msg === 'sin-config') return 'El modo en línea no está configurado (falta js/firebase-config.js).';
    if (/PERMISSION_DENIED|permission/i.test(msg)) return 'Firebase rechazó la operación (revisa las reglas de la base de datos).';
    if (/cargar|load|network/i.test(msg)) return 'No se pudo conectar con Firebase. Revisa tu conexión a internet.';
    if (/operation-not-allowed|admin-restricted/i.test(msg)) return 'Activa el inicio de sesión "Anónimo" en Firebase Authentication.';
    return msg || 'Error desconocido.';
  }

  function estadoSala(txt) { var el = $('#sala-estado'); if (el) el.textContent = txt || ''; }

  /* ============================ PANTALLA "SALA" ============================ */

  function abrir(codigoPrevio) {
    var c = App().config();
    form.modo = c.modo || 'integral';
    form.etapa = c.etapa || 1;
    form.tiempo = c.tiempo;
    renderSala();
    if (codigoPrevio) $('#sala-codigo').value = Online.normalizarCodigo(codigoPrevio);
    App().ir('sala');
    if (codigoPrevio) $('#sala-codigo').focus();
  }

  function renderSala() {
    var tiempos = [20, 30, 45, 60, 0];
    $('#sala-contenido').innerHTML =
      '<div class="tarjetas tarjetas-2">' +
      '<article class="tarjeta tarjeta-azul">' +
      '  <h3>👑 Crear sala</h3>' +
      '  <p>Para el docente: esta pantalla será el tablero que se proyecta.</p>' +
      '  <label class="campo"><span>Recorrido</span><select id="sala-modo">' +
      [['integral', 'Recorrido integral (50 casillas)'], ['etapa', 'Por categoría o etapa (30)'], ['personalizado', 'Personalizado (preguntas del editor)']].map(function (o) {
        return '<option value="' + o[0] + '"' + (form.modo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select></label>' +
      '  <label class="campo" id="sala-etapa-campo"' + (form.modo === 'etapa' ? '' : ' hidden') + '><span>Etapa</span><select id="sala-etapa">' +
      G.ETAPAS.map(function (e) { return '<option value="' + e.id + '"' + (form.etapa === e.id ? ' selected' : '') + '>' + e.icono + ' ' + e.nombre + '</option>'; }).join('') +
      '  </select></label>' +
      '  <div class="campo"><span>Equipos</span><div class="cfg-opciones" data-grupo-sala="n">' +
      [2, 3, 4].map(function (n) { return '<button class="chip-opcion" data-valor="' + n + '" aria-pressed="' + (form.n === n) + '">' + n + ' equipos</button>'; }).join('') +
      '  </div></div>' +
      '  <div class="campo"><span>Tiempo por pregunta</span><div class="cfg-opciones" data-grupo-sala="tiempo">' +
      tiempos.map(function (t) { return '<button class="chip-opcion" data-valor="' + t + '" aria-pressed="' + (form.tiempo === t) + '">' + (t ? t + ' s' : 'Sin límite') + '</button>'; }).join('') +
      '  </div></div>' +
      '  <button class="btn btn-verde tarjeta-btn" data-sala="crear">✨ Crear sala</button>' +
      '</article>' +
      '<article class="tarjeta tarjeta-morado">' +
      '  <h3>🤝 Unirse a sala</h3>' +
      '  <p>Para cada equipo: escribe el código que muestra el docente.</p>' +
      '  <div class="tarjeta-ilustracion" aria-hidden="true">📱🎲</div>' +
      '  <label class="campo"><span>Código de sala</span><input id="sala-codigo" class="input-codigo" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCDE"></label>' +
      '  <button class="btn btn-morado tarjeta-btn" data-sala="unirse">➜ Unirse</button>' +
      '</article>' +
      '</div>' +
      '<p class="sala-estado" id="sala-estado" role="status"></p>';
  }

  async function crear() {
    form.modo = $('#sala-modo').value;
    form.etapa = Number($('#sala-etapa').value);
    var banco = App().bancoDe(form.modo);
    if (form.modo === 'personalizado' && banco.length < root.Editor.MINIMO) {
      UI.aviso({ titulo: 'Faltan preguntas', icono: '📝', texto: 'El recorrido personalizado necesita al menos ' + root.Editor.MINIMO + ' preguntas en el editor (tienes ' + banco.length + ').' });
      return;
    }
    estadoSala('⏳ Conectando con Firebase…');
    try {
      await Online.iniciar();
      var orden = [];
      for (var i = 0; i < form.n; i++) orden.push(i);
      var meta = {
        modo: form.modo,
        etapa: form.modo === 'etapa' ? form.etapa : 0,
        tiempo: form.tiempo,
        nEquipos: form.n,
        tema: form.modo === 'personalizado' ? App().temaDocente() : '',
        orden: orden
      };
      var codigo = await Online.crearSala(meta, G.EQUIPOS_BASE.slice(0, form.n));
      estadoSala('');
      entrarComoHost(codigo);
      App().ir('lobby');
    } catch (e) {
      root.console.error(e);
      estadoSala('❌ ' + errorTexto(e));
    }
  }

  async function unirse(codigoArg) {
    var codigo = Online.normalizarCodigo(codigoArg || ($('#sala-codigo') ? $('#sala-codigo').value : ''));
    if (codigo.length !== 5) { estadoSala('Escribe el código de 5 caracteres.'); return; }
    estadoSala('⏳ Buscando la sala ' + codigo + '…');
    try {
      await Online.iniciar();
      var meta = await Online.leerMeta(codigo);
      if (!meta) { estadoSala('❌ No existe una sala con el código ' + codigo + '.'); return; }
      if (meta.hostUid === Online.uid()) { estadoSala(''); await reanudarHost(codigo); return; }
      if (meta.status === 'finished') { estadoSala('❌ La sala ' + codigo + ' ya fue cerrada.'); return; }
      estadoSala('');
      entrarComoJugador(codigo);
    } catch (e) {
      root.console.error(e);
      estadoSala('❌ ' + errorTexto(e));
    }
  }

  /* ============================== ANFITRIÓN ============================== */

  function reiniciarDatos() {
    s.meta = null; s.equipos = {}; s.presencia = {};
    s.enPartida = false; s.reloj = null; s.partida = null; s.forzados = {}; s.cola = []; s.vistos = {};
    s.miEquipo = null; s.pub = null; s.clave = null; s.firmaZona = null; s.enviado = null; s.cofreAtaque = false; s.primera = true; s.ljFirma = null;
  }

  function entrarComoHost(codigo) {
    reiniciarDatos();
    s.rol = 'host';
    s.codigo = codigo;
    Online.entrarSala(codigo, 'host');
    Online.guardarSesion({ codigo: codigo, rol: 'host' });
    UI.ponerPermiso(hostControla);
    montarLobbyHost();
  }

  /** El anfitrión vuelve (recarga o reconexión): retoma la partida desde el estado guardado. */
  async function reanudarHost(codigo) {
    var pres = await Online.leerPresencia(codigo, Online.uid());
    var priv = await Online.leerPrivado(codigo);
    Online.ponerVersion(await Online.leerVersion(codigo));
    entrarComoHost(codigo);
    if (!priv || !priv.estado) { App().ir('lobby'); return; }
    var est = priv.estado;
    est.eventos = []; // los movimientos ya están aplicados en el tablero
    s.partida = priv.partida;
    s.forzados = priv.forzados || {};
    s.reloj = priv.reloj || null;
    s.enPartida = true;
    // Pausa: el tiempo que el anfitrión estuvo fuera no cuenta.
    if (est.fase === 'pregunta' && s.reloj && s.reloj.duracion) {
      var desde = pres && pres.lastSeen ? pres.lastSeen : Online.ahoraServidor();
      var restante = s.reloj.inicio + s.reloj.duracion * 1000 - desde;
      s.reloj = { inicio: Online.ahoraServidor(), duracion: Math.max(5, Math.ceil(restante / 1000)) };
    }
    App().restaurar(est);
    publicar(est);
    UI.toast('🔄 Partida recuperada: sala ' + codigo, 'ok', 2600);
  }

  function montarLobbyHost() {
    var c = s.codigo;
    $('#lobby-contenido').innerHTML =
      '<div class="lobby-grid">' +
      '<div class="panel lobby-codigo">' +
      '  <small>Código de sala</small>' +
      '  <div class="codigo-grande" aria-label="Código ' + c.split('').join(' ') + '">' + c + '</div>' +
      '  <div class="lobby-botones">' +
      '    <button class="btn btn-azul btn-chico" data-sala="copiar">📋 Copiar código</button>' +
      '    <button class="btn btn-morado btn-chico" data-sala="copiar-enlace">🔗 Copiar enlace</button>' +
      '  </div>' +
      '  <div class="qr" id="lobby-qr" aria-label="Código QR para unirse"></div>' +
      '  <p class="nota">Escanea el QR o abre el juego, elige <strong>Unirse a sala</strong> y escribe el código.</p>' +
      '  <p class="lobby-info" id="lobby-info"></p>' +
      '</div>' +
      '<div class="panel lobby-equipos"><div id="lobby-dinamico"></div></div>' +
      '</div>';
    dibujarQR(enlaceSala(c));
    renderLobbyHost();
  }

  function dibujarQR(texto) {
    var el = $('#lobby-qr');
    function pintar() {
      if (typeof root.qrcode !== 'function' || !el) { if (el) el.innerHTML = '<p class="nota">(Sin QR: no se pudo cargar el generador)</p>'; return; }
      var qr = root.qrcode(0, 'M');
      qr.addData(texto);
      qr.make();
      el.innerHTML = qr.createSvgTag(5, 2);
    }
    if (typeof root.qrcode === 'function') pintar();
    else Online.cargarScript(QR_URL).then(pintar, pintar);
  }

  function renderLobbyHost() {
    var cont = $('#lobby-dinamico');
    if (!cont || !s.meta) return;
    $('#lobby-info').textContent = '🗺️ ' + textoModo(s.meta) + ' · ⏱️ ' + textoTiempo(s.meta.tiempo);
    var eq = listaEquipos();
    var todos = eq.length > 0 && eq.every(function (e) { return e.ownerUid; });
    var orden = ordenSala();
    cont.innerHTML =
      '<h3>Equipos</h3>' +
      '<ul class="lobby-lista">' + eq.map(function (e) {
        var est = !e.ownerUid ? '<span class="estado-espera">⏳ Esperando dispositivo…</span>'
          : enLinea(e.ownerUid) ? '<span class="estado-on">📶 Conectado</span>' : '<span class="estado-off">⚠️ Desconectado</span>';
        return '<li style="--color:' + e.color + '">' + UI.fichaHTML({ color: e.color, icono: e.icon }) +
          '<div class="lobby-eq-datos"><strong>' + esc(e.name) + '</strong>' + est + '</div>' +
          (e.ownerUid ? '<button class="btn btn-rojo btn-mini" data-sala="expulsar" data-team="' + e.id + '">Expulsar</button>' : '') +
          '</li>';
      }).join('') + '</ul>' +
      '<div class="orden-panel-mini"><span>🎲 Orden de turnos:</span><div class="orden-turnos">' + ordenHTML(orden) + '</div>' +
      '<button class="btn btn-morado btn-mini" data-sala="sortear">🔀 Sortear</button></div>' +
      '<div class="lobby-acciones">' +
      '<button class="btn btn-verde btn-grande" data-sala="comenzar"' + (todos ? '' : ' disabled') + '>✔ ¡Comenzar juego!</button>' +
      (todos ? '' : '<button class="btn btn-naranja" data-sala="comenzar-igual">Comenzar de todos modos</button>' +
        '<p class="nota">Los equipos sin dispositivo los controla el anfitrión desde esta pantalla.</p>') +
      '</div>' +
      '<div class="lobby-pie"><button class="btn btn-gris btn-chico" data-sala="cerrar">🚪 Cerrar sala</button></div>';
  }

  function ordenHTML(orden) {
    return orden.map(function (i, k) {
      var e = s.equipos['t' + i];
      if (!e) return '';
      return (k ? '<span class="orden-flecha" aria-hidden="true">➜</span>' : '') +
        '<span class="orden-item" style="--color:' + e.color + '"><b>' + (k + 1) + '</b>' + e.icon + ' ' + esc(e.name) + '</span>';
    }).join('');
  }

  function sortear() {
    var a = ordenSala().slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    Online.actualizarMeta({ orden: a });
    Audio.efecto('dado');
  }

  function comenzar() {
    var m = s.meta;
    var eq = listaEquipos();
    App().comenzar({
      modo: m.modo,
      etapa: m.etapa || 1,
      tema: m.tema || '',
      tiempo: m.tiempo,
      equipos: eq.map(function (e) { return { nombre: e.name, color: e.color, icono: e.icon }; }),
      orden: ordenSala()
    });
  }

  async function cerrar() {
    if (!s.codigo) return;
    try { await Online.actualizarMeta({ status: 'finished' }); } catch (e) { /* sin acción */ }
    Online.borrarSesion();
    Online.salirSala();
    s.rol = null; s.codigo = null;
    reiniciarDatos();
    UI.ponerPermiso(null);
  }

  /* ----- Funciones que usa main.js durante la partida del anfitrión ----- */

  function activo() { return s.rol === 'host' && !!s.codigo; }

  /** ¿El anfitrión puede jugar por este equipo? (sin dispositivo, o "Jugar por este equipo"). */
  function hostControla(i) {
    if (!activo()) return true;
    var t = s.equipos['t' + i];
    return !t || !t.ownerUid || !!s.forzados[i];
  }

  function conexion() {
    var est = App().estado();
    if (!activo() || !est) return null;
    return est.equipos.map(function (e, i) {
      var t = s.equipos['t' + i];
      if (!t || !t.ownerUid || s.forzados[i]) return 'anfitrion';
      return enLinea(t.ownerUid) ? 'online' : 'offline';
    });
  }

  /** El equipo de turno tiene dispositivo pero está desconectado. */
  function necesitaAyuda(est) {
    if (!activo() || !est || est.fase === 'fin') return false;
    var i = G.equipoDeTurno(est);
    var t = s.equipos['t' + i];
    return !!(t && t.ownerUid && !enLinea(t.ownerUid) && !s.forzados[i]);
  }

  function forzar(i) {
    s.forzados[i] = true;
    var est = App().estado();
    if (est) publicar(est);
    App().refrescar();
  }

  /** Si el dispositivo de un equipo vuelve, deja de controlarlo el anfitrión. */
  function limpiarForzados() {
    var cambio = false;
    Object.keys(s.forzados).forEach(function (i) {
      var t = s.equipos['t' + i];
      if (t && t.ownerUid && enLinea(t.ownerUid)) { delete s.forzados[i]; cambio = true; }
    });
    if (cambio && App().estado()) publicar(App().estado());
  }

  function alDispatch(est) {
    if (!activo()) return;
    if (est.eventos && est.eventos[0] && est.eventos[0].tipo === 'inicio') {
      s.partida = Math.random().toString(36).slice(2, 10);
      s.forzados = {};
      s.enPartida = true;
      Online.actualizarMeta({ status: 'playing' });
    }
    if (est.fase !== 'pregunta') s.reloj = null;
    publicar(est);
  }

  /** Inicia (una sola vez por pregunta) el reloj sincronizado y lo publica. */
  function relojPregunta(est) {
    if (!activo()) return null;
    if (!s.reloj) {
      s.reloj = { inicio: Online.ahoraServidor(), duracion: s.meta ? (s.meta.tiempo || 0) : 30 };
      publicar(est);
    }
    return s.reloj;
  }

  function estadoPublico(est) {
    var p = {
      partida: s.partida, seq: est.seq, config: est.config, equipos: est.equipos, orden: est.orden,
      turnoIdx: est.turnoIdx, ronda: est.ronda, fase: est.fase, dado: est.dado, eventos: est.eventos || [],
      reloj: est.fase === 'pregunta' ? s.reloj : null,
      controlHost: est.equipos.map(function (e, i) { return hostControla(i); })
    };
    var q = est.preguntaActual;
    if (q) {
      // Sin la respuesta correcta mientras se está respondiendo.
      p.preguntaActual = {
        texto: q.texto, opciones: q.opciones.map(function (o) { return { texto: o.texto }; }),
        tipo: q.tipo, casilla: q.casilla, etapa: q.etapa, equipo: q.equipo, rol: q.rol, enJuego: q.enJuego
      };
      if (est.fase === 'resultado') p.preguntaActual.correcta = q.correcta;
    }
    if (est.fase === 'resultado' && est.resultado) p.resultado = est.resultado;
    if (est.fin) p.fin = Object.assign({}, est.fin, { repaso: G.preguntasParaRepasar(est, 6) });
    return p;
  }

  function publicar(est) {
    if (!activo()) return;
    Online.publicarEstado(estadoPublico(est), {
      estado: est, reloj: s.reloj, partida: s.partida, forzados: s.forzados
    });
  }

  /* ----- Cola de acciones recibidas (validación del anfitrión) ----- */

  function encolar(a) {
    if (!a || !a.id || s.vistos[a.id]) return; // acción repetida
    s.vistos[a.id] = true;
    s.cola.push(a);
    procesarCola();
  }

  async function procesarCola() {
    if (s.procesando) return;
    s.procesando = true;
    try {
      while (s.cola.length && activo()) {
        var a = s.cola[0];
        var r = ejecutar(a);
        if (r === 'ocupado') { await esperar(150); continue; }
        s.cola.shift();
        Online.borrarAccion(a.id);
        await esperar(20);
      }
    } finally {
      s.procesando = false;
    }
  }

  function ejecutar(a) {
    if (a.type === 'reclamar') { reclamar(a); return 'ok'; }
    var t = a.teamId && s.equipos[a.teamId];
    // Solo el dispositivo dueño del equipo puede actuar por él.
    if (!t || t.ownerUid !== a.uid) return 'ignorada';
    if (!s.enPartida || !App().estado()) return 'ignorada';
    var payload = a.payload || {};
    // Respuesta que llegó después del tiempo: cuenta como incorrecta.
    if (a.type === 'responder' && s.reloj && s.reloj.duracion && typeof a.ts === 'number' &&
        a.ts > s.reloj.inicio + s.reloj.duracion * 1000 + 500) {
      payload = { opcion: -1 };
    }
    return App().accionRemota(a.type, idx(a.teamId), payload);
  }

  /** Un dispositivo nuevo pide recuperar un equipo cuyo dispositivo está desconectado. */
  function reclamar(a) {
    var id = a.payload && a.payload.teamId;
    var t = id && s.equipos[id];
    if (!t) return;
    if (t.ownerUid && enLinea(t.ownerUid)) return;
    Online.asignarEquipo(id, a.uid);
  }

  /* =============================== JUGADOR =============================== */

  function entrarComoJugador(codigo) {
    reiniciarDatos();
    s.rol = 'jugador';
    s.codigo = codigo;
    UI.ponerPermiso(null);
    Online.entrarSala(codigo, 'jugador');
    Online.guardarSesion({ codigo: codigo, rol: 'jugador' });
    App().musicaSesion(false); // en el celular: solo efectos por defecto
    $('#lobby-contenido').innerHTML = '<div class="panel lobby-jugador"><p class="nota">⏳ Conectando con la sala ' + codigo + '…</p></div>';
    App().ir('lobby');
  }

  function salir() {
    if (s.rol === 'jugador' && s.miEquipo) Online.liberarEquipo(s.miEquipo).catch(function () {});
    Online.borrarSesion();
    Online.salirSala();
    UI.detenerTemporizador();
    s.rol = null; s.codigo = null;
    reiniciarDatos();
    pintarEsperaAnfitrion();
  }

  function renderLobbyJugador() {
    var cont = $('#lobby-contenido');
    if (!cont || !s.meta) return;
    var mio = s.miEquipo;
    var t = mio ? s.equipos[mio] : null;
    // El bloque de edición solo se redibuja si cambia el equipo o su ícono (para no cortar la escritura).
    var firma = s.codigo + '|' + mio + '|' + (t ? t.icon : '');
    if (firma !== s.ljFirma || !$('#lj-dinamico')) {
      s.ljFirma = firma;
      cont.innerHTML =
        '<div class="panel lobby-jugador">' +
        '<div class="codigo-chip">Sala <strong>' + s.codigo + '</strong></div>' +
        '<p class="lobby-info">🗺️ ' + esc(textoModo(s.meta)) + ' · ⏱️ ' + textoTiempo(s.meta.tiempo) + '</p>' +
        (t ? editorEquipoHTML(mio, t) : '<h3>Elige tu equipo</h3>') +
        '<div id="lj-dinamico"></div>' +
        '<div class="lobby-pie"><button class="btn btn-gris btn-chico" data-c="salir">🚪 Salir de la sala</button></div>' +
        '</div>';
    }
    var eq = listaEquipos();
    var html = '';
    if (t) {
      html += '<p class="lobby-espera">' + (s.meta.status === 'lobby'
        ? '⏳ Esperando a que el anfitrión comience el juego…'
        : '🎮 ¡La partida está en curso! Entrando…') + '</p><h4>Equipos de la sala</h4>';
    }
    html += '<ul class="lobby-lista">' + eq.map(function (e) {
      var accion = '';
      var estado;
      if (e.id === mio) estado = '<span class="estado-on">⭐ Tu equipo</span>';
      else if (!e.ownerUid) {
        estado = '<span class="estado-espera">Libre</span>';
        if (!mio) accion = '<button class="btn btn-verde btn-mini" data-c="tomar" data-team="' + e.id + '">Unirme</button>';
      } else if (!enLinea(e.ownerUid)) {
        estado = '<span class="estado-off">⚠️ Desconectado</span>';
        if (!mio) accion = '<button class="btn btn-azul btn-mini" data-c="reclamar" data-team="' + e.id + '">Recuperar</button>';
      } else estado = '<span class="estado-on">📶 Ocupado</span>';
      return '<li style="--color:' + e.color + '">' + UI.fichaHTML({ color: e.color, icono: e.icon }) +
        '<div class="lobby-eq-datos"><strong>' + esc(e.name) + '</strong>' + estado + '</div>' + accion + '</li>';
    }).join('') + '</ul>';
    html += '<div class="orden-panel-mini"><span>🎲 Orden de turnos:</span><div class="orden-turnos">' + ordenHTML(ordenSala()) + '</div></div>';
    $('#lj-dinamico').innerHTML = html;
  }

  function editorEquipoHTML(id, t) {
    var bloqueado = s.meta.status !== 'lobby';
    return '<div class="lj-equipo" style="--color:' + t.color + '">' +
      '<div class="te-ficha" aria-hidden="true">' + t.icon + '</div>' +
      '<label class="campo"><span>Nombre de tu equipo</span><input type="text" id="lj-nombre" maxlength="24" value="' + esc(t.name) + '"' + (bloqueado ? ' disabled' : '') + '></label>' +
      (bloqueado ? '' : '<div class="te-iconos" role="group" aria-label="Ficha de tu equipo">' + G.ICONOS_FICHA.map(function (ic) {
        return '<button class="te-icono" data-c="icono" data-icono="' + ic + '" aria-pressed="' + (ic === t.icon) + '" aria-label="Ficha ' + ic + '">' + ic + '</button>';
      }).join('') + '</div>' +
      '<button class="btn btn-gris btn-mini" data-c="soltar">↩ Cambiar de equipo</button>') +
      '</div>';
  }

  /* ----------------------------- Vista de control ----------------------------- */

  function recibirPublico(pub) {
    if (!pub) { s.pub = null; navegarJugador(); return; }
    var clave = pub.partida + ':' + pub.seq;
    var nueva = clave !== s.clave;
    s.pub = pub;
    if (nueva) {
      s.clave = clave;
      s.enviado = null;
      s.cofreAtaque = false;
    }
    var eventos = nueva && !s.primera ? (pub.eventos || []) : null;
    if (eventos) efectos(eventos);
    navegarJugador(eventos);
    s.primera = false;
  }

  /** Decide qué pantalla ve el jugador: lobby, control o fin. */
  function navegarJugador(eventos) {
    if (s.rol !== 'jugador' || !s.codigo) return;
    pintarEsperaAnfitrion();
    var pub = s.pub;
    if (pub && pub.fase === 'fin') {
      if (!pantallaActiva('fin')) {
        UI.detenerTemporizador();
        if (eventos) { Audio.efecto('victoria'); UI.confeti(); }
        UI.renderFin(pub);
        var b = $('[data-accion="jugar-de-nuevo"]');
        if (b) b.hidden = true;
        App().ir('fin');
      }
      return;
    }
    if (pub && s.miEquipo && s.meta && s.meta.status === 'playing') {
      if (!pantallaActiva('control')) { s.firmaZona = null; App().ir('control'); }
      renderControl(eventos);
      return;
    }
    if (!pantallaActiva('lobby')) App().ir('lobby');
    renderLobbyJugador();
  }

  function efectos(eventos) {
    var mi = idx(s.miEquipo);
    eventos.forEach(function (ev) {
      switch (ev.tipo) {
        case 'respuesta': Audio.efecto(ev.correcto ? 'acierto' : 'error'); break;
        case 'vida': setTimeout(function () { Audio.efecto('vida'); }, 300); break;
        case 'eliminado': setTimeout(function () { Audio.efecto('eliminado'); }, 700); break;
        case 'meta': Audio.efecto('meta'); break;
        case 'relampago': Audio.efecto('especial'); break;
        case 'turno':
          if (ev.equipo === mi) {
            Audio.efecto('especial');
            if (root.navigator.vibrate) { try { root.navigator.vibrate(120); } catch (e) { /* sin acción */ } }
          }
          break;
      }
    });
  }

  function renderControl(eventos) {
    var pub = s.pub;
    var cont = $('#control-contenido');
    if (!cont || !pub) return;
    if (!$('#c-mi')) {
      cont.innerHTML =
        '<div class="control-top"><span class="chip">🔑 Sala ' + s.codigo + '</span><span class="chip" id="c-conexion"></span></div>' +
        '<div class="panel control-mi" id="c-mi"></div>' +
        '<div class="panel control-zona" id="c-zona" aria-live="polite"></div>' +
        '<div class="panel control-progreso" id="c-progreso"></div>';
    }
    renderMi();
    renderProgreso();
    renderZona(eventos);
    pintarConexion();
  }

  function renderMi() {
    var pub = s.pub, i = idx(s.miEquipo), e = pub.equipos[i];
    if (!e) return;
    var et = pub.config.modo === 'personalizado' ? null : G.etapaPorId(G.etapaDeCasilla(Math.max(1, e.pos), pub.config));
    var el = $('#c-mi');
    el.style.setProperty('--color', e.color);
    el.innerHTML = UI.fichaHTML(e, 'grande') +
      '<div class="cm-datos"><small>Tu equipo</small><strong>' + esc(e.nombre) + '</strong>' +
      '<div class="cm-stats">⭐ ' + e.puntos + ' pts · ' + UI.corazones(e.vidas, 3) + '</div>' +
      '<div class="cm-pos">📍 Casilla ' + e.pos + ' de ' + pub.config.totalCasillas + (et ? ' · ' + et.icono + ' ' + esc(et.nombre) : '') + '</div>' +
      (e.eliminado ? '<span class="tag tag-elim">Eliminado</span>' : '') + (e.enMeta ? '<span class="tag tag-meta">🏆 META</span>' : '') +
      '</div>';
  }

  function renderProgreso() {
    var pub = s.pub, total = pub.config.totalCasillas;
    var turno = pub.orden[pub.turnoIdx];
    $('#c-progreso').innerHTML = '<h3 class="panel-titulo">Recorrido</h3>' + pub.orden.map(function (i) {
      var e = pub.equipos[i];
      var t = s.equipos['t' + i];
      var con = t && t.ownerUid ? (enLinea(t.ownerUid) ? 'online' : 'offline') : 'anfitrion';
      return '<div class="cp-fila' + (i === turno ? ' de-turno' : '') + (e.eliminado ? ' eliminado' : '') + '" style="--color:' + e.color + '">' +
        UI.fichaHTML(e) +
        '<div class="cp-datos"><div class="cp-nombre">' + esc(e.nombre) + UI.conexionHTML(con) + '</div>' +
        '<div class="cp-barra"><span style="width:' + Math.round(e.pos / total * 100) + '%"></span></div>' +
        '<div class="cp-info">Casilla ' + e.pos + ' · ⭐ ' + e.puntos + ' · ' + UI.corazones(e.vidas, 3) + '</div></div></div>';
    }).join('');
  }

  var LETRAS = ['A', 'B', 'C', 'D'];

  function renderZona(eventos) {
    var pub = s.pub;
    var firma = JSON.stringify([s.clave, pub.reloj && pub.reloj.inicio, s.enviado, s.cofreAtaque, s.miEquipo, pub.fase]);
    if (firma === s.firmaZona && !eventos) return;
    s.firmaZona = firma;
    var mi = idx(s.miEquipo);
    var turno = pub.orden[pub.turnoIdx];
    var eT = pub.equipos[turno];
    var miE = pub.equipos[mi];
    var html = '';
    UI.detenerTemporizador();

    if (pub.fase === 'turno') {
      if (turno === mi && !miE.eliminado) {
        var bloqueado = !!s.enviado;
        html = '<h2 class="zona-titulo">¡Es tu turno! 🎉</h2>' +
          '<div class="dado" id="c-dado">' + UI.caraDado(pub.dado || 1) + '</div>' +
          '<button class="btn btn-naranja btn-grande" data-c="tirar"' + (bloqueado ? ' disabled' : '') + '>🎲 Tirar dado</button>' +
          '<button class="btn btn-morado" data-c="relampago"' + (bloqueado || miE.puntos < G.REGLAS.COSTO_RELAMPAGO ? ' disabled' : '') + '>⚡ Pregunta relámpago' +
          '<small>Canjea 5 puntos (' + miE.puntos + '/5)</small></button>' +
          (bloqueado ? '<p class="nota">Enviado… espera un momento.</p>' : '');
      } else {
        html = '<h2 class="zona-titulo">Turno de ' + UI.fichaHTML(eT) + ' ' + esc(eT.nombre) + '</h2>' +
          '<div class="dado chico" id="c-dado">' + UI.caraDado(pub.dado || 1) + '</div>' +
          '<p class="nota">' + (miE.eliminado ? 'Tu equipo fue eliminado, pero puedes seguir la partida.' : 'Espera tu turno…') + '</p>';
      }
    } else if (pub.fase === 'pregunta' && pub.preguntaActual) {
      var q = pub.preguntaActual;
      if (!pub.reloj) {
        html = '<div class="dado" id="c-dado">' + UI.caraDado(pub.dado || 1) + '</div>' +
          '<p class="zona-sub">' + (q.tipo === 'relampago' ? '⚡ ¡Pregunta relámpago!' : '🎲 Salió ' + pub.dado + '… avanzando') + '</p>';
      } else {
        html = preguntaHTML(q, pub, mi);
      }
    } else if (pub.fase === 'resultado' && pub.resultado) {
      html = resultadoHTML(pub, mi);
    }
    $('#c-zona').innerHTML = html;

    // Dado animado si hubo tirada nueva
    var evDado = (eventos || []).filter(function (e) { return e.tipo === 'dado'; })[0];
    if (evDado && $('#c-dado')) UI.animarDado($('#c-dado'), evDado.valor);

    if (pub.fase === 'pregunta' && pub.reloj) {
      UI.iniciarTemporizadorServidor(pub.reloj, Online.ahoraServidor, $('#c-zona .temporizador'), function () {
        $$('#c-zona .opcion').forEach(function (b) { b.disabled = true; });
        var n = $('#c-zona .nota-tiempo');
        if (n) n.hidden = false;
      }, 0);
    }
  }

  function preguntaHTML(q, pub, mi) {
    var info = G.TIPOS_CASILLA[q.tipo];
    var e = pub.equipos[q.equipo];
    var mia = q.equipo === mi;
    var titulo = q.tipo === 'relampago' ? '⚡ Relámpago' : 'Casilla ' + q.casilla + (q.tipo !== 'normal' ? ' · ' + info.icono + ' ' + info.nombre : '');
    var circ = (2 * Math.PI * 26).toFixed(1);
    var enviado = s.enviado && s.enviado.indexOf(':responder:') > 0 ? Number(s.enviado.split(':').pop()) : null;
    return '<div class="preg-cabecera">' +
      '<span class="chip chip-tipo chip-' + q.tipo + '">' + esc(titulo) + '</span>' +
      '<div class="temporizador"><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="26" class="temp-fondo"/>' +
      '<circle cx="30" cy="30" r="26" class="temp-arco" style="stroke-dasharray:' + circ + ';stroke-dashoffset:0"/></svg>' +
      '<span class="temp-num">∞</span><small>seg</small></div></div>' +
      (mia ? '<p class="preg-rol">🎤 ' + esc(q.rol) + '</p>'
        : '<p class="preg-rol">👀 Responde ' + UI.fichaHTML(e) + ' ' + esc(e.nombre) + ' (solo lectura)</p>') +
      '<h2 class="preg-texto">' + esc(q.texto) + '</h2>' +
      '<div class="opciones opciones-control">' + q.opciones.map(function (o, i) {
        var cls = enviado === i ? ' enviada' : (enviado !== null ? ' apagada' : '');
        return '<button class="opcion opcion-' + i + cls + '" data-c="op" data-i="' + i + '"' + (!mia || enviado !== null ? ' disabled' : '') + '>' +
          '<span class="opcion-letra">' + LETRAS[i] + '</span><span class="opcion-texto">' + esc(o.texto) + '</span></button>';
      }).join('') + '</div>' +
      (enviado !== null ? '<p class="nota">📨 Respuesta enviada. Esperando el resultado…</p>' : '') +
      '<p class="nota nota-tiempo" hidden>⏰ ¡Se acabó el tiempo!</p>' +
      '<div class="en-juego">🎯 ' + esc(q.enJuego) + '</div>';
  }

  function resultadoHTML(pub, mi) {
    var r = pub.resultado;
    var e = pub.equipos[r.equipo];
    var mio = r.equipo === mi;
    var titulo = r.sinPregunta ? 'Sin preguntas' : r.correcto ? '¡Correcto!' : (r.tiempoAgotado ? '¡Tiempo agotado!' : '¡Incorrecto!');
    var html = '<div class="res-cabecera ' + (r.correcto ? 'ok' : 'mal') + '">' +
      '<div class="res-sello">' + (r.correcto ? '✔' : (r.tiempoAgotado ? '⏰' : '✖')) + '</div>' +
      '<div><div class="res-titulo">' + titulo + '</div><div class="res-equipo">' + UI.fichaHTML(e) + esc(e.nombre) + '</div></div></div>' +
      '<ul class="res-efectos">' + (r.mensajes || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      (!r.correcto && r.correctaTexto ? '<div class="res-correcta"><small>Respuesta correcta</small>' + esc(r.correctaTexto) + '</div>' : '') +
      (r.explicacion ? '<div class="res-explicacion"><strong>📘 Explicación</strong><p>' + esc(r.explicacion) + '</p></div>' : '');
    var enviado = !!s.enviado;
    if (mio && r.pendienteCofre) {
      var rivales = r.rivales || [];
      if (!s.cofreAtaque) {
        html += '<div class="cofre-eleccion"><h3>🎁 Elige tu recompensa</h3><div class="cofre-opciones">' +
          '<button class="btn btn-verde" data-c="avance"' + (enviado ? ' disabled' : '') + '>🚀 Avance estratégico<small>Avanzas 3 casillas</small></button>' +
          (rivales.length ? '<button class="btn btn-rojo" data-c="ataque"' + (enviado ? ' disabled' : '') + '>⚔️ Ataque estratégico<small>Un rival retrocede 3</small></button>'
            : '<p class="nota">No hay rivales válidos para atacar.</p>') + '</div></div>';
      } else {
        html += '<div class="cofre-eleccion"><h3>⚔️ ¿A qué equipo atacas?</h3><div class="rivales">' + rivales.map(function (i) {
          var rv = pub.equipos[i];
          return '<button class="btn btn-rival" style="--c:' + rv.color + '" data-c="rival" data-rival="' + i + '"' + (enviado ? ' disabled' : '') + '>' + rv.icono + ' ' + esc(rv.nombre) + ' <small>casilla ' + rv.pos + '</small></button>';
        }).join('') + '<button class="btn btn-gris" data-c="volver-cofre">Volver</button></div></div>';
      }
    } else if (mio) {
      html += '<div class="modal-botones"><button class="btn btn-verde btn-grande" data-c="continuar"' + (enviado ? ' disabled' : '') + '>Continuar ➜</button></div>';
    } else {
      html += '<p class="nota centrado">' + (r.pendienteCofre ? '🎁 ' + esc(e.nombre) + ' está eligiendo su recompensa…' : '⏳ Esperando a que ' + esc(e.nombre) + ' continúe…') + '</p>';
    }
    return html;
  }

  function enviar(tipo, payload, marca) {
    s.enviado = s.clave + ':' + tipo + (marca != null ? ':' + marca : '');
    Online.enviarAccion(tipo, payload).catch(function (e) {
      root.console.error(e);
      s.enviado = null;
      UI.toast('No se pudo enviar. Revisa tu conexión.', 'mal');
      s.firmaZona = null;
      renderZona();
    });
    s.firmaZona = null;
    renderZona();
  }

  /* --------------------------- Estado de conexión --------------------------- */

  function pintarConexion() {
    var el = $('#c-conexion');
    if (el) el.textContent = Online.conectado() ? '🟢 Conectado' : '🔴 Sin conexión…';
  }

  function pintarEsperaAnfitrion() {
    var el = $('#espera-anfitrion');
    if (!el) return;
    el.hidden = !(s.rol === 'jugador' && s.codigo && s.meta && s.meta.status !== 'finished' && !hostEnLinea());
  }

  /* ------------------------- Eventos de la red ------------------------- */

  function render() {
    if (s.rol === 'host') {
      if (pantallaActiva('lobby')) renderLobbyHost();
      if (pantallaActiva('juego')) App().refrescar();
    } else if (s.rol === 'jugador') {
      navegarJugador();
    }
  }

  function registrarEventos() {
    Online.on('meta', function (m) {
      if (!s.codigo) return;
      s.meta = m;
      if (!m) { salaCerrada('La sala ya no existe.'); return; }
      if (s.rol === 'jugador' && m.status === 'finished') { salaCerrada('El anfitrión cerró la sala.'); return; }
      render();
    });
    Online.on('equipos', function (t) {
      if (!s.codigo) return;
      s.equipos = t || {};
      if (s.rol === 'jugador') {
        var mio = miTeamId();
        if (mio !== s.miEquipo) {
          if (s.miEquipo && !mio) UI.toast('Ya no tienes un equipo asignado. Elige uno.', 'mal', 3000);
          s.miEquipo = mio;
          s.firmaZona = null;
          Online.ponerMiEquipo(mio);
          Online.guardarSesion({ codigo: s.codigo, rol: 'jugador', teamId: mio });
        }
      } else limpiarForzados();
      render();
    });
    Online.on('presencia', function (p) {
      if (!s.codigo) return;
      s.presencia = p || {};
      if (s.rol === 'host') limpiarForzados();
      render();
    });
    Online.on('estado', function (pub) {
      if (!s.codigo || s.rol !== 'jugador') return;
      recibirPublico(pub);
    });
    Online.on('accion', function (a) { if (s.rol === 'host') encolar(a); });
    Online.on('conexion', function () { pintarConexion(); });
  }

  function salaCerrada(texto) {
    var estabaJugando = s.rol === 'jugador';
    salir();
    if (estabaJugando) {
      App().ir('portada');
      UI.aviso({ titulo: 'Sala cerrada', icono: '🚪', texto: texto });
    }
  }

  /* ----------------------------- Clics ----------------------------- */

  function enlazar() {
    var doc = root.document;
    doc.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sala], [data-c], [data-grupo-sala] .chip-opcion');
      if (!b) return;
      if (b.closest('[data-grupo-sala]') && b.classList.contains('chip-opcion')) {
        var g = b.parentElement.dataset.grupoSala;
        form[g] = Number(b.dataset.valor);
        $$('.chip-opcion', b.parentElement).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        return;
      }
      var a = b.dataset.sala;
      if (a) {
        switch (a) {
          case 'crear': crear(); break;
          case 'unirse': unirse(); break;
          case 'copiar': copiar(s.codigo, 'Código copiado'); break;
          case 'copiar-enlace': copiar(enlaceSala(s.codigo), 'Enlace copiado'); break;
          case 'expulsar':
            UI.confirmar({ titulo: '¿Quitar el dispositivo de este equipo?', texto: 'El equipo quedará libre para que otro dispositivo se una.', si: 'Quitar', icono: '🚫' })
              .then(function (ok) { if (ok) Online.asignarEquipo(b.dataset.team, null); });
            break;
          case 'sortear': sortear(); break;
          case 'comenzar': case 'comenzar-igual': comenzar(); break;
          case 'cerrar':
            UI.confirmar({ titulo: '¿Cerrar la sala?', texto: 'Los jugadores serán desconectados.', si: 'Cerrar sala', icono: '🚪' })
              .then(function (ok) { if (ok) { cerrar(); App().ir('portada'); } });
            break;
        }
        return;
      }
      var c = b.dataset.c;
      switch (c) {
        case 'tomar':
          Online.tomarEquipo(b.dataset.team).then(function (ok) {
            if (!ok) UI.toast('Ese equipo ya fue tomado. Elige otro.', 'mal');
          }, function (err) { UI.toast('❌ ' + errorTexto(err), 'mal'); });
          break;
        case 'reclamar':
          Online.enviarAccion('reclamar', { teamId: b.dataset.team });
          UI.toast('Solicitud enviada al anfitrión…', 'ok');
          break;
        case 'soltar': Online.liberarEquipo(s.miEquipo); break;
        case 'icono': Online.editarEquipo(s.miEquipo, { icon: b.dataset.icono }); break;
        case 'salir':
          UI.confirmar({ titulo: '¿Salir de la sala?', texto: 'Tu equipo quedará libre (lo controlará el anfitrión).', si: 'Salir', icono: '🚪' })
            .then(function (ok) { if (ok) { salir(); App().ir('portada'); } });
          break;
        case 'tirar': enviar('tirar'); break;
        case 'relampago': enviar('relampago'); break;
        case 'op': {
          var i = Number(b.dataset.i);
          enviar('responder', { opcion: i }, i);
          break;
        }
        case 'continuar': enviar('continuar'); break;
        case 'avance': enviar('avance'); break;
        case 'ataque': s.cofreAtaque = true; s.firmaZona = null; renderZona(); break;
        case 'volver-cofre': s.cofreAtaque = false; s.firmaZona = null; renderZona(); break;
        case 'rival': enviar('ataque', { rival: Number(b.dataset.rival) }); break;
      }
    });
    doc.addEventListener('change', function (e) {
      if (e.target.id === 'lj-nombre' && s.miEquipo) {
        Online.editarEquipo(s.miEquipo, { name: e.target.value.trim() || 'Equipo' });
      }
      if (e.target.id === 'sala-modo') {
        form.modo = e.target.value;
        $('#sala-etapa-campo').hidden = form.modo !== 'etapa';
      }
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.id === 'sala-codigo') { e.preventDefault(); unirse(); }
      if (e.key === 'Enter' && e.target.id === 'lj-nombre') e.target.blur();
    });
    doc.addEventListener('input', function (e) {
      if (e.target.id === 'sala-codigo') {
        var v = Online.normalizarCodigo(e.target.value);
        if (v !== e.target.value) e.target.value = v;
      }
    });
  }

  function copiar(texto, msg) {
    function respaldo() {
      var t = root.document.createElement('textarea');
      t.value = texto; root.document.body.appendChild(t); t.select();
      try { root.document.execCommand('copy'); UI.toast('📋 ' + msg, 'ok'); } catch (e) { UI.toast(texto, 'ok', 4000); }
      t.remove();
    }
    if (root.navigator.clipboard && root.isSecureContext) {
      root.navigator.clipboard.writeText(texto).then(function () { UI.toast('📋 ' + msg, 'ok'); }, respaldo);
    } else respaldo();
  }

  /* ------------------------------- Arranque ------------------------------- */

  function actualizarTarjeta() {
    var ok = Online.configurado();
    var t = $('#tarjeta-online');
    if (!t) return;
    t.classList.toggle('deshabilitada', !ok);
    t.setAttribute('aria-disabled', String(!ok));
    $('#online-cinta').hidden = ok;
    $('#online-sin-config').hidden = ok;
    $('#btn-online').disabled = !ok;
    $$('.solo-online').forEach(function (el) { el.hidden = !ok; });
  }

  async function iniciar() {
    registrarEventos();
    enlazar();
    actualizarTarjeta();
    if (!Online.configurado()) return;

    var param = (root.location.search.match(/[?&]sala=([^&#]+)/) || [])[1];
    var ultima = Online.ultimaSesion();
    if (!param && !ultima) return;

    // Hay una sala pendiente: iniciar Firebase para ver si este dispositivo la retoma.
    try {
      await Online.iniciar();
      var ses = Online.leerSesion();
      if (ses && ses.codigo) {
        var meta = await Online.leerMeta(ses.codigo);
        if (meta && meta.status !== 'finished') {
          if (ses.rol === 'host' && meta.hostUid === Online.uid()) { await reanudarHost(ses.codigo); return; }
          if (ses.rol === 'jugador') { entrarComoJugador(ses.codigo); return; }
        } else Online.borrarSesion();
      }
      if (param) { abrir(decodeURIComponent(param)); return; }
      if (ultima && ultima.rol === 'jugador') {
        var b = $('#btn-volver-sala');
        if (b) { b.hidden = false; b.dataset.codigo = ultima.codigo; b.querySelector('span').textContent = ultima.codigo; }
      }
    } catch (e) {
      root.console.error(e);
      if (param) abrir(decodeURIComponent(param));
    }
  }

  root.Sala = {
    iniciar: iniciar,
    abrir: abrir,
    unirse: unirse,
    activo: activo,
    esJugador: function () { return s.rol === 'jugador' && !!s.codigo; },
    codigo: function () { return s.codigo; },
    alDispatch: alDispatch,
    relojPregunta: relojPregunta,
    ahora: function () { return Online.ahoraServidor(); },
    hostControla: hostControla,
    conexion: conexion,
    necesitaAyuda: necesitaAyuda,
    forzar: forzar,
    cerrar: cerrar,
    salir: salir
  };
})(window);
