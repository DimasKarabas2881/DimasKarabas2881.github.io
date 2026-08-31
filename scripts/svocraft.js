// =====================================================
// 1. ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// =====================================================
const state = {
    team: null,
    squadSize: 0,
    budget: 0,
    cart: [],
    currentPath: ['catalog'],
    data: null,
};

// =====================================================
// 2. ЗАГРУЗКА DATA.JSON
// =====================================================
async function loadData() {
    try {
        const response = await fetch('../data/market.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        state.data = await response.json();
        console.log('Данные загружены:', state.data);
        initApp();
    } catch (error) {
        console.error('Ошибка загрузки data.json:', error);
        document.getElementById('app-status').textContent = 'Ошибка загрузки данных';
        document.getElementById('app-status').style.color = '#ff4444';
    }
}

// =====================================================
// 3. ИНИЦИАЛИЗАЦИЯ
// =====================================================
function initApp() {
    showScreen('screen-setup');
    
    document.querySelectorAll('.team-btn').forEach(btn => {
        btn.addEventListener('click', selectTeam);
    });
    
    document.getElementById('start-shop').addEventListener('click', startShop);
    document.getElementById('finish-shop').addEventListener('click', showResults);
    document.getElementById('back-category').addEventListener('click', goBackCategory);
    document.getElementById('back-to-shop').addEventListener('click', backToShop);
    document.getElementById('reset-all').addEventListener('click', resetAll);
    
    document.getElementById('app-status').textContent = 'Готов к работе';
    document.getElementById('app-status').style.color = '#4caf50';
}

// =====================================================
// 4. ВЫБОР КОМАНДЫ
// =====================================================
function selectTeam(e) {
    const btn = e.currentTarget;
    const team = btn.dataset.team;
    
    document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    state.team = team;
    console.log(`Выбрана команда: ${team}`);
}

// =====================================================
// 5. ЗАПУСК МАГАЗИНА
// =====================================================
function startShop() {
    if (!state.team) {
        alert('Сначала выбери команду!');
        return;
    }
    
    const sizeInput = document.getElementById('squad-size');
    const size = parseInt(sizeInput.value);
    
    if (isNaN(size) || size < 1) {
        alert('Введи корректное количество человек (минимум 1)');
        return;
    }
    
    state.squadSize = size;
    const teamData = state.data.teams[state.team];
    state.budget = size * teamData.budgetPerPerson;
    state.cart = [];
    state.currentPath = ['catalog'];
    
    console.log(`Отряд: ${state.squadSize} чел., бюджет: ${state.budget}$`);
    
    showScreen('screen-shop');
    renderShop();
}

// =====================================================
// 6. ОТОБРАЖЕНИЕ КАТАЛОГА
// =====================================================
function renderShop() {
    updateBudgetDisplay();
    renderBreadcrumbs();
    renderItems();
    updateBackButton();
}

// =====================================================
// 6.1. НАВИГАЦИЯ НАЗАД ПО КАТАЛОГУ
// =====================================================
function goBackCategory() {
    if (state.currentPath.length > 1) {
        state.currentPath.pop();
        renderShop();
    }
}

function updateBackButton() {
    const btn = document.getElementById('back-category');
    if (!btn) return;
    btn.style.display = state.currentPath.length > 1 ? 'inline-block' : 'none';
}

// =====================================================
// 7. ОБНОВЛЕНИЕ БЮДЖЕТА
// =====================================================
function updateBudgetDisplay() {
    document.getElementById('budget-display').textContent = state.budget;
    document.getElementById('cart-count').textContent = state.cart.length;
}

// =====================================================
// 8. ПОИСК ТЕКУЩЕГО ОБЪЕКТА ПО ПУТИ
// =====================================================
function getCurrentObject() {
    if (!state.data) return null;
    
    let current = { subcategories: state.data.catalog };
    
    for (let i = 1; i < state.currentPath.length; i++) {
        const id = state.currentPath[i];
        if (current.subcategories && current.subcategories[id]) {
            current = current.subcategories[id];
        } else if (current[id]) {
            current = current[id];
        } else {
            return null;
        }
    }
    
    return current;
}

// =====================================================
// 9. ХЛЕБНЫЕ КРОШКИ
// =====================================================
function renderBreadcrumbs() {
    const container = document.getElementById('breadcrumbs');
    if (!container) return;
    
    let html = '📂 ';
    const pathNames = ['Каталог'];
    let current = state.data?.catalog;
    
    for (let i = 1; i < state.currentPath.length; i++) {
        const id = state.currentPath[i];
        if (current?.subcategories && current.subcategories[id]) {
            current = current.subcategories[id];
            pathNames.push(current.label);
        } else if (current?.[id]) {
            current = current[id];
            pathNames.push(current.label);
        } else {
            break;
        }
    }
    
    html += pathNames.join(' → ');
    container.textContent = html;
}

// =====================================================
// 10. РЕНДЕР КАТАЛОГА (категории ИЛИ товары)
// =====================================================
function renderItems() {
    const grid = document.getElementById('items-grid');
    grid.innerHTML = '';
    
    const currentObj = getCurrentObject();
    if (!currentObj) {
        grid.innerHTML = '<p style="color: #888; text-align: center;">Категория не найдена</p>';
        return;
    }

    // ===== 1. ЕСЛИ ЕСТЬ ПОДКАТЕГОРИИ — ПОКАЗЫВАЕМ ИХ =====
    if (currentObj.subcategories) {
        const subKeys = Object.keys(currentObj.subcategories);
        if (subKeys.length) {
            subKeys.forEach(key => {
                const sub = currentObj.subcategories[key];
                const card = document.createElement('div');
                card.className = 'category-card';

                const countLabel = sub.items
                    ? `<p style="color: var(--text-color-dim); font-size: 14px;">
                           ${sub.items.filter(i => i.baseCost !== null).length} товаров
                       </p>`
                    : '';

                card.innerHTML = `
                    <div style="font-size: 48px;">${sub.icon || '📂'}</div>
                    <h3 style="color: var(--text-color-bright); margin: 8px 0 4px;">${sub.label}</h3>
                    ${countLabel}
                `;
                card.addEventListener('click', () => {
                    state.currentPath.push(sub.id);
                    renderShop();
                });
                grid.appendChild(card);
            });
            return;
        }
    }

    // ===== 2. ЕСЛИ ЕСТЬ ТОВАРЫ — ПОКАЗЫВАЕМ ИХ =====
    if (currentObj.items && currentObj.items.length) {
        const validItems = currentObj.items.filter(item => item.baseCost !== null);
        
        if (!validItems.length) {
            grid.innerHTML = '<p style="color: #888; text-align: center;">В этой категории нет доступных товаров</p>';
            return;
        }
        
        validItems.forEach(item => {
            const card = createItemCard(item);
            grid.appendChild(card);
        });
        return;
    }

    // ===== 3. ЕСЛИ НИЧЕГО НЕТ =====
    grid.innerHTML = '<p style="color: #888; text-align: center;">В этой категории нет товаров</p>';
}

// =====================================================
// 11. СОЗДАНИЕ КАРТОЧКИ ТОВАРА
// =====================================================
function createItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.itemId = item.id;
    
    const finalPrice = getPrice(item);
    const isEnemy = isEnemyItem(item);
    const imgPath = `../assets/images/${item.image || 'placeholder.png'}`;
    
    card.innerHTML = `
        <img src="${imgPath}" alt="${item.name}" 
             onerror="this.src='../assets/images/placeholder.png'; this.onerror=null;">
        <h4 class="item-name">${item.name}</h4>
        <p class="item-price">💰 ${finalPrice}$</p>
        <span class="item-tag ${isEnemy ? 'enemy' : ''}">${isEnemy ? 'ВРАГ' : item.specs?.type || 'Техника'}</span>
        <button class="buy-btn" data-item-id="${item.id}">➕ Купить</button>
    `;
    
    card.querySelector('.buy-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        buyItem(item.id);
    });
    
    return card;
}

// =====================================================
// 12. РАСЧЁТ ЦЕНЫ С НАЦЕНКОЙ
// =====================================================
function getPrice(item) {
    if (state.team === 'rebels') return item.baseCost;
    
    const teamData = state.data.teams[state.team];
    if (teamData.enemyTeams.includes(item.team)) {
        return Math.round(item.baseCost * 1.2);
    }
    
    return item.baseCost;
}

// =====================================================
// 13. ПРОВЕРКА ВРАЖЕСКОЙ ТЕХНИКИ
// =====================================================
function isEnemyItem(item) {
    if (state.team === 'rebels') return false;
    const teamData = state.data.teams[state.team];
    return teamData.enemyTeams.includes(item.team);
}

// =====================================================
// 14. ПОКУПКА
// =====================================================
function buyItem(itemId) {
    let item = null;
    
    function search(obj) {
        if (obj.items) {
            const found = obj.items.find(i => i.id === itemId);
            if (found) return found;
        }
        if (obj.subcategories) {
            for (const key in obj.subcategories) {
                const found = search(obj.subcategories[key]);
                if (found) return found;
            }
        }
        return null;
    }
    
    item = search({ subcategories: state.data.catalog });
    
    if (!item) {
        alert('Ошибка: товар не найден');
        return;
    }
    
    const price = getPrice(item);
    
    if (state.budget < price) {
        alert('Недостаточно средств!');
        return;
    }
    
    state.budget -= price;
    state.cart.push({
        id: item.id,
        name: item.name,
        cost: price,
        team: item.team
    });
    
    updateBudgetDisplay();
    renderItems();
    console.log(`Куплено: ${item.name} за ${price}$`);
}

// =====================================================
// 15. ИТОГИ
// =====================================================
function showResults() {
    if (!state.cart.length) {
        alert('Ты ничего не купил!');
        return;
    }
    
    showScreen('screen-result');
    
    const container = document.getElementById('result-content');
    let html = `
        <div class="result-budget">
            <span>Остаток бюджета:</span>
            <span>${state.budget}$</span>
        </div>
        <div class="result-list">
    `;
    
    let totalSpent = 0;
    state.cart.forEach(item => {
        totalSpent += item.cost;
        html += `
            <div class="result-item">
                <span class="name">${item.name}</span>
                <span class="cost">${item.cost}$</span>
            </div>
        `;
    });
    
    html += `
        </div>
        <div class="result-total">
            <span>Потрачено: ${totalSpent}$</span>
        </div>
    `;
    
    container.innerHTML = html;
}

// =====================================================
// 16. ВЕРНУТЬСЯ В МАГАЗИН
// =====================================================
function backToShop() {
    showScreen('screen-shop');
    renderShop();
}

// =====================================================
// 17. СБРОС
// =====================================================
function resetAll() {
    if (!confirm('Точно начать заново?')) return;
    
    state.team = null;
    state.squadSize = 0;
    state.budget = 0;
    state.cart = [];
    state.currentPath = ['catalog'];
    
    document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('squad-size').value = 4;
    
    showScreen('screen-setup');
}

// =====================================================
// 18. ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
// =====================================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// =====================================================
// 19. ЗАПУСК
// =====================================================
document.addEventListener('DOMContentLoaded', loadData);