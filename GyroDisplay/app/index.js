import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeviceMotion } from "expo-sensors";

const { width, height } = Dimensions.get("window");
const CIRCLE_RADIUS = height * 0.2; // Adjusted for landscape mode
const BALL_RADIUS = 10;

// WebSocket connection constants
const WS_HOST = "personal-site-oi5a.onrender.com";
const DEFAULT_IMU_ID = "Steve"; // Default IMU ID

export default function App() {
  // User-configurable IMU ID
  const [imuId, setImuId] = useState(DEFAULT_IMU_ID);
  
  // Logging interval in milliseconds
  const [loggingInterval, setLoggingInterval] = useState(50);
  
  // Current tilt values
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  
  // Position values for the ball
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Flag to track if initial reset has been done
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Debug values to track data flow
  const [debugValues, setDebugValues] = useState({ 
    gyroActive: false, 
    lastUpdate: 0,
    wsConnected: false,
    lastWsMessage: ""
  });
  
  // Sensor subscription
  const [subscription, setSubscription] = useState(null);
  
  // Timer reference for logging
  const loggingTimerRef = useRef(null);
  
  // Counter for tracking updates
  const updateCounterRef = useRef(0);
  
  // Ref to store the latest tilt and position values for logging
  const latestValuesRef = useRef({ tilt: { x: 0, y: 0 }, position: { x: 0, y: 0 } });
  
  // WebSocket reference
  const wsRef = useRef(null);

  // Tilt threshold for red overlay
  const tiltThreshold = 0.3; // Radians (~17 degrees)
  
  // Calculate overlay opacity based on tilt
  const getOverlayOpacity = () => {
    const xTilt = Math.abs(tilt.y);
    if (xTilt <= tiltThreshold) return 0;
    
    // Map tilt from threshold to 1 radian (~57 degrees) to opacity 0 to 0.7
    const maxTilt = 1;
    const opacity = Math.min(((xTilt - tiltThreshold) / (maxTilt - tiltThreshold)) * 0.7, 0.7);
    return opacity;
  };

  useEffect(() => {
    console.log("App initialized - subscribing to sensors");
    _subscribeToSensors();
    _startLogging();
    _connectWebSocket();
    
    return () => {
      _unsubscribeFromSensors();
      _stopLogging();
      _disconnectWebSocket();
    };
  }, [loggingInterval, imuId]);

  // Update the ref whenever tilt changes
  useEffect(() => {
    latestValuesRef.current.tilt = tilt;
  }, [tilt]);

  // Update the ref whenever position changes
  useEffect(() => {
    latestValuesRef.current.position = position;
  }, [position]);

  // WebSocket connection function
  const _connectWebSocket = () => {
    try {
      const wsUrl = `wss://${WS_HOST}/api/ws/imu/${imuId}/upload/`;
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      // Create new WebSocket connection
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log("WebSocket connection established");
        setDebugValues(prev => ({...prev, wsConnected: true}));
      };
      
      wsRef.current.onclose = () => {
        console.log("WebSocket connection closed");
        setDebugValues(prev => ({...prev, wsConnected: false}));
      };
      
      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setDebugValues(prev => ({...prev, wsConnected: false}));
      };
      
      wsRef.current.onmessage = (event) => {
        console.log("WebSocket message received:", event.data);
        setDebugValues(prev => ({...prev, lastWsMessage: event.data}));
      };
    } catch (error) {
      console.error("Error setting up WebSocket:", error);
    }
  };
  
  // WebSocket disconnection function
  const _disconnectWebSocket = () => {
    if (wsRef.current) {
      console.log("Closing WebSocket connection");
      wsRef.current.close();
      wsRef.current = null;
    }
  };
  
  // Function to send data to WebSocket
  const _sendDataToWebSocket = (data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(data);
      wsRef.current.send(message);
    }
  };

  const _startLogging = () => {
    // Clear any existing timer
    if (loggingTimerRef.current) {
      clearInterval(loggingTimerRef.current);
    }
    
    // Set up new logging interval
    loggingTimerRef.current = setInterval(() => {
      // Use the latest values from ref to log the most recent data
      const currentTilt = latestValuesRef.current.tilt;
      const currentPosition = latestValuesRef.current.position;
      
      const logData = {
        timestamp: Date.now(),
        tilt: {
          x: currentTilt.x,
          y: currentTilt.y
        },
        ballPosition: {
          x: currentPosition.x / (CIRCLE_RADIUS * 0.8),
          y: currentPosition.y / (CIRCLE_RADIUS * 0.8)
        },
        gyroscope: {
          x: currentTilt.x,
          y: currentTilt.y,
          z: 0
        },
        accelerometer: {
          x: 0,
          y: 0,
          z: 0
        },
        updateCounter: updateCounterRef.current,
        sensorStatus: debugValues.gyroActive ? "active" : "inactive",
        lastUpdateTime: debugValues.lastUpdate
      };
      
      _sendDataToWebSocket(logData);
      
    }, loggingInterval);
  };
  
  const _stopLogging = () => {
    if (loggingTimerRef.current) {
      clearInterval(loggingTimerRef.current);
      loggingTimerRef.current = null;
    }
  };

  const _subscribeToSensors = () => {
    console.log("Attempting to subscribe to DeviceMotion");

    // Set update interval (in ms)
    DeviceMotion.setUpdateInterval(100);

    // Subscribe to DeviceMotion (gives absolute tilt angles)
    const motionSubscription = DeviceMotion.addListener(({ rotation }) => {
      if (!rotation) return; // Handle cases where data isn't available

      setDebugValues(prev => ({
        ...prev,
        gyroActive: true,
        lastUpdate: Date.now(),
      }));

      updateCounterRef.current += 1;

      // Get absolute rotation values in radians
      const { beta, gamma } = rotation; 
      // beta = pitch (tilt forward/backward)
      // gamma = roll (tilt side to side)

      // Just use the pitch and roll for a landscape orientation
      const tiltX = beta;
      const tiltY = gamma;

      setTilt({
        x: parseFloat(tiltX.toFixed(2)),
        y: parseFloat(tiltY.toFixed(2))
      });

      // Convert tilt angles to ball position
      const scaleFactor = CIRCLE_RADIUS * 0.65;
      let rawX = tiltX * scaleFactor;
      let rawY = tiltY * scaleFactor;

      // Ensure ball stays within the circle
      const distance = Math.sqrt(rawX * rawX + rawY * rawY);
      const maxDistance = CIRCLE_RADIUS - BALL_RADIUS;

      if (distance > maxDistance) {
        const ratio = maxDistance / distance;
        rawX *= ratio;
        rawY *= ratio;
      }

      setPosition({ x: rawX, y: rawY });
    });

    if (motionSubscription) {
      console.log("Successfully subscribed to DeviceMotion");
      setSubscription(motionSubscription);
    } else {
      console.error("Failed to subscribe to DeviceMotion");
      setDebugValues(prev => ({ ...prev, gyroActive: false }));
    }
  };

  const _unsubscribeFromSensors = () => {
    console.log("Unsubscribing from sensors");
    subscription && subscription.remove();
    setSubscription(null);
    setDebugValues(prev => ({
      ...prev,
      gyroActive: false
    }));
  };

  const resetSensors = () => {
    console.log("Resetting sensors");
    // Reset tilt and position
    setTilt({ x: 0, y: 0 });
    setPosition({ x: 0, y: 0 });
    
    // Reset update counter
    updateCounterRef.current = 0;
    
    // Mark as initialized
    setIsInitialized(true);
  };

  const getTiltDescription = () => {
    if (Math.abs(tilt.x) < 0.1 && Math.abs(tilt.y) < 0.1) {
      return "Level";
    }
    
    let description = [];
    
    if (tilt.x < -0.1) description.push("Forward");
    else if (tilt.x > 0.1) description.push("Backward");
    
    if (tilt.y < -0.1) description.push("Right");
    else if (tilt.y > 0.1) description.push("Left");
    
    return description.join(" ");
  };

  return (
    <View style={styles.container}>
      {/* Red overlay when tilted too far */}
      {getOverlayOpacity() > 0 && (
        <View style={[
          styles.redOverlay, 
          { opacity: getOverlayOpacity() }
        ]} />
      )}
      
      {!isInitialized && (
        <View style={styles.initOverlay}>
          <Text style={styles.initText}>Press RESET to initialize</Text>
          <TouchableOpacity style={styles.resetButton} onPress={resetSensors}>
            <Text style={styles.resetButtonText}>RESET</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <Text style={styles.title}>Spine Rehab</Text>
      
      <View style={styles.horizontalContainer}>
        <View style={styles.leftPanel}>
          <View style={styles.dataContainer}>
            {/*<Text style={styles.data}>Tilt: {getTiltDescription()}</Text>
            <Text style={styles.data}>Forward/Back: {tilt.x.toFixed(2)}°</Text>
            <Text style={styles.data}>Left/Right: {tilt.y.toFixed(2)}°</Text>
            <Text style={styles.sensorStatus}>
              Sensor: {debugValues.gyroActive ? "Active" : "Inactive"}
            </Text>*/}
            <Text style={styles.sensorStatus}>
              WebSocket: {debugValues.wsConnected ? "Connected" : "Disconnected"}
            </Text>
            
            <View style={styles.imuContainer}>
              <Text style={styles.imuLabel}>IMU ID:</Text>
              <TextInput
                style={styles.imuInput}
                value={imuId}
                onChangeText={setImuId}
                onBlur={() => _connectWebSocket()}
              />
            </View>
            
            <TouchableOpacity style={styles.resetButton} onPress={resetSensors}>
              <Text style={styles.resetButtonText}>RESET</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.rightPanel}>
          <View style={styles.platformContainer}>
            {/* Direction labels */}
            <Text style={[styles.directionLabel, styles.forwardLabel]}>Forward</Text>
            <Text style={[styles.directionLabel, styles.backwardLabel]}>Backward</Text>
            <Text style={[styles.directionLabel, styles.leftLabel]}>Left</Text>
            <Text style={[styles.directionLabel, styles.rightLabel]}>Right</Text>
            
            {/* Main platform circle */}
            <View style={styles.platformOuter}>
              <View style={styles.platformInner}>
                {/* Grid lines for visual reference */}
                <View style={styles.gridHorizontal} />
                <View style={styles.gridVertical} />
                
                {/* Diagonal grid lines */}
                <View style={[styles.gridDiagonal, { transform: [{ rotate: '45deg' }] }]} />
                <View style={[styles.gridDiagonal, { transform: [{ rotate: '135deg' }] }]} />
                
                {/* Ball that rolls around */}
                <View 
                  style={[
                    styles.ball,
                    {
                      transform: [
                        { translateX: position.x },
                        { translateY: -position.y }
                      ]
                    }
                  ]}
                >
                  <View style={styles.ballHighlight} />
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white', // Adjust as needed
  },
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#1a1f2b",
    padding: 20
  },
  horizontalContainer: {
    flexDirection: 'row',
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40
  },
  leftPanel: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 20
  },
  rightPanel: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 20
  },
  title: { 
    fontSize: 32, 
    fontWeight: "bold", 
    color: "#ffffff",
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 3
  },
  dataContainer: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 15,
    padding: 15,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)"
  },
  data: { 
    fontSize: 20, 
    color: "#ffffff", 
    margin: 5,
    fontWeight: "500"
  },
  sensorStatus: {
    fontSize: 16,
    color: "#aaaaaa",
    marginTop: 10
  },
  imuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20
  },
  imuLabel: {
    fontSize: 16,
    color: "#ffffff",
    marginRight: 10
  },
  imuInput: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10,
    borderRadius: 5,
    color: "#ffffff",
    width: 120,
    fontSize: 16
  },
  platformContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: CIRCLE_RADIUS * 2.2,
    height: CIRCLE_RADIUS * 2.2,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: CIRCLE_RADIUS * 1.1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 13.16,
    elevation: 20,
    position: 'relative'
  },
  directionLabel: {
    position: 'absolute',
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2
  },
  forwardLabel: {
    top: -10,
  },
  backwardLabel: {
    bottom: -15,
  },
  leftLabel: {
    left: -25,
  },
  rightLabel: {
    right: -35,
  },
  platformOuter: {
    width: CIRCLE_RADIUS * 2,
    height: CIRCLE_RADIUS * 2,
    borderRadius: CIRCLE_RADIUS,
    backgroundColor: "#444b5c",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#555d73",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
  },
  platformInner: {
    width: CIRCLE_RADIUS * 1.9,
    height: CIRCLE_RADIUS * 1.9,
    borderRadius: CIRCLE_RADIUS * 0.95,
    backgroundColor: "#2d3447",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1a1f2b",
    overflow: "hidden"
  },
  ball: {
    position: "absolute",
    width: BALL_RADIUS * 2,
    height: BALL_RADIUS * 2,
    borderRadius: BALL_RADIUS,
    backgroundColor: "#ff4d4d",
    borderWidth: 1,
    borderColor: "#ff7777",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  ballHighlight: {
    position: "absolute",
    top: 3,
    left: 3,
    width: BALL_RADIUS * 0.8,
    height: BALL_RADIUS * 0.8,
    borderRadius: BALL_RADIUS * 0.4,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  gridHorizontal: {
    position: "absolute",
    width: CIRCLE_RADIUS * 2,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  gridVertical: {
    position: "absolute",
    width: 1,
    height: CIRCLE_RADIUS * 2,
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  gridDiagonal: {
    position: "absolute",
    width: CIRCLE_RADIUS * 2.8,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)"
  },
  resetButton: {
    backgroundColor: "#4a90e2",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  resetButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold"
  },
  initOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  initText: {
    color: '#ffffff',
    fontSize: 24,
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: 'bold'
  },
  redOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'red',
    zIndex: 5
  }
});