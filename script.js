document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos da Interface ---
    const imageUpload = document.getElementById('imageUpload');
    const imageCanvas = document.getElementById('imageCanvas');
    const ctx = imageCanvas.getContext('2d');
    const measurementSection = document.getElementById('measurementSection');
    const resultSection = document.getElementById('resultSection');
    const measurementInfo = document.getElementById('measurementInfo');
    const scaleValueInput = document.getElementById('scaleValue');
    const scaleUnitSelect = document.getElementById('scaleUnit');
    const calculateBtn = document.getElementById('calculateBtn');
    const resultValueSpan = document.getElementById('resultValue');
    const downloadTxtBtn = document.getElementById('downloadTxtBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const errorMessage = document.getElementById('errorMessage');

    const measureToolBtn = document.getElementById('measureToolBtn');
    const measureObjectBtn = document.getElementById('measureObjectBtn');
    const useImageWidthBtn = document.getElementById('useImageWidthBtn');
    const scaleInputGroup = document.getElementById('scaleInputGroup');
    const imageWidthInputGroup = document.getElementById('imageWidthInputGroup');
    const imageWidthValueInput = document.getElementById('imageWidthValue');
    const imageWidthUnitSelect = document.getElementById('imageWidthUnit');

    const canvasControls = document.getElementById('canvasControls');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetViewBtn = document.getElementById('resetViewBtn');
    const clearMeasurementBtn = document.getElementById('clearMeasurementBtn');
    const currentZoomSpan = document.getElementById('currentZoom');
    const coordinatesDisplay = document.getElementById('coordinatesDisplay');

    const scaleValueError = document.getElementById('scaleValueError');
    const imageWidthValueError = document.getElementById('imageWidthValueError');

    const enableTiffSupportCheckbox = document.getElementById('enableTiffSupport');
    const tiffLoadingMessage = document.getElementById('tiffLoadingMessage');
    const tiffSupportMessage = document.getElementById('tiffSupportMessage');

    // --- Variáveis de Estado ---
    let currentImage = null; // Para imagens JPG/PNG/etc.
    let currentTiffImage = null; // Para imagens TIFF decodificadas

    let isDrawing = false;
    let startPoint = { x: undefined, y: undefined };
    let endPoint = { x: undefined, y: undefined };
    let measuredPixels = 0;

    let currentMeasurementMode = 'measureTool';

    let scale = 1.0;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let lastPanX, lastPanY;

    let tiffModuleLoaded = false; // Flag para verificar se tiff.js foi carregado
    let Tiff = null; // A instância global de Tiff.js, se carregada

    // Caminho base para os arquivos tiff.js e tiff.wasm
    // CERTIFIQUE-SE DE QUE ESTE CAMINHO ESTÁ CORRETO NO SEU REPOSITÓRIO!
    // Ex: Se você colocou 'tiff.min.js' e 'tiff.wasm' dentro de uma pasta 'lib/tiff' na raiz do seu repo.
    const tiffjsBase = './lib/tiff/'; 

    const unitConversion = {
        'nm': 0.001,
        'um': 1,
        'mm': 1000
    };

    // --- Funções de Ajuda de UI ---
    function showMessage(element, message, isError = false) {
        element.textContent = message;
        element.className = `message ${isError ? 'error-message' : 'info-text'}`;
        if (!isError) element.classList.add('success-message'); // Adiciona classe para info/success
        element.style.display = 'block';
    }

    function hideMessage(element) {
        element.style.display = 'none';
        element.textContent = '';
    }

    // --- Funções de Desenho ---
    function clearCanvas() {
        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    }

    function drawImage() {
        if (!currentImage && !currentTiffImage) return;

        const imgToDraw = currentImage || currentTiffImage;

        // Ajusta o tamanho do canvas HTML para o tamanho do container visível
        const parentContainer = imageCanvas.parentElement;
        const containerWidth = parentContainer.offsetWidth;
        const containerHeight = Math.min(500, imgToDraw.height);

        imageCanvas.style.width = `${containerWidth}px`;
        imageCanvas.style.height = `${containerHeight}px`;

        imageCanvas.width = imgToDraw.width;
        imageCanvas.height = imgToDraw.height;

        clearCanvas();
        ctx.save();

        ctx.translate(panX, panY);
        ctx.scale(scale, scale);

        // Se for uma imagem Tiff decodificada (Array de pixels), desenha-a manualmente
        if (currentTiffImage && currentTiffImage.data) {
             const imageData = ctx.createImageData(currentTiffImage.width, currentTiffImage.height);
             // currentTiffImage.data já deve ser um Uint8ClampedArray no formato RGBA
             // Se for apenas RGB, precisamos converter
             if (currentTiffImage.data.length === currentTiffImage.width * currentTiffImage.height * 3) {
                for (let i = 0, j = 0; i < currentTiffImage.data.length; i += 3, j += 4) {
                    imageData.data[j] = currentTiffImage.data[i];
                    imageData.data[j + 1] = currentTiffImage.data[i + 1];
                    imageData.data[j + 2] = currentTiffImage.data[i + 2];
                    imageData.data[j + 3] = 255; // Alpha channel
                }
             } else { // Assume que já é RGBA
                imageData.data.set(currentTiffImage.data);
             }
            ctx.putImageData(imageData, 0, 0);
        } else { // Imagem nativa do navegador (JPG, PNG, etc.)
            ctx.drawImage(imgToDraw, 0, 0);
        }

        if (currentMeasurementMode !== 'useImageWidth' && startPoint.x !== undefined && endPoint.x !== undefined) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2 / scale;
            ctx.beginPath();
            
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.stroke();

            if (measuredPixels > 0) {
                const midX = (startPoint.x + endPoint.x) / 2;
                const midY = (startPoint.y + endPoint.y) / 2;
                ctx.fillStyle = 'yellow';
                ctx.font = `${14 / scale}px Arial`;
                ctx.fillText(`${measuredPixels.toFixed(2)} px`, midX + (10 / scale), midY - (10 / scale));
            }
        }

        ctx.restore();
    }

    function resetView() {
        scale = 1.0;
        panX = 0;
        panY = 0;
        updateZoomLevel();
        drawImage();
    }

    function updateZoomLevel() {
        currentZoomSpan.textContent = `${Math.round(scale * 100)}%`;
    }

    // --- Lógica de Carregamento e Inicialização ---
    async function loadImageFile(file) {
        hideMessage(errorMessage);
        loadingOverlay.style.display = 'flex';
        currentImage = null; // Limpa imagem nativa
        currentTiffImage = null; // Limpa imagem tiff

        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        if (fileExtension === 'tif' || fileExtension === 'tiff') {
            if (!tiffModuleLoaded) {
                showMessage(errorMessage, 'Suporte a TIF/TIFF não está ativado. Por favor, marque a caixa "Habilitar suporte a TIF/TIFF" e tente novamente.', true);
                loadingOverlay.style.display = 'none';
                return;
            }
            try {
                // Leitura do arquivo binário para Tiff.js
                const arrayBuffer = await file.arrayBuffer();
                const tiff = Tiff({ buffer: arrayBuffer });
                const width = tiff.width();
                const height = tiff.height();
                // Assume a primeira imagem no TIFF
                const rgbaData = tiff.readRGBAImage(); // Retorna Uint8ClampedArray
                
                currentTiffImage = {
                    width: width,
                    height: height,
                    data: rgbaData
                };
            } catch (error) {
                console.error("Erro ao decodificar TIFF:", error);
                showMessage(errorMessage, `Não foi possível ler o arquivo TIFF. Ele pode ser um formato não suportado ou estar corrompido. Erro: ${error.message}`, true);
                loadingOverlay.style.display = 'none';
                return;
            }

        } else { // Formatos nativos do navegador
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        currentImage = img;
                        resolve();
                    };
                    img.onerror = () => {
                        reject('Erro ao carregar a imagem. Verifique o formato ou se o arquivo está corrompido.');
                    };
                    img.src = event.target.result;
                };
                reader.onerror = () => {
                    reject('Erro ao ler o arquivo.');
                };
                reader.readAsDataURL(file);
            });
        }
        
        // Finaliza o carregamento comum para ambos os tipos de imagem
        const imgToDraw = currentImage || currentTiffImage;
        imageCanvas.width = imgToDraw.width;
        imageCanvas.height = imgToDraw.height;

        resetView();
        drawImage();
        
        measurementSection.style.display = 'block';
        canvasControls.style.display = 'flex';
        resultSection.style.display = 'none';
        resetMeasurement();
        loadingOverlay.style.display = 'none';
        imageWidthValueInput.value = '';

        if (currentMeasurementMode === 'useImageWidth') {
            measurementInfo.textContent = `Largura da imagem: ${imgToDraw.width} pixels`;
        }
    }

    function resetMeasurement() {
        startPoint = { x: undefined, y: undefined };
        endPoint = { x: undefined, y: undefined };
        measuredPixels = 0;
        measurementInfo.textContent = '';
        drawImage();

        updateCanvasCursor();
    }

    function updateCanvasCursor() {
        if (currentMeasurementMode === 'useImageWidth' || isPanning) {
            imageCanvas.style.cursor = 'grab';
        } else {
            imageCanvas.style.cursor = 'crosshair';
        }
    }

    // --- Persistência de Dados (localStorage) ---
    function saveSettings() {
        localStorage.setItem('scaleValue', scaleValueInput.value);
        localStorage.setItem('scaleUnit', scaleUnitSelect.value);
        localStorage.setItem('imageWidthValue', imageWidthValueInput.value);
        localStorage.setItem('imageWidthUnit', imageWidthUnitSelect.value);
        localStorage.setItem('currentMeasurementMode', currentMeasurementMode);
        localStorage.setItem('enableTiffSupport', enableTiffSupportCheckbox.checked);
    }

    async function loadSettings() {
        scaleValueInput.value = localStorage.getItem('scaleValue') || '50';
        scaleUnitSelect.value = localStorage.getItem('scaleUnit') || 'um';
        imageWidthValueInput.value = localStorage.getItem('imageWidthValue') || '';
        imageWidthUnitSelect.value = localStorage.getItem('imageWidthUnit') || 'um';
        
        const savedMode = localStorage.getItem('currentMeasurementMode') || 'measureTool';
        setMeasurementMode(savedMode); 

        // Carrega estado do checkbox TIFF
        const tiffEnabled = localStorage.getItem('enableTiffSupport') === 'true';
        enableTiffSupportCheckbox.checked = tiffEnabled;
        if (tiffEnabled) {
            await loadTiffModule(); // Carrega o módulo se estava ativado
        }
    }

    // --- Validação de Inputs em Tempo Real ---
    function validateInput(inputElement, errorElement) {
        const value = parseFloat(inputElement.value);
        if (isNaN(value) || value <= 0) {
            showMessage(errorElement, 'Por favor, insira um valor numérico positivo.', true);
            inputElement.classList.add('invalid');
            return false;
        } else {
            hideMessage(errorElement);
            inputElement.classList.remove('invalid');
            return true;
        }
    }

    scaleValueInput.addEventListener('input', () => { validateInput(scaleValueInput, scaleValueError); saveSettings(); });
    scaleUnitSelect.addEventListener('change', saveSettings);
    imageWidthValueInput.addEventListener('input', () => { validateInput(imageWidthValueInput, imageWidthValueError); saveSettings(); });
    imageWidthUnitSelect.addEventListener('change', saveSettings);

    // --- Funções de Conversão de Coordenadas ---
    function getCanvasToImageCoords(canvasX, canvasY) {
        const imageX = (canvasX - panX) / scale;
        const imageY = (canvasY - panY) / scale;
        return { x: imageX, y: imageY };
    }

    // --- Manipuladores de Eventos ---

    // Upload de Imagem
    imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];

            if (!allowedTypes.includes(`image/${fileExtension}`) && fileExtension !== 'tif' && fileExtension !== 'tiff') {
                showMessage(errorMessage, `Formato de arquivo "${fileExtension}" não suportado. Por favor, use JPG, PNG, GIF, BMP, WEBP ou ative o suporte a TIF/TIFF.`, true);
                e.target.value = '';
                return;
            }
            if ((fileExtension === 'tif' || fileExtension === 'tiff') && !tiffModuleLoaded) {
                 showMessage(errorMessage, `Para abrir arquivos TIF/TIFF, você precisa ativar a opção "Habilitar suporte a TIF/TIFF" e aguardar o carregamento do módulo.`, true);
                 e.target.value = '';
                 return;
            }
            await loadImageFile(file);
        }
    });

    imageCanvas.addEventListener('mousedown', (e) => {
        if (!currentImage && !currentTiffImage) return;

        const rect = imageCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (currentMeasurementMode !== 'useImageWidth' && (e.button === 0)) {
            isDrawing = true;
            startPoint = getCanvasToImageCoords(mouseX, mouseY);
            endPoint = { x: startPoint.x, y: startPoint.y };
            imageCanvas.style.cursor = 'grabbing';
            e.preventDefault();
            resetMeasurement(); 
        } else if (e.button === 2 || e.button === 1 || (e.button === 0 && !isDrawing)) { 
            isPanning = true;
            lastPanX = e.clientX;
            lastPanY = e.clientY;
            imageCanvas.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });

    imageCanvas.addEventListener('mousemove', (e) => {
        if (!currentImage && !currentTiffImage) return;

        const rect = imageCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const imgCoords = getCanvasToImageCoords(mouseX, mouseY);
        coordinatesDisplay.textContent = `X:${Math.round(imgCoords.x)} Y:${Math.round(imgCoords.y)}`;
        coordinatesDisplay.style.display = 'block';

        if (isDrawing && currentMeasurementMode !== 'useImageWidth') {
            let currentImgCoords = getCanvasToImageCoords(mouseX, mouseY);

            if (e.shiftKey) {
                const dx = Math.abs(currentImgCoords.x - startPoint.x);
                const dy = Math.abs(currentImgCoords.y - startPoint.y);
                if (dx > dy) {
                    currentImgCoords.y = startPoint.y;
                } else {
                    currentImgCoords.x = startPoint.x;
                }
            }
            endPoint = currentImgCoords;

            measuredPixels = Math.sqrt(
                Math.pow(endPoint.x - startPoint.x, 2) +
                Math.pow(endPoint.y - startPoint.y, 2)
            );
            measurementInfo.textContent = `Linha de medição: ${measuredPixels.toFixed(2)} pixels`;
            drawImage();
        } else if (isPanning) {
            const dx = e.clientX - lastPanX;
            const dy = e.clientY - lastPanY;
            panX += dx;
            panY += dy;
            lastPanX = e.clientX;
            lastPanY = e.clientY;
            drawImage();
        }
    });

    imageCanvas.addEventListener('mouseup', (e) => {
        if (!currentImage && !currentTiffImage) return;
        if (isDrawing && currentMeasurementMode !== 'useImageWidth') {
            isDrawing = false;
            drawImage();
        }
        isPanning = false;
        updateCanvasCursor();
    });

    imageCanvas.addEventListener('mouseout', () => {
        coordinatesDisplay.style.display = 'none';
        if (isDrawing) {
            isDrawing = false;
            drawImage();
        }
        if (isPanning) {
            isPanning = false;
            updateCanvasCursor();
            drawImage();
        }
    });

    imageCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

    imageCanvas.addEventListener('wheel', (e) => {
        if (!currentImage && !currentTiffImage) return;
        e.preventDefault();

        const zoomFactor = 1.1;
        const rect = imageCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const oldScale = scale;
        if (e.deltaY < 0) {
            scale *= zoomFactor;
        } else {
            scale /= zoomFactor;
        }

        scale = Math.max(0.1, Math.min(scale, 10.0));

        const imgMouseX = (mouseX - panX) / oldScale;
        const imgMouseY = (mouseY - panY) / oldScale;

        panX = mouseX - (imgMouseX * scale);
        panY = mouseY - (imgMouseY * scale);

        updateZoomLevel();
        drawImage();
    });

    function setMeasurementMode(mode) {
        currentMeasurementMode = mode;
        measureToolBtn.classList.remove('active');
        measureObjectBtn.classList.remove('active');
        useImageWidthBtn.classList.remove('active');

        scaleInputGroup.style.display = 'none';
        imageWidthInputGroup.style.display = 'none';

        if (mode === 'measureTool') {
            measureToolBtn.classList.add('active');
            scaleInputGroup.style.display = 'block';
            document.querySelector('#scaleInputGroup label').textContent = 'Valor real da barra de escala:';
        } else if (mode === 'measureObject') {
            measureObjectBtn.classList.add('active');
            scaleInputGroup.style.display = 'block';
            document.querySelector('#scaleInputGroup label').textContent = 'Valor real do objeto (conhecido):';
        } else if (mode === 'useImageWidth') {
            useImageWidthBtn.classList.add('active');
            imageWidthInputGroup.style.display = 'block';
        }
        resetMeasurement();
        saveSettings();
    }

    measureToolBtn.addEventListener('click', () => setMeasurementMode('measureTool'));
    measureObjectBtn.addEventListener('click', () => setMeasurementMode('measureObject'));
    useImageWidthBtn.addEventListener('click', () => setMeasurementMode('useImageWidth'));

    zoomInBtn.addEventListener('click', () => {
        if (!currentImage && !currentTiffImage) return;
        const zoomFactor = 1.2;
        const oldScale = scale;
        scale = Math.min(scale * zoomFactor, 10.0);
        const centerX = imageCanvas.width / 2;
        const centerY = imageCanvas.height / 2;
        panX = centerX - ((centerX - panX) / oldScale) * scale;
        panY = centerY - ((centerY - panY) / oldScale) * scale;
        updateZoomLevel();
        drawImage();
    });

    zoomOutBtn.addEventListener('click', () => {
        if (!currentImage && !currentTiffImage) return;
        const zoomFactor = 1.2;
        const oldScale = scale;
        scale = Math.max(scale / zoomFactor, 0.1);
        const centerX = imageCanvas.width / 2;
        const centerY = imageCanvas.height / 2;
        panX = centerX - ((centerX - panX) / oldScale) * scale;
        panY = centerY - ((centerY - panY) / oldScale) * scale;
        updateZoomLevel();
        drawImage();
    });

    resetViewBtn.addEventListener('click', resetView);
    clearMeasurementBtn.addEventListener('click', resetMeasurement);

    calculateBtn.addEventListener('click', () => {
        hideMessage(errorMessage);
        hideMessage(scaleValueError);
        hideMessage(imageWidthValueError);

        let realValue, unit, pixelsToUse;
        let isValid = true;
        const imgDimensions = currentImage || currentTiffImage;

        if (!imgDimensions) {
            showMessage(errorMessage, 'Por favor, carregue uma imagem primeiro.', true);
            return;
        }

        if (currentMeasurementMode === 'useImageWidth') {
            isValid = validateInput(imageWidthValueInput, imageWidthValueError);
            realValue = parseFloat(imageWidthValueInput.value);
            unit = imageWidthUnitSelect.value;
            pixelsToUse = imgDimensions.width;
            if (!isValid) return;
        } else { // 'measureTool' ou 'measureObject'
            isValid = validateInput(scaleValueInput, scaleValueError);
            realValue = parseFloat(scaleValueInput.value);
            unit = scaleUnitSelect.value;
            pixelsToUse = measuredPixels;
            if (pixelsToUse === 0 || isNaN(pixelsToUse) || !isValid) {
                showMessage(errorMessage, 'Por favor, meça a linha na imagem e preencha o valor real corretamente.', true);
                return;
            }
        }
        
        const realValueInMicrometers = realValue * unitConversion[unit];

        if (pixelsToUse <= 0) {
            showMessage(errorMessage, 'Não foi possível obter um valor válido em pixels para o cálculo. Meça a linha ou carregue a imagem.', true);
            return;
        }

        const umPerPixel = realValueInMicrometers / pixelsToUse;
        resultValueSpan.textContent = `${umPerPixel.toFixed(4)} µm/pixel`;
        resultSection.style.display = 'block';
        saveSettings();
    });

    downloadTxtBtn.addEventListener('click', () => {
        const umPerPixelText = resultValueSpan.textContent;
        if (umPerPixelText && resultSection.style.display === 'block') {
            const filename = 'sem_um_per_pixel_scale.txt';
            const textContent = `Fator de escala (µm/pixel) para sua imagem: ${umPerPixelText}\n\nEste valor pode ser usado em softwares de análise de imagem para converter pixels em micrômetros.`;
            const blob = new Blob([textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            showMessage(errorMessage, 'Nenhum resultado para baixar. Calcule o valor primeiro.', true);
        }
    });

    // --- Carregamento Condicional do Módulo TIFF ---
    async function loadTiffModule() {
        if (tiffModuleLoaded) return; // Já carregado

        hideMessage(tiffSupportMessage);
        showMessage(tiffLoadingMessage, 'Carregando módulo TIF, aguarde (pode levar alguns segundos)...');

        try {
            // Carrega o script principal de tiff.js
            const script = document.createElement('script');
            script.src = tiffjsBase + 'tiff.min.js';
            script.async = true;

            await new Promise((resolve, reject) => {
                script.onload = () => {
                    // Após o script principal carregar, Tiff.js define Tiff.wasmPath
                    // É importante que Tiff.wasmPath seja definido ANTES de instanciar Tiff
                    window.Tiff.wasmPath = tiffjsBase + 'tiff.wasm';
                    Tiff = window.Tiff; // Salva a referência global
                    resolve();
                };
                script.onerror = reject;
                document.head.appendChild(script);
            });
            tiffModuleLoaded = true;
            hideMessage(tiffLoadingMessage);
            showMessage(tiffSupportMessage, 'Suporte a TIF/TIFF ativado!', false); // Use false para info/success
        } catch (error) {
            console.error("Erro ao carregar módulo TIFF:", error);
            hideMessage(tiffLoadingMessage);
            showMessage(errorMessage, `Falha ao carregar o módulo TIF/TIFF. Verifique a conexão ou se os arquivos "${tiffjsBase}tiff.min.js" e "${tiffjsBase}tiff.wasm" estão no local correto.`, true);
            enableTiffSupportCheckbox.checked = false; // Desativa o checkbox
            tiffModuleLoaded = false;
        }
    }

    enableTiffSupportCheckbox.addEventListener('change', async () => {
        if (enableTiffSupportCheckbox.checked) {
            await loadTiffModule();
        } else {
            tiffModuleLoaded = false;
            Tiff = null; // Limpa a referência
            hideMessage(tiffLoadingMessage);
            hideMessage(tiffSupportMessage);
            showMessage(errorMessage, 'Suporte a TIF/TIFF desativado. Recarregue a página ou limpe a imagem se ela for TIFF.', false); // Mensagem informativa
        }
        saveSettings(); // Salva o estado do checkbox
    });


    // --- Inicialização ---
    loadSettings();
    // O cursor inicial é definido no resetMeasurement() que é chamado pelo setMeasurementMode()
});