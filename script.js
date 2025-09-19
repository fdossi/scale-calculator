async function loadImageFile(file) {
    hideMessage(errorMessage);
    showLoadingOverlay('Carregando imagem...');

    if (currentTiffImage && currentTiffImage.bitmap && typeof currentTiffImage.bitmap.close === 'function') {
        currentTiffImage.bitmap.close();
    }

    currentImage = null;
    currentTiffImage = null;

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'tif' || fileExtension === 'tiff') {
        if (!tiffModuleLoaded) {
            showMessage(errorMessage, 'Suporte a TIF/TIFF não está ativado. Por favor, marque a caixa "Habilitar suporte a TIF/TIFF" e tente novamente.', true);
            hideLoadingOverlay();
            return;
        }

        if (typeof Tiff !== 'function') {
            showMessage(errorMessage, 'O módulo TIF/TIFF não pôde ser inicializado. Verifique se os arquivos tiff.min.js e tiff.wasm estão acessíveis.', true);
            hideLoadingOverlay();
            return;
        }

        try {
            updateLoadingMessage('Processando arquivo TIFF...');
            updateLoadingProgress(null);
            const arrayBuffer = await file.arrayBuffer();
            const tiff = new Tiff({ buffer: arrayBuffer });
            const width = tiff.width();
            const height = tiff.height();
            const rgbaData = tiff.readRGBAImage();

            let imageData = new ImageData(new Uint8ClampedArray(rgbaData), width, height);
            let bitmap = null;

            try {
                bitmap = await createImageBitmap(imageData);
            } catch (e) {
                console.warn('Fallback para canvas devido a erro no createImageBitmap', e);
            }

            let fallbackCanvas = null;
            if (!bitmap) {
                fallbackCanvas = document.createElement('canvas');
                fallbackCanvas.width = width;
                fallbackCanvas.height = height;
                const ctx = fallbackCanvas.getContext('2d');
                ctx.putImageData(imageData, 0, 0);
            }

            if (typeof tiff.close === 'function') tiff.close();

            currentTiffImage = {
                width,
                height,
                bitmap,
                canvas: fallbackCanvas
            };
        } catch (error) {
            showMessage(errorMessage, 'Erro ao carregar TIFF: ' + error.message, true);
            hideLoadingOverlay();
            return;
        }
    } else {
        try {
            await new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onloadstart = () => {
                    updateLoadingMessage('Lendo arquivo da imagem...');
                    updateLoadingProgress(0);
                };

                reader.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        updateLoadingMessage(`Lendo arquivo... ${percent}%`);
                        updateLoadingProgress(percent);
                    } else {
                        updateLoadingProgress(null);
                    }
                };

                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        currentImage = img;
                        updateLoadingProgress(100);
                        resolve();
                    };
                    img.onerror = () => reject(new Error('Erro ao carregar a imagem.'));
                    img.src = event.target.result;
                };

                reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
                reader.readAsDataURL(file);
            });
        } catch (error) {
            showMessage(errorMessage, 'Erro ao carregar imagem: ' + error.message, true);
            hideLoadingOverlay();
            resetFileInput();
            return;
        }
    }

    const { width, height } = getImageDimensions();
    if (!width || !height) {
        showMessage(errorMessage, 'Não foi possível determinar as dimensões da imagem.', true);
        hideLoadingOverlay();
        resetFileInput();
        return;
    }

    imageCanvas.width = width;
    imageCanvas.height = height;

    resetView();

    measurementSection.style.display = 'block';
    canvasControls.style.display = 'flex';
    resultSection.style.display = 'none';
    resetMeasurement();
    hideLoadingOverlay();
    imageWidthValueInput.value = '';

    if (currentMeasurementMode === 'useImageWidth') {
        measurementInfo.textContent = `Largura da imagem: ${width} pixels`;
    }

    imageUpload.value = '';
    showMessage(errorMessage, 'Imagem carregada com sucesso!', 'success');
}
