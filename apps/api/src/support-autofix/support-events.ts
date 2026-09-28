import { EventEmitter } from 'events';
import { Injectable } from '@nestjs/common';
import { SupportEvent } from './support-autofix.types';

export const SUPPORT_AUTOHEAL_EVENT = 'support-autofix:event';

@Injectable()
export class SupportAutofixEvents {
  private readonly emitter = new EventEmitter();

  publish(event: SupportEvent): void {
    this.emitter.emit(SUPPORT_AUTOHEAL_EVENT, Object.freeze({ ...event }));
  }

  subscribe(listener: (event: SupportEvent) => void): () => void {
    this.emitter.on(SUPPORT_AUTOHEAL_EVENT, listener);
    return () => this.emitter.off(SUPPORT_AUTOHEAL_EVENT, listener);
  }
}
