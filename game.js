/*
 * LOGISNAKE — Lógica del juego (reglas puras)
 * -------------------------------------------
 * Todo el estado de una partida vive en UN objeto serializable (JSON).
 * La única forma de cambiarlo es con   reducir(estado, accion)  → nuevoEstado,
 * una función pura: no toca el DOM, no usa Math.random (usa una semilla guardada
 * en el propio estado) y no modifica el estado recibido.
 *
 * Fase 2 (multijugador): bastará con sincronizar este objeto (o las acciones)
 * en Firebase; todos los dispositivos aplicarán las mismas acciones y obtendrán
 * exactamente el mismo resultado, porque el azar también está en el estado.
 *
 * Este archivo funciona en el navegador (window.LogiGame) y en Node (require).
 */
(function (root) {
  'use strict';

  /* ---------------------------- Constantes ---------------------------- */

  var ETAPAS = [
    { id: 1, nombre: 'Compras y abastecimiento',     color: '#3D7BF7', icono: '🛒' },
    { id: 2, nombre: 'Recepción de mercancías',      color: '#17B5A5', icono: '📥' },
    { id: 3, nombre: 'Almacenamiento e inventarios', color: '#F28C28', icono: '🏭' },
    { id: 4, nombre: 'Preparación y despacho',       color: '#9B5DE5', icono: '📦' },
    { id: 5, nombre: 'Transporte y entrega',         color: '#E5484D', icono: '🚚' }
  ];

  var EQUIPOS_BASE = [
    { nombre: 'Equipo Azul',    color: '#3D8BFD', icono: '🐍' },
    { nombre: 'Equipo Naranja', color: '#FF8A1F', icono: '🚚' },
    { nombre: 'Equipo Verde',   color: '#2BC46A', icono: '📦' },
    { nombre: 'Equipo Morado',  color: '#A259FF', icono: '🏭' }
  ];

  var ICONOS_FICHA = ['🐍', '🚚', '📦', '🏭', '🛒', '🦺', '⚙️', '🧭', '🚀', '⭐', '🦉', '🎃'];

  var ESPECIALES = {
    50: { cofre: [7, 22, 38], alerta: [4, 15, 27, 44], auditoria: [12, 33, 47] },
    30: { cofre: [6, 19],     alerta: [4, 14, 25],     auditoria: [10, 22, 28] }
  };

  var TIPOS_CASILLA = {
    normal:    { nombre: 'Casilla normal',      icono: '',   acierto: '+1 punto',  error: '−1 vida' },
    cofre:     { nombre: 'Cofre del tesoro',    icono: '🎁', acierto: 'eliges Avance o Ataque estratégico', error: '−1 vida, sin recompensa' },
    alerta:    { nombre: 'Alerta logística',    icono: '⚠️', acierto: '+1 punto',  error: '−1 vida y retrocedes 2' },
    auditoria: { nombre: 'Auditoría sorpresa',  icono: '🔍', acierto: '+2 puntos', error: '−1 vida' },
    relampago: { nombre: 'Pregunta relámpago',  icono: '⚡', acierto: 'avanzas 3 casillas', error: 'pierdes los 5 puntos canjeados (no pierdes vida)' },
    meta:      { nombre: 'META',                icono: '🏆', acierto: '', error: '' }
  };

  var REGLAS = {
    VIDAS_INICIALES: 3,
    COSTO_RELAMPAGO: 5,
    AVANCE_RELAMPAGO: 3,
    AVANCE_COFRE: 3,
    ATAQUE_COFRE: 3,
    RETROCESO_ALERTA: 2
  };

  var TIPOS_PREGUNTA = ['normal', 'cofre', 'alerta', 'auditoria', 'relampago'];

  /* ---------------------------- Utilidades ---------------------------- */

  function clonar(obj) { return JSON.parse(JSON.stringify(obj)); }

  /** Generador pseudoaleatorio (mulberry32). Avanza la semilla guardada en el estado. */
  function azar(estado) {
    var t = (estado.semilla = (estado.semilla + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function enteroAzar(estado, max) { return Math.floor(azar(estado) * max); }

  function mezclar(estado, lista) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = enteroAzar(estado, i + 1);
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* ------------------------- Consultas del tablero ------------------------- */

  /** Tipo de una casilla: 'meta' | 'cofre' | 'alerta' | 'auditoria' | 'normal' (0 = inicio). */
  function tipoCasilla(n, total) {
    if (n <= 0) return 'inicio';
    if (n >= total) return 'meta';
    var esp = ESPECIALES[total] || {};
    if ((esp.cofre || []).indexOf(n) >= 0) return 'cofre';
    if ((esp.alerta || []).indexOf(n) >= 0) return 'alerta';
    if ((esp.auditoria || []).indexOf(n) >= 0) return 'auditoria';
    return 'normal';
  }

  /** Etapa (1–5) a la que pertenece una casilla según la modalidad. 0 = personalizado. */
  function etapaDeCasilla(n, config) {
    if (config.modo === 'personalizado') return 0;
    if (config.modo === 'etapa') return config.etapa;
    var casilla = Math.max(1, Math.min(n, config.totalCasillas));
    return Math.min(5, Math.ceil(casilla / 10));
  }

  function etapaPorId(id) {
    for (var i = 0; i < ETAPAS.length; i++) if (ETAPAS[i].id === id) return ETAPAS[i];
    return null;
  }

  /** Rivales a los que se puede atacar con el cofre. */
  function rivalesValidos(estado, idxEquipo) {
    return estado.equipos
      .map(function (e, i) { return i; })
      .filter(function (i) {
        var e = estado.equipos[i];
        return i !== idxEquipo && !e.eliminado && !e.enMeta && e.pos > 0;
      });
  }

  function equipoDeTurno(estado) { return estado.orden[estado.turnoIdx]; }

  function textoEnJuego(tipo) {
    var t = TIPOS_CASILLA[tipo];
    return 'Acierto: ' + t.acierto + ' · Error: ' + t.error;
  }

  function textoRol(estado, etapa) {
    if (estado.config.modo === 'personalizado') return 'Responde: el integrante de turno';
    var et = etapaPorId(etapa);
    return 'Responde: representante de ' + (et ? et.nombre : 'la etapa');
  }

  /* ----------------------- Normalización del banco ----------------------- */

  /** Valida y limpia un banco de preguntas. Devuelve solo las preguntas válidas, con id. */
  function normalizarBanco(lista) {
    if (!Array.isArray(lista)) return [];
    var salida = [];
    lista.forEach(function (p) {
      var v = validarPregunta(p);
      if (v.ok) {
        var limpia = v.pregunta;
        limpia.id = salida.length;
        salida.push(limpia);
      }
    });
    return salida;
  }

  /** Valida una pregunta. Devuelve { ok, errores, pregunta } (pregunta normalizada). */
  function validarPregunta(p) {
    var errores = [];
    if (!p || typeof p !== 'object') return { ok: false, errores: ['No es un objeto'] };
    var texto = typeof p.pregunta === 'string' ? p.pregunta.trim() : '';
    if (!texto) errores.push('La pregunta está vacía');
    var opciones = Array.isArray(p.opciones) ? p.opciones.slice(0, 4).map(function (o) {
      return typeof o === 'string' ? o.trim() : '';
    }) : [];
    while (opciones.length < 4) opciones.push('');
    var llenas = opciones.filter(function (o) { return o; }).length;
    if (llenas < 2) errores.push('Debe tener al menos 2 alternativas');
    var correcta = Number(p.correcta);
    if (!(correcta >= 0 && correcta <= 3 && Math.floor(correcta) === correcta) || !opciones[correcta]) {
      errores.push('Debe marcar una alternativa correcta que no esté vacía');
    }
    var tipo = TIPOS_PREGUNTA.indexOf(p.tipo) >= 0 ? p.tipo : 'normal';
    var etapa = Number(p.etapa);
    if (!(etapa >= 0 && etapa <= 5)) etapa = 0;
    return {
      ok: errores.length === 0,
      errores: errores,
      pregunta: {
        etapa: Math.floor(etapa),
        tipo: tipo,
        pregunta: texto,
        opciones: opciones,
        correcta: correcta,
        explicacion: typeof p.explicacion === 'string' ? p.explicacion.trim() : ''
      }
    };
  }

  /* ------------------------ Selección de preguntas ------------------------ */

  /**
   * Lista de filtros a probar, en orden, para una casilla de tipo `tipo` y etapa `etapa`.
   * Regla: mismo tipo y etapa → mismo tipo, cualquier etapa (no en modo "por etapa")
   *        → normal de esa etapa → (último recurso) cualquier pregunta permitida.
   */
  function filtrosSeleccion(modo, tipo, etapa) {
    var f = [];
    function de(t, e) {
      return function (p) { return p.tipo === t && (e === '*' || p.etapa === e); };
    }
    if (modo === 'personalizado') {
      f.push(de(tipo, '*'));
      f.push(de('normal', '*'));
      f.push(function () { return true; });
      return f;
    }
    if (tipo === 'relampago') {
      if (modo === 'etapa') {
        // En "por etapa" no se sale del tema: relámpago de la etapa o normal de la etapa.
        f.push(de('relampago', etapa));
        f.push(de('normal', etapa));
        f.push(function (p) { return p.etapa === etapa; });
      } else {
        f.push(de('relampago', '*'));
        f.push(de('normal', etapa));
        f.push(function (p) { return p.tipo === 'normal'; });
      }
      return f;
    }
    f.push(de(tipo, etapa));
    if (modo !== 'etapa') f.push(de(tipo, '*'));
    f.push(de('normal', etapa));
    if (modo === 'etapa') f.push(function (p) { return p.etapa === etapa; });
    else f.push(function (p) { return p.tipo !== 'relampago'; });
    f.push(function () { return true; });
    return f;
  }

  /** Elige una pregunta sin repetir hasta agotar el grupo. Modifica `estado` (ya clonado). */
  function elegirPregunta(estado, tipo, etapa) {
    var filtros = filtrosSeleccion(estado.config.modo, tipo, etapa);
    var grupo = [];
    for (var i = 0; i < filtros.length && grupo.length === 0; i++) {
      grupo = estado.banco.filter(filtros[i]);
    }
    if (grupo.length === 0) return null;
    var disponibles = grupo.filter(function (p) { return estado.usadas.indexOf(p.id) < 0; });
    if (disponibles.length === 0) {
      // Grupo agotado: se reinicia solo ese grupo.
      var ids = grupo.map(function (p) { return p.id; });
      estado.usadas = estado.usadas.filter(function (id) { return ids.indexOf(id) < 0; });
      disponibles = grupo;
    }
    var elegida = disponibles[enteroAzar(estado, disponibles.length)];
    estado.usadas.push(elegida.id);
    return elegida;
  }

  /** Construye el objeto de pregunta en curso (alternativas mezcladas). */
  function prepararPregunta(estado, idxEquipo, tipo, casilla) {
    var etapa = tipo === 'relampago'
      ? etapaDeCasilla(Math.max(1, estado.equipos[idxEquipo].pos), estado.config)
      : etapaDeCasilla(casilla, estado.config);
    var p = elegirPregunta(estado, tipo, etapa);
    if (!p) return null;
    var opciones = [];
    p.opciones.forEach(function (texto, i) { if (texto) opciones.push({ texto: texto, original: i }); });
    opciones = mezclar(estado, opciones);
    var correcta = 0;
    opciones.forEach(function (o, i) { if (o.original === p.correcta) correcta = i; });
    return {
      id: p.id,
      texto: p.pregunta,
      opciones: opciones,
      correcta: correcta,
      explicacion: p.explicacion,
      tipo: tipo,
      casilla: casilla,
      etapa: etapa,
      equipo: idxEquipo,
      rol: textoRol(estado, etapa),
      enJuego: textoEnJuego(tipo)
    };
  }

  /* --------------------------- Estado inicial --------------------------- */

  /**
   * config: { modo:'integral'|'etapa'|'personalizado', etapa?:1–5, tema?:string,
   *           tiempo:segundos|0, equipos:[{nombre,color,icono}], orden?:[índices],
   *           banco:[preguntas], semilla?:número }
   */
  function crearEstadoInicial(cfg) {
    var modo = cfg.modo || 'integral';
    var total = modo === 'integral' ? 50 : 30;
    var equipos = (cfg.equipos || []).slice(0, 4).map(function (e, i) {
      return {
        nombre: (e.nombre || EQUIPOS_BASE[i].nombre).toString().slice(0, 24),
        color: e.color || EQUIPOS_BASE[i].color,
        icono: e.icono || EQUIPOS_BASE[i].icono,
        pos: 0,
        puntos: 0,
        vidas: REGLAS.VIDAS_INICIALES,
        eliminado: false,
        enMeta: false,
        aciertos: 0,
        respondidas: 0
      };
    });
    var orden = Array.isArray(cfg.orden) && cfg.orden.length === equipos.length
      ? cfg.orden.slice()
      : equipos.map(function (e, i) { return i; });
    return {
      version: 1,
      config: {
        modo: modo,
        etapa: modo === 'etapa' ? (cfg.etapa || 1) : null,
        tema: cfg.tema || '',
        totalCasillas: total,
        tiempo: typeof cfg.tiempo === 'number' ? cfg.tiempo : 30
      },
      semilla: (cfg.semilla >>> 0) || 12345,
      banco: normalizarBanco(cfg.banco),
      usadas: [],
      historial: {},          // id de pregunta → { n: veces respondida, f: veces fallada }
      equipos: equipos,
      orden: orden,
      turnoIdx: 0,
      ronda: 1,
      fase: 'turno',          // 'turno' | 'pregunta' | 'resultado' | 'fin'
      dado: null,
      preguntaActual: null,
      resultado: null,
      fin: null,
      eventos: [],            // eventos de la última acción (para animar la interfaz)
      seq: 0                  // contador de acciones aplicadas
    };
  }

  /* ----------------------------- Efectos ----------------------------- */

  function perderVida(estado, idx, eventos, mensajes) {
    var e = estado.equipos[idx];
    if (e.vidas <= 0) return;
    e.vidas -= 1;
    eventos.push({ tipo: 'vida', equipo: idx, vidas: e.vidas });
    mensajes.push('−1 vida');
    if (e.vidas === 0) {
      e.eliminado = true;
      eventos.push({ tipo: 'eliminado', equipo: idx });
      mensajes.push(e.nombre + ' se quedó sin vidas y queda eliminado.');
    }
  }

  function sumarPuntos(estado, idx, n, eventos, mensajes) {
    estado.equipos[idx].puntos += n;
    eventos.push({ tipo: 'puntos', equipo: idx, delta: n });
    if (mensajes) mensajes.push('+' + n + (n === 1 ? ' punto' : ' puntos'));
  }

  /** Mueve una ficha (sin activar la casilla de llegada). Devuelve true si llegó a la META. */
  function moverFicha(estado, idx, pasos, eventos) {
    var e = estado.equipos[idx];
    var total = estado.config.totalCasillas;
    var desde = e.pos;
    var hasta = Math.max(0, Math.min(total, desde + pasos));
    e.pos = hasta;
    if (hasta !== desde) eventos.push({ tipo: 'mover', equipo: idx, desde: desde, hasta: hasta });
    if (hasta >= total) {
      e.enMeta = true;
      eventos.push({ tipo: 'meta', equipo: idx });
      return true;
    }
    return false;
  }

  /** Clasificación final (índices de equipos, del 1.er al último puesto). */
  function clasificar(estado, ganador) {
    var idxs = estado.equipos.map(function (e, i) { return i; });
    idxs.sort(function (a, b) {
      if (a === ganador) return -1;
      if (b === ganador) return 1;
      var A = estado.equipos[a], B = estado.equipos[b];
      if (A.eliminado !== B.eliminado) return A.eliminado ? 1 : -1;
      if (A.eliminado) {
        if (B.puntos !== A.puntos) return B.puntos - A.puntos;
        return B.pos - A.pos;
      }
      if (B.pos !== A.pos) return B.pos - A.pos;
      return B.puntos - A.puntos;
    });
    return idxs;
  }

  /** Si la partida terminó, prepara estado.fin y devuelve true. */
  function revisarFin(estado, eventos) {
    var enMeta = -1;
    estado.equipos.forEach(function (e, i) { if (e.enMeta && enMeta < 0) enMeta = i; });
    var vivos = estado.equipos.filter(function (e) { return !e.eliminado; }).length;
    if (enMeta < 0 && vivos > 0) return false;
    var ganador = enMeta;
    var motivo = 'meta';
    if (ganador < 0) {
      // Todos eliminados: gana el de más puntos; empate → el más avanzado.
      motivo = 'eliminados';
      ganador = 0;
      estado.equipos.forEach(function (e, i) {
        var g = estado.equipos[ganador];
        if (e.puntos > g.puntos || (e.puntos === g.puntos && e.pos > g.pos)) ganador = i;
      });
    }
    estado.fase = 'fin';
    estado.fin = { ganador: ganador, motivo: motivo, clasificacion: clasificar(estado, ganador) };
    eventos.push({ tipo: 'fin', ganador: ganador, motivo: motivo });
    return true;
  }

  /** Pasa el turno al siguiente equipo no eliminado. */
  function siguienteTurno(estado) {
    var n = estado.orden.length;
    for (var k = 1; k <= n; k++) {
      var ti = (estado.turnoIdx + k) % n;
      if (!estado.equipos[estado.orden[ti]].eliminado) {
        if (ti <= estado.turnoIdx) estado.ronda += 1;
        estado.turnoIdx = ti;
        break;
      }
    }
    estado.fase = 'turno';
    estado.dado = null;
    estado.preguntaActual = null;
    estado.resultado = null;
  }

  /* ----------------------------- Reductor ----------------------------- */

  /**
   * Aplica una acción y devuelve el NUEVO estado (o el mismo objeto si la acción no es válida).
   * Acciones:
   *   { tipo:'INICIAR', config:{...} }
   *   { tipo:'TIRAR_DADO' }
   *   { tipo:'CANJEAR_RELAMPAGO' }
   *   { tipo:'RESPONDER', opcion: índice | -1 (tiempo agotado) }
   *   { tipo:'COFRE_AVANCE' }
   *   { tipo:'COFRE_ATAQUE', rival: índice }
   *   { tipo:'CONTINUAR' }
   *   { tipo:'SALTAR_TURNO' }        (solo modo en línea)
   */
  function reducir(estadoPrevio, accion) {
    if (!accion || !accion.tipo) return estadoPrevio;

    if (accion.tipo === 'INICIAR') {
      var ini = crearEstadoInicial(accion.config || {});
      ini.eventos = [{ tipo: 'inicio' }];
      return ini;
    }
    if (!estadoPrevio) return estadoPrevio;

    var prev = estadoPrevio;
    var turno = equipoDeTurno(prev);

    // ---- Validaciones (sin tocar el estado) ----
    switch (accion.tipo) {
      case 'TIRAR_DADO':
        if (prev.fase !== 'turno') return prev;
        break;
      case 'CANJEAR_RELAMPAGO':
        if (prev.fase !== 'turno' || prev.equipos[turno].puntos < REGLAS.COSTO_RELAMPAGO) return prev;
        break;
      case 'RESPONDER':
        if (prev.fase !== 'pregunta' || !prev.preguntaActual) return prev;
        break;
      case 'COFRE_AVANCE':
        if (prev.fase !== 'resultado' || !prev.resultado || !prev.resultado.pendienteCofre) return prev;
        break;
      case 'COFRE_ATAQUE':
        if (prev.fase !== 'resultado' || !prev.resultado || !prev.resultado.pendienteCofre) return prev;
        if (rivalesValidos(prev, turno).indexOf(accion.rival) < 0) return prev;
        break;
      case 'CONTINUAR':
        if (prev.fase !== 'resultado' || (prev.resultado && prev.resultado.pendienteCofre)) return prev;
        break;
      case 'SALTAR_TURNO':
        // Modo en línea: el anfitrión salta el turno de un equipo sin dispositivo conectado.
        if (prev.fase !== 'turno') return prev;
        break;
      default:
        return prev;
    }

    var estado = clonar(prev);
    var eventos = [];
    estado.seq += 1;
    var eq = estado.equipos[turno];

    switch (accion.tipo) {
      case 'TIRAR_DADO': {
        var valor = 1 + enteroAzar(estado, 6);
        estado.dado = valor;
        eventos.push({ tipo: 'dado', valor: valor, equipo: turno });
        var llego = moverFicha(estado, turno, valor, eventos);
        if (llego) {
          revisarFin(estado, eventos);
          break;
        }
        var tipo = tipoCasilla(eq.pos, estado.config.totalCasillas);
        var preg = prepararPregunta(estado, turno, tipo, eq.pos);
        if (!preg) {
          // Sin preguntas disponibles (banco vacío): se pasa el turno.
          estado.fase = 'resultado';
          estado.resultado = { sinPregunta: true, mensajes: ['No hay preguntas disponibles para esta casilla.'], equipo: turno };
          break;
        }
        estado.preguntaActual = preg;
        estado.fase = 'pregunta';
        break;
      }

      case 'CANJEAR_RELAMPAGO': {
        eq.puntos -= REGLAS.COSTO_RELAMPAGO;
        eventos.push({ tipo: 'puntos', equipo: turno, delta: -REGLAS.COSTO_RELAMPAGO });
        var pr = prepararPregunta(estado, turno, 'relampago', eq.pos);
        if (!pr) {
          eq.puntos += REGLAS.COSTO_RELAMPAGO; // se devuelve el canje si no hay preguntas
          return prev;
        }
        estado.preguntaActual = pr;
        estado.fase = 'pregunta';
        eventos.push({ tipo: 'relampago', equipo: turno });
        break;
      }

      case 'RESPONDER': {
        var p = estado.preguntaActual;
        var opcion = typeof accion.opcion === 'number' ? accion.opcion : -1;
        var correcto = opcion === p.correcta;
        var mensajes = [];
        eq.respondidas += 1;
        if (correcto) eq.aciertos += 1;
        var h = estado.historial[p.id] || { n: 0, f: 0 };
        h.n += 1;
        if (!correcto) h.f += 1;
        estado.historial[p.id] = h;

        var pendienteCofre = false;
        var llegoMeta = false;
        switch (p.tipo) {
          case 'normal':
            if (correcto) sumarPuntos(estado, turno, 1, eventos, mensajes);
            else perderVida(estado, turno, eventos, mensajes);
            break;
          case 'auditoria':
            if (correcto) sumarPuntos(estado, turno, 2, eventos, mensajes);
            else perderVida(estado, turno, eventos, mensajes);
            break;
          case 'alerta':
            if (correcto) sumarPuntos(estado, turno, 1, eventos, mensajes);
            else {
              perderVida(estado, turno, eventos, mensajes);
              moverFicha(estado, turno, -REGLAS.RETROCESO_ALERTA, eventos);
              mensajes.push('Retrocedes ' + REGLAS.RETROCESO_ALERTA + ' casillas');
            }
            break;
          case 'cofre':
            if (correcto) {
              pendienteCofre = true;
              mensajes.push('¡Abriste el cofre! Elige tu recompensa.');
            } else {
              perderVida(estado, turno, eventos, mensajes);
              mensajes.push('El cofre se queda cerrado.');
            }
            break;
          case 'relampago':
            if (correcto) {
              llegoMeta = moverFicha(estado, turno, REGLAS.AVANCE_RELAMPAGO, eventos);
              mensajes.push('Avanzas ' + REGLAS.AVANCE_RELAMPAGO + ' casillas');
            } else {
              mensajes.push('Pierdes los ' + REGLAS.COSTO_RELAMPAGO + ' puntos canjeados (conservas tus vidas)');
            }
            break;
        }
        if (llegoMeta) mensajes.push('¡' + eq.nombre + ' llegó a la META!');

        estado.fase = 'resultado';
        estado.resultado = {
          equipo: turno,
          correcto: correcto,
          tiempoAgotado: opcion === -1,
          opcion: opcion,
          tipo: p.tipo,
          correctaTexto: p.opciones[p.correcta].texto,
          explicacion: p.explicacion,
          mensajes: mensajes,
          pendienteCofre: pendienteCofre,
          rivales: pendienteCofre ? rivalesValidos(estado, turno) : []
        };
        eventos.push({ tipo: 'respuesta', equipo: turno, correcto: correcto });
        break;
      }

      case 'COFRE_AVANCE': {
        var llegoC = moverFicha(estado, turno, REGLAS.AVANCE_COFRE, eventos);
        estado.resultado.pendienteCofre = false;
        estado.resultado.cofre = { accion: 'avance', llegoMeta: llegoC };
        estado.resultado.mensajes.push('Avance estratégico: avanzas ' + REGLAS.AVANCE_COFRE + ' casillas');
        break;
      }

      case 'COFRE_ATAQUE': {
        var rival = estado.equipos[accion.rival];
        moverFicha(estado, accion.rival, -REGLAS.ATAQUE_COFRE, eventos);
        estado.resultado.pendienteCofre = false;
        estado.resultado.cofre = { accion: 'ataque', rival: accion.rival };
        estado.resultado.mensajes.push('Ataque estratégico: ' + rival.nombre + ' retrocede ' + REGLAS.ATAQUE_COFRE + ' casillas');
        eventos.push({ tipo: 'ataque', equipo: turno, rival: accion.rival });
        break;
      }

      case 'SALTAR_TURNO': {
        eventos.push({ tipo: 'saltado', equipo: turno });
        siguienteTurno(estado);
        eventos.push({ tipo: 'turno', equipo: equipoDeTurno(estado) });
        break;
      }

      case 'CONTINUAR': {
        if (!revisarFin(estado, eventos)) {
          siguienteTurno(estado);
          eventos.push({ tipo: 'turno', equipo: equipoDeTurno(estado) });
        }
        break;
      }
    }

    estado.eventos = eventos;
    return estado;
  }

  /** Preguntas más falladas de la partida (para la sección "Para repasar"). */
  function preguntasParaRepasar(estado, max) {
    var lista = [];
    Object.keys(estado.historial).forEach(function (id) {
      var h = estado.historial[id];
      if (h.f > 0) {
        var p = estado.banco[Number(id)];
        if (p) lista.push({ pregunta: p, fallos: h.f, intentos: h.n });
      }
    });
    lista.sort(function (a, b) { return b.fallos - a.fallos || b.intentos - a.intentos; });
    return lista.slice(0, max || 6);
  }

  /* ----------------------------- Exportar ----------------------------- */

  var api = {
    ETAPAS: ETAPAS,
    EQUIPOS_BASE: EQUIPOS_BASE,
    ICONOS_FICHA: ICONOS_FICHA,
    ESPECIALES: ESPECIALES,
    TIPOS_CASILLA: TIPOS_CASILLA,
    TIPOS_PREGUNTA: TIPOS_PREGUNTA,
    REGLAS: REGLAS,
    tipoCasilla: tipoCasilla,
    etapaDeCasilla: etapaDeCasilla,
    etapaPorId: etapaPorId,
    rivalesValidos: rivalesValidos,
    equipoDeTurno: equipoDeTurno,
    validarPregunta: validarPregunta,
    normalizarBanco: normalizarBanco,
    crearEstadoInicial: crearEstadoInicial,
    reducir: reducir,
    preguntasParaRepasar: preguntasParaRepasar
  };

  root.LogiGame = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
