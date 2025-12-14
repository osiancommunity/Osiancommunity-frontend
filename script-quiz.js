document.addEventListener("DOMContentLoaded", function() {

    function showToast(message, type){
        let el = document.getElementById('osian-toast');
        if (!el) { el = document.createElement('div'); el.id = 'osian-toast'; el.className = 'osian-toast'; document.body.appendChild(el); }
        el.className = 'osian-toast ' + (type || '');
        el.textContent = message;
        el.classList.add('show');
        clearTimeout(el._hideTimer);
        el._hideTimer = setTimeout(function(){ el.classList.remove('show'); }, 5000);
    }
    // --- Backend URL ---
const backendUrl = (location.hostname.endsWith('vercel.app'))
    ? 'https://osiancommunity-backend.vercel.app/api'
    : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:5000/api'
        : 'https://osiancommunity-backend.vercel.app/api');

    // --- Authentication ---
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    // Security Check: Is user logged in?
    if (!token || !user) {
        showToast("You must be logged in to take a quiz.", 'warning');
        window.location.href = 'login.html';
        return;
    }

    // --- Get Quiz ID from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('id');

    if (!quizId) {
        showToast("Invalid quiz. No ID provided.", 'error');
        window.location.href = 'quiz-progress.html';
        return;
    }

    // --- Page Elements ---
    const warningModal = document.getElementById('warning-modal');
    const autoSubmitModal = document.getElementById('auto-submit-modal');
    const finalSubmitModal = document.getElementById('final-submit-modal');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const quizContainer = document.getElementById('quiz-container');
    const timeLeftDisplay = document.getElementById('time-left');
    const cheatingWarningBanner = document.getElementById('cheating-warning');
    const violationCountDisplay = document.getElementById('violation-count');
    const submitQuizBtn = document.getElementById('submit-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const codeContainer = document.querySelector('.code-answer-container');
    const codeEditor = document.getElementById('code-editor');
    const runCodeBtn = document.getElementById('run-code-btn');
    const codeOutput = document.getElementById('code-output');
    const codeLangLabel = document.getElementById('code-language-label');
    const runStatus = document.getElementById('run-status');

    // Disable start button immediately to prevent premature clicks
    startQuizBtn.disabled = true;
    startQuizBtn.textContent = 'Loading Quiz...';

    // --- Quiz Data ---
    let currentQuizData = null; // To store quiz questions
    let currentQuestionIndex = 0;
    let userAnswers = []; // To store user's answers
    let writtenAnswers = []; // To store written answers
    let timerInterval = null;
    let timer = 0; // Track remaining time
    let violationCount = 0;
    const maxViolations = 3;
    let isLoading = false; // To track loading state
    let isProctoringEnabled = false;
    const proctorVideo = document.getElementById('proctor-video');
    const proctorWrapper = document.getElementById('proctor-video-wrapper');
    const proctorStatus = document.getElementById('proctor-status');
    const proctorLoader = document.getElementById('proctor-loader');
    let mediaStream = null;
    let faceModel = null;
    let faceCheckInterval = null;
    let faceAbsentSince = null;
    let objectModel = null;
    let objectCheckInterval = null;
    let prohibitedDetectedSince = null;

    async function loadScript(src){
        return new Promise(function(resolve, reject){
            var s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    let proctorLibsLoaded = false;
    async function ensureProctorLibs(){
        if (proctorLibsLoaded) return;
        if (typeof blazeface === 'undefined' || typeof cocoSsd === 'undefined') {
            await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js');
            await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js');
            await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd');
        }
        proctorLibsLoaded = true;
    }

    // ===================================
    // 1. LOAD QUIZ DATA
    // ===================================
    async function loadQuiz() {
        isLoading = true;
        startQuizBtn.disabled = true;
        startQuizBtn.textContent = 'Loading Quiz...';

        try {
            const response = await apiFetch(`/quizzes/${quizId}`, { headers: { 'Authorization': `Bearer ${token}` } });

            if (!response || response.error) {
                try {
                    const data = response;
                    const startsAtRaw = data.startsAt || data.scheduleTime || (data.quiz && data.quiz.scheduleTime);
                    const startsAt = startsAtRaw ? new Date(startsAtRaw) : null;
                    if (data && (data.code === 'SCHEDULED_NOT_STARTED')) {
                        startQuizBtn.disabled = true;
                        startQuizBtn.textContent = startsAt ? `Starts at ${startsAt.toLocaleString()}` : (data.message || 'Scheduled to start later');
                        if (data && data.message) showToast(data.message, 'info');
                        isLoading = false;
                        return;
                    }
                    if (data && (data.code === 'UNAUTHORIZED')) {
                        startQuizBtn.disabled = true;
                        startQuizBtn.textContent = 'Please login again to start';
                        showToast(data && data.message ? data.message : 'Your session has expired or is invalid. Please login again.', 'warning');
                        isLoading = false;
                        return;
                    }
                    throw new Error((data && data.message) || 'Failed to load quiz');
                } catch (e) {
                    throw e;
                }
            }

            currentQuizData = response;

            // Set up the quiz page
            document.querySelector('.quiz-info h3').textContent = currentQuizData.title;
            timeLeftDisplay.textContent = `${currentQuizData.duration}:00`;

            // Enforce schedule: disable start until scheduled time
            const now = Date.now();
            const startAt = currentQuizData.scheduleTime ? new Date(currentQuizData.scheduleTime).getTime() : now;
            isLoading = false;
            const completionRaw = localStorage.getItem('profileCompletion');
            let completion = null;
            try { completion = completionRaw ? JSON.parse(completionRaw) : null; } catch(e){ completion = null; }
            const completeFlag = localStorage.getItem('profileComplete') === 'true';
            if (startAt > now) {
                startQuizBtn.disabled = true;
                const dt = new Date(startAt);
                startQuizBtn.textContent = `Starts at ${dt.toLocaleString()}`;
            } else {
                if (!completeFlag) {
                    startQuizBtn.disabled = true;
                    const pct = completion && typeof completion.percent === 'number' ? completion.percent : 0;
                    startQuizBtn.textContent = `Complete profile (${pct}%) to start`;
                    showToast('Please complete your profile before starting the quiz.', 'warning');
                } else {
                    startQuizBtn.disabled = false;
                    startQuizBtn.textContent = 'I Understand, Start the Quiz';
                }
            }

            // Block if already attempted
            try {
                const attempts = await apiFetch(`/results/quiz/${quizId}`, { headers: { 'Authorization': `Bearer ${token}` } });
                const mine = Array.isArray(attempts && attempts.results) ? attempts.results.find(r => String(r.userId && r.userId._id || r.userId) === String(user._id)) : null;
                if (mine) {
                    showToast('You have already attempted this quiz', 'warning');
                    startQuizBtn.disabled = true;
                    startQuizBtn.textContent = 'Already attempted';
                    setTimeout(function(){ window.location.href = 'dashboard-user.html'; }, 2000);
                    return;
                }
            } catch(_) {}

        } catch (error) {
            console.error('Error loading quiz:', error);
            showToast(`Error: ${error.message}.`, 'error');
            window.location.href = 'quiz-progress.html';
        }
    }
    
    // ===================================
    // 2. START QUIZ
    // ===================================
    startQuizBtn.addEventListener('click', async function() {
        const completeFlag = localStorage.getItem('profileComplete') === 'true';
        if (!completeFlag) {
            showToast('Complete your profile to start the quiz.', 'warning');
            window.location.href = 'profile.html?role=user';
            return;
        }
        if (!currentQuizData) {
            showToast('Quiz data not loaded. Please refresh the page.', 'error');
            return;
        }
        isProctoringEnabled = String(currentQuizData.quizType || '').toLowerCase() === 'paid';
        if (isProctoringEnabled) {
            try {
                if (proctorLoader) { proctorLoader.style.display = 'block'; proctorLoader.classList.add('active'); }
                await ensureProctorLibs();
                await setupProctoring();
                if (proctorLoader) { proctorLoader.classList.remove('active'); proctorLoader.style.display = 'none'; }
            } catch (e) {
                if (proctorLoader) { proctorLoader.classList.remove('active'); proctorLoader.style.display = 'none'; }
                showToast('Camera access is required to start this paid quiz.', 'warning');
                return;
            }
        }
        warningModal.classList.remove('active');
        quizContainer.style.display = 'block';
        startTimer(currentQuizData.duration * 60); // Start timer
        displayQuestion(0); // Show the first question
        addSecurityListeners(); // Activate anti-cheating
        updateNavigationButtons(); // Update navigation buttons
    });

    // ===================================
    // 3. DISPLAY & NAVIGATION
    // ===================================
    function displayQuestion(index) {
        if (!currentQuizData || index >= currentQuizData.questions.length) {
            return; // No more questions
        }

        currentQuestionIndex = index;
        const question = currentQuizData.questions[index];

        document.getElementById('question-number').textContent = `Question ${index + 1} of ${currentQuizData.questions.length}`;
        document.querySelector('.question-header h2').textContent = question.questionText;

        const optionsContainer = document.querySelector('.options-container');
        const writtenContainer = document.querySelector('.written-answer-container');
        const writtenTextarea = document.getElementById('written-answer');

        if (question.questionType === 'mcq') {
            optionsContainer.style.display = 'block';
            writtenContainer.style.display = 'none';
            if (codeContainer) codeContainer.style.display = 'none';
            optionsContainer.innerHTML = ''; // Clear old options

            const existing = userAnswers.find(a => a.questionIndex === index);
            const selectedForMulti = existing && Array.isArray(existing.selectedAnswers) ? existing.selectedAnswers : [];
            const selectedSingle = existing && typeof existing.answerIndex === 'number' ? existing.answerIndex : null;

            question.options.forEach((option, i) => {
                const label = String.fromCharCode(65 + i);
                const imgHtml = option.image ? `<img src="${option.image}" alt="Option image" style="max-width:220px; display:block; margin-top:8px; border-radius:6px;">` : '';
                if (question.isMultiple) {
                    const checked = selectedForMulti.includes(i) ? 'checked' : '';
                    optionsContainer.innerHTML += `
                        <label class="option option-multiple" data-option-index="${i}" style="display:block; cursor:pointer; padding:12px; border:1px solid var(--border-color); border-radius:8px; margin-bottom:10px;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <input type="checkbox" class="option-checkbox" ${checked} />
                                <span>${label}</span>
                                <p style="margin:0;">${option.text}</p>
                            </div>
                            ${imgHtml}
                        </label>
                    `;
                } else {
                    const selClass = selectedSingle === i ? 'selected' : '';
                    optionsContainer.innerHTML += `
                        <div class="option ${selClass}" data-option-index="${i}" style="padding:12px; border:1px solid var(--border-color); border-radius:8px; margin-bottom:10px;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span>${label}</span>
                                <p style="margin:0;">${option.text}</p>
                            </div>
                            ${imgHtml}
                        </div>
                    `;
                }
            });

            if (question.isMultiple) {
                document.querySelectorAll('.option-checkbox').forEach(cb => {
                    cb.addEventListener('change', toggleMultiSelection);
                });
                // Apply selected class to checked ones
                document.querySelectorAll('.option.option-multiple').forEach(opt => {
                    const i = parseInt(opt.getAttribute('data-option-index'));
                    if (selectedForMulti.includes(i)) opt.classList.add('selected');
                });
            } else {
                document.querySelectorAll('.option').forEach(opt => {
                    opt.addEventListener('click', selectAnswer);
                });
            }
        } else if (question.questionType === 'written') {
            optionsContainer.style.display = 'none';
            writtenContainer.style.display = 'block';
            if (codeContainer) codeContainer.style.display = 'none';
            // Load existing written answer if any
            const existingWritten = writtenAnswers.find(a => a.questionIndex === index);
            writtenTextarea.value = existingWritten ? existingWritten.answer : '';

            // Add input event listener for written answers
            writtenTextarea.addEventListener('input', function() {
                const existing = writtenAnswers.find(a => a.questionIndex === currentQuestionIndex);
                if (existing) {
                    existing.answer = this.value;
                } else {
                    writtenAnswers.push({
                        questionIndex: currentQuestionIndex,
                        answer: this.value
                    });
                }
            });

            // Remove previous event listeners to avoid duplicates
            writtenTextarea.removeEventListener('input', handleWrittenInput);
            writtenTextarea.addEventListener('input', handleWrittenInput);
        } else if (question.questionType === 'coding') {
            optionsContainer.style.display = 'none';
            writtenContainer.style.display = 'none';
            if (codeContainer) codeContainer.style.display = 'block';
            if (codeLangLabel) codeLangLabel.textContent = `Language: ${question.codeLanguage || 'javascript'}`;
            if (codeEditor) {
                const existingCode = codeAnswers.find(a => a.questionIndex === index);
                codeEditor.value = existingCode ? existingCode.code : (question.codeStarter || '');
            }
            if (codeEditor) {
                codeEditor.removeEventListener('input', handleCodeInput);
                codeEditor.addEventListener('input', handleCodeInput);
            }
            if (runCodeBtn) {
                runCodeBtn.onclick = async function(){
                    if (runStatus) runStatus.textContent = 'Running...';
                    if (codeOutput) { codeOutput.style.display = 'none'; codeOutput.textContent = ''; }
                    const lang = (question.codeLanguage || 'javascript');
                    const code = codeEditor ? codeEditor.value : '';
                    let version = null;
                    const runtimes = await fetchPistonRuntimes();
                    if (Array.isArray(runtimes)) {
                        const rt = runtimes.find(r => r.language.toLowerCase() === lang.toLowerCase());
                        version = rt ? rt.version : null;
                    }
                    try {
                        const res = await fetch('https://emkc.org/api/v2/piston/execute', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                language: lang,
                                version: version || undefined,
                                files: [{ name: 'main', content: code }]
                            })
                        });
                        const data = await res.json();
                        const out = (data && data.run && (data.run.output || data.run.stdout)) || JSON.stringify(data);
                        if (codeOutput) { codeOutput.textContent = out; codeOutput.style.display = 'block'; }
                        if (runStatus) runStatus.textContent = '';
                    } catch(e) {
                        if (runStatus) runStatus.textContent = 'Failed to run';
                    }
                };
            }
        }

        updateNavigationButtons();
    }

    function handleWrittenInput() {
        const existing = writtenAnswers.find(a => a.questionIndex === currentQuestionIndex);
        if (existing) {
            existing.answer = this.value;
        } else {
            writtenAnswers.push({
                questionIndex: currentQuestionIndex,
                answer: this.value
            });
        }
    }

    function handleCodeInput() {
        const existing = codeAnswers.find(a => a.questionIndex === currentQuestionIndex);
        if (existing) {
            existing.code = this.value;
        } else {
            codeAnswers.push({ questionIndex: currentQuestionIndex, code: this.value });
        }
    }

    function updateNavigationButtons() {
        const totalQuestions = currentQuizData.questions.length;

        // Previous button
        if (currentQuestionIndex === 0) {
            prevBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'inline-block';
        }

        // Next button
        if (currentQuestionIndex === totalQuestions - 1) {
            nextBtn.style.display = 'none';
            submitQuizBtn.style.display = 'inline-block';
        } else {
            nextBtn.style.display = 'inline-block';
            submitQuizBtn.style.display = 'none';
        }
    }
    
    function selectAnswer(e) {
        const selectedOption = e.currentTarget;
        const selectedAnswerIndex = parseInt(selectedOption.getAttribute('data-option-index'));

        // Remove 'selected' from siblings
        document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
        selectedOption.classList.add('selected');

        // Store the answer
        // Check if answer for this question already exists
        const existingAnswer = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
        if (existingAnswer) {
            existingAnswer.answerIndex = selectedAnswerIndex;
            if (Array.isArray(existingAnswer.selectedAnswers)) delete existingAnswer.selectedAnswers;
        } else {
            userAnswers.push({
                questionIndex: currentQuestionIndex,
                answerIndex: selectedAnswerIndex
            });
        }
    }

    function toggleMultiSelection(e) {
        const cb = e.currentTarget;
        const optEl = cb.closest('.option');
        const idx = optEl ? parseInt(optEl.getAttribute('data-option-index')) : NaN;
        if (optEl) {
            if (cb.checked) optEl.classList.add('selected'); else optEl.classList.remove('selected');
        }
        if (Number.isNaN(idx)) return;
        let existing = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
        if (!existing) {
            existing = { questionIndex: currentQuestionIndex, selectedAnswers: [] };
            userAnswers.push(existing);
        }
        if (!Array.isArray(existing.selectedAnswers)) existing.selectedAnswers = [];
        const pos = existing.selectedAnswers.indexOf(idx);
        if (cb.checked && pos === -1) existing.selectedAnswers.push(idx);
        if (!cb.checked && pos !== -1) existing.selectedAnswers.splice(pos, 1);
        // ensure single-answer field does not interfere
        if (typeof existing.answerIndex === 'number') delete existing.answerIndex;
    }

    // Navigation button event listeners
    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            displayQuestion(currentQuestionIndex - 1);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < currentQuizData.questions.length - 1) {
            displayQuestion(currentQuestionIndex + 1);
        }
    });

    // ===================================
    // 4. TIMER & SUBMISSION
    // ===================================
    function startTimer(duration) {
        timer = duration;
        timerInterval = setInterval(function () {
            let minutes = parseInt(timer / 60, 10);
            let seconds = parseInt(timer % 60, 10);
            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;
            timeLeftDisplay.textContent = `${minutes}:${seconds}`;

            if (--timer < 0) {
                submitQuiz("Time's up!");
            }
        }, 1000);
    }

    submitQuizBtn.addEventListener('click', () => {
        let el = document.getElementById('osian-toast');
        if (!el) { el = document.createElement('div'); el.id = 'osian-toast'; el.className = 'osian-toast'; document.body.appendChild(el); }
        el.className = 'osian-toast warning';
        el.innerHTML = `Confirm submission? <span class="actions"><button id="toast-confirm">Submit</button> <button id="toast-cancel">Cancel</button></span>`;
        el.classList.add('show');
        const confirmBtn = document.getElementById('toast-confirm');
        const cancelBtn = document.getElementById('toast-cancel');
        const hide = ()=>{ el.classList.remove('show'); el.innerHTML=''; };
        if (confirmBtn) confirmBtn.onclick = function(){ hide(); submitQuiz("User submitted"); };
        if (cancelBtn) cancelBtn.onclick = function(){ hide(); };
    });

    async function submitQuiz(reason, wasAutoSubmitted = false) {
        clearInterval(timerInterval); // Stop the clock
        removeSecurityListeners();
        stopProctoring();
        
        console.log(`Submitting quiz. Reason: ${reason}`);
        quizContainer.style.display = 'none';

        // Show the correct modal
        if (wasAutoSubmitted) {
            autoSubmitModal.classList.add('active');
        } else {
            // Show a "submitting" message in the final modal
            finalSubmitModal.classList.add('active');
            finalSubmitModal.querySelector('h2').textContent = "Submitting...";
            finalSubmitModal.querySelector('p').textContent = "Please wait while we save your answers.";
        }

        try {
            // --- BACKEND CALL ---
            const data = await apiFetch('/results/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    quizId: quizId,
                    answers: currentQuizData.questions.map((question, index) => {
                        const mcqAnswer = userAnswers.find(a => a.questionIndex === index);
                        const writtenAnswer = writtenAnswers.find(w => w.questionIndex === index);
                        const codeAnswer = codeAnswers.find(c => c.questionIndex === index);
                        return {
                            questionIndex: index,
                            selectedAnswer: (!question.isMultiple && mcqAnswer && typeof mcqAnswer.answerIndex === 'number') ? mcqAnswer.answerIndex : null,
                            selectedAnswers: (question.isMultiple && mcqAnswer && Array.isArray(mcqAnswer.selectedAnswers)) ? mcqAnswer.selectedAnswers : undefined,
                            writtenAnswer: writtenAnswer ? writtenAnswer.answer : '',
                            codeAnswer: codeAnswer ? codeAnswer.code : '',
                            timeSpent: 0
                        };
                    }),
                    timeTaken: currentQuizData.duration * 60 - timer,
                    cheatingViolation: wasAutoSubmitted ? (reason || 'Proctoring violation') : undefined,
                    violationCount: violationCount
                })
            });
            if (!data) throw new Error('Failed to submit quiz.');

            // Update the modal with the correct message
            finalSubmitModal.querySelector('h2').textContent = "Quiz Submitted!";
            if (data.result && data.result.status === 'pending') {
                finalSubmitModal.querySelector('p').textContent = "Your responses are saved. Results will be declared in 8-10 hours.";
            } else {
                const r = data.result || data;
                finalSubmitModal.querySelector('p').textContent = `Your score: ${r.score} / ${r.totalQuestions}`;
            }
            setTimeout(function(){ window.location.href = 'dashboard-user.html'; }, 2500);

        } catch (error) {
            console.error('Submit Error:', error);
            finalSubmitModal.querySelector('h2').textContent = 'Submission Failed!';
            var msg = (error && error.message) ? error.message : 'There was an error saving your results. Please contact support.';
            if (msg === 'Failed to fetch') msg = 'Network error. Server unreachable or blocked.';
            finalSubmitModal.querySelector('p').textContent = msg;
        }
    }

    // ===================================
    // 5. ANTI-CHEATING SECURITY
    // ===================================
    function addSecurityListeners() {
        console.log("Attaching anti-cheating listeners.");
        if(!cheatingWarningBanner) {
            console.error("Cheating warning banner element missing.");
        }
        if(!violationCountDisplay) {
            console.error("Violation count display element missing.");
        }
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);
        if (isProctoringEnabled) {
            document.body.addEventListener('copy', disableEvent);
            document.body.addEventListener('paste', disableEvent);
            document.addEventListener('contextmenu', disableEvent);
            document.body.addEventListener('keydown', disableKeydown);
            document.addEventListener('fullscreenchange', handleFullscreenChange);
        }
    }

    function removeSecurityListeners() {
        console.log("Removing anti-cheating listeners.");
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener('blur', handleWindowBlur);
        document.body.removeEventListener('copy', disableEvent);
        document.body.removeEventListener('paste', disableEvent);
        document.removeEventListener('contextmenu', disableEvent);
        document.body.removeEventListener('keydown', disableKeydown);
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            triggerViolation('Tab/window hidden');
        } else {
            if(cheatingWarningBanner) cheatingWarningBanner.style.display = 'none';
        }
    }

    function disableEvent(e) {
        e.preventDefault();
        showToast("This action is disabled during the quiz.", 'warning');
        triggerViolation('Disallowed action');
        return false;
    }
    function disableKeydown(e) {
        const k = e.key.toLowerCase();
        const ctrlCombos = ['c','v','x','p','r','l','k'];
        if (e.ctrlKey && ctrlCombos.includes(k)) { e.preventDefault(); triggerViolation('Ctrl shortcut'); }
        if (k === 'f12' || k === 'f11') { e.preventDefault(); triggerViolation('Function key'); }
        if (e.altKey && k === 'tab') { e.preventDefault(); triggerViolation('Alt+Tab'); }
        if ((e.metaKey || e.key === 'Meta') && k === 'tab') { e.preventDefault(); triggerViolation('Meta+Tab'); }
    }

    function handleWindowBlur(){
        triggerViolation('Window lost focus');
    }

    function triggerViolation(reason) {
        violationCount++;
        if(cheatingWarningBanner) cheatingWarningBanner.style.display = 'flex';
        if(violationCountDisplay) violationCountDisplay.textContent = violationCount;
        const warningElem = cheatingWarningBanner ? cheatingWarningBanner.querySelector('.warning-text') : null;
        if(warningElem) {
            warningElem.textContent = reason ? `${reason}. Limit is ${maxViolations} before auto-submit.` : '';
        }
        if (violationCount >= maxViolations) {
            submitQuiz('Violation limit reached', true);
        }
    }

    async function setupProctoring() {
        await requestCamera();
        enterFullscreen();
        startFaceDetection();
        startObjectDetection();
    }

    async function requestCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !proctorVideo || !proctorWrapper) {
            throw new Error('Camera unsupported');
        }
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        proctorVideo.srcObject = mediaStream;
        proctorWrapper.style.display = 'flex';
        await proctorVideo.play();
        if (proctorStatus) proctorStatus.textContent = 'Camera active';
    }

    function enterFullscreen() {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen();
    }

    function handleFullscreenChange() {
        if (!document.fullscreenElement) {
            triggerViolation('Exited fullscreen');
        }
    }

    async function startFaceDetection() {
        try {
            if (typeof blazeface === 'undefined') return;
            faceModel = await blazeface.load();
            if (faceCheckInterval) clearInterval(faceCheckInterval);
            faceCheckInterval = setInterval(async function() {
                if (!faceModel || !proctorVideo) return;
                const faces = await faceModel.estimateFaces(proctorVideo, false);
                if (faces && faces.length > 0) {
                    faceAbsentSince = null;
                    if (proctorStatus) proctorStatus.textContent = 'Face detected';
                    if (faces.length > 1) {
                        triggerViolation('Multiple faces detected');
                    }
                } else {
                    if (faceAbsentSince == null) faceAbsentSince = Date.now();
                    if (Date.now() - faceAbsentSince > 5000) {
                        triggerViolation('No face detected');
                        faceAbsentSince = Date.now();
                    }
                    if (proctorStatus) proctorStatus.textContent = 'No face';
                }
            }, 1000);
        } catch(e) {}
    }

    async function startObjectDetection() {
        try {
            if (typeof cocoSsd === 'undefined') return;
            objectModel = await cocoSsd.load();
            if (objectCheckInterval) clearInterval(objectCheckInterval);
            objectCheckInterval = setInterval(async function() {
                if (!objectModel || !proctorVideo) return;
                const predictions = await objectModel.detect(proctorVideo);
                const hasPhone = predictions.some(p => (p.class || '').toLowerCase() === 'cell phone' && p.score > 0.6);
                const hasBook = predictions.some(p => (p.class || '').toLowerCase() === 'book' && p.score > 0.6);
                const hasLaptop = predictions.some(p => (p.class || '').toLowerCase() === 'laptop' && p.score > 0.6);
                const prohibited = hasPhone || hasBook || hasLaptop;
                if (prohibited) {
                    if (prohibitedDetectedSince == null) prohibitedDetectedSince = Date.now();
                    if (Date.now() - prohibitedDetectedSince > 3000) {
                        triggerViolation('Prohibited object detected');
                        prohibitedDetectedSince = Date.now();
                    }
                } else {
                    prohibitedDetectedSince = null;
                }
            }, 1500);
        } catch(e) {}
    }

    function stopProctoring() {
        if (faceCheckInterval) {
            clearInterval(faceCheckInterval);
            faceCheckInterval = null;
        }
        if (objectCheckInterval) {
            clearInterval(objectCheckInterval);
            objectCheckInterval = null;
        }
        if (mediaStream) {
            mediaStream.getTracks().forEach(t => t.stop());
            mediaStream = null;
        }
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen();
        }
        if (proctorWrapper) proctorWrapper.style.display = 'none';
    }
    
    // --- Initial Load ---
    loadQuiz();
});
    let codeAnswers = [];
    let pistonRuntimes = null;
    async function fetchPistonRuntimes(){
        if (pistonRuntimes) return pistonRuntimes;
        try {
            const res = await fetch('https://emkc.org/api/v2/piston/runtimes');
            if (!res.ok) return null;
            pistonRuntimes = await res.json();
            return pistonRuntimes;
        } catch(_) { return null; }
    }
