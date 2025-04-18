export class Search {
    constructor() {
        this.basePath = "/M00971314";
        this.setupFriendRequestButtons = this.setupFriendRequestButtons.bind(this);
        this.sendFriendRequest = this.sendFriendRequest.bind(this);
    }
    

    async searchUsers(query, showResults) {
        try {
            const response = await fetch(`${this.basePath}/search/users?query=${encodeURIComponent(query)}`);
            const data = await response.json();
           
            if (data.success) {
                const userResults = data.users
                    .map((user) => `
                            <span class="username">${user.username}</span>
                            <button class="sendFriendRequestButton" data-username="${user.username}" type="button">Request</button>
                            <button class="viewFriendButton" data-username="${user.username}" type="button">View</button>

                    `)
                    .join("");
                
                showResults(`
                    <div class="user-results">
                        ${userResults}
                    </div>`);
            } else {
                showResults(`<p>No users found.</p>`);
            }
        } catch (error) {
            console.error("Error searching for users:", error);
        }
    }

    // Event delegation for buttons
    setupFriendRequestButtons(currentUser) {
        const userResultsContainer = document.querySelector('.user-results');
        if (userResultsContainer) {
            userResultsContainer.addEventListener("click", (event) => {
                if (event.target && event.target.classList.contains("sendFriendRequestButton")) {
                    this.sendFriendRequest(event,currentUser);
                }
            });
        }
    }

    async sendFriendRequest(event,currentUser) {
        const toUser = event.target.dataset.username;
        const fromUser = currentUser;

        if (!toUser) {
            alert("Error: No username found.");
            return;
        }

        try {
            const response = await fetch("/M00971314/friends/request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    fromUser: fromUser,
                    toUser: toUser
                })
            });

            const data = await response.json();

            if (data.success) {
                alert("Friend request sent successfully.");
            } else {
                alert(data.message || "Failed to send friend request.");
            }
        } catch (error) {
            console.error("Error sending friend request:", error);
        }
    }

    async searchPosts(query, showResults) {
        try {
            const response = await fetch(`${this.basePath}/search/posts?query=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.success) {
                const postResults = data.posts
                    .map(
                        (post) => `
                        <div class="post-container">
                            <div class="post-username">${post.username}</div>
                            <p class="post-description">${post.description}</p>
                            <div class="post-content-container">
                                ${post.content ? `<p>${post.content}</p>` : ""}
                                ${post.media ? 
                                    (post.media.match(/\.(mp4|webm)$/i) 
                                        ? `<video controls src="/M00971314${post.media}"></video>` 
                                        : `<img src="/M00971314${post.media}" alt="Post media">`) 
                                    : ""}
                            </div>
                            <small class="post-timestamp">Posted on: ${new Date(post.timestamp).toLocaleString()}</small>
                        </div>`
                    )
                    .join("");
                showResults(`<div class="post-results">${postResults}</div>`);
            } else {
                showResults(`<p>No posts found.</p>`);
            }
        } catch (error) {
            console.error("Error searching for posts:", error);
        }
    }
}

