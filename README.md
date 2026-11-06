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

Las preguntas de los recorridos **Integral** y **Por etapa** están en **`preguntas.js`**. Ábrelo con cualquier editor de texto (Bloc de notas, VS Code…). Cada pregunta tiene este formato:

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
1. Haz una copia de respaldo de `preguntas.js`.
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

Todos los sonidos se generan con Web Audio API. Si quieres usar archivos propios, colócalos en `assets/audio/` y escribe sus rutas en el objeto `ARCHIVOS_AUDIO` al inicio de `audio.js` (por ejemplo `musica: 'assets/audio/musica.mp3'`). Los que no indiques se seguirán sintetizando.

---

## 6. Activar el modo en línea

El modo **Multijugador en línea** permite que cada equipo juegue desde su celular mientras el docente proyecta el tablero. Usa **Firebase** (de Google), que es **gratis** con el plan Spark. Solo hay que configurarlo **una vez**. Mientras no lo configures, el modo docente funciona igual que siempre y la tarjeta en línea dice "Configura Firebase para activar este modo".

### Paso 1 · Crear el proyecto
1. Entra a <https://console.firebase.google.com> con tu cuenta de Google.
2. Pulsa **Crear un proyecto** (o "Agregar proyecto"). Ponle un nombre, por ejemplo `logisnake`.
3. Puedes desactivar Google Analytics (no se necesita) y pulsa **Crear proyecto**. Queda en el plan gratuito **Spark**.

### Paso 2 · Activar el inicio de sesión anónimo
1. En el menú de la izquierda: **Compilación (Build) → Authentication → Comenzar**.
2. Pestaña **Método de acceso (Sign-in method)** → elige **Anónimo** → **Habilitar** → **Guardar**.

### Paso 3 · Crear la base de datos y pegar las reglas
1. Menú: **Compilación → Realtime Database → Crear base de datos**.
2. Elige la ubicación (por ejemplo, *Estados Unidos*) → **Siguiente**.
3. Elige **Comenzar en modo bloqueado** → **Habilitar**.
4. Abre la pestaña **Reglas**, borra todo lo que hay y **pega el contenido completo del archivo `database.rules.json`** de este proyecto. Pulsa **Publicar**.

### Paso 4 · Registrar la app web y copiar la configuración
1. Ve a ⚙️ **Configuración del proyecto** (rueda junto a "Descripción general").
2. En **Tus apps**, pulsa el ícono **`</>`** (Web). Escribe un apodo (por ejemplo `logisnake-web`). **No** marques Firebase Hosting. Pulsa **Registrar app**.
3. Firebase muestra un bloque `const firebaseConfig = { ... }`. Copia cada valor y pégalo en **`firebase-config.js`**, entre las comillas que correspondan:
   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "AIza...",
     authDomain: "logisnake-xxxx.firebaseapp.com",
     databaseURL: "https://logisnake-xxxx-default-rtdb.firebaseio.com",
     projectId: "logisnake-xxxx",
     storageBucket: "logisnake-xxxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```
4. **Importante:** si en el bloque no aparece `databaseURL`, cópialo desde **Realtime Database** (es la dirección que aparece arriba de los datos y termina en `firebaseio.com` o `firebasedatabase.app`).

> Estos datos no son una contraseña: son públicos y van dentro de la página. La seguridad la dan las reglas del paso 3.

### Paso 5 · Publicar y autorizar tu dominio
1. Sube los archivos (incluido `firebase-config.js` ya rellenado) a GitHub Pages o Netlify, como en la sección 4.
2. En Firebase: **Authentication → Configuración (Settings) → Dominios autorizados → Agregar dominio**, y agrega el dominio de tu sitio **sin** `https://` ni rutas. Por ejemplo:
   - GitHub Pages: `tu-usuario.github.io`
   - Netlify: `tu-sitio.netlify.app`

### Paso 6 · Probarlo
1. En la computadora del aula (o tu PC): **Jugar → elige recorrido → Multijugador en línea → Crear sala**. Aparece un **código de 5 caracteres** y un **QR**.
2. En otro dispositivo (un celular, u otra ventana de **incógnito**): abre el juego → **📱 Unirse a una sala** (o escanea el QR) → escribe el código → **Unirme** a un equipo.
3. Cuando cada equipo tenga su dispositivo, el anfitrión pulsa **¡Comenzar juego!** (o "Comenzar de todos modos": los equipos sin dispositivo los controla el anfitrión).

### Cómo funciona una partida en línea
- El **anfitrión** (docente) proyecta el tablero completo con el código de sala en la esquina. Es el único que aplica las reglas y no ve la respuesta correcta antes de tiempo.
- Cada **celular** muestra su equipo y la posición de todos. En su turno aparecen los botones **Tirar dado** y **Pregunta relámpago**, la pregunta con las alternativas, el resultado y la elección del cofre. Cuando no es su turno, ve la pregunta del otro equipo en modo solo lectura.
- El reloj es el mismo en todos los dispositivos. Si una respuesta llega después del tiempo, cuenta como incorrecta.
- Si un celular se desconecta, el anfitrión ve **Jugar por este equipo** y **Saltar turno**. Si el celular recarga la página, vuelve solo a su sala y a su equipo. Si alguien cambia de celular, puede usar **Recuperar** en la lista de equipos.
- Si el anfitrión recarga la página, la partida continúa donde estaba; mientras tanto, los jugadores ven "Esperando al anfitrión…". **No cierres la pestaña del anfitrión** durante la partida (recargar sí se puede).
- Las salas de más de 6 horas se borran cuando el mismo anfitrión crea una sala nueva.

### Si algo falla
| Mensaje | Solución |
|---|---|
| "Configura Firebase para activar este modo" | Falta rellenar `firebase-config.js` (paso 4). |
| "Activa el inicio de sesión Anónimo" | Revisa el paso 2. |
| "Firebase rechazó la operación" | Revisa que pegaste y publicaste las reglas (paso 3). |
| "No se pudo conectar con Firebase" | Revisa el internet y que `databaseURL` esté bien escrito. |
| Funciona en tu PC pero no en el sitio publicado | Agrega el dominio en "Dominios autorizados" (paso 5). |

---

## 7. Estructura del proyecto

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
│   ├── firebase-config.js  Configuración de Firebase (modo en línea)
│   ├── online.js       Conexión con Firebase: salas, equipos, acciones, presencia
│   ├── sala.js         Pantallas en línea: sala, lobby, control del celular
│   └── main.js         Arranque, navegación y control de la partida
├── database.rules.json Reglas de seguridad de Firebase Realtime Database
├── assets/             Íconos (y audio opcional)
└── dev/                Solo para desarrollo (simulador de Firebase); no se publica
```

### Notas técnicas
- Todo el estado de la partida es **un solo objeto JSON** y solo cambia con `reducir(estado, accion)` en `game.js` (función pura). `dispatch(accion)` en `main.js` es el único punto de entrada.
- **Modo en línea (anfitrión con autoridad):** solo el anfitrión ejecuta `game.js`. Los celulares envían acciones a `rooms/{codigo}/actions`; el anfitrión las valida (dueño del equipo, equipo de turno, fase correcta, sin repetir) y publica en `rooms/{codigo}/state` un estado **sin el banco de preguntas ni la respuesta correcta** (la correcta se publica después de responder). El estado completo se guarda en `rooms/{codigo}/privado`, que solo puede leer el anfitrión, para recuperar la partida si recarga.
- El estado se guarda como texto JSON (`state.datos`) para que Firebase no altere las listas vacías.
- **Probar sin Firebase (desarrollo):** con un servidor local (por ejemplo `python -m http.server`), abre `http://localhost:8000/?simulador=1` en varias pestañas. Usa `dev/firebase-simulado.js`, que sincroniza las pestañas del mismo navegador. La carpeta `dev/` no se necesita en el sitio publicado.
