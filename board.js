/*
 * LOGISNAKE — Tablero
 * -------------------
 * Dibuja la cuadrícula en zigzag, el cuerpo de la serpiente (SVG), la zona INICIO
 * y las fichas. Las fichas tienen una "posición visible" propia que se anima casilla
 * por casilla; luego se sincroniza con el estado del juego.
 */
(function (root) {
  'use strict';

  var G = root.LogiGame;
  var el = {};            // referencias al DOM
  var estado = null;      // último estado recibido
  var cols = 10, filas = 5, total = 50;
  var celda = 60;         // tamaño de celda en px (calculado)
  var posVis = [];        // posición visible de cada ficha
  var observador = null;

  function reducido() {
    return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* --------------------------- Geometría --------------------------- */

  /** Columna y fila (desde arriba) de la casilla n (1..total). Zigzag desde abajo a la izquierda. */
  function ubicacion(n) {
    var i = n - 1;
    var filaDesdeAbajo = Math.floor(i / cols);
    var c = i % cols;
    if (filaDesdeAbajo % 2 === 1) c = cols - 1 - c;
    return { col: c, fila: filas - 1 - filaDesdeAbajo };
  }

  function centroSVG(n) {
    var u = ubicacion(n);
    return { x: u.col * 100 + 50, y: u.fila * 100 + 50 };
  }

  function columnasSegunPantalla() {
    return root.innerWidth < 700 ? 5 : 10;
  }

  /* ---------------------------- Montaje ---------------------------- */

  function montar(contenedor, est) {
    el.contenedor = contenedor;
    estado = est;
    total = est.config.totalCasillas;
    posVis = est.equipos.map(function (e) { return e.pos; });
    contenedor.innerHTML =
      '<div class="tablero-wrap">' +
      '  <div class="tablero" role="img" aria-label="Tablero de ' + total + ' casillas"></div>' +
      '  <div class="inicio-zona"><span class="inicio-etiqueta">INICIO</span></div>' +
      '  <div class="capa-fichas" aria-hidden="true"></div>' +
      '</div>';
    el.wrap = contenedor.querySelector('.tablero-wrap');
    el.tablero = contenedor.querySelector('.tablero');
    el.inicio = contenedor.querySelector('.inicio-zona');
    el.fichas = contenedor.querySelector('.capa-fichas');
    construir();
    crearFichas();
    colocarFichas(true);
    if (observador) observador.disconnect();
    if (root.ResizeObserver) {
      observador = new ResizeObserver(function () { redimensionar(); });
      observador.observe(contenedor);
    }
  }

  function construir() {
    cols = columnasSegunPantalla();
    filas = Math.ceil(total / cols);
    calcularTamano();
    var html = '';
    // Cuerpo de la serpiente (por detrás de las casillas)
    html += '<svg class="serpiente" viewBox="0 0 ' + cols * 100 + ' ' + filas * 100 + '" preserveAspectRatio="none" aria-hidden="true">' +
      cuerpoSerpiente() + '</svg>';
    for (var n = 1; n <= total; n++) html += casillaHTML(n);
    html += cabezaSerpiente();
    el.tablero.innerHTML = html;
  }

  function calcularTamano() {
    var ancho = el.contenedor.clientWidth || 600;
    var alto = Infinity;
    if (root.innerWidth >= 700) {
      // En pantallas anchas el tablero debe caber sin scroll vertical.
      var arriba = el.contenedor.getBoundingClientRect().top + (root.scrollY || 0);
      alto = Math.max(220, root.innerHeight - Math.max(arriba, 90) - 70);
    }
    celda = Math.floor(Math.min(ancho / cols, alto / filas));
    celda = Math.max(40, Math.min(celda, 120));
    el.tablero.style.width = celda * cols + 'px';
    el.tablero.style.height = celda * filas + 'px';
    el.wrap.style.width = celda * cols + 'px';
    el.wrap.style.setProperty('--celda', celda + 'px');
  }

  function cuerpoSerpiente() {
    var puntos = [];
    for (var n = 1; n < total; n++) puntos.push(centroSVG(n));
    // La cola empieza un poco antes de la casilla 1
    var p1 = puntos[0];
    var d = 'M ' + (p1.x - 45) + ' ' + (p1.y + 20) + ' Q ' + (p1.x - 25) + ' ' + (p1.y + 25) + ' ' + p1.x + ' ' + p1.y;
    for (var i = 1; i < puntos.length; i++) {
      var a = puntos[i - 1], b = puntos[i];
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var signo = i % 2 ? 1 : -1;
      var off = 16 * signo;
      d += ' Q ' + (mx - dy / len * off).toFixed(1) + ' ' + (my + dx / len * off).toFixed(1) + ' ' + b.x + ' ' + b.y;
    }
    // Último tramo hacia la cabeza (entre la penúltima casilla y la META)
    var ult = puntos[puntos.length - 1], meta = centroSVG(total);
    d += ' L ' + ((ult.x + meta.x) / 2).toFixed(1) + ' ' + ((ult.y + meta.y) / 2).toFixed(1);
    return '<path d="' + d + '" class="serp-borde"/>' +
      '<path d="' + d + '" class="serp-cuerpo"/>' +
      '<path d="' + d + '" class="serp-escamas"/>' +
      '<path d="' + d + '" class="serp-brillo"/>';
  }

  function cabezaSerpiente() {
    var ult = centroSVG(total - 1), meta = centroSVG(total);
    var x = (ult.x + meta.x) / 2, y = (ult.y + meta.y) / 2;
    var ang = Math.atan2(meta.y - ult.y, meta.x - ult.x) * 180 / Math.PI;
    var izq = x / (cols * 100) * 100, arr = y / (filas * 100) * 100;
    return '<div class="cabeza-serpiente" style="left:' + izq + '%;top:' + arr + '%">' +
      '<svg viewBox="-50 -50 100 100" style="transform:rotate(' + ang + 'deg)" aria-hidden="true">' +
      '<ellipse cx="4" cy="0" rx="34" ry="26" fill="#1E7A35"/>' +
      '<ellipse cx="4" cy="0" rx="30" ry="22" fill="#4CD964"/>' +
      '<ellipse cx="10" cy="6" rx="18" ry="10" fill="#9BF59B" opacity=".6"/>' +
      '<path d="M34 0 l14 -5 m-14 5 l14 5" stroke="#E5484D" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="14" cy="-12" r="9" fill="#fff"/><circle cx="14" cy="12" r="9" fill="#fff"/>' +
      '<circle cx="17" cy="-12" r="4.5" fill="#1b1b2f"/><circle cx="17" cy="12" r="4.5" fill="#1b1b2f"/>' +
      '<circle cx="18.5" cy="-13.5" r="1.6" fill="#fff"/><circle cx="18.5" cy="10.5" r="1.6" fill="#fff"/>' +
      '</svg></div>';
  }

  function casillaHTML(n) {
    var u = ubicacion(n);
    var tipo = G.tipoCasilla(n, total);
    var etapa = G.etapaDeCasilla(n, estado.config);
    var et = G.etapaPorId(etapa);
    var color = et ? et.color : '#7B5CD6';
    var info = G.TIPOS_CASILLA[tipo] || {};
    var inicioEtapa = estado.config.modo === 'integral' && (n - 1) % 10 === 0 && tipo === 'normal';
    var icono = tipo === 'meta' ? '🏆' : (info.icono || (inicioEtapa ? et.icono : ''));
    var titulo = 'Casilla ' + n + (tipo !== 'normal' ? ' · ' + info.nombre : '') + (et ? ' · ' + et.nombre : '');
    return '<div class="casilla casilla-' + tipo + (inicioEtapa ? ' casilla-inicio-etapa' : '') + '" data-n="' + n + '" title="' + titulo + '" ' +
      'style="left:' + (u.col * 100 / cols) + '%;top:' + (u.fila * 100 / filas) + '%;width:' + (100 / cols) + '%;height:' + (100 / filas) + '%;--etapa:' + color + '">' +
      '<div class="casilla-cara">' +
      (tipo === 'meta' ? '<span class="casilla-meta-txt">META</span>' : '<span class="casilla-num">' + n + '</span>') +
      (icono ? '<span class="casilla-icono">' + icono + '</span>' : '') +
      '</div></div>';
  }

  /* ----------------------------- Fichas ----------------------------- */

  function crearFichas() {
    el.fichas.innerHTML = estado.equipos.map(function (e, i) {
      return '<div class="ficha" data-equipo="' + i + '" style="--color:' + e.color + '"><span>' + e.icono + '</span></div>';
    }).join('');
  }

  /** Coordenadas (px, relativas al wrap) del centro de la casilla n. */
  function centroPx(n) {
    if (n <= 0) return null;
    var u = ubicacion(Math.min(n, total));
    return { x: u.col * celda + celda / 2, y: u.fila * celda + celda / 2 };
  }

  function colocarFichas(sinAnimar) {
    if (!el.fichas) return;
    var tam = Math.max(22, Math.round(celda * 0.44));
    el.wrap.style.setProperty('--ficha', tam + 'px');
    // Agrupar fichas por casilla visible para que no se tapen
    var grupos = {};
    posVis.forEach(function (p, i) { (grupos[p] = grupos[p] || []).push(i); });
    var inicioTop = el.inicio.offsetTop, inicioLeft = el.inicio.offsetLeft;
    var inicioAlto = el.inicio.offsetHeight, inicioAncho = el.inicio.offsetWidth;
    var fichasEls = el.fichas.querySelectorAll('.ficha');
    Object.keys(grupos).forEach(function (p) {
      var idxs = grupos[p];
      var m = idxs.length;
      idxs.forEach(function (eqIdx, k) {
        var x, y;
        if (Number(p) <= 0) {
          var paso = Math.min(tam + 10, (inicioAncho - 120) / Math.max(m, 1));
          x = inicioLeft + 110 + paso * k + tam / 2;
          y = inicioTop + inicioAlto / 2;
        } else {
          var c = centroPx(Number(p));
          var off = m > 1 ? celda * 0.2 : 0;
          var dx = [-1, 1, -1, 1][k] * off, dy = [-1, -1, 1, 1][k] * off;
          if (m === 2) dy = 0;
          x = c.x + dx; y = c.y + dy;
        }
        var f = fichasEls[eqIdx];
        if (!f) return;
        if (sinAnimar) f.classList.add('sin-transicion');
        f.style.transform = 'translate(' + (x - tam / 2) + 'px,' + (y - tam / 2) + 'px)';
        if (sinAnimar) { void f.offsetWidth; f.classList.remove('sin-transicion'); }
      });
    });
    actualizarClases();
  }

  function actualizarClases() {
    if (!estado || !el.fichas) return;
    var turno = estado.fase !== 'fin' ? G.equipoDeTurno(estado) : -1;
    el.fichas.querySelectorAll('.ficha').forEach(function (f, i) {
      var e = estado.equipos[i];
      f.classList.toggle('eliminada', !!e.eliminado);
      f.classList.toggle('activa', i === turno && !e.eliminado);
    });
    el.tablero.querySelectorAll('.casilla.resaltada').forEach(function (c) { c.classList.remove('resaltada'); });
    if (turno >= 0 && posVis[turno] > 0) {
      var c = el.tablero.querySelector('.casilla[data-n="' + posVis[turno] + '"]');
      if (c) c.classList.add('resaltada');
    }
  }

  /** Anima una ficha casilla por casilla (≈200 ms por paso). */
  async function animarMovimiento(eqIdx, desde, hasta) {
    var paso = hasta > desde ? 1 : -1;
    posVis[eqIdx] = desde;
    if (reducido()) {
      posVis[eqIdx] = hasta;
      colocarFichas(false);
      root.AudioJuego.efecto('paso');
      await esperar(150);
      return;
    }
    var f = el.fichas.querySelector('.ficha[data-equipo="' + eqIdx + '"]');
    for (var p = desde + paso; paso > 0 ? p <= hasta : p >= hasta; p += paso) {
      posVis[eqIdx] = p;
      colocarFichas(false);
      if (f) { f.classList.remove('salto'); void f.offsetWidth; f.classList.add('salto'); }
      root.AudioJuego.efecto('paso');
      await esperar(200);
    }
    if (f) f.classList.remove('salto');
  }

  /** Actualiza el estado de referencia; si `posiciones` es true, iguala las posiciones visibles. */
  function sincronizar(est, posiciones) {
    estado = est;
    if (posiciones) posVis = est.equipos.map(function (e) { return e.pos; });
    colocarFichas(true);
  }

  function redimensionar() {
    if (!el.tablero || !estado || !el.contenedor.offsetParent) return;
    var nuevasCols = columnasSegunPantalla();
    if (nuevasCols !== cols) construir();
    else calcularTamano();
    colocarFichas(true);
  }

  function desmontar() {
    if (observador) observador.disconnect();
    observador = null;
    estado = null;
    el = {};
  }

  root.Tablero = {
    montar: montar,
    animarMovimiento: animarMovimiento,
    sincronizar: sincronizar,
    redimensionar: redimensionar,
    desmontar: desmontar
  };
})(window);
