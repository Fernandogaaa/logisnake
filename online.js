/*
 * LOGISNAKE — Capa de red (Firebase Realtime Database + autenticación anónima)
 * ----------------------------------------------------------------------------
 * Este archivo solo habla con Firebase: salas, equipos, acciones, presencia y reloj.
 * No contiene reglas del juego (están en game.js) ni pantallas (están en sala.js).
 *
 * Estructura en la base de datos:
 *   rooms/{codigo}/
 *     meta:      { hostUid, createdAt, status, modo, etapa, tiempo, nEquipos, tema, orden }
 *     teams/t0…: { name, color, icon, ownerUid?, online }
 *     state:     { version, datos (estado público en JSON), actualizado }   ← solo anfitrión
 *     privado:   { datos (estado completo en JSON) }                        ← solo lo lee el anfitrión
 *     actions/{pushId}: { uid, teamId, type, payload, ts }
 *     presence/{uid}:   { rol, teamId, online, lastSeen }
 *
 * El SDK de Firebase se carga solo cuando se usa el modo en línea, para que el modo
 * docente siga abriendo rápido y sin errores aunque no haya internet.
 */
(function (root) {
  'use strict';

  var VERSION_SDK = '10.12.2';
  var SDK = ['app', 'auth', 'database'].map(function (n) {
    return 'https://www.gstatic.com/firebasejs/' + VERSION_SDK + '/firebase-' + n + '-compat.js';
  });
  var ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O, 0, I, 1
  var SEIS_HORAS = 6 * 60 * 60 * 1000;

  // Solo para desarrollo: ?simulador=1 usa una base de datos falsa entre pestañas (carpeta dev/).
  var simulador = /[?&]simulador=1\b/.test(root.location.search);

  var st = {
    uid: null, db: null, offset: 0, conectado: false,
    codigo: null, rol: null, miEquipo: null,
    subs: []
  };
  var oyentes = {};

  /* ------------------------------ Eventos ------------------------------ */

  function on(evento, fn) { (oyentes[evento] = oyentes[evento] || []).push(fn); }
  function emitir(evento, dato) {
    (oyentes[evento] || []).forEach(function (fn) {
      try { fn(dato); } catch (e) { root.console.error(e); }
    });
  }

  /* ---------------------------- Inicialización ---------------------------- */

  function configurado() {
    if (simulador) return true;
    var c = root.FIREBASE_CONFIG || {};
    return !!(c.apiKey && c.databaseURL && c.projectId);
  }

  function cargarScript(src) {
    return new Promise(function (ok, mal) {
      var s = root.document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = function () { mal(new Error('No se pudo cargar ' + src)); };
      root.document.head.appendChild(s);
    });
  }

  function primerUsuario(auth) {
    return new Promise(function (ok) {
      var quitar = auth.onAuthStateChanged(function (u) { quitar(); ok(u); });
    });
  }

  var promesaInicio = null;

  /** Carga Firebase, inicia sesión anónima y devuelve el uid. */
  function iniciar() {
    if (promesaInicio) return promesaInicio;
    promesaInicio = (async function () {
      if (!configurado()) throw new Error('sin-config');
      if (!root.firebase) {
        if (simulador) await cargarScript('dev/firebase-simulado.js');
        else {
          for (var i = 0; i < SDK.length; i++) await cargarScript(SDK[i]);
        }
      }
      var fb = root.firebase;
      if (!fb.apps.length) fb.initializeApp(simulador ? { simulador: true } : root.FIREBASE_CONFIG);
      var auth = fb.auth();
      // SESSION: cada pestaña es un usuario distinto, y al recargar se conserva el mismo uid.
      await auth.setPersistence(fb.auth.Auth.Persistence.SESSION);
      var user = auth.currentUser || await primerUsuario(auth);
      if (!user) user = (await auth.signInAnonymously()).user;
      st.uid = user.uid;
      st.db = fb.database();
      st.db.ref('.info/serverTimeOffset').on('value', function (s) { st.offset = s.val() || 0; });
      st.db.ref('.info/connected').on('value', function (s) {
        st.conectado = !!s.val();
        emitir('conexion', st.conectado);
        if (st.conectado) reanudarPresencia();
      });
      return st.uid;
    })();
    promesaInicio.catch(function () { promesaInicio = null; });
    return promesaInicio;
  }

  function TS() { return root.firebase.database.ServerValue.TIMESTAMP; }
  function ahoraServidor() { return Date.now() + st.offset; }
  function sala(codigo, ruta) { return st.db.ref('rooms/' + codigo + (ruta ? '/' + ruta : '')); }
  function ref(ruta) { return sala(st.codigo, ruta); }

  /* -------------------------------- Salas -------------------------------- */

  function generarCodigo() {
    var c = '';
    var azar = root.crypto && root.crypto.getRandomValues ? root.crypto.getRandomValues(new Uint32Array(5)) : null;
    for (var i = 0; i < 5; i++) {
      var n = azar ? azar[i] : Math.floor(Math.random() * 4294967295);
      c += ALFABETO[n % ALFABETO.length];
    }
    return c;
  }

  function normalizarCodigo(txt) {
    return String(txt || '').toUpperCase().replace(/[^A-Z0-9]/g, '').split('').filter(function (ch) { return ALFABETO.indexOf(ch) >= 0; }).join('').slice(0, 5);
  }

  async function leerMeta(codigo) {
    var s = await sala(codigo, 'meta').once('value');
    return s.val();
  }

  /** Crea una sala nueva y devuelve su código. meta: { modo, etapa, tiempo, nEquipos, tema, orden } */
  async function crearSala(meta, equipos) {
    await limpiarSalasViejas();
    var codigo = null;
    for (var intento = 0; intento < 10; intento++) {
      var c = generarCodigo();
      if (!(await leerMeta(c))) { codigo = c; break; }
    }
    if (!codigo) throw new Error('No se pudo generar un código libre. Intenta de nuevo.');
    var teams = {};
    equipos.forEach(function (e, i) {
      teams['t' + i] = { name: e.nombre, color: e.color, icon: e.icono, online: false };
    });
    var m = Object.assign({ hostUid: st.uid, createdAt: TS(), status: 'lobby' }, meta);
    await sala(codigo).set({ meta: m, teams: teams });
    registrarSalaCreada(codigo);
    return codigo;
  }

  function registrarSalaCreada(codigo) {
    try {
      var lista = JSON.parse(root.localStorage.getItem('logisnake.salas') || '[]');
      lista.push({ codigo: codigo, creada: Date.now() });
      root.localStorage.setItem('logisnake.salas', JSON.stringify(lista.slice(-20)));
    } catch (e) { /* sin almacenamiento */ }
  }

  /** El anfitrión borra sus salas de más de 6 horas. */
  async function limpiarSalasViejas() {
    var lista;
    try { lista = JSON.parse(root.localStorage.getItem('logisnake.salas') || '[]'); } catch (e) { return; }
    var quedan = [];
    for (var i = 0; i < lista.length; i++) {
      if (Date.now() - lista[i].creada > SEIS_HORAS) {
        try { await sala(lista[i].codigo).remove(); } catch (e) { /* no era nuestra o ya no existe */ }
      } else quedan.push(lista[i]);
    }
    try { root.localStorage.setItem('logisnake.salas', JSON.stringify(quedan)); } catch (e) { /* sin acción */ }
  }

  /* --------------------------- Entrar / salir --------------------------- */

  function suscribir(ruta, evento, fn) {
    var r = ref(ruta);
    r.on(evento, fn);
    st.subs.push({ r: r, evento: evento, fn: fn });
  }

  /** Escucha todos los nodos de la sala. rol: 'host' | 'jugador' */
  function entrarSala(codigo, rol) {
    salirSala(true);
    st.codigo = codigo;
    st.rol = rol;
    suscribir('meta', 'value', function (s) { emitir('meta', s.val()); });
    suscribir('teams', 'value', function (s) { emitir('equipos', s.val() || {}); });
    suscribir('presence', 'value', function (s) { emitir('presencia', s.val() || {}); });
    suscribir('state', 'value', function (s) {
      var v = s.val();
      var datos = null;
      if (v && v.datos) { try { datos = JSON.parse(v.datos); } catch (e) { datos = null; } }
      emitir('estado', datos);
    });
    if (rol === 'host') {
      suscribir('actions', 'child_added', function (s) {
        var a = s.val() || {};
        a.id = s.key;
        emitir('accion', a);
      });
    }
    reanudarPresencia();
  }

  /** Deja de escuchar la sala y marca este dispositivo como desconectado. */
  function salirSala(silencioso) {
    if (st.codigo && st.db) {
      var p = ref('presence/' + st.uid);
      p.onDisconnect().cancel();
      p.update({ online: false, lastSeen: TS() }).catch(function () {});
      if (st.miEquipo && st.rol === 'jugador') {
        var t = ref('teams/' + st.miEquipo + '/online');
        t.onDisconnect().cancel();
      }
    }
    st.subs.forEach(function (x) { x.r.off(x.evento, x.fn); });
    st.subs = [];
    st.codigo = null;
    st.rol = null;
    st.miEquipo = null;
    if (!silencioso) emitir('salida', null);
  }

  /* ------------------------------ Presencia ------------------------------ */

  function reanudarPresencia() {
    if (!st.codigo || !st.conectado) return;
    var p = ref('presence/' + st.uid);
    p.onDisconnect().update({ online: false, lastSeen: TS() });
    p.set({ rol: st.rol, teamId: st.miEquipo || null, online: true, lastSeen: TS() }).catch(function () {});
    if (st.miEquipo && st.rol === 'jugador') {
      var t = ref('teams/' + st.miEquipo + '/online');
      t.onDisconnect().set(false);
      t.set(true).catch(function () {});
    }
  }

  var tomando = false; // hay una solicitud de equipo en curso

  function ponerMiEquipo(teamId) {
    // Mientras se toma un equipo no se escribe en él: Firebase aún no confirmó el dueño.
    if (tomando) return;
    if (st.miEquipo && st.miEquipo !== teamId && st.codigo) {
      ref('teams/' + st.miEquipo + '/online').onDisconnect().cancel();
    }
    st.miEquipo = teamId || null;
    reanudarPresencia();
  }

  async function leerPresencia(codigo, uid) {
    var s = await sala(codigo, 'presence/' + uid).once('value');
    return s.val();
  }

  /* ------------------------------- Equipos ------------------------------- */

  /**
   * Toma un equipo libre. Devuelve true si quedó asignado a este dispositivo.
   * Las reglas de la base de datos solo permiten escribir ownerUid si el equipo está libre,
   * así que si dos dispositivos lo intentan a la vez, el segundo es rechazado.
   */
  async function tomarEquipo(teamId) {
    tomando = true;
    try {
      await ref('teams/' + teamId).update({ ownerUid: st.uid, online: true });
      tomando = false;
      ponerMiEquipo(teamId);
      return true;
    } catch (e) {
      return false;
    } finally {
      tomando = false;
    }
  }

  function liberarEquipo(teamId) {
    if (st.miEquipo === teamId) ponerMiEquipo(null);
    return ref('teams/' + teamId).update({ ownerUid: null, online: false });
  }

  function editarEquipo(teamId, datos) {
    var cambios = {};
    if (datos.name != null) cambios.name = String(datos.name).slice(0, 24) || 'Equipo';
    if (datos.icon != null) cambios.icon = datos.icon;
    return ref('teams/' + teamId).update(cambios);
  }

  /** Anfitrión: asigna (o quita, con uid null) el dispositivo de un equipo. */
  function asignarEquipo(teamId, uid) {
    return ref('teams/' + teamId).update({ ownerUid: uid || null, online: !!uid });
  }

  /* ------------------------------- Acciones ------------------------------- */

  function enviarAccion(tipo, payload) {
    return ref('actions').push({
      uid: st.uid,
      teamId: st.miEquipo || null,
      type: tipo,
      payload: payload || null,
      ts: TS()
    });
  }

  function borrarAccion(id) { return ref('actions/' + id).remove().catch(function () {}); }

  /* ---------------------------- Estado (anfitrión) ---------------------------- */

  var version = 0;

  /** Publica el estado público y guarda el estado completo en el nodo privado del anfitrión. */
  function publicarEstado(publico, privado) {
    version += 1;
    var cambios = {
      state: { version: version, datos: JSON.stringify(publico), actualizado: TS() }
    };
    if (privado) cambios.privado = { datos: JSON.stringify(privado) };
    return ref().update(cambios).catch(function (e) { root.console.error('No se pudo publicar el estado', e); });
  }

  function ponerVersion(v) { version = Math.max(version, v || 0); }

  async function leerPrivado(codigo) {
    var s = await sala(codigo, 'privado').once('value');
    var v = s.val();
    if (!v || !v.datos) return null;
    try { return JSON.parse(v.datos); } catch (e) { return null; }
  }

  async function leerVersion(codigo) {
    var s = await sala(codigo, 'state/version').once('value');
    return s.val() || 0;
  }

  function actualizarMeta(cambios) { return ref('meta').update(cambios); }

  /* ------------------------- Sesión en este navegador ------------------------- */

  function guardarSesion(datos) {
    try {
      var d = Object.assign({ uid: st.uid, guardada: Date.now() }, datos);
      root.localStorage.setItem('logisnake.online.' + st.uid, JSON.stringify(d));
      root.localStorage.setItem('logisnake.online.ultimo', JSON.stringify(d));
    } catch (e) { /* sin almacenamiento */ }
  }

  function leerSesion() {
    try { return JSON.parse(root.localStorage.getItem('logisnake.online.' + st.uid) || 'null'); } catch (e) { return null; }
  }

  function ultimaSesion() {
    try {
      var d = JSON.parse(root.localStorage.getItem('logisnake.online.ultimo') || 'null');
      if (d && Date.now() - d.guardada > SEIS_HORAS) return null;
      return d;
    } catch (e) { return null; }
  }

  function borrarSesion() {
    try {
      root.localStorage.removeItem('logisnake.online.' + st.uid);
      var u = ultimaSesion();
      if (u && u.uid === st.uid) root.localStorage.removeItem('logisnake.online.ultimo');
    } catch (e) { /* sin acción */ }
  }

  root.Online = {
    simulador: simulador,
    configurado: configurado,
    iniciar: iniciar,
    cargarScript: cargarScript,
    on: on,
    uid: function () { return st.uid; },
    codigo: function () { return st.codigo; },
    conectado: function () { return st.conectado; },
    ahoraServidor: ahoraServidor,
    normalizarCodigo: normalizarCodigo,
    leerMeta: leerMeta,
    crearSala: crearSala,
    entrarSala: entrarSala,
    salirSala: salirSala,
    ponerMiEquipo: ponerMiEquipo,
    leerPresencia: leerPresencia,
    tomarEquipo: tomarEquipo,
    liberarEquipo: liberarEquipo,
    editarEquipo: editarEquipo,
    asignarEquipo: asignarEquipo,
    enviarAccion: enviarAccion,
    borrarAccion: borrarAccion,
    publicarEstado: publicarEstado,
    ponerVersion: ponerVersion,
    leerPrivado: leerPrivado,
    leerVersion: leerVersion,
    actualizarMeta: actualizarMeta,
    guardarSesion: guardarSesion,
    leerSesion: leerSesion,
    ultimaSesion: ultimaSesion,
    borrarSesion: borrarSesion
  };
})(window);
