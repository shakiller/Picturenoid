class VectorEditor {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridCanvas = document.getElementById('gridCanvas');
        this.gridCtx = this.gridCanvas.getContext('2d');
        
        this.currentTool = 'select';
        this.currentColor = '#ff0000';
        this.lineWidth = 2;
        this.blockHealth = 1;
        this.blockEffect = 'none';
        
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        
        this.shapes = [];
        this.selectedShape = null;
        this.history = [];
        this.historyIndex = -1;
        
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        
        this.layers = [{ name: 'Слой 1', visible: true, shapes: [] }];
        this.currentLayerIndex = 0;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupColorPalette();
        this.drawGrid();
        this.render();
    }
    
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.gridCanvas.width = container.clientWidth;
        this.gridCanvas.height = container.clientHeight;
        this.drawGrid();
        this.render();
    }
    
    setupEventListeners() {
        // Инструменты
        document.querySelectorAll('.tool').forEach(tool => {
            tool.addEventListener('click', (e) => {
                document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTool = e.target.dataset.tool;
            });
        });
        
        // Цвета
        document.getElementById('customColor').addEventListener('input', (e) => {
            this.currentColor = e.target.value;
        });
        
        // Свойства
        document.getElementById('lineWidth').addEventListener('input', (e) => {
            this.lineWidth = parseInt(e.target.value);
        });
        
        document.getElementById('blockHealth').addEventListener('input', (e) => {
            this.blockHealth = parseInt(e.target.value);
        });
        
        document.getElementById('blockEffect').addEventListener('change', (e) => {
            this.blockEffect = e.target.value;
        });
        
        // Кнопки файлов
        document.getElementById('newBtn').addEventListener('click', () => this.newProject());
        document.getElementById('loadBtn').addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveProject());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToGame());
        document.getElementById('fileInput').addEventListener('change', (e) => this.loadProject(e));
        
        // Кнопки редактирования
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCanvas());
        
        // Масштаб
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoom(0.8));
        
        // События мыши
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        
        // Обновление позиции курсора
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.offsetX) / this.scale;
            const y = (e.clientY - rect.top - this.offsetY) / this.scale;
            document.getElementById('cursorPos').textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
        });
    }
    
    setupColorPalette() {
        const palette = document.getElementById('colorPalette');
        const colors = [
            '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
            '#ff6b35', '#004e89', '#ffa400', '#2ec4b6', '#e71d36', '#662e9b'
        ];
        
        colors.forEach(color => {
            const colorEl = document.createElement('div');
            colorEl.className = 'color';
            colorEl.style.backgroundColor = color;
            colorEl.addEventListener('click', () => {
                document.querySelectorAll('.color').forEach(c => c.classList.remove('active'));
                colorEl.classList.add('active');
                this.currentColor = color;
            });
            palette.appendChild(colorEl);
        });
        
        // Активируем первый цвет
        palette.firstChild.classList.add('active');
    }
    
    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.startX = (e.clientX - rect.left - this.offsetX) / this.scale;
        this.startY = (e.clientY - rect.top - this.offsetY) / this.scale;
        this.currentX = this.startX;
        this.currentY = this.startY;
        
        if (this.currentTool === 'select') {
            this.selectedShape = this.getShapeAt(this.startX, this.startY);
            if (this.selectedShape) {
                this.isDragging = true;
                this.dragStartX = this.startX - this.selectedShape.x;
                this.dragStartY = this.startY - this.selectedShape.y;
            }
        } else {
            this.isDrawing = true;
        }
    }
    
    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.currentX = (e.clientX - rect.left - this.offsetX) / this.scale;
        this.currentY = (e.clientY - rect.top - this.offsetY) / this.scale;
        
        if (this.isDragging && this.selectedShape) {
            this.selectedShape.x = this.currentX - this.dragStartX;
            this.selectedShape.y = this.currentY - this.dragStartY;
            this.render();
        } else if (this.isDrawing) {
            this.render();
            this.drawPreview();
        }
    }
    
    onMouseUp() {
        if (this.isDrawing && this.currentTool !== 'select') {
            this.finalizeShape();
        }
        this.isDrawing = false;
        this.isDragging = false;
    }
    
    onWheel(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.8 : 1.2;
        this.zoom(zoomFactor, e.clientX, e.clientY);
    }
    
    zoom(factor, x = null, y = null) {
        const oldScale = this.scale;
        this.scale *= factor;
        this.scale = Math.max(0.1, Math.min(5, this.scale));
        
        if (x !== null && y !== null) {
            const rect = this.canvas.getBoundingClientRect();
            const worldX = (x - rect.left - this.offsetX) / oldScale;
            const worldY = (y - rect.top - this.offsetY) / oldScale;
            
            this.offsetX = x - rect.left - worldX * this.scale;
            this.offsetY = y - rect.top - worldY * this.scale;
        }
        
        document.getElementById('zoomLevel').textContent = Math.round(this.scale * 100) + '%';
        this.drawGrid();
        this.render();
    }
    
    drawPreview() {
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.setLineDash([5, 5]);
        
        switch (this.currentTool) {
            case 'rectangle':
                this.ctx.strokeRect(this.startX, this.startY, this.currentX - this.startX, this.currentY - this.startY);
                break;
            case 'circle':
                const radius = Math.sqrt(Math.pow(this.currentX - this.startX, 2) + Math.pow(this.currentY - this.startY, 2));
                this.ctx.beginPath();
                this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
                this.ctx.stroke();
                break;
            case 'line':
                this.ctx.beginPath();
                this.ctx.moveTo(this.startX, this.startY);
                this.ctx.lineTo(this.currentX, this.currentY);
                this.ctx.stroke();
                break;
        }
        
        this.ctx.restore();
    }
    
    finalizeShape() {
        const shape = {
            type: this.currentTool,
            x: this.startX,
            y: this.startY,
            width: this.currentX - this.startX,
            height: this.currentY - this.startY,
            color: this.currentColor,
            lineWidth: this.lineWidth,
            health: this.blockHealth,
            effect: this.blockEffect,
            layer: this.currentLayerIndex
        };
        
        if (this.currentTool === 'circle') {
            shape.radius = Math.sqrt(Math.pow(this.currentX - this.startX, 2) + Math.pow(this.currentY - this.startY, 2));
        }
        
        this.saveToHistory();
        this.layers[this.currentLayerIndex].shapes.push(shape);
        this.render();
    }
    
    render() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);
        
        // Рендерим видимые слои
        this.layers.forEach((layer, layerIndex) => {
            if (layer.visible) {
                layer.shapes.forEach(shape => {
                    this.drawShape(shape);
                    
                    // Выделение выбранной фигуры
                    if (shape === this.selectedShape) {
                        this.ctx.strokeStyle = '#00ffff';
                        this.ctx.lineWidth = 2;
                        this.ctx.setLineDash([3, 3]);
                        
                        if (shape.type === 'circle') {
                            this.ctx.beginPath();
                            this.ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
                            this.ctx.stroke();
                        } else {
                            this.ctx.strokeRect(shape.x - 5, shape.y - 5, shape.width + 10, shape.height + 10);
                        }
                        
                        this.ctx.setLineDash([]);
                    }
                });
            }
        });
        
        this.ctx.restore();
    }
    
    drawShape(shape) {
        this.ctx.fillStyle = shape.color;
        this.ctx.strokeStyle = shape.color;
        this.ctx.lineWidth = shape.lineWidth;
        
        switch (shape.type) {
            case 'rectangle':
                this.ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
                break;
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
                this.ctx.fill();
                break;
            case 'triangle':
                this.ctx.beginPath();
                this.ctx.moveTo(shape.x + shape.width / 2, shape.y);
                this.ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
                this.ctx.lineTo(shape.x, shape.y + shape.height);
                this.ctx.closePath();
                this.ctx.fill();
                break;
            case 'line':
                this.ctx.beginPath();
                this.ctx.moveTo(shape.x, shape.y);
                this.ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
                this.ctx.stroke();
                break;
        }
    }
    
    getShapeAt(x, y) {
        for (let i = this.layers.length - 1; i >= 0; i--) {
            if (!this.layers[i].visible) continue;
            
            for (let j = this.layers[i].shapes.length - 1; j >= 0; j--) {
                const shape = this.layers[i].shapes[j];
                if (this.isPointInShape(x, y, shape)) {
                    return shape;
                }
            }
        }
        return null;
    }
    
    isPointInShape(x, y, shape) {
        switch (shape.type) {
            case 'rectangle':
                return x >= shape.x && x <= shape.x + shape.width && 
                       y >= shape.y && y <= shape.y + shape.height;
            case 'circle':
                return Math.sqrt(Math.pow(x - shape.x, 2) + Math.pow(y - shape.y, 2)) <= shape.radius;
            default:
                return false;
        }
    }
    
    drawGrid() {
        const ctx = this.gridCtx;
        ctx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
        
        const gridSize = 20 * this.scale;
        const startX = this.offsetX % gridSize;
        const startY = this.offsetY % gridSize;
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        
        // Вертикальные линии
        for (let x = startX; x < this.gridCanvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.gridCanvas.height);
            ctx.stroke();
        }
        
        // Горизонтальные линии
        for (let y = startY; y < this.gridCanvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.gridCanvas.width, y);
            ctx.stroke();
        }
    }
    
    saveToHistory() {
        this.history = this.history.slice(0, this.historyIndex + 1);
        const snapshot = JSON.parse(JSON.stringify(this.layers));
        this.history.push(snapshot);
        this.historyIndex++;
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.layers = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.render();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.layers = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.render();
        }
    }
    
    clearCanvas() {
        if (confirm('Очистить холст?')) {
            this.saveToHistory();
            this.layers.forEach(layer => layer.shapes = []);
            this.render();
        }
    }
    
    newProject() {
        if (confirm('Создать новый проект? Несохраненные изменения будут потеряны.')) {
            this.layers = [{ name: 'Слой 1', visible: true, shapes: [] }];
            this.currentLayerIndex = 0;
            this.scale = 1;
            this.offsetX = 0;
            this.offsetY = 0;
            this.history = [];
            this.historyIndex = -1;
            this.render();
            this.drawGrid();
        }
    }
    
    saveProject() {
        const project = {
            name: prompt('Название уровня:', 'Мой уровень'),
            author: prompt('Автор:', 'Аноним'),
            layers: this.layers,
            metadata: {
                created: new Date().toISOString(),
                version: '1.0'
            }
        };
        
        const data = JSON.stringify(project, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = (project.name || 'level') + '.json';
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    loadProject(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target.result);
                this.layers = project.layers;
                this.currentLayerIndex = 0;
                this.history = [JSON.parse(JSON.stringify(this.layers))];
                this.historyIndex = 0;
                this.render();
                alert('Проект загружен!');
            } catch (error) {
                alert('Ошибка загрузки файла: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
    
    exportToGame() {
        const gameLevel = {
            title: prompt('Название уровня для игры:', 'Мой уровень'),
            author: prompt('Автор:', 'Аноним'),
            background: '#1a1a2e',
            elements: []
        };
        
        this.layers.forEach(layer => {
            if (layer.visible) {
                layer.shapes.forEach(shape => {
                    const element = {
                        type: shape.type,
                        x: Math.round(shape.x),
                        y: Math.round(shape.y),
                        color: shape.color,
                        health: shape.health,
                        effect: shape.effect
                    };
                    
                    if (shape.type === 'rectangle') {
                        element.width = Math.round(shape.width);
                        element.height = Math.round(shape.height);
                    } else if (shape.type === 'circle') {
                        element.radius = Math.round(shape.radius);
                    }
                    
                    gameLevel.elements.push(element);
                });
            }
        });
        
        const data = JSON.stringify(gameLevel, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = (gameLevel.title || 'level') + '_game.json';
        a.click();
        
        URL.revokeObjectURL(url);
        
        alert('Уровень экспортирован для игры! Сохраните файл в папку levels/ вашей игры.');
    }
}

// Инициализация редактора
document.addEventListener('DOMContentLoaded', () => {
    new VectorEditor();
});