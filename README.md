# Cetus Project Documentation

This is the main documentation for the Cetus project, a modern e-commerce platform.

## Project Structure

The project follows a monorepo structure, divided into `apps` and `packages`.

### `apps/`

This directory contains the main applications of the project.

-   **`web/`**: The frontend web application.

### `packages/`

This directory contains shared libraries, utilities, and common functionalities used across different applications.

-   **`@cetus/api-client`**: Handles API communication with the backend.
-   **`@cetus/auth`**: Authentication logic for both client and server.
-   **`@cetus/db`**: Database schema definitions and client setup.
-   **`@cetus/env`**: Environment variable management for client and server.
-   **`@cetus/integrations-wompi`**: Integration with the Wompi payment gateway.
-   **`@cetus/schemas`**: Data validation schemas using Arktype.
-   **`@cetus/shared`**: Shared utility functions, constants, types, and helper modules.

## Running the Project

### Development

1.  **Install dependencies:**
    ```bash
    bun install
    ```
    (or `npm install` / `yarn install` if you prefer)

2.  **Start the development server:**
    ```bash
    bun run dev
    ```
    (or `npm run dev`)

### Building for Production

1.  **Build the application:**
    ```bash
    bun run build
    ```
    (or `npm run build`)

2.  **Preview the production build:**
    ```bash
    bun run preview
    ```
    (or `npm run preview`)

### Code Quality

This project uses **Ultracite** and **Biome** for automated formatting and linting, enforcing strict code quality standards.

-   **Format code:** `npx ultracite fix`
-   **Check for issues:** `npx ultracite check`

Core principles include writing code that is accessible, performant, type-safe, and maintainable.

## Environment Variables

Certain environment variables are required to run the project. These are typically defined in a `.env` file located in the `apps/web` directory (following the `.env.example` pattern). Key variables include:

-   `VITE_API_URL`: The base URL for the backend API.
-   `VITE_CDN_URL`: The base URL for the CDN assets.
-   `VITE_POSTHOG_KEY`: PostHog API key for analytics.
-   `VITE_POSTHOG_HOST`: PostHog host URL.
-   `VITE_APP_URL`: The frontend application URL.
-   `DATABASE_URL`: Connection string for the PostgreSQL database.
-   `BETTER_AUTH_SECRET`: Secret key for authentication.
-   `AUTH_GOOGLE_ID`: Google OAuth client ID.
-   `AUTH_GOOGLE_SECRET`: Google OAuth client secret.
-   `MP_ACCESS_TOKEN`: Mercado Pago access token.
-   `MP_CLIENT_SECRET`: Mercado Pago client secret.
-   `MP_CLIENT_ID`: Mercado Pago client ID.
-   `RESEND_API_KEY`: API key for Resend email service.
-   `RESEND_FROM`: The sender email address for Resend.
-   `CORS_ORIGIN`: Allowed CORS origins.

Please refer to `@cetus/env/server` and `@cetus/env/client` for the full schema.
