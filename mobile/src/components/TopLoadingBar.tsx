import React, { useRef, useState, useEffect } from 'react';
import { View, Animated } from 'react-native';

export default function TopLoadingBar({ color, bgColor }: { color: string; bgColor: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateX = barWidth > 0
    ? anim.interpolate({ inputRange: [0, 1], outputRange: [-barWidth * 0.4, barWidth] })
    : anim.interpolate({ inputRange: [0, 1], outputRange: [-100, 300] });
  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: bgColor, zIndex: 100, overflow: 'hidden' }}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={{ position: 'absolute', width: '40%', height: '100%', backgroundColor: color, borderRadius: 2, transform: [{ translateX }] }} />
    </View>
  );
}
