# Calculadora de Escala de Imagem SEM (µm/pixel)

[![GitHub Pages Status](https://github.com/fdossi/scale-calculator/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/fdossi/scale-calculator/actions/workflows/pages/pages-build-deployment)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## 🚀 Acesse o Aplicativo Online

Você pode acessar e usar a Calculadora de Escala de Imagem SEM diretamente no navegador, hospedada via GitHub Pages:

👉 [**Acesse a Calculadora de Escala (https://fdossi.github.io/scale-calculator)**] 👈
(Ex: `https://fdossi.github.io/scale-calculator/`)

## 📄 Sobre o Projeto

Este é um aplicativo web simples e intuitivo, desenvolvido em HTML, CSS e JavaScript puro, projetado para auxiliar pesquisadores e estudantes na determinação do fator de escala (micrômetros por pixel - µm/pixel) de imagens de Microscopia Eletrônica de Varredura (SEM) e outras imagens científicas que contenham uma barra de escala conhecida ou um objeto de tamanho conhecido.

O fator µm/pixel é crucial para a medição precisa de características em imagens digitais, permitindo converter distâncias em pixels para unidades de medida reais (nanômetros, micrômetros, milímetros).

### ✨ Funcionalidades Principais

* **Carregamento de Imagem:** Suporte a formatos de imagem comuns como JPG, PNG, GIF, BMP, WEBP.
* **Suporte Opcional a TIF/TIFF:** Ative um módulo de carregamento dinâmico para trabalhar com arquivos de imagem TIF/TIFF, com um aviso sobre o carregamento adicional.
* **Ferramentas de Medição Flexíveis:**
    * **Medir Barra de Escala:** Desenhe uma linha sobre a barra de escala conhecida na imagem.
    * **Medir Objeto (conhecido):** Desenhe uma linha sobre um objeto de tamanho real conhecido na imagem.
    * **Usar Largura da Imagem:** Calibre a imagem usando a sua largura total em pixels e um valor real conhecido.
* **Zoom e Pan Interativos:** Navegue e inspecione detalhes da imagem com zoom (scroll do mouse ou botões) e pan (arrastar com botão direito/meio do mouse).
* **Cursor Dinâmico:** O cursor do mouse muda para indicar a ferramenta ativa (medição, pan).
* **Linha de Medição com Extensão e Snapping:** Exibe o comprimento em pixels em tempo real enquanto arrasta, e permite "snapping" para linhas horizontais/verticais perfeitas (segure `Shift`).
* **Exibição de Coordenadas:** Veja as coordenadas X,Y do mouse sobre a imagem em pixels originais.
* **Validação de Input em Tempo Real:** Feedback instantâneo para entradas numéricas inválidas.
* **Download de Resultados:** Baixe o fator de escala calculado em um arquivo `.txt` para uso posterior.
* **Responsivo:** Ajustes básicos para tornar a interface utilizável em diferentes tamanhos de tela.

## 🛠️ Como Usar (Passo a Passo)

1.  **Acesse o Aplicativo:** Abra o link do GitHub Pages fornecido acima.
2.  **Carregar Imagem:** Clique em "Escolher arquivo" e selecione sua imagem SEM ou científica.
    * Se sua imagem for `.tif` ou `.tiff`, marque a caixa **"Habilitar suporte a TIF/TIFF"** primeiro e aguarde a mensagem de confirmação de carregamento do módulo.
3.  **Escolher Ferramenta de Medição:**
    * Selecione "Medir Barra de Escala" (padrão) ou "Medir Objeto (conhecido)" se você for desenhar uma linha.
    * Selecione "Usar Largura da Imagem" se você conhece a largura total da sua imagem em unidades reais.
4.  **Realizar a Medição no Canvas:**
    * **Para Medição de Linha:**
        * Clique e arraste o mouse sobre a barra de escala ou objeto conhecido na imagem.
        * Um texto temporário mostrará o comprimento em pixels.
        * (Opcional) Mantenha a tecla `Shift` pressionada para desenhar linhas perfeitamente horizontais ou verticais.
        * Use a roda do mouse para `zoom` e clique direito/botão do meio para `pan` (arrastar a imagem).
    * **Para Usar Largura da Imagem:**
        * A imagem inteira será considerada, não é necessário desenhar.
5.  **Inserir Valor Real:**
    * No campo abaixo do canvas, insira o valor real da sua barra de escala (ou objeto, ou largura da imagem) e selecione a unidade correta (nm, µm, mm).
6.  **Calcular:** Clique no botão "Calcular µm/pixel".
7.  **Visualizar e Baixar:** O resultado será exibido e você poderá fazer o download do valor em um arquivo de texto.

## ⚙️ Configuração Local (Para Desenvolvedores)

Se você deseja executar ou contribuir com o projeto localmente:

1.  **Clone o Repositório:**
    ```bash
    git clone [https://github.com/fdossi/scale-calculator.git](https://github.com/fdossi/scale-calculator.git)
    cd scale-calculator
    ```
2.  **Baixe os Arquivos TIFF.js:**
    Para habilitar o suporte a TIF/TIFF, você precisa dos arquivos `tiff.min.js` e `tiff.wasm`.
    * Crie a pasta: `mkdir -p lib/tiff`
    * Baixe `tiff.min.js` de [jsdelivr.com/npm/tiff.js@1.0.0/tiff.min.js](https://cdn.jsdelivr.net/npm/tiff.js@1.0.0/tiff.min.js) e salve-o em `lib/tiff/`.
    * Baixe `tiff.wasm` de [jsdelivr.com/npm/tiff.js@1.0.0/tiff.wasm](https://cdn.jsdelivr.net/npm/tiff.js@1.0.0/tiff.wasm) e salve-o em `lib/tiff/`.
3.  **Abra `index.html`:** Simplesmente abra o arquivo `index.html` no seu navegador web. Não é necessário um servidor web para este projeto simples, embora você possa usar um (ex: Live Server para VS Code) se preferir.

## 🤝 Contribuição

Contribuições são muito bem-vindas\! Se você tem ideias para melhorias, encontrou um bug ou gostaria de adicionar novas funcionalidades:

1.  Faça um Fork do projeto.
2.  Crie uma nova Branch (`git checkout -b feature/minha-nova-funcionalidade`).
3.  Faça suas mudanças e commit (`git commit -m 'feat: adiciona nova funcionalidade X'`).
4.  Envie para o seu Fork (`git push origin feature/minha-nova-funcionalidade`).
5.  Abra um Pull Request descrevendo suas mudanças.

## 📄 Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

Feito com ❤️ por [[fdossi](https://fdossi.github.io/)]