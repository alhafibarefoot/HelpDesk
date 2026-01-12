// API Base URL
const API_URL = window.location.origin;

// Login Form Handler
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn.querySelector('.btn-text');
    const spinner = loginBtn.querySelector('.spinner');
    const errorMessage = document.getElementById('errorMessage');

    // Hide previous errors
    errorMessage.style.display = 'none';

    // Show loading state
    loginBtn.disabled = true;
    btnText.textContent = 'Signing in...';
    spinner.style.display = 'inline-block';

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect to dashboard
            window.location.href = '/dashboard.html';
        } else {
            throw new Error(data.message || 'Invalid credentials');
        }
    } catch (error) {
        errorMessage.textContent = error.message || 'Login failed. Please try again.';
        errorMessage.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        btnText.textContent = 'Sign In';
        spinner.style.display = 'none';
    }
});

// Registration Form Handler
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const department = document.getElementById('department').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    const registerBtn = document.getElementById('registerBtn');
    const btnText = registerBtn.querySelector('.btn-text');
    const spinner = registerBtn.querySelector('.spinner');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    // Hide previous messages
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    // Validate passwords match
    if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match';
        errorMessage.style.display = 'block';
        return;
    }

    // Show loading state
    registerBtn.disabled = true;
    btnText.textContent = 'Creating account...';
    spinner.style.display = 'inline-block';

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                full_name: fullName,
                department
            })
        });

        const data = await response.json();

        if (response.ok) {
            successMessage.textContent = 'Account created successfully! Redirecting to login...';
            successMessage.style.display = 'block';

            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 2000);
        } else {
            throw new Error(data.message || 'Registration failed');
        }
    } catch (error) {
        errorMessage.textContent = error.message || 'Registration failed. Please try again.';
        errorMessage.style.display = 'block';
    } finally {
        registerBtn.disabled = false;
        btnText.textContent = 'Create Account';
        spinner.style.display = 'none';
    }
});

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return null;
    }
    return token;
}

// Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// API call with authentication
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        logout();
        throw new Error('Session expired');
    }

    return response;
}
