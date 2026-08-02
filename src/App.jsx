import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { genererPdfFinal, PAGE_WIDTH, PAGE_HEIGHT } from './pdfLogic.js';
import './index.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [fileName, setFileName] = useState("");
  
  const [destinataire, setDestinataire] = useState(`Ilona Oehme\nVor den Höfen 38\n31303 BURGDORF\nALLEMAGNE`);
  // NOUVEAU : État pour gérer l'expéditeur
  const [expediteur, setExpediteur] = useState(`Sender:\nMatthieu AFANE\n52 Rue des Vieilles Postes\n51000 Châlons en champagne\nFRANCE`);
  
  const [originalBytes, setOriginalBytes] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [pdfDimensions, setPdfDimensions] = useState({ width: 595.28, height: 841.89 });
  const [renderScale, setRenderScale] = useState(1);

  const [config, setConfig] = useState({
    cropX: 10, cropY: 20, 
    destX: 20, destY: 100, destSize: 18, destBold: true,
    expX: 220, expY: 120, expSize: 9, expBold: true
  });

  const updateConfig = (key, value) => { setConfig(prev => ({ ...prev, [key]: value })); };

  const updateScale = () => {
    if (canvasRef.current && pdfDimensions.width > 0) {
      setRenderScale(canvasRef.current.clientWidth / pdfDimensions.width);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', updateScale);
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    
    return () => {
      window.removeEventListener('resize', updateScale);
      observer.disconnect();
    };
  }, [pdfDimensions]);

  useEffect(() => {
    if (!pdfFile) return;
    
    pdfFile.arrayBuffer().then(bytes => {
      setOriginalBytes(bytes);
      const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(0) });
      
      loadingTask.promise.then(pdf => pdf.getPage(1)).then(page => {
        const viewportNative = page.getViewport({ scale: 1.0 });
        setPdfDimensions({ width: viewportNative.width, height: viewportNative.height });

        const viewport = page.getViewport({ scale: 2.0 }); 
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          return page.render({ canvasContext: ctx, viewport }).promise.then(() => updateScale());
        }
      }).catch(err => {
        console.error("Erreur d'affichage du PDF:", err);
      });
    });
  }, [pdfFile]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = pdfDimensions.width / rect.width;
    const scaleY = pdfDimensions.height / rect.height;

    const startX = e.clientX;
    const startY = e.clientY;
    const startCropX = config.cropX;
    const startCropY = config.cropY;

    const handleMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) * scaleX;
      const deltaY = (moveEvent.clientY - startY) * scaleY;

      let newCropX = startCropX + deltaX;
      let newCropY = startCropY + deltaY;

      if (newCropX < 0) newCropX = 0;
      if (newCropX + PAGE_WIDTH > pdfDimensions.width) newCropX = pdfDimensions.width - PAGE_WIDTH;
      if (newCropY < 0) newCropY = 0;
      if (newCropY + PAGE_HEIGHT > pdfDimensions.height) newCropY = pdfDimensions.height - PAGE_HEIGHT;

      setConfig(prev => ({ ...prev, cropX: newCropX, cropY: newCropY }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSelectFile = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({ startIn: 'downloads', types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }] });
      const file = await fileHandle.getFile();
      setPdfFile(file); setFileName(file.name);
    } catch (e) {}
  };
  
  const handlePasteDestinataire = async () => {
    try { const text = await navigator.clipboard.readText(); setDestinataire(text); } catch (e) { alert("Appuyez sur Ctrl+V."); }
  };

  const handlePasteExpediteur = async () => {
    try { const text = await navigator.clipboard.readText(); setExpediteur(text); } catch (e) { alert("Appuyez sur Ctrl+V."); }
  };

  const handlePrint = async () => {
    if (!originalBytes) return; 
    
    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.document.title = "Génération en cours...";
      newTab.document.body.innerHTML = "<h2 style='font-family: sans-serif; text-align: center; margin-top: 20%; color: #333;'>Génération de l'étiquette en cours... ⏳</h2>";
    }

    try {
      // AJOUT : On transmet la variable expediteur à la fonction de génération
      const finalBlob = await genererPdfFinal(originalBytes.slice(0), destinataire, expediteur, config);
      const url = URL.createObjectURL(finalBlob);
      
      if (newTab) {
        newTab.location.href = url;
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Etiquette_Thermique_100x150.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
    } catch (error) {
      console.error("Erreur lors de la génération:", error);
      if (newTab) newTab.close(); 
      alert("Une erreur s'est produite lors de la création de l'étiquette.");
    }
  };

  return (
    <div className="app-wrapper">
      <div className="app-container">
        
        <div className="header">
          <h1 className="title">Bordereau Express</h1>
          <p className="subtitle">Visualisation experte avec cadrage interactif.</p>
        </div>

        <div className="left-column">
          <div className="card">
            <div className="card-title">1. Fichier Source</div>
            <div className="dropzone" onClick={handleSelectFile}>
              <h3>{fileName ? `✅ ${fileName}` : "📂 Parcourir les Téléchargements"}</h3>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div className="card-title" style={{ margin: 0 }}>2. Destinataire</div>
              <button className="btn-small" onClick={handlePasteDestinataire}>📋 Coller</button>
            </div>
            <textarea className="textarea-modern" rows="4" value={destinataire} onChange={(e) => setDestinataire(e.target.value)} />
          </div>

          {/* NOUVEAU BLOC : EXPÉDITEUR */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div className="card-title" style={{ margin: 0 }}>3. Expéditeur</div>
              <button className="btn-small" onClick={handlePasteExpediteur}>📋 Coller</button>
            </div>
            <textarea className="textarea-modern" rows="4" value={expediteur} onChange={(e) => setExpediteur(e.target.value)} />
          </div>

          <div className="card" style={{ borderColor: 'var(--accent-color)' }}>
            <div className="card-title" style={{ color: 'var(--accent-color)' }}>⚙️ 4. Cadrage du Bordereau</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
              ℹ️ Attrapez la zone lumineuse sur l'image à droite et glissez-la avec la souris pour cibler le timbre !
            </p>
            <div className="settings-grid">
              <div className="setting-item">
                <label>↔️ Décalage X</label>
                <input type="range" className="slider" min="0" max={pdfDimensions.width - PAGE_WIDTH} value={config.cropX} onChange={(e) => updateConfig('cropX', Number(e.target.value))} />
              </div>
              <div className="setting-item">
                <label>↕️ Décalage Y</label>
                <input type="range" className="slider" min="0" max={pdfDimensions.height - PAGE_HEIGHT} value={config.cropY} onChange={(e) => updateConfig('cropY', Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">⚙️ 5. Position Textes</div>
            <div className="settings-grid">
              <div className="setting-item">
                <label>Destinataire (X)</label>
                <input type="range" className="slider" min="5" max="380" value={config.destX} onChange={(e) => updateConfig('destX', Number(e.target.value))} />
              </div>
              <div className="setting-item">
                <label>Destinataire (Y)</label>
                <input type="range" className="slider" min="5" max="250" value={config.destY} onChange={(e) => updateConfig('destY', Number(e.target.value))} />
              </div>
              <div className="setting-item">
                <label>Expéditeur (X)</label>
                <input type="range" className="slider" min="5" max="380" value={config.expX} onChange={(e) => updateConfig('expX', Number(e.target.value))} />
              </div>
              <div className="setting-item">
                <label>Expéditeur (Y)</label>
                <input type="range" className="slider" min="5" max="250" value={config.expY} onChange={(e) => updateConfig('expY', Number(e.target.value))} />
              </div>
              <div className="setting-item">
                <label>Taille Dest. ({config.destSize}pt)</label>
                <input type="range" className="slider" min="10" max="40" value={config.destSize} onChange={(e) => updateConfig('destSize', Number(e.target.value))} />
              </div>
              <label className="checkbox-row">
                <input type="checkbox" checked={config.destBold} onChange={(e) => updateConfig('destBold', e.target.checked)} />
                <span style={{ fontSize: '0.9rem' }}>Dest. en Gras</span>
              </label>
            </div>
          </div>

          <button className="btn-primary" onClick={handlePrint} disabled={!originalBytes}>
            {originalBytes ? "🖨️ Générer et Voir l'étiquette →" : "Veuillez charger un fichier..."}
          </button>
        </div>

        <div className="preview-section" style={{ position: 'sticky', top: '20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', height: 'fit-content' }}>
          
          <div 
            ref={containerRef}
            style={{
              position: 'relative',
              display: 'inline-block', 
              backgroundColor: '#fff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              borderRadius: '8px',
              overflow: 'hidden' 
            }}
          >
            
            <canvas ref={canvasRef} style={{ 
              display: 'block', 
              maxWidth: '100%', 
              maxHeight: '85vh', 
              width: 'auto', 
              height: 'auto',
              opacity: originalBytes ? 1 : 0 
            }} />

            {originalBytes && (
              <div 
                onMouseDown={handleMouseDown}
                style={{
                  position: 'absolute',
                  left: `${config.cropX * renderScale}px`,
                  top: `${config.cropY * renderScale}px`,
                  width: `${PAGE_WIDTH * renderScale}px`,
                  height: `${PAGE_HEIGHT * renderScale}px`,
                  
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                  border: '2px dashed #3b82f6',
                  cursor: 'move',
                  overflow: 'hidden' 
                }}
              >
                
                <div style={{
                  position: 'absolute',
                  left: `${config.destX * renderScale}px`,
                  top: `${config.destY * renderScale}px`,
                  fontSize: `${config.destSize * renderScale}px`,
                  fontWeight: config.destBold ? 'bold' : 'normal',
                  fontFamily: 'Helvetica, Arial, sans-serif',
                  lineHeight: 1.2,
                  color: '#000',
                  whiteSpace: 'pre-wrap', 
                  pointerEvents: 'none' 
                }}>
                  {destinataire}
                </div>

                <div style={{
                  position: 'absolute',
                  left: `${config.expX * renderScale}px`,
                  top: `${config.expY * renderScale}px`,
                  fontSize: `${config.expSize * renderScale}px`,
                  fontWeight: config.expBold ? 'bold' : 'normal',
                  fontFamily: 'Helvetica, Arial, sans-serif',
                  lineHeight: 1.4,
                  color: '#000',
                  whiteSpace: 'pre-wrap',
                  pointerEvents: 'none'
                }}>
                  {expediteur} {/* AJOUT : On utilise la variable dynamique ici aussi */}
                </div>

              </div>
            )}
            
            {!originalBytes && (
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', border: '2px dashed #444', borderRadius: '8px', padding: '100px 0' }}>
                <p style={{ textAlign: 'center' }}>Aucun aperçu.<br/>Chargez un PDF.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}