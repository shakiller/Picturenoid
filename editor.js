class VectorTracer {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridCanvas = document.getElementById('gridCanvas');
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.referenceImage = document.getElementById('referenceImage');
        this.pointInfo = document.getElementById('pointInfo');
        
        // Состояние редактора
        this.currentTool = 'pen';
        this.currentColor = '#ff0000';
        this.strokeWidth = 2;
        this.fillMode = 'filled';
        this.pathMode = 'closed';
        this.blockHealth = 1;
        this.blockEffect = 'none';
        
        // Изображение для трассировки
        this.image = null;
        this.imageOpacity = 0.7;
        this.displayMode = 'both';
        
        // Векторные данные
        this.shapes = [];
        this.currentPath = null;
        this.selectedShape = null;
        this.selectedPoint = null;
        this.hoverPoint = null;
        
        // История и трансформации
        this.history = [];
        this.historyIndex = -1;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.isDrawing = false;
        
        // Привязка
        this.snapToGrid = true;
        this.snapDistance = 10;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupColorPalette();
        this.drawGrid();
        this.render();
        
        // Горячие клавиши
        this.setupKeyboardShortcuts();
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
        
        if (this.image) {
            this.centerImage();
        }
        
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
                this.updateToolInfo();
            });
        });
        
        // Управление изображением
        document.getElementById('loadImageBtn').addEventListener('click', () => {
            document.getElementById('imageInput').click();
        });
        
        document.getElementById('imageInput').addEventListener('change', (e) => this.loadImage(e));
        document.getElementById('imageOpacity').addEventListener('input', (e) => {
            this.imageOpacity = e.target.value / 100;
            document.getElementById('opacityValue').textContent = e.target.value + '%';
            this.referenceImage.style.opacity = this.imageOpacity;
        });
        
        document.getElementById('clearImageBtn').addEventListener('click', () => {
            this.image = null;
            this.referenceImage.style.display = 'none';
            this.render();
        });
        
        // Свойства
        document.getElementById('customColor').addEventListener('input', (e) => {
            this.currentColor = e.target.value;
        });
        
        document.getElementById('strokeWidth').addEventListener('input', (e) => {
            this.strokeWidth = parseInt(e.target.value);
        });
        
        document.getElementById('fillMode').addEventListener('change', (e) => {
            this.fillMode = e.target.value;
            this.render();
        });
        
        document.getElementById('pathMode').addEventListener('change', (e) => {
            this.pathMode = e.target.value;
        });
        
        document.getElementById('blockHealth').addEventListener('input', (e) => {
            this.blockHealth = parseInt(e.target.value);
        });
        
        document.getElementById('blockEffect').addEventListener('change', (e) => {
            this.blockEffect = e.target.value;
        });
        
        document.getElementById('displayMode').addEventListener('change', (e) => {
            this.displayMode = e.target.value;
            this.updateDisplayMode();
        });
        
        // Файлы и управление
        document.getElementById('newBtn').addEventListener('click', () => this.newProject());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveProject());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToGame());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCanvas());
        
        // Масштаб
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoom(0.8));
        document.getElementById('resetViewBtn').addEventListener('click', () => this.resetView());
        
        // События мыши
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Обновление позиции курсора
        this.canvas.addEventListener('mousemove', (e) => {
            const pos = this.getMousePos(e);
            document.getElementById('cursorPos').textContent = `X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}`;
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Инструменты
            if (e.key === 'p') { this.setTool('pen'); e.preventDefault(); }
            if (e.key === 'v') { this.setTool('select'); e.preventDefault(); }
            if (e.key === 'a') { this.setTool('add-point'); e.preventDefault(); }
            if (e.key === 'd') { this.setTool('delete-point'); e.preventDefault(); }
            if (e.key === 'r') { this.setTool('rectangle'); e.preventDefault(); }
            if (e.key === 'c') { this.setTool('circle'); e.preventDefault(); }
            
            // Управление
            if (e.ctrlKey && e.key === 'z') { this.undo(); e.preventDefault(); }
            if (e.ctrlKey && e.key === 'y') { this.redo(); e.preventDefault(); }
            if (e.key === 'Delete' && this.selectedShape) { this.deleteSelectedShape(); }
        });
    }
    
    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        this.updateToolInfo();
    }
    
    updateToolInfo() {
        const toolNames = {
            'pen': 'Перо',
            'select': 'Выделение',
            'add-point': 'Добавить точку',
            'delete-point': 'Удалить точку',
            'rectangle': 'Прямоугольник',
            'circle': 'Круг'
        };
        document.getElementById('toolInfo').textContent = `Инструмент: ${toolNames[this.currentTool]}`;
    }
    
    setupColorPalette() {
        const palette = document.getElementById('colorPalette');
        const colors = [
            '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
            '#ff6b35', '#004e89', '#ffa400', '#2ec4b6', '#e71d36', '#662e9b',
            '#ffffff', '#cccccc', '#888888', '#444444', '#000000'
        ];
        
        colors.forEach(color => {
            const colorEl = document.createElement('div');
            colorEl.className = 'color';
            colorEl.style.backgroundColor = color;
            colorEl.addEventListener('click', () => {
                document.querySelectorAll('.color').forEach(c => c.classList.remove('active'));
                colorEl.classList.add('active');
                this.currentColor = color;
                document.getElementById('customColor').value = color;
            });
            palette.appendChild(colorEl);
        });
        
        palette.firstChild.classList.add('active');
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.offsetX) / this.scale,
            y: (e.clientY - rect.top - this.offsetY) / this.scale
        };
    }
    
    onMouseDown(e) {
        const pos = this.getMousePos(e);
        this.isDragging = true;
        
        switch (this.currentTool) {
            case 'pen':
                this.startNewPath(pos);
                break;
                
            case 'select':
                this.selectShapeOrPoint(pos, e.ctrlKey);
                break;
                
            case 'add-point':
                if (this.selectedShape && this.selectedShape.type === 'path') {
                    this.addPointToPath(pos);
                }
                break;
                
            case 'delete-point':
                if (this.selectedPoint) {
                    this.deleteSelectedPoint();
                }
                break;
                
            case 'rectangle':
            case 'circle':
                this.startPrimitiveShape(pos);
                break;
        }
        
        this.render();
    }
    
    onMouseMove(e) {
        const pos = this.getMousePos(e);
        
        // Обновление информации о точке
        this.updateHoverPoint(pos);
        
        if (this.isDragging) {
            switch (this.currentTool) {
                case 'pen':
                    this.addPointToCurrentPath(pos);
                    break;
                    
                case 'select':
                    if (this.selectedPoint) {
                        this.movePoint(pos);
                    } else if (this.selectedShape) {
                        this.moveShape(pos);
                    }
                    break;
                    
                case 'rectangle':
                case 'circle':
                    this.updatePrimitiveShape(pos);
                    break;
            }
            
            this.render();
        }
    }
    
    onMouseUp() {
        if (this.isDragging) {
            switch (this.currentTool) {
                case 'pen':
                    this.finalizePath();
                    break;
                    
                case 'rectangle':
                case 'circle':
                    this.finalizePrimitiveShape();
                    break;
            }
            
            this.saveToHistory();
        }
        this.isDragging = false;
    }
    
    onWheel(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.8 : 1.2;
        this.zoom(zoomFactor, e.clientX, e.clientY);
    }
    
    // ========== РАБОТА С ПУТЯМИ ==========
    
    startNewPath(pos) {
        this.currentPath = {
            type: 'path',
            points: [this.snapPoint(pos)],
            color: this.currentColor,
            strokeWidth: this.strokeWidth,
            fill: this.fillMode === 'filled',
            closed: this.pathMode === 'closed',
            health: this.blockHealth,
            effect: this.blockEffect
        };
        this.isDrawing = true;
    }
    
    addPointToCurrentPath(pos) {
        if (this.currentPath) {
            const snappedPos = this.snapPoint(pos);
            // Не добавляем точку если она слишком близко к предыдущей
            const lastPoint = this.currentPath.points[this.currentPath.points.length - 1];
            const distance = Math.sqrt(Math.pow(snappedPos.x - lastPoint.x, 2) + Math.pow(snappedPos.y - lastPoint.y, 2));
            
            if (distance > 3) {
                this.currentPath.points.push(snappedPos);
            }
        }
    }
    
    finalizePath() {
        if (this.currentPath && this.currentPath.points.length > 1) {
            this.shapes.push(this.currentPath);
            this.currentPath = null;
            this.isDrawing = false;
        }
    }
    
    addPointToPath(pos) {
        if (this.selectedShape && this.selectedShape.type === 'path') {
            const snappedPos = this.snapPoint(pos);
            
            // Находим ближайший сегмент для вставки точки
            let insertIndex = this.selectedShape.points.length;
            let minDistance = Infinity;
            
            for (let i = 0; i < this.selectedShape.points.length; i++) {
                const p1 = this.selectedShape.points[i];
                const p2 = this.selectedShape.points[(i + 1) % this.selectedShape.points.length];
                const dist = this.pointToLineDistance(snappedPos, p1, p2);
                
                if (dist < minDistance && dist < 20) {
                    minDistance = dist;
                    insertIndex = i + 1;
                }
            }
            
            if (insertIndex <= this.selectedShape.points.length) {
                this.selectedShape.points.splice(insertIndex, 0, snappedPos);
                this.selectedPoint = { shape: this.selectedShape, index: insertIndex };
            }
        }
    }
    
    // ========== ПРИМИТИВНЫЕ ФИГУРЫ ==========
    
    startPrimitiveShape(pos) {
        this.currentPath = {
            type: this.currentTool,
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
            color: this.currentColor,
            strokeWidth: this.strokeWidth,
            fill: this.fillMode === 'filled',
            health: this.blockHealth,
            effect: this.blockEffect
        };
        
        if (this.currentTool === 'circle') {
            this.currentPath.radius = 0;
        }
    }
    
    updatePrimitiveShape(pos) {
        if (this.currentPath) {
            if (this.currentTool === 'rectangle') {
                this.currentPath.width = pos.x - this.currentPath.x;
                this.currentPath.height = pos.y - this.currentPath.y;
            } else if (this.currentTool === 'circle') {
                this.currentPath.radius = Math.sqrt(
                    Math.pow(pos.x - this.currentPath.x, 2) + 
                    Math.pow(pos.y - this.currentPath.y, 2)
                );
            }
        }
    }
    
    finalizePrimitiveShape() {
        if (this.currentPath) {
            // Проверяем что фигура имеет размер
            const hasSize = this.currentTool === 'rectangle' ? 
                Math.abs(this.currentPath.width) > 5 && Math.abs(this.currentPath.height) > 5 :
                this.currentPath.radius > 5;
            
            if (hasSize) {
                this.shapes.push(this.currentPath);
            }
            this.currentPath = null;
        }
    }
    
    // ========== ВЫДЕЛЕНИЕ И РЕДАКТИРОВАНИЕ ==========
    
    selectShapeOrPoint(pos, multiSelect = false) {
        // Сначала проверяем точки
        const point = this.getPointAt(pos);
        if (point) {
            this.selectedPoint = point;
            if (!multiSelect) {
                this.selectedShape = point.shape;
            }
            return;
        }
        
        // Затем проверяем фигуры
        const shape = this.getShapeAt(pos);
        if (shape) {
            if (!multiSelect || !this.selectedShape) {
                this.selectedShape = shape;
            }
            this.selectedPoint = null;
        } else {
            if (!multiSelect) {
                this.selectedShape = null;
                this.selectedPoint = null;
            }
        }
    }
    
    getPointAt(pos) {
        for (const shape of this.shapes) {
            if (shape.type === 'path') {
                for (let i = 0; i < shape.points.length; i++) {
                    const point = shape.points[i];
                    const distance = Math.sqrt(Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2));
                    if (distance < 8) {
                        return { shape, index: i, point };
                    }
                }
            }
        }
        return null;
    }
    
    getShapeAt(pos) {
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            if (this.isPointInShape(pos, shape)) {
                return shape;
            }
        }
        return null;
    }
    
    isPointInShape(pos, shape) {
        switch (shape.type) {
            case 'path':
                return this.isPointInPath(pos, shape);
            case 'rectangle':
                return pos.x >= shape.x && pos.x <= shape.x + shape.width && 
                       pos.y >= shape.y && pos.y <= shape.y + shape.height;
            case 'circle':
                return Math.sqrt(Math.pow(pos.x - shape.x, 2) + Math.pow(pos.y - shape.y, 2)) <= shape.radius;
            default:
                return false;
        }
    }
    
    isPointInPath(pos, path) {
        // Простая проверка для выпуклых многоугольников
        if (path.points.length < 3) return false;
        
        let inside = false;
        for (let i = 0, j = path.points.length - 1; i < path.points.length; j = i++) {
            const pi = path.points[i];
            const pj = path.points[j];
            
            if (((pi.y > pos.y) !== (pj.y > pos.y)) &&
                (pos.x < (pj.x - pi.x) * (pos.y - pi.y) / (pj.y - pi.y) + pi.x)) {
                inside = !inside;
            }
        }
        return inside;
    }
    
    movePoint(pos) {
        if (this.selectedPoint) {
            const snappedPos = this.snapPoint(pos);
            this.selectedPoint.shape.points[this.selectedPoint.index] = snappedPos;
        }
    }
    
    moveShape(pos) {
        if (this.selectedShape) {
            // Для простоты - будем двигать всю фигуру
            // В реальной реализации нужно учитывать смещение
        }
    }
    
    deleteSelectedPoint() {
        if (this.selectedPoint && this.selectedPoint.shape.points.length > 2) {
            this.selectedPoint.shape.points.splice(this.selectedPoint.index, 1);
            this.selectedPoint = null;
            this.saveToHistory();
            this.render();
        }
    }
    
    deleteSelectedShape() {
        if (this.selectedShape) {
            const index = this.shapes.indexOf(this.selectedShape);
            if (index > -1) {
                this.shapes.splice(index, 1);
                this.selectedShape = null;
                this.selectedPoint = null;
                this.saveToHistory();
                this.render();
            }
        }
    }
    
    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    
    snapPoint(pos) {
        if (!this.snapToGrid) return pos;
        
        const gridSize = 10;
        return {
            x: Math.round(pos.x / gridSize) * gridSize,
            y: Math.round(pos.y / gridSize) * gridSize
        };
    }
    
    pointToLineDistance(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    updateHoverPoint(pos) {
        this.hoverPoint = this.getPointAt(pos);
        
        if (this.hoverPoint) {
            const point = this.hoverPoint.point;
            this.pointInfo.style.display = 'block';
            this.pointInfo.style.left = (pos.x * this.scale + this.offsetX + 10) + 'px';
            this.pointInfo.style.top = (pos.y * this.scale + this.offsetY + 10) + 'px';
            this.pointInfo.textContent = `Точка: ${Math.round(point.x)}, ${Math.round(point.y)}`;
        } else {
            this.pointInfo.style.display = 'none';
        }
    }
    
    // ========== РЕНДЕРИНГ ==========
    
    render() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);
        
        // Рендерим фигуры
        this.shapes.forEach(shape => {
            this.drawShape(shape);
        });
        
        // Рендерим текущий путь
        if (this.currentPath) {
            this.drawShape(this.currentPath);
        }
        
        // Рендерим выделение
        if (this.selectedShape) {
            this.drawSelection(this.selectedShape);
        }
        
        // Рендерим точки редактирования
        this.drawEditPoints();
        
        this.ctx.restore();
    }
    
    drawShape(shape) {
        this.ctx.strokeStyle = shape.color;
        this.ctx.fillStyle = shape.fill ? shape.color : 'transparent';
        this.ctx.lineWidth = shape.strokeWidth;
        
        switch (shape.type) {
            case 'path':
                this.ctx.beginPath();
                this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
                
                for (let i = 1; i < shape.points.length; i++) {
                    this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
                }
                
                if (shape.closed && shape.points.length > 2) {
                    this.ctx.closePath();
                }
                
                if (shape.fill) {
                    this.ctx.fill();
                }
                this.ctx.stroke();
                break;
                
            case 'rectangle':
                if (shape.fill) {
                    this.ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
                }
                this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                break;
                
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
                if (shape.fill) {
                    this.ctx.fill();
                }
                this.ctx.stroke();
                break;
        }
    }
    
    drawSelection(shape) {
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        
        switch (shape.type) {
            case 'path':
                const bounds = this.getPathBounds(shape);
                this.ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);
                break;
                
            case 'rectangle':
                this.ctx.strokeRect(shape.x - 5, shape.y - 5, shape.width + 10, shape.height + 10);
                break;
                
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(shape.x, shape.y, shape.radius + 5, 0, 2 * Math.PI);
                this.ctx.stroke();
                break;
        }
        
        this.ctx.setLineDash([]);
    }
    
    drawEditPoints() {
        if (this.selectedShape && this.selectedShape.type === 'path') {
            this.ctx.fillStyle = '#00ffff';
            this.selectedShape.points.forEach((point, index) => {
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Подсвечиваем выбранную точку
                if (this.selectedPoint && this.selectedPoint.index === index) {
                    this.ctx.strokeStyle = '#ff0000';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
                    this.ctx.stroke();
                }
            });
        }
    }
    
    getPathBounds(path) {
        if (path.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
        
        let minX = path.points[0].x;
        let minY = path.points[0].y;
        let maxX = path.points[0].x;
        let maxY = path.points[0].y;
        
        for (const point of path.points) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    // ========== РАБОТА С ИЗОБРАЖЕНИЕМ ==========
    
    loadImage(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.image = new Image();
            this.image.onload = () => {
                this.referenceImage.src = e.target.result;
                this.referenceImage.style.display = 'block';
                this.centerImage();
                this.render();
            };
            this.image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    centerImage() {
        if (this.image) {
            const container = this.canvas.parentElement;
            const scaleX = container.clientWidth / this.image.width;
            const scaleY = container.clientHeight / this.image.height;
            const scale = Math.min(scaleX, scaleY, 1);
            
            const x = (container.clientWidth - this.image.width * scale) / 2;
            const y = (container.clientHeight - this.image.height * scale) / 2;
            
            this.referenceImage.style.width = (this.image.width * scale) + 'px';
            this.referenceImage.style.height = (this.image.height * scale) + 'px';
            this.referenceImage.style.left = x + 'px';
            this.referenceImage.style.top = y + 'px';
        }
    }
    
    updateDisplayMode() {
        switch (this.displayMode) {
            case 'both':
                this.referenceImage.style.display = 'block';
                this.canvas.style.display = 'block';
                break;
            case 'vector':
                this.referenceImage.style.display = 'none';
                this.canvas.style.display = 'block';
                break;
            case 'image':
                this.referenceImage.style.display = 'block';
                this.canvas.style.display = 'none';
                break;
        }
    }
    
    // ========== СИСТЕМНЫЕ МЕТОДЫ ==========
    
    drawGrid() {
        const ctx = this.gridCtx;
        ctx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
        
        const gridSize = 20 * this.scale;
        const startX = this.offsetX % gridSize;
        const startY = this.offsetY % gridSize;
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        
        for (let x = startX; x < this.gridCanvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.gridCanvas.height);
            ctx.stroke();
        }
        
        for (let y = startY; y < this.gridCanvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.gridCanvas.width, y);
            ctx.stroke();
        }
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
    
    resetView() {
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        document.getElementById('zoomLevel').textContent = '100%';
        this.drawGrid();
        this.render();
    }
    
    saveToHistory() {
        this.history = this.history.slice(0, this.historyIndex + 1);
        const snapshot = JSON.parse(JSON.stringify(this.shapes));
        this.history.push(snapshot);
        this.historyIndex++;
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.shapes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.selectedShape = null;
            this.selectedPoint = null;
            this.render();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.shapes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.render();
        }
    }
    
    clearCanvas() {
        if (confirm('Очистить векторные фигуры?')) {
            this.saveToHistory();
            this.shapes = [];
            this.selectedShape = null;
            this.selectedPoint = null;
            this.render();
        }
    }
    
    newProject() {
        if (confirm('Создать новый проект? Несохраненные изменения будут потеряны.')) {
            this.shapes = [];
            this.selectedShape = null;
            this.selectedPoint = null;
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
            name: prompt('Название уровня:', 'Трассированный уровень'),
            author: prompt('Автор:', 'Аноним'),
            shapes: this.shapes,
            image: this.referenceImage.src,
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
        a.download = (project.name || 'traced_level') + '.json';
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    exportToGame() {
        const gameLevel = {
            title: prompt('Название уровня для игры:', 'Трассированный уровень'),
            author: prompt('Автор:', 'Аноним'),
            background: '#1a1a2e',
            elements: []
        };
        
        this.shapes.forEach(shape => {
            const element = {
                type: shape.type,
                color: shape.color,
                health: shape.health,
                effect: shape.effect
            };
            
            if (shape.type === 'path') {
                element.points = shape.points;
                element.closed = shape.closed;
                element.filled = shape.fill;
            } else if (shape.type === 'rectangle') {
                element.x = Math.round(shape.x);
                element.y = Math.round(shape.y);
                element.width = Math.round(shape.width);
                element.height = Math.round(shape.height);
            } else if (shape.type === 'circle') {
                element.x = Math.round(shape.x);
                element.y = Math.round(shape.y);
                element.radius = Math.round(shape.radius);
            }
            
            gameLevel.elements.push(element);
        });
        
        const data = JSON.stringify(gameLevel, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = (gameLevel.title || 'traced_level') + '_game.json';
        a.click();
        
        URL.revokeObjectURL(url);
        
        alert('Уровень экспортирован для игры!');
    }
}

// Инициализация трассировщика
document.addEventListener('DOMContentLoaded', () => {
    new VectorTracer();
});