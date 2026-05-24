import { StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

type Props = {
  uri: string;
  height?: number;
};

export default function VideoPlayerNative({ uri, height = 200 }: Props) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.pause();
  });

  return (
    <VideoView
      style={[styles.video, { height }]}
      player={player}
      nativeControls
      contentFit="contain"
      allowsFullscreen
    />
  );
}

const styles = StyleSheet.create({
  video: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: "#000",
    overflow: "hidden",
  },
});
