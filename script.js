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
    multiplierEndTime: 0
};

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

/**
 * 게임 초기화
 */
async function initGame() {
    await loadGameState();
    renderTools();
    renderShop();
    setupEventListeners();
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
            updateUI();
            
            // 원숭이 피격 애니메이션
            monkeyElement.classList.add('hit');
            setTimeout(() => monkeyElement.classList.remove('hit'), 300);
            
            // 데미지 텍스트 표시
            showDamageText(data.earned_money);
            
            // 획득 돈 팝업 표시
            showEarnedPopup(data.earned_money);
        }
    } catch (error) {
        console.error('원숭이 공격 실패:', error);
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
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
    // 원숭이 클릭
    monkeyElement.addEventListener('click', hitMonkey);
    
    // 상점 열기/닫기
    openShopBtn.addEventListener('click', () => {
        shopSection.classList.add('show');
        renderShop(); // 상점 열 때마다 최신 정보로 업데이트
    });
    
    closeShopBtn.addEventListener('click', () => {
        shopSection.classList.remove('show');
    });
    
    // 상점 외부 클릭 시 닫기
    shopSection.addEventListener('click', (e) => {
        if (e.target === shopSection) {
            shopSection.classList.remove('show');
        }
    });
}

// 게임 시작
initGame();

