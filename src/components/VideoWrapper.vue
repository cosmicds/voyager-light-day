<template>
  <v-dialog
    id="video-container"
    v-model="showVideoSheet"
    transition="slide-y-transition"
    fullscreen
    close-on-content-click
  >
    <div
      v-focus-toggle="showVideoSheet"
      class="video-wrapper"
      tabindex="-1"
    >
      <CloseButton
        id="video-close-icon"
        label="Close Video"
        @click="showVideoSheet = false"
      />

      <iframe
        v-if="youtubeSrc"
        id="info-video"
        :src="embedUrl"
        :style="cssVars"
        title="YouTube video player"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
      <video
        v-else
        id="info-video"
        :src="videoSrc"
        :style="cssVars"
        controls
        :autoplay="autoplay"
        playsinline
        @loadedmetadata="onMetadata"
      ></video>
    </div>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { CloseButton } from "@cosmicds/vue-toolkit";

interface VideoProps {
  /** the URL of a video file (mp4, webm, ...).  */
  videoSrc?: string;
  /** a YouTube link (watch, youtu.be, shorts or embed).*/
  youtubeSrc?: string;
  /** 'auto' uses 9:16 for YouTube Shorts links, 16:9 for other YouTube links, and a video file's own shape */
  aspect?: "auto" | "wide" | "vertical";
  /** start playing when the video opens (a YouTube embed also starts muted, which browsers require) */
  autoplay?: boolean;
}

const props = withDefaults(defineProps<VideoProps>(), {
  aspect: "auto",
  autoplay: true,
});

const showVideoSheet = defineModel<boolean>({ default: false });

// Adapted from a comment on https://stackoverflow.com/questions/3452546/how-do-i-get-the-youtube-video-id-from-a-url#comment11747164_8260383
function youtubeParser(url: string): string | null {
  const regExp = /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[1].length === 11 ? match[1] : null;
}

const youtubeId = computed(() => (props.youtubeSrc ? youtubeParser(props.youtubeSrc) : null));
const isShort = computed(() => !!props.youtubeSrc?.includes("/shorts/"));

// an embed link keeps its own parameters (it has to be a full URL) and any other YouTube link becomes an embed;
// then rel=0, playsinline=1 and, with autoplay on, autoplay=1&mute=1 are added unless the link already sets them
const embedUrl = computed(() => {
  let embed = props.youtubeSrc ?? "";
  if (!embed.includes("/embed/")) {
    embed = `https://www.youtube.com/embed/${youtubeId.value}`;
  }

  const url = new URL(embed);
  url.searchParams.set("rel", "0");
  url.searchParams.set("playsinline", "1");
  if (props.autoplay) {
    url.searchParams.set("autoplay", "1");
    url.searchParams.set("mute", "1");
  }
  return url.toString();
});

const fileAspect = ref<number | null>(null);

function onMetadata(event: Event) {
  const video = event.target as HTMLVideoElement;
  if (video.videoWidth && video.videoHeight) {
    fileAspect.value = video.videoWidth / video.videoHeight;
  }
}

const videoAspect = computed(() => {
  if (props.aspect === "wide") {
    return 16 / 9;
  }
  if (props.aspect === "vertical") {
    return 9 / 16;
  }
  if (youtubeId.value) {
    return isShort.value ? 9 / 16 : 16 / 9;
  }
  return fileAspect.value ?? 16 / 9;
});

const cssVars = computed(() => ({ "--video-aspect": videoAspect.value }));
</script>

<style lang="less">
.video-wrapper {
  position: relative;
  display: flex;
  padding: 10px;
  height: 100%;
  max-width: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  text-align: center;
  z-index: 1000;
  // border: 1px solid white;
}

#video-close-icon {
  position: absolute;
  top: 1rem;
  right: 1rem;
  color: white;
  z-index: 1001;
}

video,
#info-video {
  margin: auto;
  width: min(95%, calc(90vh * var(--video-aspect, 1.7778)));
  height: auto;
  aspect-ratio: var(--video-aspect, 1.7778);
  object-fit: contain;
}

#video-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  max-width: 100%;
  overflow: hidden;
  padding: 0px;
  z-index: 1000;
}
</style>
