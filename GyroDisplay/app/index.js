import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from "react-native";
import { Gyroscope, Magnetometer } from "expo-sensors";

const { width } = Dimensions.get("window");
const CIRCLE_RADIUS = width * 0.35;
const INDICATOR_RADIUS = 15;

export default function App() {
  // Logging interval in milliseconds (can be changed)
  const [loggingInterval, setLoggingInterval] = useState(1000);
  
  // Accumulated tilt values that persist
  const [tilt, setTilt] = useState({ x: 0, y: 0, z: 0 });
  
  // Raw sensor values
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  
  // Compass heading
  const [heading, setHeading] = useState(0);
  const [calibratedHeading, setCalibratedHeading] = useState(0);
  const [headingOffset, setHeadingOffset] = useState(0);
  
  // Position values for the small indicator circle
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Flag to track if initial reset has been done
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Sensor subscriptions
  const [subscription, setSubscription] = useState(null);
  const [magnetSubscription, setMagnetSubscription] = useState(null);
  
  // Timer reference for logging
  const loggingTimerRef = useRef(null);

  useEffect(() => {
    _subscribeToSensors();
    _startLogging();
    
    return () => {
      _unsubscribeFromSensors();
      _stopLogging();
    };
  }, [loggingInterval]);

  const _startLogging = () => {
    // Clear any existing timer
    if (loggingTimerRef.current) {
      clearInterval(loggingTimerRef.current);
    }
    
    // Set up new logging interval
    loggingTimerRef.current = setInterval(() => {
      const logData = {
        timestamp: new Date().toISOString(),
        tilt: {
          x: tilt.x,
          y: tilt.y,
          z: tilt.z
        },
        position: {
          x: position.x / (CIRCLE_RADIUS * 0.8),
          y: position.y / (CIRCLE_RADIUS * 0.8)
        },
        heading: calibratedHeading,
        headingDirection: getHeadingDirection(calibratedHeading)
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
    // Configure sensor update intervals
    Gyroscope.setUpdateInterval(100);
    Magnetometer.setUpdateInterval(100);

    // Subscribe to gyroscope
    const gyroSubscription = Gyroscope.addListener(data => {
      // Store the raw gyroscope data
      setGyroData(prev => ({
        x: parseFloat(data.x.toFixed(2)),
        y: parseFloat(data.y.toFixed(2)),
        z: parseFloat(data.z.toFixed(2))
      }));
      
      // Accumulate the tilt - this creates the persistent tilt effect
      setTilt(prevTilt => {
        // Apply a damping factor to avoid excessive values
        const dampingFactor = 0.05;
        const newX = prevTilt.x + (data.x * dampingFactor);
        const newY = prevTilt.y + (data.y * dampingFactor);
        
        // Limit maximum tilt values to avoid excessive movement
        const maxTilt = 1.5;
        const clampedX = Math.max(Math.min(newX, maxTilt), -maxTilt);
        const clampedY = Math.max(Math.min(newY, maxTilt), -maxTilt);
        
        const result = {
          x: parseFloat(clampedX.toFixed(2)),
          y: parseFloat(clampedY.toFixed(2)),
          z: parseFloat((prevTilt.z + (data.z * dampingFactor)).toFixed(2))
        };
        
        // Update position of indicator based on current tilt values
        const scaleFactor = CIRCLE_RADIUS * 0.8;
        setPosition({
          x: result.y * scaleFactor,  // Swap x and y for more intuitive movement
          y: -result.x * scaleFactor
        });
        
        return result;
      });
    });
    
    // Subscribe to magnetometer for compass heading
    const magnetometerSubscription = Magnetometer.addListener(data => {
      const angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      const normalizedAngle = (angle >= 0) ? angle : (360 + angle);
      setHeading(Math.round(normalizedAngle));
      
      // Apply offset for calibrated heading
      let adjusted = (Math.round(normalizedAngle) - headingOffset) % 360;
      if (adjusted < 0) adjusted += 360;
      setCalibratedHeading(adjusted);
    });

    setSubscription(gyroSubscription);
    setMagnetSubscription(magnetometerSubscription);
  };

  const _unsubscribeFromSensors = () => {
    subscription && subscription.remove();
    magnetSubscription && magnetSubscription.remove();
    setSubscription(null);
    setMagnetSubscription(null);
  };

  const resetSensors = () => {
    // Reset tilt and position
    setTilt({ x: 0, y: 0, z: 0 });
    setPosition({ x: 0, y: 0 });
    
    // Set the current heading as the new offset
    setHeadingOffset(heading);
    setCalibratedHeading(0);
    
    // Mark as initialized
    setIsInitialized(true);
  };

  const getHeadingDirection = (degrees) => {
    if (degrees > 180) {
      return `${360 - degrees}° CCW`;
    } else {
      return `${degrees}° CW`;
    }
  };

  const getTiltDescription = () => {
    if (Math.abs(tilt.x) < 0.1 && Math.abs(tilt.y) < 0.1) {
      return "Level";
    }
    
    let description = [];
    
    if (tilt.x > 0.1) description.push("Forward");
    else if (tilt.x < -0.1) description.push("Backward");
    
    if (tilt.y > 0.1) description.push("Right");
    else if (tilt.y < -0.1) description.push("Left");
    
    return description.join(" ");
  };

  return (
    <View style={styles.container}>
      {!isInitialized && (
        <View style={styles.initOverlay}>
          <Text style={styles.initText}>Press RESET to initialize sensors</Text>
          <TouchableOpacity style={styles.resetButton} onPress={resetSensors}>
            <Text style={styles.resetButtonText}>RESET</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <Text style={styles.title}>Tilt Indicator</Text>
      
      <View style={styles.dataContainer}>
        <Text style={styles.data}>Tilt: {getTiltDescription()}</Text>
        <Text style={styles.data}>Pitch: {tilt.x.toFixed(2)}°</Text>
        <Text style={styles.data}>Roll: {tilt.y.toFixed(2)}°</Text>
        {isInitialized ? (
          <Text style={styles.data}>
            Rotation: {calibratedHeading}° ({getHeadingDirection(calibratedHeading)})
          </Text>
        ) : (
          <Text style={styles.data}>Rotation: Press RESET to initialize</Text>
        )}
      </View>
      
      <View style={styles.circleContainer}>
        {/* Main circle representing level surface */}
        <View style={styles.circle}>
          {/* Center crosshair */}
          <View style={styles.centerHorizontal} />
          <View style={styles.centerVertical} />
          
          {/* Small indicator circle showing tilt */}
          <View 
            style={[
              styles.indicator,
              {
                transform: [
                  { translateX: position.x },
                  { translateY: position.y }
                ]
              }
            ]}
          />
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
    backgroundColor: "#282c34",
    padding: 20
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: "#ffffff",
    marginBottom: 20
  },
  dataContainer: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 15,
    marginBottom: 30,
    width: "100%",
    alignItems: "center"
  },
  data: { 
    fontSize: 18, 
    color: "#ffffff", 
    margin: 5 
  },
  circleContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: CIRCLE_RADIUS * 2.2,
    width: CIRCLE_RADIUS * 2.2,
    marginBottom: 20
  },
  circle: {
    width: CIRCLE_RADIUS * 2,
    height: CIRCLE_RADIUS * 2,
    borderRadius: CIRCLE_RADIUS,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  indicator: {
    position: "absolute",
    width: INDICATOR_RADIUS * 2,
    height: INDICATOR_RADIUS * 2,
    borderRadius: INDICATOR_RADIUS,
    backgroundColor: "#ff4d4d",
    borderWidth: 1,
    borderColor: "#ffffff"
  },
  centerHorizontal: {
    position: "absolute",
    width: CIRCLE_RADIUS * 2,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.5)"
  },
  centerVertical: {
    position: "absolute",
    width: 1,
    height: CIRCLE_RADIUS * 2,
    backgroundColor: "rgba(255,255,255,0.5)"
  },
  resetButton: {
    backgroundColor: "#4a90e2",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
  },
  resetButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold"
  },
  initOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  initText: {
    color: '#ffffff',
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center'
  }
});