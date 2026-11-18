import { SolarSystemObjects } from "@wwtelescope/engine-types";

import launch from "@/assets/voyager/launch.jpg";
import earthMoon from "@/assets/voyager/earth-moon.jpg";
import jupiter from "@/assets/voyager/jupiter-io-europa.jpg";
import io from "@/assets/voyager/io-eruption.jpg";
import titan from "@/assets/voyager/titan.jpg";
import saturn from "@/assets/voyager/saturn-rings-composition.jpg";
import uranusMiranda from "@/assets/voyager/uranus-miranda.jpg";
import neptuneRings from "@/assets/voyager/neptune-rings.jpg";
import paleBlueDot from "@/assets/voyager/pale-blue-dot.jpg";
import terminationShock from "@/assets/voyager/termination-shock.jpg";
import interstellar from "@/assets/voyager/interstellar.jpg";
import lightDay from "@/assets/voyager/light-day.jpg";
import trajectory from "@/assets/voyager/voyager_trajectories_jpl_caltech.png";
import celebrate from "@/assets/voyager/voyager-light-day-elakara.png";

import { ViewSpec } from "./types";

export const INTERSTITIAL_RATE = 20000000;

export interface MissionEvent {
  title: string;
  caption: string | string[];
  date: Date;
  image: string;
  imageUrl?: string;
  pdsUrl?: string;
  opusUrl?: string;
  credit: string;
  /** when the image was taken, from its NASA caption (not always the event time) */
  imageTaken: string;
  /** what the camera tracks when jumping to this event */
  track?: ViewSpec["track"];
  /** half-width (days) of the tour step slider's window around `date`. Default 2 */
  windowDays?: number;
  window?: TimeRange;
  view?: ViewSpec;
  /** fly to `view` (camera and clock) instead of jumping */
  fly?: boolean;
  // Rate (seconds per seconds)
  rate?: number;
  /** hide the tour step's time slider at this stop */
  noSlider?: boolean;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

const V1_LAUNCH: TimeRange = { start: new Date("1977-09-01T00:00:00Z"), end: new Date("1977-11-01T00:00:00Z") };

const V1_JUPITER_ENCOUNTER: TimeRange = {
  start: new Date("1979-03-03T00:00:00Z"),
  end: new Date("1979-03-06T20:00:00Z"),
};
export const V1_SATURN_ENCOUNTER: TimeRange = {
  start: new Date("1980-11-11T00:00:00Z"),
  end: new Date("1980-11-14T00:00:00Z"),
};
const V2_URANUS_ENCOUNTER: TimeRange = {
  start: new Date("1986-01-24T10:00:00Z"),
  end: new Date("1986-01-25T00:00:00Z"),
};
export const V2_NEPTUNE_ENCOUNTER: TimeRange = {
  start: new Date("1989-08-24T19:00:00Z"),
  end: new Date("1989-08-25T07:00:00Z"),
};

export const ONE_LIGHT_DAY = new Date("2026-11-18T10:16:00Z");

// Voyager 1 at one light-day: the tour's first stop (LIGHT_DAY_INTRO) and its last
const ONE_LIGHT_DAY_VIEW: ViewSpec = {
  time: "2026-11-18T10:16:00.000Z",
  track: "voyager1",
  lat: 3.1273276264099112,
  lng: 266.02358244622883,
  zoom: 1.3123507461412482,
  rotation: 0.6279999999999997,
  angle: -0.0009999999999999994,
  modelLogScale: 9.61,
};

const DAY_MS = 86400000;

export function eventWindow(events: MissionEvent[], i: number): TimeRange {
  const window = events[i].window;
  if (window) {
    return window;
  }
  const t = events[i].date.getTime();
  const half = (events[i].windowDays ?? 2) * DAY_MS;
  const previous = events[i - 1]?.date.getTime();
  const next = events[i + 1]?.date.getTime();
  return {
    start: new Date(previous === undefined ? t - half : Math.max(t - half, Math.floor((previous + t) / 2))),
    // 1 ms short of the midpoint, which belongs to the next window
    end: new Date(next === undefined ? t + half : Math.min(t + half, Math.floor((t + next) / 2) - 1)),
  };
}

export function eventForTime(events: MissionEvent[], time: Date): number | undefined {
  const t = time.getTime();
  const inWindow: MissionEvent[] = [];
  for (let i = 0; i < events.length; i++) {
    const window = eventWindow(events, i);
    if (t >= window.start.getTime() && t <= window.end.getTime()) {
      inWindow.push(events[i]);
    }
  }
  if (inWindow.length === 1) {
    return events.indexOf(inWindow[0]);
  }
  if (inWindow.length > 1) {
    // pick the closest to the time
    let closestIndex = events.indexOf(inWindow[0]);
    let closestDiff = Math.abs(events[closestIndex].date.getTime() - t);
    for (let i = 1; i < inWindow.length; i++) {
      const index = events.indexOf(inWindow[i]);
      const diff = Math.abs(events[index].date.getTime() - t);
      if (diff < closestDiff) {
        closestIndex = index;
        closestDiff = diff;
      }
    }
    return closestIndex;
  }
  return undefined;
}

export const VOYAGER_1_EVENTS: MissionEvent[] = [
  {
    title: "Launch",
    caption: `NASA's Voyager 1 spacecraft launched atop its Titan/Centaur-6
      launch vehicle from the Kennedy Space Center Launch Complex in Florida
      on September 5, 1977, at 8:56 a.m. local time.`,
    date: new Date("1977-09-05T12:56:00Z"),
    image: launch,
    imageUrl: "https://science.nasa.gov/photojournal/voyager-1-launch-2/",
    credit: "NASA/JPL-Caltech/KSC",
    imageTaken: "1977-09-05",
    track: SolarSystemObjects.earth,
    window: V1_LAUNCH,
    view: {
      time: "1977-09-05T12:56:00.000Z",
      track: 19,
      lat: 27.017421875000036,
      lng: 204.56484845779983,
      zoom: 2.847799106383314,
      rotation: 0,
      angle: 0,
      modelLogScale: 5.64,
    },
    // ~3 h/s, so playback lingers on launch before ramping up
    rate: 10_000,
  },
  {
    title: "Earth and Moon",
    // caption: `This picture of a crescent-shaped Earth and Moon -- the first of
    //   its kind ever taken by a spacecraft -- was recorded Sept. 18, 1977, by
    //   NASA's Voyager 1 when it was 7.25 million miles (11.66 million
    //   kilometers) from Earth. The Moon is at the top of the picture and beyond
    //   the Earth as viewed by Voyager. In the picture are eastern Asia, the
    //   western Pacific Ocean and part of the Arctic. Voyager 1 was directly
    //   above Mt. Everest (on the night side of the planet at 25 degrees north
    //   latitude) when the picture was taken.`,
    caption: `On Sept 18, 1977, just 2 weeks after launch, 
      Voyager 1 took this picture of a crescent-shaped Earth and Moon, the
      first of its kind ever taken by a spacecraft. Voyager 1 was
      7.25 million miles (11.66 million kilometers) from Earth when it captured this image.`,
    
    date: new Date("1977-09-18T22:20:00Z"),
    image: earthMoon,
    imageUrl: "https://science.nasa.gov/photojournal/crescent-earth-and-moon/",
    credit: "NASA/JPL",
    imageTaken: "1977-09-18",
    track: SolarSystemObjects.earth,
    window: V1_LAUNCH,
    view: {
      time: "1977-09-18T22:20:00.000Z",
      track: 19,
      lat: 7.40995312499998,
      lng: 334.6931336265325,
      zoom: 0.2100245670950015,
      rotation: 0,
      angle: 0,
      modelLogScale: 5.64,
    },
    // ~12 days/s. The fastest rate in V1_LAUNCH, which playback keeps to until the window ends (Nov 1),
    // so a slower one would drag through the 44 days after this photo
    rate: 1_000_000,
  },
  {
    title: "Jupiter closest approach",
    caption: `Voyager 1 took this photo of Jupiter and two of its moons
      (Io, left, and Europa) on Feb. 13, 1979, a couple of weeks before it made its closest approach to Jupiter.
      Just behind Io, you can see Jupiter's "Great Red Spot", which Voyager discovered was a massive storm! Although both
      satellites have about the same brightness, Io's color is very different
      from Europa's indicating different histories and compositions.`,
    date: new Date("1979-03-05T12:05:00Z"),
    image: jupiter,
    imageUrl: "https://science.nasa.gov/photojournal/jupiter-with-satellites-io-and-europa/",
    opusUrl:
      "https://opus.pds-rings.seti.org/#/instrument=Voyager+ISS&observationtype=Image&time1=1979-02-13T06:00:00.000&time2=1979-02-13T06:04:00.000&qtype-time=any&unit-time=ymdhms&VOYAGERmissionphasename=Jupiter+Encounter&cols=opusid,instrument,planet,target,time1,observationduration&widgets=time,VOYAGERmissionphasename,instrument,observationtype,target&order=time1,opusid&view=browse&browse=data&cart_browse=gallery&startobs=1&cart_startobs=1&detail=",
    credit: "NASA/JPL",
    imageTaken: "1979-02-13",
    track: SolarSystemObjects.jupiter,
    window: V1_JUPITER_ENCOUNTER,
    view: {
      time: "1979-03-05T12:05:00.000Z",
      track: "voyager1",
      lat: 11.249210937499992,
      lng: 310.83608867904195,
      zoom: 0.006336824207632345,
      rotation: 0,
      angle: 0,
      modelLogScale: 5.64,
    },
    rate: 20_000,
  },
  {
    title: "Io's volcanoes",
    caption: `Voyager 1 took this image of Io on March 4 at 5:30 p.m. (PST)
      about 11 hours before closest approach to the Jupiter moon. An enormous volcanic
      explosion can be seen silhouetted against dark space on the edge of Io. The volcanic plumes were first 
      discovered in Voyager 1's images by Linda Morabito at JPL. Io was our first
      direct observation of active volcanoes beyond the Earth.`,
    date: new Date("1979-03-05T15:14:00Z"),
    image: io,
    imageUrl: "https://science.nasa.gov/photojournal/volcanic-explosion-on-io/",
    opusUrl:
      "https://opus.pds-rings.seti.org/opus/#/instrument=Voyager+ISS&observationtype=Image&target=Io&VOYAGERmissionphasename=Jupiter+Encounter&cols=opusid,instrument,planet,target,time1,observationduration&widgets=VOYAGERmissionphasename,instrument,observationtype,target&order=time1,opusid&view=detail&browse=data&cart_browse=gallery&startobs=276&cart_startobs=1&detail=vg-iss-1-j-c1637534",
    credit: "NASA/JPL",
    imageTaken: "1979-03-05 01:30 UT",
    track: SolarSystemObjects.io,
    window: V1_JUPITER_ENCOUNTER,
    fly: true,
    view: {
      time: "1979-03-05T15:14:00.000Z",
      track: 10,
      lat: 65.52337499999985,
      lng: 334.73444767076717,
      zoom: 0.0008728047173074942,
      rotation: 0,
      angle: 0,
      modelLogScale: 5.64,
    },
    rate: 5000,
  },
  {
    title: "Titan flyby",
    caption: `Titan's thick haze layer is shown in this enhanced Voyager 1 image
      taken Nov. 12, 1980 at a distance of 435,000 kilometers (270,000 miles).
      Voyager images of Saturn's largest moon show Titan completely enveloped
      by haze that merges with a darker hood or cloud layer over the north
      pole. Such a mantle is not present at the south pole.`,
    date: new Date("1980-11-12T05:41:00Z"),
    image: titan,
    imageUrl: "https://science.nasa.gov/photojournal/titans-thick-haze-layer/",
    credit: "NASA/JPL",
    imageTaken: "1980-11-12",
    track: SolarSystemObjects.saturn,
    window: V1_SATURN_ENCOUNTER,
    view: {
      time: "1980-11-12T05:41:00.000Z",
      track: "voyager1",
      lat: -3.6122343893580813,
      lng: 297.41595835515136,
      zoom: 0.0021064959911496115,
      rotation: 0,
      angle: 0,
      modelLogScale: 5.64,
    },
    rate: 5000,
  },
  {
    title: "Saturn closest approach",
    caption: `Possible variations in chemical composition from one part of
      Saturn's ring system to another are visible in this Voyager 2 picture as
      subtle color variations. In this enhanced color view the more water-rich a region is the more blue it appears. 
      Voyager 1 made similar observations during its flyby of Saturn.`,
    date: new Date("1980-11-12T23:46:00Z"),
    image: saturn,
    imageUrl: "https://science.nasa.gov/photojournal/composition-differences-within-saturns-rings/",
    credit: "NASA/JPL",
    imageTaken: "1981-08-17",
    track: SolarSystemObjects.saturn,
    window: V1_SATURN_ENCOUNTER,
    fly: true,
    view: {
      time: "1980-11-12T23:46:00.000Z",
      track: 5,
      lat: -13.926023437500092,
      lng: 352.7561755928077,
      zoom: 0.01438429502868702,
      rotation: 0,
      angle: 0,
      modelLogScale: 5.64,
    },
    rate: 10_000,
  },
  {
    title: "Voyager 2 continues the Grand Tour",
    caption: `Because Voyager 1 was instructed to fly by Saturn's moon Titan, it
      could not continue on to Uranus and Neptune. Voyager 2, which launched
      about 2 weeks before Voyager 1, was able to continue on to Uranus and Neptune.
      It is still the only spacecraft to have visited these two outer planets.`,
    date: V1_SATURN_ENCOUNTER.end,
    image: trajectory,
    imageUrl:
      "https://www.jpl.nasa.gov/edu/resources/teachable-moment/then-there-were-two-voyager-2-reaches-interstellar-space/",
    credit: "NASA/JPL-Caltech",
    imageTaken: "",
    track: "voyager2",
    fly: false,
    view: {
      time: "1980-11-16T00:00:00.000Z",
      track: "voyager2",
      lat: 18.95997656249991,
      lng: 74.0489350985174,
      zoom: 38.812419116147076,
      rotation: 0,
      angle: 0,
      modelLogScale: 5.64,
    },
  },
  {
    title: "Uranus closest approach",
    caption: `Voyager 2 is the only spacecraft to have visited Uranus. Its
      closest approach was on January 24, 1986, at 17:59 UTC, 107,000 km from
      the planet. The same day it imaged Uranus' icy moon Miranda, shown here.`,
    date: new Date("1986-01-24T17:59:00Z"),
    image: uranusMiranda,
    imageUrl: "https://science.nasa.gov/photojournal/mirandas-icy-face/",
    credit: "NASA/JPL-Caltech",
    imageTaken: "1986-01-24",
    window: V2_URANUS_ENCOUNTER,
    view: {
      time: "1986-01-24T15:47:00.000Z",
      track: 6,
      lat: 54.08644531250005,
      lng: 344.98883480082486,
      zoom: 0.024688103953992548,
      rotation: 1e-323,
      angle: -1e-323,
      modelLogScale: 5.64,
    },
    rate: 8_000,
  },
  {
    title: "Neptune closest approach",
    caption: `Voyager 2's closest approach to Neptune was on August 25, 1989,
      at 03:56 UTC, 29,240 km from the planet. It passed Neptune's largest
      moon, Triton, about five hours later. Leaving Neptune, it looked back
      and imaged the planet's faint rings, shown here.`,
    date: new Date("1989-08-25T03:56:00Z"),
    image: neptuneRings,
    imageUrl: "https://science.nasa.gov/photojournal/neptunes-rings/",
    credit: "NASA/JPL",
    imageTaken: "1989",
    window: V2_NEPTUNE_ENCOUNTER,
    view: {
      time: "1989-08-25T03:56:00.000Z",
      track: 7,
      lat: -30.024101562499958,
      lng: 289.5682572315336,
      zoom: 0.009060231218713199,
      rotation: 0,
      angle: 0,
      modelLogScale: 5.64,
    },
    rate: 8_000,
  },
  {
    title: "Pale Blue Dot",
    noSlider: true,
    caption: `This image shows an updated version of the iconic Pale Blue Dot
      image taken by the Voyager 1 spacecraft, at the suggestion of Carl Sagan. Planet Earth is visible as a
      bright speck within the sunbeam just right of center and appears softly
      blue, as in the original version published in 1990.`,
    date: new Date("1990-02-14T04:48:00Z"),
    image: paleBlueDot,
    imageUrl: "https://science.nasa.gov/photojournal/pale-blue-dot-revisited/",
    credit: "NASA/JPL-Caltech",
    imageTaken: "1990-02-14 (2020 reprocessing)",
    track: SolarSystemObjects.sun,
    view: {
      time: "1990-02-14T04:48:00.000Z",
      track: 19,
      lat: 32.9932265624999,
      lng: 152.90936361136824,
      zoom: 96.01881970144674,
      rotation: 0,
      angle: 0,
      modelLogScale: 5.64,
    },
    rate: 1000000,
  },
  {
    title: "Termination shock",
    noSlider: true,
    windowDays: 365,
    caption: `An artist's concept illustrates the positions of the Voyager
      spacecraft in relation to structures formed around our Sun by the solar
      wind. Also illustrated is the termination shock, a violent region the
      spacecraft must pass through before reaching the outer limits of the
      solar system.`,
    date: new Date("2004-12-16T00:00:00Z"),
    image: terminationShock,
    imageUrl: "https://science.nasa.gov/photojournal/voyager-approaches-final-frontier-artists-concept/",
    credit: "NASA/JPL/Walt Feimer",
    imageTaken: "artist's concept, 2003",
    track: SolarSystemObjects.sun,
    fly: true,
    view: {
      time: "2004-12-16T00:00:00.000Z",
      track: 0,
      lat: 32.36864062499995,
      lng: 80.90261612548761,
      zoom: 620.3744396783222,
      rotation: 0,
      angle: 0,
      modelLogScale: 5.64,
    },
    rate: 20000000,
  },
  {
    title: "Interstellar space",
    noSlider: true,
    windowDays: 365,
    caption: `This artist's concept depicts NASA's Voyager 1 spacecraft entering
      interstellar space. Interstellar space is dominated by the plasma, or
      ionized gas, that was ejected by the death of nearby giant stars
      millions of years ago.`,
    date: new Date("2012-08-25T00:00:00Z"),
    image: interstellar,
    imageUrl: "https://science.nasa.gov/photojournal/voyager-1-entering-interstellar-space-artist-concept/",
    credit: "NASA/JPL-Caltech",
    imageTaken: "artist's concept, 2013",
    track: SolarSystemObjects.sun,
    fly: true,
    view: {
      time: "2012-08-25T00:00:00.000Z",
      track: 0,
      lat: 32.36864062499995,
      lng: 80.90261612548761,
      zoom: 724.5852368350302,
      rotation: 0,
      angle: 0,
      modelLogScale: 5.64,
    },
    rate: 20000000,
  },
  {
    title: "One light-day from Earth",
    noSlider: true,
    caption: `Voyager 1 has entered interstellar space. NASA's spacecraft, which
      rose from Earth on a September morning nearly 50 years ago, has traveled farther
      than anyone, or anything, in history.`,
    date: ONE_LIGHT_DAY,
    image: lightDay,
    imageUrl: "https://science.nasa.gov/photojournal/voyager-goes-interstellar-artist-concept/",
    credit: "NASA/JPL-Caltech",
    imageTaken: "artist's concept, 2013",
    track: SolarSystemObjects.sun,
    view: ONE_LIGHT_DAY_VIEW,
    rate: 1000000,
  },
];

/**
 * The tour's opening stop: Voyager 1 at one light-day, before the mission from launch on.
 * Not in VOYAGER_1_EVENTS, whose date order playback relies on; see TOUR_EVENTS in Voyager.vue
 */
export const LIGHT_DAY_INTRO: MissionEvent = {
  // TODO: placeholder title and caption, to be written
  title: "One Light Day Milestone!",
  noSlider: true,
  caption: ["On November 18, 2026, 10:16 UT, NASA’s beloved Voyager 1 spacecraft will reach an extraordinary milestone of one light-day from Earth—a distance so vast (16 billion miles!) that a message traveling at the speed of light takes a full 24 hours to reach us.", "This tour takes you through key moments of Voyager's journey, from launch until the present. The view for each step is interactive—try panning around the view or zooming in and out to capture your favorite angle on Voyager, the planets, and moons."],
  date: ONE_LIGHT_DAY,
  image: celebrate,
  credit: "Devika Elakara (Diagram NOT to scale!)",
  imageTaken: "artist's concept, 2013",
  track: SolarSystemObjects.sun,
  // as eventWindow gives the last stop: 2 days either side
  window: { start: new Date(ONE_LIGHT_DAY.getTime() - 2 * DAY_MS), end: new Date(ONE_LIGHT_DAY.getTime() + 2 * DAY_MS) },
  view: ONE_LIGHT_DAY_VIEW,
  rate: 1000000,
};
