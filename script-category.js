document.addEventListener('DOMContentLoaded', function(){
    function getParam(name){
        var m = new URLSearchParams(location.search).get(name);
        return m ? String(m).toLowerCase() : '';
    }

    const backendUrl = (location.hostname.endsWith('vercel.app'))
      ? 'https://osiancommunity-backend.vercel.app/api'
      : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
          ? 'http://localhost:5000/api'
          : 'https://osiancommunity-backend.vercel.app/api');

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user')||'null');
    if (!token || !user) { window.location.href = 'login.html'; return; }

    const catParam = getParam('cat') || 'technical';
    const displayNameMap = {
        technical: 'Technical', coding: 'Coding', law: 'Law', engineering: 'Engineering', sports: 'Sports', gk: 'General Knowledge', studies: 'Studies'
    };
    const iconMap = {
        technical: 'bx-chip', coding: 'bx-code', law: 'bx-balance', engineering: 'bx-cog', sports: 'bx-football', gk: 'bx-brain', studies: 'bx-book'
    };

    const fieldOptionsByCategory = {
        technical: ['python','java','c++','os','networks','web'],
        law: ['constitutional','criminal','civil','corporate','tax'],
        engineering: ['mechanical','electrical','civil','computer'],
        gk: ['history','science','geography','current-affairs'],
        sports: ['football','cricket','basketball','athletics'],
        coding: ['javascript','python','java','c++','algorithms','data-structures'],
        studies: ['sociology','economics','politics','history']
    };

    const categoryTitle = document.getElementById('category-title');
    const categoryIcon = document.getElementById('category-icon');
    if (categoryTitle) categoryTitle.textContent = displayNameMap[catParam] || 'Category';
    if (categoryIcon) categoryIcon.innerHTML = `<i class='bx ${iconMap[catParam]||'bx-category'}'></i>`;

    let allQuizzesFlat = [];
    let selectedField = '';
    let selectedLevel = '';

    function createQuizCard(quiz){
        const isPaid = quiz.quizType === 'paid';
        const destinationUrl = isPaid ? `payment.html?quizId=${quiz._id}` : `quiz.html?id=${quiz._id}`;
        const participantsCount = (typeof quiz.registeredUsers === 'number')
            ? quiz.registeredUsers
            : (Array.isArray(quiz.participants) ? quiz.participants.length : 0);
        const priceStr = isPaid ? ((quiz.price != null && !Number.isNaN(Number(quiz.price))) ? Number(quiz.price).toFixed(2) : '0.00') : null;
        return `
            <div class="quiz-card">
                <img src="${quiz.coverImage || 'https://via.placeholder.com/320x200?text=No+Image'}" alt="${quiz.title}" class="quiz-card-img">
                <div class="quiz-card-header">
                    <span class="quiz-tag ${isPaid ? 'paid' : 'live'}">${isPaid ? 'Paid' : 'Free'}</span>
                    <span class="quiz-category">${quiz.category}</span>
                </div>
                <h3>${quiz.title}</h3>
                <p class="quiz-details">${quiz.description || 'No description available.'}</p>
                <div class="quiz-stats">
                    <span><i class='bx bx-user'></i> ${participantsCount} Participants</span>
                    <span><i class='bx bx-time'></i> ${quiz.duration || 30} Mins</span>
                    ${quiz.field ? `<span><i class='bx bx-category'></i> ${quiz.field}</span>` : ''}
                    ${quiz.difficulty ? `<span><i class='bx bx-signal-4'></i> ${quiz.difficulty}</span>` : ''}
                </div>
                <button class="quiz-btn ${isPaid ? 'paid' : 'live'}" onclick="window.location.href='${destinationUrl}'">${isPaid ? `Register (₹${priceStr})` : 'Join Now'}</button>
            </div>
        `;
    }

    async function fetchQuizzes(){
        try {
            const res = await fetch(`${backendUrl}/quizzes`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            const cat = data.categories || {};
            allQuizzesFlat = [];
            Object.keys(cat).forEach(function(k){ (cat[k]||[]).forEach(function(q){ allQuizzesFlat.push(q); }); });
            renderTopics();
            renderLevels();
            renderRecommendations();
        } catch (_) {}
    }

    function renderTopics(){
        const grid = document.getElementById('topic-grid');
        if (!grid) return;
        const topics = fieldOptionsByCategory[catParam] || [];
        grid.innerHTML = '';
        topics.forEach(function(t){
            const btn = document.createElement('button');
            btn.className = 'topic-card' + (selectedField === t ? ' active' : '');
            btn.textContent = t.charAt(0).toUpperCase() + t.slice(1);
            btn.onclick = function(){ selectedField = t; renderTopics(); renderLevels(); renderRecommendations(); };
            grid.appendChild(btn);
        });
    }

    function renderLevels(){
        const grid = document.getElementById('level-grid');
        if (!grid) return;
        const lvls = ['basic','medium','hard'];
        grid.innerHTML = '';
        lvls.forEach(function(l){
            const btn = document.createElement('button');
            btn.className = 'level-card' + (selectedLevel === l ? ' active' : '');
            btn.textContent = l.charAt(0).toUpperCase() + l.slice(1);
            btn.onclick = function(){ selectedLevel = l; renderLevels(); renderRecommendations(); };
            grid.appendChild(btn);
        });
    }

    function renderRecommendations(){
        const grid = document.getElementById('reco-grid');
        const section = document.getElementById('reco-section');
        if (!grid || !section) return;
        grid.innerHTML = '';
        const filtered = allQuizzesFlat.filter(function(q){
            const matchCat = String(q.category||'') === catParam;
            const matchField = selectedField ? String(q.field||'') === selectedField : true;
            const matchLvl = selectedLevel ? String(q.difficulty||'') === selectedLevel : true;
            const visible = String(q.visibility || 'public').toLowerCase() !== 'unlisted';
            return matchCat && matchField && matchLvl && visible;
        });
        if (filtered.length === 0) {
            grid.innerHTML = '<p>No quizzes found for this selection.</p>';
        } else {
            filtered.forEach(function(q){ grid.innerHTML += createQuizCard(q); });
        }
    }

    fetchQuizzes();
});
