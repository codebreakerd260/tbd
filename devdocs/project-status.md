# Project Status (as of 2025-10-16)

## Current Stage: Prototype / MVP (Minimum Viable Product)

The project is currently at a **Prototype/MVP** stage.

### Justification:
- **Beyond Proof of Concept (PoC):** The core end-to-end functionality is implemented and working. The ESP32 robot client can connect to the Fastify WebSocket server, which in turn communicates with the Next.js web dashboard. Real telemetry data is being sent, and control commands can be issued from the dashboard to the robot.
- **Not Yet Production-Ready:** The application lacks key features required for a production release, including comprehensive tests, robust error handling in all scenarios, deployment configurations, and the full set of user experience enhancements.
- **Why MVP:** It represents the minimum set of features that allows for a complete user cycle: connecting, controlling the robot, and viewing its telemetry. The architecture is solid and serves as an excellent foundation for building out the features outlined in the roadmap below.

---

## Next Steps Roadmap

The following roadmap outlines the planned enhancements to move the project from its current MVP state towards a production-ready application.

### Phase 1: Polish the Existing Experience
*   **Improve Joystick Control:** Implement continuous command streaming while the joystick is in use for smoother, more responsive control. Add a deadzone to prevent accidental minor movements.
*   **Enhance Live Map Visualization:**
    *   Rotate the robot icon on the canvas to match its real-world orientation (`pose.theta`).
    *   Consider advanced visualizations like fading older scan points or keeping the robot centered while the map moves (odometry simulation).

### Phase 2: Expand Features
*   **Expand Telemetry:** Add more diagnostic data from the firmware (e.g., WiFi RSSI, main loop processing time) and display it on the dashboard.
*   **Improve Control UX:** Add an on-screen slider to control the robot's maximum speed.
*   **Lightweight Local Mapping:** Aggregate scan points over time (in global coordinates) to create a persistent obstacle map, providing a basic SLAM-like visualization.

### Phase 3: Scale the Architecture
*   **Enable Multi-Robot Support:**
    *   Modify the WebSocket connection logic to handle unique robot IDs (e.g., `/ws/robot?id=robot1`).
    *   Update the backend to manage multiple WebSocket connections in a map.
    *   Update the frontend to allow users to select which robot to monitor and control.

### Phase 4: Productionalization
*   **Add Comprehensive Testing:**
    *   Unit and integration tests for the `api` server.
    *   Component and end-to-end tests for the `web` application.
*   **Deployment:**
    *   Host the Fastify API on a cloud service (e.g., Render, Railway).
    *   Deploy the Next.js frontend to a dedicated hosting platform (e.g., Vercel).
    *   Update the ESP32 client to connect to the deployed server.

### Stretch Goals (Future Iterations)
*   Integrate an IMU (e.g., MPU6050) for more accurate pose estimation.
*   Add a camera for video streaming or basic computer vision tasks.
*   Integrate with ROS (Robot Operating System) for access to a full autonomy stack.