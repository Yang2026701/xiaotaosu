/* ============================================================
   effects.js — Confetti celebration, card tilt, number animation
   ============================================================ */

App.effects = (() => {

  // ---- Confetti Celebration ----
  function celebrate(duration = 2500) {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 300;
      overflow: hidden;
    `;
    document.body.appendChild(container);

    const colors = ['#FFA07A','#FFB6C1','#FFD700','#FF91A4','#81C784',
                     '#FF8C69','#FFC4AE','#FFE4E8','#FFF5EE','#FAEBD7'];
    const shapes = ['circle', 'square', 'star'];

    const fragment = document.createDocumentFragment();
    const count = 60;

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      const size = 6 + Math.random() * 10;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 0.4;
      const dur = 1.5 + Math.random() * 2;

      let shapeStyle = 'border-radius: 50%';
      if (shape === 'square') shapeStyle = 'border-radius: 2px';
      else if (shape === 'star') shapeStyle = `
        clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%,
                           79% 91%, 50% 70%, 21% 91%, 32% 57%,
                           2% 35%, 39% 35%)`;

      el.style.cssText = `
        position: absolute; top: -20px; left: ${left}%;
        width: ${size}px; height: ${size}px; background: ${color};
        ${shapeStyle}
        animation: confettiFall ${dur}s ${delay}s ease-in forwards;
      `;
      fragment.appendChild(el);
    }

    container.appendChild(fragment);

    // Add keyframes if not already present
    if (!document.getElementById('confetti-keyframes')) {
      const style = document.createElement('style');
      style.id = 'confetti-keyframes';
      style.textContent = `
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg) scale(0.3); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      container.remove();
    }, duration + 500);
  }

  // ---- Number Counting Animation ----
  function animateNumber(el, start, end, duration = 800) {
    const range = end - start;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + range * eased;

      el.textContent = end % 1 === 0 ? Math.round(current) : current.toFixed(1);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // ---- 3D Tilt Effect for Cards ----
  function initTilt(card, options = {}) {
    const maxTilt = options.maxTilt || 8;
    const scale = options.scale || 1.02;
    const speed = options.speed || 400;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const tiltX = ((y - centerY) / centerY) * maxTilt;
      const tiltY = ((centerX - x) / centerX) * maxTilt;

      card.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(${scale},${scale},${scale})`;
      card.style.transition = `transform ${speed}ms ease`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(600px) rotateX(0) rotateY(0) scale3d(1,1,1)';
      card.style.transition = `transform ${speed}ms ease`;
    });

    // Touch tilt for mobile
    card.addEventListener('touchmove', (e) => {
      const rect = card.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const tiltX = ((y - centerY) / centerY) * maxTilt * 0.6;
      const tiltY = ((centerX - x) / centerX) * maxTilt * 0.6;
      card.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      card.style.transition = 'transform 100ms ease';
    }, { passive: true });

    card.addEventListener('touchend', () => {
      card.style.transform = 'perspective(600px) rotateX(0) rotateY(0) scale3d(1,1,1)';
      card.style.transition = 'transform 400ms ease';
    });
  }

  // ---- Sparkle Effect on Click ----
  function sparkle(x, y, container = document.body) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('div');
      const angle = (i / count) * Math.PI * 2;
      const dist = 20 + Math.random() * 30;
      const size = 3 + Math.random() * 5;

      spark.style.cssText = `
        position: fixed; left: ${x}px; top: ${y}px; z-index: 400;
        width: ${size}px; height: ${size}px; border-radius: 50%;
        background: #FFD700;
        pointer-events: none;
        transform: translate(0, 0) scale(1);
        animation: sparkleBurst ${400 + Math.random() * 300}ms ease-out forwards;
      `;
      container.appendChild(spark);

      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      requestAnimationFrame(() => {
        spark.style.transform = `translate(${dx}px, ${dy}px) scale(0)`;
        spark.style.opacity = '0';
      });

      setTimeout(() => spark.remove(), 800);
    }

    if (!document.getElementById('sparkle-keyframes')) {
      const style = document.createElement('style');
      style.id = 'sparkle-keyframes';
      style.textContent = `
        @keyframes sparkleBurst {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // ---- Ripple Effect on Tap ----
  function ripple(e, el) {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ripple = document.createElement('span');

    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
      position: absolute; left: ${x - size/2}px; top: ${y - size/2}px;
      width: ${size}px; height: ${size}px; border-radius: 50%;
      background: rgba(255,160,122,0.25);
      transform: scale(0);
      animation: rippleEffect 600ms ease-out forwards;
      pointer-events: none;
    `;
    el.style.position = el.style.position || 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(ripple);

    setTimeout(() => ripple.remove(), 700);

    if (!document.getElementById('ripple-keyframes')) {
      const style = document.createElement('style');
      style.id = 'ripple-keyframes';
      style.textContent = `
        @keyframes rippleEffect {
          to { transform: scale(2); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  return { celebrate, animateNumber, initTilt, sparkle, ripple };

})();
