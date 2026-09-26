import os
import sys
import io
import time
import base64
import argparse
import webbrowser
from threading import Thread

# Include the PixelAI python directory for modules (like pixelate)
PIXELAI_DIR = r"C:\Users\Deon\AppData\Roaming\Aseprite\extensions\PixelAI\python"
if PIXELAI_DIR not in sys.path:
    sys.path.insert(0, PIXELAI_DIR)

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
from PIL import Image
import torch

try:
    from pixelate import pixelate
except ImportError:
    pixelate = None

app = Flask(__name__)
CORS(app)

pipeline = None
img2img_pipeline = None
MODEL_NAME = "Onodofthenorth/SD_PixelArt_SpriteSheet_Generator"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

def load_pipeline():
    global pipeline, img2img_pipeline
    if pipeline is not None:
        return
    print(f"[*] Carregando modelo '{MODEL_NAME}' no dispositivo '{DEVICE}'...")
    from diffusers import StableDiffusionPipeline, StableDiffusionImg2ImgPipeline
    precision = torch.float16 if DEVICE == "cuda" else torch.float32
    try:
        pipeline = StableDiffusionPipeline.from_pretrained(
            MODEL_NAME,
            torch_dtype=precision,
            use_safetensors=None,
            local_files_only=True
        )
    except Exception as e:
        print(f"[!] Fallback ao carregar modelo: {e}")
        pipeline = StableDiffusionPipeline.from_pretrained(
            MODEL_NAME,
            torch_dtype=precision,
            use_safetensors=None
        )
    pipeline = pipeline.to(DEVICE)
    try:
        pipeline.enable_attention_slicing()
    except Exception:
        pass
    
    # Create img2img pipeline sharing components (0 extra RAM!)
    img2img_pipeline = StableDiffusionImg2ImgPipeline(**pipeline.components)
    try:
        img2img_pipeline.enable_attention_slicing()
    except Exception:
        pass

    print("[✓] Modelos Text2Img e Img2Img prontos!")

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pixel Art AI Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #101216;
      --card: #181b22;
      --card-border: #282d3a;
      --accent: #ff6b35;
      --accent-glow: rgba(255, 107, 53, 0.35);
      --accent-hover: #ff8555;
      --text: #f0f3f8;
      --text-muted: #8b94a5;
      --input-bg: #0d0f13;
      --input-border: #2c3240;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      background: var(--card);
      border-bottom: 1px solid var(--card-border);
      padding: 14px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 32px;
      height: 32px;
      background: var(--accent);
      box-shadow: 0 0 15px var(--accent-glow);
      border-radius: 6px;
      display: grid;
      place-items: center;
      font-family: 'Press Start 2P', cursive;
      font-size: 14px;
      color: #fff;
    }

    .logo-text {
      font-family: 'Press Start 2P', cursive;
      font-size: 13px;
      color: var(--text);
      letter-spacing: 0.5px;
    }

    .badge-status {
      font-size: 12px;
      padding: 5px 12px;
      border-radius: 20px;
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.3);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 8px #4ade80;
    }

    .container {
      max-width: 1350px;
      margin: 0 auto;
      padding: 24px;
      display: grid;
      grid-template-columns: 460px 1fr;
      gap: 24px;
      flex: 1;
      width: 100%;
    }

    @media (max-width: 950px) {
      .container { grid-template-columns: 1fr; }
    }

    .panel {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .panel-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Tabs */
    .mode-tabs {
      display: flex;
      gap: 6px;
      background: var(--input-bg);
      padding: 4px;
      border-radius: 8px;
      border: 1px solid var(--input-border);
    }
    .tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .tab-btn.active {
      background: var(--card);
      color: var(--text);
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }

    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--text);
    }

    textarea, input[type="text"], select {
      width: 100%;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 8px;
      color: var(--text);
      padding: 10px 12px;
      font-family: inherit;
      font-size: 14px;
      transition: all 0.2s;
    }

    textarea:focus, input:focus, select:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }

    textarea {
      resize: vertical;
      min-height: 70px;
    }

    /* Upload Dropzone */
    .dropzone {
      border: 2px dashed var(--input-border);
      border-radius: 8px;
      padding: 18px;
      text-align: center;
      cursor: pointer;
      background: var(--input-bg);
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .dropzone:hover, .dropzone.dragover {
      border-color: var(--accent);
      background: rgba(255, 107, 53, 0.05);
    }
    .upload-preview {
      max-width: 100%;
      max-height: 120px;
      border-radius: 6px;
      display: none;
      margin-top: 6px;
      image-rendering: pixelated;
    }

    .quick-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }

    .chip {
      background: #20242e;
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      padding: 4px 10px;
      border-radius: 14px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .chip:hover {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .slider-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .slider-val {
      font-weight: 700;
      color: var(--accent);
      font-size: 13px;
    }

    input[type="range"] {
      width: 100%;
      accent-color: var(--accent);
    }

    .btn-generate {
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 14px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 18px var(--accent-glow);
      transition: all 0.2s;
    }
    .btn-generate:hover:not(:disabled) {
      background: var(--accent-hover);
      transform: translateY(-1px);
    }
    .btn-generate:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 3px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.8s linear infinite;
      display: none;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Preview section */
    .preview-box {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #090a0d;
      border: 1px dashed var(--card-border);
      border-radius: 10px;
      min-height: 420px;
      position: relative;
      overflow: hidden;
    }

    .checkerboard {
      background-image: 
        linear-gradient(45deg, #181b22 25%, transparent 25%), 
        linear-gradient(-45deg, #181b22 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #181b22 75%), 
        linear-gradient(-45deg, transparent 75%, #181b22 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
    }

    #preview-img {
      image-rendering: pixelated;
      max-width: 90%;
      max-height: 380px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      transition: transform 0.15s ease-out;
    }

    .empty-state {
      color: var(--text-muted);
      text-align: center;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .empty-icon {
      font-size: 40px;
      opacity: 0.5;
    }

    .preview-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding-top: 14px;
      border-top: 1px solid var(--card-border);
    }

    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-tool {
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-tool:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .btn-tool.active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }

    .btn-download {
      background: #22c55e;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-download:hover {
      background: #16a34a;
    }

    /* History bar */
    .history-section {
      margin-top: 12px;
    }
    .history-list {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding: 8px 2px;
    }
    .history-thumb {
      width: 60px;
      height: 60px;
      border-radius: 6px;
      border: 2px solid var(--card-border);
      background: #090a0d;
      image-rendering: pixelated;
      object-fit: contain;
      cursor: pointer;
      transition: all 0.15s;
    }
    .history-thumb:hover {
      border-color: var(--accent);
      transform: scale(1.05);
    }

    .meta-tag {
      font-size: 12px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>

  <header>
    <div class="logo-box">
      <div class="logo-icon">PX</div>
      <div class="logo-text">PIXEL ART STUDIO</div>
    </div>
    <div class="badge-status">
      <div class="badge-dot"></div>
      <span id="model-badge">SD PixelArt SpriteSheet</span>
    </div>
  </header>

  <div class="container">
    <!-- Controls Panel -->
    <div class="panel">
      <div class="mode-tabs">
        <button class="tab-btn active" id="tab-t2i" onclick="setMode('txt2img')">📝 Texto ➔ Sprite</button>
        <button class="tab-btn" id="tab-i2i" onclick="setMode('img2img')">🖼️ Imagem ➔ Sprite (IA)</button>
        <button class="tab-btn" id="tab-pix" onclick="setMode('pixelate_only')">⚡ Pixelizar Direto</button>
      </div>

      <!-- Upload Section (Hidden in txt2img mode) -->
      <div id="upload-section" style="display: none;">
        <label>Upload da Imagem de Referência:</label>
        <div class="dropzone" id="dropzone" onclick="document.getElementById('file-input').click()">
          <span style="font-size: 24px;">📁</span>
          <span style="font-size: 13px; color: var(--text-muted);">Clique ou arraste uma imagem aqui</span>
          <input type="file" id="file-input" accept="image/*" style="display: none;" onchange="handleFile(this.files[0])">
          <img id="upload-preview" class="upload-preview">
        </div>

        <div id="strength-box" style="margin-top: 12px;">
          <div class="slider-row">
            <label for="strength">Força de Transformação (Strength):</label>
            <span class="slider-val" id="strength-val">0.65</span>
          </div>
          <input type="range" id="strength" min="0.2" max="0.9" step="0.05" value="0.65" oninput="document.getElementById('strength-val').innerText = this.value">
          <small style="color: var(--text-muted); font-size: 11px;">0.3 = bem próximo do desenho original | 0.8 = redesenho mais livre.</small>
        </div>
      </div>

      <!-- Prompt Section -->
      <div id="prompt-section">
        <label for="prompt">Prompt (Descrição do Sprite):</label>
        <textarea id="prompt" placeholder="Ex: pixel art, cute knight character with a blue cape, 16-bit style, front view"></textarea>
        <div class="quick-chips">
          <span class="chip" onclick="setPrompt('pixel art, cute slime monster, green, 16-bit')">+ Slime</span>
          <span class="chip" onclick="setPrompt('pixel art, red potion bottle with magical glow, game item')">+ Poção</span>
          <span class="chip" onclick="setPrompt('pixel art, cyberpunk bounty hunter, neon lights, 32-bit')">+ Cyberpunk</span>
          <span class="chip" onclick="setPrompt('pixel art, treasure chest with golden coins, game asset')">+ Baú</span>
        </div>
      </div>

      <div id="negative-section">
        <label for="negative_prompt">Prompt Negativo:</label>
        <input type="text" id="negative_prompt" value="blurry, smooth, realistic, photographic, 3d render, low quality, noise, antialiased">
      </div>

      <div class="grid-2">
        <div>
          <label for="pixel_size">Tamanho do Pixel Art:</label>
          <select id="pixel_size">
            <option value="16">16 × 16</option>
            <option value="32">32 × 32</option>
            <option value="48">48 × 48</option>
            <option value="64" selected>64 × 64</option>
            <option value="96">96 × 96</option>
            <option value="128">128 × 128</option>
          </select>
        </div>
        <div>
          <label for="colors">Paleta (Cores):</label>
          <select id="colors">
            <option value="4">4 Cores (GameBoy)</option>
            <option value="8">8 Cores</option>
            <option value="16" selected>16 Cores (SNES)</option>
            <option value="24">24 Cores</option>
            <option value="32">32 Cores</option>
            <option value="0">Sem limitação</option>
          </select>
        </div>
      </div>

      <div id="steps-section">
        <div class="slider-row">
          <label for="steps">Passos de Inferência (Steps):</label>
          <span class="slider-val" id="steps-val">12</span>
        </div>
        <input type="range" id="steps" min="8" max="25" value="12" oninput="document.getElementById('steps-val').innerText = this.value">
        <small style="color: var(--text-muted); font-size: 11px;">10 a 14 passos é ideal para gerar rápido no processador (~1 min).</small>
      </div>

      <div id="guidance-section">
        <div class="slider-row">
          <label for="guidance">Fidelidade ao Prompt (Guidance):</label>
          <span class="slider-val" id="guidance-val">7.5</span>
        </div>
        <input type="range" id="guidance" min="4.0" max="12.0" step="0.5" value="7.5" oninput="document.getElementById('guidance-val').innerText = this.value">
      </div>

      <div id="seed-section">
        <label for="seed">Seed (Semente):</label>
        <input type="text" id="seed" placeholder="-1 para aleatório" value="-1">
      </div>

      <button id="btn-generate" class="btn-generate" onclick="generate()">
        <span class="spinner" id="spinner"></span>
        <span id="btn-text">⚡ GERAR PIXEL ART</span>
      </button>

      <div id="status-text" style="font-size: 12px; text-align: center; color: var(--text-muted); min-height: 16px;"></div>
    </div>

    <!-- Preview Panel -->
    <div class="panel">
      <div class="panel-title">🖼️ Resultado & Visualização</div>

      <div class="preview-box checkerboard" id="preview-box">
        <div class="empty-state" id="empty-state">
          <div class="empty-icon">👾</div>
          <div>Seu sprite gerado aparecerá aqui.</div>
        </div>
        <img id="preview-img" style="display: none;">
      </div>

      <div class="preview-toolbar">
        <div class="zoom-controls">
          <span class="meta-tag">Zoom:</span>
          <button class="btn-tool" onclick="setZoom(1)">1x</button>
          <button class="btn-tool" onclick="setZoom(2)">2x</button>
          <button class="btn-tool active" onclick="setZoom(4)">4x</button>
          <button class="btn-tool" onclick="setZoom(8)">8x</button>
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="btn-download" class="btn-download" style="display: none;" onclick="downloadSprite()">
            ⬇️ Baixar PNG
          </button>
        </div>
      </div>

      <div class="history-section">
        <div class="panel-title" style="margin-bottom: 8px;">📜 Histórico da Sessão</div>
        <div class="history-list" id="history-list">
          <span style="font-size: 12px; color: var(--text-muted);">Nenhum sprite gerado ainda.</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    let currentMode = 'txt2img';
    let currentZoom = 4;
    let currentImageBase64 = null;
    let uploadedImageBase64 = null;
    let history = [];

    function setMode(mode) {
      currentMode = mode;
      document.getElementById('tab-t2i').classList.toggle('active', mode === 'txt2img');
      document.getElementById('tab-i2i').classList.toggle('active', mode === 'img2img');
      document.getElementById('tab-pix').classList.toggle('active', mode === 'pixelate_only');

      const isUpload = (mode === 'img2img' || mode === 'pixelate_only');
      document.getElementById('upload-section').style.display = isUpload ? 'block' : 'none';
      document.getElementById('strength-box').style.display = (mode === 'img2img') ? 'block' : 'none';

      const isAI = (mode !== 'pixelate_only');
      document.getElementById('prompt-section').style.display = isAI ? 'block' : 'none';
      document.getElementById('negative-section').style.display = isAI ? 'block' : 'none';
      document.getElementById('steps-section').style.display = isAI ? 'block' : 'none';
      document.getElementById('guidance-section').style.display = isAI ? 'block' : 'none';
      document.getElementById('seed-section').style.display = isAI ? 'block' : 'none';

      const btnText = document.getElementById('btn-text');
      if (mode === 'pixelate_only') {
        btnText.innerText = '⚡ PIXELIZAR IMAGEM AGORA (0s)';
      } else if (mode === 'img2img') {
        btnText.innerText = '🎨 REDESENHAR EM PIXEL ART (IA)';
      } else {
        btnText.innerText = '⚡ GERAR PIXEL ART';
      }
    }

    function handleFile(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedImageBase64 = e.target.result.split(',')[1];
        const preview = document.getElementById('upload-preview');
        preview.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }

    // Drag and drop setup
    const dropzone = document.getElementById('dropzone');
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    function setPrompt(text) {
      document.getElementById('prompt').value = text;
    }

    function setZoom(z) {
      currentZoom = z;
      const img = document.getElementById('preview-img');
      img.style.transform = `scale(${z})`;
      document.querySelectorAll('.zoom-controls .btn-tool').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === z + 'x');
      });
    }

    function downloadSprite() {
      if (!currentImageBase64) return;
      const link = document.createElement('a');
      link.download = `pixelart_${Date.now()}.png`;
      link.href = 'data:image/png;base64,' + currentImageBase64;
      link.click();
    }

    async function generate() {
      if ((currentMode === 'img2img' || currentMode === 'pixelate_only') && !uploadedImageBase64) {
        alert('Por favor, faça upload de uma imagem primeiro!');
        return;
      }

      const prompt = document.getElementById('prompt').value.trim();
      if (currentMode !== 'pixelate_only' && !prompt) {
        alert('Por favor, digite um prompt descrevendo o que deseja!');
        return;
      }

      const btn = document.getElementById('btn-generate');
      const btnText = document.getElementById('btn-text');
      const spinner = document.getElementById('spinner');
      const statusText = document.getElementById('status-text');

      btn.disabled = true;
      spinner.style.display = 'inline-block';
      btnText.innerText = currentMode === 'pixelate_only' ? 'Pixelizando...' : 'Processando no seu PC...';
      statusText.innerText = currentMode === 'pixelate_only' ? 'Convertendo...' : 'Gerando no processador (~1 min). Aguarde...';

      const startTime = Date.now();
      const interval = setInterval(() => {
        const sec = Math.floor((Date.now() - startTime) / 1000);
        if (currentMode !== 'pixelate_only') {
          statusText.innerText = `Gerando no processador: ${sec}s decorridos...`;
        }
      }, 1000);

      try {
        const payload = {
          mode: currentMode,
          init_image: uploadedImageBase64,
          strength: parseFloat(document.getElementById('strength').value),
          prompt: prompt,
          negative_prompt: document.getElementById('negative_prompt').value,
          pixel_width: parseInt(document.getElementById('pixel_size').value),
          pixel_height: parseInt(document.getElementById('pixel_size').value),
          colors: parseInt(document.getElementById('colors').value),
          steps: parseInt(document.getElementById('steps').value),
          guidance_scale: parseFloat(document.getElementById('guidance').value),
          seed: parseInt(document.getElementById('seed').value) || -1
        };

        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        clearInterval(interval);

        if (!data.success) {
          alert('Erro ao gerar: ' + (data.error || 'Erro desconhecido'));
          statusText.innerText = 'Falha na geração.';
          return;
        }

        currentImageBase64 = data.image_base64;
        const img = document.getElementById('preview-img');
        img.src = 'data:image/png;base64,' + currentImageBase64;
        img.style.display = 'block';
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('btn-download').style.display = 'flex';
        setZoom(currentZoom);

        statusText.innerText = `Concluído em ${data.generation_time.toFixed(2)}s!`;

        // Add to history
        addHistory(currentImageBase64);

      } catch (err) {
        clearInterval(interval);
        alert('Erro de conexão com o servidor local: ' + err.message);
        statusText.innerText = 'Erro de conexão.';
      } finally {
        btn.disabled = false;
        spinner.style.display = 'none';
        setMode(currentMode);
      }
    }

    function addHistory(b64) {
      history.unshift(b64);
      const list = document.getElementById('history-list');
      list.innerHTML = '';
      history.slice(0, 10).forEach(item => {
        const img = document.createElement('img');
        img.className = 'history-thumb';
        img.src = 'data:image/png;base64,' + item;
        img.onclick = () => {
          currentImageBase64 = item;
          document.getElementById('preview-img').src = 'data:image/png;base64,' + item;
          document.getElementById('preview-img').style.display = 'block';
          document.getElementById('empty-state').style.display = 'none';
          document.getElementById('btn-download').style.display = 'flex';
        };
        list.appendChild(img);
      });
    }
  </script>
</body>
</html>
"""

@app.route("/")
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route("/api/status")
def status():
    return jsonify({
        "status": "online",
        "model": MODEL_NAME,
        "device": DEVICE,
        "loaded": pipeline is not None
    })

def process_pixelate(img, target_size=(64, 64), colors=16, seed=42):
    if pixelate is not None:
        try:
            return pixelate(img, target_size=target_size, colors=colors if colors > 0 else 256, seed=seed)
        except Exception as e:
            print(f"[!] Erro no pixelate: {e}")

    # Fallback to nearest neighbor downsampling and color quantization
    img_down = img.resize(target_size, Image.Resampling.BILINEAR)
    if colors > 0:
        img_quant = img_down.quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert("RGBA")
        return img_quant
    return img_down

@app.route("/api/generate", methods=["POST"])
def generate():
    try:
        data = request.get_json() or {}
        mode = data.get("mode", "txt2img")
        pixel_w = int(data.get("pixel_width", 64))
        pixel_h = int(data.get("pixel_height", 64))
        colors = int(data.get("colors", 16))
        seed = int(data.get("seed", -1))
        
        t0 = time.time()

        # MODE: Direct pixelation without neural network (0 seconds!)
        if mode == "pixelate_only":
            init_b64 = data.get("init_image")
            if not init_b64:
                return jsonify({"success": False, "error": "Nenhuma imagem enviada para pixelizar"}), 400
            raw_bytes = base64.b64decode(init_b64)
            img = Image.open(io.BytesIO(raw_bytes)).convert("RGBA")
            final_image = process_pixelate(img, target_size=(pixel_w, pixel_h), colors=colors, seed=42)
            
            buf = io.BytesIO()
            final_image.save(buf, format="PNG")
            img_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            elapsed = time.time() - t0
            return jsonify({
                "success": True,
                "image_base64": img_base64,
                "generation_time": elapsed,
                "width": pixel_w,
                "height": pixel_h
            })

        # Load AI pipeline
        load_pipeline()
        prompt = data.get("prompt", "")
        if not prompt:
            return jsonify({"success": False, "error": "Prompt não pode estar vazio"}), 400

        negative = data.get("negative_prompt", "blurry, smooth, realistic, photographic, 3d render, low quality, noise")
        steps = int(data.get("steps", 12))
        guidance = float(data.get("guidance_scale", 7.5))

        if seed == -1:
            seed = torch.randint(0, 2**31 - 1, (1,)).item()

        generator = torch.Generator(device=DEVICE).manual_seed(seed)

        # MODE: Img2Img (AI Redraw based on uploaded image)
        if mode == "img2img":
            init_b64 = data.get("init_image")
            if not init_b64:
                return jsonify({"success": False, "error": "Imagem de referência necessária para o modo Img2Img"}), 400
            strength = float(data.get("strength", 0.65))
            raw_bytes = base64.b64decode(init_b64)
            init_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
            
            print(f"[*] Redesenhando com IA: '{prompt[:40]}' (strength={strength}, steps={steps})...")
            result = img2img_pipeline(
                prompt=prompt,
                image=init_img,
                strength=strength,
                negative_prompt=negative,
                num_inference_steps=steps,
                guidance_scale=guidance,
                generator=generator
            )
            raw_image = result.images[0]

        # MODE: Text2Img (Pure generation from prompt)
        else:
            print(f"[*] Gerando do zero: '{prompt[:40]}' ({steps} steps, seed={seed})...")
            result = pipeline(
                prompt=prompt,
                negative_prompt=negative,
                num_inference_steps=steps,
                guidance_scale=guidance,
                width=512,
                height=512,
                generator=generator
            )
            raw_image = result.images[0]

        # Pixelate
        final_image = process_pixelate(raw_image, target_size=(pixel_w, pixel_h), colors=colors, seed=seed)
        
        buffer = io.BytesIO()
        final_image.save(buffer, format="PNG")
        img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        
        elapsed = time.time() - t0
        print(f"[✓] Geração concluída em {elapsed:.2f}s")
        
        return jsonify({
            "success": True,
            "image_base64": img_base64,
            "seed": seed,
            "generation_time": elapsed,
            "width": pixel_w,
            "height": pixel_h
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

def open_browser(port):
    time.sleep(1.5)
    webbrowser.open(f"http://localhost:{port}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=7860, help="Porta do servidor (padrão: 7860)")
    parser.add_argument("--no-browser", action="store_true", help="Não abrir navegador automaticamente")
    args = parser.parse_args()

    port = args.port
    print(f"\n==========================================")
    print(f"  Pixel Art AI Studio")
    print(f"  Acesse: http://localhost:{port}")
    print(f"==========================================\n")

    if not args.no_browser:
        Thread(target=open_browser, args=(port,), daemon=True).start()

    app.run(host="127.0.0.1", port=port, debug=False)
