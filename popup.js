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

    platforms.forEach((platform) => {
      const checkbox = document.createElement("div");
      checkbox.className = "checkbox-item";

      // Handle both the old format (id, name) and new format (label, value, short)
      const platformId = platform.id || platform.value || platform.short;
      const platformName = platform.name || platform.label;

      checkbox.innerHTML = `
        <input type="checkbox" id="platform-${platformId}" data-platform-id="${platformId}" value="${platformName}">
        <label for="platform-${platformId}">${platformName}</label>
      `;

      ottPlatformList.appendChild(checkbox);
    });
  }

  // Function to filter movies based on selected platforms
  async function filterMoviesByPlatforms() {
    // Get selected platforms
    const checkboxes = document.querySelectorAll(
      '#ott-platform-list input[type="checkbox"]:checked'
    );

    if (checkboxes.length === 0) {
      alert("Please select at least one streaming platform");
      return;
    }

    // Get both platform display names and underlying values
    const platformNames = Array.from(checkboxes).map((cb) => cb.value);
    const platformValues = Array.from(checkboxes).map(
      (cb) => cb.dataset.platformId
    );

    // Store user's platform names for display
    state.userPlatforms = platformNames;

    // Store platform values for API matching
    state.userPlatformIds = platformValues;

    console.log("Selected platforms:", state.userPlatforms);
    console.log("Platform IDs for API:", state.userPlatformIds);

    try {
      showLoading(true);

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

    // Check if this movie is available on user's platforms
    const availablePlatforms = [];
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
            }
            break;
          }
        }
      }
    }

    // Create platform tags HTML
    let platformsHtml = "";
    if (availablePlatforms.length > 0) {
      platformsHtml = '<div class="platforms">';
      for (const platform of availablePlatforms) {
        platformsHtml += `<span class="platform-tag platform-available">${platform}</span>`;
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
    // Create streaming links if available
    let streamingLinksHtml = "";
    const streamingInfo = movieDetail.streamingAvailability || {};

    // Clear streaming links container
    streamingLinksContainer.innerHTML = "";

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
        const link = document.createElement("a");
        link.href = platformData.url;
        link.className = "streaming-service";
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        link.innerHTML = `
          <span class="platform-name">${platformName}</span>
          <span class="subscription-type">${
            platformData.type || "Subscription"
          }</span>
        `;

        streamingLinksContainer.appendChild(link);
        userStreamingPlatforms.push(platformName);
      }
    }

    // Build the movie detail view
    const movieHTML = `
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
      content:
        availabilityMessage +
        ` Would you like to see its trailer or learn more about the film?`,
    });
  }

  // Function to get and display movie trailer
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
        // Just hide the trailer button on error, no need to alert
        trailerContainer.classList.add("hidden");
        return;
      }

      // If we have a trailer URL, show the button
      if (response.trailer && response.trailer.url) {
        state.currentTrailerUrl = response.trailer.url;
        trailerContainer.classList.remove("hidden");
      } else {
        trailerContainer.classList.add("hidden");
      }
    } catch (error) {
      console.error("Error getting trailer:", error);
      trailerContainer.classList.add("hidden");
    }
  }

  // Function to play the movie trailer
  function playMovieTrailer() {
    if (!state.currentTrailerUrl) {
      alert("Trailer not available");
      return;
    }

    // If the trailer is a YouTube embed URL, create an iframe
    if (state.currentTrailerUrl.includes("youtube.com/embed/")) {
      // Create the iframe element
      const iframe = document.createElement("iframe");
      iframe.src = state.currentTrailerUrl;
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;

      // Create a container for the trailer
      const trailerDiv = document.createElement("div");
      trailerDiv.className = "trailer-container";
      trailerDiv.appendChild(iframe);

      // Replace the trailer button with the iframe
      trailerContainer.innerHTML = "";
      trailerContainer.appendChild(trailerDiv);
    } else {
      // If it's a regular URL, open it in a new tab
      window.open(state.currentTrailerUrl, "_blank");
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
});
