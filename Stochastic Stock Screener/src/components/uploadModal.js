/**
 * Document Upload Modal Component (XLSX & CSV)
 * Provides drag-and-drop file upload, spreadsheet preview,
 * column mapping verification, and sample template downloads.
 */

import { parseStockDocument, generateSampleCSV, generateSampleXLSX } from '../services/fileParser.js';

let pendingUploadedResult = null;

export function setupUploadModal(onApplyUploadedStocks) {
  const modal = document.getElementById('uploadModal');
  const openBtn = document.getElementById('openUploadModalBtn');
  const closeBtn = document.getElementById('closeUploadModalBtn');
  const dropZone = document.getElementById('uploadDropZone');
  const fileInput = document.getElementById('stockFileInput');
  const previewContainer = document.getElementById('uploadPreviewContainer');
  const applyBtn = document.getElementById('applyUploadedStocksBtn');
  const downloadCsvBtn = document.getElementById('downloadSampleCsvBtn');
  const downloadXlsxBtn = document.getElementById('downloadSampleXlsxBtn');

  if (!modal || !openBtn) return;

  const openModal = () => {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Close when clicking modal backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Handle Drag & Drop
  if (dropZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileSelection(files[0]);
      }
    });

    dropZone.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  // Handle file selection and parsing
  async function handleFileSelection(file) {
    if (!dropZone || !previewContainer) return;

    const originalText = dropZone.innerHTML;
    dropZone.innerHTML = `
      <div class="dropzone-spinner-box">
        <div class="spinner"></div>
        <p class="font-bold">Parsing ${file.name}...</p>
      </div>
    `;

    try {
      const result = await parseStockDocument(file);
      pendingUploadedResult = result;

      // Update dropzone UI
      dropZone.innerHTML = `
        <div class="dropzone-success-box">
          <i data-lucide="check-circle" class="dropzone-icon text-emerald"></i>
          <h4 class="dropzone-title text-emerald">${result.fileName}</h4>
          <p class="dropzone-sub">
            Successfully parsed <strong>${result.validCount} valid stocks</strong> (${result.duplicateCount} duplicates removed).
          </p>
          <span class="btn btn-sm btn-outline-cyan">Change File</span>
        </div>
      `;

      // Render Preview Table
      renderPreview(result);

      if (applyBtn) {
        applyBtn.disabled = false;
        applyBtn.textContent = `Screen ${result.validCount} Uploaded Stocks Now \u2192`;
      }

      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    } catch (err) {
      dropZone.innerHTML = originalText;
      alert(`File Parse Error: ${err.message}`);
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
  }

  function renderPreview(result) {
    if (!previewContainer) return;

    const previewList = result.stocks.slice(0, 8);

    previewContainer.innerHTML = `
      <div class="preview-header">
        <span class="preview-title">Document Preview (${result.validCount} Total Stocks)</span>
        <span class="badge badge-cyan">${result.fileSizeFormatted}</span>
      </div>
      <div class="table-responsive" style="max-height: 240px; overflow-y: auto;">
        <table class="preview-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Symbol / Ticker</th>
              <th>Company Name</th>
              <th>Exchange</th>
              <th>Sector</th>
            </tr>
          </thead>
          <tbody>
            ${previewList.map((s, idx) => `
              <tr>
                <td class="text-muted font-mono">${idx + 1}</td>
                <td class="font-bold text-cyan font-mono">${s.ticker}</td>
                <td>${s.name}</td>
                <td><span class="badge-mini">${s.exchange}</span></td>
                <td class="text-muted">${s.sector}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${result.stocks.length > 8 ? `<p class="preview-more text-muted">+ ${result.stocks.length - 8} more stocks ready for Stochastic (4,3,3) screening</p>` : ''}
    `;
    previewContainer.style.display = 'block';
  }

  // Apply Button Click
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      if (pendingUploadedResult && onApplyUploadedStocks) {
        closeModal();
        onApplyUploadedStocks(pendingUploadedResult);
      }
    });
  }

  // Template Downloads
  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const csvContent = generateSampleCSV();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Sample_Stocks_List.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  if (downloadXlsxBtn) {
    downloadXlsxBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const blob = generateSampleXLSX();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Sample_Stocks_List.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
}
