import React, { useState, useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, PanResponder, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '@/app/constants/theme';

export type SignaturePadRef = {
  clear: () => void;
  getPaths: () => string[];
  hasSignature: () => boolean;
};

interface SignaturePadProps {
  onSignatureChange: (hasSignature: boolean) => void;
  height?: number;
  width?: number;
  strokeColor?: string;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ onSignatureChange, height = 200, width, strokeColor = COLORS.foreground }, ref) => {
    const [paths, setPaths] = useState<string[]>([]);
    const [activePath, setActivePath] = useState<string>('');

    const pathRef = useRef<string>('');
    const containerWidth = width || Dimensions.get('window').width - 64;

    const clear = () => {
      setPaths([]);
      setActivePath('');
      pathRef.current = '';
      onSignatureChange(false);
    };

    useImperativeHandle(ref, () => ({
      clear,
      getPaths: () => paths,
      hasSignature: () => paths.length > 0,
    }));

    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: (evt) => {
            const { locationX, locationY } = evt.nativeEvent;
            const startPoint = `M${locationX},${locationY}`;
            pathRef.current = startPoint;
            setActivePath(startPoint);
          },
          onPanResponderMove: (evt) => {
            const { locationX, locationY } = evt.nativeEvent;
            const nextPoint = `${pathRef.current} L${locationX},${locationY}`;
            pathRef.current = nextPoint;
            setActivePath(nextPoint);
          },
          onPanResponderRelease: () => {
            if (pathRef.current) {
              const finalPath = pathRef.current;
              setPaths((prev) => {
                const next = [...prev, finalPath];
                onSignatureChange(next.length > 0);
                return next;
              });
            }
            pathRef.current = '';
            setActivePath('');
          },
        }),
      [onSignatureChange],
    );

    return (
      <View
        style={[styles.container, { height, width: containerWidth }]}
        {...panResponder.panHandlers}
      >
        <Svg height="100%" width="100%" style={styles.svg}>
          {paths.map((p, index) => (
            <Path
              key={index}
              d={p}
              stroke={strokeColor}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {activePath ? (
            <Path
              d={activePath}
              stroke={strokeColor}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </View>
    );
  },
);

SignaturePad.displayName = 'SignaturePad';

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  svg: {
    flex: 1,
  },
});
