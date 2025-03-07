import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Gyroscope } from "expo-sensors";

export default function App() {
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const tiltAnimX = new Animated.Value(0);
  const tiltAnimY = new Animated.Value(0);

  useEffect(() => {
    const subscription = Gyroscope.addListener(({ x, y, z }) => {
      setRotation({ x, y, z });

      Animated.spring(tiltAnimX, {
        toValue: y * 20,
        useNativeDriver: true,
      }).start();

      Animated.spring(tiltAnimY, {
        toValue: x * 20,
        useNativeDriver: true,
      }).start();
    });

    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gyroscope Data</Text>
      <Text style={styles.data}>X: {rotation.x.toFixed(2)}</Text>
      <Text style={styles.data}>Y: {rotation.y.toFixed(2)}</Text>
      <Text style={styles.data}>Z: {rotation.z.toFixed(2)}</Text>
      <Animated.View
        style={[
          styles.box,
          {
            transform: [
              { rotateX: tiltAnimX.interpolate({ inputRange: [-20, 20], outputRange: ["-20deg", "20deg"] }) },
              { rotateY: tiltAnimY.interpolate({ inputRange: [-20, 20], outputRange: ["-20deg", "20deg"] }) },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#282c34" },
  title: { fontSize: 24, fontWeight: "bold", color: "#ffffff" },
  data: { fontSize: 18, color: "#ffffff", margin: 5 },
  box: { width: 100, height: 100, backgroundColor: "red", marginTop: 20 },
});