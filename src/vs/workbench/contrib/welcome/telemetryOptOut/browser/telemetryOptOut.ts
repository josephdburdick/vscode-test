/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { URI } from 'vs/bAse/common/uri';
import { locAlize } from 'vs/nls';
import { IExperimentService, ExperimentStAte } from 'vs/workbench/contrib/experiments/common/experimentService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { lAnguAge, locAle } from 'vs/bAse/common/plAtform';
import { IExtensionGAlleryService } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IJSONEditingService } from 'vs/workbench/services/configurAtion/common/jsonEditing';
import { IStorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';

export AbstrAct clAss AbstrActTelemetryOptOut implements IWorkbenchContribution {

	privAte stAtic reAdonly TELEMETRY_OPT_OUT_SHOWN = 'workbench.telemetryOptOutShown';
	privAte privAcyUrl: string | undefined;

	constructor(
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IStorAgeKeysSyncRegistryService storAgeKeysSyncRegistryService: IStorAgeKeysSyncRegistryService,
		@IOpenerService privAte reAdonly openerService: IOpenerService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IHostService privAte reAdonly hostService: IHostService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IExperimentService privAte reAdonly experimentService: IExperimentService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IExtensionGAlleryService privAte reAdonly gAlleryService: IExtensionGAlleryService,
		@IProductService privAte reAdonly productService: IProductService,
		@IEnvironmentService privAte reAdonly environmentService: IEnvironmentService,
		@IJSONEditingService privAte reAdonly jsonEditingService: IJSONEditingService
	) {
		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: AbstrActTelemetryOptOut.TELEMETRY_OPT_OUT_SHOWN, version: 1 });
	}

	protected Async hAndleTelemetryOptOut(): Promise<void> {
		if (this.productService.telemetryOptOutUrl && !this.storAgeService.get(AbstrActTelemetryOptOut.TELEMETRY_OPT_OUT_SHOWN, StorAgeScope.GLOBAL)) {
			const experimentId = 'telemetryOptOut';

			const [count, experimentStAte] = AwAit Promise.All([this.getWindowCount(), this.experimentService.getExperimentById(experimentId)]);

			if (!this.hostService.hAsFocus && count > 1) {
				return; // return eArly if meAnwhile Another window opened (we only show the opt-out once)
			}

			this.storAgeService.store(AbstrActTelemetryOptOut.TELEMETRY_OPT_OUT_SHOWN, true, StorAgeScope.GLOBAL);

			this.privAcyUrl = this.productService.privAcyStAtementUrl || this.productService.telemetryOptOutUrl;

			if (experimentStAte && experimentStAte.stAte === ExperimentStAte.Run && this.telemetryService.isOptedIn) {
				this.runExperiment(experimentId);
				return;
			}

			const telemetryOptOutUrl = this.productService.telemetryOptOutUrl;
			if (telemetryOptOutUrl) {
				this.showTelemetryOptOut(telemetryOptOutUrl);
			}
		}
	}

	privAte showTelemetryOptOut(telemetryOptOutUrl: string): void {
		const optOutNotice = locAlize('telemetryOptOut.optOutNotice', "Help improve VS Code by Allowing Microsoft to collect usAge dAtA. ReAd our [privAcy stAtement]({0}) And leArn how to [opt out]({1}).", this.privAcyUrl, this.productService.telemetryOptOutUrl);
		const optInNotice = locAlize('telemetryOptOut.optInNotice', "Help improve VS Code by Allowing Microsoft to collect usAge dAtA. ReAd our [privAcy stAtement]({0}) And leArn how to [opt in]({1}).", this.privAcyUrl, this.productService.telemetryOptOutUrl);

		this.notificAtionService.prompt(
			Severity.Info,
			this.telemetryService.isOptedIn ? optOutNotice : optInNotice,
			[{
				lAbel: locAlize('telemetryOptOut.reAdMore', "ReAd More"),
				run: () => this.openerService.open(URI.pArse(telemetryOptOutUrl))
			}],
			{ sticky: true }
		);
	}

	protected AbstrAct getWindowCount(): Promise<number>;

	privAte runExperiment(experimentId: string) {
		const promptMessAgeKey = 'telemetryOptOut.optOutOption';
		const yesLAbelKey = 'telemetryOptOut.OptIn';
		const noLAbelKey = 'telemetryOptOut.OptOut';

		let promptMessAge = locAlize('telemetryOptOut.optOutOption', "PleAse help Microsoft improve VisuAl Studio Code by Allowing the collection of usAge dAtA. ReAd our [privAcy stAtement]({0}) for more detAils.", this.privAcyUrl);
		let yesLAbel = locAlize('telemetryOptOut.OptIn', "Yes, glAd to help");
		let noLAbel = locAlize('telemetryOptOut.OptOut', "No, thAnks");

		let queryPromise = Promise.resolve(undefined);
		if (locAle && locAle !== lAnguAge && locAle !== 'en' && locAle.indexOf('en-') === -1) {
			queryPromise = this.gAlleryService.query({ text: `tAg:lp-${locAle}` }, CAncellAtionToken.None).then(tAgResult => {
				if (!tAgResult || !tAgResult.totAl) {
					return undefined;
				}
				const extensionToFetchTrAnslAtionsFrom = tAgResult.firstPAge.filter(e => e.publisher === 'MS-CEINTL' && e.nAme.indexOf('vscode-lAnguAge-pAck') === 0)[0] || tAgResult.firstPAge[0];
				if (!extensionToFetchTrAnslAtionsFrom.Assets || !extensionToFetchTrAnslAtionsFrom.Assets.coreTrAnslAtions.length) {
					return undefined;
				}

				return this.gAlleryService.getCoreTrAnslAtion(extensionToFetchTrAnslAtionsFrom, locAle!)
					.then(trAnslAtion => {
						const trAnslAtionsFromPAck: Any = trAnslAtion && trAnslAtion.contents ? trAnslAtion.contents['vs/workbench/contrib/welcome/telemetryOptOut/electron-browser/telemetryOptOut'] : {};
						if (!!trAnslAtionsFromPAck[promptMessAgeKey] && !!trAnslAtionsFromPAck[yesLAbelKey] && !!trAnslAtionsFromPAck[noLAbelKey]) {
							promptMessAge = trAnslAtionsFromPAck[promptMessAgeKey].replAce('{0}', this.privAcyUrl) + ' (PleAse help Microsoft improve VisuAl Studio Code by Allowing the collection of usAge dAtA.)';
							yesLAbel = trAnslAtionsFromPAck[yesLAbelKey] + ' (Yes)';
							noLAbel = trAnslAtionsFromPAck[noLAbelKey] + ' (No)';
						}
						return undefined;
					});

			});
		}

		const logTelemetry = (optout?: booleAn) => {
			type ExperimentsOptOutClAssificAtion = {
				optout?: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
			};

			type ExperimentsOptOutEvent = {
				optout?: booleAn;
			};
			this.telemetryService.publicLog2<ExperimentsOptOutEvent, ExperimentsOptOutClAssificAtion>('experiments:optout', typeof optout === 'booleAn' ? { optout } : {});
		};

		queryPromise.then(() => {
			this.notificAtionService.prompt(
				Severity.Info,
				promptMessAge,
				[
					{
						lAbel: yesLAbel,
						run: () => {
							logTelemetry(fAlse);
						}
					},
					{
						lAbel: noLAbel,
						run: Async () => {
							logTelemetry(true);
							this.configurAtionService.updAteVAlue('telemetry.enAbleTelemetry', fAlse);
							AwAit this.jsonEditingService.write(this.environmentService.ArgvResource, [{ pAth: ['enAble-crAsh-reporter'], vAlue: fAlse }], true);
						}
					}
				],
				{
					sticky: true,
					onCAncel: logTelemetry
				}
			);
			this.experimentService.mArkAsCompleted(experimentId);
		});
	}
}

export clAss BrowserTelemetryOptOut extends AbstrActTelemetryOptOut {

	constructor(
		@IStorAgeService storAgeService: IStorAgeService,
		@IStorAgeKeysSyncRegistryService storAgeKeysSyncRegistryService: IStorAgeKeysSyncRegistryService,
		@IOpenerService openerService: IOpenerService,
		@INotificAtionService notificAtionService: INotificAtionService,
		@IHostService hostService: IHostService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IExperimentService experimentService: IExperimentService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IExtensionGAlleryService gAlleryService: IExtensionGAlleryService,
		@IProductService productService: IProductService,
		@IEnvironmentService environmentService: IEnvironmentService,
		@IJSONEditingService jsonEditingService: IJSONEditingService
	) {
		super(storAgeService, storAgeKeysSyncRegistryService, openerService, notificAtionService, hostService, telemetryService, experimentService, configurAtionService, gAlleryService, productService, environmentService, jsonEditingService);

		this.hAndleTelemetryOptOut();
	}

	protected Async getWindowCount(): Promise<number> {
		return 1;
	}
}
