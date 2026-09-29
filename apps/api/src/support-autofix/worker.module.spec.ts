import { getQueueToken } from '@nestjs/bull';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AutoFixAgentProvider,
  CodexCliAutoFixAgentProvider,
  MockAutoFixAgentProvider,
} from './agent-provider';
import { AutoHealWorkerModule } from './worker.module';
import { AutoHealWorkerProcessor } from './worker-processor';
import { AUTO_FIX_AGENT } from './worker-tokens';

describe('AutoHealWorkerModule dependency wiring', () => {
  let moduleRef: TestingModule;
  const previousProvider = process.env.AUTOHEAL_AGENT_PROVIDER;
  const queue = {
    close: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    getWaitingCount: jest.fn().mockResolvedValue(0),
    getActiveCount: jest.fn().mockResolvedValue(0),
    getDelayedCount: jest.fn().mockResolvedValue(0),
  };

  beforeAll(async () => {
    process.env.AUTOHEAL_AGENT_PROVIDER = 'mock';
    moduleRef = await Test.createTestingModule({ imports: [AutoHealWorkerModule] })
      .overrideProvider(getQueueToken('autoheal-patch'))
      .useValue(queue)
      .compile();
  });

  afterAll(async () => {
    await moduleRef?.close();
    if (previousProvider === undefined) delete process.env.AUTOHEAL_AGENT_PROVIDER;
    else process.env.AUTOHEAL_AGENT_PROVIDER = previousProvider;
  });

  it('registers the configured Codex and mock provider factory under AUTO_FIX_AGENT', () => {
    const providers = Reflect.getMetadata('providers', AutoHealWorkerModule) as Array<{
      provide?: unknown;
      useFactory?: () => AutoFixAgentProvider;
    }>;
    const registration = providers.find((provider) => provider.provide === AUTO_FIX_AGENT);

    expect(registration?.useFactory).toEqual(expect.any(Function));
    const previous = process.env.AUTOHEAL_AGENT_PROVIDER;
    try {
      process.env.AUTOHEAL_AGENT_PROVIDER = 'mock';
      expect(registration?.useFactory?.()).toBeInstanceOf(MockAutoFixAgentProvider);
      process.env.AUTOHEAL_AGENT_PROVIDER = 'codex-cli';
      expect(registration?.useFactory?.()).toBeInstanceOf(CodexCliAutoFixAgentProvider);
    } finally {
      if (previous === undefined) delete process.env.AUTOHEAL_AGENT_PROVIDER;
      else process.env.AUTOHEAL_AGENT_PROVIDER = previous;
    }
  });

  it('compiles the module and injects AUTO_FIX_AGENT into AutoHealWorkerProcessor', () => {
    const processor = moduleRef.get(AutoHealWorkerProcessor);
    const agent = moduleRef.get<AutoFixAgentProvider>(AUTO_FIX_AGENT);

    expect(processor).toBeInstanceOf(AutoHealWorkerProcessor);
    expect(agent).toBeInstanceOf(MockAutoFixAgentProvider);
    expect((processor as unknown as { agent: AutoFixAgentProvider }).agent).toBe(agent);
  });
});
