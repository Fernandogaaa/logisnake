/*
 * LOGISNAKE — Banco de preguntas de ejemplo
 * -----------------------------------------
 * Este archivo define la variable global window.PREGUNTAS.
 * Para usar el banco oficial del equipo, reemplaza el contenido del arreglo
 * respetando el formato (ver README.md).
 *
 * Campos:
 *   etapa:       1–5 (etapa de la cadena logística) o 0 = general (solo relámpago)
 *   tipo:        "normal" | "cofre" | "alerta" | "auditoria" | "relampago"
 *   pregunta:    texto de la pregunta
 *   opciones:    4 alternativas (texto)
 *   correcta:    índice de la alternativa correcta (0–3)
 *   explicacion: retroalimentación breve que se muestra después de responder
 *
 * El juego mezcla el orden de las alternativas cada vez que muestra una pregunta.
 */
window.PREGUNTAS = [
  /* =====================================================================
   * ETAPA 1 · COMPRAS Y ABASTECIMIENTO
   * ===================================================================== */
  {
    etapa: 1, tipo: "normal",
    pregunta: "¿Qué documento formaliza la compra ante el proveedor e indica productos, cantidades, precios y condiciones de entrega y pago?",
    opciones: ["Guía de remisión", "Orden de compra", "Requerimiento interno", "Kardex"],
    correcta: 1,
    explicacion: "La orden de compra es el documento que la empresa emite al proveedor para formalizar el pedido y sus condiciones. El requerimiento es interno y la guía de remisión sustenta el traslado."
  },
  {
    etapa: 1, tipo: "normal",
    pregunta: "El área de producción necesita materiales. ¿Cómo debe solicitarlos formalmente al área de compras?",
    opciones: ["Llamando directamente al proveedor", "Emitiendo una factura interna", "Mediante un requerimiento (solicitud de compra) aprobado", "Enviando un packing list"],
    correcta: 2,
    explicacion: "El requerimiento o solicitud de compra es el documento interno con el que un área pide materiales. Compras lo revisa y, si procede, emite la orden de compra."
  },
  {
    etapa: 1, tipo: "normal",
    pregunta: "¿Qué es el lead time (tiempo de reposición) de un proveedor?",
    opciones: ["El tiempo que un producto permanece en el almacén", "El tiempo desde que se emite el pedido hasta que la mercadería se recibe", "El plazo de pago de la factura", "La vida útil del producto"],
    correcta: 1,
    explicacion: "El lead time es el tiempo que transcurre desde que se hace el pedido hasta que llega. Es clave para calcular el punto de reorden."
  },
  {
    etapa: 1, tipo: "normal",
    pregunta: "Un producto se consume a razón de 40 unidades diarias, el lead time es de 5 días y el stock de seguridad es de 60 unidades. ¿Cuál es el punto de reorden?",
    opciones: ["200 unidades", "260 unidades", "300 unidades", "240 unidades"],
    correcta: 1,
    explicacion: "Punto de reorden = consumo diario × lead time + stock de seguridad = 40 × 5 + 60 = 260 unidades. Al llegar a ese nivel se debe generar un nuevo pedido."
  },
  {
    etapa: 1, tipo: "normal",
    pregunta: "¿Cuál es la finalidad principal del stock de seguridad?",
    opciones: ["Aumentar las ventas del mes", "Reemplazar al inventario cíclico", "Protegerse ante variaciones de la demanda o retrasos del proveedor", "Reducir el número de proveedores"],
    correcta: 2,
    explicacion: "El stock de seguridad es una reserva que evita quiebres de stock cuando la demanda sube o el proveedor se retrasa."
  },
  {
    etapa: 1, tipo: "normal",
    pregunta: "¿En qué consiste la homologación de proveedores?",
    opciones: ["En pagar a todos los proveedores el mismo precio", "En evaluar y aprobar que un proveedor cumple requisitos de calidad, capacidad y legales antes de trabajar con él", "En comprar siempre al proveedor más barato", "En registrar las facturas del proveedor en el sistema"],
    correcta: 1,
    explicacion: "Homologar es verificar y aprobar formalmente a un proveedor (calidad, capacidad, documentación, situación tributaria) para incluirlo en la lista de proveedores autorizados."
  },
  {
    etapa: 1, tipo: "normal",
    pregunta: "Al evaluar proveedores, ¿qué conjunto de criterios es el más completo?",
    opciones: ["Solo el precio más bajo", "La cercanía al almacén y la antigüedad de la empresa", "Precio, calidad, cumplimiento de plazos, condiciones de pago y servicio postventa", "El número de vendedores que tiene"],
    correcta: 2,
    explicacion: "Una buena evaluación combina varios criterios. El proveedor más barato puede salir caro si entrega tarde o con mala calidad."
  },
  {
    etapa: 1, tipo: "alerta",
    pregunta: "Tu proveedor principal avisa que retrasará 10 días la entrega de una materia prima crítica. El stock actual solo alcanza para 4 días de producción. ¿Qué haces?",
    opciones: ["Esperar al proveedor y detener la producción cuando se acabe el stock", "Activar un proveedor alternativo homologado, coordinar con producción la reprogramación y registrar el incumplimiento en la evaluación del proveedor", "Comprar a cualquier tienda sin verificar la calidad", "Cancelar todos los pedidos de los clientes"],
    correcta: 1,
    explicacion: "Ante un riesgo de desabastecimiento se recurre a proveedores alternativos ya homologados, se informa a producción y se deja evidencia del incumplimiento para futuras evaluaciones."
  },
  {
    etapa: 1, tipo: "alerta",
    pregunta: "Compras recibe un requerimiento urgente sin la aprobación del jefe del área y sin especificaciones técnicas del material. ¿Qué haces?",
    opciones: ["Emitir la orden de compra de inmediato y preguntar después", "Ignorar el requerimiento", "Pedir que se completen las especificaciones y la aprobación, dándole prioridad, antes de emitir la orden de compra", "Comprar el material más barato que se parezca"],
    correcta: 2,
    explicacion: "Sin especificaciones ni aprobación se corre el riesgo de comprar algo equivocado o no autorizado. Se prioriza el caso, pero se completa la información antes de comprar."
  },
  {
    etapa: 1, tipo: "auditoria",
    pregunta: "Una auditoría detecta que varias órdenes de compra se emitieron después de recibir la factura del proveedor, es decir, se compró sin orden previa. ¿Qué medida corresponde?",
    opciones: ["Ninguna, lo importante es que llegó el producto", "Establecer que toda compra requiere una orden de compra aprobada antes de pedir al proveedor, con un procedimiento de excepciones documentado", "Eliminar las facturas para que no se note", "Pagar más rápido a los proveedores"],
    correcta: 1,
    explicacion: "La orden de compra previa es un control interno: asegura que la compra fue autorizada, con precio y condiciones acordadas. Las excepciones deben estar normadas."
  },
  {
    etapa: 1, tipo: "auditoria",
    pregunta: "La auditoría encuentra que el 70 % de las compras se hace a un solo proveedor sin pedir cotizaciones comparativas. ¿Qué recomiendas?",
    opciones: ["Exigir un mínimo de tres cotizaciones para compras sobre cierto monto y evaluar periódicamente a los proveedores", "Mantener la práctica porque el proveedor es conocido", "Cambiar de proveedor cada semana", "Comprar solo por internet"],
    correcta: 0,
    explicacion: "Comparar cotizaciones y evaluar proveedores favorece mejores precios, transparencia y reduce la dependencia de un único proveedor."
  },
  {
    etapa: 1, tipo: "cofre",
    pregunta: "La demanda anual de un insumo es de 1 200 unidades y cada pedido se hace por 300 unidades. ¿Cuántos pedidos se realizan al año?",
    opciones: ["3 pedidos", "4 pedidos", "6 pedidos", "12 pedidos"],
    correcta: 1,
    explicacion: "Número de pedidos = demanda anual ÷ cantidad por pedido = 1 200 ÷ 300 = 4 pedidos al año."
  },

  /* =====================================================================
   * ETAPA 2 · RECEPCIÓN DE MERCANCÍAS
   * ===================================================================== */
  {
    etapa: 2, tipo: "normal",
    pregunta: "Llega un camión con mercadería al almacén. ¿Qué se debe hacer primero?",
    opciones: ["Descargar todo y revisar los documentos al día siguiente", "Verificar los documentos (guía de remisión y orden de compra) antes de descargar", "Firmar la guía sin revisar para no demorar al transportista", "Ubicar los productos directamente en los racks"],
    correcta: 1,
    explicacion: "Antes de descargar se confirma que el envío corresponde a una orden de compra vigente y que la guía de remisión está correcta."
  },
  {
    etapa: 2, tipo: "normal",
    pregunta: "¿Cuál es la función de la guía de remisión?",
    opciones: ["Sustentar el traslado de bienes durante el transporte, según lo exigido por la SUNAT", "Registrar el pago al proveedor", "Detallar el sueldo del transportista", "Reemplazar a la factura"],
    correcta: 0,
    explicacion: "La guía de remisión (física o electrónica) es el documento que sustenta el traslado de bienes ante la SUNAT; indica remitente, destinatario, bienes, punto de partida y llegada."
  },
  {
    etapa: 2, tipo: "normal",
    pregunta: "¿Qué significa colocar un producto en cuarentena durante la recepción?",
    opciones: ["Venderlo con descuento", "Retenerlo en una zona separada hasta verificar su calidad o conformidad antes de liberarlo al stock", "Devolverlo inmediatamente al proveedor", "Guardarlo en el área de despacho"],
    correcta: 1,
    explicacion: "La cuarentena evita que productos aún no aprobados se mezclen con el stock disponible. Se liberan o rechazan según el resultado de la inspección."
  },
  {
    etapa: 2, tipo: "normal",
    pregunta: "¿Qué es el cross docking?",
    opciones: ["Almacenar productos por largos periodos", "Contar el inventario dos veces", "Transferir la mercadería recibida directamente a despacho con mínimo o ningún almacenamiento", "Rechazar mercadería sin documentos"],
    correcta: 2,
    explicacion: "En el cross docking la mercadería entra y sale casi de inmediato, lo que reduce costos de almacenamiento y tiempos de entrega."
  },
  {
    etapa: 2, tipo: "normal",
    pregunta: "Cuando no es práctico revisar el 100 % de un lote grande, ¿qué técnica de inspección se usa?",
    opciones: ["Inspección por muestreo representativo", "No inspeccionar nada", "Revisar solo la primera caja", "Pedir al transportista que revise"],
    correcta: 0,
    explicacion: "El muestreo permite evaluar una muestra representativa del lote y decidir si se acepta o rechaza, con un costo y tiempo razonables."
  },
  {
    etapa: 2, tipo: "normal",
    pregunta: "En la recepción, ¿con qué documento se compara la guía de remisión para confirmar que se recibe lo que se pidió?",
    opciones: ["Con el kardex", "Con la orden de compra", "Con el packing list del cliente", "Con el reporte de ventas"],
    correcta: 1,
    explicacion: "La orden de compra indica qué se pidió; la guía indica qué se envió. Compararlas permite detectar faltantes, sobrantes o productos equivocados."
  },
  {
    etapa: 2, tipo: "normal",
    pregunta: "¿Para qué sirve la «recepción ciega», en la que el recepcionista cuenta sin ver la cantidad indicada en el documento?",
    opciones: ["Para recibir más rápido sin contar", "Para evitar que el conteo se vea influenciado por la cifra del documento y detectar diferencias reales", "Para que el proveedor no sepa cuánto recibimos", "Para no tener que firmar la guía"],
    correcta: 1,
    explicacion: "Al no conocer la cifra esperada, el recepcionista cuenta de verdad. Luego se compara con el documento y se registran las diferencias."
  },
  {
    etapa: 2, tipo: "alerta",
    pregunta: "Durante la recepción, una empresa recibe un pedido de 200 cajas. 20 cajas presentan daños y la cantidad de la guía de remisión no coincide con los productos en buen estado. ¿Qué se debe hacer?",
    opciones: ["Aceptar todas las cajas y registrar los daños cuando se realice el inventario.", "Rechazar todo el pedido sin realizar ninguna verificación adicional.", "Verificar las cantidades y el estado de los productos, separar las cajas dañadas, registrar las observaciones y comunicar la incidencia al proveedor.", "Ingresar las 200 cajas al almacén sin modificar los documentos."],
    correcta: 2,
    explicacion: "Durante la recepción es necesario comprobar cantidades y condiciones, identificar diferencias, registrar observaciones y comunicar las incidencias. Así se evitan errores en el inventario."
  },
  {
    etapa: 2, tipo: "alerta",
    pregunta: "Llega un lote de yogures y el registrador del camión refrigerado muestra que la temperatura superó el rango permitido durante el viaje. ¿Qué haces?",
    opciones: ["Ingresarlos al stock porque se ven bien", "Venderlos primero para que no se malogren", "No ingresarlos al stock disponible: registrar la temperatura, separarlos según el protocolo y comunicar a calidad y al proveedor", "Guardarlos en el área de despacho a temperatura ambiente"],
    correcta: 2,
    explicacion: "En productos perecibles la cadena de frío es crítica. Si se rompió, el producto se retiene y se evalúa; nunca se libera sin verificación."
  },
  {
    etapa: 2, tipo: "auditoria",
    pregunta: "Una auditoría detecta que los productos se registran en el sistema varios días después de su llegada física, lo que genera diferencias de stock. ¿Qué recomiendas?",
    opciones: ["Registrar el ingreso en el sistema el mismo día de la recepción, con el acta o formato de recepción firmado", "Registrar los ingresos una vez al mes", "Que ventas registre los ingresos", "Dejar de usar el sistema"],
    correcta: 0,
    explicacion: "El registro oportuno mantiene el stock del sistema igual al físico y evita vender o comprar sobre información equivocada."
  },
  {
    etapa: 2, tipo: "auditoria",
    pregunta: "La auditoría encuentra que los reclamos al proveedor por mercadería dañada son rechazados por falta de evidencia. ¿Qué debe cambiar en la recepción?",
    opciones: ["Dejar de presentar reclamos", "Anotar las observaciones en la guía o acta de recepción, tomar fotos y obtener la firma del transportista antes de dar conformidad", "Pedir al transportista que se lleve todo", "Firmar la conformidad y reclamar por teléfono"],
    correcta: 1,
    explicacion: "La evidencia documentada en el momento de la recepción (observaciones, fotos, firmas) es la base para que el reclamo proceda."
  },
  {
    etapa: 2, tipo: "cofre",
    pregunta: "Se recibe un lote de 500 unidades. En una muestra de 50 unidades se encuentran 5 defectuosas. ¿Qué porcentaje de defectos se estima para el lote?",
    opciones: ["5 %", "1 %", "10 %", "50 %"],
    correcta: 2,
    explicacion: "Porcentaje de defectos = 5 ÷ 50 × 100 = 10 %. Con la muestra se estima la calidad de todo el lote."
  },

  /* =====================================================================
   * ETAPA 3 · ALMACENAMIENTO E INVENTARIOS
   * ===================================================================== */
  {
    etapa: 3, tipo: "normal",
    pregunta: "¿Qué es el kardex?",
    opciones: ["Un tipo de estante metálico", "El registro de entradas, salidas y saldos de cada producto, en cantidades y valores", "La factura del proveedor", "Un indicador de transporte"],
    correcta: 1,
    explicacion: "El kardex permite conocer en todo momento cuánto hay de cada producto y cuál es su valor, según el método de valuación usado."
  },
  {
    etapa: 3, tipo: "normal",
    pregunta: "¿Qué indica el método FIFO?",
    opciones: ["Lo último que entra es lo primero que sale", "Lo primero que entra es lo primero que sale", "Lo que vence primero sale primero", "Se despacha lo que esté más cerca"],
    correcta: 1,
    explicacion: "FIFO (First In, First Out) significa «primero en entrar, primero en salir»; ayuda a que el stock rote y no envejezca."
  },
  {
    etapa: 3, tipo: "normal",
    pregunta: "¿Para qué tipo de productos es más adecuado el método FEFO?",
    opciones: ["Para tornillos y herramientas", "Para productos con fecha de vencimiento, como alimentos y medicinas", "Para muebles", "Para productos de exhibición"],
    correcta: 1,
    explicacion: "FEFO (First Expired, First Out) despacha primero lo que vence primero. Es esencial en perecibles y farmacéuticos."
  },
  {
    etapa: 3, tipo: "normal",
    pregunta: "En un análisis ABC de inventarios, ¿qué caracteriza a los artículos de clase A?",
    opciones: ["Son muchos artículos de poco valor", "Son pocos artículos que representan la mayor parte del valor del inventario", "Son los productos obsoletos", "Son los productos más livianos"],
    correcta: 1,
    explicacion: "La clase A agrupa aproximadamente el 20 % de los artículos que concentran cerca del 80 % del valor. Requieren mayor control."
  },
  {
    etapa: 3, tipo: "normal",
    pregunta: "¿Qué es el inventario cíclico?",
    opciones: ["Contar todo el almacén una vez al año cerrando operaciones", "Conteos programados de grupos de productos de forma periódica, sin detener las operaciones", "Comprar inventario cada ciclo de producción", "Rotar al personal del almacén"],
    correcta: 1,
    explicacion: "El inventario cíclico permite detectar y corregir diferencias de manera continua, sin paralizar el almacén."
  },
  {
    etapa: 3, tipo: "normal",
    pregunta: "En la metodología 5S, ¿qué significa «Seiton»?",
    opciones: ["Clasificar y eliminar lo innecesario", "Ordenar: un lugar para cada cosa y cada cosa en su lugar", "Limpiar", "Mantener la disciplina"],
    correcta: 1,
    explicacion: "Las 5S son: Seiri (clasificar), Seiton (ordenar), Seiso (limpiar), Seiketsu (estandarizar) y Shitsuke (disciplina)."
  },
  {
    etapa: 3, tipo: "normal",
    pregunta: "Según el criterio de ubicación por rotación, ¿dónde deben colocarse los productos de alta rotación?",
    opciones: ["En los niveles más altos del rack", "En el fondo del almacén", "Cerca de la zona de despacho y a una altura accesible", "En la zona de cuarentena"],
    correcta: 2,
    explicacion: "Ubicar los productos de mayor movimiento cerca del despacho reduce recorridos y tiempos de picking."
  },
  {
    etapa: 3, tipo: "alerta",
    pregunta: "En un conteo cíclico, el kardex indica 120 unidades de un producto, pero físicamente hay 105. ¿Qué haces?",
    opciones: ["Ajustar el kardex a 105 de inmediato y olvidar el tema", "Recontar, revisar los movimientos y documentos para hallar la causa, y luego ajustar con autorización dejando registro", "Comprar 15 unidades para cuadrar", "No hacer nada porque es una diferencia pequeña"],
    correcta: 1,
    explicacion: "Antes de ajustar se confirma la diferencia y se investiga su causa (error de registro, merma, robo). El ajuste debe ser autorizado y documentado."
  },
  {
    etapa: 3, tipo: "alerta",
    pregunta: "En el almacén de una distribuidora de alimentos, los productos con vencimiento próximo quedaron al fondo y se despacharon los más nuevos. Un lote se venció. ¿Qué haces?",
    opciones: ["Aplicar FEFO, reorganizar las ubicaciones, rotular las fechas de vencimiento y configurar alertas de vencimiento", "Vender el lote vencido con descuento", "Despachar siempre lo que esté adelante", "Dejar de comprar alimentos"],
    correcta: 0,
    explicacion: "Con FEFO y una buena rotulación de fechas se despacha primero lo que vence primero, evitando pérdidas por vencimiento."
  },
  {
    etapa: 3, tipo: "auditoria",
    pregunta: "La auditoría encuentra pasillos obstruidos con cajas y extintores bloqueados. ¿Qué medida corresponde?",
    opciones: ["Esperar a que se despache la mercadería", "Aplicar 5S y señalización: liberar pasillos y accesos de emergencia, y definir zonas de ubicación", "Mover los extintores a la oficina", "Poner más cajas en altura sin asegurarlas"],
    correcta: 1,
    explicacion: "El orden y la señalización protegen al personal y hacen más eficiente el almacén. Los accesos de emergencia nunca deben bloquearse."
  },
  {
    etapa: 3, tipo: "auditoria",
    pregunta: "La auditoría observa que los productos de clase A se cuentan solo una vez al año, igual que los de clase C. ¿Qué recomiendas?",
    opciones: ["Contar los de clase C con más frecuencia", "Programar conteos cíclicos más frecuentes para la clase A", "Dejar de contar la clase A", "Contar todo una vez cada dos años"],
    correcta: 1,
    explicacion: "Los artículos A concentran el mayor valor, por lo que un error en ellos tiene más impacto. Se cuentan con más frecuencia que los B y C."
  },
  {
    etapa: 3, tipo: "cofre",
    pregunta: "El costo de ventas anual es de S/ 600 000 y el inventario promedio es de S/ 100 000. ¿Cuál es la rotación de inventario?",
    opciones: ["6 veces al año", "60 veces al año", "0,6 veces al año", "16 veces al año"],
    correcta: 0,
    explicacion: "Rotación = costo de ventas ÷ inventario promedio = 600 000 ÷ 100 000 = 6. El inventario se renueva 6 veces al año."
  },

  /* =====================================================================
   * ETAPA 4 · PREPARACIÓN Y DESPACHO
   * ===================================================================== */
  {
    etapa: 4, tipo: "normal",
    pregunta: "¿En qué consiste el picking?",
    opciones: ["En recibir la mercadería del proveedor", "En extraer del almacén los productos que componen un pedido", "En facturar al cliente", "En limpiar el almacén"],
    correcta: 1,
    explicacion: "El picking es la preparación de pedidos: ubicar y extraer los productos y cantidades solicitados por el cliente."
  },
  {
    etapa: 4, tipo: "normal",
    pregunta: "¿Qué información contiene un packing list?",
    opciones: ["El precio de venta y los descuentos", "El detalle del contenido de cada bulto: productos, cantidades, pesos y dimensiones", "El horario del transportista", "La evaluación del proveedor"],
    correcta: 1,
    explicacion: "El packing list (lista de empaque) permite verificar qué contiene cada bulto sin abrirlo, tanto al despachar como al recibir."
  },
  {
    etapa: 4, tipo: "normal",
    pregunta: "¿Qué datos debe incluir un buen rotulado de bultos para despacho?",
    opciones: ["Solo el logo de la empresa", "Destinatario, dirección, número de bulto, peso e indicaciones de manipulación (frágil, este lado arriba)", "El precio del producto", "El nombre del almacenero"],
    correcta: 1,
    explicacion: "El rótulo permite identificar el envío y manipularlo correctamente, evitando entregas equivocadas y daños."
  },
  {
    etapa: 4, tipo: "normal",
    pregunta: "¿Cuál es la principal ventaja de usar código de barras en el despacho?",
    opciones: ["Hace que las cajas se vean mejor", "Registra los productos rápidamente y reduce errores de digitación", "Elimina la necesidad de embalaje", "Reemplaza a la guía de remisión"],
    correcta: 1,
    explicacion: "La lectura con escáner es rápida y precisa, lo que disminuye errores de picking y de registro."
  },
  {
    etapa: 4, tipo: "normal",
    pregunta: "¿Qué es el picking por lotes (batch picking)?",
    opciones: ["Preparar un solo pedido a la vez", "Recoger en un mismo recorrido los productos de varios pedidos y luego separarlos", "Vender productos por lotes", "Despachar solo productos vencidos"],
    correcta: 1,
    explicacion: "Agrupar pedidos en un mismo recorrido reduce desplazamientos cuando varios pedidos tienen productos en común."
  },
  {
    etapa: 4, tipo: "normal",
    pregunta: "¿Qué es la consolidación de carga?",
    opciones: ["Agrupar varios envíos pequeños en una sola carga para aprovechar mejor el transporte", "Dividir una carga grande en muchos camiones", "Asegurar la carga con cinta", "Devolver la carga al proveedor"],
    correcta: 0,
    explicacion: "Consolidar carga mejora la ocupación del vehículo y reduce el costo de transporte por unidad."
  },
  {
    etapa: 4, tipo: "normal",
    pregunta: "¿Cuál es la función principal del embalaje en el despacho?",
    opciones: ["Hacer publicidad del producto", "Proteger el producto durante la manipulación, el almacenamiento y el transporte", "Aumentar el peso del envío", "Ocultar el contenido a la SUNAT"],
    correcta: 1,
    explicacion: "El embalaje protege la mercadería de golpes, humedad y vibraciones, y facilita su manipulación."
  },
  {
    etapa: 4, tipo: "alerta",
    pregunta: "Un cliente reclama que recibió 10 unidades de un producto equivocado. Se descubre que el error ocurrió en el picking porque dos productos tienen códigos parecidos. ¿Qué haces?",
    opciones: ["Decirle al cliente que se quede con los productos", "Gestionar la reposición y el recojo con el cliente, e implementar verificación con escáner y separar las ubicaciones de productos similares", "Sancionar al almacenero y no cambiar nada más", "Eliminar uno de los productos del catálogo"],
    correcta: 1,
    explicacion: "Primero se atiende al cliente y luego se ataca la causa raíz con controles (escaneo, ubicaciones diferenciadas) para que no se repita."
  },
  {
    etapa: 4, tipo: "alerta",
    pregunta: "El camión llega a cargar y el pedido aún no está listo porque el picking empezó tarde. La entrega ya está en riesgo. ¿Qué haces?",
    opciones: ["Despachar el pedido incompleto sin avisar", "Priorizar el pedido, reasignar personal, informar al cliente el nuevo horario y luego planificar la preparación según los horarios de carga", "Cancelar el pedido", "Esperar al día siguiente sin informar"],
    correcta: 1,
    explicacion: "Se resuelve la urgencia con comunicación al cliente y se corrige la planificación para que el picking termine antes de la llegada del transporte."
  },
  {
    etapa: 4, tipo: "auditoria",
    pregunta: "La auditoría detecta bultos despachados sin rótulo ni packing list; el transportista no sabe qué entregar a cada cliente. ¿Qué recomiendas?",
    opciones: ["Estandarizar el rotulado y adjuntar el packing list a cada envío, con verificación antes de cargar", "Que el transportista abra los bultos para revisar", "Enviar todo en una sola caja grande", "Rotular solo los bultos frágiles"],
    correcta: 0,
    explicacion: "El rotulado y el packing list estandarizados aseguran que cada bulto llegue al cliente correcto y se pueda verificar."
  },
  {
    etapa: 4, tipo: "auditoria",
    pregunta: "La auditoría encuentra que en los camiones se colocan cajas pesadas sobre productos frágiles, lo que causa mercadería dañada. ¿Qué medida corresponde?",
    opciones: ["Usar camiones más grandes", "Establecer un plan de carga: pesados abajo, frágiles arriba, carga asegurada y señales de manipulación respetadas", "Dejar de vender productos frágiles", "Cobrar los daños al cliente"],
    correcta: 1,
    explicacion: "Un plan de carga ordena los bultos por peso y fragilidad, y asegura la carga para evitar daños durante el transporte."
  },
  {
    etapa: 4, tipo: "cofre",
    pregunta: "En un mes se prepararon 600 pedidos y 18 tuvieron algún error. ¿Cuál es la exactitud de pedidos?",
    opciones: ["97 %", "82 %", "3 %", "99,7 %"],
    correcta: 0,
    explicacion: "Pedidos correctos = 600 − 18 = 582. Exactitud = 582 ÷ 600 × 100 = 97 %."
  },

  /* =====================================================================
   * ETAPA 5 · TRANSPORTE Y ENTREGA
   * ===================================================================== */
  {
    etapa: 5, tipo: "normal",
    pregunta: "¿Qué es la «última milla» en logística?",
    opciones: ["El último kilómetro de la carretera Panamericana", "El tramo final de la entrega, desde el último centro de distribución hasta el cliente", "El último pedido del día", "La distancia entre dos almacenes"],
    correcta: 1,
    explicacion: "La última milla es el tramo final hasta el cliente; suele ser la parte más costosa y compleja de la distribución."
  },
  {
    etapa: 5, tipo: "normal",
    pregunta: "¿Cuál es el objetivo principal de la planificación de rutas?",
    opciones: ["Que el conductor elija su camino favorito", "Reducir distancias, tiempos y costos cumpliendo los horarios de entrega", "Visitar a todos los clientes el mismo día sin importar el costo", "Usar siempre la misma ruta"],
    correcta: 1,
    explicacion: "Planificar rutas permite entregar a tiempo con menos kilómetros, combustible y horas de trabajo."
  },
  {
    etapa: 5, tipo: "normal",
    pregunta: "¿Para qué sirve el GPS en una flota de transporte?",
    opciones: ["Para reproducir música", "Para monitorear en tiempo real la ubicación, los tiempos y los desvíos de los vehículos", "Para emitir facturas", "Para medir la temperatura del motor"],
    correcta: 1,
    explicacion: "El GPS da visibilidad de la flota, mejora la seguridad y permite informar al cliente la hora estimada de llegada."
  },
  {
    etapa: 5, tipo: "normal",
    pregunta: "¿Qué evidencia la conformidad de la entrega?",
    opciones: ["Una llamada del conductor", "La guía de remisión firmada (y sellada) por el cliente, indicando que recibió conforme", "La orden de compra del proveedor", "El reporte de inventario"],
    correcta: 1,
    explicacion: "La firma y sello del cliente en la guía o en el comprobante de entrega es la prueba de que recibió la mercadería en buen estado."
  },
  {
    etapa: 5, tipo: "normal",
    pregunta: "¿Qué es la logística inversa?",
    opciones: ["Transportar mercadería en reversa", "Gestionar el flujo de productos desde el cliente de vuelta a la empresa: devoluciones, reparaciones o reciclaje", "Comprar al cliente", "Despachar sin guía de remisión"],
    correcta: 1,
    explicacion: "La logística inversa gestiona devoluciones, productos defectuosos, envases y residuos, recuperando valor y cuidando el ambiente."
  },
  {
    etapa: 5, tipo: "normal",
    pregunta: "¿Qué mide el indicador OTD (On Time Delivery)?",
    opciones: ["El porcentaje de pedidos entregados a tiempo", "El número de camiones de la empresa", "El costo de cada entrega", "La velocidad promedio del vehículo"],
    correcta: 0,
    explicacion: "OTD = pedidos entregados a tiempo ÷ total de pedidos × 100. Mide la puntualidad del servicio de entrega."
  },
  {
    etapa: 5, tipo: "normal",
    pregunta: "En un mes se entregaron 200 pedidos y 184 llegaron a tiempo. ¿Cuál es el OTD?",
    opciones: ["84 %", "92 %", "16 %", "96 %"],
    correcta: 1,
    explicacion: "OTD = 184 ÷ 200 × 100 = 92 %."
  },
  {
    etapa: 5, tipo: "alerta",
    pregunta: "Un camión en ruta encuentra la carretera bloqueada por un huaico y varias entregas quedan comprometidas. ¿Qué haces?",
    opciones: ["Esperar en el lugar sin avisar a nadie", "Usar el GPS para evaluar una ruta alternativa segura, informar a los clientes la nueva hora o reprogramar, y registrar la incidencia", "Cruzar el huaico para cumplir a tiempo", "Regresar al almacén y cancelar todos los pedidos"],
    correcta: 1,
    explicacion: "La seguridad es primero. Con información en tiempo real se busca una alternativa y se comunica oportunamente al cliente."
  },
  {
    etapa: 5, tipo: "alerta",
    pregunta: "Al entregar, el cliente encuentra una caja dañada y se niega a firmar la guía. ¿Qué haces?",
    opciones: ["Obligar al cliente a firmar", "Dejar la caja y retirarse", "Registrar las observaciones en la guía con fotos, coordinar la devolución o reposición e investigar la causa", "Llevarse toda la mercadería sin registrar nada"],
    correcta: 2,
    explicacion: "Se documenta la incidencia, se activa la logística inversa para el producto dañado y se busca la causa para evitar que se repita."
  },
  {
    etapa: 5, tipo: "auditoria",
    pregunta: "La auditoría muestra un OTD de 78 %. La causa principal es que las rutas se arman sin considerar los horarios de los clientes ni las zonas. ¿Qué recomiendas?",
    opciones: ["Comprar más camiones sin cambiar el método", "Planificar rutas por zonas y ventanas horarias, y monitorear el OTD semanalmente", "Entregar solo de noche", "Eliminar el indicador OTD"],
    correcta: 1,
    explicacion: "Agrupar entregas por zonas y respetar ventanas horarias mejora la puntualidad; el seguimiento del indicador permite corregir a tiempo."
  },
  {
    etapa: 5, tipo: "auditoria",
    pregunta: "La auditoría encuentra guías de remisión emitidas con la placa del vehículo y los datos del transportista incorrectos, con riesgo de multa de la SUNAT. ¿Qué medida corresponde?",
    opciones: ["Verificar los datos del transportista, la placa y los puntos de partida y llegada antes de emitir la guía electrónica", "Dejar de emitir guías", "Corregir los datos a mano durante el viaje", "Usar la misma guía para todos los viajes"],
    correcta: 0,
    explicacion: "Los datos de la guía deben coincidir con el traslado real. Un control previo a la emisión evita sanciones y retenciones de la mercadería."
  },
  {
    etapa: 5, tipo: "cofre",
    pregunta: "Un vehículo debe recorrer 180 km y rinde 12 km por galón. ¿Cuántos galones de combustible necesita?",
    opciones: ["12 galones", "15 galones", "18 galones", "20 galones"],
    correcta: 1,
    explicacion: "Galones = distancia ÷ rendimiento = 180 ÷ 12 = 15 galones."
  },

  /* =====================================================================
   * PREGUNTAS RELÁMPAGO (generales, etapa 0)
   * ===================================================================== */
  {
    etapa: 0, tipo: "relampago",
    pregunta: "¿Cuál es el orden correcto de las etapas de la cadena logística en LOGISNAKE?",
    opciones: ["Transporte → Compras → Despacho → Recepción → Almacenamiento", "Compras → Recepción → Almacenamiento → Despacho → Transporte", "Recepción → Compras → Transporte → Almacenamiento → Despacho", "Almacenamiento → Compras → Recepción → Transporte → Despacho"],
    correcta: 1,
    explicacion: "Primero se compra, luego se recibe, se almacena, se prepara el despacho y finalmente se transporta y entrega al cliente."
  },
  {
    etapa: 0, tipo: "relampago",
    pregunta: "¿Cuál es el objetivo principal de la gestión logística?",
    opciones: ["Vender más que la competencia", "Entregar el producto correcto, en la cantidad, lugar y momento adecuados, al menor costo posible", "Tener el almacén más grande", "Reducir el número de clientes"],
    correcta: 1,
    explicacion: "La logística busca que el cliente reciba lo que necesita, cuando y donde lo necesita, optimizando los costos."
  },
  {
    etapa: 0, tipo: "relampago",
    pregunta: "En el Perú, ¿qué entidad regula los comprobantes de pago y las guías de remisión?",
    opciones: ["INDECOPI", "SUNAT", "SUNARP", "MTC"],
    correcta: 1,
    explicacion: "La SUNAT establece las normas sobre comprobantes de pago y guías de remisión, incluida su emisión electrónica."
  },
  {
    etapa: 0, tipo: "relampago",
    pregunta: "¿Para qué sirve un indicador logístico (KPI)?",
    opciones: ["Para decorar los reportes", "Para medir el desempeño de un proceso y tomar decisiones de mejora", "Para reemplazar al personal", "Para calcular sueldos"],
    correcta: 1,
    explicacion: "Lo que no se mide no se puede mejorar. Los KPI como OTD o rotación de inventario muestran dónde actuar."
  },
  {
    etapa: 0, tipo: "relampago",
    pregunta: "La logística de salida (distribución) se encarga principalmente de…",
    opciones: ["Comprar materia prima", "Hacer llegar los productos terminados al cliente", "Contratar personal", "Diseñar los productos"],
    correcta: 1,
    explicacion: "La logística de entrada abastece a la empresa; la de salida lleva los productos al cliente final."
  },
  {
    etapa: 0, tipo: "relampago",
    pregunta: "¿Qué es la cadena de suministro?",
    opciones: ["Una cadena metálica para asegurar la carga", "La red de empresas, procesos y flujos de materiales e información desde el proveedor hasta el cliente final", "El listado de productos del almacén", "El organigrama del área de compras"],
    correcta: 1,
    explicacion: "La cadena de suministro integra proveedores, fabricantes, almacenes, transportistas y clientes para que el producto llegue a destino."
  }
];
