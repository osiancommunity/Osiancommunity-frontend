document.addEventListener("DOMContentLoaded", function() {

    // Define the location of your backend
const backendUrl = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';

    // --- Authentication ---
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    // Security Check: Is user logged in?
    if (!token || !user) {
        alert("You must be logged in to make a payment. Redirecting...");
        window.location.href = 'login.html';
        return;
    }

    // --- Get Quiz ID from URL ---
    // User gets here from a link like: <a href="payment.html?quizId=123...">
    const urlParams = new URLSearchParams(window.location.search);
    let razorpayKeyId = null; // To store the key from backend
    const quizId = urlParams.get('quizId');

    if (!quizId) {
        alert("Invalid payment page. No quiz selected. Redirecting...");
        window.location.href = 'dashboard-user.html';
        return;
    }

    // --- Page Elements ---
    const checkoutForm = document.getElementById('checkout-form');
    const payButton = document.getElementById('pay-btn');
    const paymentChecking = document.getElementById('payment-checking');

    let currentOrderId = null; // To store the order ID from the backend
    let razorpayOrderId = null; // To store the Razorpay order ID
    let orderData = null; // To store the order data from the backend

    // --- Fetch Razorpay Key ID ---
    async function getRazorpayKey() {
        try {
            const response = await fetch(`${backendUrl}/payments/get-key`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not fetch Razorpay key');
            const data = await response.json();
            razorpayKeyId = data.keyId;
        } catch (error) {
            console.error('Razorpay Key Error:', error);
            alert('Error initializing payment provider. Please try again later.');
        }
    }

    // --- Step 1: Create a Pending Order on Page Load ---
    async function createPaymentOrder() {
        try {
            // --- BACKEND CALL 1: CREATE ORDER ---
            const response = await fetch(`${backendUrl}/payments/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ quizId: quizId })
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Failed to create order';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch (parseError) {
                    // If not JSON, use the raw text or a generic message
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();

            // --- SUCCESS ---
            currentOrderId = data.order.orderId; // Save the order ID
            razorpayOrderId = data.order.razorpayOrder.id; // Save Razorpay order ID
            orderData = data.order; // Save the entire order data

            // Update the page with real data
            document.querySelector('.quiz-item h4').textContent = data.order.quiz.title;
            document.querySelector('.item-price').textContent = `₹${data.order.amount.toFixed(2)}`;
            document.querySelector('.total-price').textContent = `₹${data.order.amount.toFixed(2)}`;
            payButton.textContent = `Pay ₹${data.order.amount.toFixed(2)}`;

            // Show the form now that we have an order
            checkoutForm.style.display = 'block';

        } catch (error) {
            console.error('Order Creation Error:', error);
            alert(`Error: ${error.message}`);
            // Send user back if order fails
            window.location.href = 'dashboard-user.html';
        }
    }
    
    // --- Step 2: Handle "Payment" Submission ---
    checkoutForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!currentOrderId || !razorpayOrderId) {
            alert("Error: Order ID is missing.");
            return;
        }

        // Show "Processing..."
        payButton.style.display = 'none';
        paymentChecking.style.display = 'block';

        // Initialize Razorpay with the data from createOrder response
        const options = {
            key: razorpayKeyId, // Use the key from the backend
            amount: orderData.amount * 100, // Amount in paise
            currency: 'INR',
            name: 'Osian Quiz Platform',
            description: `Payment for ${orderData.quiz.title}`,
            order_id: orderData.razorpayOrder.id, // Correctly pass the Razorpay Order ID string
            image: 'https://via.placeholder.com/100x100?text=Osian', // Optional logo
            notes: {
                quizId: quizId,
                userId: user._id
            },
            handler: async function (response) {
                // Payment successful
                try {
                    // Verify payment with backend
                    const verifyResponse = await fetch(`${backendUrl}/payments/verify-payment`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            orderId: currentOrderId,
                            paymentId: response.razorpay_payment_id,
                            signature: response.razorpay_signature,
                            status: 'success'
                        })
                    });

                    const verifyData = await verifyResponse.json();

                    if (!verifyResponse.ok) {
                        throw new Error(verifyData.message);
                    }

                    // Success - redirect to My Quizzes page for all paid quiz registrations
                    window.location.href = 'quiz-progress.html';

                } catch (error) {
                    console.error('Payment Verification Error:', error);
                    alert(`Payment verification failed: ${error.message}`);
                    payButton.style.display = 'block';
                    paymentChecking.style.display = 'none';
                }
            },
            prefill: {
                name: user.name,
                email: user.email,
                contact: user.phone || ''
            },
            theme: {
                color: '#3399cc'
            },
            modal: {
                ondismiss: function() {
                    // Payment cancelled
                    payButton.style.display = 'block';
                    paymentChecking.style.display = 'none';
                    alert('Payment cancelled by user.');
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();
    });
    
    // --- Initial Page Load ---
    // Hide form until we create an order
    checkoutForm.style.display = 'none'; 
    getRazorpayKey().then(() => {
        createPaymentOrder();
    });
});
