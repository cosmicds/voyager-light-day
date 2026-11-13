import { SolarSystemObjects } from "@wwtelescope/engine-types";

import launch from "@/assets/voyager/launch.jpg";
import earthMoon from "@/assets/voyager/earth-moon.jpg";
import jupiter from "@/assets/voyager/jupiter.jpg";
import io from "@/assets/voyager/io.jpg";
import titan from "@/assets/voyager/titan.jpg";
import saturn from "@/assets/voyager/saturn.jpg";
import paleBlueDot from "@/assets/voyager/pale-blue-dot.jpg";
import terminationShock from "@/assets/voyager/termination-shock.jpg";
import interstellar from "@/assets/voyager/interstellar.jpg";
import lightDay from "@/assets/voyager/light-day.jpg";

export interface MissionEvent {
  title: string;
  caption: string;
  /** UT. Sources and precision are in src/assets/voyager/CREDITS.md */
  date: Date;
  image: string;
  credit: string;
  /** when the image was taken, from its NASA caption (not always the event time) */
  imageTaken: string;
  /** what the camera tracks when jumping to this event */
  track?: SolarSystemObjects;
  /** half-width (days) of the tour step slider's window around `date`. Default 2 */
  windowDays?: number;
}

const DAY_MS = 86400000;

/**
 * The tour step slider's window around events[i]: ±windowDays, but only up to halfway to the neighboring events,
 * so no window holds another event and no two windows overlap. Events must be in date order
 */
export function eventWindow(events: MissionEvent[], i: number): { start: Date; end: Date } {
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

export const VOYAGER_1_EVENTS: MissionEvent[] = [
  {
    title: "Launch",
    caption: `NASA's Voyager 1 spacecraft launched atop its Titan/Centaur-6
      launch vehicle from the Kennedy Space Center Launch Complex in Florida
      on September 5, 1977, at 8:56 a.m. local time.`,
    date: new Date("1977-09-05T12:56:01Z"),
    image: launch,
    credit: "NASA/JPL-Caltech/KSC",
    imageTaken: "1977-09-05",
    track: SolarSystemObjects.earth,
  },
  {
    title: "Earth and Moon",
    caption: `This picture of a crescent-shaped Earth and Moon -- the first of
      its kind ever taken by a spacecraft -- was recorded Sept. 18, 1977, by
      NASA's Voyager 1 when it was 7.25 million miles (11.66 million
      kilometers) from Earth. The Moon is at the top of the picture and beyond
      the Earth as viewed by Voyager. In the picture are eastern Asia, the
      western Pacific Ocean and part of the Arctic. Voyager 1 was directly
      above Mt. Everest (on the night side of the planet at 25 degrees north
      latitude) when the picture was taken.`,
    date: new Date("1977-09-18T12:00:00Z"),
    image: earthMoon,
    credit: "NASA/JPL",
    imageTaken: "1977-09-18",
    track: SolarSystemObjects.earth,
  },
  {
    title: "Jupiter closest approach",
    caption: `This dramatic view of Jupiter's Great Red Spot and its
      surroundings was obtained by Voyager 1 on Feb. 25, 1979, when the
      spacecraft was 5.7 million miles (9.2 million kilometers) from Jupiter.
      Cloud details as small as 100 miles (160 kilometers) across can be seen
      here. The colorful, wavy cloud pattern to the left of the Red Spot is a
      region of extraordinarily complex end variable wave motion.`,
    date: new Date("1979-03-05T12:05:00Z"),
    image: jupiter,
    credit: "NASA/JPL",
    imageTaken: "1979-02-25",
    track: SolarSystemObjects.jupiter,
  },
  {
    title: "Io's volcanoes",
    caption: `NASA's Voyager 1 image of Io showing active plume of Loki on limb.
      Heart-shaped feature southeast of Loki consists of fallout deposits from
      active plume Pele. The images that make up this mosaic were taken from
      an average distance of approximately 490,000 kilometers (340,000 miles).`,
    date: new Date("1979-03-05T15:13:20Z"),
    image: io,
    credit: "NASA/JPL/USGS",
    imageTaken: "not stated (~1979-03-04/05)",
    track: SolarSystemObjects.io,
  },
  {
    title: "Titan flyby",
    caption: `Titan's thick haze layer is shown in this enhanced Voyager 1 image
      taken Nov. 12, 1980 at a distance of 435,000 kilometers (270,000 miles).
      Voyager images of Saturn's largest moon show Titan completely enveloped
      by haze that merges with a darker hood or cloud layer over the north
      pole. Such a mantle is not present at the south pole.`,
    date: new Date("1980-11-12T05:40:22Z"),
    image: titan,
    credit: "NASA/JPL",
    imageTaken: "1980-11-12",
    track: SolarSystemObjects.saturn,
  },
  {
    title: "Saturn closest approach",
    caption: `NASA's Voyager 1 image of Saturn and its ring taken Nov. 16, 1980
      four days after closest approach to Saturn, from a distance of 5,300,
      000 km (3,300,000 miles).`,
    date: new Date("1980-11-12T23:46:00Z"),
    image: saturn,
    credit: "NASA/JPL/USGS",
    imageTaken: "1980-11-16",
    track: SolarSystemObjects.saturn,
  },
  {
    title: "Pale Blue Dot",
    caption: `This image shows an updated version of the iconic Pale Blue Dot
      image taken by the Voyager 1 spacecraft. Planet Earth is visible as a
      bright speck within the sunbeam just right of center and appears softly
      blue, as in the original version published in 1990 (see PIA00452).`,
    date: new Date("1990-02-14T04:48:00Z"),
    image: paleBlueDot,
    credit: "NASA/JPL-Caltech",
    imageTaken: "1990-02-14 (2020 reprocessing)",
    track: SolarSystemObjects.sun,
  },
  {
    title: "Termination shock",
    windowDays: 365,
    caption: `An artist's concept illustrates the positions of the Voyager
      spacecraft in relation to structures formed around our Sun by the solar
      wind. Also illustrated is the termination shock, a violent region the
      spacecraft must pass through before reaching the outer limits of the
      solar system.`,
    date: new Date("2004-12-16T00:00:00Z"),
    image: terminationShock,
    credit: "NASA/JPL/Walt Feimer",
    imageTaken: "artist's concept, 2003",
    track: SolarSystemObjects.sun,
  },
  {
    title: "Interstellar space",
    windowDays: 365,
    caption: `This artist's concept depicts NASA's Voyager 1 spacecraft entering
      interstellar space. Interstellar space is dominated by the plasma, or
      ionized gas, that was ejected by the death of nearby giant stars
      millions of years ago.`,
    date: new Date("2012-08-25T00:00:00Z"),
    image: interstellar,
    credit: "NASA/JPL-Caltech",
    imageTaken: "artist's concept, 2013",
    track: SolarSystemObjects.sun,
  },
  {
    title: "One light-day from Earth",
    caption: `Voyager 1 has entered interstellar space. NASA's spacecraft, which
      rose from Earth on a September morning 36 years ago, has traveled farther
      than anyone, or anything, in history.`,
    date: new Date("2026-11-18T10:16:00Z"),
    image: lightDay,
    credit: "NASA/JPL-Caltech",
    imageTaken: "artist's concept, 2013",
    track: SolarSystemObjects.sun,
  },
];
