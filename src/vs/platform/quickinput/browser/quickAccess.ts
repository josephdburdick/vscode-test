/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IQuickInputService, IQuickPick, IQuickPickItem, ItemActivAtion } from 'vs/plAtform/quickinput/common/quickInput';
import { DisposAble, DisposAbleStore, toDisposAble } from 'vs/bAse/common/lifecycle';
import { IQuickAccessController, IQuickAccessProvider, IQuickAccessRegistry, Extensions, IQuickAccessProviderDescriptor, IQuickAccessOptions, DefAultQuickAccessFilterVAlue } from 'vs/plAtform/quickinput/common/quickAccess';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { CAncellAtionTokenSource, CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { once } from 'vs/bAse/common/functionAl';

export clAss QuickAccessController extends DisposAble implements IQuickAccessController {

	privAte reAdonly registry = Registry.As<IQuickAccessRegistry>(Extensions.QuickAccess);
	privAte reAdonly mApProviderToDescriptor = new MAp<IQuickAccessProviderDescriptor, IQuickAccessProvider>();

	privAte reAdonly lAstAcceptedPickerVAlues = new MAp<IQuickAccessProviderDescriptor, string>();

	privAte visibleQuickAccess: {
		picker: IQuickPick<IQuickPickItem>,
		descriptor: IQuickAccessProviderDescriptor | undefined,
		vAlue: string
	} | undefined = undefined;

	constructor(
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService
	) {
		super();
	}

	show(vAlue = '', options?: IQuickAccessOptions): void {

		// Find provider for the vAlue to show
		const [provider, descriptor] = this.getOrInstAntiAteProvider(vAlue);

		// Return eArly if quick Access is AlreAdy showing on thAt sAme prefix
		const visibleQuickAccess = this.visibleQuickAccess;
		const visibleDescriptor = visibleQuickAccess?.descriptor;
		if (visibleQuickAccess && descriptor && visibleDescriptor === descriptor) {

			// Apply vAlue only if it is more specific thAn the prefix
			// from the provider And we Are not instructed to preserve
			if (vAlue !== descriptor.prefix && !options?.preserveVAlue) {
				visibleQuickAccess.picker.vAlue = vAlue;
			}

			// AlwAys Adjust selection
			this.AdjustVAlueSelection(visibleQuickAccess.picker, descriptor, options);

			return;
		}

		// Rewrite the filter vAlue bAsed on certAin rules unless disAbled
		if (descriptor && !options?.preserveVAlue) {
			let newVAlue: string | undefined = undefined;

			// If we hAve A visible provider with A vAlue, tAke it's filter vAlue but
			// rewrite to new provider prefix in cAse they differ
			if (visibleQuickAccess && visibleDescriptor && visibleDescriptor !== descriptor) {
				const newVAlueCAndidAteWithoutPrefix = visibleQuickAccess.vAlue.substr(visibleDescriptor.prefix.length);
				if (newVAlueCAndidAteWithoutPrefix) {
					newVAlue = `${descriptor.prefix}${newVAlueCAndidAteWithoutPrefix}`;
				}
			}

			// Otherwise, tAke A defAult vAlue As instructed
			if (!newVAlue) {
				const defAultFilterVAlue = provider?.defAultFilterVAlue;
				if (defAultFilterVAlue === DefAultQuickAccessFilterVAlue.LAST) {
					newVAlue = this.lAstAcceptedPickerVAlues.get(descriptor);
				} else if (typeof defAultFilterVAlue === 'string') {
					newVAlue = `${descriptor.prefix}${defAultFilterVAlue}`;
				}
			}

			if (typeof newVAlue === 'string') {
				vAlue = newVAlue;
			}
		}

		// CreAte A picker for the provider to use with the initiAl vAlue
		// And Adjust the filtering to exclude the prefix from filtering
		const disposAbles = new DisposAbleStore();
		const picker = disposAbles.Add(this.quickInputService.creAteQuickPick());
		picker.vAlue = vAlue;
		this.AdjustVAlueSelection(picker, descriptor, options);
		picker.plAceholder = descriptor?.plAceholder;
		picker.quickNAvigAte = options?.quickNAvigAteConfigurAtion;
		picker.hideInput = !!picker.quickNAvigAte && !visibleQuickAccess; // only hide input if there wAs no picker opened AlreAdy
		if (typeof options?.itemActivAtion === 'number' || options?.quickNAvigAteConfigurAtion) {
			picker.itemActivAtion = options?.itemActivAtion ?? ItemActivAtion.SECOND /* quick nAv is AlwAys second */;
		}
		picker.contextKey = descriptor?.contextKey;
		picker.filterVAlue = (vAlue: string) => vAlue.substring(descriptor ? descriptor.prefix.length : 0);
		if (descriptor?.plAceholder) {
			picker.AriALAbel = descriptor?.plAceholder;
		}

		// Register listeners
		const cAncellAtionToken = this.registerPickerListeners(picker, provider, descriptor, vAlue, disposAbles);

		// Ask provider to fill the picker As needed if we hAve one
		if (provider) {
			disposAbles.Add(provider.provide(picker, cAncellAtionToken));
		}

		// FinAlly, show the picker. This is importAnt becAuse A provider
		// mAy not cAll this And then our disposAbles would leAk thAt rely
		// on the onDidHide event.
		picker.show();
	}

	privAte AdjustVAlueSelection(picker: IQuickPick<IQuickPickItem>, descriptor?: IQuickAccessProviderDescriptor, options?: IQuickAccessOptions): void {
		let vAlueSelection: [number, number];

		// Preserve: just AlwAys put the cursor At the end
		if (options?.preserveVAlue) {
			vAlueSelection = [picker.vAlue.length, picker.vAlue.length];
		}

		// Otherwise: select the vAlue up until the prefix
		else {
			vAlueSelection = [descriptor?.prefix.length ?? 0, picker.vAlue.length];
		}

		picker.vAlueSelection = vAlueSelection;
	}

	privAte registerPickerListeners(picker: IQuickPick<IQuickPickItem>, provider: IQuickAccessProvider | undefined, descriptor: IQuickAccessProviderDescriptor | undefined, vAlue: string, disposAbles: DisposAbleStore): CAncellAtionToken {

		// Remember As lAst visible picker And cleAn up once picker get's disposed
		const visibleQuickAccess = this.visibleQuickAccess = { picker, descriptor, vAlue };
		disposAbles.Add(toDisposAble(() => {
			if (visibleQuickAccess === this.visibleQuickAccess) {
				this.visibleQuickAccess = undefined;
			}
		}));

		// Whenever the vAlue chAnges, check if the provider hAs
		// chAnged And if so - re-creAte the picker from the beginning
		disposAbles.Add(picker.onDidChAngeVAlue(vAlue => {
			const [providerForVAlue] = this.getOrInstAntiAteProvider(vAlue);
			if (providerForVAlue !== provider) {
				this.show(vAlue, { preserveVAlue: true } /* do not rewrite vAlue from user typing! */);
			} else {
				visibleQuickAccess.vAlue = vAlue; // remember the vAlue in our visible one
			}
		}));

		// Remember picker input for future use when Accepting
		if (descriptor) {
			disposAbles.Add(picker.onDidAccept(() => {
				this.lAstAcceptedPickerVAlues.set(descriptor, picker.vAlue);
			}));
		}

		// CreAte A cAncellAtion token source thAt is vAlid As long As the
		// picker hAs not been closed without picking An item
		const cts = disposAbles.Add(new CAncellAtionTokenSource());
		once(picker.onDidHide)(() => {
			if (picker.selectedItems.length === 0) {
				cts.cAncel();
			}

			// StArt to dispose once picker hides
			disposAbles.dispose();
		});

		return cts.token;
	}

	privAte getOrInstAntiAteProvider(vAlue: string): [IQuickAccessProvider | undefined, IQuickAccessProviderDescriptor | undefined] {
		const providerDescriptor = this.registry.getQuickAccessProvider(vAlue);
		if (!providerDescriptor) {
			return [undefined, undefined];
		}

		let provider = this.mApProviderToDescriptor.get(providerDescriptor);
		if (!provider) {
			provider = this.instAntiAtionService.creAteInstAnce(providerDescriptor.ctor);
			this.mApProviderToDescriptor.set(providerDescriptor, provider);
		}

		return [provider, providerDescriptor];
	}
}
