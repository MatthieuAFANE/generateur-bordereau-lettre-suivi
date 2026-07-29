import React, { useState } from 'react';
import { genererBordereau } from './pdfLogic.js';
import './index.css';

export default function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [destinataire, setDestinataire] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // --- LOGIQUE DRAG & DROP ---
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setPdfFile(file);
        setFileName(file.name);
      } else {
        alert("Veuillez déposer un fichier PDF uniquement.");
      }
    }
  };

  // --- LOGIQUE EXPLORATEUR DE FICHIERS ---
  const handleSelectFile = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        startIn: 'downloads',
        types: [{
          description: 'Fichiers PDF',
          accept: { 'application/pdf': ['.pdf'] },
        }],
      });
      const file = await fileHandle.getFile();
      setPdfFile(file);
      setFileName(file.name);
    } catch (error) {
      console.log("Sélection annulée");
    }
  };

  // --- LOGIQUE BOUTON COLLER ---
  const handlePaste = async () => {
    try {
      // Lit le texte contenu dans le presse-papiers de l'ordinateur
      const text = await navigator.clipboard.readText();
      // Met à jour la zone de texte
      setDestinataire(text);
    } catch (err) {
      // Sécurité : si le navigateur bloque ou si c'est la première fois, il peut refuser
      alert("Votre navigateur empêche l'accès au presse-papiers. Utilisez le raccourci Ctrl+V.");
    }
  };

  // --- GÉNÉRATION ---
  const handleProcess = () => {
    if (!pdfFile || !destinataire) {
      alert("Veuillez fournir le PDF et l'adresse du destinataire.");
      return;
    }
    genererBordereau(pdfFile, destinataire);
  };

  return (
    <div className="app-container">
      
      <div className="header">
        <h1 className="title">Bordereau Express</h1>
        <p className="subtitle">L'infrastructure de pointe pour vos étiquettes thermiques.</p>
      </div>

      {/* CARTE 1 : UPLOAD */}
      <div className="card">
        <div className="card-title">1. Fichier Source</div>
        
        <div 
          className={`dropzone ${dragActive ? "active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleSelectFile}
        >
          <div className="file-icon">{fileName ? "✅" : "📄"}</div>
          <h3 style={{ marginBottom: '8px' }}>
            {fileName ? fileName : "Glissez votre PDF ici"}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {fileName ? "Cliquez pour modifier" : "ou cliquez pour ouvrir vos téléchargements"}
          </p>
        </div>
      </div>

      {/* CARTE 2 : ADRESSE */}
      <div className="card">
        {/* Entête avec flexbox pour aligner le titre et le bouton sur la même ligne */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>2. Destination</div>
          
          <button className="btn-small" onClick={handlePaste} title="Coller depuis le presse-papiers">
            📋 Coller
          </button>
        </div>

        <textarea 
          className="textarea-modern"
          rows="5" 
          value={destinataire}
          onChange={(e) => setDestinataire(e.target.value)}
          placeholder={"Ilona Oehme\nVor den Höfen 38\n31303 BURGDORF"}
        />
      </div>

      {/* BOUTON D'ACTION */}
      <button className="btn-primary" onClick={handleProcess}>
        Générer l'étiquette <span>→</span>
      </button>

    </div>
  );
}