#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// ========== CONFIGURATION ==========
// ⚠️ UPDATE THESE FOR YOUR NETWORK!
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend server (your laptop IP)
const char* WS_HOST = "192.168.1.100"; // ⚠️ CHANGE THIS!
const uint16_t WS_PORT = 3001;
const char* WS_PATH = "/ws/robot";

// Motor pins (L298N)
const int IN1 = 14;
const int IN2 = 12;
const int IN3 = 27;
const int IN4 = 26;
const int ENA = 25;
const int ENB = 33;

// Sensor pins
const int TRIG_PIN = 4;
const int ECHO_PIN = 16;
const int SERVO_PIN = 13;
const int BATTERY_PIN = 34;

// Robot parameters
const float WHEEL_BASE = 0.12;
const float MAX_SPEED = 0.3;
const float MAX_ANGULAR = 2.0;

// PWM channels
const int PWM_FREQ = 20000;
const int PWM_RES = 8;
const int PWM_CH_LEFT = 0;
const int PWM_CH_RIGHT = 1;

// ========== GLOBAL STATE ==========
WebSocketsClient webSocket;
Servo scanServo;

bool autopilotEnabled = false;
float cmdLinear = 0.0;
float cmdAngular = 0.0;

float poseX = 0.0;
float poseY = 0.0;
float poseTheta = 0.0;
unsigned long lastPoseUpdate = 0;

unsigned long lastTelemetry = 0;
const unsigned long TELEMETRY_INTERVAL = 100;

float batteryVoltage = 7.4;
int batteryPercentage = 100;

// ========== HELPER FUNCTIONS ==========

long measureDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;

  return (duration / 2) / 29.1;
}

void updateBattery() {
  int raw = analogRead(BATTERY_PIN);
  batteryVoltage = (raw / 4095.0) * 3.3 * 2.0;
  batteryPercentage = constrain(
    map((int)(batteryVoltage * 10), 60, 84, 0, 100),
    0, 100
  );
}

void motorStop() {
  ledcWrite(PWM_CH_LEFT, 0);
  ledcWrite(PWM_CH_RIGHT, 0);
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
}

void setMotorSpeeds(float linear, float angular) {
  float vLeft = linear - (angular * WHEEL_BASE / 2.0);
  float vRight = linear + (angular * WHEEL_BASE / 2.0);

  vLeft = constrain(vLeft, -MAX_SPEED, MAX_SPEED);
  vRight = constrain(vRight, -MAX_SPEED, MAX_SPEED);

  auto applyMotor = [](float v, int inA, int inB, int pwmCh) {
    int speed = abs((int)((v / MAX_SPEED) * 255.0));
    speed = constrain(speed, 0, 255);

    if (v >= 0) {
      digitalWrite(inA, HIGH);
      digitalWrite(inB, LOW);
    } else {
      digitalWrite(inA, LOW);
      digitalWrite(inB, HIGH);
    }

    ledcWrite(pwmCh, speed);
  };

  applyMotor(vLeft, IN1, IN2, PWM_CH_LEFT);
  applyMotor(vRight, IN3, IN4, PWM_CH_RIGHT);
}

void updatePose(float dt) {
  float v = autopilotEnabled ? 0.15 : cmdLinear;
  float w = autopilotEnabled ? 0.0 : cmdAngular;

  float dx = v * cos(poseTheta) * dt;
  float dy = v * sin(poseTheta) * dt;
  float dTheta = w * dt;

  poseX += dx;
  poseY += dy;
  poseTheta += dTheta;

  while (poseTheta > PI) poseTheta -= 2 * PI;
  while (poseTheta < -PI) poseTheta += 2 * PI;
}

void sendTelemetry() {
  StaticJsonDocument<1024> doc;

  doc["type"] = "telemetry";

  JsonObject pose = doc.createNestedObject("pose");
  pose["x"] = poseX;
  pose["y"] = poseY;
  pose["theta"] = poseTheta;

  JsonArray scan = doc.createNestedArray("scan");
  JsonObject scanPoint = scan.createNestedObject();
  scanPoint["angle"] = 0;
  scanPoint["distCm"] = measureDistanceCm();

  JsonObject speed = doc.createNestedObject("speed");
  speed["leftRps"] = cmdLinear / (0.065 * PI);
  speed["rightRps"] = cmdLinear / (0.065 * PI);

  JsonObject battery = doc.createNestedObject("battery");
  battery["voltage"] = batteryVoltage;
  battery["percentage"] = batteryPercentage;

  doc["status"] = autopilotEnabled ? "autopilot" : "manual";
  doc["timestamp"] = millis();

  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}

void performSweepScan(int startDeg, int endDeg, int stepDeg) {
  StaticJsonDocument<4096> doc;
  doc["type"] = "telemetry";

  JsonObject pose = doc.createNestedObject("pose");
  pose["x"] = poseX;
  pose["y"] = poseY;
  pose["theta"] = poseTheta;

  JsonArray scan = doc.createNestedArray("scan");

  for (int angle = startDeg; angle <= endDeg; angle += stepDeg) {
    scanServo.write(angle + 90);
    delay(120);

    long dist = measureDistanceCm();

    JsonObject point = scan.createNestedObject();
    point["angle"] = angle;
    point["distCm"] = dist;
  }

  scanServo.write(90);

  JsonObject speed = doc.createNestedObject("speed");
  speed["leftRps"] = 0;
  speed["rightRps"] = 0;

  JsonObject battery = doc.createNestedObject("battery");
  battery["voltage"] = batteryVoltage;
  battery["percentage"] = batteryPercentage;

  doc["status"] = autopilotEnabled ? "autopilot" : "manual";
  doc["timestamp"] = millis();

  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}

void runAutopilot() {
  long dist = measureDistanceCm();

  if (dist > 0 && dist < 25) {
    setMotorSpeeds(0.0, 0.0);
    delay(100);
    setMotorSpeeds(0.0, 0.8);
    delay(500);
    setMotorSpeeds(0.0, 0.0);
    delay(100);
  } else {
    setMotorSpeeds(0.15, 0.0);
  }
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("🔴 Disconnected from server");
      motorStop();
      break;

    case WStype_CONNECTED:
      Serial.printf("✅ Connected to %s\n", WS_HOST);
      break;

    case WStype_TEXT: {
      StaticJsonDocument<512> doc;
      DeserializationError error = deserializeJson(doc, payload, length);

      if (error) {
        Serial.print("JSON parse error: ");
        Serial.println(error.c_str());
        return;
      }

      const char* cmdType = doc["type"];

      if (strcmp(cmdType, "cmd_vel") == 0) {
        cmdLinear = doc["linear"] | 0.0;
        cmdAngular = doc["angular"] | 0.0;
        autopilotEnabled = false;
        setMotorSpeeds(cmdLinear, cmdAngular);
        Serial.printf("CMD: linear=%.2f angular=%.2f\n", cmdLinear, cmdAngular);
      }
      else if (strcmp(cmdType, "autopilot") == 0) {
        autopilotEnabled = doc["enabled"] | false;
        Serial.printf("Autopilot: %s\n", autopilotEnabled ? "ON" : "OFF");
        if (!autopilotEnabled) {
          motorStop();
        }
      }
      else if (strcmp(cmdType, "scan") == 0) {
        int startDeg = doc["startDeg"] | -90;
        int endDeg = doc["endDeg"] | 90;
        int stepDeg = doc["stepDeg"] | 15;
        Serial.println("Performing sweep scan...");
        performSweepScan(startDeg, endDeg, stepDeg);
      }
      else if (strcmp(cmdType, "reset_pose") == 0) {
        poseX = poseY = poseTheta = 0.0;
        Serial.println("Pose reset");
      }
      break;
    }
  }
}

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  Serial.println("\n🤖 Robot Client Starting...");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(BATTERY_PIN, INPUT);

  ledcSetup(PWM_CH_LEFT, PWM_FREQ, PWM_RES);
  ledcSetup(PWM_CH_RIGHT, PWM_FREQ, PWM_RES);
  ledcAttachPin(ENA, PWM_CH_LEFT);
  ledcAttachPin(ENB, PWM_CH_RIGHT);

  motorStop();

  scanServo.attach(SERVO_PIN);
  scanServo.write(90);

  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi connection failed!");
    return;
  }

  Serial.printf("Connecting to WebSocket: ws://%s:%d%s\n", WS_HOST, WS_PORT, WS_PATH);
  webSocket.begin(WS_HOST, WS_PORT, WS_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  lastPoseUpdate = millis();
  Serial.println("🚀 Setup complete");
}

// ========== MAIN LOOP ==========
void loop() {
  webSocket.loop();

  unsigned long now = millis();

  static unsigned long lastBatteryRead = 0;
  if (now - lastBatteryRead > 5000) {
    updateBattery();
    lastBatteryRead = now;
  }

  if (autopilotEnabled) {
    static unsigned long lastAutopilotUpdate = 0;
    if (now - lastAutopilotUpdate > 100) {
      runAutopilot();
      lastAutopilotUpdate = now;
    }
  }

  float dt = (now - lastPoseUpdate) / 1000.0;
  if (dt > 0.025) {
    updatePose(dt);
    lastPoseUpdate = now;
  }

  if (now - lastTelemetry >= TELEMETRY_INTERVAL) {
    sendTelemetry();
    lastTelemetry = now;
  }

  delay(5);
}
