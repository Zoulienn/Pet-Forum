import { Post } from './post.js';

export class Profile {
    constructor(username) {
        this.username = username;
    }

    render(loadContent, username) {
        this.username = username;
        const profileContent = `
            <div class="page-profile">
                <!-- Top Section -->
                <header class="profile-header">
                    <h2 id="username" class="center-text">${this.username}</h2>
                    <p id="bio" class="bio center-text">I like Animals</p>
                    <div class="stats">
                        <span id="postsCount">Posts: 0</span>
                        <span id="friendsCount">Friends: 0</span>
                        <span id="animalsCount">Animals: 0</span>
                    </div>
                    <button id="logoutButton" class="logout-btn"><i class="fas fa-sign-out"></i>Logout</button>

                </header>

                <!-- Bottom Section -->
                <div class="profile-content">
                    <div class="content-options">
                        <button id="showPostsButton" class="toggle-btn">Posts</button>
                        <button id="showFriendsButton" class="toggle-btn">Friends</button>
                        <button id="showAnimalsButton" class="toggle-btn">Animals</button>
                    </div>
                    <div id="contentDisplay" class="content-display">
                        <!-- Posts or Friends or Animals will load here -->
                    </div>
                </div>
            </div>
        `;
        loadContent(profileContent);
        
        this.setupLogout();
        this.setupFriendButtons();
        this.setupPostButtons();
        this.setupAnimalButtons();

        this.loadSidebarFriendRequests();
        this.displayCount();
    }

    setupLogout() {
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', this.handleLogout.bind(this));
        }
    }

    setupFriendButtons() {
        const showFriendsButton = document.getElementById('showFriendsButton');
        if (showFriendsButton) {
            showFriendsButton.addEventListener('click', () => {
                this.loadFriends(); // Load existing friends
            });
        }
    }    

    setupSidebarRequestButtons() {
        const acceptButtons = document.querySelectorAll('.acceptFriendRequestButton');
        const declineButtons = document.querySelectorAll('.declineFriendRequestButton');

        acceptButtons.forEach(button =>
            button.addEventListener('click', this.acceptFriendRequest.bind(this))
        );

        declineButtons.forEach(button =>
            button.addEventListener('click', this.declineFriendRequest.bind(this))
        );
    }

    setupPostButtons() {
        const showPostsButton = document.getElementById('showPostsButton');
        if (showPostsButton) {
            showPostsButton.addEventListener('click', () => {
                const post = new Post();
                post.showMyPost((postContent) => {
                    const postsSection = document.getElementById("contentDisplay");
                    postsSection.innerHTML = postContent;
                });
            });
        }
    }

    setupAnimalButtons() {
        const showAnimalButton = document.getElementById('showAnimalsButton');
        if (showAnimalButton) {
            showAnimalButton.addEventListener('click', () => {
                this.loadAnimals(); // Load animals when the button is clicked
            });
        }
    }

    async handleLogout() {
        try {
            const response = await fetch('/M00971314/logout', { method: 'DELETE' });
            const data = await response.json();
    
            if (data.success) {
                alert('You have logged out.');
                window.location.href = "#/User";
    
                // Remove current username
                const accountUserElement = document.getElementById('account_user');
                const icon = accountUserElement.querySelector('i');
                const anchor = accountUserElement.querySelector('a');
                anchor.innerHTML = `${icon.outerHTML} ${'User'}`;
            }
        } catch (error) {
            console.error('Error logging out:', error);
        }
    }
    

    async loadFriends() {
        try {
            const response = await fetch('/M00971314/friends/list');
            const friends = await response.json();
    
            const contentDisplay = document.getElementById('contentDisplay');
            contentDisplay.innerHTML = '';
            
            // Create a container for the friends list
            const friendListContainer = document.createElement('div');
            friendListContainer.classList.add('friend-list-container');
            
            // Create the list itself
            const friendList = document.createElement('ul');
            friendList.classList.add('friend-list');
    
            friends.forEach(friend => {
                const friendItem = document.createElement('li');
                friendItem.classList.add('friend-item');
    
                // Add friend username
                const usernameSpan = document.createElement('span');
                usernameSpan.textContent = friend.username;
                usernameSpan.classList.add('friend-username');
                friendItem.appendChild(usernameSpan);
    
                // Add the 'Unfriend' button
                const UnfriendButton = document.createElement('button');
                UnfriendButton.className = 'UnfriendButton';
                UnfriendButton.dataset.username = friend.username; // Store the friend's username as data attribute
                UnfriendButton.textContent = 'RemoveFriend';
                UnfriendButton.type = 'button';
                friendItem.appendChild(UnfriendButton);
                friendList.appendChild(friendItem);
            });
    
            friendListContainer.appendChild(friendList);
            contentDisplay.appendChild(friendListContainer);

            const friendsListContainer = document.querySelector('.friend-list-container'); // Parent container for friends list
            if (friendsListContainer) {
                friendsListContainer.addEventListener('click', (event) => {
                    if (event.target && event.target.classList.contains('UnfriendButton')) {
                        const friendUsername = event.target.dataset.username; // Get the friend's username
                        this.removeFriend(friendUsername);
                    }
                });
            }
            


        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }
    
    async loadSidebarFriendRequests() {
        try {
            const response = await fetch('/M00971314/friends/pending');
            const pendingRequests = await response.json();

            const sideBar = document.getElementById('sideBar');
            sideBar.innerHTML = '<h3>Pending Friend Requests</h3>';
            if (pendingRequests.length === 0) {
                sideBar.innerHTML += '<p>No pending friend requests.</p>';
                return;
            }

            pendingRequests.forEach(request => {
                const requestItem = document.createElement('div');
                requestItem.className = 'request-item';
                requestItem.innerHTML = `
                    <span>${request.fromUser}</span>
                    <button class="acceptFriendRequestButton" data-id="${request._id}">Accept</button>
                    <button class="declineFriendRequestButton" data-id="${request._id}">Decline</button>
                `;
                sideBar.appendChild(requestItem);
            });

            this.setupSidebarRequestButtons(); // Attach event listeners to Accept/Decline buttons
        } catch (error) {
            console.error('Error loading sidebar friend requests:', error);
        }
    }

    async acceptFriendRequest(event) {
        const requestId = event.target.dataset.id;
        try {
            const response = await fetch('/M00971314/friends/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId }),
            });

            const data = await response.json();
            if (data.success) {
                alert('Friend request accepted.');
                this.loadSidebarFriendRequests(); // Refresh sidebar
            } else {
                alert(data.message || 'Failed to accept friend request.');
            }
        } catch (error) {
            console.error('Error accepting friend request:', error);
        }
    }

    async declineFriendRequest(event) {
        const requestId = event.target.dataset.id;
        try {
            const response = await fetch('/M00971314/friends/decline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId }),
            });

            const data = await response.json();
            if (data.success) {
                alert('Friend request declined.');
                this.loadSidebarFriendRequests(); // Refresh sidebar
            } else {
                alert(data.message || 'Failed to decline friend request.');
            }
        } catch (error) {
            console.error('Error declining friend request:', error);
        }
    }
    
    AddAnimalSection() {
        // Render the add animal form
        const contentDisplay = document.getElementById('contentDisplay');
        contentDisplay.innerHTML = '';

        const addAnimalForm = document.createElement('div');
        addAnimalForm.classList.add('add-animal-form');
        addAnimalForm.innerHTML = `
            <input type="text" id="animalInput" placeholder="Enter Pet Type" />
            <button id="addAnimalButton" type="button">Add Pet</button>
            <button id="removeAnimalButton" type="button">Remove Pet</button>
        `;
        contentDisplay.appendChild(addAnimalForm);
    
        // Set up the event listener for the "Add Animal" button
        const addAnimalButton = document.getElementById('addAnimalButton');
        if (addAnimalButton) {
            addAnimalButton.addEventListener('click', () => {
                this.addAnimal(); // Call function to add animal when the button is clicked
                location.reload();
            });
        }

        const RemoveAnimalButton = document.getElementById('removeAnimalButton');
        if (RemoveAnimalButton) {
            RemoveAnimalButton.addEventListener('click', () => {
                this.removeAnimal();
                location.reload();
            });
        }
    }
    
    async addAnimal() {
        const animalInput = document.getElementById('animalInput');
        const animalName = animalInput.value.trim();
    
        if (!animalName) {
            alert('Please enter a valid animal name.');
            return;
        }
    
        try {
            const response = await fetch('/M00971314/animals/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ animalName })
            });
    
            const data = await response.json();
            if (data.success) {
                alert('Animal added successfully!');
                this.loadAnimals(); // Reload animals after adding
            } else {
                alert('Failed to add animal.');
            }
        } catch (error) {
            console.error('Error adding animal:', error);
            alert('An error occurred while adding the animal.');
        }
    }
    
    async removeAnimal() {
        const animalInput = document.getElementById('animalInput');
        const animalName = animalInput.value.trim();

        try {
            const response = await fetch('/M00971314/animals/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ animalName })
            });
    
            const data = await response.json();
            if (data.success) {
                alert('Animal removed successfully!');
                this.loadAnimals(); // Reload animals after removal
            } else {
                alert('Failed to remove animal.');
            }
        } catch (error) {
            console.error('Error removing animal:', error);
            alert('An error occurred while removing the animal.');
        }
    }

    async loadAnimals() {
        // Clear the display and show loading message
        const contentDisplay = document.getElementById('contentDisplay');
        contentDisplay.innerHTML = '';
    
        try {
            const response = await fetch('/M00971314/animals/list');
            const animals = await response.json();
    
            // Check if there are any animals to display
            if (animals.length === 0) {
                contentDisplay.innerHTML = '<h3>No animals added yet.</h3>';
                return;
            }
    
            // Create a container for the animals list
            const animalListContainer = document.createElement('div');
            animalListContainer.classList.add('animal-list-container');
    
            // Create the list itself
            const animalList = document.createElement('ul');
            animalList.classList.add('animal-list');
    
            animals.forEach(animal => {
                const animalItem = document.createElement('li');
                animalItem.classList.add('animal-item');
    
                // Add animal name
                const animalNameSpan = document.createElement('span');
                animalNameSpan.textContent = animal;
                animalNameSpan.classList.add('animal-name');
                animalItem.appendChild(animalNameSpan);
    
                animalList.appendChild(animalItem);
            });
    
            animalListContainer.appendChild(animalList);
            contentDisplay.appendChild(animalListContainer);
    
            
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.classList.add('edit-button');
            contentDisplay.appendChild(editButton);

            editButton.addEventListener('click', () => {
                this.AddAnimalSection();
            });
            
        } catch (error) {
            console.error('Error loading animals:', error);
            contentDisplay.innerHTML = '<h3>Error loading animals. Please try again later.</h3>';
        }
    }

    async displayCount() {
        try {
            const response = await fetch('/M00971314/user/stats');
            const data = await response.json();
    
            if (data.success) {
                // Update the counts in the UI
                document.getElementById('postsCount').textContent = `Posts: ${data.postsCount}`;
                document.getElementById('friendsCount').textContent = `Friends: ${data.friendsCount}`;
                document.getElementById('animalsCount').textContent = `Animals: ${data.animalsCount}`;
            } else {
                console.error('Failed to load stats:', data.message);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }
    
    async removeFriend(friendUsername) {
        try {
            const response = await fetch('/M00971314/friends/remove', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ friendUsername }),
            });
    
            const data = await response.json();
    
            if (data.success) {
                console.log('Friend removed successfully');
                const friendItem = document.getElementById(`friend-${friendUsername}`);
                if (friendItem) {
                    friendItem.remove();
                }
            } else {
                console.error('Failed to remove friend:', data.message);
            }
        } catch (error) {
            console.error('Error removing friend:', error);
        }
        location.reload();
    }
    
}
