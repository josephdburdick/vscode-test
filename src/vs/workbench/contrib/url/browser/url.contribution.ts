/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { localize } from 'vs/nls';
import { MenuId, MenuRegistry, Action2, registerAction2 } from 'vs/platform/actions/common/actions';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { Registry } from 'vs/platform/registry/common/platform';
import { IURLService } from 'vs/platform/url/common/url';
import { Extensions as WorkBenchExtensions, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { ExternalUriResolverContriBution } from 'vs/workBench/contriB/url/Browser/externalUriResolver';
import { manageTrustedDomainSettingsCommand } from 'vs/workBench/contriB/url/Browser/trustedDomains';
import { TrustedDomainsFileSystemProvider } from 'vs/workBench/contriB/url/Browser/trustedDomainsFileSystemProvider';
import { OpenerValidatorContriButions } from 'vs/workBench/contriB/url/Browser/trustedDomainsValidator';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { CATEGORIES } from 'vs/workBench/common/actions';

class OpenUrlAction extends Action2 {

	constructor() {
		super({
			id: 'workBench.action.url.openUrl',
			title: { value: localize('openUrl', "Open URL"), original: 'Open URL' },
			category: CATEGORIES.Developer,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const quickInputService = accessor.get(IQuickInputService);
		const urlService = accessor.get(IURLService);

		return quickInputService.input({ prompt: localize('urlToOpen', "URL to open") }).then(input => {
			if (input) {
				const uri = URI.parse(input);
				urlService.open(uri, { trusted: true });
			}
		});
	}
}

registerAction2(OpenUrlAction);

/**
 * Trusted Domains ContriBution
 */

CommandsRegistry.registerCommand(manageTrustedDomainSettingsCommand);
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: manageTrustedDomainSettingsCommand.id,
		title: {
			value: manageTrustedDomainSettingsCommand.description.description,
			original: 'Manage Trusted Domains'
		}
	}
});

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(
	OpenerValidatorContriButions,
	LifecyclePhase.Restored
);
Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(
	TrustedDomainsFileSystemProvider,
	LifecyclePhase.Ready
);
Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(
	ExternalUriResolverContriBution,
	LifecyclePhase.Ready
);
