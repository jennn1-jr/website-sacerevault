declare module 'simple-peer' {
  import { EventEmitter } from 'events';

  interface SignalData {}

  interface SimplePeerOptions {
    initiator?: boolean;
    trickle?: boolean;
    config?: RTCConfiguration;
    streams?: MediaStream[];
    objectMode?: boolean;
    allowHalfOpen?: boolean;
  }

  class SimplePeer extends EventEmitter {
    constructor(options?: SimplePeerOptions);
    signal(data: SignalData): void;
    send(data: any): void;
    destroy(): void;
    on(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
  }

  export default SimplePeer;
}
