# Codebase Overview

This document provides a high-level overview of the `robot-control` monorepo, its packages, and how they interact.

## Project Structure

The project is a monorepo managed with npm workspaces and Turbo. It consists of three main packages:

-   `apps/api`: A Node.js backend server that acts as a bridge between the robot and web clients.
-   `apps/web`: A Next.js web application that provides a dashboard for controlling and monitoring the robot.
-   `packages/types`: A shared TypeScript library that defines the data structures used for communication between the other packages.

## Packages

### `packages/types`

This package is the "source of truth" for the data structures used throughout the system. It defines:

-   **`CommandMessage`**: The commands that can be sent from the web client to the robot (e.g., `cmd_vel`, `autopilot`).
-   **`TelemetryMessage`**: The data sent from the robot to the web client (e.g., `pose`, `scan`, `speed`).
-   **`StatusMessage`** and **`ErrorMessage`**: Messages for communicating connection status and errors.
-   **`RobotConfig`**: The robot's physical configuration (e.g., `wheelBase`, `maxSpeed`).

### `apps/api`

The `api` is a Fastify server with two main responsibilities:

1.  **Robot Communication**: It exposes a WebSocket endpoint (`/ws/robot`) for the robot (presumably an ESP32) to connect to. It listens for telemetry messages from the robot and forwards commands to it.
2.  **Web Client Communication**: It exposes a WebSocket endpoint (`/ws/client`) for web clients to connect to. It broadcasts telemetry data to all connected clients and receives commands from them.

It also provides a few REST endpoints for getting the system's status (`/api/status`) and the latest telemetry data (`/api/telemetry/latest`).

### `apps/web`

The `web` application is a Next.js-based dashboard for controlling the robot. Its key features are:

-   **Real-time Monitoring**: It displays the robot's position, speed, and other telemetry data in real-time.
-   **Live Map**: It visualizes the robot's environment and position on a canvas.
-   **Robot Control**: It provides a joystick for manual control and buttons for quick actions like enabling autopilot or triggering a scan.
-   **State Management**: It uses Zustand for managing the application's state, including the robot's telemetry data and connection status.
-   **Communication**: It uses a custom `useWebSocket` hook to communicate with the `api` server.

## How it Works

1.  The **robot** connects to the `api` server's `/ws/robot` endpoint.
2.  The **web client** connects to the `api` server's `/ws/client` endpoint.
3.  The **robot** sends `TelemetryMessage`s to the `api` server.
4.  The **`api` server** broadcasts the `TelemetryMessage`s to all connected **web clients**.
5.  The **web client** updates its UI with the new telemetry data.
6.  The user interacts with the **web client's** UI, which sends `CommandMessage`s to the `api` server.
7.  The **`api` server** forwards the `CommandMessage`s to the **robot**.
8.  The **robot** executes the command.

This architecture allows for a clean separation of concerns, with the `api` server acting as a central hub for communication and the `web` application providing a user-friendly interface for controlling the robot. The `types` package ensures that all components are using the same data structures, which helps to prevent bugs and makes the code easier to maintain.

## Getting Started

To run the project, you will need to have Node.js and npm installed.

1.  **Install Dependencies**: Run `npm install` in the root of the project to install all the necessary dependencies for each package.
2.  **Build the Project**: Run `npm run build` to compile the TypeScript code in all packages.
3.  **Run the Development Servers**:
    -   To run both the `api` and `web` servers concurrently, run `npm run dev` in the root of the project.
    -   To run only the `api` server, run `npm run dev:api`.
    -   To run only the `web` server, run `npm run dev:web`.

Once the servers are running, you can access the web dashboard at `http://localhost:3000`.

## Potential Improvements

The codebase is well-structured and clean, but here are a few suggestions for potential improvements:

-   **Add Unit and Integration Tests**: There are currently no tests in the project. Adding tests for the `api` server's WebSocket and REST endpoints, as well as for the `web` application's components and hooks, would improve the project's reliability and maintainability.
-   **Environment Variable Management**: The configuration for the `api` server's CORS origin and the `web` application's WebSocket URL is hardcoded. Using a library like `dotenv` to manage environment variables would make the project more configurable and easier to deploy in different environments.
-   **Error Handling**: The error handling in the `api` server could be improved. For example, it could send more specific error messages to the web client when a command fails.
-   **Add a Linter to the `api` Package**: The `web` package has a linter, but the `api` package does not. Adding a linter to the `api` package would help to enforce a consistent coding style and catch potential errors.
-   **Component Storybook**: For the `web` application, using a tool like Storybook would allow for the development and testing of UI components in isolation, which can improve the development workflow and the quality of the components.