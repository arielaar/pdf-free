const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;
const fontkit = window.fontkit;

let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let canvas = document.getElementById('pdfCanvas');
let drawCanvas = document.getElementById('drawCanvas');
let ctx = canvas.getContext('2d');
let fabricCanvas = new fabric.Canvas('drawCanvas');
let isEditing = false;
let isAddingText = false;
let textToAdd = '';
let textPositions = []; // Almacenar texto y su posición

//
// INI Detectar evento cuando se manipulan los elemento del canvas
//
// Detectar al hacer clic en un objeto o al seleccionar varios objetos con un rectángulo de selección
fabricCanvas.on('selection:created', function (options) {
    const selectedObjects = fabricCanvas.getActiveObjects(); // Obtener objetos seleccionados
    console.log(' ');
    console.log(' ');
    console.log('[selection:created] Objetos seleccionados:', selectedObjects);

    selectedObjects.forEach((obj, index) => {
        // Mostrar información importante
        console.log('[object:selected] Tipo de objeto:', obj.type);
        console.log('[object:selected] Posición (left, top):', obj.left, obj.top);
        console.log('[object:selected] Tamaño (width, height):', obj.width, obj.height);
        console.log('[object:selected] Ángulo de rotación:', obj.angle);
        console.log('[object:selected] Color de relleno:', obj.fill);
        console.log('[object:selected] Escala (scaleX, scaleY):', obj.scaleX, obj.scaleY);

        if (obj.type === 'text') {
            console.log('[object:selected] Texto:', obj.text);
            console.log('[object:selected] Tamaño de fuente:', obj.fontSize);
            console.log('[object:selected] Fuente:', obj.fontFamily);
        } else if (obj.type === 'image') {
            console.log('[object:selected] Fuente de la imagen:', obj.getSrc());
        } else if (obj.type === 'path') {
            console.log('[object:selected] Ruta del trazo:', obj.path);
        }
    });
    console.log(' ');
});

// Detectar cuando un objeto es seleccionado
//console.log('Registrando evento object:selected');
//fabricCanvas.on('object:selected', function(options) {
//    const obj = options.target; // Objeto seleccionado
//    console.log('[object:selected] Objeto seleccionado:', obj);
//
//    // Mostrar información importante
//    console.log('[object:selected] Tipo de objeto:', obj.type);
//    console.log('[object:selected] Posición (left, top):', obj.left, obj.top);
//    console.log('[object:selected] Tamaño (width, height):', obj.width, obj.height);
//    console.log('[object:selected] Ángulo de rotación:', obj.angle);
//    console.log('[object:selected] Color de relleno:', obj.fill);
//    console.log('[object:selected] Escala (scaleX, scaleY):', obj.scaleX, obj.scaleY);
//
//    if (obj.type === 'text') {
//        console.log('[object:selected] Texto:', obj.text);
//        console.log('[object:selected] Tamaño de fuente:', obj.fontSize);
//        console.log('[object:selected] Fuente:', obj.fontFamily);
//    } else if (obj.type === 'image') {
//        console.log('[object:selected] Fuente de la imagen:', obj.getSrc());
//    } else if (obj.type === 'path') {
//        console.log('[object:selected] Ruta del trazo:', obj.path);
//    }
//});

// Detectar cuando un objeto es modificado
fabricCanvas.on('object:modified', function (options) {
    const obj = options.target;
    console.log('[object:modified] Objeto modificado:', obj);
    console.log('[object:modified] Nueva posición (left, top):', obj.left, obj.top);
    console.log('[object:modified] Nuevo tamaño (width, height):', obj.width, obj.height);
    console.log('[object:modified] Nuevo ángulo de rotación:', obj.angle);
});

// Detectar mientras un objeto está siendo escalado
fabricCanvas.on('object:scaling', function (options) {
    const obj = options.target;
    console.log('[object:scaling] Objeto escalando:', obj);
    console.log('[object:scaling] Nuevo tamaño (width, height):', obj.width * obj.scaleX, obj.height * obj.scaleY);
});

// Detectar mientras un objeto está siendo movido
fabricCanvas.on('object:moving', function (options) {
    const obj = options.target;
    console.log('[object:moving] Objeto moviéndose:', obj);
    console.log('[object:moving] Nueva posición (left, top):', obj.left, obj.top);
});

// Detectar mientras un objeto está siendo rotado
fabricCanvas.on('object:rotating', function (options) {
    const obj = options.target;
    console.log('[object:rotating] Objeto rotando:', obj);
    console.log('[object:rotating] Nuevo ángulo de rotación:', obj.angle);
});

// Se activa cuando la selección cambia (por ejemplo, al agregar o eliminar objetos de la selección actual)
fabricCanvas.on('selection:updated', function (options) {
    const selectedObjects = fabricCanvas.getActiveObjects(); // Obtener objetos seleccionados
    console.log('[selection:updated] Selección actualizada:', selectedObjects);
});

// Se activa cuando se deselecciona un objeto (por ejemplo, al hacer clic fuera de los objetos). 
// Puedes usarlo para detectar cuándo no hay objetos seleccionados.
fabricCanvas.on('selection:cleared', function (options) {
    console.log('[selection:cleared] No hay objetos seleccionados.');
});

// Escuchar el evento 'object:added'
fabricCanvas.on('object:added', function (options) {
    // options.target es el objeto que fue agregado
    console.log('[object:added] Objeto agregado:', options.target.type);
    let addedObject = options.target;


    addedObject.set({
        enableRetinaScaling: true, // Habilita el escalado para pantallas Retina
        renderOnAddRemove: true,   // Renderiza automáticamente al agregar/eliminar objetos
        objectCaching: false,      // Desactiva el caching para mayor precisión
    });

    console.log('[object:added] Objeto agregado:', addedObject);

    // Puedes realizar acciones adicionales aquí
    if (addedObject instanceof fabric.Path) {
        console.log('[object:added] Un path fue dibujado en el canvas.');
    }

    fabricCanvas.renderAll(); // Redibuja el canvas
});
//
// FIN Detectar evento cuando se manipulan los elemento del canvas
//

// Cargar PDF
document.getElementById('pdfInput').addEventListener('change', function (event) {
    let file = event.target.files[0];
    if (file) {
        let fileReader = new FileReader();
        fileReader.onload = function () {
            let typedarray = new Uint8Array(this.result);
            pdfjsLib.getDocument(typedarray).promise.then(function (pdfDoc_) {
                pdfDoc = pdfDoc_;
                renderPage(pageNum);
            });
        };
        fileReader.readAsArrayBuffer(file);
    }
});

// Renderizar página
function renderPage(num) {
    pageRendering = true;
    pdfDoc.getPage(num).then(function (page) {
        let viewport = page.getViewport({ scale: 1.0 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        drawCanvas.height = viewport.height;
        drawCanvas.width = viewport.width;
        fabricCanvas.setHeight(viewport.height);
        fabricCanvas.setWidth(viewport.width);

        let renderContext = {
            canvasContext: ctx,
            viewport: viewport,
        };
        let renderTask = page.render(renderContext);

        renderTask.promise.then(function () {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });

    document.getElementById('pageNum').textContent = `Página ${num} de ${pdfDoc.numPages}`;
}

// Navegación entre páginas
document.getElementById('prevPage').addEventListener('click', function () {
    if (pageNum <= 1) return;
    pageNum--;
    if (!pageRendering) {
        renderPage(pageNum);
    } else {
        pageNumPending = pageNum;
    }
});

document.getElementById('nextPage').addEventListener('click', function () {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    if (!pageRendering) {
        renderPage(pageNum);
    } else {
        pageNumPending = pageNum;
    }
});

// Editar página (dibujar)
document.getElementById('editPage').addEventListener('click', function () {
    isEditing = !isEditing;
    if (isEditing) {
        fabricCanvas.isDrawingMode = true;
        this.textContent = 'Dejar de Editar';
    } else {
        fabricCanvas.isDrawingMode = false;
        this.textContent = 'Editar Página';
    }
});

// Agregar texto
document.getElementById('addText').addEventListener('click', function () {
    isAddingText = true;
    textToAdd = document.getElementById('textInput').value;
    if (!textToAdd) {
        alert("Por favor, escribe un texto en el cuadro de texto.");
        return;
    }
    fabricCanvas.on('mouse:down', function (options) {
        if (isAddingText) {
            // Guardar la posición y el texto
            textPositions.push({
                text: textToAdd,
                x: options.pointer.x,
                y: options.pointer.y,
            });
            // Mostrar el texto en el canvas (solo visual)
            let text = new fabric.Text(textToAdd, {
                left: options.pointer.x,
                top: options.pointer.y,
                fontSize: 20,
                fill: 'black',
                selectable: true,
            });
            fabricCanvas.add(text);
            isAddingText = false;
            document.getElementById('textInput').value = ''; // Limpiar el cuadro de texto
        }
    });
});

// Función para ocultar elementos de tipo Text
function hideTextElements(incanvas) {
    incanvas.getObjects().forEach(function (obj) {
        if (obj.type === 'text') {
            obj.visible = false; // Ocultar el elemento
        }
    });
    incanvas.renderAll(); // Actualizar el canvas
}

// Función para restaurar la visibilidad de los elementos ocultos
function restoreTextElements(incanvas) {
    incanvas.getObjects().forEach(function (obj) {
        if (obj.type === 'text') {
            obj.visible = true; // Restaurar la visibilidad
        }
    });
    incanvas.renderAll(); // Actualizar el canvas
}

// Guardar PDF
document.getElementById('savePdf').addEventListener('click', async function () {
    if (!pdfDoc) return;

    // Obtener el archivo PDF cargado inicialmente
    let file = document.getElementById('pdfInput').files[0];
    if (!file) return;

    // Cargar el PDF original usando pdf-lib
    let pdfBytes = await file.arrayBuffer();
    let pdfDocLib = await PDFDocument.load(pdfBytes);//PDFLib.

    // Obtener la página actual
    let page = pdfDocLib.getPage(pageNum - 1);

    // Agregar texto al PDF usando drawText
    textPositions.forEach((textInfo) => {
        page.drawText(textInfo.text, {
            x: textInfo.x,
            y: page.getHeight() - textInfo.y - 20, // Ajustar la coordenada Y (20 es el tamaño de fuente)
            size: 20,
            color: rgb(0, 0, 0),//PDFLib.
        });
    });

    // Ocultar los elementos de tipo Text
    hideTextElements(fabricCanvas);

    // Convertir el canvas de dibujo a una imagen (para los trazos)
    //let imageBlob = await new Promise((resolve) => {
    //    //console.log(fabricCanvas.getElement());
    //    fabricCanvas.getElement().toBlob(resolve, 'image/png', 1.0); // Máxima calidad
    //});

    // Crear un canvas temporal con mayor resolución
    const scaleFactor = 3; // Factor de escalado (2x, 3x, etc.)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = fabricCanvas.getWidth() * scaleFactor;
    tempCanvas.height = fabricCanvas.getHeight() * scaleFactor;

    // Configurar el contexto del canvas temporal
    const tempContext = tempCanvas.getContext('2d');
    tempContext.scale(scaleFactor, scaleFactor);

    // Dibujar el contenido del canvas original en el canvas temporal
    tempContext.drawImage(fabricCanvas.getElement(), 0, 0);

    // Generar la imagen de alta calidad
    let imageBlob = await new Promise((resolve) => {
        tempCanvas.toBlob(resolve, 'image/png', 1.0); // Máxima calidad
    });

    // Restaurar la visibilidad de los elementos de tipo Text
    restoreTextElements(fabricCanvas);

    // Convertir el Blob de la imagen a un objeto Image de pdf-lib
    let image = await pdfDocLib.embedPng(await imageBlob.arrayBuffer());

    // Dibujar la imagen en la página del PDF
    page.drawImage(image, {
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight(),
    });


    // Guardar el PDF modificado
    let modifiedPdfBytes = await pdfDocLib.save();
    let blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });

    // Crear un enlace para descargar el PDF editado
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'edited_pdf.pdf';
    link.click();
});