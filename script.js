const BASE_URL = "/api";
const IMAGE_URL = "https://image.tmdb.org/t/p/w500";

const searchInput = document.getElementById("searchInput");
const moviesContainer = document.getElementById("movies");
const modal = document.getElementById("movieModal");
const movieDetails = document.getElementById("movieDetails");
const sectionTitle = document.getElementById("sectionTitle");
const genreSelect = document.getElementById("genreSelect");
const genreChips = document.getElementById("genreChips");
const recommendedContainer = document.getElementById("recommendedMovies");

let genreList = [];
let selectedGenreIds = [];
const MAX_SELECTED_GENRES = 5;

searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        searchMovie();
    }
});

// ---------- Init ----------

document.addEventListener("DOMContentLoaded", () => {
    loadGenres();
    loadPopularMovies();
});

// ---------- Genres ----------

async function loadGenres() {
    try {
        const response = await fetch(`${BASE_URL}/genres`);
        const data = await response.json();
        genreList = data.genres || [];

        genreSelect.innerHTML = `<option value="">All Genres</option>`;
        genreList.forEach(genre => {
            const option = document.createElement("option");
            option.value = genre.id;
            option.textContent = genre.name;
            genreSelect.appendChild(option);
        });

        genreChips.innerHTML = "";
        genreList.forEach(genre => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "genre-chip";
            chip.textContent = genre.name;
            chip.dataset.id = genre.id;
            chip.addEventListener("click", () => toggleGenreChip(chip, genre.id));
            genreChips.appendChild(chip);
        });
    } catch (error) {
        console.error("Failed to load genres:", error);
    }
}

function toggleGenreChip(chip, genreId) {
    const isSelected = selectedGenreIds.includes(genreId);

    if (isSelected) {
        selectedGenreIds = selectedGenreIds.filter(id => id !== genreId);
        chip.classList.remove("selected");
        return;
    }

    if (selectedGenreIds.length >= MAX_SELECTED_GENRES) {
        return;
    }

    selectedGenreIds.push(genreId);
    chip.classList.add("selected");
}

// ---------- Browsing ----------

async function loadPopularMovies() {
    try {
        const response = await fetch(`${BASE_URL}/popular`);
        const data = await response.json();
        sectionTitle.textContent = "Popular Movies";
        displayMovies(data.results, moviesContainer);
    } catch (error) {
        console.error("Failed to load popular movies:", error);
    }
}

async function filterByGenre() {
    const genreId = genreSelect.value;

    if (genreId === "") {
        loadPopularMovies();
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/recommendations?genres=${genreId}&minRating=0`);
        const data = await response.json();

        const genreName = genreSelect.options[genreSelect.selectedIndex].text;
        sectionTitle.textContent = `${genreName} Movies`;
        displayMovies(data.results, moviesContainer);
    } catch (error) {
        console.error("Failed to filter by genre:", error);
    }
}

// ---------- Search ----------

async function searchMovie() {
    const query = searchInput.value.trim();

    if (query === "") {
        moviesContainer.innerHTML = `<p class="no-results">Please enter a movie name.</p>`;
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        sectionTitle.textContent = `Results for "${query}"`;
        displayMovies(data.results, moviesContainer);
    } catch (error) {
        console.error("Failed to search movies:", error);
    }
}

// ---------- Rendering ----------

function displayMovies(movies, container) {
    container.innerHTML = "";

    if (!movies || movies.length === 0) {
        container.innerHTML = `<p class="no-results">No movies found.</p>`;
        return;
    }

    movies.forEach(movie => {
        const poster = movie.poster_path
            ? `${IMAGE_URL}${movie.poster_path}`
            : "https://via.placeholder.com/500x750?text=No+Poster";

        container.innerHTML += `
            <div class="movie-card" onclick="openMovieDetails(${movie.id})">
                <div class="poster-wrapper">
                    <img src="${poster}" alt="${movie.title}">
                    <div class="rating">⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"}</div>
                </div>

                <div class="movie-info">
                    <h3>${movie.title}</h3>
                    <p>${movie.release_date ? movie.release_date.substring(0, 4) : "Unknown year"}</p>
                </div>
            </div>
        `;
    });
}

// ---------- Recommendation Engine ----------

async function getRecommendations() {
    if (selectedGenreIds.length === 0) {
        recommendedContainer.innerHTML = `<p class="no-results">Pick at least one genre above.</p>`;
        return;
    }

    const minRating = document.getElementById("minRating").value;
    recommendedContainer.innerHTML = `<p class="no-results">Finding recommendations...</p>`;

    try {
        const response = await fetch(
            `${BASE_URL}/recommendations?genres=${selectedGenreIds.join(',')}&minRating=${minRating}`
        );
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            recommendedContainer.innerHTML = `<p class="no-results">No matches at that rating — try lowering it.</p>`;
            return;
        }

        displayMovies(data.results, recommendedContainer);
    } catch (error) {
        console.error("Failed to build recommendations:", error);
        recommendedContainer.innerHTML = `<p class="no-results">Something went wrong. Please try again.</p>`;
    }
}

// ---------- Details Modal ----------

async function openMovieDetails(movieId) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${movieId}`);
        const { movie, reviews: reviewsData } = await response.json();

        const poster = movie.poster_path
            ? `${IMAGE_URL}${movie.poster_path}`
            : "https://via.placeholder.com/500x750?text=No+Poster";

        const genres = movie.genres ? movie.genres.map(genre => genre.name).join(", ") : "Unknown";

        let reviewsHTML = "";
        if (reviewsData.results && reviewsData.results.length > 0) {
            reviewsData.results.slice(0, 2).forEach(review => {
                reviewsHTML += `
                    <div class="review-box">
                        <h4>${review.author}</h4>
                        <p>${review.content.substring(0, 500)}...</p>
                    </div>
                `;
            });
        } else {
            reviewsHTML = `<div class="review-box"><p>No reviews available for this movie.</p></div>`;
        }

        movieDetails.innerHTML = `
            <div class="details-layout">
                <img src="${poster}" alt="${movie.title}">
                <div class="details-text">
                    <h2>${movie.title}</h2>
                    <div class="meta">
                        ⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"}
                        &nbsp; | &nbsp;
                        ${movie.release_date || "Unknown date"}
                        &nbsp; | &nbsp;
                        ${movie.runtime ? movie.runtime + " min" : "Runtime unknown"}
                    </div>
                    <p><strong>Genres:</strong> ${genres}</p>
                    <p>${movie.overview || "No overview available."}</p>
                    <h3>Reviews</h3>
                    ${reviewsHTML}
                </div>
            </div>
        `;

        modal.style.display = "flex";
    } catch (error) {
        console.error("Failed to open movie details:", error);
    }
}

function closeModal() {
    modal.style.display = "none";
}

window.onclick = function (event) {
    if (event.target === modal) {
        closeModal();
    }
};