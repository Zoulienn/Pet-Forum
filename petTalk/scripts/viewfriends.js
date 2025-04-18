import { Post } from './post.js';

export class ViewFriends {
    constructor(name) {
        this.name = name;
    }

    render(loadContent, name) {
        this.name = name;
        const profileContent = `
            <div class="page-profile">
                <!-- Top Section -->
                <header class="profile-header">
                    <h2 id="username" class="center-text">${this.name}</h2>
                    <p id="bio" class="bio center-text">Boom Chakachakala</p>
                    <div class="stats">
                        <span id="postsCount">Posts: 0</span>
                        <span id="friendsCount">Friends: 0</span>
                        <span id="animalsCount">Animals: 0</span>
                    </div>

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
        
        this.setupFriendButtons(this.name);
        this.setupPostButtons(this.name);
        this.setupAnimalButtons(this.name);
        this.displayCount(this.name);
    }

    setupFriendButtons(name) {
        const showFriendsButton = document.getElementById('showFriendsButton');
        if (showFriendsButton) {
            showFriendsButton.addEventListener('click', () => {
                this.loadFriends(name); // Load existing friends
            });
        }
    }    

    setupPostButtons(name) {
        const showPostsButton = document.getElementById('showPostsButton');
        if (showPostsButton) {
            showPostsButton.addEventListener('click', () => {
                const post = new Post();
                post.showFriendPost((postContent) => {
                const postsSection = document.getElementById("contentDisplay");
                postsSection.innerHTML = postContent;
            }, name);

            });
        }
    }

    setupAnimalButtons(name) {
        const showAnimalButton = document.getElementById('showAnimalsButton');
        if (showAnimalButton) {
            showAnimalButton.addEventListener('click', () => {
                this.loadAnimals(name); // Load animals when the button is clicked
            });
        }
    }

    async loadFriends(name) {
        try {
            const response = await fetch(`/M00971314/viewfriends/list?name=${encodeURIComponent(name)}`);
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
    
                friendList.appendChild(friendItem);
            });
    
            friendListContainer.appendChild(friendList);
            contentDisplay.appendChild(friendListContainer);
    
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }

    async loadAnimals(name) {
        // Clear the display and show loading message
        const contentDisplay = document.getElementById('contentDisplay');
        contentDisplay.innerHTML = '';
    
        try {
            const response = await fetch(`/M00971314/friendanimals/list?name=${encodeURIComponent(name)}`);
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
            
        } catch (error) {
            console.error('Error loading animals:', error);
            contentDisplay.innerHTML = '<h3>Error loading animals. Please try again later.</h3>';
        }
    }

    async displayCount(name) {
        try {
            const response = await fetch(`/M00971314/friend/stats?name=${encodeURIComponent(name)}`);
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

}
