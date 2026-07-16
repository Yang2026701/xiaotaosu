/* ============================================================
   particles.js — Floating peach petals & sparkles background
   ============================================================ */

App.particles = (() => {

  let canvas, ctx, animId;
  let particles = [];
  const MAX_PARTICLES = 45;

  // Petal shapes
  const PETAL_COLORS = [
    'rgba(255,160,122,0.35)',  // peach
    'rgba(255,182,161,0.30)',  // light peach
    'rgba(255,145,164,0.28)',  // pink
    'rgba(255,200,180,0.25)',  // cream peach
    'rgba(255,220,200,0.20)',  // very light
  ];

  const SPARKLE_COLORS = [
    'rgba(255,220,180,0.6)',
    'rgba(255,240,220,0.5)',
    'rgba(255,200,200,0.5)',
  ];

  function init() {
    canvas = document.createElement('canvas');
    canvas.id = 'particle-canvas';
    canvas.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 0;
    `;
    document.body.prepend(canvas);
    ctx = canvas.getContext('2d');

    resize();
    window.addEventListener('resize', resize);

    // Create initial particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particles.push(createParticle());
    }

    animate();
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle() {
    const isSparkle = Math.random() < 0.15;
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 1.3,
      size: isSparkle ? 1.5 + Math.random() * 3 : 6 + Math.random() * 14,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: 0.3 + Math.random() * 0.9,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      opacity: 0.15 + Math.random() * 0.35,
      color: isSparkle ? SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)]
                        : PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
      isSparkle,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.005 + Math.random() * 0.02,
      wobbleAmp: 0.5 + Math.random() * 2.5,
    };
  }

  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    // Draw a soft rounded petal shape
    const s = p.size;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-s * 0.4, -s * 0.7, -s * 0.1, -s, s * 0.3, -s * 0.5);
    ctx.bezierCurveTo(s * 0.5, -s * 0.2, s * 0.5, -s * 0.05, s * 0.2, s * 0.05);
    ctx.bezierCurveTo(s * 0.1, s * 0.1, -s * 0.2, s * 0.05, -s * 0.3, -s * 0.1);
    ctx.bezierCurveTo(-s * 0.4, -s * 0.3, -s * 0.5, -s * 0.5, 0, 0);
    ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${p.opacity})`);
    ctx.fill();

    ctx.restore();
  }

  function drawSparkle(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    const s = p.size;
    const flicker = 0.5 + 0.5 * Math.sin(Date.now() * 0.005 + p.wobble);

    ctx.beginPath();
    // 4-point star
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const x = Math.cos(angle) * s * flicker;
      const y = Math.sin(angle) * s * flicker;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      // Small inner point
      const midAngle = angle + Math.PI / 4;
      ctx.lineTo(Math.cos(midAngle) * s * 0.3 * flicker, Math.sin(midAngle) * s * 0.3 * flicker);
    }
    ctx.closePath();
    ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${p.opacity * flicker})`);
    ctx.fill();
    ctx.restore();
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Move
      p.wobble += p.wobbleSpeed;
      p.x += p.speedX + Math.sin(p.wobble) * p.wobbleAmp * 0.05;
      p.y += p.speedY;
      p.rotation += p.rotSpeed;

      // Draw
      if (p.isSparkle) {
        drawSparkle(p);
      } else {
        drawPetal(p);
      }

      // Reset when out of bounds
      if (p.y > canvas.height + 30) {
        p.y = -30;
        p.x = Math.random() * canvas.width;
      }
      if (p.x > canvas.width + 30) p.x = -30;
      if (p.x < -30) p.x = canvas.width + 30;
    }

    animId = requestAnimationFrame(animate);
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    particles = [];
  }

  return { init, destroy };

})();
