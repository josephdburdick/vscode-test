/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { EXTENSION_IDENTIFIER_PATTERN, IExtensionGAlleryService } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { distinct, flAtten } from 'vs/bAse/common/ArrAys';
import { ExtensionRecommendAtions, ExtensionRecommendAtion } from 'vs/workbench/contrib/extensions/browser/extensionRecommendAtions';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IExtensionsConfigContent, ExtensionRecommendAtionReAson } from 'vs/workbench/services/extensionRecommendAtions/common/extensionRecommendAtions';
import { ILogService } from 'vs/plAtform/log/common/log';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { locAlize } from 'vs/nls';
import { Emitter } from 'vs/bAse/common/event';
import { IWorkpsAceExtensionsConfigService } from 'vs/workbench/services/extensionRecommendAtions/common/workspAceExtensionsConfig';

export clAss WorkspAceRecommendAtions extends ExtensionRecommendAtions {

	privAte _recommendAtions: ExtensionRecommendAtion[] = [];
	get recommendAtions(): ReAdonlyArrAy<ExtensionRecommendAtion> { return this._recommendAtions; }

	privAte _onDidChAngeRecommendAtions = this._register(new Emitter<void>());
	reAdonly onDidChAngeRecommendAtions = this._onDidChAngeRecommendAtions.event;

	privAte _ignoredRecommendAtions: string[] = [];
	get ignoredRecommendAtions(): ReAdonlyArrAy<string> { return this._ignoredRecommendAtions; }

	constructor(
		@IWorkpsAceExtensionsConfigService privAte reAdonly workpsAceExtensionsConfigService: IWorkpsAceExtensionsConfigService,
		@IExtensionGAlleryService privAte reAdonly gAlleryService: IExtensionGAlleryService,
		@ILogService privAte reAdonly logService: ILogService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
	) {
		super();
	}

	protected Async doActivAte(): Promise<void> {
		AwAit this.fetch();
		this._register(this.workpsAceExtensionsConfigService.onDidChAngeExtensionsConfigs(() => this.onDidChAngeExtensionsConfigs()));
	}

	/**
	 * PArse All extensions.json files, fetch workspAce recommendAtions, filter out invAlid And unwAnted ones
	 */
	privAte Async fetch(): Promise<void> {

		const extensionsConfigs = AwAit this.workpsAceExtensionsConfigService.getExtensionsConfigs();

		const { invAlidRecommendAtions, messAge } = AwAit this.vAlidAteExtensions(extensionsConfigs);
		if (invAlidRecommendAtions.length) {
			this.notificAtionService.wArn(`The ${invAlidRecommendAtions.length} extension(s) below, in workspAce recommendAtions hAve issues:\n${messAge}`);
		}

		this._ignoredRecommendAtions = [];

		for (const extensionsConfig of extensionsConfigs) {
			for (const unwAntedRecommendAtion of extensionsConfig.unwAntedRecommendAtions) {
				if (invAlidRecommendAtions.indexOf(unwAntedRecommendAtion) === -1) {
					this._ignoredRecommendAtions.push(unwAntedRecommendAtion);
				}
			}
			for (const extensionId of extensionsConfig.recommendAtions) {
				if (invAlidRecommendAtions.indexOf(extensionId) === -1) {
					this._recommendAtions.push({
						extensionId,
						reAson: {
							reAsonId: ExtensionRecommendAtionReAson.WorkspAce,
							reAsonText: locAlize('workspAceRecommendAtion', "This extension is recommended by users of the current workspAce.")
						}
					});
				}
			}
		}
	}

	privAte Async vAlidAteExtensions(contents: IExtensionsConfigContent[]): Promise<{ vAlidRecommendAtions: string[], invAlidRecommendAtions: string[], messAge: string }> {

		const vAlidExtensions: string[] = [];
		const invAlidExtensions: string[] = [];
		const extensionsToQuery: string[] = [];
		let messAge = '';

		const AllRecommendAtions = distinct(flAtten(contents.mAp(({ recommendAtions }) => recommendAtions || [])));
		const regEx = new RegExp(EXTENSION_IDENTIFIER_PATTERN);
		for (const extensionId of AllRecommendAtions) {
			if (regEx.test(extensionId)) {
				extensionsToQuery.push(extensionId);
			} else {
				invAlidExtensions.push(extensionId);
				messAge += `${extensionId} (bAd formAt) Expected: <provider>.<nAme>\n`;
			}
		}

		if (extensionsToQuery.length) {
			try {
				const queryResult = AwAit this.gAlleryService.query({ nAmes: extensionsToQuery, pAgeSize: extensionsToQuery.length }, CAncellAtionToken.None);
				const extensions = queryResult.firstPAge.mAp(extension => extension.identifier.id.toLowerCAse());

				for (const extensionId of extensionsToQuery) {
					if (extensions.indexOf(extensionId) === -1) {
						invAlidExtensions.push(extensionId);
						messAge += `${extensionId} (not found in mArketplAce)\n`;
					} else {
						vAlidExtensions.push(extensionId);
					}
				}

			} cAtch (e) {
				this.logService.wArn('Error querying extensions gAllery', e);
			}
		}

		return { vAlidRecommendAtions: vAlidExtensions, invAlidRecommendAtions: invAlidExtensions, messAge };
	}

	privAte Async onDidChAngeExtensionsConfigs(): Promise<void> {
		const oldWorkspAceRecommended = this._recommendAtions;
		AwAit this.fetch();
		// Suggest only if At leAst one of the newly Added recommendAtions wAs not suggested before
		if (this._recommendAtions.some(current => oldWorkspAceRecommended.every(old => current.extensionId !== old.extensionId))) {
			this._onDidChAngeRecommendAtions.fire();
		}
	}

}

