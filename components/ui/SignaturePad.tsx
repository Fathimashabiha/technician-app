import React, {
  useState,
  useRef,
  useMemo,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from 'react';
import { View, StyleSheet, PanResponder, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Ink color for signatures — always black regardless of app theme. */
export const SIGNATURE_INK_COLOR = '#000000';

export type SignaturePadRef = {
  clear: () => void;
  getPaths: () => string[];
  hasSignature: () => boolean;
};

interface SignaturePadProps {
  onSignatureChange: (hasSignature: boolean) => void;
  onPathsChange?: (paths: string[]) => void;
  height?: number;
  width?: number;
  strokeColor?: string;
  clearKey?: number;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  (
    {
      onSignatureChange,
      onPathsChange,
      height = 200,
      width,
      strokeColor = SIGNATURE_INK_COLOR,
      clearKey = 0,
    },
    ref,
  ) => {
    const [paths, setPaths] = useState<string[]>([]);
    const [activePath, setActivePath] = useState<string>('');

    const pathRef = useRef<string>('');
    const pathsRef = useRef<string[]>([]);
    const onSignatureChangeRef = useRef(onSignatureChange);
    const onPathsChangeRef = useRef(onPathsChange);
    const containerWidth = width || Dimensions.get('window').width - 64;

    pathsRef.current = paths;

    useEffect(() => {
      onSignatureChangeRef.current = onSignatureChange;
    }, [onSignatureChange]);

    useEffect(() => {
      onPathsChangeRef.current = onPathsChange;
    }, [onPathsChange]);

    useEffect(() => {
      onSignatureChangeRef.current(paths.length > 0);
      onPathsChangeRef.current?.(paths);
    }, [paths]);

    const clear = () => {
      setPaths([]);
      setActivePath('');
      pathRef.current = '';
    };

    useEffect(() => {
      clear();
    }, [clearKey]);

    useImperativeHandle(
      ref,
      () => ({
        clear,
        getPaths: () => pathsRef.current,
        hasSignature: () => pathsRef.current.length > 0,
      }),
      [],
    );

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
              setPaths((prev) => [...prev, finalPath]);
            }
            pathRef.current = '';
            setActivePath('');
          },
        }),
      [],
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
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderRadius: 12,
  },
  svg: {
    flex: 1,
  },
});
