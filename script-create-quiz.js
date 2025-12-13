document.addEventListener("DOMContentLoaded", function() {

    // Define the location of your backend
const backendUrl = (location.hostname.endsWith('vercel.app'))
  ? 'https://osiancommunity-backend.vercel.app/api'
  : ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : 'https://osiancommunity-backend.vercel.app/api');

    // --- Authentication & Authorization ---
    let user = null;
    try {
        user = JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        user = null;
    }
    const token = localStorage.getItem('token');

    // Security Check: Is user logged in and an admin?
    if (!token || !user || (user.role !== 'admin' && user.role !== 'superadmin')) {
        showToast("You are not authorized to view this page. Redirecting...", 'warning');
        window.location.href = 'dashboard-user.html'; // or login.html
        return; // Stop the script
    }

    // --- Check if editing an existing quiz ---
    const urlParams = new URLSearchParams(window.location.search);
    const editQuizId = urlParams.get('edit');
    const viewQuizId = urlParams.get('view');
    let isEditing = false;
    let isViewMode = false;
    if (editQuizId) {
        isEditing = true;
        document.querySelector('.header-title h1').textContent = 'Edit Quiz';
        document.querySelector('.btn-submit').textContent = 'Update Quiz';
        loadQuizForEditing(editQuizId);
    } else if (viewQuizId) {
        isViewMode = true;
        document.querySelector('.header-title h1').textContent = 'View Quiz';
        const submitBtn = document.querySelector('.btn-submit');
        if (submitBtn) submitBtn.style.display = 'none';
        const addBtn = document.getElementById('add-question-btn');
        if (addBtn) addBtn.style.display = 'none';
        loadQuizForEditing(viewQuizId);
    }

    // --- Form Elements ---
    const quizForm = document.getElementById('create-quiz-form');
    const quizTypeSelect = document.getElementById('quiz-type');
    const priceGroup = document.getElementById('quiz-price-group');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const questionsContainer = document.getElementById('questions-container');
    const quizCoverInput = document.getElementById('quiz-cover');
    const quizCategorySelect = document.getElementById('quiz-category');
    const quizFieldSelect = document.getElementById('quiz-field');
    const quizDifficultySelect = document.getElementById('quiz-difficulty');
    let questionCount = 1;
    let coverImageBase64 = null;

    function createOptionRow(text, imageBase64, isCorrect){
        const row = document.createElement('div');
        row.className = 'option-row';
        row.innerHTML = `
            <div class="form-group" style="display:flex; gap:10px; align-items:center;">
                <input type="checkbox" class="option-correct" ${isCorrect ? 'checked' : ''} title="Mark as correct">
                <input type="text" class="option-text" placeholder="Option text" value="${text || ''}" required style="flex:1;">
                <input type="file" class="option-image" accept="image/*">
                <button type="button" class="btn-remove-option">Remove</button>
            </div>`;
        if (imageBase64) row.dataset.imageBase64 = imageBase64;
        return row;
    }

    function attachQuestionEnhancements(block){
        const optsContainer = block.querySelector('.options-container');
        const addOptBtn = block.querySelector('.add-option-btn');
        const isMultipleEl = block.querySelector('.is-multiple');
        const qImageInput = block.querySelector('.question-image');
        if (optsContainer && addOptBtn){
            if (optsContainer.children.length === 0){
                optsContainer.appendChild(createOptionRow('', null, false));
                optsContainer.appendChild(createOptionRow('', null, false));
            }
            addOptBtn.onclick = function(){ optsContainer.appendChild(createOptionRow('', null, false)); };
            optsContainer.addEventListener('click', function(e){
                if (e.target && e.target.classList.contains('btn-remove-option')) {
                    const row = e.target.closest('.option-row');
                    row && row.remove();
                }
            });
            optsContainer.addEventListener('change', function(e){
                if (e.target && e.target.classList.contains('option-image')){
                    const file = e.target.files && e.target.files[0];
                    const row = e.target.closest('.option-row');
                    if (file && row){
                        const reader = new FileReader();
                        reader.onload = function(){ row.dataset.imageBase64 = reader.result; };
                        reader.readAsDataURL(file);
                    }
                }
                if (e.target && e.target.classList.contains('option-correct')){
                    if (!isMultipleEl || !isMultipleEl.checked){
                        optsContainer.querySelectorAll('.option-correct').forEach(cb => { if (cb !== e.target) cb.checked = false; });
                    }
                }
            });
        }
        if (qImageInput){
            qImageInput.addEventListener('change', function(e){
                const file = e.target.files && e.target.files[0];
                if (!file) { block.dataset.questionImage = ''; return; }
                const reader = new FileReader();
                reader.onload = function(){ block.dataset.questionImage = reader.result; };
                reader.readAsDataURL(file);
            });
        }
    }

    // --- Show/Hide Price Field ---
    quizTypeSelect.addEventListener('change', function() {
        if (this.value === 'paid') {
            priceGroup.style.display = 'block';
        } else {
            priceGroup.style.display = 'none';
        }
    });

    // --- Field options per Category ---
    const fieldOptionsByCategory = {
        technical: ['python','java','c++','os','computer networks','dbms'],
        law: ['constitutional','criminal','civil','corporate','tax'],
        engineering: ['mechanical','electrical','civil','computer'],
        gk: ['history','science','geography','current-affairs'],
        sports: ['football','cricket','basketball','athletics']
    };

    function populateFieldOptions(category){
        if (!quizFieldSelect) return;
        quizFieldSelect.innerHTML = '<option value="" disabled selected>Select a field</option>';
        const opts = fieldOptionsByCategory[category] || [];
        opts.forEach(function(f){
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f.charAt(0).toUpperCase() + f.slice(1);
            quizFieldSelect.appendChild(opt);
        });
    }

    if (quizCategorySelect) {
        quizCategorySelect.addEventListener('change', function(){
            populateFieldOptions(this.value);
        });
    }

    // --- Handle Quiz Cover Image Upload ---
    quizCoverInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const img = new Image();
            img.onload = function() {
                // Automatically convert to 16:9 aspect ratio
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Set canvas size to 16:9 (1920x1080 is a good size)
                const targetWidth = 1920;
                const targetHeight = 1080;
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                // Calculate crop dimensions to fit 16:9
                const sourceAspect = img.width / img.height;
                const targetAspect = 16 / 9;

                let sourceX, sourceY, sourceWidth, sourceHeight;

                if (sourceAspect > targetAspect) {
                    // Image is wider than 16:9, crop width
                    sourceHeight = img.height;
                    sourceWidth = img.height * targetAspect;
                    sourceX = (img.width - sourceWidth) / 2;
                    sourceY = 0;
                } else {
                    // Image is taller than 16:9, crop height
                    sourceWidth = img.width;
                    sourceHeight = img.width / targetAspect;
                    sourceX = 0;
                    sourceY = (img.height - sourceHeight) / 2;
                }

                // Draw the cropped image on canvas
                ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);

                // Convert to Base64
                coverImageBase64 = canvas.toDataURL('image/jpeg', 0.9);
            };
            img.onerror = function() {
                showToast('Could not load image. Please ensure it is a valid image file.', 'error');
                quizCoverInput.value = '';
                coverImageBase64 = null;
            };
            img.src = URL.createObjectURL(file);
        } else {
            coverImageBase64 = null; // Clear if no file selected
        }
    });

    // --- Handle Question Type Changes ---
    questionsContainer.addEventListener('change', function(e) {
        if (!e.target.classList.contains('question-type')) return;
        const questionBlock = e.target.closest('.question-block');
        const mcqEls = questionBlock.querySelectorAll('.mcq-only');
        const codingEls = questionBlock.querySelectorAll('.coding-only');
        const type = e.target.value;
        if (type === 'mcq') {
            mcqEls.forEach(el => el.style.display = 'block');
            codingEls.forEach(el => el.style.display = 'none');
            questionBlock.querySelectorAll('.mcq-only input, .mcq-only select').forEach(input => input.setAttribute('required','true'));
            questionBlock.querySelectorAll('.coding-only select, .coding-only textarea').forEach(input => input.removeAttribute('required'));
        } else if (type === 'coding') {
            mcqEls.forEach(el => el.style.display = 'none');
            codingEls.forEach(el => el.style.display = 'block');
            questionBlock.querySelectorAll('.mcq-only input, .mcq-only select').forEach(input => input.removeAttribute('required'));
            questionBlock.querySelectorAll('.coding-only select').forEach(input => input.setAttribute('required','true'));
            // starter code optional
        } else {
            mcqEls.forEach(el => el.style.display = 'none');
            codingEls.forEach(el => el.style.display = 'none');
            questionBlock.querySelectorAll('.mcq-only input, .mcq-only select').forEach(input => input.removeAttribute('required'));
            questionBlock.querySelectorAll('.coding-only select, .coding-only textarea').forEach(input => input.removeAttribute('required'));
        }
    });

    // --- Add New Question Dynamically ---
    addQuestionBtn.addEventListener('click', function() {
        questionCount++;

        const newQuestionBlock = document.createElement('div');
        newQuestionBlock.classList.add('question-block');
        newQuestionBlock.innerHTML = `
            <h4>Question ${questionCount}</h4>
            <button type="button" class="btn-remove-question">Remove</button>
            <div class="form-group">
                <label>Question Type</label>
                <select class="question-type" required> 
                    <option value="mcq">Multiple Choice Question (MCQ)</option>
                    <option value="written">Written Question</option>
                    <option value="coding">Coding Question</option>
                </select>
            </div>
            <div class="form-group">
                <label>Question Text</label>
                <textarea class="question-text" placeholder="Enter the question here..." required></textarea>
            </div>
            <div class="form-group">
                <label>Question Image (optional)</label>
                <input type="file" class="question-image" accept="image/*">
            </div>
            <div class="form-group">
                <label>Explanation (optional)</label>
                <textarea class="question-explanation" placeholder="Add explanation or solution..."></textarea>
            </div>
            <div class="mcq-only">
                <div class="form-group" style="margin-bottom:10px;">
                    <label><input type="checkbox" class="is-multiple"> Allow multiple correct answers</label>
                </div>
                <div class="options-container"></div>
                <button type="button" class="btn-action add-option-btn"><i class='bx bx-plus'></i> Add Option</button>
            </div>
            <div class="form-group coding-only" style="display:none;">
                <label>Programming Language</label>
                <select class="code-language">
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                </select>
            </div>
            <div class="form-group coding-only" style="display:none;">
                <label>Starter Code (optional)</label>
                <textarea class="code-starter" placeholder="Provide starter template or function signature..."></textarea>
            </div>
            <div class="form-group">
                <label>Marks</label>
                <input type="number" class="question-marks" placeholder="e.g., 5" min="1" required>
            </div>
        `;
        questionsContainer.appendChild(newQuestionBlock);
        attachQuestionEnhancements(newQuestionBlock);
    });

    // --- Remove Question ---
    questionsContainer.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('btn-remove-question')) {
            e.target.closest('.question-block').remove();
            // Re-number questions
            const allH4s = questionsContainer.querySelectorAll('h4');
            allH4s.forEach((h4, index) => {
                h4.textContent = `Question ${index + 1}`;
            });
            questionCount = allH4s.length; // Update questionCount after removal
        }
    });

    // --- Handle Final Form Submission ---
    quizForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const submitButton = quizForm.querySelector('.btn-submit');
        submitButton.disabled = true;
            submitButton.textContent = isEditing ? "Updating Quiz..." : "Creating Quiz...";

        try {
            // --- Collect Questions Data ---
            const questions = [];
            const questionBlocks = document.querySelectorAll('.question-block');
            
            for (const block of questionBlocks) {
                const questionText = block.querySelector('.question-text').value;
                const questionType = block.querySelector('.question-type').value;
                const marks = parseInt(block.querySelector('.question-marks').value) || 1;
                
                const explanation = block.querySelector('.question-explanation')?.value || '';
                const questionImage = block.dataset.questionImage || '';
                const questionData = { questionText, questionType, marks, explanation, questionImage };

                if (questionType === 'mcq') {
                    const optsContainer = block.querySelector('.options-container');
                    const isMultiple = !!block.querySelector('.is-multiple')?.checked;
                    const optRows = optsContainer ? Array.from(optsContainer.querySelectorAll('.option-row')) : [];
                    const options = optRows.map((row) => ({ text: row.querySelector('.option-text').value.trim(), image: row.dataset.imageBase64 || '' }));
                    if (options.length === 0 || options.some(o => o.text === '')) throw new Error('Please add and fill all MCQ options.');
                    const correctIndices = optRows.map((row, idx) => ({ idx, ok: !!row.querySelector('.option-correct')?.checked })).filter(x => x.ok).map(x => x.idx);
                    questionData.isMultiple = isMultiple;
                    questionData.options = options;
                    if (isMultiple) { questionData.correctAnswers = correctIndices; } else { questionData.correctAnswer = correctIndices[0] ?? 0; }
                } else if (questionType === 'coding') {
                    const langEl = block.querySelector('.code-language');
                    const starterEl = block.querySelector('.code-starter');
                    questionData.codeLanguage = langEl ? langEl.value : 'javascript';
                    questionData.codeStarter = starterEl ? starterEl.value : '';
                }
                // For 'written' questions, no options or correct answer are needed.
                // No specific validation for written question answers on creation, as they are free-form.

                questions.push(questionData);
            }

            if (questions.length === 0) {
                showToast("Please add at least one question.", 'warning');
            submitButton.disabled = false;
            submitButton.textContent = isEditing ? "Update Quiz" : "Create Quiz";
                return;
            }

            // --- Collect Main Quiz Data ---
            const scheduleTimeValue = document.getElementById('quiz-schedule').value;
            const quizData = {
                title: document.getElementById('quiz-title').value,
                category: document.getElementById('quiz-category').value,
                field: document.getElementById('quiz-field').value,
                difficulty: document.getElementById('quiz-difficulty').value,
                quizType: document.getElementById('quiz-type').value,
                duration: parseInt(document.getElementById('quiz-duration').value),
                registrationLimit: parseInt(document.getElementById('quiz-limit').value) || 0,
                scheduleTime: scheduleTimeValue ? new Date(scheduleTimeValue).toISOString() : undefined,
                price: parseFloat(document.getElementById('quiz-price').value) || 0,
                visibility: document.getElementById('quiz-visibility').value,
                coverImage: coverImageBase64, // Add the Base64 image string
                questions: questions,
                numQuestionsToShow: parseInt(document.getElementById('num-questions')?.value) || undefined
            };

            // Basic validation for required fields
            if (!quizData.title || !quizData.category || !quizData.field || !quizData.difficulty || !quizData.quizType || !quizData.duration || !quizData.coverImage) {
                showToast('Please fill in all required quiz details and upload a cover image.', 'warning');
                submitButton.disabled = false;
                submitButton.textContent = "Create Quiz";
                return;
            }
            if (quizData.quizType === 'paid' && quizData.price <= 0) {
                showToast('Paid quizzes must have a price greater than 0.', 'warning');
                submitButton.disabled = false;
                submitButton.textContent = "Create Quiz";
                return;
            }

            // --- BACKEND CALL ---
            const method = isEditing ? 'PUT' : 'POST';
            const data = await apiFetch(isEditing ? `/quizzes/${editQuizId}` : '/quizzes', {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(quizData)
            });
            if (!data) {
                throw new Error('Failed to save quiz. Please try again.');
            }
            showToast(`Quiz ${isEditing ? 'updated' : 'created'} successfully!`, 'success');
            window.location.href = 'my-quizzes.html'; // Redirect to quiz management list

        } catch (error) {
            console.error('Quiz Creation Error:', error);
            showToast(`Error creating quiz: ${error.message}`, 'error');
            submitButton.disabled = false;
            submitButton.textContent = "Create Quiz";
        }
    });

    // --- Load Quiz for Editing ---
    async function loadQuizForEditing(quizId) {
        try {
            const quiz = await apiFetch(`/quizzes/${quizId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!quiz) throw new Error('Failed to load quiz for editing.');

            // Populate form fields
            document.getElementById('quiz-title').value = quiz.title;
            document.getElementById('quiz-category').value = quiz.category;
            try { populateFieldOptions(quiz.category); } catch(_){}
            if (quiz.field && quizFieldSelect) { quizFieldSelect.value = quiz.field; }
            if (quiz.difficulty && quizDifficultySelect) { quizDifficultySelect.value = quiz.difficulty; }
            document.getElementById('quiz-type').value = quiz.quizType;
            document.getElementById('quiz-duration').value = quiz.duration;
            document.getElementById('quiz-limit').value = quiz.registrationLimit || '';
            if (quiz.scheduleTime) {
                const localDate = new Date(quiz.scheduleTime);
                const year = localDate.getFullYear();
                const month = String(localDate.getMonth() + 1).padStart(2, '0');
                const day = String(localDate.getDate()).padStart(2, '0');
                const hours = String(localDate.getHours()).padStart(2, '0');
                const minutes = String(localDate.getMinutes()).padStart(2, '0');
                const localISOString = `${year}-${month}-${day}T${hours}:${minutes}`;
                document.getElementById('quiz-schedule').value = localISOString;
            } else {
                document.getElementById('quiz-schedule').value = '';
            }
            document.getElementById('quiz-price').value = quiz.price || '';
            document.getElementById('quiz-visibility').value = quiz.visibility || 'public';

            // Handle price field visibility
            if (quiz.quizType === 'paid') {
                priceGroup.style.display = 'block';
            }

            // Set cover image if exists
            if (quiz.coverImage) {
                coverImageBase64 = quiz.coverImage;
                // Note: File input can't be pre-filled with Base64, but we have the data
            }

            // Clear existing questions
            questionsContainer.innerHTML = '';

            // Populate questions
            quiz.questions.forEach((question, index) => {
                const questionBlock = document.createElement('div');
                questionBlock.classList.add('question-block');
                questionBlock.innerHTML = `
                    <h4>Question ${index + 1}</h4>
                    <button type="button" class="btn-remove-question">Remove</button>
                    <div class="form-group">
                        <label>Question Type</label>
                        <select class="question-type" required>
                            <option value="mcq" ${question.questionType === 'mcq' ? 'selected' : ''}>Multiple Choice Question (MCQ)</option>
                            <option value="written" ${question.questionType === 'written' ? 'selected' : ''}>Written Question</option>
                            <option value="coding" ${question.questionType === 'coding' ? 'selected' : ''}>Coding Question</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Question Text</label>
                        <textarea class="question-text" placeholder="Enter the question here..." required>${question.questionText}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Question Image (optional)</label>
                        <input type="file" class="question-image" accept="image/*">
                    </div>
                    <div class="form-group">
                        <label>Explanation (optional)</label>
                        <textarea class="question-explanation" placeholder="Add explanation or solution...">${question.explanation || ''}</textarea>
                    </div>
                    <div class="mcq-only" style="display: ${question.questionType === 'mcq' ? 'block' : 'none'};">
                        <div class="form-group" style="margin-bottom:10px;">
                            <label><input type="checkbox" class="is-multiple" ${question.isMultiple ? 'checked' : ''}> Allow multiple correct answers</label>
                        </div>
                        <div class="options-container"></div>
                        <button type="button" class="btn-action add-option-btn"><i class='bx bx-plus'></i> Add Option</button>
                    </div>
                    <div class="form-group coding-only" style="display: ${question.questionType === 'coding' ? 'block' : 'none'};">
                        <label>Programming Language</label>
                        <select class="code-language" ${question.questionType === 'coding' ? 'required' : ''}>
                            <option value="javascript" ${question.codeLanguage === 'javascript' ? 'selected' : ''}>JavaScript</option>
                            <option value="python" ${question.codeLanguage === 'python' ? 'selected' : ''}>Python</option>
                            <option value="java" ${question.codeLanguage === 'java' ? 'selected' : ''}>Java</option>
                            <option value="cpp" ${question.codeLanguage === 'cpp' ? 'selected' : ''}>C++</option>
                        </select>
                    </div>
                    <div class="form-group coding-only" style="display: ${question.questionType === 'coding' ? 'block' : 'none'};">
                        <label>Starter Code (optional)</label>
                        <textarea class="code-starter" placeholder="Provide starter template or function signature...">${question.codeStarter || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Marks</label>
                        <input type="number" class="question-marks" placeholder="e.g., 5" min="1" value="${Number.isFinite(question.marks) ? question.marks : 1}" required>
                    </div>
                `;
                questionsContainer.appendChild(questionBlock);
                if (question.questionImage) { questionBlock.dataset.questionImage = question.questionImage; }
                if (question.questionType === 'mcq') {
                    const cont = questionBlock.querySelector('.options-container');
                    const correctSet = question.isMultiple ? (Array.isArray(question.correctAnswers) ? question.correctAnswers : []) : [question.correctAnswer];
                    (question.options || []).forEach((opt, i) => {
                        const row = createOptionRow(opt.text || '', opt.image || '', Array.isArray(correctSet) ? correctSet.includes(i) : false);
                        cont.appendChild(row);
                    });
                }
                attachQuestionEnhancements(questionBlock);
            });

            questionCount = quiz.questions.length;

            if (isViewMode) {
                document.querySelectorAll('input, select, textarea').forEach(el => {
                    el.disabled = true;
                });
                document.querySelectorAll('.btn-remove-question').forEach(btn => {
                    btn.style.display = 'none';
                });
            }

        } catch (error) {
            console.error('Error loading quiz for editing:', error);
            showToast('Failed to load quiz for editing. Redirecting to create new quiz.', 'error');
            window.location.href = 'create-quiz.html';
        }
    }

    // Initial check for price group visibility (in case 'paid' is default or pre-selected)
    if (quizTypeSelect.value === 'paid') {
        priceGroup.style.display = 'block';
    } else {
        priceGroup.style.display = 'none';
    }
    document.querySelectorAll('.question-block').forEach(attachQuestionEnhancements);
});
