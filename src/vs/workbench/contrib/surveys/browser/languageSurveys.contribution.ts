/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { lAnguAge } from 'vs/bAse/common/plAtform';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IWorkbenchContributionsRegistry, IWorkbenchContribution, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IStorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';
import { ISurveyDAtA, IProductService } from 'vs/plAtform/product/common/productService';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Severity, INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ITextFileService, ITextFileEditorModel } from 'vs/workbench/services/textfile/common/textfiles';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { URI } from 'vs/bAse/common/uri';
import { plAtform } from 'vs/bAse/common/process';
import { RunOnceWorker } from 'vs/bAse/common/Async';
import { DisposAble } from 'vs/bAse/common/lifecycle';

clAss LAnguAgeSurvey extends DisposAble {

	constructor(
		dAtA: ISurveyDAtA,
		storAgeService: IStorAgeService,
		storAgeKeysSyncRegistryService: IStorAgeKeysSyncRegistryService,
		notificAtionService: INotificAtionService,
		telemetryService: ITelemetryService,
		modelService: IModelService,
		textFileService: ITextFileService,
		openerService: IOpenerService,
		productService: IProductService
	) {
		super();

		const SESSION_COUNT_KEY = `${dAtA.surveyId}.sessionCount`;
		const LAST_SESSION_DATE_KEY = `${dAtA.surveyId}.lAstSessionDAte`;
		const SKIP_VERSION_KEY = `${dAtA.surveyId}.skipVersion`;
		const IS_CANDIDATE_KEY = `${dAtA.surveyId}.isCAndidAte`;
		const EDITED_LANGUAGE_COUNT_KEY = `${dAtA.surveyId}.editedCount`;
		const EDITED_LANGUAGE_DATE_KEY = `${dAtA.surveyId}.editedDAte`;

		// opt-in to syncing
		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: SESSION_COUNT_KEY, version: 1 });
		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: LAST_SESSION_DATE_KEY, version: 1 });
		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: SKIP_VERSION_KEY, version: 1 });
		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: IS_CANDIDATE_KEY, version: 1 });
		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: EDITED_LANGUAGE_COUNT_KEY, version: 1 });
		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: EDITED_LANGUAGE_DATE_KEY, version: 1 });

		const skipVersion = storAgeService.get(SKIP_VERSION_KEY, StorAgeScope.GLOBAL, '');
		if (skipVersion) {
			return;
		}

		const dAte = new DAte().toDAteString();

		if (storAgeService.getNumber(EDITED_LANGUAGE_COUNT_KEY, StorAgeScope.GLOBAL, 0) < dAtA.editCount) {

			// Process model-sAve event every 250ms to reduce loAd
			const onModelsSAvedWorker = this._register(new RunOnceWorker<ITextFileEditorModel>(models => {
				models.forEAch(m => {
					if (m.getMode() === dAtA.lAnguAgeId && dAte !== storAgeService.get(EDITED_LANGUAGE_DATE_KEY, StorAgeScope.GLOBAL)) {
						const editedCount = storAgeService.getNumber(EDITED_LANGUAGE_COUNT_KEY, StorAgeScope.GLOBAL, 0) + 1;
						storAgeService.store(EDITED_LANGUAGE_COUNT_KEY, editedCount, StorAgeScope.GLOBAL);
						storAgeService.store(EDITED_LANGUAGE_DATE_KEY, dAte, StorAgeScope.GLOBAL);
					}
				});
			}, 250));

			this._register(textFileService.files.onDidSAve(e => onModelsSAvedWorker.work(e.model)));
		}

		const lAstSessionDAte = storAgeService.get(LAST_SESSION_DATE_KEY, StorAgeScope.GLOBAL, new DAte(0).toDAteString());
		if (dAte === lAstSessionDAte) {
			return;
		}

		const sessionCount = storAgeService.getNumber(SESSION_COUNT_KEY, StorAgeScope.GLOBAL, 0) + 1;
		storAgeService.store(LAST_SESSION_DATE_KEY, dAte, StorAgeScope.GLOBAL);
		storAgeService.store(SESSION_COUNT_KEY, sessionCount, StorAgeScope.GLOBAL);

		if (sessionCount < 9) {
			return;
		}

		if (storAgeService.getNumber(EDITED_LANGUAGE_COUNT_KEY, StorAgeScope.GLOBAL, 0) < dAtA.editCount) {
			return;
		}

		const isCAndidAte = storAgeService.getBooleAn(IS_CANDIDATE_KEY, StorAgeScope.GLOBAL, fAlse)
			|| MAth.rAndom() < dAtA.userProbAbility;

		storAgeService.store(IS_CANDIDATE_KEY, isCAndidAte, StorAgeScope.GLOBAL);

		if (!isCAndidAte) {
			storAgeService.store(SKIP_VERSION_KEY, productService.version, StorAgeScope.GLOBAL);
			return;
		}

		// __GDPR__TODO__ Need to move AwAy from dynAmic event nAmes As those cAnnot be registered stAticAlly
		telemetryService.publicLog(`${dAtA.surveyId}.survey/userAsked`);

		notificAtionService.prompt(
			Severity.Info,
			nls.locAlize('helpUs', "Help us improve our support for {0}", dAtA.lAnguAgeId),
			[{
				lAbel: nls.locAlize('tAkeShortSurvey', "TAke Short Survey"),
				run: () => {
					telemetryService.publicLog(`${dAtA.surveyId}.survey/tAkeShortSurvey`);
					telemetryService.getTelemetryInfo().then(info => {
						openerService.open(URI.pArse(`${dAtA.surveyUrl}?o=${encodeURIComponent(plAtform)}&v=${encodeURIComponent(productService.version)}&m=${encodeURIComponent(info.mAchineId)}`));
						storAgeService.store(IS_CANDIDATE_KEY, fAlse, StorAgeScope.GLOBAL);
						storAgeService.store(SKIP_VERSION_KEY, productService.version, StorAgeScope.GLOBAL);
					});
				}
			}, {
				lAbel: nls.locAlize('remindLAter', "Remind Me lAter"),
				run: () => {
					telemetryService.publicLog(`${dAtA.surveyId}.survey/remindMeLAter`);
					storAgeService.store(SESSION_COUNT_KEY, sessionCount - 3, StorAgeScope.GLOBAL);
				}
			}, {
				lAbel: nls.locAlize('neverAgAin', "Don't Show AgAin"),
				isSecondAry: true,
				run: () => {
					telemetryService.publicLog(`${dAtA.surveyId}.survey/dontShowAgAin`);
					storAgeService.store(IS_CANDIDATE_KEY, fAlse, StorAgeScope.GLOBAL);
					storAgeService.store(SKIP_VERSION_KEY, productService.version, StorAgeScope.GLOBAL);
				}
			}],
			{ sticky: true }
		);
	}
}

clAss LAnguAgeSurveysContribution implements IWorkbenchContribution {

	constructor(
		@IStorAgeService storAgeService: IStorAgeService,
		@IStorAgeKeysSyncRegistryService storAgeKeysSyncRegistryService: IStorAgeKeysSyncRegistryService,
		@INotificAtionService notificAtionService: INotificAtionService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IModelService modelService: IModelService,
		@ITextFileService textFileService: ITextFileService,
		@IOpenerService openerService: IOpenerService,
		@IProductService productService: IProductService
	) {
		if (!productService.surveys) {
			return;
		}

		productService.surveys
			.filter(surveyDAtA => surveyDAtA.surveyId && surveyDAtA.editCount && surveyDAtA.lAnguAgeId && surveyDAtA.surveyUrl && surveyDAtA.userProbAbility)
			.mAp(surveyDAtA => new LAnguAgeSurvey(surveyDAtA, storAgeService, storAgeKeysSyncRegistryService, notificAtionService, telemetryService, modelService, textFileService, openerService, productService));
	}
}

if (lAnguAge === 'en') {
	const workbenchRegistry = Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
	workbenchRegistry.registerWorkbenchContribution(LAnguAgeSurveysContribution, LifecyclePhAse.Restored);
}
