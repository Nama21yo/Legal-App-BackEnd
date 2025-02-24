# The Legacy App - Backend

## Overview

The Legacy App is a backend system for a mobile application that serves as a platform for funeral-related services. It enables users to post their statuses regarding headstones, funeral homes, insurance, and other related aspects. The backend is built to handle real-time updates through WebSockets, ensuring seamless communication and interaction between users.

## Features

- **User Management**: Handles user authentication, registration, and profile management.
- **Status Posting**: Allows users to post and update their funeral-related statuses.
- **Real-Time Updates**: Uses WebSockets for instant status updates and notifications.
- **Service Listings**: Provides information about funeral homes, headstones, and insurance services.
- **Database Integration**: Stores user data, posts, and service details securely.
- **API Endpoints**: RESTful API for frontend communication.
- **Security**: Implements authentication and authorization for secure access.

## Technology Stack

- **Backend Framework**: Node.js and Express
- **Database**: MongoDB
- **WebSockets**: Used for real-time communication
- **Authentication**: JWT or OAuth for secure login
- **Cloud Storage**: Google Cloud Platform
- **Deployment**: Hosted on GCP

## Installation & Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/the-legacy-app.git
   cd the-legacy-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file to include your database credentials and API keys.
4. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

| Method | Endpoint             | Description                  |
| ------ | -------------------- | ---------------------------- |
| GET    | `/api/status`        | Fetch all statuses           |
| POST   | `/api/status`        | Create a new status          |
| GET    | `/api/services`      | Get list of funeral services |
| POST   | `/api/auth/register` | User registration            |
| POST   | `/api/auth/login`    | User login                   |

## WebSocket Implementation

- WebSockets are used to provide real-time updates when a user posts a status.
- Clients subscribe to updates and receive notifications instantly.

## Contribution

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-branch
   ```
3. Commit your changes:
   ```bash
   git commit -m "Added new feature"
   ```
4. Push to your branch:
   ```bash
   git push origin feature-branch
   ```
5. Open a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
