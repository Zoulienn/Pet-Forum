export class Post {
    constructor(username) {
        this.username = username;
    }

    renderPosts(posts) {
        return posts.map(post => `
            <div class="post-container" data-post-id="${post._id}">
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
                <div class="post-actions">
                    <button class="like-button" data-post-id="${post._id}">Like (${post.likes || 0})</button>
                    <button class="comment-button" data-post-id="${post._id}">Comment</button>
                </div>
                <small class="post-timestamp">Posted on: ${new Date(post.timestamp).toLocaleString()}</small>
            </div>
        `).join("");
    }

    renderComments(postId, comments) {
        return `
            <div class="post-comments">
                ${comments.length > 0
                    ? comments.map(comment => `
                        <div class="comment-item">${comment.username}: ${comment.text}</div>
                    `).join("")
                    : "<p>No comments yet</p>"
                }
            </div>
            <div class="add-comment">
                <textarea class="comment-input" data-post-id="${postId}" placeholder="Write a comment..."></textarea>
                <button class="submit-comment" data-post-id="${postId}">Post</button>
            </div>
        `;
    }

    buttonEventListeners() {
        // Add Like button functionality
        document.querySelectorAll(".like-button").forEach(button => {
            button.addEventListener("click", async (event) => {
                const postId = event.target.dataset.postId;
                const response = await fetch(`/M00971314/posts/${postId}/like`, { method: "POST" });
                const result = await response.json();
                if (result.success) {
                    alert("Post liked!");
                    location.reload(); // Refresh the page
                } else {
                    alert(result.message || "Failed to like post.");
                }
            });
        });

        // Add Comment button functionality
        document.querySelectorAll(".comment-button").forEach(button => {
            button.addEventListener("click", async (event) => {
                const postId = event.target.dataset.postId;

                // Fetch comments for the selected post
                const response = await fetch(`/M00971314/posts/${postId}/comments`);
                const result = await response.json();

                if (result.success) {
                    const commentsHTML = this.renderComments(postId, result.comments);
                    document.getElementById("sideBar").innerHTML = commentsHTML;

                    // Add event listener for submit comment button
                    document.querySelector(`.submit-comment[data-post-id="${postId}"]`).addEventListener("click", async () => {
                        const input = document.querySelector(`.comment-input[data-post-id="${postId}"]`);
                        const commentText = input.value.trim();

                        if (!commentText) {
                            alert("Comment cannot be empty!");
                            return;
                        }

                        // Submit the comment
                        const response = await fetch(`/M00971314/posts/${postId}/comment`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({text: commentText })
                        });
                        const submitResult = await response.json();

                        if (submitResult.success) {
                            alert("Comment added successfully!");
                            location.reload(); // Refresh the page
                        } else {
                            alert(submitResult.message || "Failed to add comment.");
                        }
                    });
                } else {
                    alert(result.message || "Failed to load comments.");
                }
            });
        });
    }

    showPost(loadContent) {
        fetch('/M00971314/posts')
            .then(response => response.json())
            .then(posts => {
                const postsHTML = this.renderPosts(posts);
                loadContent(postsHTML);
                this.buttonEventListeners();
            });
    }

    createPost(loadContent) {
        const postForm = `
            <div class="post-form">
                <textarea id="post-description" placeholder="Write your thoughts here..."></textarea>
                <textarea id="post-content" placeholder="Additional content (text for now)..."></textarea>
                <input type="file" id="post-media" accept="image/*,video/*">
                <button id="submit-post">Post</button>
            </div>
        `;
        loadContent(postForm);
    
        document.getElementById("submit-post").addEventListener("click", async () => {
            const description = document.getElementById("post-description").value.trim();
            const content = document.getElementById("post-content").value.trim();
            const media = document.getElementById("post-media").files[0];
    
            if (!description && !content && !media) {
                alert("Post cannot be empty!");
                return;
            }
    
            const formData = new FormData();
            formData.append("username", this.username);
            formData.append("description", description);
            formData.append("content", content);
            if (media) {
                formData.append("media", media);
            }
    
            const response = await fetch('/M00971314/posts/create', {
                method: "POST",
                body: formData,
            });
    
            const result = await response.json();
            if (result.success) {
                alert("Post created successfully!");
                window.location.href = "#/Home"
            } else {
                alert(result.message || "Failed to create post.");
            }
        });
    }    
    
    showMyPost(loadContent) {
        fetch('/M00971314/myposts')
            .then(response => response.json())
            .then(posts => {
                const postsHTML = this.renderPosts(posts);
                loadContent(postsHTML);
            });
    }

    async showFriendPost(loadContent, name) {
        try {
            const response = await fetch(`/M00971314/friendposts?name=${encodeURIComponent(name)}`);
            const posts = await response.json();
            const postsHTML = this.renderPosts(posts);
            loadContent(postsHTML);
        } catch (error) {
            console.error('Error loading friend posts:', error);
        }
    }

}
