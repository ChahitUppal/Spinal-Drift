import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { Gyroscope } from "expo-sensors";

const { width } = Dimensions.get("window");
const CIRCLE_RADIUS = width * 0.35;
const BALL_RADIUS = 15;

export default function App() {
  // Logging interval in milliseconds (can be changed)
  const [loggingInterval, setLoggingInterval] = useState(1000);
  
  // Accumulated tilt values that persist
  const [tilt, setTilt] = useState({ x: 0, y: 0, z: 0 });
  
  // Position values for the ball
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Flag to track if initial reset has been done
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Debug values to track data flow
  const [debugValues, setDebugValues] = useState({ gyroActive: false, lastUpdate: 0 });
  
  // Sensor subscription
  const [subscription, setSubscription] = useState(null);
  
  // Timer reference for logging
  const loggingTimerRef = useRef(null);
  
  // Counter for tracking updates
  const updateCounterRef = useRef(0);
  
  // Ref to store the latest tilt and position values for logging
  const latestValuesRef = useRef({ tilt: { x: 0, y: 0, z: 0 }, position: { x: 0, y: 0 } });

  useEffect(() => {
    console.log("App initialized - subscribing to sensors");
    _subscribeToSensors();
    _startLogging();
    
    return () => {
      _unsubscribeFromSensors();
      _stopLogging();
    };
  }, [loggingInterval]);

  // Update the ref whenever tilt changes
  useEffect(() => {
    latestValuesRef.current.tilt = tilt;
  }, [tilt]);

  // Update the ref whenever position changes
  useEffect(() => {
    latestValuesRef.current.position = position;
  }, [position]);

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
      
      // First add debug prints to see if we're getting updates
      // console.log(`DEBUG - Raw tilt: X:${currentTilt.x.toFixed(2)}, Y:${currentTilt.y.toFixed(2)}, Z:${currentTilt.z.toFixed(2)}`);
      // console.log(`DEBUG - Ball position: X:${currentPosition.x.toFixed(2)}, Y:${currentPosition.y.toFixed(2)}`);
      // console.log(`DEBUG - Update counter: ${updateCounterRef.current}`);
      
      const logData = {
        timestamp: new Date().toISOString(),
        tilt: {
          x: currentTilt.x,
          y: currentTilt.y,
          z: currentTilt.z
        },
        ballPosition: {
          x: currentPosition.x / (CIRCLE_RADIUS * 0.8),
          y: currentPosition.y / (CIRCLE_RADIUS * 0.8)
        },
        updateCounter: updateCounterRef.current,
        sensorStatus: debugValues.gyroActive ? "active" : "inactive",
        lastUpdateTime: debugValues.lastUpdate
      };
      
      console.log(JSON.stringify(logData, null, 2));
    }, loggingInterval);
  };

  const _stopLogging = () => {
    if (loggingTimerRef.current) {
      clearInterval(loggingTimerRef.current);
      loggingTimerRef.current = null;
    }
  };

  const _subscribeToSensors = () => {
    console.log("Attempting to subscribe to gyroscope");
    
    // Configure sensor update interval
    Gyroscope.setUpdateInterval(100);

    // Subscribe to gyroscope
    const gyroSubscription = Gyroscope.addListener(data => {
      // Update debug values to track sensor activity
      setDebugValues({
        gyroActive: true,
        lastUpdate: Date.now()
      });
      
      // Increment update counter to track activity
      updateCounterRef.current += 1;
      
      // Store raw data for debugging
      // console.log(`Gyro update: X:${data.x.toFixed(2)}, Y:${data.y.toFixed(2)}, Z:${data.z.toFixed(2)}`);
      
      // Accumulate the tilt - this creates the persistent tilt effect
      setTilt(prevTilt => {
        // Apply a damping factor to avoid excessive values
        const dampingFactor = 0.05;
        const newX = prevTilt.x + (data.x * dampingFactor);
        const newY = prevTilt.y + (data.y * dampingFactor);
        const newZ = prevTilt.z + (data.z * dampingFactor);
        
        // Limit maximum tilt values to avoid excessive movement
        const maxTilt = 1.5;
        const clampedX = Math.max(Math.min(newX, maxTilt), -maxTilt);
        const clampedY = Math.max(Math.min(newY, maxTilt), -maxTilt);
        const clampedZ = Math.max(Math.min(newZ, maxTilt), -maxTilt);
        
        const result = {
          x: parseFloat(clampedX.toFixed(2)),
          y: parseFloat(clampedY.toFixed(2)),
          z: parseFloat(clampedZ.toFixed(2))
        };
        
        // Calculate new ball position based on tilt - FIXED: Swapped x and y orientation
        const scaleFactor = CIRCLE_RADIUS * 0.65; // Reduced to ensure ball stays within circle
        const rawX = result.y * scaleFactor; 
        const rawY = -result.x * scaleFactor; 
        
        // Ensure ball stays within the circle boundaries
        const distance = Math.sqrt(rawX * rawX + rawY * rawY);
        const maxDistance = CIRCLE_RADIUS - BALL_RADIUS;
        
        let newBallX = rawX;
        let newBallY = rawY;
        
        if (distance > maxDistance) {
          const ratio = maxDistance / distance;
          newBallX *= ratio;
          newBallY *= ratio;
        }
        
        setPosition({
          x: newBallX,
          y: newBallY
        });
        
        return result;
      });
    });

    if (gyroSubscription) {
      console.log("Successfully subscribed to gyroscope");
      setSubscription(gyroSubscription);
    } else {
      console.error("Failed to subscribe to gyroscope");
      setDebugValues(prev => ({
        ...prev,
        gyroActive: false
      }));
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
    setTilt({ x: 0, y: 0, z: 0 });
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
    
    // Updated to properly indicate forward/backward based on fixed x-orientation
    if (tilt.x < -0.1) description.push("Backward");
    else if (tilt.x > 0.1) description.push("Forward");
    
    if (tilt.y < -0.1) description.push("Right");
    else if (tilt.y > 0.1) description.push("Left");
    
    return description.join(" ");
  };

  return (
    <View style={styles.container}>
      {!isInitialized && (
        <View style={styles.initOverlay}>
          <Text style={styles.initText}>Press RESET to initialize</Text>
          <TouchableOpacity style={styles.resetButton} onPress={resetSensors}>
            <Text style={styles.resetButtonText}>RESET</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <Text style={styles.title}>Tilt Balance Game</Text>
      
      <View style={styles.dataContainer}>
        <Text style={styles.data}>Tilt: {getTiltDescription()}</Text>
        <Text style={styles.data}>Pitch: {tilt.x.toFixed(2)}°</Text>
        <Text style={styles.data}>Roll: {tilt.y.toFixed(2)}°</Text>
        <Text style={styles.data}>Yaw: {tilt.z.toFixed(2)}°</Text>
        <Text style={styles.sensorStatus}>
          Sensor: {debugValues.gyroActive ? "Active" : "Inactive"}
        </Text>
      </View>
      
      <View style={styles.platformContainer}>
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
      
      <TouchableOpacity style={styles.resetButton} onPress={resetSensors}>
        <Text style={styles.resetButtonText}>RESET</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#1a1f2b",
    padding: 20
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
    marginBottom: 30,
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
  platformContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: CIRCLE_RADIUS * 2.2,
    height: CIRCLE_RADIUS * 2.2,
    marginBottom: 20,
    padding: 10,
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
    width: CIRCLE_RADIUS * 2.8, // Longer to span the entire circle
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)"
  },
  resetButton: {
    backgroundColor: "#4a90e2",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 20,
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
  }
});