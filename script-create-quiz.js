document.addEventListener("DOMContentLoaded", function() {

    // Define the location of your backend
const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';

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
        alert("You are not authorized to view this page. Redirecting...");
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
    let questionCount = 1; // Initialize with 1 for the first question block
    let coverImageBase64 = null;

    // --- Show/Hide Price Field ---
    quizTypeSelect.addEventListener('change', function() {
        if (this.value === 'paid') {
            priceGroup.style.display = 'block';
        } else {
            priceGroup.style.display = 'none';
        }
    });

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
                alert('Could not load image. Please ensure it is a valid image file.');
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
        if (e.target.classList.contains('question-type')) {
            const questionBlock = e.target.closest('.question-block');
            const mcqOnlyElements = questionBlock.querySelectorAll('.mcq-only');
            if (e.target.value === 'mcq') {
                mcqOnlyElements.forEach(el => el.style.display = 'block'); // Show MCQ fields
                // Ensure required attributes are set for MCQ fields
                questionBlock.querySelectorAll('.mcq-only input, .mcq-only select').forEach(input => input.setAttribute('required', 'true'));
            } else {
                mcqOnlyElements.forEach(el => el.style.display = 'none'); // Hide MCQ fields
                // Remove required attributes for written fields
                questionBlock.querySelectorAll('.mcq-only input, .mcq-only select').forEach(input => input.removeAttribute('required'));
            }
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
                </select>
            </div>
            <div class="form-group">
                <label>Question Text</label>
                <textarea class="question-text" placeholder="Enter the question here..." required></textarea>
            </div>
            <div class="options-grid mcq-only">
                <div class="form-group">
                    <label>Option 1</label>
                    <input type="text" class="option-text" placeholder="Option 1" required>
                </div>
                <div class="form-group">
                    <label>Option 2</label>
                    <input type="text" class="option-text" placeholder="Option 2" required>
                </div>
                <div class="form-group">
                    <label>Option 3</label>
                    <input type="text" class="option-text" placeholder="Option 3" required>
                </div>
                <div class="form-group">
                    <label>Option 4</label>
                    <input type="text" class="option-text" placeholder="Option 4" required>
                </div>
            </div>
            <div class="form-group mcq-only">
                <label>Correct Answer</label>
                <select class="correct-answer" required>
                    <option value="0">Option 1</option>
                    <option value="1">Option 2</option>
                    <option value="2">Option 3</option>
                    <option value="3">Option 4</option>
                </select>
            </div>
        `;
        questionsContainer.appendChild(newQuestionBlock);
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
                
                const questionData = {
                    questionText,
                    questionType
                };

                if (questionType === 'mcq') {
                    const optionElements = block.querySelectorAll('.option-text'); // Get all option input fields
                    const correctAnswer = block.querySelector('.correct-answer').value; // Get the selected correct answer index
                    
                    // Format options as [{text: "Option A"}, {text: "Option B"}, ...]
                    const options = Array.from(optionElements).map(opt => ({ text: opt.value.trim() }));
                    if (options.some(opt => opt.text === '')) {
                        throw new Error('All MCQ options must be filled.');
                    }
                    
                    questionData.options = options;
                    questionData.correctAnswer = parseInt(correctAnswer); // Convert "0", "1" to number
                }
                // For 'written' questions, no options or correct answer are needed.
                // No specific validation for written question answers on creation, as they are free-form.

                questions.push(questionData);
            }

            if (questions.length === 0) {
                alert("Please add at least one question.");
            submitButton.disabled = false;
            submitButton.textContent = isEditing ? "Update Quiz" : "Create Quiz";
                return;
            }

            // --- Collect Main Quiz Data ---
            const scheduleTimeValue = document.getElementById('quiz-schedule').value;
            const quizData = {
                title: document.getElementById('quiz-title').value,
                category: document.getElementById('quiz-category').value,
                quizType: document.getElementById('quiz-type').value,
                duration: parseInt(document.getElementById('quiz-duration').value),
                registrationLimit: parseInt(document.getElementById('quiz-limit').value) || 0,
                scheduleTime: scheduleTimeValue ? new Date(scheduleTimeValue).toISOString() : undefined,
                price: parseFloat(document.getElementById('quiz-price').value) || 0,
                visibility: document.getElementById('quiz-visibility').value,
                coverImage: coverImageBase64, // Add the Base64 image string
                questions: questions
            };

            // Basic validation for required fields
            if (!quizData.title || !quizData.category || !quizData.quizType || !quizData.duration || !quizData.coverImage) {
                alert('Please fill in all required quiz details and upload a cover image.');
                submitButton.disabled = false;
                submitButton.textContent = "Create Quiz";
                return;
            }
            if (quizData.quizType === 'paid' && quizData.price <= 0) {
                alert('Paid quizzes must have a price greater than 0.');
                submitButton.disabled = false;
                submitButton.textContent = "Create Quiz";
                return;
            }

            // --- BACKEND CALL ---
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing ? `${backendUrl}/quizzes/${editQuizId}` : `${backendUrl}/quizzes`;

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Send the admin's token
                },
                body: JSON.stringify(quizData)
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    alert('Access denied. Please log in again.');
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return;
                }
                // Handle non-JSON error responses gracefully
                const errorText = await response.text();
                try {
                    const data = JSON.parse(errorText);
                    throw new Error(data.message || 'Failed to save quiz.');
                } catch (e) {
                    // If parsing fails, the response was not JSON (likely HTML)
                    throw new Error(errorText || 'An unknown server error occurred.');
                }
            }

            const data = await response.json();
            alert(`Quiz ${isEditing ? 'updated' : 'created'} successfully!`);
            window.location.href = 'my-quizzes.html'; // Redirect to quiz management list

        } catch (error) {
            console.error('Quiz Creation Error:', error);
            alert(`Error creating quiz: ${error.message}`);
            submitButton.disabled = false;
            submitButton.textContent = "Create Quiz";
        }
    });

    // --- Load Quiz for Editing ---
    async function loadQuizForEditing(quizId) {
        try {
            const response = await fetch(`${backendUrl}/quizzes/${quizId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    alert('Access denied. Please log in again.');
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error('Failed to load quiz for editing.');
            }

            const quiz = await response.json();

            // Populate form fields
            document.getElementById('quiz-title').value = quiz.title;
            document.getElementById('quiz-category').value = quiz.category;
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
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Question Text</label>
                        <textarea class="question-text" placeholder="Enter the question here..." required>${question.questionText}</textarea>
                    </div>
                    <div class="options-grid mcq-only" style="display: ${question.questionType === 'mcq' ? 'grid' : 'none'};">
                        <div class="form-group">
                            <label>Option 1</label>
                            <input type="text" class="option-text" placeholder="Option 1" value="${question.options ? question.options[0]?.text || '' : ''}" ${question.questionType === 'mcq' ? 'required' : ''}>
                        </div>
                        <div class="form-group">
                            <label>Option 2</label>
                            <input type="text" class="option-text" placeholder="Option 2" value="${question.options ? question.options[1]?.text || '' : ''}" ${question.questionType === 'mcq' ? 'required' : ''}>
                        </div>
                        <div class="form-group">
                            <label>Option 3</label>
                            <input type="text" class="option-text" placeholder="Option 3" value="${question.options ? question.options[2]?.text || '' : ''}" ${question.questionType === 'mcq' ? 'required' : ''}>
                        </div>
                        <div class="form-group">
                            <label>Option 4</label>
                            <input type="text" class="option-text" placeholder="Option 4" value="${question.options ? question.options[3]?.text || '' : ''}" ${question.questionType === 'mcq' ? 'required' : ''}>
                        </div>
                    </div>
                    <div class="form-group mcq-only" style="display: ${question.questionType === 'mcq' ? 'block' : 'none'};">
                        <label>Correct Answer</label>
                        <select class="correct-answer" ${question.questionType === 'mcq' ? 'required' : ''}>
                            <option value="0" ${question.correctAnswer === 0 ? 'selected' : ''}>Option 1</option>
                            <option value="1" ${question.correctAnswer === 1 ? 'selected' : ''}>Option 2</option>
                            <option value="2" ${question.correctAnswer === 2 ? 'selected' : ''}>Option 3</option>
                            <option value="3" ${question.correctAnswer === 3 ? 'selected' : ''}>Option 4</option>
                        </select>
                    </div>
                `;
                questionsContainer.appendChild(questionBlock);
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
            alert('Failed to load quiz for editing. Redirecting to create new quiz.');
            window.location.href = 'create-quiz.html';
        }
    }

    // Initial check for price group visibility (in case 'paid' is default or pre-selected)
    if (quizTypeSelect.value === 'paid') {
        priceGroup.style.display = 'block';
    } else {
        priceGroup.style.display = 'none';
    }
});
