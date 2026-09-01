declare module 'nprogress' {
  interface NProgressOptions {
    minimum?: number;
    easing?: string;
    positionUsing?: string;
    speed?: number;
    trickle?: boolean;
    trickleSpeed?: number;
    showSpinner?: boolean;
    barSelector?: string;
    spinnerSelector?: string;
    parent?: string;
    template?: string;
  }

  interface NProgress {
    version: string;
    settings: NProgressOptions;
    status: number | null;
    configure(options: Partial<NProgressOptions>): NProgress;
    set(number: number): NProgress;
    isStarted(): boolean;
    start(): NProgress;
    done(force?: boolean): NProgress;
    inc(amount?: number): NProgress;
    trickle(): NProgress;
  }

  const nprogress: NProgress;
  export default nprogress;
}