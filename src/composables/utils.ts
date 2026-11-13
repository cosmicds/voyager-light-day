// little utility composables
import { watch, type Ref } from 'vue';

/** i think this is last in the array wins per cycle */
export function mutuallyExclusive(...refs: Ref<boolean>[]) {
    
  watch(refs, (newValues, oldValue) => {
    // find which changed to true
    let totalTrue: number = 0;
    let indexChanged: number | null = null;
    for (let i = 0; i < newValues.length; i++) {
      if (newValues[i] && !oldValue[i]) {
        indexChanged = i;
      }
      if (newValues[i]) {
        totalTrue++;
      }
    }
    if (totalTrue === 0 || totalTrue === 1) {
      // if all are false, do nothing
      return;
    }
    // loop over setting everything else to false
    for (let i = 0; i < refs.length; i++) {
      if (i !== indexChanged) {
        refs[i].value = false;
      }
    }
  }, { deep: true, immediate: true });
    
            
            
}