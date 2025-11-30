document.addEventListener("DOMContentLoaded", function() {

    // --- Backend URL ---
const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';

    // --- Authentication ---
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    // Security Check: Is user logged in?
    if (!token || !user) {
        alert("You must be logged in to take a quiz. Redirecting...");
        window.location.href = 'login.html';
        return;
    }

    // --- Get Quiz ID from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('id');

    if (!quizId) {
        alert("Invalid quiz. No ID provided. Redirecting...");
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
    let mediaStream = null;
    let faceModel = null;
    let faceCheckInterval = null;
    let faceAbsentSince = null;
    let objectModel = null;
    let objectCheckInterval = null;
    let prohibitedDetectedSince = null;

    // ===================================
    // 1. LOAD QUIZ DATA
    // ===================================
    async function loadQuiz() {
        isLoading = true;
        startQuizBtn.disabled = true;
        startQuizBtn.textContent = 'Loading Quiz...';

        try {
            const response = await fetch(`${backendUrl}/quizzes/${quizId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return; // Silently redirect
                }
                const data = await response.json();
                throw new Error(data.message);
            }

            currentQuizData = await response.json();

            // Set up the quiz page
            document.querySelector('.quiz-info h3').textContent = currentQuizData.title;
            timeLeftDisplay.textContent = `${currentQuizData.duration}:00`;

            // Enable start button
            isLoading = false;
            startQuizBtn.disabled = false;
            startQuizBtn.textContent = 'I Understand, Start the Quiz';

        } catch (error) {
            console.error('Error loading quiz:', error);
            alert(`Error: ${error.message}. Redirecting...`);
            window.location.href = 'quiz-progress.html';
        }
    }
    
    // ===================================
    // 2. START QUIZ
    // ===================================
    startQuizBtn.addEventListener('click', async function() {
        if (!currentQuizData) {
            alert('Quiz data not loaded. Please refresh the page.');
            return;
        }
        isProctoringEnabled = String(currentQuizData.quizType || '').toLowerCase() === 'paid';
        if (isProctoringEnabled) {
            try {
                await setupProctoring();
            } catch (e) {
                alert('Camera access is required to start this paid quiz.');
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
            optionsContainer.style.display = 'grid';
            writtenContainer.style.display = 'none';
            optionsContainer.innerHTML = ''; // Clear old options

            question.options.forEach((option, i) => {
                optionsContainer.innerHTML += `
                    <div class="option" data-option-index="${i}">
                        <span>${String.fromCharCode(65 + i)}</span> <p>${option.text}</p>
                    </div>
                `;
            });

            // Add click listeners to new options
            document.querySelectorAll('.option').forEach(opt => {
                opt.addEventListener('click', selectAnswer);
            });
        } else if (question.questionType === 'written') {
            optionsContainer.style.display = 'none';
            writtenContainer.style.display = 'block';
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
        } else {
            userAnswers.push({
                questionIndex: currentQuestionIndex,
                answerIndex: selectedAnswerIndex
            });
        }
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
        if (confirm('Are you sure you want to submit?')) {
            submitQuiz("User submitted");
        }
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
            const response = await fetch(`${backendUrl}/results/submit`, {
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
                        return {
                            questionIndex: index,
                            selectedAnswer: mcqAnswer ? mcqAnswer.answerIndex : null,
                            writtenAnswer: writtenAnswer ? writtenAnswer.answer : '',
                            timeSpent: 0
                        };
                    }),
                    timeTaken: currentQuizData.duration * 60 - timer,
                    cheatingViolation: wasAutoSubmitted ? (reason || 'Proctoring violation') : undefined
                })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return; // Silently redirect
                }
                try {
                    const data = await response.json();
                    const msg = data && data.message ? data.message : 'Failed to submit quiz.';
                    throw new Error(msg);
                } catch(e) {
                    throw new Error('Failed to submit quiz.');
                }
            }

            const data = await response.json();

            // Update the modal with the correct message
            finalSubmitModal.querySelector('h2').textContent = "Quiz Submitted!";
            if (data.result.status === 'pending') {
                finalSubmitModal.querySelector('p').textContent = "Your responses are saved. Results will be declared in 8-10 hours.";
            } else {
                finalSubmitModal.querySelector('p').textContent = `Your score: ${data.result.score} / ${data.result.totalQuestions}`;
            }

        } catch (error) {
            console.error('Submit Error:', error);
            finalSubmitModal.querySelector('h2').textContent = 'Submission Failed!';
            finalSubmitModal.querySelector('p').textContent = (error && error.message) ? error.message : 'There was an error saving your results. Please contact support.';
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
        alert("This action is disabled during the quiz.");
        return false;
    }
    function disableKeydown(e) {
        const k = e.key.toLowerCase();
        if (e.ctrlKey && (k === 'c' || k === 'v' || k === 'x' || k === 'p')) {
            e.preventDefault();
        }
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
