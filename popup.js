document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const setupPage = document.getElementById("setup-page");
  const searchPage = document.getElementById("search-page");
  const ottSelectionPage = document.getElementById("ott-selection-page");
  const resultsPage = document.getElementById("results-page");
  const movieDetailPage = document.getElementById("movie-detail-page");
  const recommendationPage = document.getElementById("recommendation-page");

  const geminiKeyInput = document.getElementById("gemini-key");
  const rapidApiKeyInput = document.getElementById("rapidapi-key");
  const saveKeysBtn = document.getElementById("save-keys");
  const resetKeysBtn = document.getElementById("reset-keys");
  const testRapidApiBtn = document.getElementById("test-rapidapi");
  const testResultBox = document.getElementById("test-result");

  const moviePromptInput = document.getElementById("movie-prompt");
  const getRecommendationsBtn = document.getElementById("get-recommendations");
  const loadMoreMoviesBtn = document.getElementById("load-more-movies");
  const loading = document.getElementById("loading");

  const ottPlatformList = document.getElementById("ott-platform-list");
  const filterMoviesBtn = document.getElementById("filter-movies-btn");
  const platformAvailability = document.getElementById("platform-availability");

  const movieResultsContainer = document.getElementById("movie-results");
  const movieDetailContainer = document.getElementById(
    "movie-detail-container"
  );
  const streamingLinksContainer = document.getElementById("streaming-links");
  const trailerContainer = document.getElementById("trailer-container");
  const watchTrailerBtn = document.getElementById("watch-trailer-btn");
  const backToResultsBtn = document.getElementById("back-to-results");

  const finalRecommendationContainer = document.getElementById(
    "final-recommendation"
  );
  const newSearchBtn = document.getElementById("new-search");
  const conversationHistory = document.getElementById("conversation-history");
  const followUpInput = document.getElementById("follow-up-input");
  const sendFollowUpBtn = document.getElementById("send-follow-up");

  // Add platform test elements
  const platformTestResult = document.createElement("div");
  platformTestResult.id = "platform-test-result";
  platformTestResult.className = "result-box hidden";

  // Add movie search test elements
  const testMovieSearchBtn = document.createElement("button");
  testMovieSearchBtn.id = "test-movie-search";
  testMovieSearchBtn.className = "secondary-btn";
  testMovieSearchBtn.textContent = "Test Movie Search API";
  testMovieSearchBtn.style.marginTop = "10px";

  const movieSearchTestResult = document.createElement("div");
  movieSearchTestResult.id = "movie-search-test-result";
  movieSearchTestResult.className = "result-box hidden";

  // Insert platform test elements after the test-result element
  if (testResultBox && testResultBox.parentNode) {
    testResultBox.parentNode.insertBefore(
      platformTestResult,
      testResultBox.nextSibling
    );

    // Insert movie search test elements
    testResultBox.parentNode.insertBefore(
      testMovieSearchBtn,
      platformTestResult.nextSibling
    );
    testResultBox.parentNode.insertBefore(
      movieSearchTestResult,
      testMovieSearchBtn.nextSibling
    );
  }

  // Application state
  let state = {
    geminiKey: "",
    rapidApiKey: "",
    selectedMovie: null,
    availablePlatforms: [],
    userPlatforms: [],
    userPlatformIds: [], // Store platform IDs/values for API matching
    conversation: [],
    movies: [],
    allMovies: [], // Store all movies before filtering
    currentMovieDetail: null,
    currentPage: 1,
  };

  // Check if API keys are already stored
  chrome.storage.sync.get(["geminiKey", "rapidApiKey"], (result) => {
    if (result.geminiKey && result.rapidApiKey) {
      state.geminiKey = result.geminiKey;
      state.rapidApiKey = result.rapidApiKey;
      showPage(searchPage);
    } else {
      showPage(setupPage);
    }
  });

  // Event listeners
  saveKeysBtn.addEventListener("click", saveApiKeys);
  resetKeysBtn.addEventListener("click", resetApiKeys);
  getRecommendationsBtn.addEventListener("click", startMovieRecommendationFlow);
  filterMoviesBtn.addEventListener("click", filterMoviesByPlatforms);
  loadMoreMoviesBtn.addEventListener("click", showMoreMovieOptions);
  backToResultsBtn.addEventListener("click", () => showPage(resultsPage));
  watchTrailerBtn.addEventListener("click", playMovieTrailer);
  newSearchBtn.addEventListener("click", startNewSearch);
  testRapidApiBtn.addEventListener("click", testRapidApiKey);
  testMovieSearchBtn.addEventListener("click", testMovieSearchApi);
  if (sendFollowUpBtn) {
    sendFollowUpBtn.addEventListener("click", sendFollowUpQuestion);
  }

  // Functions
  function showPage(pageToShow) {
    // Hide all pages
    setupPage.classList.add("hidden");
    searchPage.classList.add("hidden");
    ottSelectionPage.classList.add("hidden");
    resultsPage.classList.add("hidden");
    movieDetailPage.classList.add("hidden");
    recommendationPage.classList.add("hidden");

    // Show the requested page
    pageToShow.classList.remove("hidden");
  }

  function saveApiKeys() {
    const geminiKey = geminiKeyInput.value.trim();
    const rapidApiKey = rapidApiKeyInput.value.trim();

    if (!geminiKey || !rapidApiKey) {
      alert("Please enter both API keys");
      return;
    }

    // Save keys to Chrome storage
    chrome.storage.sync.set(
      {
        geminiKey,
        rapidApiKey,
      },
      () => {
        state.geminiKey = geminiKey;
        state.rapidApiKey = rapidApiKey;
        showPage(searchPage);
      }
    );
  }

  function resetApiKeys() {
    chrome.storage.sync.remove(["geminiKey", "rapidApiKey"], () => {
      geminiKeyInput.value = "";
      rapidApiKeyInput.value = "";
      state.geminiKey = "";
      state.rapidApiKey = "";
      showPage(setupPage);
    });
  }

  // New function to start the movie recommendation flow
  async function startMovieRecommendationFlow() {
    const prompt = moviePromptInput.value.trim();

    if (!prompt) {
      alert("Please enter what kind of movie you would like to watch");
      return;
    }

    try {
      showLoading(true);

      // Add user prompt to conversation
      state.conversation.push({
        role: "user",
        content: prompt,
      });

      try {
        // Instead of fetching platforms, use hardcoded ones
        // Skip API call for available OTT platforms
        const hardcodedPlatforms = [
          { id: "netflix", name: "Netflix", shortName: "netflix" },
          { id: "prime", name: "Amazon Prime", shortName: "prime" },
          { id: "hotstar", name: "Hotstar", shortName: "hotstar" },
          { id: "sonyliv", name: "SonyLiv", shortName: "sonyliv" },
        ];

        // Set platforms in state
        state.availablePlatforms = hardcodedPlatforms;

        // Display platform selection
        displayPlatformOptions(state.availablePlatforms);
        showPage(ottSelectionPage);

        // Add assistant response to conversation
        state.conversation.push({
          role: "assistant",
          content:
            "Please select your streaming platforms so I can find movies available to you.",
        });
      } catch (platformError) {
        // This catch block would rarely be triggered now, but keeping for safety
        console.error("Platform setup error:", platformError);

        // Show a more helpful error message
        const errorMessage = `
          Error: ${platformError.message}\n
          There was an unexpected error setting up the platform selection.
        `;

        throw new Error(errorMessage);
      }
    } catch (error) {
      // Show a more detailed error message, potentially with the debug button
      alert(`${error.message}`);

      // Reset state since we failed
      state.conversation.pop(); // Remove the user prompt since we couldn't proceed

      // Go back to search page
      showPage(searchPage);
    } finally {
      showLoading(false);
    }
  }

  // Function to display OTT platform options for selection
  function displayPlatformOptions(platforms) {
    ottPlatformList.innerHTML = "";

    // Create container for OTT icons
    const iconsContainer = document.createElement("div");
    iconsContainer.className = "ott-icons-container";

    // Define platform icon URLs - using placeholder SVGs with platform colors
    const platformIcons = {
      netflix:
        "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/netflix.svg",
      prime:
        "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/amazon-prime-video.svg",
      hotstar:
        "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/hotstar.svg",
      sonyliv:
        "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/sony-liv.svg",
      // Default fallback icon
      default: "https://cdn-icons-png.flaticon.com/512/3502/3502477.png",
    };

    platforms.forEach((platform) => {
      // Handle both the old format (id, name) and new format (label, value, short)
      const platformId = platform.id || platform.value || platform.short;
      const platformName = platform.name || platform.label;

      // Create platform icon element
      const iconElement = document.createElement("div");
      iconElement.className = "ott-icon";
      iconElement.dataset.platformId = platformId;
      iconElement.dataset.platformName = platformName;

      // Determine icon URL
      const iconUrl =
        platformIcons[platformId.toLowerCase()] || platformIcons.default;

      // Set inner HTML with icon and name
      iconElement.innerHTML = `
        <img src="${iconUrl}" alt="${platformName}">
        <span>${platformName}</span>
      `;

      // Add click handler to toggle selection
      iconElement.addEventListener("click", () => {
        iconElement.classList.toggle("selected");
      });

      // Add to container
      iconsContainer.appendChild(iconElement);
    });

    // Add the icons container to the platform list
    ottPlatformList.appendChild(iconsContainer);
  }

  // Function to filter movies based on selected platforms
  async function filterMoviesByPlatforms() {
    // Get selected platforms (now using the icon elements with 'selected' class)
    const selectedIcons = document.querySelectorAll(".ott-icon.selected");

    if (selectedIcons.length === 0) {
      alert("Please select at least one streaming platform");
      return;
    }

    // Get both platform display names and underlying values
    const platformNames = Array.from(selectedIcons).map(
      (icon) => icon.dataset.platformName
    );
    const platformValues = Array.from(selectedIcons).map(
      (icon) => icon.dataset.platformId
    );

    // Store user's platform names for display
    state.userPlatforms = platformNames;

    // Store platform values for API matching
    state.userPlatformIds = platformValues;

    console.log("Selected platforms:", state.userPlatforms);
    console.log("Platform IDs for API:", state.userPlatformIds);

    try {
      // Add loading state to the filter button
      filterMoviesBtn.disabled = true;
      filterMoviesBtn.classList.add("btn-loading");
      filterMoviesBtn.innerText = "Fetching Movies...";

      // Create a spinner element in the OTT selection page for visibility
      const spinnerContainer = document.createElement("div");
      spinnerContainer.id = "ott-selection-spinner";
      spinnerContainer.innerHTML =
        '<div class="spinner"></div><p>Searching for movies on your platforms...</p>';
      spinnerContainer.style.textAlign = "center";
      spinnerContainer.style.margin = "20px 0";

      // Add it after the platform list
      ottPlatformList.parentNode.insertBefore(
        spinnerContainer,
        ottPlatformList.nextSibling
      );

      // Add to conversation
      state.conversation.push({
        role: "user",
        content: `I have access to these platforms: ${state.userPlatforms.join(
          ", "
        )}. Find me some good movies.`,
      });

      // Now that we have platforms, search for movies based on the original prompt
      const prompt = moviePromptInput.value.trim();
      console.log("Searching for movies with prompt:", prompt);

      try {
        // Call to background script to search for movies
        console.log("Calling searchMovies in background script");
        const searchResponse = await sendMessageToBackground({
          action: "searchMovies",
          prompt,
          rapidApiKey: state.rapidApiKey,
        });

        if (!searchResponse.success) {
          console.error("Movie search failed:", searchResponse.error);

          // Create a no-results container if it doesn't exist
          let noResultsContainer = document.getElementById(
            "no-results-container"
          );
          if (!noResultsContainer) {
            noResultsContainer = document.createElement("div");
            noResultsContainer.id = "no-results-container";
            noResultsContainer.className = "no-results-box";
            document
              .querySelector(".container")
              .appendChild(noResultsContainer);
          }

          // Show the no-results message with retry options
          noResultsContainer.innerHTML = `
            <h3>No Movies Found</h3>
            <p>${
              searchResponse.error || "No movies matched your search criteria."
            }</p>
            <div class="no-results-actions">
              <button id="try-different-search" class="primary-btn">Try Different Search</button>
              <button id="skip-ott-filter" class="secondary-btn">Skip OTT Filtering</button>
            </div>
          `;

          noResultsContainer.classList.remove("hidden");

          // Add event listeners for the retry buttons
          document
            .getElementById("try-different-search")
            .addEventListener("click", () => {
              noResultsContainer.classList.add("hidden");
              showPage(searchPage);
            });

          document
            .getElementById("skip-ott-filter")
            .addEventListener("click", () => {
              noResultsContainer.classList.add("hidden");
              // Call directly to the movie search API without filtering by OTT platforms
              tryGenericMovieSearch();
            });

          // Add a more helpful message to conversation
          state.conversation.push({
            role: "assistant",
            content:
              "I couldn't find any movies matching your criteria on your selected platforms. You can try a different search or browse popular movies instead.",
          });

          throw new Error(
            searchResponse.error ||
              "Failed to search for movies. Please try again with different criteria."
          );
        }

        state.allMovies = searchResponse.movies;

        if (state.allMovies.length === 0) {
          throw new Error(
            "No movies found matching your criteria. Please try again with different parameters."
          );
        }

        console.log(
          `Found ${state.allMovies.length} movies, now filtering by platforms`
        );

        // Now filter these movies by the selected platforms
        const filterResponse = await sendMessageToBackground({
          action: "filterMoviesByPlatform",
          movies: state.allMovies,
          platforms: state.userPlatformIds, // Use IDs/values for filtering
          rapidApiKey: state.rapidApiKey,
        });

        if (!filterResponse.success) {
          console.error("Movie filtering failed:", filterResponse.error);
          throw new Error(
            filterResponse.error ||
              "Failed to filter movies by platform. Please try again."
          );
        }

        state.movies = filterResponse.movies;
        console.log(
          `After filtering, displaying ${state.movies.length} movies`
        );

        // Show availability indicator if we have matches
        if (filterResponse.hasMatches) {
          platformAvailability.classList.remove("hidden");
        } else {
          platformAvailability.classList.add("hidden");
          // Since we only fetch 3 movies now, hide the load more button by default
          loadMoreMoviesBtn.classList.add("hidden");
        }

        // Display movie results
        displayMovieResults(state.movies);
        showPage(resultsPage);

        // Add assistant response to conversation
        state.conversation.push({
          role: "assistant",
          content: filterResponse.hasMatches
            ? `I found ${state.movies.length} movies that match your request and are available on your platforms. Please select one to see more details.`
            : `I couldn't find movies specifically on your platforms, but here are some recommendations based on your preferences. You can select one to view details.`,
        });
      } catch (searchError) {
        console.error("Error during movie search/filtering:", searchError);
        throw searchError;
      }
    } catch (error) {
      console.error("Overall error in filterMoviesByPlatforms:", error);

      let errorMessage = error.message;
      // Add more helpful context if it's a generic error
      if (
        errorMessage.includes("Failed to search for movies") &&
        !errorMessage.includes("status")
      ) {
        errorMessage +=
          "\n\nThis could be due to:\n" +
          "- An issue with your RapidAPI key or subscription\n" +
          "- The movie search service being temporarily unavailable\n" +
          "- Network connectivity issues\n\n" +
          "Please try testing your API key on the setup page.";
      }

      // Only show alert if we didn't already show the no-results UI
      if (
        !document.getElementById("no-results-container") ||
        document
          .getElementById("no-results-container")
          .classList.contains("hidden")
      ) {
        alert(errorMessage);
      }
    } finally {
      // Remove the spinner if it exists
      const spinner = document.getElementById("ott-selection-spinner");
      if (spinner) {
        spinner.remove();
      }

      // Reset the filter button
      filterMoviesBtn.disabled = false;
      filterMoviesBtn.classList.remove("btn-loading");
      filterMoviesBtn.innerText = "Find Movies on Your Platforms";

      // Remove the general loading indicator in case it was shown
      showLoading(false);
    }
  }

  // Function to try a generic movie search without OTT filtering
  async function tryGenericMovieSearch() {
    try {
      showLoading(true);

      // Call to background script for a generic movie search
      const searchResponse = await sendMessageToBackground({
        action: "searchMovies",
        prompt: "popular movies with high ratings",
        rapidApiKey: state.rapidApiKey,
      });

      if (!searchResponse.success) {
        throw new Error(searchResponse.error || "Failed to find any movies.");
      }

      state.allMovies = searchResponse.movies;
      state.movies = state.allMovies; // Now we're only getting 3 movies from the API

      // Hide platform availability indicator
      platformAvailability.classList.add("hidden");

      // Hide the "load more" button since we only get 3 movies now
      loadMoreMoviesBtn.classList.add("hidden");

      // Display movie results
      displayMovieResults(state.movies);
      showPage(resultsPage);

      // Add assistant response to conversation
      state.conversation.push({
        role: "assistant",
        content:
          "Here are some popular movies you might enjoy. These recommendations aren't filtered by your streaming platforms.",
      });
    } catch (error) {
      console.error("Error in generic movie search:", error);
      alert("Failed to find movies: " + error.message);
    } finally {
      showLoading(false);
    }
  }

  // Function to show more movie options
  function showMoreMovieOptions() {
    // Get the next batch of movies
    const startIndex = state.currentPage * 3;
    const nextMovies = state.allMovies.slice(startIndex, startIndex + 3);

    if (nextMovies.length === 0) {
      alert("No more movies available");
      return;
    }

    state.currentPage++;

    // Display these additional movies
    displayAdditionalMovies(nextMovies);

    // Hide the button if we're at the end
    if (startIndex + 3 >= state.allMovies.length) {
      loadMoreMoviesBtn.classList.add("hidden");
    }
  }

  // Function to display movie results
  function displayMovieResults(movies) {
    movieResultsContainer.innerHTML = "";

    movies.forEach((movie) => {
      const movieCard = createMovieCard(movie);
      movieResultsContainer.appendChild(movieCard);
    });
  }

  // Function to add more movies to the existing list
  function displayAdditionalMovies(movies) {
    movies.forEach((movie) => {
      const movieCard = createMovieCard(movie);
      movieResultsContainer.appendChild(movieCard);
    });
  }

  // Function to create a movie card
  function createMovieCard(movie) {
    const movieCard = document.createElement("div");
    movieCard.className = "movie-card";
    movieCard.dataset.id = movie.imdbid;

    // Define platform icon URLs - same as in displayPlatformOptions
    const platformIcons = {
      netflix:
        "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/netflix.svg",
      prime:
        "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/amazon-prime-video.svg",
      hotstar:
        "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/hotstar.svg",
      sonyliv:
        "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/sony-liv.svg",
      // Default fallback icon
      default: "https://cdn-icons-png.flaticon.com/512/3502/3502477.png",
    };

    // Check if this movie is available on user's platforms
    const availablePlatforms = [];
    const platformDetails = [];

    if (movie.streamingInfo) {
      // We need to check both by platform name and ID/value since the streaming info
      // might use different keys than what we get from the platform API
      for (let i = 0; i < state.userPlatforms.length; i++) {
        const platformName = state.userPlatforms[i];
        const platformId = state.userPlatformIds[i];

        // Try all variants - lowercase, original case, etc.
        const variants = [
          platformName.toLowerCase(),
          platformId.toLowerCase(),
          platformName,
          platformId,
        ];

        for (const variant of variants) {
          if (movie.streamingInfo[variant]) {
            if (!availablePlatforms.includes(platformName)) {
              availablePlatforms.push(platformName);
              platformDetails.push({
                name: platformName,
                id: platformId,
                data: movie.streamingInfo[variant],
              });
            }
            break;
          }
        }
      }
    }

    // Create platform icons HTML
    let platformsHtml = "";
    if (availablePlatforms.length > 0) {
      platformsHtml = '<div class="ott-badges">';
      for (const platform of platformDetails) {
        const iconUrl =
          platformIcons[platform.id.toLowerCase()] || platformIcons.default;
        platformsHtml += `
          <div class="ott-badge" title="Available on ${platform.name}">
            <img src="${iconUrl}" alt="${platform.name}">
          </div>
        `;
      }
      platformsHtml += "</div>";
    }

    movieCard.innerHTML = `
      <h3>${movie.title}</h3>
      <p>${movie.released} | ${movie.genre}</p>
      <p class="imdb">IMDb: ${movie.imdbrating}</p>
      <p>${movie.synopsis?.substring(0, 100) || ""}...</p>
      ${platformsHtml}
    `;

    movieCard.addEventListener("click", () => {
      state.selectedMovie = movie;
      getMovieDetails(movie.imdbid);
    });

    return movieCard;
  }

  // Function to get detailed information about a movie
  async function getMovieDetails(imdbId) {
    try {
      showLoading(true);

      // Get detailed movie information
      const response = await sendMessageToBackground({
        action: "getMovieDetails",
        movieId: imdbId,
        rapidApiKey: state.rapidApiKey,
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      state.currentMovieDetail = response.details;

      // Add to conversation
      state.conversation.push({
        role: "user",
        content: `I'm interested in watching "${state.selectedMovie.title}".`,
      });

      // Display movie details
      displayMovieDetailView(state.currentMovieDetail);
      showPage(movieDetailPage);

      // Get trailer information
      getMovieTrailer(state.selectedMovie.title, state.selectedMovie.released);
    } catch (error) {
      alert(error.message);
    } finally {
      showLoading(false);
    }
  }

  // Function to display detailed movie view
  function displayMovieDetailView(movieDetail) {
    // Define platform icon URLs - same as in other functions
    const platformIcons = {
      netflix:
        "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/netflix.svg",
      prime:
        "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/amazon-prime-video.svg",
      hotstar:
        "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/hotstar.svg",
      sonyliv:
        "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/sony-liv.svg",
      // Default fallback icon
      default: "https://cdn-icons-png.flaticon.com/512/3502/3502477.png",
    };

    // Clear streaming links container
    streamingLinksContainer.innerHTML = "";
    streamingLinksContainer.className = "movie-streaming-links";

    // Create a container for the streaming links
    const streamingInfo = movieDetail.streamingAvailability || {};

    // Filter available links to user's platforms
    const userStreamingPlatforms = [];

    // We need to check streaming info using both platform names and IDs
    for (let i = 0; i < state.userPlatforms.length; i++) {
      const platformName = state.userPlatforms[i];
      const platformId = state.userPlatformIds[i];

      // Try all variants of the platform identifier
      const variants = [
        platformName.toLowerCase(),
        platformId.toLowerCase(),
        platformName,
        platformId,
      ];

      // Find the first variant that matches
      let matchedVariant = null;
      let platformData = null;

      for (const variant of variants) {
        if (streamingInfo[variant]) {
          matchedVariant = variant;
          platformData = streamingInfo[variant];
          break;
        }
      }

      if (platformData) {
        const iconUrl =
          platformIcons[platformId.toLowerCase()] || platformIcons.default;

        const link = document.createElement("a");
        link.href = platformData.url;
        link.className = "movie-streaming-link";
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        link.innerHTML = `
          <img src="${iconUrl}" alt="${platformName}">
          <span>${platformName}</span>
        `;

        streamingLinksContainer.appendChild(link);
        userStreamingPlatforms.push(platformName);
      }
    }

    // Add heading for streaming options if any are available
    if (userStreamingPlatforms.length > 0) {
      const streamingHeader = document.createElement("h4");
      streamingHeader.textContent = "Watch Now:";
      streamingHeader.style.marginBottom = "10px";
      streamingLinksContainer.prepend(streamingHeader);
    }

    // Prepare movie poster if available
    let posterHtml = "";
    if (movieDetail.imageurl && movieDetail.imageurl.length > 0) {
      posterHtml = `<img src="${movieDetail.imageurl[0]}" alt="${movieDetail.title}" class="movie-poster">`;
    }

    // Build the movie detail view
    const movieHTML = `
      ${posterHtml}
      <div class="movie-info-header">
        <h3>${movieDetail.title}</h3>
        <div class="meta">
          <span>${movieDetail.released}</span>
          <span>${movieDetail.genre}</span>
          <span class="rating">IMDb: ${movieDetail.imdbrating}</span>
        </div>
      </div>
      
      <div class="movie-info-section">
        <h4>Synopsis</h4>
        <p>${movieDetail.synopsis || "No synopsis available."}</p>
      </div>
      
      <div class="movie-info-section">
        <h4>Cast</h4>
        <p>${movieDetail.cast || "Cast information not available."}</p>
      </div>
      
      <div class="movie-info-section">
        <h4>Director</h4>
        <p>${movieDetail.director || "Director information not available."}</p>
      </div>
    `;

    movieDetailContainer.innerHTML = movieHTML;

    // Show trailer container and make trailer button visible by default
    trailerContainer.classList.remove("hidden");
    watchTrailerBtn.textContent = "Watch Trailer";
    watchTrailerBtn.disabled = false;

    // Add streaming availability notice to conversation
    let availabilityMessage = "";
    if (userStreamingPlatforms.length > 0) {
      availabilityMessage = `Good news! "${
        movieDetail.title
      }" is available on your subscribed platforms: ${userStreamingPlatforms.join(
        ", "
      )}.`;
    } else {
      availabilityMessage = `"${movieDetail.title}" is not available on any of your selected streaming platforms.`;
    }

    state.conversation.push({
      role: "assistant",
      content: `${availabilityMessage} Here's some information about the movie:\n\n- Released: ${
        movieDetail.released
      }\n- Genre: ${movieDetail.genre}\n- IMDb Rating: ${
        movieDetail.imdbrating
      }\n\n${
        movieDetail.synopsis || "No synopsis available."
      }\n\nDo you want to know more about this movie?`,
    });
  }

  // Function to play movie trailer directly in the UI
  async function playMovieTrailer() {
    try {
      // Disable the button and show loading state
      watchTrailerBtn.disabled = true;
      watchTrailerBtn.textContent = "Loading Trailer...";
      watchTrailerBtn.classList.add("btn-loading");

      if (!state.trailerData) {
        // If we don't have trailer data yet, fetch it
        await getMovieTrailer(
          state.selectedMovie.title,
          state.selectedMovie.released
        );
      }

      // If we have trailer data with a YouTube URL
      if (state.trailerData && state.trailerData.url) {
        // Fix the YouTube URL for proper embedding
        let trailerUrl = state.trailerData.url;

        // Check if it's a YouTube URL
        if (
          trailerUrl.includes("youtube.com") ||
          trailerUrl.includes("youtu.be")
        ) {
          // Format for embedding - handle different URL formats
          if (trailerUrl.includes("watch?v=")) {
            // Convert from watch URL to embed URL
            const videoId = trailerUrl.split("watch?v=")[1].split("&")[0];
            trailerUrl = `https://www.youtube.com/embed/${videoId}`;
          } else if (trailerUrl.includes("youtu.be/")) {
            // Convert from shortened URL to embed URL
            const videoId = trailerUrl.split("youtu.be/")[1].split("?")[0];
            trailerUrl = `https://www.youtube.com/embed/${videoId}`;
          } else if (!trailerUrl.includes("/embed/")) {
            // If it's not already an embed URL but some other format
            console.warn("Unrecognized YouTube URL format:", trailerUrl);
            // Try to extract video ID with regex
            const videoIdMatch = trailerUrl.match(
              /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
            );
            if (videoIdMatch && videoIdMatch[1]) {
              trailerUrl = `https://www.youtube.com/embed/${videoIdMatch[1]}`;
            }
          }
        }

        console.log("Using trailer URL:", trailerUrl);

        // Create a container for the trailer
        const trailerEmbedContainer = document.createElement("div");
        trailerEmbedContainer.className = "trailer-container";

        // Create the iframe for the YouTube embed
        trailerEmbedContainer.innerHTML = `
          <iframe
            width="100%"
            height="200"
            src="${trailerUrl}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
          </iframe>
        `;

        // Insert the trailer before the streaming links
        const insertBeforeElement = streamingLinksContainer;
        insertBeforeElement.parentNode.insertBefore(
          trailerEmbedContainer,
          insertBeforeElement
        );

        // Hide the watch trailer button as we're now showing the trailer
        trailerContainer.classList.add("hidden");
      } else {
        // If no trailer found, update the button
        watchTrailerBtn.textContent = "Trailer Not Available";
      }
    } catch (error) {
      console.error("Error playing trailer:", error);
      watchTrailerBtn.textContent = "Trailer Not Available";
    } finally {
      // Re-enable the button
      watchTrailerBtn.disabled = false;
      watchTrailerBtn.classList.remove("btn-loading");
    }
  }

  // Function to handle follow-up questions
  async function sendFollowUpQuestion() {
    const followUpText = followUpInput.value.trim();

    if (!followUpText) {
      alert("Please enter a follow-up question");
      return;
    }

    try {
      showLoading(true);

      // Add user question to conversation
      state.conversation.push({
        role: "user",
        content: followUpText,
      });

      // Update conversation display
      updateConversationDisplay();

      // Clear the input field
      followUpInput.value = "";

      // Construct context for the LLM
      let contextPrompt = "";

      if (state.selectedMovie) {
        // Add details about the selected movie
        contextPrompt = `The user's current selected movie is "${state.selectedMovie.title}" (${state.selectedMovie.released}), a ${state.selectedMovie.genre} movie with IMDb rating ${state.selectedMovie.imdbrating}. `;
      }

      if (state.userPlatforms && state.userPlatforms.length > 0) {
        contextPrompt += `The user has access to these streaming platforms: ${state.userPlatforms.join(
          ", "
        )}. `;
      }

      // Combine context with user's question
      const fullPrompt =
        contextPrompt +
        "The user's question is: " +
        followUpText +
        "\n\nPlease respond in a helpful, concise manner.";

      // Get LLM response
      const response = await sendMessageToBackground({
        action: "getGeminiResponse",
        prompt: fullPrompt,
        geminiKey: state.geminiKey,
        conversation: state.conversation,
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      // Add LLM response to conversation
      state.conversation.push({
        role: "assistant",
        content: response.response,
      });

      // Update conversation display
      updateConversationDisplay();
    } catch (error) {
      alert(error.message);
    } finally {
      showLoading(false);
    }
  }

  // Function to update the conversation display
  function updateConversationDisplay() {
    if (!conversationHistory) return;

    conversationHistory.innerHTML = "";

    state.conversation.forEach((message) => {
      const messageElement = document.createElement("div");
      messageElement.className = `message ${message.role}`;

      messageElement.innerHTML = `
        <div class="message-content">${message.content}</div>
      `;

      conversationHistory.appendChild(messageElement);
    });

    // Scroll to the bottom of the conversation
    conversationHistory.scrollTop = conversationHistory.scrollHeight;
  }

  function startNewSearch() {
    state.selectedMovie = null;
    state.currentMovieDetail = null;
    state.currentTrailerUrl = null;
    state.conversation = [];
    state.movies = [];
    state.allMovies = [];
    state.currentPage = 1;
    moviePromptInput.value = "";
    showPage(searchPage);
  }

  function showLoading(show) {
    if (show) {
      loading.classList.remove("hidden");
    } else {
      loading.classList.add("hidden");
    }
  }

  // Helper function to send messages to the background script
  function sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          // Check for runtime error
          if (chrome.runtime.lastError) {
            console.error("Runtime error:", chrome.runtime.lastError);
            reject(
              new Error(
                `Chrome runtime error: ${chrome.runtime.lastError.message}`
              )
            );
            return;
          }

          // Handle missing response
          if (!response) {
            console.error("No response from background script");
            reject(
              new Error(
                "No response received from background script. The extension might need to be reloaded."
              )
            );
            return;
          }

          resolve(response);
        });
      } catch (error) {
        console.error("Error sending message to background script:", error);
        reject(
          new Error(
            `Failed to communicate with background script: ${error.message}`
          )
        );
      }
    });
  }

  // Function to test RapidAPI key
  async function testRapidApiKey() {
    const rapidApiKey = rapidApiKeyInput.value.trim();

    if (!rapidApiKey) {
      alert("Please enter your RapidAPI key first");
      return;
    }

    try {
      testResultBox.innerHTML = "Testing API key...";
      testResultBox.className = "result-box";
      testResultBox.classList.remove(
        "hidden",
        "result-success",
        "result-error"
      );

      const response = await sendMessageToBackground({
        action: "testRapidAPI",
        rapidApiKey,
      });

      if (response.success) {
        testResultBox.innerHTML = `✅ ${response.result.message}`;
        testResultBox.classList.add("result-success");

        // Add convenience button to save if test was successful
        if (!state.rapidApiKey) {
          testResultBox.innerHTML += `
            <div style="margin-top: 10px">
              <button id="save-after-test" class="primary-btn">Save this working key</button>
            </div>
          `;

          document
            .getElementById("save-after-test")
            .addEventListener("click", () => {
              if (geminiKeyInput.value.trim()) {
                saveApiKeys();
              } else {
                alert("Please enter your Gemini API key before saving");
              }
            });
        }
      } else {
        testResultBox.innerHTML = `❌ Error: ${response.error}
        
        <div style="margin-top: 10px; font-size: 12px;">
          <p>Troubleshooting tips:</p>
          <ol>
            <li>Check that your RapidAPI key is correct with no extra spaces</li>
            <li>Verify you have an active subscription to the OTT Details API</li>
            <li>Check if you've exceeded your API quota</li>
            <li>Try the original curl command to verify it works outside the extension</li>
          </ol>
        </div>`;
        testResultBox.classList.add("result-error");
      }
    } catch (error) {
      testResultBox.innerHTML = `❌ Error: ${error.message}`;
      testResultBox.classList.add("result-error");
    }
  }

  // New function to specifically test the movie search API
  async function testMovieSearchApi() {
    const rapidApiKey = rapidApiKeyInput.value.trim();

    if (!rapidApiKey) {
      alert("Please enter your RapidAPI key first");
      return;
    }

    try {
      movieSearchTestResult.innerHTML = "Testing movie search API...";
      movieSearchTestResult.className = "result-box";
      movieSearchTestResult.classList.remove(
        "hidden",
        "result-success",
        "result-error"
      );

      const response = await sendMessageToBackground({
        action: "testMovieSearch",
        rapidApiKey,
      });

      if (response.success) {
        movieSearchTestResult.innerHTML = `✅ ${response.result.message}`;
        movieSearchTestResult.classList.add("result-success");
      } else {
        movieSearchTestResult.innerHTML = `❌ Error: ${response.error}`;
        movieSearchTestResult.classList.add("result-error");
      }
    } catch (error) {
      movieSearchTestResult.innerHTML = `❌ Error: ${error.message}`;
      movieSearchTestResult.classList.add("result-error");
    }
  }

  // Set up event listeners for the setup page
  function setupEventListeners() {
    // ... existing code ...

    // Add event listener for the debug buttons
    const testMovieSearchBtn = document.getElementById("testMovieSearch");
    if (testMovieSearchBtn) {
      testMovieSearchBtn.addEventListener("click", testMovieSearchApi);
    }

    // Remove references to platforms API testing
    // The platforms test button is no longer needed as we're using hardcoded platforms
    const testPlatformsBtn = document.getElementById("testPlatforms");
    if (testPlatformsBtn) {
      testPlatformsBtn.style.display = "none"; // Hide the button instead of removing it
    }

    // ... existing code ...
  }

  // Function to get movie trailer data
  async function getMovieTrailer(title, year) {
    try {
      // Extract year from the full release date
      const releaseYear = year.split("-")[0] || year;

      const response = await sendMessageToBackground({
        action: "getMovieTrailer",
        movieTitle: title,
        year: releaseYear,
        rapidApiKey: state.rapidApiKey,
      });

      if (!response.success) {
        console.error("Failed to get trailer:", response.error);
        state.trailerData = null;
        return null;
      }

      // Make sure the trailer URL is in a valid format
      if (response.trailer && response.trailer.url) {
        // Log the original URL for debugging
        console.log("Original trailer URL:", response.trailer.url);

        // Some basic validation to ensure it's a working URL
        if (!response.trailer.url.startsWith("http")) {
          console.error("Invalid trailer URL format:", response.trailer.url);
          response.trailer.url = null;
        }
      }

      // Store the trailer data in state
      state.trailerData = response.trailer;
      return response.trailer;
    } catch (error) {
      console.error("Error getting trailer:", error);
      state.trailerData = null;
      return null;
    }
  }
});
