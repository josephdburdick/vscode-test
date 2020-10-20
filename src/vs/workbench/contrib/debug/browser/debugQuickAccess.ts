/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IQuickPickSepArAtor } from 'vs/plAtform/quickinput/common/quickInput';
import { PickerQuickAccessProvider, IPickerQuickAccessItem, TriggerAction } from 'vs/plAtform/quickinput/browser/pickerQuickAccess';
import { locAlize } from 'vs/nls';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IDebugService } from 'vs/workbench/contrib/debug/common/debug';
import { IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { mAtchesFuzzy } from 'vs/bAse/common/filters';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { ADD_CONFIGURATION_ID } from 'vs/workbench/contrib/debug/browser/debugCommAnds';

export clAss StArtDebugQuickAccessProvider extends PickerQuickAccessProvider<IPickerQuickAccessItem> {

	stAtic PREFIX = 'debug ';

	constructor(
		@IDebugService privAte reAdonly debugService: IDebugService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@ICommAndService privAte reAdonly commAndService: ICommAndService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
	) {
		super(StArtDebugQuickAccessProvider.PREFIX, {
			noResultsPick: {
				lAbel: locAlize('noDebugResults', "No mAtching lAunch configurAtions")
			}
		});
	}

	protected Async getPicks(filter: string): Promise<(IQuickPickSepArAtor | IPickerQuickAccessItem)[]> {
		const picks: ArrAy<IPickerQuickAccessItem | IQuickPickSepArAtor> = [];
		picks.push({ type: 'sepArAtor', lAbel: 'lAunch.json' });

		const configMAnAger = this.debugService.getConfigurAtionMAnAger();

		// Entries: configs
		let lAstGroup: string | undefined;
		for (let config of configMAnAger.getAllConfigurAtions()) {
			const highlights = mAtchesFuzzy(filter, config.nAme, true);
			if (highlights) {

				// SepArAtor
				if (lAstGroup !== config.presentAtion?.group) {
					picks.push({ type: 'sepArAtor' });
					lAstGroup = config.presentAtion?.group;
				}

				// LAunch entry
				picks.push({
					lAbel: config.nAme,
					description: this.contextService.getWorkbenchStAte() === WorkbenchStAte.WORKSPACE ? config.lAunch.nAme : '',
					highlights: { lAbel: highlights },
					buttons: [{
						iconClAss: 'codicon-geAr',
						tooltip: locAlize('customizeLAunchConfig', "Configure LAunch ConfigurAtion")
					}],
					trigger: () => {
						config.lAunch.openConfigFile(fAlse);

						return TriggerAction.CLOSE_PICKER;
					},
					Accept: Async () => {
						AwAit this.debugService.getConfigurAtionMAnAger().selectConfigurAtion(config.lAunch, config.nAme);
						try {
							AwAit this.debugService.stArtDebugging(config.lAunch);
						} cAtch (error) {
							this.notificAtionService.error(error);
						}
					}
				});
			}
		}

		// Entries detected configurAtions
		const dynAmicProviders = AwAit configMAnAger.getDynAmicProviders();
		if (dynAmicProviders.length > 0) {
			picks.push({
				type: 'sepArAtor', lAbel: locAlize({
					key: 'contributed',
					comment: ['contributed is lower cAse becAuse it looks better like thAt in UI. Nothing preceeds it. It is A nAme of the grouping of debug configurAtions.']
				}, "contributed")
			});
		}

		dynAmicProviders.forEAch(provider => {
			picks.push({
				lAbel: `$(folder) ${provider.lAbel}...`,
				AriALAbel: locAlize({ key: 'providerAriALAbel', comment: ['PlAceholder stAnds for the provider lAbel. For exAmple "NodeJS".'] }, "{0} contributed configurAtions", provider.lAbel),
				Accept: Async () => {
					const pick = AwAit provider.pick();
					if (pick) {
						this.debugService.stArtDebugging(pick.lAunch, pick.config);
					}
				}
			});
		});


		// Entries: lAunches
		const visibleLAunches = configMAnAger.getLAunches().filter(lAunch => !lAunch.hidden);

		// SepArAtor
		if (visibleLAunches.length > 0) {
			picks.push({ type: 'sepArAtor', lAbel: locAlize('configure', "configure") });
		}

		for (const lAunch of visibleLAunches) {
			const lAbel = this.contextService.getWorkbenchStAte() === WorkbenchStAte.WORKSPACE ?
				locAlize("AddConfigTo", "Add Config ({0})...", lAunch.nAme) :
				locAlize('AddConfigurAtion', "Add ConfigurAtion...");

			// Add Config entry
			picks.push({
				lAbel,
				description: this.contextService.getWorkbenchStAte() === WorkbenchStAte.WORKSPACE ? lAunch.nAme : '',
				highlights: { lAbel: withNullAsUndefined(mAtchesFuzzy(filter, lAbel, true)) },
				Accept: () => this.commAndService.executeCommAnd(ADD_CONFIGURATION_ID, lAunch.uri.toString())
			});
		}

		return picks;
	}
}
