# Open Source Contribution Finder

A web application that helps developers find beginner-friendly GitHub repositories based on programming language, with README summarization capabilities.

## Features

- Search repositories by programming language
- Filter by "good first issue" labels
- Sort by various metrics (stars, forks, recent activity)
- Display repository details in a clean, accessible UI
- Toggle between dark and light modes
- Summarize repository README to understand the project quickly
- Implement local storage caching to avoid hitting API rate limits

## Prerequisites

- A modern web browser with JavaScript enabled
- A GitHub Personal Access Token (for better API rate limits)
- A Hugging Face API Token (for README summarization)

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/open-source-contribution-finder.git
   cd open-source-contribution-finder
   ```

2. Obtain API Keys:

   ### GitHub API Token
   1. Go to [GitHub Settings](https://github.com/settings/tokens)
   2. Click "Generate new token"
   3. Select the following scopes:
      - `repo` (for repository access)
      - `read:org` (for organization access)
   4. Copy the generated token

   ### Hugging Face API Token
   1. Go to [Hugging Face](https://huggingface.co/settings/tokens)
   2. Create a new token
   3. Copy the generated token

3. Configure API Keys:
   - Open `index.html`
   - Replace `YOUR_HUGGINGFACE_API_KEY` with your Hugging Face API token
   - (Optional) Add GitHub token to the `searchRepositories` function in `script.js`

4. Run the Application:
   - Open `index.html` in your web browser
   - Or use a local server:
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js
     npx serve
     ```

## Usage

1. Enter a programming language in the search box (e.g., "JavaScript", "Python")
2. Use the sort dropdown to change sorting criteria
3. Toggle the "good first issue" checkbox to filter repositories
4. Click on "View README" to see a summary and full README content
5. Use the moon/sun icon to switch between dark and light modes

## API Documentation

### GitHub API Integration

The application uses the following GitHub API endpoints:

- `GET /search/repositories`: Search for repositories
  - Query parameters:
    - `language`: Programming language
    - `label`: "good first issue" (optional)
    - `sort`: stars, forks, or updated
    - `order`: desc

- `GET /repos/{owner}/{repo}/readme`: Fetch repository README
  - Returns raw README content

### Hugging Face API Integration

The application uses the following Hugging Face API endpoint:

- `POST /models/facebook/bart-large-cnn`: Summarize text
  - Input: README content (limited to 1024 characters)
  - Output: Summarized text

## Resource Attribution

### APIs and Services

1. **GitHub API**
   - Provider: GitHub, Inc.
   - Documentation: [GitHub REST API](https://docs.github.com/en/rest)
   - Rate Limits: 60 requests/hour (authenticated), 30 requests/hour (unauthenticated)

2. **Hugging Face API**
   - Provider: Hugging Face, Inc.
   - Model: facebook/bart-large-cnn
   - Documentation: [Hugging Face Inference API](https://huggingface.co/docs/inference-endpoints/index)
   - Rate Limits: Varies by account type

### Libraries and Resources

- Font: System UI fonts (no external dependencies)
- Icons: Emoji (built-in)
- CSS: Custom CSS with CSS Variables for theming

## Browser Support

The application is compatible with all modern browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- GitHub for providing the repository search API
- Hugging Face for the text summarization model
- The open-source community for inspiration and resources

## Support

For support, please open an issue in the GitHub repository or contact the maintainers. 