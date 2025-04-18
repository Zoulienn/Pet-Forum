export class Account {
    render(loadContent) {
        const accountContent = `
        <div class="Account">
            <input type="checkbox" id="check" aria-hidden="true">

            <div class="register">
                <form id="registerForm">
                    <label for="check" aria-hidden="true">Register</label>
                    <input type="text" name="username" id="registerUsername" placeholder="Username" required>
                    <input type="email" name="email" id="registerEmail" placeholder="Email" required>
                    <input type="password" name="password" id="registerPassword" placeholder="Password" required>
                    <input type="tel" name="telNumber" id="registerTelNumber" placeholder="Telephone Number" required>
                    <button type="button" id="registerButton" class="accountButton">Register</button>
                </form>
            </div>

            <div class="login">
                <form id="loginForm">
                    <label for="check" aria-hidden="true">Login</label>
                    <input type="text" name="username" id="loginUsername" placeholder="Username" required>
                    <input type="password" name="password" id="loginPassword" placeholder="Password" required>
                    <button type="button" id="loginButton" class="accountButton">Login</button>
                </form>
            </div>
        </div> `;
        loadContent(accountContent);
    }

    async register() {
        const registerButton = document.getElementById('registerButton');
        registerButton.addEventListener('click', async () => {
            try {
                // Collect form data
                const username = document.getElementById('registerUsername').value;
                const email = document.getElementById('registerEmail').value;
                const password = document.getElementById('registerPassword').value;
                const telNumber = document.getElementById('registerTelNumber').value;

                // Validation
                await this.validation(username, email, password, telNumber);

                // Prepare data for sending
                const formData = JSON.stringify({
                    username,
                    email,
                    password,
                    telNumber
                });

                // Send AJAX request
                const response = await fetch('/M00971314/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: formData
                });

                const data = await response.json();
                
                // Handle response
                if (data.success) {
                    alert('Registration successful!');
                } else {
                    alert(`Registration failed: ${data.message}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }

    async login() {
        const loginButton = document.getElementById('loginButton');
        loginButton.addEventListener('click', async () => {
            try {
                // Collect form data
                const username = document.getElementById('loginUsername').value;
                const password = document.getElementById('loginPassword').value;

                // Basic validation for username and password
                if (!username || username.trim().length === 0) {
                    throw new Error('Username is required.');
                }
                if (!password || password.trim().length === 0) {
                    throw new Error('Password is required.');
                }

                // Prepare data for sending
                const loginData = JSON.stringify({
                    username,
                    password
                });

                // Send AJAX request for login
                const response = await fetch('/M00971314/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: loginData
                });

                const data = await response.json();

                // Handle response
                if (data.success) {
                    alert('Login successful!');
                    window.location.href="#/Home"
                } else {
                    alert(`Login failed: ${data.message}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }

    // Form validation for registration
    async validation(username, email, password, telNumber) {
        if (!username || username.trim().length === 0) {
            throw new Error('Username is required.');
        }

        const emailPattern = /^[^@]+@[^@]+\.[^@]+$/;
        if (!email || !emailPattern.test(email)) {
            throw new Error('Invalid email format. Please include an "@" symbol.');
        }

        const passwordPattern = /^(?=.*[A-Z])(?=.*\W).{8,}$/;
        if (!password || !passwordPattern.test(password)) {
            throw new Error('Password must be at least 8 characters long, contain at least one capital letter, and one symbol.');
        }

        if (!telNumber || telNumber.trim().length === 0) {
            throw new Error('Telephone number is required.');
        }
    }

    async checkSession(profile) {
        try {
            const response = await fetch('/M00971314/session');
            const data = await response.json();
    
            if (data.loggedIn) {
                // Update the UI to reflect logged-in status
                const accountUserElement = document.getElementById('account_user');
                const icon = accountUserElement.querySelector('i'); // Get the <i> element
                const anchor = accountUserElement.querySelector('a'); // Get the <a> element
                anchor.innerHTML = `${icon.outerHTML} ${data.username}`;
    
                // Redirect to profile if user visits the account page
                if (window.location.hash === "#/User") {
                    window.location.hash = "#/Profile";
                }
                return data.username;
            }
        } catch (error) {
            console.error('Error checking session:', error);
        }
    }   
}
