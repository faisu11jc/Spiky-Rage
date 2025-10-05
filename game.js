// --- CORE GAME STATE & CONSTANTS ---
const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;
const PLAYER_WIDTH = 25;
const PLAYER_HEIGHT = 25;
const LEVEL_COUNT = 5; // Final count: 5 levels

// Level 1 Mechanics
const RISE_BLOCK_ID = 'rise-1';
const PENDULUM_ID = 'pend-1';

let gameState = {
    tapCount: 0,
    currentLevel: 1,
    unlockedLevels: parseInt(localStorage.getItem('unlockedLevels') || 1), 
    
    // Player Physics & State
    player: { x: 50, y: 0, dx: 0, dy: 0, width: PLAYER_WIDTH, height: PLAYER_HEIGHT, onGround: false },
    gravity: 0.7,
    jumpPower: -13,
    moveSpeed: 5,
    isDead: false,
    gameLoopRunning: false, // Control flag for the game loop
    
    // Input Handling
    keys: {},
    touchHeld: false, 
    jumpBuffer: 0,
    coyoteTime: 0,
    
    // Mechanics State
    pendulum: null,
};

// --- LEVEL DEFINITIONS (Level 2+ are placeholders for now) ---
const levels = {
    1: {
        spawn: [20, 420], // Start at x=20, y_bottom=50 (400 from top)
        blocks: [
            // Black platform on upper left (Orange starts here)
            [0, 300, 150, 20, 0, 'block-start'], 
            
            // Pink Instant-Rise Block (Starts low, will rise 100px)
            [150, 300, 50, 50, 0, RISE_BLOCK_ID, 'rise'], 
            
            // Black platform after the rise block (Small pit)
            [200, 300, 100, 20, 0, 'block-low'], 
            
            // Pathole/Gap (No block here)
            [320, 300, 150, 20, 0, 'block-after-pit'], 

            // Long Black platform under the pendulum
            [480, 300, 200, 20, 0, 'block-pendulum-base'],
            
            // Trap Spikes on the upper left corner
            [150, 50, 150, 20, 1, 'trap-left-ceiling'],
        ],
        exit: [700, 300, 20, 40], // Exit door is on the far right platform

        // Pendulum Data
        pendulum: {
            id: PENDULUM_ID,
            anchorX: 580,
            anchorY: 100, // Top of the rope
            length: 200, // Rope length
            swingAngle: Math.PI / 4, // 45 degrees swing
            speed: 0.04,
            hiddenUntilX: 500, // Pendulum is hidden/static until player passes this X coordinate
        }
    },
    2: { spawn: [50, 50], blocks: [[0, 0, 800, 50, 0, 'g']], exit: [750, 50, 20, 40] },
    3: { spawn: [50, 50], blocks: [[0, 0, 800, 50, 0, 'g']], exit: [750, 50, 20, 40] },
    4: { spawn: [50, 50], blocks: [[0, 0, 800, 50, 0, 'g']], exit: [750, 50, 20, 40] },
    5: { spawn: [50, 50], blocks: [[0, 0, 800, 50, 0, 'g']], exit: [750, 50, 20, 40] },
};


// --- DOM ELEMENTS ---
const introScreen = document.getElementById('intro-screen');
const glowingDoor = document.getElementById('glowing-door');
const tapText = document.getElementById('tap-text');
const typewriterScreen = document.getElementById('typewriter-screen');
const typewriterTextElement = document.getElementById('typewriter-text');
const continuePrompt = document.getElementById('continue-prompt');
const nextButton = document.getElementById('next-button');
const transitionOverlay = document.getElementById('transition-overlay');
const levelSelect = document.getElementById('level-select'); 
const levelGrid = document.getElementById('level-grid');
const gameScreen = document.getElementById('game-screen');
const gameCanvas = document.getElementById('game-canvas');
const playerElement = document.getElementById('player');
const textOverlay = document.getElementById('text-overlay');


// --- INTRO/CINEMATIC LOGIC ---

function initIntro() {
    setTimeout(() => {
        glowingDoor.classList.add('zoom-in');
        introScreen.classList.add('ready'); 
    }, 100); 
    glowingDoor.addEventListener('click', handleDoorTap);
}

function handleDoorTap() {
    gameState.tapCount++;
    if (gameState.tapCount === 1) {
        tapText.textContent = `TAP...`;
    }

    if (gameState.tapCount >= 2) {
        glowingDoor.removeEventListener('click', handleDoorTap);
        glowingDoor.style.opacity = 0;
        introScreen.classList.add('white-flash');
        
        setTimeout(() => {
            introScreen.classList.add('hidden');
            startTypewriterSequence();
        }, 500); 
    }
}

const MESSAGE = "Hello, welcome to the Game,\ncoded by FAIZ.";
const TYPING_SPEED = 70; 

function startTypewriterSequence() {
    typewriterScreen.classList.remove('hidden');
    typewriterTextElement.textContent = '';
    type(0);
}

function type(i) {
    if (i < MESSAGE.length) {
        if (MESSAGE.charAt(i) === '\n') {
            typewriterTextElement.innerHTML += '<br>';
        } else {
            typewriterTextElement.textContent += MESSAGE.charAt(i);
        }
        typewriterTextElement.style.borderRight = '3px solid black';
        
        setTimeout(() => {
            typewriterTextElement.style.borderRight = '3px solid transparent';
            type(i + 1);
        }, TYPING_SPEED);
    } else {
        typewriterTextElement.style.borderRight = 'none';
        setTimeout(() => {
            continuePrompt.style.opacity = 1;
            continuePrompt.classList.remove('hidden');
            document.addEventListener('keydown', handleContinueInput);
        }, 500);
    }
}

function handleContinueInput(e) {
    if (e.code === 'Enter') {
        document.removeEventListener('keydown', handleContinueInput);
        continuePrompt.classList.add('hidden');
        nextButton.classList.remove('hidden');
        
        setTimeout(() => {
            nextButton.style.opacity = 1;
        }, 100);

        nextButton.addEventListener('click', startDiffusionTransition);
    }
}

function startDiffusionTransition() {
    transitionOverlay.classList.remove('hidden');
    document.body.classList.add('diffuse-start');
    
    setTimeout(() => {
        typewriterScreen.classList.add('hidden');
        showLevelSelect(); 
        
        document.body.classList.remove('diffuse-start');
        transitionOverlay.classList.add('hidden');
    }, 1000); 
}

// --- LEVEL SELECT LOGIC ---

function showLevelSelect() {
    levelSelect.classList.remove('hidden');
    generateLevelSelect();
}

function generateLevelSelect() {
    levelGrid.innerHTML = '';
    
    for (let i = 1; i <= LEVEL_COUNT; i++) {
        const levelBox = document.createElement('div');
        levelBox.classList.add('level-box');
        levelBox.setAttribute('data-level', i);
        levelBox.innerHTML = `<span class="level-number">${i}</span>`;

        if (i <= gameState.unlockedLevels) {
            levelBox.classList.add('unlocked');
            levelBox.innerHTML += `<p>LEVEL</p>`;
            levelBox.addEventListener('click', () => startLevel(i)); 
        } else {
            levelBox.classList.add('locked');
            levelBox.innerHTML += `<p>LOCKED</p>`;
            levelBox.addEventListener('click', () => alert('Level is locked! Complete the previous one.'));
        }

        levelGrid.appendChild(levelBox);
    }
}

// --- GAME SETUP & FLOW ---

function renderLevelGeometry() {
    // Clear old blocks before rendering new ones
    while (gameCanvas.querySelector('.game-block, .trap-block, .rise-block, .exit-door, .pendulum-rope, .pendulum-ball')) {
        gameCanvas.lastElementChild.remove();
    }
    
    const currentLevelData = levels[gameState.currentLevel];
    
    // 1. Render Blocks and Traps
    currentLevelData.blocks.forEach(blockData => {
        const [x, y_bottom, w, h, isTrap, id, type] = blockData;
        const block = document.createElement('div');
        
        block.id = id;
        block.style.left = `${x}px`;
        block.style.width = `${w}px`;
        block.style.height = `${h}px`;
        block.style.top = `${GAME_HEIGHT - y_bottom - h}px`; 
        
        if (isTrap === 1) {
            block.classList.add('trap-block');
        } else if (type === 'rise') {
            block.classList.add('rise-block');
            block.dataset.initialY = parseInt(block.style.top);
            block.dataset.targetY = parseInt(block.style.top) - 250; // Rises into the spikes!
            block.dataset.triggered = 'false';
        } else {
            block.classList.add('game-block');
        }
        
        gameCanvas.appendChild(block);
    });

    // 2. Render Exit Door
    const [exitX, exitY_bottom, exitW, exitH] = currentLevelData.exit;
    const exitDoor = document.createElement('div');
    exitDoor.id = 'exit-door';
    exitDoor.classList.add('exit-door');
    exitDoor.style.left = `${exitX}px`;
    exitDoor.style.width = `${exitW}px`;
    exitDoor.style.height = `${exitH}px`;
    exitDoor.style.top = `${GAME_HEIGHT - exitY_bottom - exitH}px`;
    gameCanvas.appendChild(exitDoor);

    // 3. Render Pendulum (Level 1 only)
    if (currentLevelData.pendulum) {
        const pendulumRope = document.createElement('div');
        pendulumRope.id = `${PENDULUM_ID}-rope`;
        pendulumRope.classList.add('pendulum-rope');
        pendulumRope.style.left = `${currentLevelData.pendulum.anchorX}px`;
        gameCanvas.appendChild(pendulumRope);

        const pendulumBall = document.createElement('div');
        pendulumBall.id = `${PENDULUM_ID}-ball`;
        pendulumBall.classList.add('pendulum-ball');
        gameCanvas.appendChild(pendulumBall);

        gameState.pendulum = {
            angle: 0, time: 0, active: false, ...currentLevelData.pendulum
        };
        pendulumRope.style.height = '0px'; 
        pendulumRope.style.top = `${currentLevelData.pendulum.anchorY}px`; 
        pendulumRope.style.transformOrigin = 'top center';
    } else {
        gameState.pendulum = null;
    }
}

function startLevel(levelId) {
    if (levelId > gameState.unlockedLevels) return;

    levelSelect.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    textOverlay.classList.add('hidden'); // Ensure text overlay is clear

    gameState.currentLevel = levelId;
    document.getElementById('current-level').textContent = levelId;

    renderLevelGeometry();

    // Reset player position
    const [spawnX, spawnY_bottom] = levels[levelId].spawn;
    gameState.player.x = spawnX;
    gameState.player.y = GAME_HEIGHT - spawnY_bottom - PLAYER_HEIGHT; 
    gameState.player.dx = 0;
    gameState.player.dy = 0;
    gameState.isDead = false;
    
    // Ensure player is visible and not crushed
    playerElement.classList.remove('player-crushed');
    playerElement.classList.remove('player-flicker');

    if (!gameState.gameLoopRunning) {
        gameState.gameLoopRunning = true;
        gameLoop(); 
    }
}

function restartLevel() {
    if (gameState.isDead) return;
    gameState.isDead = true;
    gameState.gameLoopRunning = false;
    
    // JUICY DEATH VISUALS
    playerElement.classList.add('player-crushed');
    gameCanvas.classList.add('screen-shake');
    textOverlay.textContent = 'JUICY.';
    textOverlay.classList.remove('hidden');

    setTimeout(() => {
        // Cleanup and Reset
        gameCanvas.classList.remove('screen-shake');
        playerElement.classList.remove('player-crushed');
        textOverlay.classList.add('hidden');
        textOverlay.textContent = 'pain.';

        // Restart Level
        startLevel(gameState.currentLevel); 
    }, 1000); 
}

// --- WIN/LEVEL UP LOGIC ---

function checkWinCondition() {
    const player = gameState.player;
    const currentLevel = levels[gameState.currentLevel];
    const [exitX, exitY_bottom, exitW, exitH] = currentLevel.exit;

    const exitTop = GAME_HEIGHT - exitY_bottom - exitH;
    const exitBottom = GAME_HEIGHT - exitY_bottom;
    const exitLeft = exitX;
    const exitRight = exitX + exitW;

    const pTop = player.y;
    const pBottom = player.y + player.height;
    const pLeft = player.x;
    const pRight = player.x + player.width;

    if (pRight > exitLeft && pLeft < exitRight && pBottom > exitTop && pTop < exitBottom) {
        winLevel();
    }
}

function winLevel() {
    if (gameState.isDead || !gameState.gameLoopRunning) return; 
    
    gameState.gameLoopRunning = false; 
    const nextLevel = gameState.currentLevel + 1;

    if (nextLevel <= LEVEL_COUNT) {
        gameState.unlockedLevels = Math.max(gameState.unlockedLevels, nextLevel);
        localStorage.setItem('unlockedLevels', gameState.unlockedLevels);

        textOverlay.textContent = `LEVEL ${nextLevel} UNLOCKED`;
        textOverlay.classList.remove('hidden');
        textOverlay.classList.add('level-unlocked');
        
        setTimeout(() => {
            gameScreen.classList.add('hidden');
            textOverlay.classList.remove('level-unlocked');
            showLevelSelect();
        }, 2500);
    } else {
        textOverlay.textContent = "CONGRATULATIONS, FAIZ! GAME COMPLETE.";
        textOverlay.classList.remove('hidden');
        textOverlay.classList.add('level-unlocked');
    }
}


// --- INPUT HANDLERS (Hybrid Controls) ---

document.addEventListener('keydown', (e) => {
    gameState.keys[e.code] = true;
    if (e.code === 'KeyR') restartLevel();
    if (e.code === 'KeyW' || e.code === 'Space') {
        gameState.jumpBuffer = 10;
    }
});
document.addEventListener('keyup', (e) => {
    gameState.keys[e.code] = false;
});

gameCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); 
    const touchX = e.touches[0].clientX - gameCanvas.getBoundingClientRect().left;
    const midpoint = GAME_WIDTH / 2;

    gameState.touchHeld = true;

    if (touchX < midpoint) {
        gameState.keys.MoveLeft = true; 
        gameState.keys.MoveRight = false; 
    } else {
        gameState.keys.MoveLeft = false; 
        gameState.keys.MoveRight = true; 
    }
    
    if (gameState.player.onGround || gameState.coyoteTime > 0) {
        gameState.jumpBuffer = 10;
    }
});

gameCanvas.addEventListener('touchend', () => {
    gameState.touchHeld = false;
    gameState.keys.MoveLeft = false;
    gameState.keys.MoveRight = false;
});

// --- GAME LOOP & PHYSICS ---

function handleInput() {
    gameState.player.dx = 0;

    // Desktop/PC Movement
    if (gameState.keys['KeyA'] || gameState.keys.MoveLeft) {
        gameState.player.dx = -gameState.moveSpeed;
    }
    if (gameState.keys['KeyD'] || gameState.keys.MoveRight) {
        gameState.player.dx = gameState.moveSpeed;
    }

    // Jump Logic
    if (gameState.jumpBuffer > 0 && (gameState.player.onGround || gameState.coyoteTime > 0)) {
        gameState.player.dy = gameState.jumpPower;
        gameState.player.onGround = false;
        gameState.coyoteTime = 0;
        gameState.jumpBuffer = 0;
    }

    // Mobile Rapid Tap/Hold Jump (Air time)
    if (gameState.touchHeld && gameState.player.dy > -10) {
         gameState.player.dy -= 0.5;
    }
    
    if (gameState.jumpBuffer > 0) gameState.jumpBuffer--;
    if (gameState.coyoteTime > 0) gameState.coyoteTime--;
}

function updatePhysics() {
    // Apply gravity
    gameState.player.dy += gameState.gravity;
    
    // Apply velocity to position
    gameState.player.x += gameState.player.dx;
    gameState.player.y += gameState.player.dy;
    
    // Clamp to boundaries
    gameState.player.x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_WIDTH, gameState.player.x));
    
    // Out of bounds check (Death by falling)
    if (gameState.player.y > GAME_HEIGHT) {
        restartLevel();
    }
}

// --- COLLISION CHECK (The Core of the Platformer) ---

function collisionCheck() {
    let player = gameState.player;
    let onGroundThisFrame = false;
    
    const allBlocks = gameCanvas.querySelectorAll('.game-block, .trap-block, .rise-block, .pendulum-ball');
    
    const blockRects = Array.from(allBlocks).map(blockElement => {
        const x = parseInt(blockElement.style.left);
        const w = parseInt(blockElement.style.width || 20); // Default for pendulum ball
        const h = parseInt(blockElement.style.height || 20); // Default for pendulum ball
        const y = parseInt(blockElement.style.top);
        
        return {
            x: x, y: y, width: w, height: h,
            isTrap: blockElement.classList.contains('trap-block') || (blockElement.id === PENDULUM_ID + '-ball'), // Pendulum ball is a trap
            element: blockElement,
        };
    });

    blockRects.forEach(block => {
        const isColliding = (
            player.x < block.x + block.width && player.x + player.width > block.x &&
            player.y < block.y + block.height && player.y + player.height > block.y
        );

        if (isColliding) {
            
            // 1. Trap Collision (Instant Death)
            if (block.isTrap) {
                restartLevel();
                return;
            }

            // 2. Standard Block/Platform Collision (Separation Logic)
            const x_overlap = Math.min(player.x + player.width, block.x + block.width) - Math.max(player.x, block.x);
            const y_overlap = Math.min(player.y + player.height, block.y + block.height) - Math.max(player.y, block.y);

            if (x_overlap < y_overlap) {
                // Horizontal collision
                if (player.x + player.width > block.x && player.x < block.x) {
                    player.x = block.x - player.width;
                } else if (player.x < block.x + block.width && player.x + player.width > block.x + block.width) {
                    player.x = block.x + block.width;
                }
                player.dx = 0;
            } else {
                // Vertical collision
                if (player.y + player.height > block.y && player.y < block.y) {
                    // Landed on platform
                    player.y = block.y - player.height;
                    player.dy = 0;
                    onGroundThisFrame = true;
                } else if (player.y < block.y + block.height && player.y + player.height > block.y + block.height) {
                    // Hit bottom of block (Head bump)
                    player.y = block.y + block.height;
                    player.dy = 0;
                }
            }
            
            // 3. Special Block Interaction: Rise Block Activation
            if (block.element.id === RISE_BLOCK_ID && block.element.dataset.triggered === 'false') {
                block.element.dataset.triggered = 'true';
                block.element.style.top = `${block.element.dataset.targetY}px`;
            }
        }
    });

    if (gameState.player.onGround && !onGroundThisFrame) {
        gameState.coyoteTime = 5;
    }
    gameState.player.onGround = onGroundThisFrame;
}

function updateLevelMechanics() {
    const player = gameState.player;
    const riseBlock = document.getElementById(RISE_BLOCK_ID);

    // 1. Instant-Rise Block Crush Check (if the player is on it and it has risen)
    if (riseBlock && riseBlock.dataset.triggered === 'true') {
        const spikes = document.getElementById('trap-left-ceiling');
        if (spikes) {
            const spikeTop = parseInt(spikes.style.top) + parseInt(spikes.style.height);
            const riseBlockTop = parseInt(riseBlock.style.top);

            // Check if player is stuck between the risen block and the ceiling spikes
            if (player.y < spikeTop && player.y + player.height > riseBlockTop) {
                restartLevel(); 
            }
        }
    }

    // 2. Pendulum Logic (Level 1)
    if (gameState.pendulum) {
        if (player.x > gameState.pendulum.hiddenUntilX && !gameState.pendulum.active) {
            gameState.pendulum.active = true;
            gameState.pendulum.time = 0;
        }

        if (gameState.pendulum.active) {
            gameState.pendulum.time += gameState.pendulum.speed;
            const angle = gameState.pendulum.swingAngle * Math.sin(gameState.pendulum.time);
            gameState.pendulum.angle = angle;
            
            const ballX = gameState.pendulum.anchorX + gameState.pendulum.length * Math.sin(angle);
            const ballY = gameState.pendulum.anchorY + gameState.pendulum.length * Math.cos(angle);
            
            gameState.pendulum.ballX = ballX;
            gameState.pendulum.ballY = ballY;

            // Update the pendulum ball position for collision check
            const pendulumBall = document.getElementById(`${PENDULUM_ID}-ball`);
            if (pendulumBall) {
                 // Move ball to center its new position (based on its 20px size)
                pendulumBall.style.left = `${ballX - 10}px`; 
                pendulumBall.style.top = `${ballY - 10}px`;
            }
        }
    }
}


// --- MAIN GAME LOOP ---
let lastTime = 0;
const FPS = 60;
const frameTime = 1000 / FPS;

function gameLoop(timestamp) {
    if (gameState.gameLoopRunning) {
        if (timestamp - lastTime >= frameTime) {
            handleInput();
            updatePhysics(); 
            collisionCheck();
            updateLevelMechanics();
            checkWinCondition(); 
            render();
            lastTime = timestamp;
        }
    }
    if (gameState.gameLoopRunning) {
        requestAnimationFrame(gameLoop);
    }
}

function render() {
    // 1. Update Player Position
    playerElement.style.left = `${gameState.player.x}px`;
    playerElement.style.top = `${gameState.player.y}px`;
    
    // 2. Apply subtle squash/stretch
    let squashX = 1;
    let squashY = 1;
    if (!gameState.player.onGround) {
        squashY = gameState.player.dy < 0 ? 0.8 : 1.2;
        squashX = gameState.player.dy < 0 ? 1.2 : 0.8;
    } else if (gameState.player.dx !== 0) {
        squashY = 0.95;
        squashX = 1.05;
    }
    playerElement.style.transform = `scaleX(${squashX}) scaleY(${squashY})`;

    // 3. Render Pendulum Rotation
    if (gameState.pendulum && gameState.pendulum.active) {
        const rope = document.getElementById(`${PENDULUM_ID}-rope`);
        const rotation = gameState.pendulum.angle * (180 / Math.PI);
        
        rope.style.transform = `rotate(${rotation}deg)`;
        rope.style.height = `${gameState.pendulum.length}px`;

        document.getElementById(`${PENDULUM_ID}-ball`).style.opacity = 1;
    }
}

// --- INITIAL CALL ---
initIntro();