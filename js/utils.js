/* ============================================================
   utils.js — Shared utility functions
   ============================================================ */

// Namespace
window.App = window.App || {};

App.utils = (() => {

  // ---- ID Generation ----
  function generateId(prefix) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${prefix}_${Date.now().toString(36)}${id}`;
  }

  // ---- Date Formatting ----
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}年${m}月${day}日`;
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${m}-${day}`;
  }

  function formatMonth(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  }

  function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ---- Age Calculation ----
  function calcAge(birthDateStr, targetDateStr) {
    const birth = new Date(birthDateStr + 'T00:00:00');
    const target = new Date(targetDateStr + 'T00:00:00');
    const diffMs = target - birth;
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (totalDays < 0) return { days: 0, months: 0, years: 0, totalDays: 0, text: '--' };
    if (totalDays < 60) {
      return { days: totalDays, months: 0, years: 0, totalDays, text: `${totalDays}天` };
    }
    if (totalDays < 730) {
      const months = Math.floor(totalDays / 30.4375);
      const days = totalDays - Math.floor(months * 30.4375);
      return { days, months, years: 0, totalDays, text: `${months}个月${days}天` };
    }
    const years = Math.floor(totalDays / 365.25);
    const remainingDays = totalDays - Math.floor(years * 365.25);
    const months = Math.floor(remainingDays / 30.4375);
    return { days: 0, months, years, totalDays, text: `${years}岁${months}个月` };
  }

  // ---- Escape HTML ----
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ---- Debounce ----
  function debounce(fn, ms) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ---- Image Resize (Canvas-based) ----
  function resizeImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
            else       { w = Math.round(w * maxDim / h); h = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve({
            dataUrl: canvas.toDataURL('image/jpeg', quality),
            width: w,
            height: h
          });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---- localStorage Quota Check ----
  function getStorageUsage() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length * 2; // UTF-16
      }
    }
    return total; // bytes
  }

  function getStorageUsagePercent() {
    // Most browsers allow ~5MB. We estimate conservatively.
    const used = getStorageUsage();
    const estimatedMax = 5 * 1024 * 1024; // 5MB
    return Math.min(100, Math.round((used / estimatedMax) * 100));
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ---- JSON Download ----
  function downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    generateId, formatDate, formatDateShort, formatMonth, todayStr,
    calcAge, escapeHtml, debounce, resizeImage,
    getStorageUsage, getStorageUsagePercent, formatBytes, downloadJSON
  };

})();
