/*
  MKR IMU Shield - Simple Euler Angles with LED Display

  This program reads Euler angles from the MKR IMU Shield, connects to WiFi,
  fetches a string from a server, and displays it using an LED matrix.
  The program waits for motion before beginning execution.
  
  Circuit:
  - Arduino MKR board
  - Arduino MKR IMU Shield attached
  - WS2812 LED strip

  Author: Nicholas Wood
  Public Domain
*/

#include <MKRIMU.h>
#include "FastLED.h"
#include <WiFi101.h>
#include <ArduinoHttpClient.h>
#include <map>
#include <vector>

// LED and display settings
#define DATA_PIN 9  
#define LED_TYPE WS2812
#define NUM_LEDS 7
#define BRIGHTNESS 31 
#define COLOR_ORDER GRB
#define ONBOARD_LED 13

std::vector<std::vector<bool>> upperCaseA = {
    {false, false, true,  false, false},
    {false, true,  false, true,  false},
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {true,  true,  true,  true,  true },
    {true,  false, false, false, true },
    {true,  false, false, false, true }
};
  
std::vector<std::vector<bool>> upperCaseB = {
    {true,  true,  true,  true,  false},
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {true,  true,  true,  true,  false},
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {true,  true,  true,  true,  false}
};
  
std::vector<std::vector<bool>> upperCaseC = {
    {false, true,  true,  true,  false},
    {true,  false, false, false, true },
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {true,  false, false, false, true },
    {false, true,  true,  true,  false}
};
  
std::vector<std::vector<bool>> upperCaseD = {
    {true,  true,  true,  true,  false},
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {true,  true,  true,  true,  false}
};
  
std::vector<std::vector<bool>> upperCaseE = {
    {true,  true,  true,  true,  true },
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {true,  true,  true,  true,  false},
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {true,  true,  true,  true,  true }
};
  
std::vector<std::vector<bool>> upperCaseF = {
    {true,  true,  true,  true,  true },
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {true,  true,  true,  true,  false},
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {true,  false, false, false, false}
};
  
std::vector<std::vector<bool>> upperCaseG = {
    {false, true,  true,  true,  false},
    {true,  false, false, false, true },
    {true,  false, false, false, false},
    {true,  false, false, true,  true },
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {false, true,  true,  true,  false}
};
  
std::vector<std::vector<bool>> upperCaseH = {
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {true,  true,  true,  true,  true },
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {true,  false, false, false, true }
};
  
std::vector<std::vector<bool>> upperCaseI = {
    {false, true,  true,  true,  false},
    {false, false, true,  false, false},
    {false, false, true,  false, false},
    {false, false, true,  false, false},
    {false, false, true,  false, false},
    {false, false, true,  false, false},
    {false, true,  true,  true,  false}
};
  
std::vector<std::vector<bool>> upperCaseJ = {
    {false, false, true,  true,  true },
    {false, false, false, false, true },
    {false, false, false, false, true },
    {false, false, false, false, true },
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {false, true,  true,  false, false}
};
  
std::vector<std::vector<bool>> upperCaseN = {
    {true,  false, false, false, true },
    {true,  true,  false, false, true },
    {true,  false, true,  false, true },
    {true,  false, false, true,  true },
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {true,  false, false, false, true }
};
  
std::vector<std::vector<bool>> upperCaseO = {
    {false, true,  true,  true,  false},
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {false, true,  true,  true,  false}
};
  
std::vector<std::vector<bool>> upperCaseZ = {
    {true,  true,  true,  true,  true },
    {false, false, false, false, true },
    {false, false, false, true,  false},
    {false, false, true,  false, false},
    {false, true,  false, false, false},
    {true,  false, false, false, false},
    {true,  true,  true,  true,  true }
};
  
std::vector<std::vector<bool>> upperCaseK = {
    {true,  false, false, true,  false},
    {true,  false, true,  false, false},
    {true,  true,  false, false, false},
    {true,  false, true,  false, false},
    {true,  false, true,  false, false},
    {true,  false, false, true,  false},
    {true,  false, false, true,  false}
};
  
std::vector<std::vector<bool>> upperCaseL = {
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {true,  true,  true,  true,  true }
};
  
std::vector<std::vector<bool>> upperCaseM = {
    {true,  false, false, false, true},
    {true,  true,  false, true,  true},
    {true,  false, true,  false, true},
    {true,  false, true,  false, true},
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {true,  false, false, false, true}
};
  
std::vector<std::vector<bool>> upperCaseP = {
    {true,  true,  true,  true,  false},
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {true,  true,  true,  true,  false},
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {true,  false, false, false, false}
};
  
std::vector<std::vector<bool>> upperCaseQ = {
    {false, true,  true,  true,  false},
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {true,  false, false, true,  false},
    {false, true,  true,  false, true},
    {false, false, false, true,  true}
};
  
std::vector<std::vector<bool>> upperCaseR = {
    {true,  true,  true,  true,  false},
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {true,  true,  true,  true,  false},
    {true,  false, true,  false, false},
    {true,  false, false, true,  false},
    {true,  false, false, false, true}
};
  
std::vector<std::vector<bool>> upperCaseS = {
    {false, true,  true,  true,  true},
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {false, true,  true,  true,  false},
    {false, false, false, false, true},
    {false, false, false, false, true},
    {true,  true,  true,  true,  false}
};
  
std::vector<std::vector<bool>> upperCaseT = {
    {true,  true,  true,  true,  true},
    {false, false, true,  false, false},
    {false, false, true,  false, false},
    {false, false, true,  false, false},
    {false, false, true,  false, false},
    {false, false, true,  false, false},
    {false, false, true,  false, false}
};
  
std::vector<std::vector<bool>> upperCaseU = {
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {false, true,  true,  true,  false}
};
  
std::vector<std::vector<bool>> upperCaseV = {
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {false, true,  false, true,  false},
    {false, true,  false, true,  false},
    {false, false, true,  false, false}
};
  
std::vector<std::vector<bool>> upperCaseW = {
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {true,  false, true,  false, true},
    {true,  true,  false, true,  true},
    {true,  true,  false, true,  true},
    {true,  false, false, false, true}
};
  
std::vector<std::vector<bool>> upperCaseX = {
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {false, true,  false, true,  false},
    {false, false, true,  false, false},
    {false, true,  false, true,  false},
    {true,  false, false, false, true},
    {true,  false, false, false, true}
};
  
std::vector<std::vector<bool>> upperCaseY = {
    {true,  false, false, false, true},
    {true,  false, false, false, true},
    {false, true,  false, true,  false},
    {false, false, true,  false, false},
    {false, false, true,  false, false},
    {false, false, true,  false, false},
    {false, false, true,  false, false}
};
  
std::vector<std::vector<bool>> space = {
    {false,  false, false, false, false},
    {false,  false, false, false, false},
    {false, false,  false, false,  false},
    {false, false, false,  false, false},
    {false, false, false,  false, false},
    {false, false, false,  false, false},
    {false, false, false,  false, false}
};
  
// Digit 0: (Note the center dot in row3 to distinguish from a letter O)
std::vector<std::vector<bool>> digit0 = {
    {false, true,  true,  true,  false},
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {false, false, true,  false, false},
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {false, true,  true,  true,  false}
};
  
// Digit 1:
std::vector<std::vector<bool>> digit1 = {
    {false, false, true,  false, false},
    {false, true,  true,  false, false},
    {false, false, true,  false, false},
    {false, false, true,  false, false},
    {false, false, true,  false, false},
    {false, false, true,  false, false},
    {false, false, true,  false, false}
};
  
// Digit 2:
std::vector<std::vector<bool>> digit2 = {
    {false, true,  true,  true,  false},
    {false, false, false, false, true },
    {false, false, false, false, true },
    {false, true,  true,  true,  false},
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {false, true,  true,  true,  false}
};
  
// Digit 3:
std::vector<std::vector<bool>> digit3 = {
    {false, true,  true,  true,  false},
    {false, false, false, false, true },
    {false, false, false, false, true },
    {false, true,  true,  true,  false},
    {false, false, false, false, true },
    {false, false, false, false, true },
    {false, true,  true,  true,  false}
};
  
// Digit 4:
std::vector<std::vector<bool>> digit4 = {
    {true,  false, false, true,  false},
    {true,  false, false, true,  false},
    {true,  false, false, true,  false},
    {true,  true,  true,  true,  true },
    {false, false, false, true,  false},
    {false, false, false, true,  false},
    {false, false, false, true,  false}
};
  
// Digit 5:
std::vector<std::vector<bool>> digit5 = {
    {false, true,  true,  true,  false},
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {false, true,  true,  true,  false},
    {false, false, false, false, true },
    {false, false, false, false, true },
    {false, true,  true,  true,  false}
};
  
// Digit 6:
std::vector<std::vector<bool>> digit6 = {
    {false, true,  true,  true,  false},
    {true,  false, false, false, false},
    {true,  false, false, false, false},
    {false, true,  true,  true,  false},
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {false, true,  true,  true,  false}
};
  
// Digit 7:
std::vector<std::vector<bool>> digit7 = {
    {false, true,  true,  true,  false},
    {false, false, false, false, true },
    {false, false, false, false, true },
    {false, false, false, false, false},
    {false, false, false, false, true },
    {false, false, false, false, true },
    {false, false, false, false, true }
};
  
// Digit 8:
std::vector<std::vector<bool>> digit8 = {
    {false, true,  true,  true,  false},
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {false, true,  true,  true,  false},
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {false, true,  true,  true,  false}
};
  
// Digit 9:
std::vector<std::vector<bool>> digit9 = {
    {false, true,  true,  true,  false},
    {true,  false, false, false, true },
    {true,  false, false, false, true },
    {false, true,  true,  true,  false},
    {false, false, false, false, true },
    {false, false, false, false, true },
    {false, true,  true,  true,  false}
};
  
// Create the letter map with all letters A-Z

std::map<char, std::vector<std::vector<bool>>> letterMap = {
    {'A', upperCaseA},
    {'B', upperCaseB},
    {'C', upperCaseC},
    {'D', upperCaseD},
    {'E', upperCaseE},
    {'F', upperCaseF},
    {'G', upperCaseG},
    {'H', upperCaseH},
    {'I', upperCaseI},
    {'J', upperCaseJ},
    {'K', upperCaseK},
    {'L', upperCaseL},
    {'M', upperCaseM},
    {'N', upperCaseN},
    {'O', upperCaseO},
    {'P', upperCaseP},
    {'Q', upperCaseQ},
    {'R', upperCaseR},
    {'S', upperCaseS},
    {'T', upperCaseT},
    {'U', upperCaseU},
    {'V', upperCaseV},
    {'W', upperCaseW},
    {'X', upperCaseX},
    {'Y', upperCaseY},
    {'Z', upperCaseZ},
    {'0', digit0},
    {'1', digit1},
    {'2', digit2},
    {'3', digit3},
    {'4', digit4},
    {'5', digit5},
    {'6', digit6},
    {'7', digit7},
    {'8', digit8},
    {'9', digit9},
};

CRGB leds[NUM_LEDS]; // LED array

// WiFi credentials and server URL
const char* ssid = "UofT";
const char* password = "d3K89sh[]12d";
const char* serverAddress = "nickwood5.pythonanywhere.com";
const int port = 80;

WiFiClient wifi;
HttpClient client = HttpClient(wifi, serverAddress, port);

// Function to retrieve a string from the server
String getSwimString() {
    String path = "/get_swim_string";
    client.get(path);
    int statusCode = client.responseStatusCode();
    if (statusCode != 200) {
        return "HTTP Error";
    }
    return client.responseBody();
}

// Store the current character matrix
std::vector<std::vector<bool>> currentString;

// Function to combine characters into a scrollable matrix
std::vector<std::vector<bool>> combineCharacters(std::vector<std::vector<std::vector<bool>>> characters) {
    std::vector<std::vector<bool>> combinedCharacters(7);
    for (size_t i = 0; i < 7; i++) {
        for (const auto& character : characters) {
            combinedCharacters[i].insert(combinedCharacters[i].end(), character[i].begin(), character[i].end());
            combinedCharacters[i].push_back(false); // Space between characters
        }
    }
    return combinedCharacters;
}

// Function to update the display string from the server
void updateCurrentString() {
    String swimString = getSwimString();
    std::vector<std::vector<std::vector<bool>>> fullString;
    for (char c : swimString) {
        fullString.push_back(letterMap[c]);
    }
    currentString = combineCharacters(fullString);
}

// Function to set a static display string
void setString(String swimString) {
    std::vector<std::vector<std::vector<bool>>> fullString;
    for (char c : swimString) {
        fullString.push_back(letterMap[c]);
    }
    currentString = combineCharacters(fullString);
}

// IMU sensor variables
float accX, accY, accZ;
float threshold = 1;

void setup() {
    // Connect to WiFi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
    }

    // Set a default string to display
    setString("HELLO FROM ECE516");

    // Initialize IMU sensor
    if (!IMU.begin()) {
        while (1); // Halt if IMU fails
    }

    // Initialize LED display
    FastLED.addLeds<LED_TYPE, DATA_PIN, COLOR_ORDER>(leds, NUM_LEDS);
    FastLED.setBrightness(BRIGHTNESS);
    FastLED.clear();
    FastLED.show();

    pinMode(ONBOARD_LED, OUTPUT);
    digitalWrite(ONBOARD_LED, LOW);

    // Wait for motion detection before starting
    bool moving = false;
    while (!moving) {
        IMU.readAcceleration(accX, accY, accZ);
        if (abs(accX) > threshold || abs(accY) > threshold || abs(accZ) > threshold) {
            moving = true;
        }
    }
}

int colIndex = 0;

void loop() {
    delay(300);

    // Display current column of the scrolling text
    for (int rowIndex = 0; rowIndex < 7; rowIndex++) {
        int ledRowIndex = 6 - rowIndex;
        leds[ledRowIndex] = currentString[rowIndex][colIndex] ? CRGB::Red : CRGB::Blue;
    }

    // If reached the end of the string, reset
    if (colIndex >= currentString[0].size() - 1) {
        for (int rowIndex = 0; rowIndex < 7; rowIndex++) {
            leds[rowIndex] = CRGB::Blue;
        }
        FastLED.show();
        while (true); // Stop execution
    } else {
        colIndex++;
    }

    FastLED.show();
}
