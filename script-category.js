document.addEventListener('DOMContentLoaded', function(){

  const backendUrl = (location.hostname.endsWith('vercel.app'))
    ? 'https://osiancommunity-backend.vercel.app/api'
    : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:5000/api'
        : 'https://osiancommunity-backend.vercel.app/api');

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const isLocal = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  if (!token || !user) { if (!isLocal) { window.location.href = 'login.html'; return; } }

  const params = new URLSearchParams(location.search);
  const categoryName = params.get('category') || 'Technical';

  const titleEl = document.getElementById('category-title');
  const heroHeading = document.getElementById('hero-heading');
  const iconEl = document.getElementById('category-icon');
  const topicGrid = document.getElementById('topic-grid');
  const levelGrid = document.getElementById('level-grid');
  const recommendedGrid = document.getElementById('category-recommended');

  const iconMap = {
    'Technical': 'bx-chip',
    'Law': 'bx-gavel',
    'Engineering': 'bx-cog',
    'General Knowledge': 'bx-brain',
    'Sports': 'bx-football'
  };

  function setCategoryHeader() {
    if (titleEl) titleEl.textContent = categoryName;
    if (heroHeading) heroHeading.textContent = `Explore ${categoryName} quizzes`;
    if (iconEl) { iconEl.className = `bx ${iconMap[categoryName] || 'bx-category'}`; }
  }

  const topicMap = {
    'Technical': ['Python','Java','C++','DBMS','OS','Computer Networks'],
    'Law': ['Constitution','IPC','Evidence','Contract','Corporate Law','Torts'],
    'Engineering': ['Mechanics','Thermodynamics','Circuits','Signals','Design','Materials'],
    'General Knowledge': ['India','World','Science','History','Geography','Current Affairs'],
    'Sports': ['Cricket','Football','Tennis','Olympics','Athletics','eSports']
  };

  const levels = ['Basic','Medium','Hard'];
  let selectedTopic = null;
  let selectedLevel = null;

  function renderTopics() {
    if (!topicGrid) return;
    topicGrid.innerHTML = '';
    const topics = topicMap[categoryName] || [];
    topics.forEach(t => {
      const el = document.createElement('div');
      el.className = 'category-card';
      el.innerHTML = `<i class='bx bx-folder'></i><span>${t}</span>`;
      el.addEventListener('click', function(){ selectedTopic = t; loadRecommended(); });
      topicGrid.appendChild(el);
    });
  }

  function renderLevels() {
    if (!levelGrid) return;
    levelGrid.innerHTML = '';
    levels.forEach(l => {
      const el = document.createElement('div');
      el.className = 'category-card';
      el.innerHTML = `<i class='bx bx-signal-4'></i><span>${l}</span>`;
      el.addEventListener('click', function(){ selectedLevel = l; loadRecommended(); });
      levelGrid.appendChild(el);
    });
  }

  async function fetchAllQuizzes() {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${backendUrl}/quizzes`, { headers });
      const data = await res.json();
      return data.quizzes || [];
    } catch (_) { return []; }
  }

  function createQuizCard(quiz) {
    const isPaid = quiz.quizType === 'paid';
    const destinationUrl = isPaid ? `payment.html?quizId=${quiz._id}` : `quiz.html?id=${quiz._id}`;
    return `
      <div class="quiz-card">
        <img src="${quiz.coverImage || 'https://via.placeholder.com/320x200?text=No+Image'}" alt="${quiz.title}" class="quiz-card-img">
        <div class="quiz-card-header">
          <span class="quiz-tag ${isPaid ? 'paid' : 'live'}">${isPaid ? 'Paid' : 'Free'}</span>
          <span class="quiz-category">${quiz.category}</span>
        </div>
        <h3>${quiz.title}</h3>
        <p class="quiz-details">${quiz.description || 'No description available.'}</p>
        <div class="quiz-stats"><span><i class='bx bx-user'></i> ${quiz.participants || 0} Participants</span><span><i class='bx bx-time'></i> ${quiz.duration || 30} Mins</span></div>
        <button class="quiz-btn ${isPaid ? 'paid' : 'live'}" data-quiz-id="${quiz._id}" onclick="window.location.href='${destinationUrl}'">${isPaid ? `Register (₹${quiz.price ? quiz.price.toFixed(2) : 0})` : 'Join Now'}</button>
      </div>
    `;
  }

  async function loadRecommended() {
    if (!recommendedGrid) return;
    recommendedGrid.innerHTML = '';
    const all = await fetchAllQuizzes();
    const filteredCategory = all.filter(q => String(q.category||'').toLowerCase() === String(categoryName).toLowerCase());
    const filteredTopic = selectedTopic ? filteredCategory.filter(q => String(q.title||'').toLowerCase().includes(String(selectedTopic).toLowerCase())) : filteredCategory;
    const filteredLevel = selectedLevel ? filteredTopic.filter(q => String(q.level||'').toLowerCase() === String(selectedLevel).toLowerCase()) : filteredTopic;
    const top = [...filteredLevel].sort((a,b) => (b.participants||0) - (a.participants||0)).slice(0, 12);
    if (top.length === 0) { recommendedGrid.innerHTML = sampleFallback(categoryName); return; }
    top.forEach(q => { recommendedGrid.innerHTML += createQuizCard(q); });
  }

  function sampleFallback(cat) {
    const demos = [
      { _id: 'c1', quizType: 'free', title: `${cat} Demo #1`, category: cat, duration: 25, participants: 80 },
      { _id: 'c2', quizType: 'paid', title: `${cat} Demo #2`, category: cat, duration: 45, participants: 120, price: 99 },
      { _id: 'c3', quizType: 'free', title: `${cat} Demo #3`, category: cat, duration: 30, participants: 60 }
    ];
    return demos.map(createQuizCard).join('');
  }

  setCategoryHeader();
  renderTopics();
  renderLevels();
  loadRecommended();
});
