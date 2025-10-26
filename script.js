class VectorArkanoid {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.ball = {
            x: this.width / 2,
            y: this.height - 50,
            radius: 8,
            speed: 5,
            dx: 5,
            dy: -5
        };
        
        this.paddle = {
            x: this.width / 2 - 60,
            y: this.height - 20,
            width: 120,
            height: 15,
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
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadSampleDrawings();
        this.gameLoop();
    }
    
    setupEventListeners() {
        // Управление paddle
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.paddle.dx = -this.paddle.speed;
            if (e.key === 'ArrowRight') this.paddle.dx = this.paddle.speed;
            if (e.key === ' ') this.togglePause();
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.paddle.dx = 0;
        });
        
        // Кнопки управления
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('loadDrawing').addEventListener('click', () => this.loadDrawingFile());
        
        // Выбор рисунка
        document.getElementById('drawingSelect').addEventListener('change', (e) => {
            this.loadDrawing(e.target.value);
        });
    }
    
    loadSampleDrawings() {
        // Примеры векторных рисунков
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
        
        // Сохраняем примеры в localStorage для демонстрации
        localStorage.setItem('sampleDrawings', JSON.stringify(sampleDrawings));
    }
    
    createSmileyFace() {
        const blocks = [];
        const centerX = this.width / 2;
        const centerY = this.height / 3;
        const radius = 100;
        
        // Лицо (круг)
        for (let angle = 0; angle < 360; angle += 10) {
            const x = centerX + Math.cos(angle * Math.PI / 180) * radius;
            const y = centerY + Math.sin(angle * Math.PI / 180) * radius;
            blocks.push({ x, y, width: 8, height: 8, color: '#FFD700', health: 1 });
        }
        
        // Глаза
        blocks.push({ x: centerX - 30, y: centerY - 20, width: 15, height: 15, color: '#000', health: 1 });
        blocks.push({ x: centerX + 30, y: centerY - 20, width: 15, height: 15, color: '#000', health: 1 });
        
        // Улыбка
        for (let angle = 200; angle < 340; angle += 10) {
            const x = centerX + Math.cos(angle * Math.PI / 180) * 60;
            const y = centerY + Math.sin(angle * Math.PI / 180) * 60;
            blocks.push({ x, y, width: 6, height: 6, color: '#000', health: 1 });
        }
        
        return blocks;
    }
    
    createHeart() {
        const blocks = [];
        const centerX = this.width / 2;
        const centerY = this.height / 3;
        
        for (let angle = 0; angle < 360; angle += 5) {
            const t = angle * Math.PI / 180;
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
            
            blocks.push({
                x: centerX - x * 3,
                y: centerY - y * 3,
                width: 6,
                height: 6,
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
        const outerRadius = 80;
        const innerRadius = 40;
        
        for (let i = 0; i <= points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI / points) * i;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            blocks.push({
                x, y,
                width: 8,
                height: 8,
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
            this.blocks = [...this.currentDrawing.blocks];
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
                        this.blocks = [...drawing.blocks];
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
        this.ball.dx = 5 * (Math.random() > 0.5 ? 1 : -1);
        this.ball.dy = -5;
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
            this.ball.dx = hitPos * 8;
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
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Выберите рисунок и нажмите "Начать игру"', this.width / 2, this.height / 2);
        }
        
        if (this.gameState.isPaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '36px Arial';
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
        
        alert(`Уровень ${this.gameState.level - 1} пройден!`);
        
        // Перезагрузка рисунка для нового уровня
        if (this.currentDrawing) {
            this.blocks = [...this.currentDrawing.blocks];
            this.resetBall();
        }
    }
    
    gameOver() {
        this.gameState.isRunning = false;
        alert(`Игра окончена! Ваш счет: ${this.gameState.score}`);
        this.resetGame();
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
            this.blocks = [...this.currentDrawing.blocks];
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