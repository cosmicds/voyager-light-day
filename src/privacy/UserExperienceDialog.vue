<template>
  <!-- shallow teaser popup: just the question, tapping it brings up the real rating card below -->
  <AttentionHook
    class="user-experience-teaser"
    :visible="showRating && !expanded"
    :bounce-count="5"
  >
    <div
      class="user-experience-teaser-text"
      tabindex="0"
      role="button"
      :aria-label="question"
      @click="expanded = true"
      @keyup.enter="expanded = true"
    >
      {{ question }}
    </div>
  </AttentionHook>

  <v-expand-transition>
    <UserExperience
      v-if="showRating && expanded"
      :question="question"
      icon-size="2x"
      @dismiss="emit('dismiss')"
      @rating="(rating) => emit('rating', rating)"
      @finish="(rating, comments) => emit('finish', rating, comments)"
    >
      <template #footer>
        <div id="user-experience-footer">
          <v-btn
            class="rating-opt-put"
            color="#BDBDBD"
            size="small"
            variant="outlined"
            @click="emit('opt-out')"
          >
            Don't show again
          </v-btn>
          <v-btn
            class="privacy-button"
            color="#BDBDBD"
            size="small"
            variant="outlined"
            @click="emit('what-is-this')"
          >
            What is this?
          </v-btn>
        </div>
      </template>
    </UserExperience>
  </v-expand-transition>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { AttentionHook, UserExperience, type UserExperienceRating } from "@cosmicds/vue-toolkit";

const props = defineProps<{
  showRating: boolean;
  question: string;
}>();

const emit = defineEmits<{
  (event: "dismiss" | "opt-out" | "what-is-this"): void;
  (event: "rating", rating: UserExperienceRating | null): void;
  (event: "finish", rating: UserExperienceRating | null, comments: string | null): void;
}>();

// start back at the teaser each time the prompt is (re)shown
const expanded = ref(false);
watch(() => props.showRating, (show) => {
  if (show) expanded.value = false;
});
</script>

<style lang="less">
/* copied from rubin-first-look (and carina, radwave-in-motion, jwst-brick, ...):
   float the toolkit's own card via its root class rather than a dialog */
#cds-user-experience.rating-root {
  position: absolute !important;
  right: 5px;
  bottom: 5px;
  z-index: 9999;
  padding: 6px 8px;
  // outline: 1px solid rgba(var(--v-theme-on-background), .5) !important;
  // width: fit-content !important;
  // background-color: rgb(var(--v-theme-background)) !important;
  // z-index: 20000;
  
  .v-card-item {
    padding: 0px;
  }

  .rating-title {
    color: #EFEFEF;
    font-size: 0.7em;
    
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 5px;
    
    .v-spacer {
      display: none;
    }
    
  }

  .rating-icon-row {
    padding: 0px;

    .svg-inline--fa {
      height: 30px;
      width: 30px;
    }
  }

  .comments-box {
    width: 100%;
    margin-top: 20px;
  }

  .v-card-text {
    padding-bottom: 0;
  }

  .v-card-actions {
    padding: 0;
  }

  #user-experience-footer {
    margin: auto;
    display: flex;
    flex-direction: row;
    gap: 5px;
    
    .v-btn {
      text-transform: none;
    }
    .v-btn--variant-outlined {
      border-color: rgba(var(--v-theme-on-background), .5);
    }
  }
}

/* teaser popup: same corner as the full card above, but shallow - just the question */
.user-experience-teaser.attention-hook {
  width: auto;
  height: auto;
  right: 1em;
  bottom: -10px;
  border-radius: 10px;
  padding: 0.6em 0.9em;
  padding-bottom: calc(0.3em + 10px);
  z-index: 9999;
  background-color: rgba(var(--v-theme-background), 0.95);
  transition: padding 0.2s ease;

  .user-experience-teaser-text {
    color: #EFEFEF;
    font-size: 0.8em;
    line-height: 1.3;
    text-align: center;
    cursor: pointer;
  }
  
  &:hover {
    padding-bottom: calc(0.3em + 20px);
  }
}
</style>
