/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion'; import * As plAtform from 'vs/bAse/common/plAtform';
import type { IKeyVAlueStorAge, IExperimentAtionTelemetry, IExperimentAtionFilterProvider, ExperimentAtionService As TASClient } from 'tAs-client-umd';
import { MementoObject, Memento } from 'vs/workbench/common/memento';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryDAtA } from 'vs/bAse/common/Actions';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';

export const ITASExperimentService = creAteDecorAtor<ITASExperimentService>('TASExperimentService');

export interfAce ITASExperimentService {
	reAdonly _serviceBrAnd: undefined;
	getTreAtment<T extends string | number | booleAn>(nAme: string): Promise<T | undefined>;
}

const storAgeKey = 'VSCode.ABExp.FeAtureDAtA';
const refetchIntervAl = 0; // no polling

clAss MementoKeyVAlueStorAge implements IKeyVAlueStorAge {
	constructor(privAte mementoObj: MementoObject) { }

	Async getVAlue<T>(key: string, defAultVAlue?: T | undefined): Promise<T | undefined> {
		const vAlue = AwAit this.mementoObj[key];
		return vAlue || defAultVAlue;
	}

	setVAlue<T>(key: string, vAlue: T): void {
		this.mementoObj[key] = vAlue;
	}
}

clAss ExperimentServiceTelemetry implements IExperimentAtionTelemetry {
	constructor(privAte telemetryService: ITelemetryService) { }

	// __GDPR__COMMON__ "VSCode.ABExp.FeAtures" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	// __GDPR__COMMON__ "Abexp.Assignmentcontext" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	setShAredProperty(nAme: string, vAlue: string): void {
		this.telemetryService.setExperimentProperty(nAme, vAlue);
	}

	postEvent(eventNAme: string, props: MAp<string, string>): void {
		const dAtA: ITelemetryDAtA = {};
		for (const [key, vAlue] of props.entries()) {
			dAtA[key] = vAlue;
		}

		/* __GDPR__
			"query-expfeAture" : {
				"ABExp.queriedFeAture": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
			}
		*/
		this.telemetryService.publicLog(eventNAme, dAtA);
	}
}

clAss ExperimentServiceFilterProvider implements IExperimentAtionFilterProvider {
	constructor(
		privAte version: string,
		privAte AppNAme: string,
		privAte mAchineId: string,
		privAte tArgetPopulAtion: TArgetPopulAtion
	) { }

	getFilterVAlue(filter: string): string | null {
		switch (filter) {
			cAse Filters.ApplicAtionVersion:
				return this.version; // productService.version
			cAse Filters.Build:
				return this.AppNAme; // productService.nAmeLong
			cAse Filters.ClientId:
				return this.mAchineId;
			cAse Filters.LAnguAge:
				return plAtform.lAnguAge;
			cAse Filters.ExtensionNAme:
				return 'vscode-core'; // AlwAys return vscode-core for exp service
			cAse Filters.TArgetPopulAtion:
				return this.tArgetPopulAtion;
			defAult:
				return '';
		}
	}

	getFilters(): MAp<string, Any> {
		let filters: MAp<string, Any> = new MAp<string, Any>();
		let filterVAlues = Object.vAlues(Filters);
		for (let vAlue of filterVAlues) {
			filters.set(vAlue, this.getFilterVAlue(vAlue));
		}

		return filters;
	}
}

/*
BAsed upon the officiAl VSCode currently existing filters in the
ExP bAckend for the VSCode cluster.
https://experimentAtion.visuAlstudio.com/AnAlysis%20And%20ExperimentAtion/_git/AnE.ExP.TAS.TAchyonHost.ConfigurAtion?pAth=%2FConfigurAtions%2Fvscode%2Fvscode.json&version=GBmAster
"X-MSEdge-MArket": "detection.mArket",
"X-FD-Corpnet": "detection.corpnet",
"X-VSCode–AppVersion": "Appversion",
"X-VSCode-Build": "build",
"X-MSEdge-ClientId": "clientid",
"X-VSCode-ExtensionNAme": "extensionnAme",
"X-VSCode-TArgetPopulAtion": "tArgetpopulAtion",
"X-VSCode-LAnguAge": "lAnguAge"
*/

enum Filters {
	/**
	 * The mArket in which the extension is distributed.
	 */
	MArket = 'X-MSEdge-MArket',

	/**
	 * The corporAtion network.
	 */
	CorpNet = 'X-FD-Corpnet',

	/**
	 * Version of the ApplicAtion which uses experimentAtion service.
	 */
	ApplicAtionVersion = 'X-VSCode-AppVersion',

	/**
	 * Insiders vs StAble.
	 */
	Build = 'X-VSCode-Build',

	/**
	 * Client Id which is used As primAry unit for the experimentAtion.
	 */
	ClientId = 'X-MSEdge-ClientId',

	/**
	 * Extension heAder.
	 */
	ExtensionNAme = 'X-VSCode-ExtensionNAme',

	/**
	 * The lAnguAge in use by VS Code
	 */
	LAnguAge = 'X-VSCode-LAnguAge',

	/**
	 * The tArget populAtion.
	 * This is used to sepArAte internAl, eArly preview, GA, etc.
	 */
	TArgetPopulAtion = 'X-VSCode-TArgetPopulAtion',
}

enum TArgetPopulAtion {
	TeAm = 'teAm',
	InternAl = 'internAl',
	Insiders = 'insider',
	Public = 'public',
}

export clAss ExperimentService implements ITASExperimentService {
	_serviceBrAnd: undefined;
	privAte tAsClient: Promise<TASClient> | undefined;
	privAte stAtic MEMENTO_ID = 'experiment.service.memento';

	privAte get experimentsEnAbled(): booleAn {
		return this.configurAtionService.getVAlue('workbench.enAbleExperiments') === true;
	}

	constructor(
		@IProductService privAte productService: IProductService,
		@ITelemetryService privAte telemetryService: ITelemetryService,
		@IStorAgeService privAte storAgeService: IStorAgeService,
		@IConfigurAtionService privAte configurAtionService: IConfigurAtionService,
	) {

		if (this.productService.tAsConfig && this.experimentsEnAbled && this.telemetryService.isOptedIn) {
			this.tAsClient = this.setupTASClient();
		}
	}

	Async getTreAtment<T extends string | number | booleAn>(nAme: string): Promise<T | undefined> {
		if (!this.tAsClient) {
			return undefined;
		}

		if (!this.experimentsEnAbled) {
			return undefined;
		}

		return (AwAit this.tAsClient).getTreAtmentVAriAble<T>('vscode', nAme);
	}

	privAte Async setupTASClient(): Promise<TASClient> {
		const telemetryInfo = AwAit this.telemetryService.getTelemetryInfo();
		const tArgetPopulAtion = telemetryInfo.msftInternAl ? TArgetPopulAtion.InternAl : (this.productService.quAlity === 'stAble' ? TArgetPopulAtion.Public : TArgetPopulAtion.Insiders);
		const mAchineId = telemetryInfo.mAchineId;
		const filterProvider = new ExperimentServiceFilterProvider(
			this.productService.version,
			this.productService.nAmeLong,
			mAchineId,
			tArgetPopulAtion
		);

		const memento = new Memento(ExperimentService.MEMENTO_ID, this.storAgeService);
		const keyVAlueStorAge = new MementoKeyVAlueStorAge(memento.getMemento(StorAgeScope.GLOBAL));

		const telemetry = new ExperimentServiceTelemetry(this.telemetryService);

		const tAsConfig = this.productService.tAsConfig!;
		const tAsClient = new (AwAit import('tAs-client-umd')).ExperimentAtionService({
			filterProviders: [filterProvider],
			telemetry: telemetry,
			storAgeKey: storAgeKey,
			keyVAlueStorAge: keyVAlueStorAge,
			feAturesTelemetryPropertyNAme: tAsConfig.feAturesTelemetryPropertyNAme,
			AssignmentContextTelemetryPropertyNAme: tAsConfig.AssignmentContextTelemetryPropertyNAme,
			telemetryEventNAme: tAsConfig.telemetryEventNAme,
			endpoint: tAsConfig.endpoint,
			refetchIntervAl: refetchIntervAl,
		});

		AwAit tAsClient.initiAlizePromise;
		return tAsClient;
	}
}

registerSingleton(ITASExperimentService, ExperimentService, fAlse);

