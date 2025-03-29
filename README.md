# Open Source Contribution Finder

A web application that helps developers find beginner-friendly GitHub repositories based on programming language, with README and CONTRIBUTING summarization capabilities.

## 📹 Demo Video

[Watch the OSCF Demo on YouTube](https://www.youtube.com/watch?v=TTCtIWDNsLg)

## 🌟 Features

- Summarize repository README and CONTRIBUTING (if available) to understand projects quickly
- Search repositories by programming language
- Filter by "good first issue" labels
- Sort by various metrics (stars, forks, recent activity)
- Display repository details in a clean, accessible UI
- Toggle between dark and light modes
- Save favorite repositories to localStorage for future reference

## 🛠️ APIs & Technologies

- GitHub API for repository data
- Hugging Face API (facebook-large-bart-cnn) for text summarization
- Backend: Node.js with Express
- Process Management: PM2 on web servers
- Web Servers: NGINX (web-01, web-02)
- Load Balancer: HAProxy (lb-01)

## ⚙️ Prerequisites

- A modern web browser with JavaScript enabled
- A GitHub Personal Access Token (for better API rate limits)
- A Hugging Face API Token (for README summarization)

## 🚀 Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/bienvenudev/oscf.git
   cd oscf
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
   - Create a `.env` file in the root directory with:
     ```
     HUGGINGFACE_API_TOKEN="your hf token"
     GITHUB_TOKEN="your token"
     ```
   - The GitHub token is optional but recommended for better API rate limits

4. Run the Application:
   - Install dependencies:
     ```bash
     npm install
     ```
   - For production:
     ```bash
     npm start
     ```
   - For development:
     ```bash
     npm run dev
     ```
   - Or run the backend directly:
     ```bash
     node server.js
     ```

## 📋 Usage

1. Enter a programming language in the search box (e.g., "JavaScript", "Python")
2. Use the sort dropdown to change sorting criteria
3. Toggle the "good first issue" checkbox to filter repositories
4. Click on "View README" to see a summary and full README content
5. Use the moon/sun icon to switch between dark and light modes
6. Click the star icon to save a repository to favorites (stored in localStorage)

## 📖 API Documentation

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

## 🌐 Deployment

The application is deployed on two Amazon web servers (web-01 and web-02) that serve the application via NGINX. A load balancer server (lb-01) maps to the domain www.bienvenudev.tech via A record and distributes traffic evenly across web-01 and web-02 using HAProxy.

### Web Servers Setup (web-01 and web-02)

1. **Application Deployment**
   - Application files are placed in `/var/www/contribution-finder`
   - The backend Node.js application is managed using PM2:
     ```bash
     # Install PM2 globally
     npm install -g pm2
     
     # Start the application with PM2
     cd /var/www/contribution-finder
     pm2 start server.js --name "contribution-finder"
     
     # Ensure PM2 starts on system boot
     pm2 startup
     pm2 save
     ```

2. **NGINX Configuration**
   - Created a server block in `/etc/nginx/sites-available/contribution-finder`:
     ```nginx
     server {
         listen 80 default_server;
         server_name www.bienvenudev.tech;

         location / {
             root /var/www/contribution-finder;

             proxy_pass http://127.0.0.1:3001;
             proxy_http_version 1.1;
             proxy_set_header Upgrade $http_upgrade;
             proxy_set_header Connection 'upgrade';
             proxy_set_header Host $host;
             proxy_cache_bypass $http_upgrade;

             # Allow CORS
             add_header Access-Control-Allow-Origin *;
             add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
             add_header Access-Control-Allow-Headers 'Origin, Content-Type, Accept, Authorization';

             add_header X-Served-By $hostname;
         }
     }
     ```
   - Enabled the site:
     ```bash
     ln -s /etc/nginx/sites-available/contribution-finder /etc/nginx/sites-enabled/
     nginx -t
     systemctl restart nginx
     ```

### Load Balancer Setup (lb-01)

1. **HAProxy Configuration**
   - Configured HAProxy in `/etc/haproxy/haproxy.cfg`:
     ```
     global
         log 127.0.0.1 local0 notice
         maxconn 2000
         user haproxy
         group haproxy

     defaults
         log     global
         mode    http
         option  httplog
         option  dontlognull
         retries 3
         option redispatch
         timeout connect  5000
         timeout client  10000
         timeout server  10000

     frontend http-front
         bind *:80
         # Perform a 301 redirect to the HTTPS version of the URL
         http-request redirect scheme https code 301 unless { ssl_fc }
         reqadd X-Forwarded-Proto:\ http
         default_backend lb-back

     frontend https-front
         bind *:443 ssl crt /etc/haproxy/certs/www.bienvenudev.tech.pem
         reqadd X-Forwarded-Proto:\ https
         default_backend lb-back

     backend lb-back
         balance roundrobin
         server web-01 18.212.50.164:80 check
         server web-02 44.206.233.118:80 check
     ```
   - Restarted HAProxy:
     ```bash
     systemctl restart haproxy
     ```

2. **SSL Certificate Setup**
   - Obtained SSL certificate for www.bienvenudev.tech
   - Combined certificate and private key into a PEM file
   - Placed at `/etc/haproxy/certs/www.bienvenudev.tech.pem`

3. **Testing Load Balancing**
   - Verified load balancing with:
     ```bash
     curl -sI https://www.bienvenudev.tech
     ```
   - Confirmed different web servers are served based on the 'X-Served-By' header
   - Verified that HTTP requests are properly redirected to HTTPS

## 🔒 Security Considerations

- API tokens are stored in `.env` file and added to `.gitignore` to avoid exposing them in the public repository
- HTTPS is enforced via HAProxy configuration
- CORS headers are properly configured to allow necessary origins

## 💻 Browser Support

The application is compatible with all modern browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🔄 Resource Attribution

### APIs and Services

1. **GitHub API**
   - Provider: GitHub, Inc.
   - Documentation: [GitHub REST API](https://docs.github.com/en/rest)
   - Rate Limits: 60 requests/hour (unauthenticated), 5000 requests/hour (authenticated using a personal access token or OAuth token)

2. **Hugging Face API**
   - Provider: Hugging Face, Inc.
   - Model: facebook/bart-large-cnn
   - Documentation: [Hugging Face Inference API](https://huggingface.co/docs/inference-endpoints/index)
   - Rate Limits: Varies by account type

### Libraries and Resources

- Font: System UI fonts (no external dependencies)
- Icons: Emoji (built-in)
- CSS: Custom CSS with CSS Variables for theming

## 🚧 Challenges and Solutions

During the development and deployment of this project, I encountered several challenges:

1. **Backend API Token Management**
   - **Challenge**: Setting up the backend to securely serve the Hugging Face API token
   - **Solution**: Implemented environment variables with dotenv to keep tokens secure

2. **Production Deployment**
   - **Challenge**: Needed a way to keep the Node.js application running reliably on the web servers
   - **Solution**: Implemented PM2 for process management, which provides automatic restarts and logging

3. **CORS Issues**
   - **Challenge**: Encountered Cross-Origin Resource Sharing restrictions when making API calls
   - **Solution**: Configured proper CORS headers in NGINX and Express to allow necessary origins and methods

4. **Load Balancer Configuration**
   - **Challenge**: Setting up HAProxy to properly distribute traffic and handle SSL termination
   - **Solution**: Implemented roundrobin algorithm and configured SSL certificates for secure connections

## 👥 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b ft/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin ft/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- ALU for this wonderful challenge
- GitHub for providing the repository search API
- Hugging Face for the text summarization model
- The open-source community for inspiration and resources

## 📧 Support

For support, please open an issue in the GitHub repository or contact me directly.
