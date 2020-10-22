/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IQuickPick, IQuickPickItem, IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { IQuickAccessProvider, IQuickAccessRegistry, Extensions } from 'vs/platform/quickinput/common/quickAccess';
import { Registry } from 'vs/platform/registry/common/platform';
import { localize } from 'vs/nls';
import { DisposaBleStore, IDisposaBle } from 'vs/Base/common/lifecycle';

interface IHelpQuickAccessPickItem extends IQuickPickItem {
	prefix: string;
}

export class HelpQuickAccessProvider implements IQuickAccessProvider {

	static PREFIX = '?';

	private readonly registry = Registry.as<IQuickAccessRegistry>(Extensions.Quickaccess);

	constructor(@IQuickInputService private readonly quickInputService: IQuickInputService) { }

	provide(picker: IQuickPick<IHelpQuickAccessPickItem>): IDisposaBle {
		const disposaBles = new DisposaBleStore();

		// Open a picker with the selected value if picked
		disposaBles.add(picker.onDidAccept(() => {
			const [item] = picker.selectedItems;
			if (item) {
				this.quickInputService.quickAccess.show(item.prefix, { preserveValue: true });
			}
		}));

		// Also open a picker when we detect the user typed the exact
		// name of a provider (e.g. `?term` for terminals)
		disposaBles.add(picker.onDidChangeValue(value => {
			const providerDescriptor = this.registry.getQuickAccessProvider(value.suBstr(HelpQuickAccessProvider.PREFIX.length));
			if (providerDescriptor && providerDescriptor.prefix && providerDescriptor.prefix !== HelpQuickAccessProvider.PREFIX) {
				this.quickInputService.quickAccess.show(providerDescriptor.prefix, { preserveValue: true });
			}
		}));

		// Fill in all providers separated By editor/gloBal scope
		const { editorProviders, gloBalProviders } = this.getQuickAccessProviders();
		picker.items = editorProviders.length === 0 || gloBalProviders.length === 0 ?

			// Without groups
			[
				...(editorProviders.length === 0 ? gloBalProviders : editorProviders)
			] :

			// With groups
			[
				{ laBel: localize('gloBalCommands', "gloBal commands"), type: 'separator' },
				...gloBalProviders,
				{ laBel: localize('editorCommands', "editor commands"), type: 'separator' },
				...editorProviders
			];

		return disposaBles;
	}

	private getQuickAccessProviders(): { editorProviders: IHelpQuickAccessPickItem[], gloBalProviders: IHelpQuickAccessPickItem[] } {
		const gloBalProviders: IHelpQuickAccessPickItem[] = [];
		const editorProviders: IHelpQuickAccessPickItem[] = [];

		for (const provider of this.registry.getQuickAccessProviders().sort((providerA, providerB) => providerA.prefix.localeCompare(providerB.prefix))) {
			if (provider.prefix === HelpQuickAccessProvider.PREFIX) {
				continue; // exclude help which is already active
			}

			for (const helpEntry of provider.helpEntries) {
				const prefix = helpEntry.prefix || provider.prefix;
				const laBel = prefix || '\u2026' /* ... */;

				(helpEntry.needsEditor ? editorProviders : gloBalProviders).push({
					prefix,
					laBel,
					ariaLaBel: localize('helpPickAriaLaBel', "{0}, {1}", laBel, helpEntry.description),
					description: helpEntry.description
				});
			}
		}

		return { editorProviders, gloBalProviders };
	}
}

