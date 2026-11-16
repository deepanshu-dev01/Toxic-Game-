// toxicGames - Interactive Online Arcade Game System
// 100% Vanilla JS & HTML5 Canvas with Web Audio 8-bit Sound FX

(function() {
  'use strict';

  // Audio Synthesizer (Web Audio API)
  let audioCtx = null;
  let soundEnabled = true;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSound(type) {
    if (!soundEnabled || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'laser') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'hit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'bounce') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.4);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch(e) {}
  }

  // DOM Elements
  const canvas = document.getElementById('arcadeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('arcadeScore');
  const highScoreEl = document.getElementById('arcadeHighScore');
  const statusEl = document.getElementById('arcadeStatus');
  const gameTabs = document.querySelectorAll('.arcade-tab-btn');
  const soundToggleBtn = document.getElementById('arcadeSoundToggle');
  const restartBtn = document.getElementById('arcadeRestartBtn');
  const pauseBtn = document.getElementById('arcadePauseBtn');

  let currentGame = 'invaders'; // 'invaders' | 'snake' | 'breakout'
  let isRunning = false;
  let isPaused = false;
  let animationId = null;

  let score = 0;
  let highScores = {
    invaders: parseInt(localStorage.getItem('toxic_hs_invaders') || '0', 10),
    snake: parseInt(localStorage.getItem('toxic_hs_snake') || '0', 10),
    breakout: parseInt(localStorage.getItem('toxic_hs_breakout') || '0', 10)
  };

  function updateScore(newScore) {
    score = newScore;
    if (scoreEl) scoreEl.textContent = score;
    if (score > highScores[currentGame]) {
      highScores[currentGame] = score;
      localStorage.setItem('toxic_hs_' + currentGame, score);
    }
    if (highScoreEl) highScoreEl.textContent = highScores[currentGame];
  }

  // Key States
  const keys = {};
  window.addEventListener('keydown', (e) => {
    initAudio();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      if (document.activeElement === canvas || canvas.matches(':hover') || isRunning) {
        e.preventDefault();
      }
    }
    keys[e.key] = true;
    keys[e.code] = true;

    if (e.key === 'p' || e.key === 'P') {
      togglePause();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    keys[e.code] = false;
  });

  // Touch/D-Pad controls
  const dpadBtns = document.querySelectorAll('[data-arcade-key]');
  dpadBtns.forEach(btn => {
    const key = btn.getAttribute('data-arcade-key');
    const startPress = (e) => {
      e.preventDefault();
      initAudio();
      keys[key] = true;
    };
    const endPress = (e) => {
      e.preventDefault();
      keys[key] = false;
    };
    btn.addEventListener('mousedown', startPress);
    btn.addEventListener('mouseup', endPress);
    btn.addEventListener('touchstart', startPress, { passive: false });
    btn.addEventListener('touchend', endPress, { passive: false });
  });

  // ==========================================
  // GAME 1: CYBER SPACE INVADERS
  // ==========================================
  const Invaders = {
    player: { x: 375, y: 440, w: 42, h: 22, speed: 6.5 },
    bullets: [],
    alienBullets: [],
    aliens: [],
    particles: [],
    alienDir: 1,
    alienSpeed: 1.2,
    alienDropTimer: 0,
    lastShoot: 0,
    lives: 3,

    init() {
      this.player.x = canvas.width / 2 - 21;
      this.player.y = canvas.height - 35;
      this.bullets = [];
      this.alienBullets = [];
      this.particles = [];
      this.aliens = [];
      this.alienDir = 1;
      this.alienSpeed = 1.3;
      this.lives = 3;

      // Spawn Alien Grid (4 rows x 9 cols)
      const rows = 4;
      const cols = 9;
      const startX = 70;
      const startY = 50;
      const spacingX = 66;
      const spacingY = 38;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let type = r === 0 ? 'top' : (r < 3 ? 'mid' : 'bot');
          let color = r === 0 ? '#ef4444' : (r < 3 ? '#38bdf8' : '#00f59b');
          let pts = r === 0 ? 30 : (r < 3 ? 20 : 10);
          this.aliens.push({
            x: startX + c * spacingX,
            y: startY + r * spacingY,
            w: 34,
            h: 22,
            type: type,
            color: color,
            pts: pts,
            alive: true
          });
        }
      }
    },

    update() {
      // Move Player
      if ((keys['ArrowLeft'] || keys['KeyA']) && this.player.x > 10) {
        this.player.x -= this.player.speed;
      }
      if ((keys['ArrowRight'] || keys['KeyD']) && this.player.x < canvas.width - this.player.w - 10) {
        this.player.x += this.player.speed;
      }

      // Shoot
      const now = Date.now();
      if ((keys[' '] || keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && now - this.lastShoot > 220) {
        this.bullets.push({
          x: this.player.x + this.player.w / 2 - 2.5,
          y: this.player.y - 8,
          w: 5,
          h: 14,
          speed: 9
        });
        this.lastShoot = now;
        playSound('laser');
      }

      // Update Bullets
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        b.y -= b.speed;
        if (b.y < -20) {
          this.bullets.splice(i, 1);
          continue;
        }

        // Check alien hit
        for (let j = 0; j < this.aliens.length; j++) {
          const a = this.aliens[j];
          if (a.alive && b.x < a.x + a.w && b.x + b.w > a.x && b.y < a.y + a.h && b.y + b.h > a.y) {
            a.alive = false;
            this.bullets.splice(i, 1);
            updateScore(score + a.pts);
            playSound('hit');
            this.spawnExplosion(a.x + a.w/2, a.y + a.h/2, a.color);
            break;
          }
        }
      }

      // Alien Movement
      let edgeReached = false;
      let activeAliens = 0;
      for (let i = 0; i < this.aliens.length; i++) {
        const a = this.aliens[i];
        if (a.alive) {
          activeAliens++;
          a.x += this.alienDir * this.alienSpeed;
          if (a.x < 15 || a.x + a.w > canvas.width - 15) {
            edgeReached = true;
          }
          // Check alien touch player
          if (a.y + a.h >= this.player.y) {
            this.gameOver();
            return;
          }
        }
      }

      // If all aliens defeated, spawn next wave with higher speed
      if (activeAliens === 0) {
        this.alienSpeed += 0.5;
        this.init();
        return;
      }

      if (edgeReached) {
        this.alienDir *= -1;
        for (let i = 0; i < this.aliens.length; i++) {
          this.aliens[i].y += 14;
        }
      }

      // Alien Shooting
      if (Math.random() < 0.025) {
        const living = this.aliens.filter(a => a.alive);
        if (living.length > 0) {
          const shooter = living[Math.floor(Math.random() * living.length)];
          this.alienBullets.push({
            x: shooter.x + shooter.w / 2,
            y: shooter.y + shooter.h,
            w: 4,
            h: 12,
            speed: 4.5
          });
        }
      }

      // Update Alien Bullets
      for (let i = this.alienBullets.length - 1; i >= 0; i--) {
        const ab = this.alienBullets[i];
        ab.y += ab.speed;
        if (ab.y > canvas.height + 20) {
          this.alienBullets.splice(i, 1);
          continue;
        }

        // Check player hit
        if (ab.x < this.player.x + this.player.w && ab.x + ab.w > this.player.x &&
            ab.y < this.player.y + this.player.h && ab.y + ab.h > this.player.y) {
          this.alienBullets.splice(i, 1);
          this.lives--;
          playSound('hit');
          this.spawnExplosion(this.player.x + this.player.w/2, this.player.y + this.player.h/2, '#ef4444');
          if (this.lives <= 0) {
            this.gameOver();
            return;
          }
        }
      }

      // Update Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.04;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }
    },

    spawnExplosion(x, y, color) {
      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: color,
          alpha: 1,
          size: Math.random() * 3 + 2
        });
      }
    },

    gameOver() {
      isRunning = false;
      playSound('gameover');
      if (statusEl) statusEl.innerHTML = '<span style="color:#ef4444; font-weight:800;">GAME OVER</span> — Click Restart to Replay';
    },

    draw() {
      // Background Starfield Grid
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle Grid lines
      ctx.strokeStyle = 'rgba(0, 245, 155, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Player Ship
      ctx.fillStyle = '#00f59b';
      ctx.shadowColor = '#00f59b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(this.player.x + this.player.w / 2, this.player.y);
      ctx.lineTo(this.player.x + this.player.w, this.player.y + this.player.h);
      ctx.lineTo(this.player.x, this.player.y + this.player.h);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Player Bullets
      ctx.fillStyle = '#00f59b';
      ctx.shadowColor = '#00f59b';
      ctx.shadowBlur = 8;
      for (const b of this.bullets) {
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }
      ctx.shadowBlur = 0;

      // Draw Aliens
      for (const a of this.aliens) {
        if (!a.alive) continue;
        ctx.fillStyle = a.color;
        ctx.shadowColor = a.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(a.x, a.y, a.w, a.h, 4);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#090d16';
        ctx.fillRect(a.x + 6, a.y + 6, 5, 5);
        ctx.fillRect(a.x + a.w - 11, a.y + 6, 5, 5);
      }
      ctx.shadowBlur = 0;

      // Draw Alien Bullets
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 6;
      for (const ab of this.alienBullets) {
        ctx.fillRect(ab.x, ab.y, ab.w, ab.h);
      }
      ctx.shadowBlur = 0;

      // Draw Particles
      for (const p of this.particles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // HUD: Lives & Info
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px "Space Grotesk", sans-serif';
      ctx.fillText(`LIVES: ${'❤️ '.repeat(Math.max(0, this.lives))}`, 16, 26);
      ctx.fillText(`SPEED: ${this.alienSpeed.toFixed(1)}x`, canvas.width - 100, 26);
    }
  };

  // ==========================================
  // GAME 2: NEON CYBER SNAKE (2077)
  // ==========================================
  const Snake = {
    gridSize: 20,
    tileCountX: 0,
    tileCountY: 0,
    snake: [],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 10, y: 10, type: 'regular' },
    moveTimer: 0,
    speed: 95, // ms per move

    init() {
      this.tileCountX = Math.floor(canvas.width / this.gridSize);
      this.tileCountY = Math.floor(canvas.height / this.gridSize);
      const startX = Math.floor(this.tileCountX / 4);
      const startY = Math.floor(this.tileCountY / 2);

      this.snake = [
        { x: startX + 3, y: startY },
        { x: startX + 2, y: startY },
        { x: startX + 1, y: startY },
        { x: startX, y: startY }
      ];
      this.dir = { x: 1, y: 0 };
      this.nextDir = { x: 1, y: 0 };
      this.speed = 95;
      this.spawnFood();
    },

    spawnFood() {
      let valid = false;
      while (!valid) {
        const fx = Math.floor(Math.random() * this.tileCountX);
        const fy = Math.floor(Math.random() * this.tileCountY);
        valid = !this.snake.some(segment => segment.x === fx && segment.y === fy);
        if (valid) {
          this.food = {
            x: fx,
            y: fy,
            isGold: Math.random() < 0.2
          };
        }
      }
    },

    update(dt) {
      // Input
      if ((keys['ArrowUp'] || keys['KeyW']) && this.dir.y === 0) {
        this.nextDir = { x: 0, y: -1 };
      } else if ((keys['ArrowDown'] || keys['KeyS']) && this.dir.y === 0) {
        this.nextDir = { x: 0, y: 1 };
      } else if ((keys['ArrowLeft'] || keys['KeyA']) && this.dir.x === 0) {
        this.nextDir = { x: -1, y: 0 };
      } else if ((keys['ArrowRight'] || keys['KeyD']) && this.dir.x === 0) {
        this.nextDir = { x: 1, y: 0 };
      }

      this.moveTimer += dt;
      if (this.moveTimer < this.speed) return;
      this.moveTimer = 0;

      this.dir = { ...this.nextDir };
      const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

      // Wall Collision (Wrap around or Die - Let's do die for authentic challenge)
      if (head.x < 0 || head.x >= this.tileCountX || head.y < 0 || head.y >= this.tileCountY) {
        this.gameOver();
        return;
      }

      // Self Collision
      for (const segment of this.snake) {
        if (head.x === segment.x && head.y === segment.y) {
          this.gameOver();
          return;
        }
      }

      this.snake.unshift(head);

      // Eat Food
      if (head.x === this.food.x && head.y === this.food.y) {
        const pts = this.food.isGold ? 50 : 20;
        updateScore(score + pts);
        playSound('coin');
        this.speed = Math.max(50, this.speed - 1.5); // Accelerate
        this.spawnFood();
      } else {
        this.snake.pop();
      }
    },

    gameOver() {
      isRunning = false;
      playSound('gameover');
      if (statusEl) statusEl.innerHTML = '<span style="color:#ef4444; font-weight:800;">CRASHED!</span> — Click Restart to Replay';
    },

    draw() {
      // Dark Grid Background
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(0, 245, 155, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += this.gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += this.gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Food with Glow
      ctx.fillStyle = this.food.isGold ? '#fbbf24' : '#00f59b';
      ctx.shadowColor = this.food.isGold ? '#fbbf24' : '#00f59b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(
        this.food.x * this.gridSize + this.gridSize / 2,
        this.food.y * this.gridSize + this.gridSize / 2,
        this.gridSize / 2.3,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Snake Body
      for (let i = 0; i < this.snake.length; i++) {
        const seg = this.snake[i];
        const isHead = i === 0;
        ctx.fillStyle = isHead ? '#00f59b' : `rgba(0, 245, 155, ${Math.max(0.3, 1 - (i / this.snake.length) * 0.7)})`;
        if (isHead) {
          ctx.shadowColor = '#00f59b';
          ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.roundRect(
          seg.x * this.gridSize + 1.5,
          seg.y * this.gridSize + 1.5,
          this.gridSize - 3,
          this.gridSize - 3,
          isHead ? 6 : 4
        );
        ctx.fill();
        ctx.shadowBlur = 0;

        // Head Eyes
        if (isHead) {
          ctx.fillStyle = '#05120c';
          ctx.fillRect(seg.x * this.gridSize + 4, seg.y * this.gridSize + 4, 3, 3);
          ctx.fillRect(seg.x * this.gridSize + this.gridSize - 7, seg.y * this.gridSize + 4, 3, 3);
        }
      }

      // HUD
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px "Space Grotesk", sans-serif';
      ctx.fillText(`LENGTH: ${this.snake.length}`, 16, 26);
      ctx.fillText(`SPEED: ${(150 - this.speed)}`, canvas.width - 110, 26);
    }
  };

  // ==========================================
  // GAME 3: CYBER BREAKOUT (BRICK BREAKER)
  // ==========================================
  const Breakout = {
    paddle: { x: 340, y: 440, w: 90, h: 14, speed: 7.5 },
    ball: { x: 385, y: 400, r: 7, vx: 4, vy: -4, speed: 5.5 },
    bricks: [],
    lives: 3,

    init() {
      this.paddle.w = 95;
      this.paddle.x = canvas.width / 2 - this.paddle.w / 2;
      this.paddle.y = canvas.height - 35;
      this.ball.x = canvas.width / 2;
      this.ball.y = canvas.height - 60;
      this.ball.vx = 4 * (Math.random() > 0.5 ? 1 : -1);
      this.ball.vy = -4.5;
      this.lives = 3;

      // Generate Neon Bricks (5 rows x 10 cols)
      this.bricks = [];
      const rows = 5;
      const cols = 10;
      const bWidth = 62;
      const bHeight = 18;
      const startX = 40;
      const startY = 55;
      const colors = ['#ef4444', '#f97316', '#fbbf24', '#00f59b', '#38bdf8'];
      const pts = [50, 40, 30, 20, 10];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          this.bricks.push({
            x: startX + c * (bWidth + 8),
            y: startY + r * (bHeight + 8),
            w: bWidth,
            h: bHeight,
            color: colors[r],
            pts: pts[r],
            alive: true
          });
        }
      }
    },

    update() {
      // Paddle Move
      if ((keys['ArrowLeft'] || keys['KeyA']) && this.paddle.x > 10) {
        this.paddle.x -= this.paddle.speed;
      }
      if ((keys['ArrowRight'] || keys['KeyD']) && this.paddle.x < canvas.width - this.paddle.w - 10) {
        this.paddle.x += this.paddle.speed;
      }

      // Ball Move
      this.ball.x += this.ball.vx;
      this.ball.y += this.ball.vy;

      // Ball Wall Collisions
      if (this.ball.x - this.ball.r < 0) {
        this.ball.x = this.ball.r;
        this.ball.vx *= -1;
        playSound('bounce');
      } else if (this.ball.x + this.ball.r > canvas.width) {
        this.ball.x = canvas.width - this.ball.r;
        this.ball.vx *= -1;
        playSound('bounce');
      }

      if (this.ball.y - this.ball.r < 0) {
        this.ball.y = this.ball.r;
        this.ball.vy *= -1;
        playSound('bounce');
      } else if (this.ball.y + this.ball.r > canvas.height) {
        // Lose life
        this.lives--;
        playSound('hit');
        if (this.lives <= 0) {
          this.gameOver();
          return;
        } else {
          // Reset ball on paddle
          this.ball.x = this.paddle.x + this.paddle.w / 2;
          this.ball.y = this.paddle.y - 20;
          this.ball.vx = 4 * (Math.random() > 0.5 ? 1 : -1);
          this.ball.vy = -4.5;
        }
      }

      // Ball Paddle Collision
      if (
        this.ball.y + this.ball.r >= this.paddle.y &&
        this.ball.y - this.ball.r <= this.paddle.y + this.paddle.h &&
        this.ball.x >= this.paddle.x &&
        this.ball.x <= this.paddle.x + this.paddle.w
      ) {
        // Adjust angle based on where hit on paddle
        const hitOffset = (this.ball.x - (this.paddle.x + this.paddle.w / 2)) / (this.paddle.w / 2);
        this.ball.vx = hitOffset * 6.5;
        this.ball.vy = -Math.abs(this.ball.vy);
        playSound('bounce');
      }

      // Ball Brick Collision
      let activeCount = 0;
      for (const b of this.bricks) {
        if (!b.alive) continue;
        activeCount++;
        if (
          this.ball.x + this.ball.r > b.x &&
          this.ball.x - this.ball.r < b.x + b.w &&
          this.ball.y + this.ball.r > b.y &&
          this.ball.y - this.ball.r < b.y + b.h
        ) {
          b.alive = false;
          this.ball.vy *= -1;
          updateScore(score + b.pts);
          playSound('coin');
          break;
        }
      }

      // Level cleared
      if (activeCount === 0) {
        this.init();
      }
    },

    gameOver() {
      isRunning = false;
      playSound('gameover');
      if (statusEl) statusEl.innerHTML = '<span style="color:#ef4444; font-weight:800;">OUT OF BALLS!</span> — Click Restart to Replay';
    },

    draw() {
      // Dark Blue Cyber Arena
      ctx.fillStyle = '#080c16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Bricks
      for (const b of this.bricks) {
        if (!b.alive) continue;
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 4);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Draw Paddle
      ctx.fillStyle = '#00f59b';
      ctx.shadowColor = '#00f59b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h, 6);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Ball
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f59b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // HUD
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px "Space Grotesk", sans-serif';
      ctx.fillText(`BALLS: ${'⚪ '.repeat(Math.max(0, this.lives))}`, 16, 26);
    }
  };

  // Main Loop
  let lastTime = 0;
  function gameLoop(time) {
    if (!lastTime) lastTime = time;
    const dt = time - lastTime;
    lastTime = time;

    if (isRunning && !isPaused) {
      if (currentGame === 'invaders') {
        Invaders.update();
        Invaders.draw();
      } else if (currentGame === 'snake') {
        Snake.update(dt);
        Snake.draw();
      } else if (currentGame === 'breakout') {
        Breakout.update();
        Breakout.draw();
      }
    }

    animationId = requestAnimationFrame(gameLoop);
  }

  function startCurrentGame() {
    initAudio();
    updateScore(0);
    isRunning = true;
    isPaused = false;
    if (statusEl) statusEl.innerHTML = '<span style="color:#00f59b; font-weight:700;">LIVE</span> — Use Arrow Keys or D-Pad to Play';
    if (pauseBtn) pauseBtn.textContent = '⏸ Pause';

    if (currentGame === 'invaders') {
      Invaders.init();
      Invaders.draw();
    } else if (currentGame === 'snake') {
      Snake.init();
      Snake.draw();
    } else if (currentGame === 'breakout') {
      Breakout.init();
      Breakout.draw();
    }
  }

  function togglePause() {
    if (!isRunning) return;
    isPaused = !isPaused;
    if (pauseBtn) pauseBtn.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
    if (statusEl) {
      statusEl.innerHTML = isPaused
        ? '<span style="color:#fbbf24; font-weight:700;">PAUSED</span> — Press P or Resume'
        : '<span style="color:#00f59b; font-weight:700;">LIVE</span> — Game in progress';
    }
  }

  // Switch Game Tabs
  gameTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-game');
      if (target === currentGame) return;

      gameTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      currentGame = target;
      if (highScoreEl) highScoreEl.textContent = highScores[currentGame];
      startCurrentGame();
    });
  });

  // Sound Toggle
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      initAudio();
      soundEnabled = !soundEnabled;
      soundToggleBtn.textContent = soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
      soundToggleBtn.classList.toggle('muted', !soundEnabled);
    });
  }

  // Restart Button
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      startCurrentGame();
    });
  }

  // Pause Button
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      togglePause();
    });
  }

  // Canvas Click to Focus & Init Audio
  canvas.addEventListener('click', () => {
    initAudio();
    if (!isRunning) {
      startCurrentGame();
    }
  });

  // Initial Start
  startCurrentGame();
  animationId = requestAnimationFrame(gameLoop);

  // Expose global launcher so cards or links can switch to a game and scroll to arcade
  window.launchArcadeGame = function(gameName) {
    const targetTab = document.querySelector(`.arcade-tab-btn[data-game="${gameName}"]`);
    if (targetTab) {
      targetTab.click();
    }
    const section = document.getElementById('toxic-arcade');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

})();
