class VectorArkanoid {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        this.ball = {
            x: this.width / 2,
            y: this.height - 50,
            radius: 6,
            speed: 4,
            dx: 4,
            dy: -4
        };
        
        this.paddle = {
            x: this.width / 2 - 50,
            y: this.height - 25,
            width: 100,
            height: 12,
            speed: 8,
            dx: 0
        };
        
        this.gameState = {
            score: 0,
            lives: 3,
            level: 1,
            isRunning: false,
            isPaused: false
        };
        
        this.currentDrawing = null;
        this.blocks = [];
        this.touchControls = {
            left: false,
            right: false
        };
        
        this.init();
    }
    
    resizeCanvas() {
        const container = document.querySelector('.game-container');
        const maxWidth = container.clientWidth - 20;
        const maxHeight = window.innerHeight * 0.6;
        
        this.canvas.width = Math.min(maxWidth, 800);
        this.canvas.height = Math.min(maxHeight, 500);
        
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Пересчитываем позиции при изменении размера
        if (this.ball) {
            this.ball.x = this.width / 2;
            this.ball.y = this.height - 50;
            this.ball.radius = Math.max(4, this.width / 100);
        }
        
        if (this.paddle) {
            this.paddle.x = this.width / 2 - this.paddle.width / 2;
            this.paddle.y = this.height - 25;
            this.paddle.width = Math.max(80, this.width / 5);
        }
        
        if (this.currentDrawing) {
            this.redrawBlocks();
        }
    }
    
    redrawBlocks() {
        if (this.currentDrawing && this.currentDrawing.blocks) {
            this.blocks = this.currentDrawing.blocks.map(block => ({
                ...block,
                width: Math.max(4, this.width / 100),
                height: Math.max(4, this.width / 100)
            }));
        }
    }
    
    init() {
        this.setupEventListeners();
        this.loadSampleDrawings();
        this.gameLoop();
        
        // Обработка изменения ориентации и размера
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.resizeCanvas(), 100);
        });
    }
    
    setupEventListeners() {
        // Клавиатура
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.paddle.dx = -this.paddle.speed;
            if (e.key === 'ArrowRight') this.paddle.dx = this.paddle.speed;
            if (e.key === ' ' || e.key === 'Space') this.togglePause();
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.paddle.dx = 0;
        });
        
        // Сенсорное управление
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        
        // Нажатие
        leftBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touchControls.left = true;
            this.paddle.dx = -this.paddle.speed;
        });
        
        rightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touchControls.right = true;
            this.paddle.dx = this.paddle.speed;
        });
        
        // Отпускание
        leftBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touchControls.left = false;
            if (!this.touchControls.right) this.paddle.dx = 0;
        });
        
        rightBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touchControls.right = false;
            if (!this.touchControls.left) this.paddle.dx = 0;
        });
        
        // Отмена касания (например, палец ушел за пределы кнопки)
        leftBtn.addEventListener('touchcancel', (e) => {
            this.touchControls.left = false;
            if (!this.touchControls.right) this.paddle.dx = 0;
        });
        
        rightBtn.addEventListener('touchcancel', (e) => {
            this.touchControls.right = false;
            if (!this.touchControls.left) this.paddle.dx = 0;
        });
        
        // Управление касанием по canvas (альтернативное управление)
        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.gameState.isRunning || this.gameState.isPaused) return;
            
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            
            // Плавное движение paddle к точке касания
            const targetX = touchX - this.paddle.width / 2;
            const diff = targetX - this.paddle.x;
            
            this.paddle.dx = diff * 0.2; // Плавное следование
        });
        
        // Кнопки управления
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('startBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startGame();
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('pauseBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.togglePause();
        });
        
        document.getElementById('loadDrawing').addEventListener('click', () => this.loadDrawingFile());
        document.getElementById('loadDrawing').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.loadDrawingFile();
        });
        
        // Выбор рисунка
        document.getElementById('drawingSelect').addEventListener('change', (e) => {
            this.loadDrawing(e.target.value);
        });
    }
    
    loadSampleDrawings() {
        const sampleDrawings = {
            'smile': {
                name: 'Смайлик',
                blocks: this.createSmileyFace()
            },
            'heart': {
                name: 'Сердце',
                blocks: this.createHeart()
            },
            'star': {
                name: 'Звезда',
                blocks: this.createStar()
            }
        };
        
        const select = document.getElementById('drawingSelect');
        Object.keys(sampleDrawings).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = sampleDrawings[key].name;
            select.appendChild(option);
        });
        
        localStorage.setItem('sampleDrawings', JSON.stringify(sampleDrawings));
    }
    
    createSmileyFace() {
        const blocks = [];
        const centerX = this.width / 2;
        const centerY = this.height / 3;
        const radius = Math.min(80, this.width / 4);
        const blockSize = Math.max(4, this.width / 100);
        
        // Лицо (круг)
        for (let angle = 0; angle < 360; angle += 15) {
            const x = centerX + Math.cos(angle * Math.PI / 180) * radius;
            const y = centerY + Math.sin(angle * Math.PI / 180) * radius;
            blocks.push({ x, y, width: blockSize, height: blockSize, color: '#FFD700', health: 1 });
        }
        
        // Глаза
        const eyeSize = Math.max(8, blockSize * 1.5);
        blocks.push({ x: centerX - 25, y: centerY - 15, width: eyeSize, height: eyeSize, color: '#000', health: 1 });
        blocks.push({ x: centerX + 25, y: centerY - 15, width: eyeSize, height: eyeSize, color: '#000', health: 1 });
        
        // Улыбка
        for (let angle = 200; angle < 340; angle += 12) {
            const x = centerX + Math.cos(angle * Math.PI / 180) * (radius * 0.6);
            const y = centerY + Math.sin(angle * Math.PI / 180) * (radius * 0.6);
            blocks.push({ x, y, width: blockSize * 0.8, height: blockSize * 0.8, color: '#000', health: 1 });
        }
        
        return blocks;
    }
    
    createHeart() {
        const blocks = [];
        const centerX = this.width / 2;
        const centerY = this.height / 3;
        const blockSize = Math.max(4, this.width / 100);
        
        for (let angle = 0; angle < 360; angle += 8) {
            const t = angle * Math.PI / 180;
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
            
            blocks.push({
                x: centerX - x * 2.5,
                y: centerY - y * 2.5,
                width: blockSize,
                height: blockSize,
                color: '#FF6B6B',
                health: 1
            });
        }
        
        return blocks;
    }
    
    createStar() {
        const blocks = [];
        const centerX = this.width / 2;
        const centerY = this.height / 3;
        const points = 5;
        const outerRadius = Math.min(60, this.width / 6);
        const innerRadius = outerRadius * 0.5;
        const blockSize = Math.max(4, this.width / 100);
        
        for (let i = 0; i <= points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI / points) * i;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            blocks.push({
                x, y,
                width: blockSize,
                height: blockSize,
                color: '#4ECDC4',
                health: 1
            });
        }
        
        return blocks;
    }
    
    loadDrawing(key) {
        const drawings = JSON.parse(localStorage.getItem('sampleDrawings') || '{}');
        if (drawings[key]) {
            this.currentDrawing = drawings[key];
            this.redrawBlocks();
            this.draw();
        }
    }
    
    loadDrawingFile() {
        document.getElementById('fileInput').click();
        document.getElementById('fileInput').onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const drawing = JSON.parse(event.target.result);
                        this.currentDrawing = drawing;
                        this.redrawBlocks();
                        this.draw();
                    } catch (error) {
                        alert('Ошибка загрузки файла: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
    }
    
    startGame() {
        if (!this.currentDrawing) {
            alert('Сначала загрузите рисунок!');
            return;
        }
        
        this.gameState.isRunning = true;
        this.gameState.isPaused = false;
        this.resetBall();
    }
    
    togglePause() {
        if (this.gameState.isRunning) {
            this.gameState.isPaused = !this.gameState.isPaused;
        }
    }
    
    resetBall() {
        this.ball.x = this.width / 2;
        this.ball.y = this.height - 50;
        this.ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
        this.ball.dy = -4;
    }
    
    update() {
        if (!this.gameState.isRunning || this.gameState.isPaused) return;
        
        // Обновление позиции paddle
        this.paddle.x += this.paddle.dx;
        
        // Границы для paddle
        if (this.paddle.x < 0) this.paddle.x = 0;
        if (this.paddle.x + this.paddle.width > this.width) {
            this.paddle.x = this.width - this.paddle.width;
        }
        
        // Обновление позиции мяча
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        
        // Столкновение со стенами
        if (this.ball.x + this.ball.radius > this.width || this.ball.x - this.ball.radius < 0) {
            this.ball.dx *= -1;
        }
        
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.dy *= -1;
        }
        
        // Столкновение с paddle
        if (this.ball.y + this.ball.radius > this.paddle.y &&
            this.ball.x > this.paddle.x &&
            this.ball.x < this.paddle.x + this.paddle.width &&
            this.ball.dy > 0) {
            
            const hitPos = (this.ball.x - (this.paddle.x + this.paddle.width / 2)) / (this.paddle.width / 2);
            this.ball.dx = hitPos * 6;
            this.ball.dy *= -1;
        }
        
        // Потеря мяча
        if (this.ball.y - this.ball.radius > this.height) {
            this.gameState.lives--;
            this.updateUI();
            
            if (this.gameState.lives <= 0) {
                this.gameOver();
            } else {
                this.resetBall();
            }
        }
        
        // Столкновение с блоками
        this.blocks.forEach((block, index) => {
            if (this.checkCollision(block)) {
                block.health--;
                
                if (block.health <= 0) {
                    this.blocks.splice(index, 1);
                    this.gameState.score += 10;
                    this.updateUI();
                }
                
                this.ball.dy *= -1;
                
                // Проверка завершения уровня
                if (this.blocks.length === 0) {
                    this.levelComplete();
                }
            }
        });
    }
    
    checkCollision(block) {
        return this.ball.x + this.ball.radius > block.x &&
               this.ball.x - this.ball.radius < block.x + block.width &&
               this.ball.y + this.ball.radius > block.y &&
               this.ball.y - this.ball.radius < block.y + block.height;
    }
    
    draw() {
        // Очистка canvas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Отрисовка paddle
        this.ctx.fillStyle = '#4ECDC4';
        this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
        
        // Отрисовка мяча
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Отрисовка блоков
        this.blocks.forEach(block => {
            this.ctx.fillStyle = block.color;
            this.ctx.fillRect(block.x, block.y, block.width, block.height);
        });
        
        // Отрисовка текста, если игра не запущена
        if (!this.gameState.isRunning) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = `bold ${Math.max(16, this.width / 25)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Выберите рисунок и нажмите "Старт"', this.width / 2, this.height / 2);
        }
        
        if (this.gameState.isPaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = `bold ${Math.max(24, this.width / 20)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText('ПАУЗА', this.width / 2, this.height / 2);
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.gameState.score;
        document.getElementById('lives').textContent = this.gameState.lives;
        document.getElementById('level').textContent = this.gameState.level;
    }
    
    levelComplete() {
        this.gameState.level++;
        this.gameState.score += 100;
        this.updateUI();
        
        setTimeout(() => {
            alert(`Уровень ${this.gameState.level - 1} пройден!`);
            
            // Перезагрузка рисунка для нового уровня
            if (this.currentDrawing) {
                this.redrawBlocks();
                this.resetBall();
            }
        }, 500);
    }
    
    gameOver() {
        this.gameState.isRunning = false;
        setTimeout(() => {
            alert(`Игра окончена! Ваш счет: ${this.gameState.score}`);
            this.resetGame();
        }, 500);
    }
    
    resetGame() {
        this.gameState = {
            score: 0,
            lives: 3,
            level: 1,
            isRunning: false,
            isPaused: false
        };
        this.updateUI();
        
        if (this.currentDrawing) {
            this.redrawBlocks();
        }
        this.resetBall();
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Запуск игры при загрузке страницы
window.addEventListener('load', () => {
    new VectorArkanoid();
});

// Предотвращение стандартного поведения браузера для касаний
document.addEventListener('touchstart', function(e) {
    if (e.target.tagName !== 'CANVAS') {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('touchmove', function(e) {
    if (e.target.tagName !== 'CANVAS') {
        e.preventDefault();
    }
}, { passive: false });