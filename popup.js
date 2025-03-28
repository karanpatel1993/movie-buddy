document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const setupPage = document.getElementById("setup-page");
  const searchPage = document.getElementById("search-page");
  const resultsPage = document.getElementById("results-page");
  const platformsPage = document.getElementById("platforms-page");
  const recommendationPage = document.getElementById("recommendation-page");

  const geminiKeyInput = document.getElementById("gemini-key");
  const rapidApiKeyInput = document.getElementById("rapidapi-key");
  const saveKeysBtn = document.getElementById("save-keys");
  const resetKeysBtn = document.getElementById("reset-keys");
  const testRapidApiBtn = document.getElementById("test-rapidapi");
  const testResultBox = document.getElementById("test-result");

  const moviePromptInput = document.getElementById("movie-prompt");
  const getRecommendationsBtn = document.getElementById("get-recommendations");
  const loading = document.getElementById("loading");

  const movieResultsContainer = document.getElementById("movie-results");
  const platformListContainer = document.getElementById("platform-list");
  const findAvailabilityBtn = document.getElementById("find-availability");

  const finalRecommendationContainer = document.getElementById(
    "final-recommendation"
  );
  const newSearchBtn = document.getElementById("new-search");

  // Application state
  let state = {
    geminiKey: "",
    rapidApiKey: "",
    selectedMovie: null,
    availablePlatforms: [],
    userPlatforms: [],
    conversation: [],
    movies: [],
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
  getRecommendationsBtn.addEventListener("click", getMovieRecommendations);
  findAvailabilityBtn.addEventListener("click", findMovieAvailability);
  newSearchBtn.addEventListener("click", startNewSearch);
  testRapidApiBtn.addEventListener("click", testRapidApiKey);

  // Functions
  function showPage(pageToShow) {
    // Hide all pages
    setupPage.classList.add("hidden");
    searchPage.classList.add("hidden");
    resultsPage.classList.add("hidden");
    platformsPage.classList.add("hidden");
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

  async function getMovieRecommendations() {
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

      // Call to background script to search for movies
      const response = await sendMessageToBackground({
        action: "searchMovies",
        prompt,
        rapidApiKey: state.rapidApiKey,
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      state.movies = response.movies;

      if (state.movies.length === 0) {
        throw new Error(
          "No movies found matching your criteria. Please try again with different parameters."
        );
      }

      // Display movie results
      displayMovieResults(state.movies);
      showPage(resultsPage);

      // Add assistant response to conversation
      state.conversation.push({
        role: "assistant",
        content: `I found ${state.movies.length} movies that match your request. Please select one to continue.`,
      });
    } catch (error) {
      alert(error.message);
    } finally {
      showLoading(false);
    }
  }

  function displayMovieResults(movies) {
    movieResultsContainer.innerHTML = "";

    // Only show top 5 movies to keep it manageable
    const topMovies = movies.slice(0, 5);

    topMovies.forEach((movie) => {
      const movieCard = document.createElement("div");
      movieCard.className = "movie-card";
      movieCard.dataset.id = movie.imdbid;

      movieCard.innerHTML = `
        <h3>${movie.title}</h3>
        <p>${movie.released} | ${movie.genre}</p>
        <p class="imdb">IMDb: ${movie.imdbrating}</p>
        <p>${movie.synopsis?.substring(0, 100)}...</p>
      `;

      movieCard.addEventListener("click", () => {
        state.selectedMovie = movie;
        getPlatformsList();
      });

      movieResultsContainer.appendChild(movieCard);
    });
  }

  async function getPlatformsList() {
    try {
      showLoading(true);

      // Call to background script to get available platforms
      const response = await sendMessageToBackground({
        action: "getPlatforms",
        rapidApiKey: state.rapidApiKey,
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      state.availablePlatforms = response.platforms;

      if (state.availablePlatforms.length === 0) {
        throw new Error(
          "No platforms found. Please check your API key and try again."
        );
      }

      // Display platform checkboxes
      displayPlatformOptions(state.availablePlatforms);
      showPage(platformsPage);

      // Add to conversation
      state.conversation.push({
        role: "user",
        content: `I would like to know where I can watch "${state.selectedMovie.title}".`,
      });
    } catch (error) {
      alert(error.message);
    } finally {
      showLoading(false);
    }
  }

  function displayPlatformOptions(platforms) {
    platformListContainer.innerHTML = "";

    platforms.forEach((platform) => {
      const checkbox = document.createElement("div");
      checkbox.className = "checkbox-item";

      checkbox.innerHTML = `
        <input type="checkbox" id="platform-${platform.id}" data-platform-id="${platform.id}" value="${platform.name}">
        <label for="platform-${platform.id}">${platform.name}</label>
      `;

      platformListContainer.appendChild(checkbox);
    });
  }

  async function findMovieAvailability() {
    // Get selected platforms
    const checkboxes = document.querySelectorAll(
      '#platform-list input[type="checkbox"]:checked'
    );

    if (checkboxes.length === 0) {
      alert("Please select at least one OTT platform");
      return;
    }

    state.userPlatforms = Array.from(checkboxes).map((cb) => cb.value);

    try {
      showLoading(true);

      // Add assistant response to conversation
      state.conversation.push({
        role: "assistant",
        content: `I see you have selected these platforms: ${state.userPlatforms.join(
          ", "
        )}. Let me check where you can watch "${state.selectedMovie.title}".`,
      });

      // Construct a prompt for the Gemini API
      const finalPrompt = `
        Based on our conversation, I need a final recommendation for the user.
        
        Selected movie: ${state.selectedMovie.title} (${
        state.selectedMovie.released
      })
        IMDB Rating: ${state.selectedMovie.imdbrating}
        
        User's available platforms: ${state.userPlatforms.join(", ")}
        
        Movie streaming availability:
        ${JSON.stringify(state.selectedMovie.streamingInfo || {})}
        
        Please provide a final recommendation in this format:
        "You can watch [MOVIE TITLE] on [PLATFORM NAME]. [Brief description of the movie, 1-2 sentences]."
        
        If the movie is not available on any of the user's platforms, suggest the best alternative platform where they can watch it.
        If no streaming information is available, just say that the streaming information isn't available but give a brief description of the movie.
      `;

      // Call to background script to get final recommendation
      const response = await sendMessageToBackground({
        action: "getGeminiResponse",
        prompt: finalPrompt,
        geminiKey: state.geminiKey,
        conversation: state.conversation,
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      // Display final recommendation
      finalRecommendationContainer.innerHTML = `<p>${response.response}</p>`;
      showPage(recommendationPage);

      // Add to conversation
      state.conversation.push({
        role: "assistant",
        content: response.response,
      });
    } catch (error) {
      alert(error.message);
    } finally {
      showLoading(false);
    }
  }

  function startNewSearch() {
    state.selectedMovie = null;
    state.conversation = [];
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
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response);
      });
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
});
