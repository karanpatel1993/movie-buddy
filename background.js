// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "searchMovies") {
    searchMovies(request.prompt, request.rapidApiKey)
      .then((movies) => sendResponse({ success: true, movies }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Indicates we'll respond asynchronously
  }

  if (request.action === "getPlatforms") {
    getPlatforms(request.rapidApiKey)
      .then((platforms) => sendResponse({ success: true, platforms }))
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
});

// Function to search for movies using the OTT Details API
async function searchMovies(prompt, apiKey) {
  try {
    console.log("Starting movie search with prompt:", prompt);
    console.log(
      "Using RapidAPI key:",
      apiKey ? "Key exists (hidden for security)" : "Key is missing"
    );

    // First, we'll ask Gemini to extract search parameters from the user's prompt
    const geminiKey = await getStoredKey("geminiKey");
    console.log(
      "Retrieved Gemini key:",
      geminiKey ? "Key exists (hidden for security)" : "Key is missing"
    );

    const searchParamsPrompt = `
      Extract search parameters from the following movie request. Return only a JSON object with these fields:
      - genre: The movie genre (e.g., action, comedy, sci-fi)
      - start_year: Start year for the search (default to 1970 if not specified)
      - end_year: End year for the search (default to current year if not specified)
      - min_imdb: Minimum IMDb rating (default to 6)
      - max_imdb: Maximum IMDb rating (default to 10)
      - language: Movie language (default to english)
      - type: Always set to "movie"
      - sort: How to sort (latest, highest_rated, etc., default to latest)
      - page: Always set to 1
      
      User request: "${prompt}"
      
      Only respond with the JSON, no explanations.
    `;

    console.log("Calling Gemini to extract search parameters");
    const searchParamsResponse = await getGeminiResponse(
      searchParamsPrompt,
      geminiKey,
      []
    );
    console.log("Gemini response:", searchParamsResponse);

    // Parse the JSON response from Gemini
    let searchParams;
    try {
      searchParams = JSON.parse(searchParamsResponse.trim());
      console.log("Parsed search parameters:", searchParams);
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.log(
        "Raw response that couldn't be parsed:",
        searchParamsResponse
      );
      throw new Error("Failed to parse search parameters from Gemini response");
    }

    // Make the API request to OTT Details
    const url = new URL("https://ott-details.p.rapidapi.com/advancedsearch");

    // Add query parameters
    Object.keys(searchParams).forEach((key) => {
      url.searchParams.append(key, searchParams[key]);
    });

    console.log("Making request to OTT Details API:", url.toString());
    console.log("Headers:", {
      "x-rapidapi-host": "ott-details.p.rapidapi.com",
      "x-rapidapi-key": "Key exists (hidden for security)",
    });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "ott-details.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
    });

    console.log("OTT API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response body:", errorText);
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();
    console.log("OTT API response data:", data);

    return data.results || [];
  } catch (error) {
    console.error("Error searching movies:", error);
    throw new Error(
      "Failed to search for movies. Please check your API key and try again."
    );
  }
}

// Function to get available OTT platforms
async function getPlatforms(apiKey) {
  try {
    console.log(
      "Getting platforms with RapidAPI key:",
      apiKey ? "Key exists (hidden for security)" : "Key is missing"
    );

    const url = "https://ott-details.p.rapidapi.com/getPlatforms?region=IN";
    console.log("Making request to:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "ott-details.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
    });

    console.log("Platforms API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response body:", errorText);
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();
    console.log("Platforms API response data:", data);

    return data.offers || [];
  } catch (error) {
    console.error("Error getting platforms:", error);
    throw new Error(
      "Failed to get OTT platforms. Please check your API key and try again."
    );
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

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "ott-details.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
    });

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
