var CELL_SIZE = 80;
var GRID_COLS = 10;
var GRID_ROWS = 7;
const INITIAL_SPEED = 300;
const MUSIC_TYPES = [
    'latin', 'indie', 'soul', 'classical', 'EDM', 'raggae', 'country',
    'danceMusic', 'folk', 'RnB', 'lofiHipHop', 'pop', 'rock', 'jazz', 'Techno'
];

#    The configuration need to fill to run 
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

let snake = [];
let direction = 'right';
let food = {};
let score = 0;
let gameLoop = null;
let collectedMusic = []; // 每個元素為 {type: 'rock'}
let audioContext = null;
let currentSource = null;
let lastMusicType = null;

// 顏色對應（可自訂）
const musicColors = {
    latin: '#e57373',
    indie: '#ba68c8',
    soul: '#ffd54f',
    classical: '#90caf9',
    EDM: '#4dd0e1',
    raggae: '#81c784',
    country: '#ffb74d',
    danceMusic: '#f06292',
    folk: '#a1887f',
    RnB: '#7986cb',
    lofiHipHop: '#bcaaa4',
    pop: '#f8bbd0',
    rock: '#b0bec5',
    jazz: '#dce775',
    Techno: '#ce93d8'
};

function initGame() {
    snake = [
        { x: 5, y: 5, type: null },
        { x: 4, y: 5, type: null },
        { x: 3, y: 5, type: null }
    ];
    generateFood();
    score = 0;
    direction = 'right';
    collectedMusic = [];
    updateScoreDisplay();
    updateMusicList();
    drawGame();
}

function generateFood() {
    let valid = false;
    let x, y, type;
    while (!valid) {
        x = Math.floor(Math.random() * GRID_COLS);
        y = Math.floor(Math.random() * GRID_ROWS);
        type = MUSIC_TYPES[Math.floor(Math.random() * MUSIC_TYPES.length)];
        // 檢查是否與蛇身重疊
        valid = !snake.some(segment => segment.x === x && segment.y === y);
    }
    food = { x, y, type };
}

function gameUpdate() {
    moveSnake();
    drawGame();
    checkCollision();
}

function drawGame() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 畫蛇身（全部綠色）
    ctx.fillStyle = '#2ecc71';
    snake.forEach(segment => {
        ctx.beginPath();
        ctx.roundRect(
            segment.x * CELL_SIZE,
            segment.y * CELL_SIZE,
            CELL_SIZE - 2,
            CELL_SIZE - 2,
            8
        );
        ctx.fill();
    });

    // 在蛇尾顯示音樂字樣
    if (lastMusicType && snake.length > 0) {
        const tail = snake[snake.length - 1];
        ctx.fillStyle = '#2ecc71'; // 綠色底
        ctx.beginPath();
        ctx.roundRect(
            tail.x * CELL_SIZE,
            tail.y * CELL_SIZE,
            CELL_SIZE - 2,
            CELL_SIZE - 2,
            8
        );
        ctx.fill();

        ctx.fillStyle = "#fff"; // 白色字
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
            lastMusicType,
            tail.x * CELL_SIZE + CELL_SIZE / 2,
            tail.y * CELL_SIZE + CELL_SIZE / 2
        );
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
    }

    // 畫食物
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    const foodCenterX = food.x * CELL_SIZE + CELL_SIZE / 2;
    const foodCenterY = food.y * CELL_SIZE + CELL_SIZE / 2;
    ctx.arc(
        foodCenterX,
        foodCenterY,
        CELL_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // 顯示食物類型
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(food.type, foodCenterX, foodCenterY);

    // 恢復預設（如果後續還要畫其他東西）
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
}

function moveSnake() {
    const head = { x: snake[0].x, y: snake[0].y };
    switch (direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }
    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        playMusic(food.type);
        collectedMusic.push(food.type);
        score += 100;
        updateScoreDisplay();
        updateMusicList();

        lastMusicType = food.type; // 記錄最新音樂類型

        generateFood();
        // 不 pop，蛇長度+1
    } else {
        snake.pop(); // 沒吃到才 pop
    }
}

function checkCollision() {
    const head = snake[0];
    if (
        head.x < 0 || head.x >= GRID_COLS || 
        head.y < 0 || head.y >= GRID_ROWS  
    ) {
        endGame();
        return;
    }
    // 自身碰撞檢查
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            endGame();
            return;
        }
    }
}

function endGame() {
    clearInterval(gameLoop);
    if (currentSource) {
        try { currentSource.stop(); } catch (e) {}
        currentSource.disconnect();
        currentSource = null;
    }
    alert(`遊戲結束！最終分數: ${score}`);
    document.getElementById('feedback-modal').style.display = 'flex';
}

function updateScoreDisplay() {
    document.getElementById('score-display').textContent = `分數: ${score}`;
}

function updateMusicList() {
    const list = document.getElementById('music-list');
    list.innerHTML = collectedMusic
        .map(music => `<div>${music.toUpperCase()}</div>`)
        .join('');
}

async function playMusic(type) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    // 停止上一首
    if (currentSource) {
        try {
            currentSource.stop();
        } catch (e) {}
        currentSource.disconnect();
        currentSource = null;
    }
    try {
        const response = await fetch(`audio/${type}.mp3`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
        currentSource = source; // 記錄目前的 source
    } catch (error) {
        console.error('音頻播放錯誤:', error);
    }
}

document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp': if (direction !== 'down') direction = 'up'; break;
        case 'ArrowDown': if (direction !== 'up') direction = 'down'; break;
        case 'ArrowLeft': if (direction !== 'right') direction = 'left'; break;
        case 'ArrowRight': if (direction !== 'left') direction = 'right'; break;
    }
});

document.getElementById('startBtn').addEventListener('click', () => {
    initGame();
    clearInterval(gameLoop);
    gameLoop = setInterval(gameUpdate, INITIAL_SPEED);
});

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

initGame();

document.getElementById('submitFeedback').onclick = function() {
    const nickname = document.getElementById('nickname').value.trim();
    const suggestedGenre = document.getElementById('suggestedGenre').value.trim();
    if (!nickname) {
        alert('請輸入暱稱');
        return;
    }
    // 寫入 leaderboard 節點
    firebase.database().ref('leaderboard').push({
        nickname: nickname,
        score: score,
        feedback: suggestedGenre,
        timestamp: Date.now()
    }).then(() => {
        document.getElementById('feedback-modal').style.display = 'none';
        // 清空欄位
        document.getElementById('nickname').value = '';
        document.getElementById('suggestedGenre').value = '';
        // 顯示排行榜
        showLeaderboard();
    }).catch(err => {
        alert('回饋送出失敗，請稍後再試');
        console.error(err);
    });
};

function showLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '<tr><td colspan="3">載入中...</td></tr>';
    firebase.database().ref('leaderboard').orderByChild('score').limitToLast(20).once('value', function(snapshot) {
        const arr = [];
        snapshot.forEach(child => {
            arr.push(child.val());
        });
        arr.reverse(); // 分數高的在前
        tbody.innerHTML = arr.map(item => `
            <tr>
                <td>${item.nickname}</td>
                <td>${item.score}</td>
                <td>${item.feedback || ''}</td>
            </tr>
        `).join('') || '<tr><td colspan="3">目前沒有資料</td></tr>';
        document.getElementById('leaderboard-modal').style.display = 'flex';
    });
}



