import { Account } from './account.js';
import { Profile } from './profile.js';
import { Post } from './post.js';
import { Search } from "./search.js";
import { ViewFriends } from './viewfriends.js';

const account = new Account();
const profile = new Profile();
const search = new Search();
const viewfriends = new ViewFriends();

let currentUser;
let currentPage = 1;  // Keep track of the current page
let loading = false;  // Flag to prevent multiple simultaneous requests


document.addEventListener("DOMContentLoaded", async () => {
    currentUser = await account.checkSession(profile);
    navigateTo(window.location.hash);
});

window.addEventListener("hashchange", async () => {
    currentUser = await account.checkSession(profile);
    navigateTo(window.location.hash);
});

// Main navigation function
function navigateTo(hash) {
    switch (hash) {
        case "#/Home":
            loadHomePage();
            break;
        case "#/Explore":
            loadExplorePage();
            break;
        case "#/ForYou":
            loadForYouPage();
            break;
        case "#/Book":
            loadBookPage();
            break;
        case "#/User":
            loadUserPage();
            break;
        case "#/Profile":
            loadUserPage();
            break;
        case "#/createpost":
            loadPost();
            break;
        case "#/search":
            loadSearch();
            break;
        default:
            window.location.hash = '#/User';
            loadUserPage();
            break;
    }
}

// Function to load content
function loadContent(content) {
    const contentDiv = document.getElementById("content");
    contentDiv.innerHTML = content;

    //keep sideBar empty when not using
    const sideBarContent = document.getElementById("sideBar");
    sideBarContent.innerHTML = ``;
}

async function loadUserPage() {
    const response = await fetch('/M00971314/session');
    const data = await response.json();

    if (data.loggedIn) {
        window.location.hash = "#/Profile";
        profile.render(loadContent, currentUser);
    } else {
        account.render(loadContent);
        account.register();
        account.login();
    }
}

async function loadHomePage() {
    const homeContent = `
        <div class="page home">
            <div id="posts-section"></div>
        </div>`;
    loadContent(homeContent);

    // Retrieve posts and render them using the Post class
    const post = new Post();
    post.showPost((postContent) => {
        const postsSection = document.getElementById("posts-section");
        postsSection.innerHTML = postContent;
    });

    const PostButton = document.getElementById('post-button');
        if (PostButton) {
            PostButton.addEventListener('click', () => {
                window.location.hash="#/createpost";
                loadPost();
            });
        }

    const SearchButton = document.getElementById('search-button');
        if (SearchButton) {
            SearchButton.addEventListener('click', () => {
                window.location.hash = "#/search";
                loadSearch();
            });
    }


}

function loadPost() {
    // Retrieve current username for post creation
    fetch('/M00971314/session')
    .then((response) => response.json())
    .then((data) => {
                if (data.loggedIn) {
                    const post = new Post(data.username);
                    post.createPost(loadContent);
                } else {
                    alert("You must be logged in to create a post.");
                    navigateTo("#/Home");
                }
            });
}

async function loadSearch() {
    const searchItem = document.getElementById('search').value.trim();
    const sideBarContent = document.getElementById("sideBar");
    
    if (searchItem) {
        // Perform user search
        let searchPostResults = ``;
        let searchUserResults = ``;

        await search.searchUsers(searchItem, (userResults) => {
            searchUserResults += userResults;
        });

        // Perform post search
        await search.searchPosts(searchItem, (postResults) => {
            searchPostResults += postResults;
        });

        // Update content with post results
        loadContent(searchPostResults);
        // update side bar with user results
        sideBarContent.innerHTML = searchUserResults;
        search.setupFriendRequestButtons(currentUser);
        setupViewFriendButton();

    } else {
        alert("Please enter a search query.");
        navigateTo("#/Home");
    }
}

async function loadExplorePage() {
    const exploreContent = `
        <div class="page explore">
            <h2>Explore Pets</h2>
            <div id="explore-pets-section">
                <div id="pet-gallery" class="gallery"></div>
            </div>
        </div>`;
    loadContent(exploreContent);

    // Initially load the first page of pets
    await loadPets(currentPage);

    // Listen for the scroll event to trigger loading more pets
    window.addEventListener('scroll', handleScroll);
}

async function loadPets(page) {
    if (loading) return; // Prevent loading if we're already fetching data
    loading = true;  // Set the loading flag to true

    try {
        const response = await fetch(`/M00971314/explore/pets?page=${page}`);
        const pets = await response.json();

        if (pets && pets.length > 0) {
            const gallery = document.getElementById('pet-gallery');
            pets.forEach((pet) => {
                const petCard = document.createElement('div');
                petCard.className = 'pet-card';
                petCard.innerHTML = `
                    <p class="pet-breed"><strong>Breed:</strong> ${pet.breedName}</p>
                    <p class="pet-temperament"><strong>Temperament:</strong> ${pet.temperament}</p>
                    <p class="pet-lifespan"><strong>Lifespan:</strong> ${pet.lifespan}</p>
                    <img src="${pet.imageUrl}" alt="Cute ${pet.type === 'dog' ? 'Dog' : 'Cat'}" class="pet-image">
                `;
                gallery.appendChild(petCard);
            });
            currentPage++;  // Increment the page after successful load
        } else {
            console.log("No more pets to load.");
        }
    } catch (error) {
        console.error('Error fetching pet data:', error);
    } finally {
        loading = false;  // Set the loading flag back to false
    }
}
// Function to handle scroll events and trigger data loading
function handleScroll() {
    // Check if the user has scrolled to the bottom of the page
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200) {
        // Load more pets if we're not already loading
        if (!loading) {
            loadPets(currentPage);
        }
    }
}

// function to load posts for each type of animals using api
async function loadForYouPage() {
    const forYouContent = `
        <div class="page for-you">
            <h2>Recommendations</h2>
            <div class="content-options">
                <button class="toggle-btn" id="cat-toggle">Cat</button>
                <button class="toggle-btn" id="dog-toggle">Dog</button>
            </div>
            <div id="for-you-content" class="content-display">
                <!-- Dynamic content will be inserted here -->
            </div>
        </div>`;
    
    loadContent(forYouContent);

    // Initially load recommendations for both cats and dogs
    loadRecommendations("Cat");
    loadRecommendations("Dog");

    // Set up event listeners for the toggle buttons
    document.getElementById('cat-toggle').addEventListener('click', () => {
        loadRecommendations("Cat");
    });

    document.getElementById('dog-toggle').addEventListener('click', () => {
        loadRecommendations("Dog");
    });
}

// Function to load pet recommendations based on the type (Cat/Dog)
async function loadRecommendations(petType) {
    const contentDiv = document.getElementById('for-you-content');
    contentDiv.innerHTML = `<p>Loading ${petType} recommendations...</p>`; // Show loading message

    try {
        const response = await fetch(`/M00971314/forYou/pets?petType=${petType}`);
        const pets = await response.json();

        if (pets && pets.length > 0) {
            contentDiv.innerHTML = ''; // Clear loading message

            pets.forEach((pet) => {
                const petCard = document.createElement('div');
                petCard.className = 'pet-card';
                petCard.innerHTML = `
                    <p class="pet-breed"><strong>Breed:</strong> ${pet.breedName}</p>
                    <p class="pet-temperament"><strong>Temperament:</strong> ${pet.temperament}</p>
                    <p class="pet-lifespan"><strong>Lifespan:</strong> ${pet.lifespan}</p>
                    <img src="${pet.imageUrl}" alt="${pet.type === 'dog' ? 'Dog' : 'Cat'}" class="pet-image">
                `;
                contentDiv.appendChild(petCard);
            });
        } else {
            contentDiv.innerHTML = `<p>No recommendations found for ${petType}.</p>`;
        }
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        contentDiv.innerHTML = `<p>There was an error loading ${petType} recommendations.</p>`;
    }
}

//view friend/people profiles
function setupViewFriendButton(){
    const userResultsContainer = document.querySelector('.user-results');
    if (userResultsContainer) {
        userResultsContainer.addEventListener("click", (event) => {
            if (event.target && event.target.classList.contains("viewFriendButton")) {
                viewfriends.render(loadContent, event.target.dataset.username);
            }
        });
    }
}

async function loadBookPage() {
    try {
        // Fetch data from the server
        const response = await fetch('/M00971314/news');
        if (!response.ok) throw new Error('Failed to fetch news.');

        const { success, data } = await response.json();
        if (!success) throw new Error('Error in fetched news data.');

        // Map the fetched data into HTML content
        const newsContent = data.map((item) => `
            <div class="book-news-item">
                <h3>${item.title}</h3>
                <p><strong>Price:</strong> ${item.price}</p>
                <p><strong>Availability:</strong> ${item.availability}</p>
            </div>
        `).join('');

        // Load the content into the page
        loadContent(`
            <div class="book-news-container">${newsContent}</div>
        `);
    } catch (error) {
        console.error('Error loading news page:', error);
        loadContent('<p>Failed to load news. Please try again later.</p>');
    }
}







