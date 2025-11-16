/**
 * 원숭이 족치기 게임 - 클라이언트 사이드 로직
 */

// 게임 상태
let gameState = {
    money: 0,
    damage: 1,
    currentTool: 'fist',
    tools: {},
    combo: 0,
    comboTimer: null,
    lastHitTime: 0,
    multiplier: 1.0,
    multiplierTimer: null,
    multiplierEndTime: 0,
    totalClicks: 0,
    totalMoneyEarned: 0,
    soundEnabled: true,
    achievements: {}  // 업적 저장
};

// 업적 정의
const achievements = [
    { id: 'first_click', name: '첫 클릭', desc: '원숭이를 처음 클릭하세요', icon: '👆', condition: () => gameState.totalClicks >= 1 },
    { id: 'hundred_clicks', name: '열심히 때리기', desc: '100번 클릭하세요', icon: '💪', condition: () => gameState.totalClicks >= 100 },
    { id: 'thousand_clicks', name: '클릭 마스터', desc: '1,000번 클릭하세요', icon: '👑', condition: () => gameState.totalClicks >= 1000 },
    { id: 'first_money', name: '첫 수입', desc: '돈 10원 획득', icon: '💰', condition: () => gameState.totalMoneyEarned >= 10 },
    { id: 'hundred_money', name: '부자되기', desc: '총 100원 획득', icon: '💵', condition: () => gameState.totalMoneyEarned >= 100 },
    { id: 'thousand_money', name: '대부호', desc: '총 1,000원 획득', icon: '💎', condition: () => gameState.totalMoneyEarned >= 1000 },
    { id: 'first_combo', name: '콤보 시작', desc: '20콤보 달성', icon: '🔥', condition: () => gameState.combo >= 20 },
    { id: 'first_tool', name: '첫 구매', desc: '첫 도구 구매', icon: '🛒', condition: () => {
        return Object.values(gameState.tools).some(tool => tool.owned && tool.price > 0);
    }},
    { id: 'all_tools', name: '도구 수집가', desc: '모든 도구 구매', icon: '🏆', condition: () => {
        return Object.values(gameState.tools).every(tool => tool.owned);
    }}
];

// DOM 요소들
const monkeyElement = document.getElementById('monkey');
const moneyElement = document.getElementById('money');
const damageElement = document.getElementById('damage');
const comboElement = document.getElementById('combo');
const multiplierDisplay = document.getElementById('multiplier-display');
const multiplierTimerElement = document.getElementById('multiplier-timer');
const toolsListElement = document.getElementById('tools-list');
const shopSection = document.getElementById('shop-section');
const openShopBtn = document.getElementById('open-shop');
const closeShopBtn = document.getElementById('close-shop');
const shopItemsElement = document.getElementById('shop-items');
const earnedPopup = document.getElementById('earned-popup');
const damageTextElement = document.getElementById('damage-text');
const totalClicksElement = document.getElementById('total-clicks');
const monkeyExpressionElement = document.getElementById('monkey-expression');
const particlesContainer = document.getElementById('particles-container');

// 모달 관련 요소
const tutorialModal = document.getElementById('tutorial-modal');
const achievementsModal = document.getElementById('achievements-modal');
const helpBtn = document.getElementById('help-btn');
const achievementsBtn = document.getElementById('achievements-btn');
const closeTutorialBtn = document.getElementById('close-tutorial');
const closeAchievementsBtn = document.getElementById('close-achievements');
const startGameBtn = document.getElementById('start-game');
const achievementPopup = document.getElementById('achievement-popup');
const achievementsListElement = document.getElementById('achievements-list');

// 사운드 관련
const soundToggleBtn = document.getElementById('sound-toggle');
let soundEnabled = true;

/**
 * 게임 초기화
 */
async function initGame() {
    // localStorage에서 저장된 게임 데이터 로드
    loadGameFromStorage();
    
    await loadGameState();
    
    // 초기 업적 상태 로드
    loadAchievements();
    
    renderTools();
    renderShop();
    renderAchievements();
    setupEventListeners();
    
    // 주기적으로 게임 저장 (5초마다)
    setInterval(saveGameToStorage, 5000);
    
    // 페이지 떠나기 전 저장
    window.addEventListener('beforeunload', saveGameToStorage);
    
    // 업적 체크 (주기적으로)
    setInterval(checkAchievements, 1000);
    
    // 처음 방문 시 튜토리얼 표시
    if (!localStorage.getItem('tutorialSeen')) {
        showTutorial();
    }
}

/**
 * 서버에서 게임 상태 로드
 */
async function loadGameState() {
    try {
        const response = await fetch('/api/game-state');
        const data = await response.json();
        
        gameState.money = data.money;
        gameState.damage = data.damage;
        gameState.currentTool = data.current_tool;
        gameState.tools = data.tools;
        
        updateUI();
    } catch (error) {
        console.error('게임 상태 로드 실패:', error);
    }
}

/**
 * UI 업데이트
 */
function updateUI() {
    moneyElement.textContent = formatNumber(gameState.money);
    damageElement.textContent = formatNumber(gameState.damage);
    comboElement.textContent = gameState.combo;
    totalClicksElement.textContent = formatNumber(gameState.totalClicks);
    
    // 도구 선택 UI 업데이트
    renderTools();
    
    // 배수 타이머 업데이트
    updateMultiplierTimer();
}

/**
 * 숫자 포맷팅 (천 단위 구분)
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 도구 목록 렌더링
 */
function renderTools() {
    toolsListElement.innerHTML = '';
    
    Object.entries(gameState.tools).forEach(([toolId, tool]) => {
        if (!tool.owned) return; // 보유하지 않은 도구는 표시하지 않음
        
        const toolItem = document.createElement('div');
        toolItem.className = `tool-item ${toolId === gameState.currentTool ? 'active' : ''}`;
        toolItem.innerHTML = `
            <span class="tool-icon">${tool.icon}</span>
            <div class="tool-info">
                <div class="tool-name">${tool.name}</div>
                <div class="tool-damage">데미지: ${formatNumber(tool.damage)}</div>
            </div>
        `;
        
        toolItem.addEventListener('click', () => {
            equipTool(toolId);
            // 클릭 애니메이션
            toolItem.classList.add('clicked');
            setTimeout(() => toolItem.classList.remove('clicked'), 200);
        });
        
        toolsListElement.appendChild(toolItem);
    });
}

/**
 * 도구 장착
 */
async function equipTool(toolId) {
    try {
        const response = await fetch('/api/equip-tool', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tool_id: toolId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            gameState.currentTool = data.current_tool;
            gameState.damage = data.damage;
            updateUI();
            
            // 게임 저장
            saveGameToStorage();
        }
    } catch (error) {
        console.error('도구 장착 실패:', error);
    }
}

/**
 * 원숭이 클릭 처리
 */
async function hitMonkey() {
    const now = Date.now();
    gameState.totalClicks++;
    
    // 콤보 시스템: 3초 이내에 연속으로 때리면 콤보 증가
    if (now - gameState.lastHitTime < 3000) {
        gameState.combo++;
        
        // 기존 타이머 클리어
        if (gameState.comboTimer) {
            clearTimeout(gameState.comboTimer);
        }
        
        // 3초 후 콤보 리셋
        gameState.comboTimer = setTimeout(() => {
            gameState.combo = 0;
            updateUI();
        }, 3000);
        
            // 20콤보 달성 시 1.5배 보너스 활성화
        if (gameState.combo === 20) {
            activateMultiplier(15); // 15초 동안 1.5배
            playSound('combo');
        }
    } else {
        // 3초 이상 경과하면 콤보 리셋
        gameState.combo = 1;
        
        if (gameState.comboTimer) {
            clearTimeout(gameState.comboTimer);
        }
        
        gameState.comboTimer = setTimeout(() => {
            gameState.combo = 0;
            updateUI();
        }, 3000);
    }
    
    gameState.lastHitTime = now;
    
    // 서버에 히트 요청
    try {
        const response = await fetch('/api/hit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                multiplier: gameState.multiplier 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            gameState.money = data.total_money;
            gameState.totalMoneyEarned += data.earned_money;
            updateUI();
            
            // 원숭이 피격 애니메이션
            monkeyElement.classList.add('hit');
            
            // 원숭이 표정 변화
            showMonkeyExpression();
            
            // 파티클 효과
            createParticles();
            
            setTimeout(() => monkeyElement.classList.remove('hit'), 300);
            
            // 데미지 텍스트 표시
            showDamageText(data.earned_money);
            
            // 획득 돈 팝업 표시
            showEarnedPopup(data.earned_money);
            
            // 게임 저장 (즉시)
            saveGameToStorage();
            
            // 업적 체크
            checkAchievements();
        }
    } catch (error) {
        console.error('원숭이 공격 실패:', error);
    }
}

/**
 * 게임 저장 (localStorage)
 */
function saveGameToStorage() {
    try {
        const saveData = {
            money: gameState.money,
            damage: gameState.damage,
            currentTool: gameState.currentTool,
            tools: gameState.tools,
            totalClicks: gameState.totalClicks,
            totalMoneyEarned: gameState.totalMoneyEarned,
            soundEnabled: gameState.soundEnabled,
            saveTime: Date.now()
        };
        localStorage.setItem('monkeyGameSave', JSON.stringify(saveData));
        
        // 업적도 별도로 저장
        localStorage.setItem('achievements', JSON.stringify(gameState.achievements));
    } catch (error) {
        console.error('게임 저장 실패:', error);
    }
}

/**
 * 게임 불러오기 (localStorage)
 */
function loadGameFromStorage() {
    try {
        const saveData = localStorage.getItem('monkeyGameSave');
        if (saveData) {
            const data = JSON.parse(saveData);
            // 통계 데이터는 항상 불러오기
            if (data.totalClicks !== undefined) {
                gameState.totalClicks = data.totalClicks;
            }
            if (data.totalMoneyEarned !== undefined) {
                gameState.totalMoneyEarned = data.totalMoneyEarned;
            }
            if (data.soundEnabled !== undefined) {
                gameState.soundEnabled = data.soundEnabled;
            }
        }
    } catch (error) {
        console.error('게임 불러오기 실패:', error);
    }
}

/**
 * 원숭이 표정 표시
 */
function showMonkeyExpression() {
    const expressions = ['😵', '😠', '😤', '💢', '👊'];
    const randomExpression = expressions[Math.floor(Math.random() * expressions.length)];
    
    monkeyExpressionElement.textContent = randomExpression;
    monkeyExpressionElement.style.display = 'block';
    
    setTimeout(() => {
        monkeyExpressionElement.style.display = 'none';
    }, 500);
}

/**
 * 파티클 효과 생성
 */
function createParticles() {
    const particles = ['💰', '✨', '⭐', '💫', '🌟'];
    const particleCount = 8;
    
    for (let i = 0; i < particleCount; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.textContent = particles[Math.floor(Math.random() * particles.length)];
            
            // 랜덤 위치 (원숭이 중심 기준)
            const angle = (Math.PI * 2 * i) / particleCount;
            const distance = 50 + Math.random() * 50;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            
            particle.style.left = '50%';
            particle.style.top = '50%';
            particle.style.setProperty('--random-x', `${x}px`);
            
            particlesContainer.appendChild(particle);
            
            // 애니메이션 후 제거
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 1000);
        }, i * 30); // 약간의 딜레이로 순차적 효과
    }
}

/**
 * 데미지 텍스트 표시
 */
function showDamageText(amount) {
    damageTextElement.textContent = `+${formatNumber(amount)}`;
    damageTextElement.style.opacity = '1';
    damageTextElement.style.transform = 'translateY(0)';
    
    setTimeout(() => {
        damageTextElement.style.opacity = '0';
        damageTextElement.style.transform = 'translateY(-100px)';
    }, 1000);
}

/**
 * 획득 돈 팝업 표시
 */
function showEarnedPopup(amount) {
    earnedPopup.textContent = `+${formatNumber(amount)}원 획득!`;
    earnedPopup.classList.add('show');
    
    setTimeout(() => {
        earnedPopup.classList.remove('show');
    }, 2000);
}

/**
 * 배수 보너스 활성화
 */
function activateMultiplier(duration) {
    gameState.multiplier = 1.5;
    gameState.multiplierEndTime = Date.now() + duration * 1000;
    
    multiplierDisplay.style.display = 'block';
    
    // 기존 타이머 클리어
    if (gameState.multiplierTimer) {
        clearInterval(gameState.multiplierTimer);
    }
    
    // 타이머 업데이트
    updateMultiplierTimer();
    gameState.multiplierTimer = setInterval(updateMultiplierTimer, 1000);
}

/**
 * 배수 타이머 업데이트
 */
function updateMultiplierTimer() {
    if (gameState.multiplier > 1.0) {
        const remaining = Math.max(0, Math.ceil((gameState.multiplierEndTime - Date.now()) / 1000));
        
        if (remaining > 0) {
            multiplierTimerElement.textContent = remaining;
        } else {
            // 타이머 종료
            gameState.multiplier = 1.0;
            multiplierDisplay.style.display = 'none';
            
            if (gameState.multiplierTimer) {
                clearInterval(gameState.multiplierTimer);
                gameState.multiplierTimer = null;
            }
        }
    }
}

/**
 * 상점 렌더링
 */
function renderShop() {
    shopItemsElement.innerHTML = '';
    
    Object.entries(gameState.tools).forEach(([toolId, tool]) => {
        if (tool.owned && toolId !== 'fist') return; // 이미 보유한 도구는 상점에 표시하지 않음 (fist 제외)
        
        const shopItem = document.createElement('div');
        shopItem.className = `shop-item ${tool.owned ? 'owned' : ''}`;
        
        const canAfford = gameState.money >= tool.price;
        
        shopItem.innerHTML = `
            <span class="shop-item-icon">${tool.icon}</span>
            <div class="shop-item-info">
                <div class="shop-item-name">${tool.name}</div>
                <div class="shop-item-details">데미지: ${formatNumber(tool.damage)}</div>
                <div class="shop-item-price">💰 ${formatNumber(tool.price)}원</div>
            </div>
            <button class="buy-btn" ${tool.owned ? 'disabled' : ''} ${!canAfford && !tool.owned ? 'disabled' : ''}>
                ${tool.owned ? '보유중' : '구매'}
            </button>
        `;
        
        const buyBtn = shopItem.querySelector('.buy-btn');
        if (!tool.owned) {
            buyBtn.addEventListener('click', () => buyTool(toolId));
        }
        
        shopItemsElement.appendChild(shopItem);
    });
}

/**
 * 도구 구매
 */
async function buyTool(toolId) {
    try {
        const response = await fetch('/api/buy-tool', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tool_id: toolId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            gameState.money = data.money;
            gameState.tools[toolId].owned = true;
            
            updateUI();
            renderShop();
            
            // 게임 저장
            saveGameToStorage();
            
            // 업적 체크
            checkAchievements();
            
            playSound('purchase');
            alert(data.message);
        } else {
            alert(data.message || '구매에 실패했습니다.');
        }
    } catch (error) {
        console.error('도구 구매 실패:', error);
        alert('구매 중 오류가 발생했습니다.');
    }
}

/**
 * 사운드 재생
 */
function playSound(soundName) {
    if (!soundEnabled) return;
    
    try {
        // 사운드 파일이 있으면 재생 (나중에 추가 가능)
        const audio = new Audio(`/static/sounds/${soundName}.mp3`);
        audio.volume = 0.5;
        audio.play().catch(() => {
            // 사운드 파일이 없어도 오류 없이 진행
        });
    } catch (error) {
        // 오류 무시
    }
}

/**
 * 튜토리얼 표시
 */
function showTutorial() {
    tutorialModal.style.display = 'flex';
}

/**
 * 튜토리얼 숨기기
 */
function hideTutorial() {
    tutorialModal.style.display = 'none';
    localStorage.setItem('tutorialSeen', 'true');
}

/**
 * 업적 렌더링
 */
function renderAchievements() {
    achievementsListElement.innerHTML = '';
    
    achievements.forEach(achievement => {
        const unlocked = gameState.achievements[achievement.id] || false;
        const achieved = achievement.condition();
        
        const achievementItem = document.createElement('div');
        achievementItem.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;
        
        achievementItem.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-desc">${achievement.desc}</div>
            ${unlocked ? '<div class="achievement-progress">✅ 달성!</div>' : ''}
        `;
        
        achievementsListElement.appendChild(achievementItem);
    });
}

/**
 * 업적 체크
 */
function checkAchievements() {
    achievements.forEach(achievement => {
        // 이미 달성한 업적은 스킵
        if (gameState.achievements[achievement.id]) return;
        
        // 업적 조건 확인
        if (achievement.condition()) {
            // 업적 달성!
            gameState.achievements[achievement.id] = true;
            showAchievementPopup(achievement);
            renderAchievements();
            saveGameToStorage();
            playSound('achievement');
        }
    });
}

/**
 * 업적 팝업 표시
 */
function showAchievementPopup(achievement) {
    achievementPopup.textContent = `🏆 업적 달성: ${achievement.name} 🏆`;
    achievementPopup.style.display = 'block';
    achievementPopup.style.animation = 'none';
    
    // 애니메이션 재시작
    setTimeout(() => {
        achievementPopup.style.animation = 'achievementPop 2s ease-out';
    }, 10);
    
    // 2초 후 숨기기
    setTimeout(() => {
        achievementPopup.style.display = 'none';
    }, 2000);
}

/**
 * 업적 저장/불러오기
 */
function loadAchievements() {
    try {
        const saved = localStorage.getItem('achievements');
        if (saved) {
            gameState.achievements = JSON.parse(saved);
        }
    } catch (error) {
        console.error('업적 불러오기 실패:', error);
    }
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
    // 원숭이 클릭
    monkeyElement.addEventListener('click', () => {
        hitMonkey();
        playSound('click');
    });
    
    // 상점 열기/닫기
    openShopBtn.addEventListener('click', () => {
        shopSection.classList.add('show');
        renderShop(); // 상점 열 때마다 최신 정보로 업데이트
        playSound('click');
    });
    
    closeShopBtn.addEventListener('click', () => {
        shopSection.classList.remove('show');
        playSound('click');
    });
    
    // 상점 외부 클릭 시 닫기
    shopSection.addEventListener('click', (e) => {
        if (e.target === shopSection) {
            shopSection.classList.remove('show');
        }
    });
    
    // 튜토리얼 관련
    helpBtn.addEventListener('click', () => {
        showTutorial();
        playSound('click');
    });
    
    closeTutorialBtn.addEventListener('click', () => {
        hideTutorial();
        playSound('click');
    });
    
    startGameBtn.addEventListener('click', () => {
        hideTutorial();
        playSound('click');
    });
    
    tutorialModal.addEventListener('click', (e) => {
        if (e.target === tutorialModal) {
            hideTutorial();
        }
    });
    
    // 업적 모달 관련
    achievementsBtn.addEventListener('click', () => {
        achievementsModal.style.display = 'flex';
        renderAchievements();
        playSound('click');
    });
    
    closeAchievementsBtn.addEventListener('click', () => {
        achievementsModal.style.display = 'none';
        playSound('click');
    });
    
    achievementsModal.addEventListener('click', (e) => {
        if (e.target === achievementsModal) {
            achievementsModal.style.display = 'none';
        }
    });
    
    // 사운드 토글
    soundToggleBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        gameState.soundEnabled = soundEnabled;
        
        if (soundEnabled) {
            soundToggleBtn.classList.add('sound-on');
            soundToggleBtn.classList.remove('sound-off');
            soundToggleBtn.textContent = '🔊';
            soundToggleBtn.title = '사운드 끄기';
        } else {
            soundToggleBtn.classList.add('sound-off');
            soundToggleBtn.classList.remove('sound-on');
            soundToggleBtn.textContent = '🔇';
            soundToggleBtn.title = '사운드 켜기';
        }
        
        saveGameToStorage();
        playSound('click');
    });
    
    // 초기 사운드 상태 설정
    if (gameState.soundEnabled !== undefined) {
        soundEnabled = gameState.soundEnabled;
    }
    
    if (!soundEnabled) {
        soundToggleBtn.classList.add('sound-off');
        soundToggleBtn.classList.remove('sound-on');
        soundToggleBtn.textContent = '🔇';
        soundToggleBtn.title = '사운드 켜기';
    }
}

// 게임 시작
initGame();

