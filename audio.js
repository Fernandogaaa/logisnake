/*
 * LOGISNAKE — Sonido con Web Audio API
 * ------------------------------------
 * Todos los efectos y la música se sintetizan en el navegador: no se necesitan archivos.
 * El audio solo arranca después del primer clic del usuario (política de los navegadores).
 *
 * OPCIONAL: para usar archivos propios, colócalos en assets/audio/ y escribe su ruta en
 * ARCHIVOS_AUDIO (por ejemplo  musica: 'assets/audio/musica.mp3'). Los que no se indiquen
 * seguirán sintetizándose. Se dejan vacíos por defecto para no generar errores 404.
 */
(function (root) {
  'use strict';

  var ARCHIVOS_AUDIO = {
    // musica: 'assets/audio/musica.mp3',
    // dado: 'assets/audio/dado.mp3',
    // paso: 'assets/audio/paso.mp3',
    // acierto: 'assets/audio/acierto.mp3',
    // error: 'assets/audio/error.mp3',
    // especial: 'assets/audio/especial.mp3',
    // vida: 'assets/audio/vida.mp3',
    // eliminado: 'assets/audio/eliminado.mp3',
    // tic: 'assets/audio/tic.mp3',
    // victoria: 'assets/audio/victoria.mp3',
    // clic: 'assets/audio/clic.mp3'
  };

  var ctx = null, maestro = null, busMusica = null, busEfectos = null;
  var ajustes = { musica: true, musicaVol: 0.45, efectos: true, efectosVol: 0.75 };
  var archivos = {};      // nombre → HTMLAudioElement listo
  var musicaArchivo = null;

  /* ------------------------------ Contexto ------------------------------ */

  function iniciar() {
    if (ctx) return true;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
    } catch (e) { return false; }
    maestro = ctx.createGain();
    maestro.gain.value = 0.9;
    var compresor = ctx.createDynamicsCompressor();
    maestro.connect(compresor);
    compresor.connect(ctx.destination);
    busMusica = ctx.createGain();
    busEfectos = ctx.createGain();
    busMusica.connect(maestro);
    busEfectos.connect(maestro);
    aplicarVolumenes();
    cargarArchivos();
    return true;
  }

  function cargarArchivos() {
    Object.keys(ARCHIVOS_AUDIO).forEach(function (nombre) {
      var a = new root.Audio();
      a.preload = 'auto';
      a.addEventListener('canplaythrough', function () { archivos[nombre] = a; }, { once: true });
      a.src = ARCHIVOS_AUDIO[nombre];
    });
  }

  /** Debe llamarse dentro de un evento de usuario (clic/tecla). */
  function desbloquear() {
    if (!iniciar()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (ajustes.musica) iniciarMusica();
  }

  function aplicarVolumenes() {
    if (!ctx) return;
    var t = ctx.currentTime;
    busMusica.gain.setTargetAtTime(ajustes.musica ? ajustes.musicaVol * 0.5 : 0, t, 0.08);
    busEfectos.gain.setTargetAtTime(ajustes.efectos ? ajustes.efectosVol : 0, t, 0.03);
    if (musicaArchivo) musicaArchivo.volume = ajustes.musica ? ajustes.musicaVol * 0.6 : 0;
  }

  function configurar(nuevos) {
    Object.keys(nuevos || {}).forEach(function (k) { ajustes[k] = nuevos[k]; });
    aplicarVolumenes();
    if (ctx) {
      if (ajustes.musica) iniciarMusica(); else detenerMusica();
    }
  }

  /* --------------------------- Bloques sonoros --------------------------- */

  function tono(o) {
    var t0 = ctx.currentTime + (o.t || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.tipo || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.fFin) osc.frequency.exponentialRampToValueAtTime(o.fFin, t0 + o.dur);
    if (o.detune) osc.detune.value = o.detune;
    var vol = o.vol == null ? 0.25 : o.vol;
    var ataque = o.ataque || 0.008;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g);
    g.connect(o.destino || busEfectos);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.05);
  }

  var bufferRuido = null;
  function ruido(o) {
    if (!bufferRuido) {
      bufferRuido = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      var d = bufferRuido.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var t0 = o.cuando != null ? o.cuando : ctx.currentTime + (o.t || 0);
    var src = ctx.createBufferSource();
    src.buffer = bufferRuido;
    var filtro = ctx.createBiquadFilter();
    filtro.type = o.filtro || 'bandpass';
    filtro.frequency.value = o.f || 2000;
    filtro.Q.value = o.q || 1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(o.vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(filtro); filtro.connect(g); g.connect(o.destino || busEfectos);
    src.start(t0);
    src.stop(t0 + o.dur + 0.02);
  }

  /* ------------------------------ Efectos ------------------------------ */

  var EFECTOS = {
    clic: function () { tono({ f: 660, fFin: 880, dur: 0.07, tipo: 'triangle', vol: 0.12 }); },
    dado: function () {
      for (var i = 0; i < 7; i++) ruido({ t: i * 0.085, dur: 0.05, f: 1800 + Math.random() * 1500, q: 3, vol: 0.35 });
      tono({ t: 0.62, f: 300, fFin: 180, dur: 0.12, tipo: 'triangle', vol: 0.18 });
    },
    paso: function () {
      tono({ f: 520, fFin: 760, dur: 0.09, tipo: 'sine', vol: 0.2 });
      ruido({ dur: 0.03, f: 3000, q: 2, vol: 0.06 });
    },
    acierto: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tono({ t: i * 0.08, f: f, dur: 0.28, tipo: 'triangle', vol: 0.2 });
        tono({ t: i * 0.08, f: f * 2, dur: 0.18, tipo: 'sine', vol: 0.05 });
      });
    },
    error: function () {
      // Suave: dos notas descendentes, sin estridencia.
      tono({ f: 392, dur: 0.22, tipo: 'triangle', vol: 0.16 });
      tono({ t: 0.18, f: 330, fFin: 300, dur: 0.35, tipo: 'triangle', vol: 0.14 });
    },
    especial: function () {
      [784, 988, 1175, 1568, 1976].forEach(function (f, i) {
        tono({ t: i * 0.05, f: f, dur: 0.25, tipo: 'sine', vol: 0.1 });
      });
    },
    vida: function () {
      tono({ f: 220, fFin: 110, dur: 0.35, tipo: 'sine', vol: 0.3 });
      tono({ t: 0.05, f: 440, fFin: 330, dur: 0.2, tipo: 'triangle', vol: 0.08 });
    },
    eliminado: function () {
      [392, 349.23, 311.13, 261.63].forEach(function (f, i) {
        tono({ t: i * 0.16, f: f, dur: 0.3, tipo: 'triangle', vol: 0.16 });
      });
    },
    tic: function () {
      tono({ f: 1250, dur: 0.05, tipo: 'square', vol: 0.06 });
      ruido({ dur: 0.03, f: 5000, q: 4, vol: 0.08 });
    },
    victoria: function () {
      var notas = [523.25, 523.25, 659.25, 783.99, 659.25, 783.99, 1046.5];
      var tiempos = [0, 0.12, 0.24, 0.36, 0.56, 0.68, 0.84];
      notas.forEach(function (f, i) {
        tono({ t: tiempos[i], f: f, dur: i === notas.length - 1 ? 0.8 : 0.2, tipo: 'square', vol: 0.08 });
        tono({ t: tiempos[i], f: f / 2, dur: i === notas.length - 1 ? 0.8 : 0.2, tipo: 'triangle', vol: 0.14 });
      });
    },
    meta: function () { EFECTOS.especial(); setTimeout(function () { if (ctx) EFECTOS.acierto(); }, 150); }
  };

  function efecto(nombre) {
    if (!ajustes.efectos) return;
    if (archivos[nombre]) {
      try {
        var a = archivos[nombre].cloneNode();
        a.volume = ajustes.efectosVol;
        a.play().catch(function () {});
      } catch (e) { /* sin acción */ }
      return;
    }
    if (!ctx || ctx.state !== 'running' || !EFECTOS[nombre]) return;
    try { EFECTOS[nombre](); } catch (e) { /* sin acción */ }
  }

  /* ------------------------------- Música -------------------------------
   * Lo-fi / synth suave: acordes (pad), bajo y percusión ligera en un bucle de 4 compases.
   * Programador con "mirada adelantada" para que el ritmo no dependa de setTimeout.
   */
  var musica = { activa: false, paso: 0, proximo: 0, temporizador: null, tempo: 88, urgente: false };

  // Progresión: Lam7 – Fa maj7 – Do maj7 – Sol (frecuencias en Hz)
  var ACORDES = [
    [220.00, 261.63, 329.63, 392.00],
    [174.61, 220.00, 261.63, 329.63],
    [130.81, 196.00, 246.94, 329.63],
    [196.00, 246.94, 293.66, 392.00]
  ];
  var BAJOS = [110.00, 87.31, 65.41, 98.00];
  var MELODIA = [ // una nota cada 2 pasos (0 = silencio), por compás
    [659.25, 0, 523.25, 0, 587.33, 0, 0, 0],
    [523.25, 0, 440.00, 0, 0, 0, 392.00, 0],
    [493.88, 0, 523.25, 0, 587.33, 0, 0, 0],
    [587.33, 0, 493.88, 0, 392.00, 0, 0, 0]
  ];

  function programarPaso(paso, t) {
    var compas = Math.floor(paso / 16) % 4;
    var p = paso % 16;
    var negra = 60 / musica.tempo;
    if (p === 0) {
      ACORDES[compas].forEach(function (f, i) {
        tonoEn(t, { f: f, dur: negra * 4 * 0.98, tipo: 'triangle', vol: 0.045, ataque: 0.25, detune: i % 2 ? 6 : -6 });
      });
    }
    if (p === 0 || p === 6 || p === 8 || p === 14) {
      tonoEn(t, { f: BAJOS[compas], dur: negra * (p === 6 || p === 14 ? 0.45 : 0.9), tipo: 'sine', vol: 0.22 });
    }
    if (p % 2 === 0) {
      var nota = MELODIA[compas][p / 2];
      if (nota && (compas % 2 === 0 || musica.urgente)) {
        tonoEn(t, { f: nota, dur: negra * 0.8, tipo: 'sine', vol: 0.05, ataque: 0.02 });
      }
    }
    // Percusión suave
    if (p === 0 || p === 8 || (musica.urgente && p === 12)) {
      tonoEn(t, { f: 120, fFin: 45, dur: 0.18, tipo: 'sine', vol: 0.35 });
    }
    if (p === 4 || p === 12) ruido({ cuando: t, dur: 0.12, f: 1800, q: 0.7, vol: 0.06, destino: busMusica });
    if (p % 2 === 1 || musica.urgente) ruido({ cuando: t, dur: 0.035, f: 8000, filtro: 'highpass', q: 0.5, vol: p % 4 === 2 ? 0.035 : 0.02, destino: busMusica });
  }

  function tonoEn(t, o) {
    o.destino = busMusica;
    o.t = Math.max(0, t - ctx.currentTime);
    tono(o);
  }

  function bucleMusica() {
    if (!musica.activa) return;
    var semicorchea = 60 / musica.tempo / 4;
    while (musica.proximo < ctx.currentTime + 0.15) {
      programarPaso(musica.paso, musica.proximo);
      musica.proximo += semicorchea;
      musica.paso = (musica.paso + 1) % 64;
    }
    musica.temporizador = setTimeout(bucleMusica, 40);
  }

  function iniciarMusica() {
    if (!ctx || musica.activa) return;
    if (ARCHIVOS_AUDIO.musica) {
      if (!musicaArchivo) {
        musicaArchivo = new root.Audio(ARCHIVOS_AUDIO.musica);
        musicaArchivo.loop = true;
      }
      musicaArchivo.volume = ajustes.musicaVol * 0.6;
      musicaArchivo.play().catch(function () {});
      musica.activa = true;
      return;
    }
    musica.activa = true;
    musica.paso = 0;
    musica.proximo = ctx.currentTime + 0.1;
    bucleMusica();
  }

  function detenerMusica() {
    musica.activa = false;
    clearTimeout(musica.temporizador);
    if (musicaArchivo) musicaArchivo.pause();
  }

  /** Ritmo un poco más rápido cuando queda poco tiempo. */
  function urgente(si) {
    if (musica.urgente === !!si) return;
    musica.urgente = !!si;
    musica.tempo = si ? 112 : 88;
    if (musicaArchivo) musicaArchivo.playbackRate = si ? 1.15 : 1;
  }

  root.AudioJuego = {
    desbloquear: desbloquear,
    configurar: configurar,
    efecto: efecto,
    urgente: urgente,
    ajustes: function () { return Object.assign({}, ajustes); }
  };
})(window);
