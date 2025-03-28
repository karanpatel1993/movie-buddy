// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "searchMovies") {
    searchMovies(request.prompt, request.rapidApiKey)
      .then((result) =>
        sendResponse({
          success: true,
          movies: result.movies,
          requestedGenre: result.requestedGenre,
        })
      )
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Indicates we'll respond asynchronously
  }

  // We're keeping this handler for backward compatibility
  // but it won't be called by our updated popup.js
  if (request.action === "getPlatforms") {
    // Return a hardcoded list of platforms instead of making an API call
    const hardcodedPlatforms = [
      { id: "netflix", name: "Netflix", shortName: "netflix" },
      { id: "prime", name: "Amazon Prime", shortName: "prime" },
      { id: "hotstar", name: "Hotstar", shortName: "hotstar" },
      { id: "sonyliv", name: "SonyLiv", shortName: "sonyliv" },
    ];

    sendResponse({ success: true, platforms: hardcodedPlatforms });
    return true;
  }

  if (request.action === "filterMoviesByPlatform") {
    filterMoviesByPlatform(
      request.movies,
      request.platforms,
      request.rapidApiKey,
      request.requestedGenre
    )
      .then((filteredMovies) =>
        sendResponse({
          success: true,
          movies: filteredMovies.movies,
          hasMatches: filteredMovies.hasMatches,
        })
      )
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "getMovieDetails") {
    getMovieDetails(request.movieId, request.rapidApiKey)
      .then((details) => sendResponse({ success: true, details }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "getMovieTrailer") {
    getMovieTrailer(request.movieTitle, request.year, request.rapidApiKey)
      .then((trailer) => sendResponse({ success: true, trailer }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "getGeminiResponse") {
    getGeminiResponse(request.prompt, request.geminiKey, request.conversation)
      .then((response) => sendResponse({ success: true, response }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "testRapidAPI") {
    testRapidAPI(request.rapidApiKey)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "testMovieSearch") {
    testMovieSearch(request.rapidApiKey)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Helper function to add delay between API calls
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// API call counter for logging
let apiCallCount = 0;

// Helper function to log API calls with tracking
async function makeApiCall(callName, apiCallFn) {
  apiCallCount++;
  const currentCall = apiCallCount;
  console.log(`[API Call #${currentCall}] Starting: ${callName}`);

  // Add 1 second delay before making the call
  await delay(1000);

  try {
    const result = await apiCallFn();
    console.log(`[API Call #${currentCall}] Completed: ${callName}`);
    return result;
  } catch (error) {
    console.error(`[API Call #${currentCall}] Failed: ${callName}`, error);
    throw error;
  }
}

// Function to search for movies using the OTT Details API
async function searchMovies(prompt, apiKey) {
  try {
    console.log("=====================================");
    console.log("MOVIE SEARCH DEBUG");
    console.log("Starting movie search with prompt:", prompt);
    console.log(
      "Using RapidAPI key:",
      apiKey ? "Key exists (hidden for security)" : "Key is missing"
    );

    // Generate a random page number between 1 and 5 for more varied results
    const randomPage = Math.floor(Math.random() * 5) + 1;
    console.log(`Using random page number: ${randomPage}`);

    // Select a random sort method
    const sortOptions = [
      "latest",
      "highest_rated",
      "lowest_rated",
      "year",
      "score",
    ];
    const randomSortIndex = Math.floor(Math.random() * sortOptions.length);
    const randomSort = sortOptions[randomSortIndex];
    console.log(`Using random sort option: ${randomSort}`);

    // Define default search parameters for Hollywood movies
    const defaultSearchParams = {
      genre: "all",
      start_year: "1970",
      end_year: new Date().getFullYear().toString(),
      min_imdb: "7",
      max_imdb: "10",
      language: "english",
      type: "movie",
      sort: randomSort, // Use random sort option
      page: randomPage.toString(), // Use random page
      // No limit parameter - we'll fetch all available results
    };

    // Improved genre detection - add more common genres
    let requestedGenre = "";
    if (
      prompt.toLowerCase().includes("romantic") ||
      prompt.toLowerCase().includes("romance")
    ) {
      requestedGenre = "romance";
    } else if (prompt.toLowerCase().includes("action")) {
      requestedGenre = "action";
    } else if (prompt.toLowerCase().includes("comedy")) {
      requestedGenre = "comedy";
    } else if (prompt.toLowerCase().includes("horror")) {
      requestedGenre = "horror";
    } else if (prompt.toLowerCase().includes("thriller")) {
      requestedGenre = "thriller";
    } else if (prompt.toLowerCase().includes("drama")) {
      requestedGenre = "drama";
    } else if (
      prompt.toLowerCase().includes("sci-fi") ||
      prompt.toLowerCase().includes("science fiction") ||
      prompt.toLowerCase().includes("scifi")
    ) {
      requestedGenre = "sci-fi";
    } else if (prompt.toLowerCase().includes("fantasy")) {
      requestedGenre = "fantasy";
    } else if (prompt.toLowerCase().includes("documentary")) {
      requestedGenre = "documentary";
    } else if (
      prompt.toLowerCase().includes("animation") ||
      prompt.toLowerCase().includes("animated")
    ) {
      requestedGenre = "animation";
    } else if (prompt.toLowerCase().includes("mystery")) {
      requestedGenre = "mystery";
    } else if (prompt.toLowerCase().includes("adventure")) {
      requestedGenre = "adventure";
    } else if (prompt.toLowerCase().includes("crime")) {
      requestedGenre = "crime";
    } else if (prompt.toLowerCase().includes("family")) {
      requestedGenre = "family";
    }

    // If genre is detected, log it
    if (requestedGenre) {
      console.log(`Detected requested genre from prompt: ${requestedGenre}`);
      // Set the default genre here so it's used if Gemini API fails
      defaultSearchParams.genre = requestedGenre;
    } else {
      console.log("No specific genre detected in prompt, allowing any genre");
    }

    // First, we'll ask Gemini to extract search parameters from the user's prompt
    const geminiKey = await getStoredKey("geminiKey");
    console.log(
      "Retrieved Gemini key:",
      geminiKey ? "Key exists (hidden for security)" : "Key is missing"
    );

    // Check if prompt contains Bollywood or Hollywood related terms
    const isBollywoodRequest = /bollywood|hindi|indian cinema/i.test(prompt);
    const isHollywoodRequest = /hollywood|american movie|english movie/i.test(
      prompt
    );

    // Default to Hollywood if nothing specific is mentioned
    let movieIndustry = "hollywood";

    if (isBollywoodRequest) {
      movieIndustry = "bollywood";
    }

    console.log(`Detected movie industry request: ${movieIndustry}`);

    // Create a more specific prompt for Gemini focused on Bollywood and Hollywood
    const searchParamsPrompt = `
      Extract search parameters from the following movie request. Return only a JSON object with these fields:
      - genre: The movie genre (e.g., action, comedy, sci-fi, romance)
      - start_year: Start year for the search (default to 1970 if not specified)
      - end_year: End year for the search (default to current year if not specified)
      - min_imdb: Minimum IMDb rating (should be 7, unless user specifically requests a different minimum)
      - max_imdb: Maximum IMDb rating (default to 10)
      - language: Either "hindi" or "english" depending on whether this is a Bollywood or Hollywood request
      - country: For Bollywood, use "india"; for Hollywood, use "usa"
      - type: Always set to "movie"
      
      User request: "${prompt}"
      
      IMPORTANT:
      - If the request mentions "Bollywood" or Indian cinema, set language to "hindi" and country to "india"
      - If the request mentions "Hollywood" or explicitly mentions English/American movies, set language to "english" and country to "usa"
      - If neither is specified, default to language "english" and country "usa"
      - Pay special attention to genres mentioned in the request. If a specific genre like "romantic", "action", "comedy", etc. is mentioned, make sure to set the genre parameter properly.
      - If "romantic" or "romance" is mentioned, set genre to "romance"
      - The minimum IMDb rating should always be at least 7 unless the user explicitly requests a different value
      - If no genre is mentioned, leave it as "all" to allow for any genre
      
      Only respond with the JSON, no explanations.
    `;

    console.log("Calling Gemini to extract search parameters");
    let searchParams = defaultSearchParams;

    // Set default parameters based on detected movie industry
    if (isBollywoodRequest) {
      console.log("Detected Bollywood request, setting Hindi/India defaults");
      searchParams.language = "hindi";
      searchParams.country = "india";
    } else {
      console.log("Using Hollywood defaults: English/USA");
      searchParams.language = "english";
      searchParams.country = "usa";
    }

    try {
      // Use makeApiCall with delay for the Gemini API call
      const searchParamsResponse = await makeApiCall(
        "Gemini Search Parameters",
        () => getGeminiResponse(searchParamsPrompt, geminiKey, [])
      );

      console.log("Gemini response:", searchParamsResponse);

      // Parse the JSON response from Gemini
      try {
        const parsedParams = JSON.parse(searchParamsResponse.trim());
        console.log("Parsed search parameters:", parsedParams);

        // Merge with defaults to ensure all required fields are present
        searchParams = { ...defaultSearchParams, ...parsedParams };

        // If we detected a genre from the prompt, make sure it's set in the search params
        if (
          requestedGenre &&
          (!parsedParams.genre || parsedParams.genre === "all")
        ) {
          console.log(
            `Overriding genre with detected genre from prompt: ${requestedGenre}`
          );
          searchParams.genre = requestedGenre;
        }

        // Ensure minimum IMDb rating is at least 7
        if (parseFloat(searchParams.min_imdb) < 7) {
          console.log(
            `Adjusting minimum IMDb rating to 7 (was ${searchParams.min_imdb})`
          );
          searchParams.min_imdb = "7";
        }

        // Remove limit parameter if it was added by Gemini
        delete searchParams.limit;

        // Always use our random page number and sort option
        searchParams.page = randomPage.toString();
        searchParams.sort = randomSort;

        // Enforce the specified language and country restrictions
        if (isBollywoodRequest) {
          searchParams.language = "hindi";
          searchParams.country = "india";
        } else {
          // Default to Hollywood/English if not clearly Bollywood
          if (searchParams.language !== "hindi") {
            searchParams.language = "english";
          }
          if (searchParams.country !== "india") {
            searchParams.country = "usa";
          }
        }

        console.log(`Final language setting: ${searchParams.language}`);
        console.log(`Final country setting: ${searchParams.country}`);
      } catch (parseError) {
        console.error("Error parsing Gemini response:", parseError);
        console.log(
          "Raw response that couldn't be parsed:",
          searchParamsResponse
        );
        console.log("Using default search parameters instead");
      }
    } catch (geminiError) {
      console.error("Error getting parameters from Gemini:", geminiError);
      console.log("Using default search parameters instead");
    }

    // Make sure all values are strings for URL params
    Object.keys(searchParams).forEach((key) => {
      if (searchParams[key] !== undefined && searchParams[key] !== null) {
        searchParams[key] = String(searchParams[key]);
      }
    });

    // Try with the extracted parameters first
    let movies = await performMovieSearch(searchParams, apiKey);

    // If no results, try with the same parameters but on page 1
    if (!movies || movies.length === 0) {
      console.log("No results found with random page. Trying with page 1...");

      // Add a delay before the second search
      await delay(1000);

      // Create the same parameters but use page 1
      const page1Params = {
        ...searchParams,
        page: "1",
      };

      console.log("Using page 1 search parameters:", page1Params);
      movies = await performMovieSearch(page1Params, apiKey);
    }

    // If still no results, try with more relaxed parameters but keep language/country constraints
    if (!movies || movies.length === 0) {
      console.log(
        "No results found with initial parameters. Trying with relaxed parameters..."
      );

      // Add a delay before the next search
      await delay(1000);

      // Create relaxed parameters by modifying the most restrictive ones
      // But preserve language, country, and genre if possible
      const relaxedParams = {
        ...searchParams,
        min_imdb: "6.5", // Lower IMDb threshold but not below 6.5
        start_year: "1960", // Expand year range
        page: "1", // Use page 1 for relaxed search to maximize results
        sort: "highest_rated", // Switch to highest_rated for fallback search
        // No limit parameter
        // Keeping the language, country, and genre settings if specified
      };

      // Only remove genre restriction if we don't have a specific requested genre
      if (!requestedGenre || requestedGenre === "") {
        relaxedParams.genre = "all";
      }

      console.log("Relaxed search parameters:", relaxedParams);
      movies = await performMovieSearch(relaxedParams, apiKey);

      // If still no results, try with even more relaxed parameters
      // But still maintain Bollywood/Hollywood focus and genre if specified
      if (!movies || movies.length === 0) {
        console.log("Still no results. Trying with very generic parameters...");

        // Add a delay before the third search
        await delay(1000);

        // Create very generic parameters but maintain language, country, and genre if possible
        const genericParams = {
          type: "movie",
          sort: "highest_rated", // Use highest_rated for generic search
          language: searchParams.language, // Keep original language setting
          country: searchParams.country, // Keep original country setting
          page: "1", // Use page 1 for generic search
          min_imdb: "6.0", // Add a minimum IMDb rating that's more relaxed but still decent
          // No limit parameter
        };

        // Keep genre if we have a requested one
        if (requestedGenre && requestedGenre !== "") {
          genericParams.genre = requestedGenre;
        }

        console.log("Generic search parameters:", genericParams);
        movies = await performMovieSearch(genericParams, apiKey);

        if (!movies || movies.length === 0) {
          // If all attempts fail, provide a clear error message
          if (requestedGenre) {
            throw new Error(
              `No ${requestedGenre} movies found matching your criteria with IMDb rating of at least ${genericParams.min_imdb}. Try a different genre or broader search terms.`
            );
          } else {
            throw new Error(
              "No movies found matching your criteria. Try different search parameters or check if the API service is working correctly."
            );
          }
        }
      }
    }

    console.log(`Successfully found ${movies.length} movies`);

    // Randomly select 3 movies if we have more than 3
    if (movies.length > 3) {
      console.log(`Randomly selecting 3 movies out of ${movies.length} found`);
      try {
        // Wrap the getRandomMovies call in a try-catch block for safety
        movies = getRandomMovies(movies, 3, requestedGenre);
      } catch (randomError) {
        console.error("Error during random movie selection:", randomError);
        // Fallback to simple random selection if the main function fails
        console.log("Using simple fallback random selection method");

        // Simple fallback random selection
        const selectedMovies = [];
        const moviesCopy = [...movies];

        for (let i = 0; i < 3 && moviesCopy.length > 0; i++) {
          const randomIndex = Math.floor(Math.random() * moviesCopy.length);
          selectedMovies.push(moviesCopy[randomIndex]);
          moviesCopy.splice(randomIndex, 1);
        }

        movies = selectedMovies;
      }
    }

    console.log(`Returning ${movies.length} selected movies`);
    return {
      movies,
      requestedGenre: requestedGenre || "any",
    };
  } catch (error) {
    console.error("Error searching movies:", error);
    throw new Error("Failed to search for movies: " + error.message);
  }
}

// Helper function to randomly select n movies from an array
// Now with genre matching prioritization
function getRandomMovies(movies, count, requestedGenre = "") {
  // If we don't have enough movies, return all we have
  if (movies.length <= count) {
    return movies;
  }

  // Create a copy of the array to avoid modifying the original
  const moviesCopy = [...movies];
  const result = [];

  try {
    // If there's a specific requested genre, prioritize that first
    if (requestedGenre && requestedGenre.trim() !== "") {
      console.log(
        `Prioritizing movies with requested genre: ${requestedGenre}`
      );
      const requestedGenreLower = requestedGenre.toLowerCase();

      // Find movies that match the requested genre
      const matchingMovies = moviesCopy.filter((movie) => {
        if (!movie.genre) return false;

        let genreString = "";
        // Handle different format types for genre
        if (typeof movie.genre === "string") {
          genreString = movie.genre.toLowerCase();
        } else if (Array.isArray(movie.genre)) {
          genreString = movie.genre.join(",").toLowerCase();
        } else {
          genreString = String(movie.genre).toLowerCase();
        }

        const isMatch = genreString.includes(requestedGenreLower);

        // Add more detailed logging for first few movies to help debugging
        if (Math.random() < 0.2) {
          // Only log ~20% of movies to avoid excessive logging
          console.log(
            `Movie "${movie.title}" has genre "${genreString}" - Match for "${requestedGenreLower}": ${isMatch}`
          );
        }

        return isMatch;
      });

      console.log(
        `Found ${matchingMovies.length} movies matching requested genre: ${requestedGenre}`
      );

      // Log a few sample matching movies for verification
      if (matchingMovies.length > 0) {
        console.log("Sample matching movies:");
        matchingMovies
          .slice(0, Math.min(3, matchingMovies.length))
          .forEach((movie) => {
            console.log(
              `- ${movie.title} (${movie.released}) - Genre: ${movie.genre}`
            );
          });
      }

      // If we have enough matching movies, use them
      if (matchingMovies.length >= count) {
        // Shuffle matching movies for randomness
        for (let i = matchingMovies.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [matchingMovies[i], matchingMovies[j]] = [
            matchingMovies[j],
            matchingMovies[i],
          ];
        }

        // Take the first count movies
        return matchingMovies.slice(0, count);
      }

      // If we don't have enough matching movies, add them all and continue with diversity
      if (matchingMovies.length > 0) {
        result.push(...matchingMovies);

        // Remove these movies from the pool
        matchingMovies.forEach((movie) => {
          const index = moviesCopy.findIndex((m) => m.imdbid === movie.imdbid);
          if (index !== -1) {
            moviesCopy.splice(index, 1);
          }
        });

        console.log(
          `Added ${matchingMovies.length} matching genre movies, need ${
            count - matchingMovies.length
          } more`
        );
      }
    }

    // Organize remaining movies by genre for diversity if we still need more
    if (result.length < count) {
      // First, organize movies by genre
      const moviesByGenre = {};
      moviesCopy.forEach((movie) => {
        // Extract the first genre, ensuring we're dealing with a string
        let primaryGenre = "Unknown";

        if (movie.genre) {
          // Check if genre is a string before calling split
          if (typeof movie.genre === "string") {
            primaryGenre = movie.genre.split(",")[0].trim();
          } else if (Array.isArray(movie.genre) && movie.genre.length > 0) {
            // If genre is an array, take the first element
            primaryGenre = String(movie.genre[0]).trim();
          } else {
            // For any other type, convert to string
            primaryGenre = String(movie.genre).trim();
          }
        }

        if (!moviesByGenre[primaryGenre]) {
          moviesByGenre[primaryGenre] = [];
        }
        moviesByGenre[primaryGenre].push(movie);
      });

      const genres = Object.keys(moviesByGenre);
      console.log(
        `For remaining selection, found ${genres.length} different genres`
      );

      // Shuffle the genres for randomness
      for (let i = genres.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [genres[i], genres[j]] = [genres[j], genres[i]];
      }

      // Select movies from different genres to fill our quota
      let genreIndex = 0;
      while (result.length < count && genreIndex < genres.length) {
        const genre = genres[genreIndex];
        const genreMovies = moviesByGenre[genre];

        if (genreMovies.length > 0) {
          const randomIndex = Math.floor(Math.random() * genreMovies.length);
          result.push(genreMovies[randomIndex]);

          // Remove this movie from available movies
          const selectedMovie = genreMovies[randomIndex];
          genreMovies.splice(randomIndex, 1);
        }

        genreIndex++;
      }

      // If we still need more movies (ran out of genres), take random ones
      if (result.length < count) {
        const remainingMovieList = moviesCopy.filter(
          (movie) =>
            !result.some(
              (selectedMovie) => selectedMovie.imdbid === movie.imdbid
            )
        );

        while (result.length < count && remainingMovieList.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * remainingMovieList.length
          );
          result.push(remainingMovieList[randomIndex]);
          remainingMovieList.splice(randomIndex, 1);
        }
      }
    }
  } catch (error) {
    // If any error occurs, fall back to simple random selection
    console.error(
      "Error in genre-based selection, using fallback method:",
      error
    );

    // Reset the result array in case it was partially filled
    result.length = 0;

    // Simple fallback: randomly select count movies
    const movieCopyForFallback = [...movies];
    for (let i = 0; i < count && movieCopyForFallback.length > 0; i++) {
      const randomIndex = Math.floor(
        Math.random() * movieCopyForFallback.length
      );
      result.push(movieCopyForFallback[randomIndex]);
      movieCopyForFallback.splice(randomIndex, 1);
    }

    console.log(
      `Selected ${result.length} movies using fallback random selection`
    );
  }

  return result;
}

// Helper function to perform the actual movie search
async function performMovieSearch(searchParams, apiKey) {
  // Make the API request to OTT Details
  const url = new URL("https://ott-details.p.rapidapi.com/advancedsearch");

  // Add query parameters
  console.log("Search parameters:", searchParams);

  // Handle special cases for country parameter
  if (searchParams.country) {
    // The API uses different parameter for country filtering
    searchParams.country_list = searchParams.country;

    // Log that we're using country filtering
    console.log(`Adding country filter for: ${searchParams.country}`);
  }

  // Clean up parameters for API compatibility
  const paramsCopy = { ...searchParams };
  delete paramsCopy.country; // Remove original country param as we use country_list

  // Add all parameters to the URL
  Object.keys(paramsCopy).forEach((key) => {
    url.searchParams.append(key, paramsCopy[key]);
  });

  console.log("Making request to OTT Details API:", url.toString());

  // Use makeApiCall to add delay and logging
  const response = await makeApiCall("Movie Search API", () =>
    fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "ott-details.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
    })
  );

  console.log("OTT API response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error response body:", errorText);

    // Check for specific error conditions
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Authentication failed (${response.status}): Your API key may be invalid or you don't have access to this endpoint. Please check your RapidAPI subscription.`
      );
    } else if (response.status === 429) {
      throw new Error(
        `Rate limit exceeded (${response.status}): You've reached your quota limit for the OTT Details API. Please check your subscription plan on RapidAPI.`
      );
    } else if (response.status >= 500) {
      throw new Error(
        `Server error (${response.status}): The OTT Details API is experiencing issues. Please try again later.`
      );
    } else {
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`
      );
    }
  }

  let data;
  try {
    data = await response.json();
    if (data.results) {
      console.log(`Found ${data.results.length} movies in response`);
    } else {
      console.warn("No results field in API response");
      return [];
    }
  } catch (parseError) {
    console.error("Failed to parse API response:", parseError);
    throw new Error(
      "Failed to parse the movie search response. The service might be experiencing issues."
    );
  }

  if (!data || !data.results) {
    console.warn("Unexpected API response format:", data);
    return [];
  }

  if (data.results.length === 0) {
    console.warn("API returned zero results");
    return [];
  }

  // Log the first few results for debugging regional cinema requests
  if (searchParams.language !== "english" || searchParams.country_list) {
    console.log("Regional cinema search results:");
    data.results
      .slice(0, Math.min(5, data.results.length))
      .forEach((movie, index) => {
        console.log(
          `Movie ${index + 1}: ${movie.title} (${movie.released}) - Language: ${
            movie.language
          }`
        );
      });
  }

  // Enhance movie data with availability information if possible
  console.log("Enhancing movies with streaming availability information");

  // To avoid excessive API calls, only get streaming info for the first 10 movies
  const moviesToEnhance = data.results.slice(
    0,
    Math.min(10, data.results.length)
  );

  const moviesWithInfo = await Promise.all(
    moviesToEnhance.map(async (movie, index) => {
      try {
        // Add a small delay between each streaming availability request
        if (index > 0) {
          await delay(1000);
        }

        // Try to get streaming information for each movie
        const streamingInfo = await getStreamingAvailability(
          movie.imdbid,
          apiKey
        );
        return { ...movie, streamingInfo };
      } catch (error) {
        console.warn(`Could not get streaming info for ${movie.title}:`, error);
        return movie;
      }
    })
  );

  // Add the rest of the movies without streaming info (to be fetched later if needed)
  const allMovies = [...moviesWithInfo];

  if (data.results.length > 10) {
    console.log(
      `Adding ${
        data.results.length - 10
      } more movies without streaming info for now`
    );
    for (let i = 10; i < data.results.length; i++) {
      allMovies.push(data.results[i]);
    }
  }

  return allMovies;
}

// Function to filter movies by platform availability
async function filterMoviesByPlatform(
  movies,
  userPlatforms,
  apiKey,
  requestedGenre
) {
  try {
    console.log("Filtering movies by platforms:", userPlatforms);
    console.log(`Starting with ${movies.length} movies to filter`);

    // Map of platform IDs as they might appear in the API response
    const platformMapping = {
      netflix: ["netflix", "Netflix"],
      prime: ["prime", "amazonprime", "amazon", "Amazon Prime", "Amazon"],
      hotstar: [
        "hotstar",
        "Hotstar",
        "Disney+",
        "disneyplus",
        "Disney+ Hotstar",
      ],
      sonyliv: ["sonyliv", "SonyLiv", "sony", "Sony"],
    };

    // Check which movies already have streaming info
    const moviesWithInfo = [];
    const moviesNeedingInfo = [];

    // Separate movies that already have streaming info from those that need it
    movies.forEach((movie) => {
      if (movie.streamingInfo && Object.keys(movie.streamingInfo).length > 0) {
        moviesWithInfo.push(movie);
      } else {
        moviesNeedingInfo.push(movie);
      }
    });

    console.log(`${moviesWithInfo.length} movies already have streaming info`);
    console.log(`${moviesNeedingInfo.length} movies need streaming info`);

    // Create an array to hold all movies with streaming info
    let moviesWithStreamingInfo = [...moviesWithInfo];

    // If there are movies that need streaming info, fetch it for them
    if (moviesNeedingInfo.length > 0) {
      // To avoid too many API calls, limit to at most 10 movies that need info
      const moviesToFetch = moviesNeedingInfo.slice(
        0,
        Math.min(10, moviesNeedingInfo.length)
      );
      console.log(`Fetching streaming info for ${moviesToFetch.length} movies`);

      const newMoviesWithInfo = await Promise.all(
        moviesToFetch.map(async (movie, index) => {
          try {
            // Add a delay between requests to respect rate limits
            if (index > 0) {
              await delay(1000);
            }

            const streamingInfo = await getStreamingAvailability(
              movie.imdbid,
              apiKey
            );
            return { ...movie, streamingInfo };
          } catch (error) {
            console.warn(
              `Could not get streaming info for ${movie.title}:`,
              error
            );
            return movie;
          }
        })
      );

      // Add these newly enhanced movies to our collection
      moviesWithStreamingInfo = [
        ...moviesWithStreamingInfo,
        ...newMoviesWithInfo,
      ];
    }

    // Log the streaming info for debugging
    console.log(
      "Streaming info for movies:",
      moviesWithStreamingInfo.map((m) => ({
        title: m.title,
        platforms: m.streamingInfo ? Object.keys(m.streamingInfo) : [],
      }))
    );

    // Filter movies available on user's platforms
    const filteredMovies = moviesWithStreamingInfo.filter((movie) => {
      if (!movie.streamingInfo) return false;

      // Check if available on any of the user's platforms
      return userPlatforms.some((userPlatform) => {
        // Get all possible variations of this platform ID from our mapping
        const platformVariants = platformMapping[userPlatform] || [
          userPlatform,
        ];

        // Check if any of these platform variants exist in the streaming info
        return platformVariants.some((variant) =>
          Object.keys(movie.streamingInfo).some(
            (apiPlatform) => apiPlatform.toLowerCase() === variant.toLowerCase()
          )
        );
      });
    });

    console.log(
      `Found ${filteredMovies.length} movies available on user's platforms`
    );

    // If we have at least 3 movies or 50% of those with streaming info, return these movies
    if (
      filteredMovies.length >= 3 ||
      filteredMovies.length >= moviesWithStreamingInfo.length * 0.5
    ) {
      // Always return exactly 3 movies if we have that many
      const moviesToReturn = filteredMovies.slice(
        0,
        Math.min(3, filteredMovies.length)
      );
      return { movies: moviesToReturn, hasMatches: true };
    }

    // Otherwise, return the original movies with streaming info and indicate no matches
    console.log("Not enough matches found, using original movie list");
    // Return 3 random movies from those with streaming info
    let randomMovies;
    if (moviesWithStreamingInfo.length > 3) {
      randomMovies = getRandomMovies(
        moviesWithStreamingInfo,
        3,
        requestedGenre
      );
    } else {
      randomMovies = moviesWithStreamingInfo;
    }
    return { movies: randomMovies, hasMatches: false };
  } catch (error) {
    console.error("Error filtering movies by platform:", error);
    throw new Error("Failed to filter movies by platform: " + error.message);
  }
}

// Function to get streaming availability for a movie
async function getStreamingAvailability(imdbId, apiKey) {
  try {
    console.log(`Getting streaming availability for movie ${imdbId}`);

    const url = `https://ott-details.p.rapidapi.com/gettitleDetails?imdbid=${imdbId}`;

    // Use makeApiCall to add delay and logging
    const response = await makeApiCall(
      `Streaming Availability for ${imdbId}`,
      () =>
        fetch(url, {
          method: "GET",
          headers: {
            "x-rapidapi-host": "ott-details.p.rapidapi.com",
            "x-rapidapi-key": apiKey,
          },
        })
    );

    if (!response.ok) {
      const status = response.status;
      console.warn(
        `Streaming availability API request failed with status ${status} for movie ${imdbId}`
      );

      // For non-critical errors, don't throw but return empty object
      // This prevents one movie's streaming info failure from breaking the whole search
      return {};
    }

    const data = await response.json();

    // Log the structure of streaming availability data
    if (data && data.streamingAvailability) {
      const platforms = Object.keys(data.streamingAvailability);
      console.log(
        `Movie ${imdbId} is available on ${
          platforms.length
        } platforms: ${platforms.join(", ")}`
      );
      return data.streamingAvailability;
    } else {
      console.log(`No streaming availability found for movie ${imdbId}`);
      return {};
    }
  } catch (error) {
    console.warn(`Error getting streaming availability for ${imdbId}:`, error);
    // Return empty object rather than throwing to keep the search working
    return {};
  }
}

// Function to get detailed information about a movie
async function getMovieDetails(imdbId, apiKey) {
  try {
    console.log(`Getting details for movie ${imdbId}`);

    const url = `https://ott-details.p.rapidapi.com/gettitleDetails?imdbid=${imdbId}`;

    // Use makeApiCall to add delay and logging
    const response = await makeApiCall(`Movie Details for ${imdbId}`, () =>
      fetch(url, {
        method: "GET",
        headers: {
          "x-rapidapi-host": "ott-details.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
      })
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log("Movie details response:", data);

    return data;
  } catch (error) {
    console.error(`Error getting details for movie ${imdbId}:`, error);
    throw new Error("Failed to get movie details");
  }
}

// Function to get a movie trailer using YouTube API
async function getMovieTrailer(title, year, apiKey) {
  try {
    console.log(`Searching for trailer: ${title} (${year})`);

    // First, try using the OTT Details API to get movie details which might include trailer
    const geminiKey = await getStoredKey("geminiKey");

    // Use Gemini to find a YouTube URL for the trailer
    const trailerPrompt = `
      Find a YouTube trailer URL for the movie "${title}" (${year}).
      Please respond with only a single YouTube URL for the movie trailer. 
      No additional text, just the YouTube URL itself. Make sure this is the official trailer.
    `;

    // Use makeApiCall to add delay and logging
    const trailerResponse = await makeApiCall(
      `Trailer Search for ${title}`,
      () => getGeminiResponse(trailerPrompt, geminiKey, [])
    );

    // Extract YouTube URL from response
    const youtubeUrlMatch = trailerResponse.match(
      /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+/
    );

    if (youtubeUrlMatch) {
      const trailerUrl = youtubeUrlMatch[0];
      console.log("Found trailer URL:", trailerUrl);

      // Convert to embed URL if it's a regular YouTube URL
      let embedUrl = trailerUrl;

      if (trailerUrl.includes("youtube.com/watch?v=")) {
        const videoId = new URL(trailerUrl).searchParams.get("v");
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (trailerUrl.includes("youtu.be/")) {
        const videoId = trailerUrl.split("youtu.be/")[1].split("?")[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }

      return { url: embedUrl, source: "youtube" };
    }

    // If no YouTube URL found, return a search URL as fallback
    const searchQuery = encodeURIComponent(`${title} ${year} official trailer`);
    const searchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;

    return { url: searchUrl, source: "youtube-search" };
  } catch (error) {
    console.error(`Error getting trailer for ${title}:`, error);

    // Provide a fallback search URL
    const searchQuery = encodeURIComponent(`${title} ${year} official trailer`);
    const searchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;

    return { url: searchUrl, source: "youtube-search" };
  }
}

// Function to get response from Gemini API
async function getGeminiResponse(prompt, apiKey, conversation = []) {
  try {
    // Build conversation history
    const messages = conversation.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    // Add current prompt
    messages.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    // Note: We're not using makeApiCall here because this function is called by it
    // This way we avoid infinite recursion
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Gemini API request failed with status ${response.status}`
      );
    }

    const data = await response.json();

    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts
    ) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Unexpected response format from Gemini API");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error(
      "Failed to get response from Gemini. Please check your API key and try again."
    );
  }
}

// Helper function to get stored API keys
async function getStoredKey(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[key]);
      }
    });
  });
}

// Function to directly test RapidAPI key
async function testRapidAPI(apiKey) {
  try {
    console.log(
      "Testing RapidAPI key:",
      apiKey ? "Key exists (hidden for security)" : "Key is missing"
    );

    // Print the first few characters of the API key for troubleshooting (safe to share)
    if (apiKey && apiKey.length > 8) {
      console.log(
        "Key prefix (first 5 chars):",
        apiKey.substring(0, 5) + "..."
      );
      console.log("Key length:", apiKey.length);
    }

    // Use a simple query that should return results
    const url =
      "https://ott-details.p.rapidapi.com/advancedsearch?start_year=2000&end_year=2020&min_imdb=7&max_imdb=10&genre=action&language=english&type=movie&sort=latest&page=1";
    console.log("Making test request to:", url);

    console.log("Using headers:", {
      "x-rapidapi-host": "ott-details.p.rapidapi.com",
      "x-rapidapi-key":
        "First 5 chars: " +
        (apiKey ? apiKey.substring(0, 5) + "..." : "missing"),
    });

    // Use makeApiCall to add delay and logging
    const response = await makeApiCall("Test RapidAPI", () =>
      fetch(url, {
        method: "GET",
        headers: {
          "x-rapidapi-host": "ott-details.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
      })
    );

    console.log("Test API response status:", response.status);
    console.log(
      "Test API response headers:",
      Object.fromEntries([...response.headers.entries()])
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response body:", errorText);
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();
    console.log("Test API response data:", data);

    return {
      status: "success",
      message: `API test successful. Found ${
        data.results?.length || 0
      } movies.`,
      resultCount: data.results?.length || 0,
    };
  } catch (error) {
    console.error("Error testing API:", error);
    throw new Error(`Failed to test RapidAPI: ${error.message}`);
  }
}

// Function to directly test movie search API
async function testMovieSearch(apiKey) {
  try {
    console.log("Testing movie search API");

    // Generate a random page between 1 and 3 for testing
    const randomPage = Math.floor(Math.random() * 3) + 1;

    // Select a random sort method for testing
    const sortOptions = [
      "latest",
      "highest_rated",
      "lowest_rated",
      "year",
      "score",
    ];
    const randomSort =
      sortOptions[Math.floor(Math.random() * sortOptions.length)];

    console.log(
      `Test using random page: ${randomPage} and sort: ${randomSort}`
    );

    // Use action genre for testing - it's likely to have results
    const testGenre = "action";

    // Use a simple standard query that should return results
    const url = `https://ott-details.p.rapidapi.com/advancedsearch?genre=${testGenre}&language=english&type=movie&sort=${randomSort}&page=${randomPage}`;
    console.log("Making test request to:", url);

    // Use makeApiCall to add delay and logging
    const response = await makeApiCall("Test Movie Search API", () =>
      fetch(url, {
        method: "GET",
        headers: {
          "x-rapidapi-host": "ott-details.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
      })
    );

    console.log("Movie search test API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Movie search test error response:", errorText);

      // Provide specific error messages based on status code
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Authentication failed (${response.status}): Your API key may be invalid or you don't have access to this endpoint.`
        );
      } else if (response.status === 429) {
        throw new Error(
          `Rate limit exceeded (${response.status}): You've reached your quota limit for movie searches.`
        );
      } else if (response.status >= 500) {
        throw new Error(
          `Server error (${response.status}): The OTT Details API is experiencing issues.`
        );
      } else {
        throw new Error(
          `API request failed with status ${response.status}: ${errorText}`
        );
      }
    }

    const data = await response.json();

    if (!data || !data.results) {
      throw new Error(
        "Unexpected API response format: Missing 'results' field"
      );
    }

    return {
      status: "success",
      message: `Movie search API test successful. Found ${
        data.results?.length || 0
      } ${testGenre} movies with page ${randomPage} and sort ${randomSort}.`,
      resultCount: data.results?.length || 0,
    };
  } catch (error) {
    console.error("Error testing movie search API:", error);
    throw new Error(`Failed to test movie search API: ${error.message}`);
  }
}
