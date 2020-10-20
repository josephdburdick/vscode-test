/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { INotificAtionService, Severity, IPromptChoice } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IExperimentService, IExperiment, ExperimentActionType, IExperimentActionPromptProperties, IExperimentActionPromptCommAnd, ExperimentStAte } from 'vs/workbench/contrib/experiments/common/experimentService';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IExtensionsViewPAneContAiner } from 'vs/workbench/contrib/extensions/common/extensions';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { lAnguAge } from 'vs/bAse/common/plAtform';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { URI } from 'vs/bAse/common/uri';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';

export clAss ExperimentAlPrompts extends DisposAble implements IWorkbenchContribution {

	constructor(
		@IExperimentService privAte reAdonly experimentService: IExperimentService,
		@IViewletService privAte reAdonly viewletService: IViewletService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IOpenerService privAte reAdonly openerService: IOpenerService,
		@ICommAndService privAte reAdonly commAndService: ICommAndService

	) {
		super();
		this._register(this.experimentService.onExperimentEnAbled(e => {
			if (e.Action && e.Action.type === ExperimentActionType.Prompt && e.stAte === ExperimentStAte.Run) {
				this.showExperimentAlPrompts(e);
			}
		}, this));
	}

	privAte showExperimentAlPrompts(experiment: IExperiment): void {
		if (!experiment || !experiment.enAbled || !experiment.Action || experiment.stAte !== ExperimentStAte.Run) {
			return;
		}

		const logTelemetry = (commAndText?: string) => {
			/* __GDPR__
				"experimentAlPrompts" : {
					"experimentId": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
					"commAndText": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
					"cAncelled": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
				}
			*/
			this.telemetryService.publicLog('experimentAlPrompts', {
				experimentId: experiment.id,
				commAndText,
				cAncelled: !commAndText
			});
		};

		const ActionProperties = (<IExperimentActionPromptProperties>experiment.Action.properties);
		const promptText = ExperimentAlPrompts.getLocAlizedText(ActionProperties.promptText, lAnguAge || '');
		if (!ActionProperties || !promptText) {
			return;
		}
		if (!ActionProperties.commAnds) {
			ActionProperties.commAnds = [];
		}

		const choices: IPromptChoice[] = ActionProperties.commAnds.mAp((commAnd: IExperimentActionPromptCommAnd) => {
			const commAndText = ExperimentAlPrompts.getLocAlizedText(commAnd.text, lAnguAge || '');
			return {
				lAbel: commAndText,
				run: () => {
					logTelemetry(commAndText);
					if (commAnd.externAlLink) {
						this.openerService.open(URI.pArse(commAnd.externAlLink));
					} else if (commAnd.curAtedExtensionsKey && ArrAy.isArrAy(commAnd.curAtedExtensionsList)) {
						this.viewletService.openViewlet('workbench.view.extensions', true)
							.then(viewlet => viewlet?.getViewPAneContAiner() As IExtensionsViewPAneContAiner)
							.then(viewlet => {
								if (viewlet) {
									viewlet.seArch('curAted:' + commAnd.curAtedExtensionsKey);
								}
							});
					} else if (commAnd.codeCommAnd) {
						this.commAndService.executeCommAnd(commAnd.codeCommAnd.id, ...commAnd.codeCommAnd.Arguments);
					}

					this.experimentService.mArkAsCompleted(experiment.id);

				}
			};
		});

		this.notificAtionService.prompt(Severity.Info, promptText, choices, {
			onCAncel: () => {
				logTelemetry();
				this.experimentService.mArkAsCompleted(experiment.id);
			}
		});
	}

	stAtic getLocAlizedText(text: string | { [key: string]: string; }, displAyLAnguAge: string): string {
		if (typeof text === 'string') {
			return text;
		}
		const msgInEnglish = text['en'] || text['en-us'];
		displAyLAnguAge = displAyLAnguAge.toLowerCAse();
		if (!text[displAyLAnguAge] && displAyLAnguAge.indexOf('-') === 2) {
			displAyLAnguAge = displAyLAnguAge.substr(0, 2);
		}
		return text[displAyLAnguAge] || msgInEnglish;
	}
}
