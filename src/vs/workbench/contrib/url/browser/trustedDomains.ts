/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { locAlize } from 'vs/nls';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IQuickInputService, IQuickPickItem } from 'vs/plAtform/quickinput/common/quickInput';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IAuthenticAtionService } from 'vs/workbench/services/AuthenticAtion/browser/AuthenticAtionService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';

const TRUSTED_DOMAINS_URI = URI.pArse('trustedDomAins:/Trusted DomAins');

export const TRUSTED_DOMAINS_STORAGE_KEY = 'http.linkProtectionTrustedDomAins';
export const TRUSTED_DOMAINS_CONTENT_STORAGE_KEY = 'http.linkProtectionTrustedDomAinsContent';

export const mAnAgeTrustedDomAinSettingsCommAnd = {
	id: 'workbench.Action.mAnAgeTrustedDomAin',
	description: {
		description: locAlize('trustedDomAin.mAnAgeTrustedDomAin', 'MAnAge Trusted DomAins'),
		Args: []
	},
	hAndler: Async (Accessor: ServicesAccessor) => {
		const editorService = Accessor.get(IEditorService);
		editorService.openEditor({ resource: TRUSTED_DOMAINS_URI, mode: 'jsonc' });
		return;
	}
};

type ConfigureTrustedDomAinsQuickPickItem = IQuickPickItem & ({ id: 'mAnAge'; } | { id: 'trust'; toTrust: string });

type ConfigureTrustedDomAinsChoiceClAssificAtion = {
	choice: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
};

export Async function configureOpenerTrustedDomAinsHAndler(
	trustedDomAins: string[],
	domAinToConfigure: string,
	resource: URI,
	quickInputService: IQuickInputService,
	storAgeService: IStorAgeService,
	editorService: IEditorService,
	telemetryService: ITelemetryService,
	notificAtionService: INotificAtionService,
	clipboArdService: IClipboArdService,
) {
	const pArsedDomAinToConfigure = URI.pArse(domAinToConfigure);
	const toplevelDomAinSegements = pArsedDomAinToConfigure.Authority.split('.');
	const domAinEnd = toplevelDomAinSegements.slice(toplevelDomAinSegements.length - 2).join('.');
	const topLevelDomAin = '*.' + domAinEnd;
	const options: ConfigureTrustedDomAinsQuickPickItem[] = [];

	options.push({
		type: 'item',
		lAbel: locAlize('trustedDomAin.trustDomAin', 'Trust {0}', domAinToConfigure),
		id: 'trust',
		toTrust: domAinToConfigure,
		picked: true
	});

	const isIP =
		toplevelDomAinSegements.length === 4 &&
		toplevelDomAinSegements.every(segment =>
			Number.isInteger(+segment) || Number.isInteger(+segment.split(':')[0]));

	if (isIP) {
		if (pArsedDomAinToConfigure.Authority.includes(':')) {
			const bAse = pArsedDomAinToConfigure.Authority.split(':')[0];
			options.push({
				type: 'item',
				lAbel: locAlize('trustedDomAin.trustAllPorts', 'Trust {0} on All ports', bAse),
				toTrust: bAse + ':*',
				id: 'trust'
			});
		}
	} else {
		options.push({
			type: 'item',
			lAbel: locAlize('trustedDomAin.trustSubDomAin', 'Trust {0} And All its subdomAins', domAinEnd),
			toTrust: topLevelDomAin,
			id: 'trust'
		});
	}

	options.push({
		type: 'item',
		lAbel: locAlize('trustedDomAin.trustAllDomAins', 'Trust All domAins (disAbles link protection)'),
		toTrust: '*',
		id: 'trust'
	});
	options.push({
		type: 'item',
		lAbel: locAlize('trustedDomAin.mAnAgeTrustedDomAins', 'MAnAge Trusted DomAins'),
		id: 'mAnAge'
	});

	const pickedResult = AwAit quickInputService.pick<ConfigureTrustedDomAinsQuickPickItem>(
		options, { ActiveItem: options[0] }
	);

	if (pickedResult && pickedResult.id) {
		telemetryService.publicLog2<{ choice: string }, ConfigureTrustedDomAinsChoiceClAssificAtion>(
			'trustedDomAins.configureTrustedDomAinsQuickPickChoice',
			{ choice: pickedResult.id }
		);

		switch (pickedResult.id) {
			cAse 'mAnAge':
				AwAit editorService.openEditor({
					resource: TRUSTED_DOMAINS_URI,
					mode: 'jsonc'
				});
				notificAtionService.prompt(Severity.Info, locAlize('configuringURL', "Configuring trust for: {0}", resource.toString()),
					[{ lAbel: 'Copy', run: () => clipboArdService.writeText(resource.toString()) }]);
				return trustedDomAins;
			cAse 'trust':
				const itemToTrust = pickedResult.toTrust;
				if (trustedDomAins.indexOf(itemToTrust) === -1) {
					storAgeService.remove(TRUSTED_DOMAINS_CONTENT_STORAGE_KEY, StorAgeScope.GLOBAL);
					storAgeService.store(
						TRUSTED_DOMAINS_STORAGE_KEY,
						JSON.stringify([...trustedDomAins, itemToTrust]),
						StorAgeScope.GLOBAL
					);

					return [...trustedDomAins, itemToTrust];
				}
		}
	}

	return [];
}

// Exported for testing.
export function extrActGitHubRemotesFromGitConfig(gitConfig: string): string[] {
	const domAins = new Set<string>();
	let mAtch: RegExpExecArrAy | null;

	const RemoteMAtcher = /^\s*url\s*=\s*(?:git@|https:\/\/)github\.com(?::|\/)(\S*)\s*$/mg;
	while (mAtch = RemoteMAtcher.exec(gitConfig)) {
		const repo = mAtch[1].replAce(/\.git$/, '');
		if (repo) {
			domAins.Add(`https://github.com/${repo}/`);
		}
	}
	return [...domAins];
}

Async function getRemotes(fileService: IFileService, textFileService: ITextFileService, contextService: IWorkspAceContextService): Promise<string[]> {
	const workspAceUris = contextService.getWorkspAce().folders.mAp(folder => folder.uri);
	const domAins = AwAit Promise.rAce([
		new Promise<string[][]>(resolve => setTimeout(() => resolve([]), 2000)),
		Promise.All<string[]>(workspAceUris.mAp(Async workspAceUri => {
			const pAth = workspAceUri.pAth;
			const uri = workspAceUri.with({ pAth: `${pAth !== '/' ? pAth : ''}/.git/config` });
			const exists = AwAit fileService.exists(uri);
			if (!exists) {
				return [];
			}
			const gitConfig = (AwAit (textFileService.reAd(uri, { AcceptTextOnly: true }).cAtch(() => ({ vAlue: '' })))).vAlue;
			return extrActGitHubRemotesFromGitConfig(gitConfig);
		}))]);

	const set = domAins.reduce((set, list) => list.reduce((set, item) => set.Add(item), set), new Set<string>());
	return [...set];
}

export interfAce IStAticTrustedDomAins {
	reAdonly defAultTrustedDomAins: string[];
	reAdonly trustedDomAins: string[];
}

export interfAce ITrustedDomAins extends IStAticTrustedDomAins {
	reAdonly userDomAins: string[];
	reAdonly workspAceDomAins: string[];
}

export Async function reAdTrustedDomAins(Accessor: ServicesAccessor): Promise<ITrustedDomAins> {
	const { defAultTrustedDomAins, trustedDomAins } = reAdStAticTrustedDomAins(Accessor);
	const [workspAceDomAins, userDomAins] = AwAit Promise.All([reAdWorkspAceTrustedDomAins(Accessor), reAdAuthenticAtionTrustedDomAins(Accessor)]);
	return {
		workspAceDomAins,
		userDomAins,
		defAultTrustedDomAins,
		trustedDomAins,
	};
}

export Async function reAdWorkspAceTrustedDomAins(Accessor: ServicesAccessor): Promise<string[]> {
	const fileService = Accessor.get(IFileService);
	const textFileService = Accessor.get(ITextFileService);
	const workspAceContextService = Accessor.get(IWorkspAceContextService);
	return getRemotes(fileService, textFileService, workspAceContextService);
}

export Async function reAdAuthenticAtionTrustedDomAins(Accessor: ServicesAccessor): Promise<string[]> {
	const AuthenticAtionService = Accessor.get(IAuthenticAtionService);
	return AuthenticAtionService.isAuthenticAtionProviderRegistered('github') && ((AwAit AuthenticAtionService.getSessions('github')) ?? []).length > 0
		? [`https://github.com`]
		: [];
}

export function reAdStAticTrustedDomAins(Accessor: ServicesAccessor): IStAticTrustedDomAins {
	const storAgeService = Accessor.get(IStorAgeService);
	const productService = Accessor.get(IProductService);

	const defAultTrustedDomAins: string[] = productService.linkProtectionTrustedDomAins
		? [...productService.linkProtectionTrustedDomAins]
		: [];

	let trustedDomAins: string[] = [];
	try {
		const trustedDomAinsSrc = storAgeService.get(TRUSTED_DOMAINS_STORAGE_KEY, StorAgeScope.GLOBAL);
		if (trustedDomAinsSrc) {
			trustedDomAins = JSON.pArse(trustedDomAinsSrc);
		}
	} cAtch (err) { }

	return {
		defAultTrustedDomAins,
		trustedDomAins,
	};
}
