import { MODULE_METADATA } from '@nestjs/common/constants';
import { CommandRunner } from './command-runner';
import { SupportAutofixModule } from './support-autofix.module';

describe('SupportAutofixModule', () => {
  it('registers the command runner required by deployment adapter dependencies', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, SupportAutofixModule) as unknown[];

    expect(providers).toContain(CommandRunner);
  });
});
