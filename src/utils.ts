

/** add a function or something to the window */
export function addToWindow(name: string, value: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)[name] = value;
}

/** get a short name for an element */
export function _short(el: HTMLElement | Element | null | undefined) {
  if (!el) return "null";
  // we want tagname#id.classes(but only the first v-* class)
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const vClasses = Array.from(el.classList).filter((c) => c.startsWith("v-"));
  const mdiClasses = Array.from(el.classList).filter((c) => c.startsWith("mdi-"));
  const faClasses = Array.from(el.classList).filter((c) => c.startsWith("fa-"));
  const classFilter = (className: string) => {
    return !vClasses.includes(className) && !mdiClasses.includes(className) && !faClasses.includes(className);
  };
  const classes = Array.from(el.classList).filter(classFilter).join(".");
  // want to include the first v-* class if it exists, but not all of them, same for mdi- and fa- classes
  const getFirst = (strArray: string[]) => (strArray[0] ? `.${strArray[0]}` : "");
  // class name is first v*, then first mdi- then first fa- then the rest of the classes
  const className = `${getFirst(vClasses)}${getFirst(mdiClasses)}${getFirst(faClasses)}${classes ? `.${classes}` : ""}`;
  return `${tag}${id}${className}`;
}

let oldFocus: Element | null = null;
/** log what the focus is for accessibility debugging
 * this should get either called in main, or added to the window so it
 * can be called from the console. 
 */
export function _logFocus() {
  const el = document.activeElement;
  if (el !== oldFocus) {
    console.log(`focus changed: ${_short(oldFocus)} -> ${_short(el)}`);
    oldFocus = el;
  }
  requestAnimationFrame(_logFocus);
}