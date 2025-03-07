import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { Gyroscope, Magnetometer } from "expo-sensors";

const { width } = Dimensions.get("window");
const CIRCLE_RADIUS = width * 0.35;
const INDICATOR_RADIUS = 15;

export default function App() {
  const [tilt, setTilt] = useState({ x: 0, y: 0, z: 0 });
  const [heading, setHeading] = useState(0);
  const [subscription, setSubscription] = useState(null);
  const [magnetSubscription, setMagnetSubscription] = useState(null);
  
  // Position values for the small indicator circle
  const [position, setPosition] = useState({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    _subscribeToSensors();
    return () => {
      _unsubscribeFromSensors();
    };
  }, []);

  const _subscribeToSensors = () => {
    // Configure sensor update intervals
    Gyroscope.setUpdateInterval(100);
    Magnetometer.setUpdateInterval(100);

    // Subscribe to gyroscope
    const gyroSubscription = Gyroscope.addListener(gyroscopeData => {
      // Apply a low-pass filter for smoother readings
      const alpha = 0.8;
      
      setTilt(prevTilt => ({
        x: parseFloat((alpha * prevTilt.x + (1 - alpha) * gyroscopeData.x).toFixed(2)),
        y: parseFloat((alpha * prevTilt.y + (1 - alpha) * gyroscopeData.y).toFixed(2)),
        z: parseFloat((alpha * prevTilt.z + (1 - alpha) * gyroscopeData.z).toFixed(2))
      }));
      
      // Calculate position of indicator based on tilt
      // Invert y for intuitive tilt direction
      const scaleFactor = CIRCLE_RADIUS * 0.8;
      setPosition({
        x: gyroscopeData.y * scaleFactor,
        y: -gyroscopeData.x * scaleFactor
      });
    });
    
    // Subscribe to magnetometer for compass heading
    const magnetometerSubscription = Magnetometer.addListener(data => {
      const angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      const normalizedAngle = (angle >= 0) ? angle : (360 + angle);
      setHeading(Math.round(normalizedAngle));
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

  const getCompassDirection = (heading) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(heading / 45) % 8;
    return directions[index];
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
      <Text style={styles.title}>Tilt Indicator</Text>
      
      <View style={styles.dataContainer}>
        <Text style={styles.data}>Tilt: {getTiltDescription()}</Text>
        <Text style={styles.data}>Pitch: {tilt.x.toFixed(2)}°</Text>
        <Text style={styles.data}>Roll: {tilt.y.toFixed(2)}°</Text>
        <Text style={styles.data}>
          Heading: {heading}° {getCompassDirection(heading)}
        </Text>
      </View>
      
      <View style={styles.circleContainer}>
        {/* Main circle representing level surface */}
        <View style={styles.circle}>
          {/* Center crosshair */}
          <View style={styles.centerHorizontal} />
          <View style={styles.centerVertical} />
          
          {/* Small indicator circle showing tilt */}
          <Animated.View 
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
  }
});