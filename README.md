# Movie Buddy Chrome Extension

A Chrome extension that provides personalized movie recommendations and helps you find where to watch them on your available OTT platforms.

## Features

- Get personalized movie recommendations based on your preferences
- Find which OTT platform has your selected movie
- Integration with Google's Gemini AI for natural language understanding
- Support for multiple OTT platforms in India

## Prerequisites

Before using this extension, you'll need:

1. A Google Gemini API key - [Get it here](https://ai.google.dev/)
2. A RapidAPI key with access to the OTT Details API - [Get it here](https://rapidapi.com/gox-ai-gox-ai-default/api/ott-details)

## Installation

### Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store once it's published.

### Manual Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right corner
4. Click "Load unpacked" and select the directory where you downloaded/cloned this repository
5. The Movie Buddy extension should now appear in your extensions list

## How to Use

1. Click on the Movie Buddy icon in your Chrome extensions bar
2. First-time setup:
   - Enter your Google Gemini API key
   - Enter your RapidAPI key
   - Click "Save Keys"
3. Enter your movie preference (e.g., "I want to watch a sci-fi movie from the 90s")
4. Click "Get Recommendations"
5. Select one of the recommended movies
6. Select the OTT platforms you have subscriptions to
7. Click "Find Where to Watch"
8. View the final recommendation on where to watch the selected movie

## Privacy

Your API keys are stored locally in your browser using Chrome's secure storage API. They are not sent to any server except the respective API services when making requests.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
