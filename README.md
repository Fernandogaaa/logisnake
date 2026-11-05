# LOGISNAKE 🐍

**Gestiona, resuelve y llega a la meta.** Juego educativo web de tablero sobre procesos logísticos para estudiantes de Administración Industrial (SENATI).

Está hecho con HTML, CSS y JavaScript puro: no necesita instalar nada, ni internet (salvo las tipografías de Google Fonts; sin conexión se usan fuentes de respaldo).

---

## 1. Cómo abrirlo

- **En la computadora del aula:** abre la carpeta `logisnake` y haz **doble clic en `index.html`**. Se abre en el navegador (recomendado: Chrome o Edge actualizados).
- Para proyectar, pulsa **F11** (pantalla completa).
- El sonido empieza después del primer clic (lo exige el navegador). Puedes apagar la música o los efectos con los botones 🎵 y 🔊 o en **⚙️ Configuración**.

### Atajos de teclado para el docente
| Tecla | Acción |
|---|---|
| `A`–`D` o `1`–`4` | Elegir la alternativa en la pregunta |
| `Enter` | Continuar después del resultado / tirar el dado |
| `Esc` | Cerrar configuración o ventanas de confirmación |

---

## 2. Cómo se juega (resumen)

1. **Jugar** → elige el recorrido: **Integral** (50 casillas, 5 etapas), **Por etapa** (30 casillas de una etapa) o **Personalizado** (30 casillas con preguntas del docente).
2. Elige **Dirigido por el docente** (el multijugador en línea aparece como "Próximamente").
3. Prepara de 2 a 4 equipos (nombre y ficha), sortea el orden y pulsa **¡Comenzar juego!**
4. En su turno, cada equipo **tira el dado** o, si tiene 5 puntos, canjea una **⚡ Pregunta relámpago**.

| Casilla | Acierto | Error |
|---|---|---|
| Normal | +1 punto | −1 vida |
| 🎁 Cofre | Avance (avanzas 3) o Ataque (un rival retrocede 3) | −1 vida |
| ⚠️ Alerta | +1 punto | −1 vida y retrocedes 2 |
| 🔍 Auditoría | +2 puntos | −1 vida |
| ⚡ Relámpago (canje de 5 pts) | Avanzas 3 | Pierdes los 5 puntos (no pierdes vida) |

Gana el primer equipo que llega a la META. Con 0 vidas, el equipo queda eliminado. Si todos quedan eliminados, gana el que tenga más puntos (empate: el más avanzado). Al final se muestra el podio y la sección **"Para repasar"** con las preguntas más falladas.

---

## 3. Cómo editar o reemplazar las preguntas

Las preguntas de los recorridos **Integral** y **Por etapa** están en **`js/preguntas.js`**. Ábrelo con cualquier editor de texto (Bloc de notas, VS Code…). Cada pregunta tiene este formato:

```js
{
  etapa: 2,            // 1 a 5 (ver tabla) o 0 = general (solo relámpago)
  tipo: "alerta",      // "normal" | "cofre" | "alerta" | "auditoria" | "relampago"
  pregunta: "Texto de la pregunta",
  opciones: [
    "Alternativa A",
    "Alternativa B",
    "Alternativa C",
    "Alternativa D"
  ],
  correcta: 2,         // posición de la correcta: 0 = A, 1 = B, 2 = C, 3 = D
  explicacion: "Retroalimentación breve que se muestra después de responder."
},
```

| `etapa` | Nombre |
|---|---|
| 1 | Compras y abastecimiento |
| 2 | Recepción de mercancías |
| 3 | Almacenamiento e inventarios |
| 4 | Preparación y despacho |
| 5 | Transporte y entrega |
| 0 | General (para preguntas relámpago) |

### Reemplazar el banco de ejemplo por el banco oficial del equipo
1. Haz una copia de respaldo de `js/preguntas.js`.
2. Borra las preguntas que hay entre `window.PREGUNTAS = [` y `];` y pega las del banco oficial con el formato de arriba (separadas por comas).
3. Recomendado: por cada etapa, al menos **7 normales, 2 alertas, 2 auditorías y 1 cofre**, y unas **6 relámpago** con `etapa: 0`.
4. Guarda el archivo y recarga la página (F5). Las preguntas mal formadas (sin texto, con menos de 2 alternativas o sin correcta válida) se ignoran automáticamente.

**Cómo elige el juego las preguntas:** busca una pregunta del mismo tipo que la casilla y de su etapa; si no hay, del mismo tipo de cualquier etapa (salvo en "Por etapa", que nunca sale de su tema); si tampoco hay, una normal de esa etapa. No se repiten preguntas en una partida hasta agotar el grupo. Las alternativas se mezclan cada vez.

> Consejo: el orden de las alternativas se mezcla al mostrarse, así que evita alternativas del tipo "Todas las anteriores".

### Recorrido personalizado (editor del docente)
En **Jugar → Recorrido libre o personalizado → ✏️ Editar preguntas** puedes:
- Escribir el **tema del recorrido** y crear, editar o eliminar preguntas (mínimo 4 para jugar).
- **📤 Exportar**: muestra un JSON para copiar y guardar como respaldo.
- **📥 Importar**: pega un JSON exportado (o un arreglo de preguntas con el formato de arriba) para agregar o reemplazar la lista.
- **📚 Cargar preguntas de ejemplo** (tema "Seguridad en el almacén").

Las preguntas del docente se guardan en el navegador (`localStorage`) del equipo donde se crearon. Para usarlas en otra computadora, expórtalas e impórtalas allí.

---

## 4. Publicar en internet (Netlify o GitHub Pages)

### Netlify (lo más fácil)
1. Entra a <https://app.netlify.com/drop>.
2. Arrastra la carpeta **`logisnake`** completa a la página.
3. Netlify te da un enlace público (puedes cambiar el nombre en *Site settings*).

### GitHub Pages
1. Crea un repositorio y sube el contenido de la carpeta `logisnake` (con `index.html` en la raíz).
2. En *Settings → Pages*, elige la rama `main` y la carpeta `/ (root)`.
3. El juego quedará en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

### Agregar a la pantalla de inicio del celular
Abre la versión publicada en Chrome (Android) o Safari (iPhone) → menú → **"Agregar a pantalla de inicio"**. El juego usa `manifest.json` y los íconos de `assets/`.

---

## 5. Sonido propio (opcional)

Todos los sonidos se generan con Web Audio API. Si quieres usar archivos propios, colócalos en `assets/audio/` y escribe sus rutas en el objeto `ARCHIVOS_AUDIO` al inicio de `js/audio.js` (por ejemplo `musica: 'assets/audio/musica.mp3'`). Los que no indiques se seguirán sintetizando.

---

## 6. Estructura del proyecto

```
logisnake/
├── index.html          Pantallas del juego
├── manifest.json       Para "Agregar a pantalla de inicio"
├── css/styles.css      Estilos y temas (Halloween, Navidad, Clásico)
├── js/
│   ├── preguntas.js    Banco de preguntas (editable)
│   ├── game.js         Reglas puras y estado de la partida (dispatch/reducir)
│   ├── audio.js        Efectos y música con Web Audio API
│   ├── board.js        Tablero en zigzag, serpiente SVG y fichas
│   ├── ui.js           Pantallas, modales, marcador, dado, temporizador
│   ├── editor.js       Editor de preguntas del docente
│   └── main.js         Arranque, navegación y control de la partida
└── assets/             Íconos (y audio opcional)
```

### Notas técnicas (fase 2: multijugador)
- Todo el estado de la partida es **un solo objeto JSON** y solo cambia con `reducir(estado, accion)` en `game.js` (función pura).
- El azar (dado, mezcla de alternativas, elección de preguntas) usa una **semilla guardada en el estado**, así que aplicar las mismas acciones da siempre el mismo resultado en cualquier dispositivo.
- En `main.js`, `dispatch(accion)` es el único punto de entrada: en la fase 2 bastará con enviar las acciones o el estado a Firebase Realtime Database y escuchar los cambios.
