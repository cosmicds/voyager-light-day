// Piecewise cubic Hermite interpolation of a trajectory from (t, position, velocity) samples.
// No dependencies. Inputs can be any objects with x, y, z fields (e.g. a WWT Vector3d).

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** One array per axis: x[i], y[i], z[i] are the components at sample i. */
interface Axes {
  x: Float64Array;
  y: Float64Array;
  z: Float64Array;
}

export class HermiteTrajectory {
  private t: Float64Array;
  private p: Axes; // positions:  p.x[i], p.y[i], p.z[i]
  private v: Axes; // velocities: v.x[i], v.y[i], v.z[i]
  private last: number; // index of the last segment (n - 2)

  private biasedSeg = 0; // previous result of biasedBinarySearch

  constructor(times: ArrayLike<number>, positions: Vec3[], velocities: Vec3[]) {
    const n = times.length;
    if (n < 2 || positions.length !== n || velocities.length !== n) {
      throw new Error("need >= 2 samples and equal-length times/positions/velocities");
    }
    this.t = Float64Array.from(times);
    this.p = { x: new Float64Array(n), y: new Float64Array(n), z: new Float64Array(n) };
    this.v = { x: new Float64Array(n), y: new Float64Array(n), z: new Float64Array(n) };
    this.last = n - 2;
    for (let i = 0; i < n; i++) {
      if (i > 0 && !(this.t[i] > this.t[i - 1])) throw new Error("times must be strictly increasing");
      this.p.x[i] = positions[i].x;
      this.p.y[i] = positions[i].y;
      this.p.z[i] = positions[i].z;
      this.v.x[i] = velocities[i].x;
      this.v.y[i] = velocities[i].y;
      this.v.z[i] = velocities[i].z;
    }
  }

  get startTime() {
    return this.t[0];
  }
  get endTime() {
    return this.t[this.t.length - 1];
  }

  // ---------------------------------------------------------------------------
  // Segment lookup. Returns i in [0, n-2] with t[i] <= time < t[i+1],
  // clamped at the ends (time < t[0] -> 0, time >= t[n-1] -> n-2).
  // ---------------------------------------------------------------------------

  /** Largest j in [lo, hi] with t[j] <= time. Caller guarantees the answer is in [lo, hi]. */
  private bisect(time: number, lo: number, hi: number): number {
    const t = this.t;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (t[mid] <= time) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  /** Bisect only the side of the previous result that `time` is on. */
  biasedBinarySearch(time: number): number {
    const t = this.t;
    const i = this.biasedSeg;
    if (time < t[i]) {
      // before
      this.biasedSeg = this.bisect(time, 0, i - 1);
      return this.biasedSeg;
    }
    if (i === this.last || time < t[i + 1]) {
      // same
      return i;
    }
    this.biasedSeg = this.bisect(time, i + 1, this.last); // after
    return this.biasedSeg;
  }

  // ---------------------------------------------------------------------------

  /**
   * Cubic Hermite spline from Wikipedia,
   * https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Interpolation_on_an_arbitrary_interval
   *
   * Writes the position into `pos` and, if given, the velocity into `vel` (in place, no allocation).
   */
  evaluate(time: number, pos: Vec3, vel?: Vec3): void {
    const k = this.biasedBinarySearch(time);
    const xk = this.t[k];
    const xk1 = this.t[k + 1];
    const Δ = xk1 - xk; // dx/dt -- the time interval of the segment.
    const t = (time - xk) / Δ; // 0 at xk, 1 at xk1; dx/dt = Δ, dt/dx = 1 / Δ
    const tt = t * t;
    const ttt = tt * t;

    // Hermite basis functions h(t), polynomials in t
    const h00 = 2 * ttt - 3 * tt + 1;
    const h10 = ttt - 2 * tt + t;
    const h01 = -2 * ttt + 3 * tt;
    const h11 = ttt - tt;

    const p = this.p;
    const v = this.v;

    // v is dp/dx (per unit time); the basis needs dp/dt (per unit t). Chain rule: dp/dt = dp/dx * dx/dt = v * Δ
    pos.x = h00 * p.x[k] + h10 * Δ * v.x[k] + h01 * p.x[k + 1] + h11 * Δ * v.x[k + 1];
    pos.y = h00 * p.y[k] + h10 * Δ * v.y[k] + h01 * p.y[k + 1] + h11 * Δ * v.y[k + 1];
    pos.z = h00 * p.z[k] + h10 * Δ * v.z[k] + h01 * p.z[k + 1] + h11 * Δ * v.z[k + 1];

    if (vel) {
      // dh/dt: derivatives of the basis functions with respect to t (not x)
      const dh00 = 6 * tt - 6 * t;
      const dh10 = 3 * tt - 4 * t + 1;
      const dh01 = -6 * tt + 6 * t;
      const dh11 = 3 * tt - 2 * t;

      // The expression in parenthesis is dp/dt (per unit t). Chain rule back to time: v = dp/dx = dp/dt * dt/dx = expression / Δ
      // Check: at t = 0 only dh10/dt = 1 survives, so dp/dx = (Δ * v[k]) / Δ = v[k], the input velocity
      vel.x = (dh00 * p.x[k] + dh10 * Δ * v.x[k] + dh01 * p.x[k + 1] + dh11 * Δ * v.x[k + 1]) / Δ;
      vel.y = (dh00 * p.y[k] + dh10 * Δ * v.y[k] + dh01 * p.y[k + 1] + dh11 * Δ * v.y[k + 1]) / Δ;
      vel.z = (dh00 * p.z[k] + dh10 * Δ * v.z[k] + dh01 * p.z[k + 1] + dh11 * Δ * v.z[k + 1]) / Δ;
    }
  }
}
