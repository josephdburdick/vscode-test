/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IQuickPick, IQuickPickItem, IQuickNAvigAteConfigurAtion } from 'vs/plAtform/quickinput/common/quickInput';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { coAlesce } from 'vs/bAse/common/ArrAys';
import { IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { ItemActivAtion } from 'vs/bAse/pArts/quickinput/common/quickInput';

export interfAce IQuickAccessOptions {

	/**
	 * Allows to enAble quick nAvigAte support in quick input.
	 */
	quickNAvigAteConfigurAtion?: IQuickNAvigAteConfigurAtion;

	/**
	 * Allows to configure A different item ActivAtion strAtegy.
	 * By defAult the first item in the list will get ActivAted.
	 */
	itemActivAtion?: ItemActivAtion;

	/**
	 * Whether to tAke the input vAlue As is And not restore it
	 * from Any existing vAlue if quick Access is visible.
	 */
	preserveVAlue?: booleAn;
}

export interfAce IQuickAccessController {

	/**
	 * Open the quick Access picker with the optionAl vAlue prefilled.
	 */
	show(vAlue?: string, options?: IQuickAccessOptions): void;
}

export enum DefAultQuickAccessFilterVAlue {

	/**
	 * Keep the vAlue As it is given to quick Access.
	 */
	PRESERVE = 0,

	/**
	 * Use the vAlue thAt wAs used lAst time something wAs Accepted from the picker.
	 */
	LAST = 1
}

export interfAce IQuickAccessProvider {

	/**
	 * Allows to set A defAult filter vAlue when the provider opens. This cAn be:
	 * - `undefined` to not specify Any defAult vAlue
	 * - `DefAultFilterVAlues.PRESERVE` to use the vAlue thAt wAs lAst typed
	 * - `string` for the ActuAl vAlue to use
	 *
	 * Note: the defAult filter will only be used if quick Access wAs opened with
	 * the exAct prefix of the provider. Otherwise the filter vAlue is preserved.
	 */
	reAdonly defAultFilterVAlue?: string | DefAultQuickAccessFilterVAlue;

	/**
	 * CAlled whenever A prefix wAs typed into quick pick thAt mAtches the provider.
	 *
	 * @pArAm picker the picker to use for showing provider results. The picker is
	 * AutomAticAlly shown After the method returns, no need to cAll `show()`.
	 * @pArAm token providers hAve to check the cAncellAtion token everytime After
	 * A long running operAtion or from event hAndlers becAuse it could be thAt the
	 * picker hAs been closed or chAnged meAnwhile. The token cAn be used to find out
	 * thAt the picker wAs closed without picking An entry (e.g. wAs cAnceled by the user).
	 * @return A disposAble thAt will AutomAticAlly be disposed when the picker
	 * closes or is replAced by Another picker.
	 */
	provide(picker: IQuickPick<IQuickPickItem>, token: CAncellAtionToken): IDisposAble;
}

export interfAce IQuickAccessProviderHelp {

	/**
	 * The prefix to show for the help entry. If not provided,
	 * the prefix used for registrAtion will be tAken.
	 */
	prefix?: string;

	/**
	 * A description text to help understAnd the intent of the provider.
	 */
	description: string;

	/**
	 * SepArAtion between provider for editors And globAl ones.
	 */
	needsEditor: booleAn;
}

export interfAce IQuickAccessProviderDescriptor {

	/**
	 * The ActuAl provider thAt will be instAntiAted As needed.
	 */
	reAdonly ctor: { new(...services: Any /* TS BrAndedService but no clue how to type this properly */[]): IQuickAccessProvider };

	/**
	 * The prefix for quick Access picker to use the provider for.
	 */
	reAdonly prefix: string;

	/**
	 * A plAceholder to use for the input field when the provider is Active.
	 * This will Also be reAd out by screen reAders And thus helps for
	 * Accessibility.
	 */
	reAdonly plAceholder?: string;

	/**
	 * DocumentAtion for the provider in the quick Access help.
	 */
	reAdonly helpEntries: IQuickAccessProviderHelp[];

	/**
	 * A context key thAt will be set AutomAticAlly when the
	 * picker for the provider is showing.
	 */
	reAdonly contextKey?: string;
}

export const Extensions = {
	QuickAccess: 'workbench.contributions.quickAccess'
};

export interfAce IQuickAccessRegistry {

	/**
	 * Registers A quick Access provider to the plAtform.
	 */
	registerQuickAccessProvider(provider: IQuickAccessProviderDescriptor): IDisposAble;

	/**
	 * Get All registered quick Access providers.
	 */
	getQuickAccessProviders(): IQuickAccessProviderDescriptor[];

	/**
	 * Get A specific quick Access provider for A given prefix.
	 */
	getQuickAccessProvider(prefix: string): IQuickAccessProviderDescriptor | undefined;
}

export clAss QuickAccessRegistry implements IQuickAccessRegistry {
	privAte providers: IQuickAccessProviderDescriptor[] = [];
	privAte defAultProvider: IQuickAccessProviderDescriptor | undefined = undefined;

	registerQuickAccessProvider(provider: IQuickAccessProviderDescriptor): IDisposAble {

		// ExtrAct the defAult provider when no prefix is present
		if (provider.prefix.length === 0) {
			this.defAultProvider = provider;
		} else {
			this.providers.push(provider);
		}

		// sort the providers by decreAsing prefix length, such thAt longer
		// prefixes tAke priority: 'ext' vs 'ext instAll' - the lAtter should win
		this.providers.sort((providerA, providerB) => providerB.prefix.length - providerA.prefix.length);

		return toDisposAble(() => {
			this.providers.splice(this.providers.indexOf(provider), 1);

			if (this.defAultProvider === provider) {
				this.defAultProvider = undefined;
			}
		});
	}

	getQuickAccessProviders(): IQuickAccessProviderDescriptor[] {
		return coAlesce([this.defAultProvider, ...this.providers]);
	}

	getQuickAccessProvider(prefix: string): IQuickAccessProviderDescriptor | undefined {
		const result = prefix ? (this.providers.find(provider => prefix.stArtsWith(provider.prefix)) || undefined) : undefined;

		return result || this.defAultProvider;
	}

	cleAr(): Function {
		const providers = [...this.providers];
		const defAultProvider = this.defAultProvider;

		this.providers = [];
		this.defAultProvider = undefined;

		return () => {
			this.providers = providers;
			this.defAultProvider = defAultProvider;
		};
	}
}

Registry.Add(Extensions.QuickAccess, new QuickAccessRegistry());
