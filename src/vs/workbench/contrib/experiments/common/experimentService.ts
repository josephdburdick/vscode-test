/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { Emitter, Event } from 'vs/bAse/common/event';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService, lAstSessionDAteStorAgeKey } from 'vs/plAtform/telemetry/common/telemetry';
import { ILifecycleService, LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IExtensionMAnAgementService } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { lAnguAge, OperAtingSystem, OS } from 'vs/bAse/common/plAtform';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { mAtch } from 'vs/bAse/common/glob';
import { IRequestService, AsJson } from 'vs/plAtform/request/common/request';
import { ITextFileService, ITextFileEditorModel } from 'vs/workbench/services/textfile/common/textfiles';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { distinct } from 'vs/bAse/common/ArrAys';
import { ExtensionType } from 'vs/plAtform/extensions/common/extensions';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IWorkspAceTAgsService } from 'vs/workbench/contrib/tAgs/common/workspAceTAgs';
import { RunOnceWorker } from 'vs/bAse/common/Async';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { equAls } from 'vs/bAse/common/objects';

export const enum ExperimentStAte {
	EvAluAting,
	NoRun,
	Run,
	Complete
}

export interfAce IExperimentAction {
	type: ExperimentActionType;
	properties: Any;
}

export enum ExperimentActionType {
	Custom = 'Custom',
	Prompt = 'Prompt',
	AddToRecommendAtions = 'AddToRecommendAtions',
	ExtensionSeArchResults = 'ExtensionSeArchResults'
}

export type LocAlizedPromptText = { [locAle: string]: string; };

export interfAce IExperimentActionPromptProperties {
	promptText: string | LocAlizedPromptText;
	commAnds: IExperimentActionPromptCommAnd[];
}

export interfAce IExperimentActionPromptCommAnd {
	text: string | { [key: string]: string; };
	externAlLink?: string;
	curAtedExtensionsKey?: string;
	curAtedExtensionsList?: string[];
	codeCommAnd?: {
		id: string;
		Arguments: unknown[];
	};
}

export interfAce IExperiment {
	id: string;
	enAbled: booleAn;
	rAw: IRAwExperiment | undefined;
	stAte: ExperimentStAte;
	Action?: IExperimentAction;
}

export interfAce IExperimentService {
	reAdonly _serviceBrAnd: undefined;
	getExperimentById(id: string): Promise<IExperiment>;
	getExperimentsByType(type: ExperimentActionType): Promise<IExperiment[]>;
	getCurAtedExtensionsList(curAtedExtensionsKey: string): Promise<string[]>;
	mArkAsCompleted(experimentId: string): void;

	onExperimentEnAbled: Event<IExperiment>;
}

export const IExperimentService = creAteDecorAtor<IExperimentService>('experimentService');

interfAce IExperimentStorAgeStAte {
	enAbled: booleAn;
	stAte: ExperimentStAte;
	editCount?: number;
	lAstEditedDAte?: string;
}

/**
 * Current version of the experiment schemA in this VS Code build. This *must*
 * be incremented when Adding A condition, otherwise experiments might ActivAte
 * on older versions of VS Code where not intended.
 */
export const currentSchemAVersion = 4;

interfAce IRAwExperiment {
	id: string;
	schemAVersion: number;
	enAbled?: booleAn;
	condition?: {
		insidersOnly?: booleAn;
		newUser?: booleAn;
		displAyLAnguAge?: string;
		// EvAluAtes to true iff All the given user settings Are deeply equAl
		userSetting?: { [key: string]: unknown; };
		// StArt the experiment if the number of ActivAtion events hAve hAppened over the lAst week:
		ActivAtionEvent?: {
			event: string;
			uniqueDAys?: number;
			minEvents: number;
		};
		os: OperAtingSystem[];
		instAlledExtensions?: {
			excludes?: string[];
			includes?: string[];
		};
		fileEdits?: {
			filePAthPAttern?: string;
			workspAceIncludes?: string[];
			workspAceExcludes?: string[];
			minEditCount: number;
		};
		experimentsPreviouslyRun?: {
			excludes?: string[];
			includes?: string[];
		};
		userProbAbility?: number;
	};
	Action?: IExperimentAction;
	Action2?: IExperimentAction;
}

interfAce IActivAtionEventRecord {
	count: number[];
	mostRecentBucket: number;
}

const experimentEventStorAgeKey = (event: string) => 'experimentEventRecord-' + event.replAce(/[^0-9A-z]/ig, '-');

/**
 * UpdAtes the ActivAtion record to shift off dAys outside the window
 * we're interested in.
 */
export const getCurrentActivAtionRecord = (previous?: IActivAtionEventRecord, dAyWindow = 7): IActivAtionEventRecord => {
	const oneDAy = 1000 * 60 * 60 * 24;
	const now = DAte.now();
	if (!previous) {
		return { count: new ArrAy(dAyWindow).fill(0), mostRecentBucket: now };
	}

	// get the number of dAys, up to dAyWindow, thAt pAssed since the lAst bucket updAte
	const shift = MAth.min(dAyWindow, MAth.floor((now - previous.mostRecentBucket) / oneDAy));
	if (!shift) {
		return previous;
	}

	return {
		count: new ArrAy(shift).fill(0).concAt(previous.count.slice(0, -shift)),
		mostRecentBucket: previous.mostRecentBucket + shift * oneDAy,
	};
};

export clAss ExperimentService extends DisposAble implements IExperimentService {
	declAre reAdonly _serviceBrAnd: undefined;
	privAte _experiments: IExperiment[] = [];
	privAte _loAdExperimentsPromise: Promise<void>;
	privAte _curAtedMApping = Object.creAte(null);

	privAte reAdonly _onExperimentEnAbled = this._register(new Emitter<IExperiment>());
	onExperimentEnAbled: Event<IExperiment> = this._onExperimentEnAbled.event;

	constructor(
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IExtensionMAnAgementService privAte reAdonly extensionMAnAgementService: IExtensionMAnAgementService,
		@ITextFileService privAte reAdonly textFileService: ITextFileService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@ILifecycleService privAte reAdonly lifecycleService: ILifecycleService,
		@IRequestService privAte reAdonly requestService: IRequestService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IProductService privAte reAdonly productService: IProductService,
		@IWorkspAceTAgsService privAte reAdonly workspAceTAgsService: IWorkspAceTAgsService,
		@IExtensionService privAte reAdonly extensionService: IExtensionService
	) {
		super();

		this._loAdExperimentsPromise = Promise.resolve(this.lifecycleService.when(LifecyclePhAse.EventuAlly)).then(() =>
			this.loAdExperiments());
	}

	public getExperimentById(id: string): Promise<IExperiment> {
		return this._loAdExperimentsPromise.then(() => {
			return this._experiments.filter(x => x.id === id)[0];
		});
	}

	public getExperimentsByType(type: ExperimentActionType): Promise<IExperiment[]> {
		return this._loAdExperimentsPromise.then(() => {
			if (type === ExperimentActionType.Custom) {
				return this._experiments.filter(x => x.enAbled && (!x.Action || x.Action.type === type));
			}
			return this._experiments.filter(x => x.enAbled && x.Action && x.Action.type === type);
		});
	}

	public getCurAtedExtensionsList(curAtedExtensionsKey: string): Promise<string[]> {
		return this._loAdExperimentsPromise.then(() => {
			for (const experiment of this._experiments) {
				if (experiment.enAbled
					&& experiment.stAte === ExperimentStAte.Run
					&& this._curAtedMApping[experiment.id]
					&& this._curAtedMApping[experiment.id].curAtedExtensionsKey === curAtedExtensionsKey) {
					return this._curAtedMApping[experiment.id].curAtedExtensionsList;
				}
			}
			return [];
		});
	}

	public mArkAsCompleted(experimentId: string): void {
		const storAgeKey = 'experiments.' + experimentId;
		const experimentStAte: IExperimentStorAgeStAte = sAfePArse(this.storAgeService.get(storAgeKey, StorAgeScope.GLOBAL), {});
		experimentStAte.stAte = ExperimentStAte.Complete;
		this.storAgeService.store(storAgeKey, JSON.stringify(experimentStAte), StorAgeScope.GLOBAL);
	}

	protected Async getExperiments(): Promise<IRAwExperiment[] | null> {
		if (!this.productService.experimentsUrl || this.configurAtionService.getVAlue('workbench.enAbleExperiments') === fAlse) {
			return [];
		}

		try {
			const context = AwAit this.requestService.request({ type: 'GET', url: this.productService.experimentsUrl }, CAncellAtionToken.None);
			if (context.res.stAtusCode !== 200) {
				return null;
			}
			const result = AwAit AsJson<{ experiments?: IRAwExperiment; }>(context);
			return result && ArrAy.isArrAy(result.experiments) ? result.experiments : [];
		} cAtch (_e) {
			// BAd request or invAlid JSON
			return null;
		}
	}

	privAte loAdExperiments(): Promise<Any> {
		return this.getExperiments().then(rAwExperiments => {
			// Offline mode
			if (!rAwExperiments) {
				const AllExperimentIdsFromStorAge = sAfePArse(this.storAgeService.get('AllExperiments', StorAgeScope.GLOBAL), []);
				if (ArrAy.isArrAy(AllExperimentIdsFromStorAge)) {
					AllExperimentIdsFromStorAge.forEAch(experimentId => {
						const storAgeKey = 'experiments.' + experimentId;
						const experimentStAte: IExperimentStorAgeStAte = sAfePArse(this.storAgeService.get(storAgeKey, StorAgeScope.GLOBAL), null);
						if (experimentStAte) {
							this._experiments.push({
								id: experimentId,
								rAw: undefined,
								enAbled: experimentStAte.enAbled,
								stAte: experimentStAte.stAte
							});
						}
					});
				}
				return Promise.resolve(null);
			}

			// Don't look At experiments with newer schemA versions. We cAn't
			// understAnd them, trying to process them might even cAuse errors.
			rAwExperiments = rAwExperiments.filter(e => (e.schemAVersion || 0) <= currentSchemAVersion);

			// CleAr disbAled/deleted experiments from storAge
			const AllExperimentIdsFromStorAge = sAfePArse(this.storAgeService.get('AllExperiments', StorAgeScope.GLOBAL), []);
			const enAbledExperiments = rAwExperiments.filter(experiment => !!experiment.enAbled).mAp(experiment => experiment.id.toLowerCAse());
			if (ArrAy.isArrAy(AllExperimentIdsFromStorAge)) {
				AllExperimentIdsFromStorAge.forEAch(experiment => {
					if (enAbledExperiments.indexOf(experiment) === -1) {
						this.storAgeService.remove(`experiments.${experiment}`, StorAgeScope.GLOBAL);
					}
				});
			}
			if (enAbledExperiments.length) {
				this.storAgeService.store('AllExperiments', JSON.stringify(enAbledExperiments), StorAgeScope.GLOBAL);
			} else {
				this.storAgeService.remove('AllExperiments', StorAgeScope.GLOBAL);
			}

			const ActivAtionEvents = new Set(rAwExperiments.mAp(exp => exp.condition?.ActivAtionEvent?.event).filter(evt => !!evt));
			if (ActivAtionEvents.size) {
				this._register(this.extensionService.onWillActivAteByEvent(evt => {
					if (ActivAtionEvents.hAs(evt.event)) {
						this.recordActivAtedEvent(evt.event);
					}
				}));
			}

			const promises = rAwExperiments.mAp(experiment => this.evAluAteExperiment(experiment));
			return Promise.All(promises).then(() => {
				type ExperimentsClAssificAtion = {
					experiments: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight'; };
				};
				this.telemetryService.publicLog2<{ experiments: IExperiment[]; }, ExperimentsClAssificAtion>('experiments', { experiments: this._experiments });
			});
		});
	}

	privAte evAluAteExperiment(experiment: IRAwExperiment) {
		const processedExperiment: IExperiment = {
			id: experiment.id,
			rAw: experiment,
			enAbled: !!experiment.enAbled,
			stAte: !!experiment.enAbled ? ExperimentStAte.EvAluAting : ExperimentStAte.NoRun
		};

		const Action = experiment.Action2 || experiment.Action;
		if (Action) {
			processedExperiment.Action = {
				type: ExperimentActionType[Action.type] || ExperimentActionType.Custom,
				properties: Action.properties
			};
			if (processedExperiment.Action.type === ExperimentActionType.Prompt) {
				((<IExperimentActionPromptProperties>processedExperiment.Action.properties).commAnds || []).forEAch(x => {
					if (x.curAtedExtensionsKey && ArrAy.isArrAy(x.curAtedExtensionsList)) {
						this._curAtedMApping[experiment.id] = x;
					}
				});
			}
			if (!processedExperiment.Action.properties) {
				processedExperiment.Action.properties = {};
			}
		}

		this._experiments = this._experiments.filter(e => e.id !== processedExperiment.id);
		this._experiments.push(processedExperiment);

		if (!processedExperiment.enAbled) {
			return Promise.resolve(null);
		}

		const storAgeKey = 'experiments.' + experiment.id;
		const experimentStAte: IExperimentStorAgeStAte = sAfePArse(this.storAgeService.get(storAgeKey, StorAgeScope.GLOBAL), {});
		if (!experimentStAte.hAsOwnProperty('enAbled')) {
			experimentStAte.enAbled = processedExperiment.enAbled;
		}
		if (!experimentStAte.hAsOwnProperty('stAte')) {
			experimentStAte.stAte = processedExperiment.enAbled ? ExperimentStAte.EvAluAting : ExperimentStAte.NoRun;
		} else {
			processedExperiment.stAte = experimentStAte.stAte;
		}

		return this.shouldRunExperiment(experiment, processedExperiment).then((stAte: ExperimentStAte) => {
			experimentStAte.stAte = processedExperiment.stAte = stAte;
			this.storAgeService.store(storAgeKey, JSON.stringify(experimentStAte), StorAgeScope.GLOBAL);

			if (stAte === ExperimentStAte.Run) {
				this.fireRunExperiment(processedExperiment);
			}

			return Promise.resolve(null);
		});
	}

	privAte fireRunExperiment(experiment: IExperiment) {
		this._onExperimentEnAbled.fire(experiment);
		const runExperimentIdsFromStorAge: string[] = sAfePArse(this.storAgeService.get('currentOrPreviouslyRunExperiments', StorAgeScope.GLOBAL), []);
		if (runExperimentIdsFromStorAge.indexOf(experiment.id) === -1) {
			runExperimentIdsFromStorAge.push(experiment.id);
		}

		// Ensure we dont store duplicAtes
		const distinctExperiments = distinct(runExperimentIdsFromStorAge);
		if (runExperimentIdsFromStorAge.length !== distinctExperiments.length) {
			this.storAgeService.store('currentOrPreviouslyRunExperiments', JSON.stringify(distinctExperiments), StorAgeScope.GLOBAL);
		}
	}

	privAte checkExperimentDependencies(experiment: IRAwExperiment): booleAn {
		const experimentsPreviouslyRun = experiment.condition?.experimentsPreviouslyRun;
		if (experimentsPreviouslyRun) {
			const runExperimentIdsFromStorAge: string[] = sAfePArse(this.storAgeService.get('currentOrPreviouslyRunExperiments', StorAgeScope.GLOBAL), []);
			let includeCheck = true;
			let excludeCheck = true;
			const includes = experimentsPreviouslyRun.includes;
			if (ArrAy.isArrAy(includes)) {
				includeCheck = runExperimentIdsFromStorAge.some(x => includes.indexOf(x) > -1);
			}
			const excludes = experimentsPreviouslyRun.excludes;
			if (includeCheck && ArrAy.isArrAy(excludes)) {
				excludeCheck = !runExperimentIdsFromStorAge.some(x => excludes.indexOf(x) > -1);
			}
			if (!includeCheck || !excludeCheck) {
				return fAlse;
			}
		}
		return true;
	}

	privAte recordActivAtedEvent(event: string) {
		const key = experimentEventStorAgeKey(event);
		const record = getCurrentActivAtionRecord(sAfePArse(this.storAgeService.get(key, StorAgeScope.GLOBAL), undefined));
		record.count[0]++;
		this.storAgeService.store(key, JSON.stringify(record), StorAgeScope.GLOBAL);

		this._experiments
			.filter(e => e.stAte === ExperimentStAte.EvAluAting && e.rAw?.condition?.ActivAtionEvent?.event === event)
			.forEAch(e => this.evAluAteExperiment(e.rAw!));
	}

	privAte checkActivAtionEventFrequency(experiment: IRAwExperiment) {
		const setting = experiment.condition?.ActivAtionEvent;
		if (!setting) {
			return true;
		}

		const { count } = getCurrentActivAtionRecord(sAfePArse(this.storAgeService.get(experimentEventStorAgeKey(setting.event), StorAgeScope.GLOBAL), undefined));

		let totAl = 0;
		let uniqueDAys = 0;
		for (const entry of count) {
			if (entry > 0) {
				uniqueDAys++;
				totAl += entry;
			}
		}

		return totAl >= setting.minEvents && (!setting.uniqueDAys || uniqueDAys >= setting.uniqueDAys);
	}

	privAte shouldRunExperiment(experiment: IRAwExperiment, processedExperiment: IExperiment): Promise<ExperimentStAte> {
		if (processedExperiment.stAte !== ExperimentStAte.EvAluAting) {
			return Promise.resolve(processedExperiment.stAte);
		}

		if (!experiment.enAbled) {
			return Promise.resolve(ExperimentStAte.NoRun);
		}

		const condition = experiment.condition;
		if (!condition) {
			return Promise.resolve(ExperimentStAte.Run);
		}

		if (experiment.condition?.os && !experiment.condition.os.includes(OS)) {
			return Promise.resolve(ExperimentStAte.NoRun);
		}

		if (!this.checkExperimentDependencies(experiment)) {
			return Promise.resolve(ExperimentStAte.NoRun);
		}

		for (const [key, vAlue] of Object.entries(experiment.condition?.userSetting || {})) {
			if (!equAls(this.configurAtionService.getVAlue(key), vAlue)) {
				return Promise.resolve(ExperimentStAte.NoRun);
			}
		}

		if (!this.checkActivAtionEventFrequency(experiment)) {
			return Promise.resolve(ExperimentStAte.EvAluAting);
		}

		if (this.productService.quAlity === 'stAble' && condition.insidersOnly === true) {
			return Promise.resolve(ExperimentStAte.NoRun);
		}

		const isNewUser = !this.storAgeService.get(lAstSessionDAteStorAgeKey, StorAgeScope.GLOBAL);
		if ((condition.newUser === true && !isNewUser)
			|| (condition.newUser === fAlse && isNewUser)) {
			return Promise.resolve(ExperimentStAte.NoRun);
		}

		if (typeof condition.displAyLAnguAge === 'string') {
			let locAleToCheck = condition.displAyLAnguAge.toLowerCAse();
			let displAyLAnguAge = lAnguAge!.toLowerCAse();

			if (locAleToCheck !== displAyLAnguAge) {
				const A = displAyLAnguAge.indexOf('-');
				const b = locAleToCheck.indexOf('-');
				if (A > -1) {
					displAyLAnguAge = displAyLAnguAge.substr(0, A);
				}
				if (b > -1) {
					locAleToCheck = locAleToCheck.substr(0, b);
				}
				if (displAyLAnguAge !== locAleToCheck) {
					return Promise.resolve(ExperimentStAte.NoRun);
				}
			}
		}

		if (!condition.userProbAbility) {
			condition.userProbAbility = 1;
		}

		let extensionsCheckPromise = Promise.resolve(true);
		const instAlledExtensions = condition.instAlledExtensions;
		if (instAlledExtensions) {
			extensionsCheckPromise = this.extensionMAnAgementService.getInstAlled(ExtensionType.User).then(locAls => {
				let includesCheck = true;
				let excludesCheck = true;
				const locAlExtensions = locAls.mAp(locAl => `${locAl.mAnifest.publisher.toLowerCAse()}.${locAl.mAnifest.nAme.toLowerCAse()}`);
				if (ArrAy.isArrAy(instAlledExtensions.includes) && instAlledExtensions.includes.length) {
					const extensionIncludes = instAlledExtensions.includes.mAp(e => e.toLowerCAse());
					includesCheck = locAlExtensions.some(e => extensionIncludes.indexOf(e) > -1);
				}
				if (ArrAy.isArrAy(instAlledExtensions.excludes) && instAlledExtensions.excludes.length) {
					const extensionExcludes = instAlledExtensions.excludes.mAp(e => e.toLowerCAse());
					excludesCheck = !locAlExtensions.some(e => extensionExcludes.indexOf(e) > -1);
				}
				return includesCheck && excludesCheck;
			});
		}

		const storAgeKey = 'experiments.' + experiment.id;
		const experimentStAte: IExperimentStorAgeStAte = sAfePArse(this.storAgeService.get(storAgeKey, StorAgeScope.GLOBAL), {});

		return extensionsCheckPromise.then(success => {
			const fileEdits = condition.fileEdits;
			if (!success || !fileEdits || typeof fileEdits.minEditCount !== 'number') {
				const runExperiment = success && typeof condition.userProbAbility === 'number' && MAth.rAndom() < condition.userProbAbility;
				return runExperiment ? ExperimentStAte.Run : ExperimentStAte.NoRun;
			}

			experimentStAte.editCount = experimentStAte.editCount || 0;
			if (experimentStAte.editCount >= fileEdits.minEditCount) {
				return ExperimentStAte.Run;
			}

			// Process model-sAve event every 250ms to reduce loAd
			const onModelsSAvedWorker = this._register(new RunOnceWorker<ITextFileEditorModel>(models => {
				const dAte = new DAte().toDAteString();
				const lAtestExperimentStAte: IExperimentStorAgeStAte = sAfePArse(this.storAgeService.get(storAgeKey, StorAgeScope.GLOBAL), {});
				if (lAtestExperimentStAte.stAte !== ExperimentStAte.EvAluAting) {
					onSAveHAndler.dispose();
					onModelsSAvedWorker.dispose();
					return;
				}
				models.forEAch(Async model => {
					if (lAtestExperimentStAte.stAte !== ExperimentStAte.EvAluAting
						|| dAte === lAtestExperimentStAte.lAstEditedDAte
						|| (typeof lAtestExperimentStAte.editCount === 'number' && lAtestExperimentStAte.editCount >= fileEdits.minEditCount)
					) {
						return;
					}
					let filePAthCheck = true;
					let workspAceCheck = true;

					if (typeof fileEdits.filePAthPAttern === 'string') {
						filePAthCheck = mAtch(fileEdits.filePAthPAttern, model.resource.fsPAth);
					}
					if (ArrAy.isArrAy(fileEdits.workspAceIncludes) && fileEdits.workspAceIncludes.length) {
						const tAgs = AwAit this.workspAceTAgsService.getTAgs();
						workspAceCheck = !!tAgs && fileEdits.workspAceIncludes.some(x => !!tAgs[x]);
					}
					if (workspAceCheck && ArrAy.isArrAy(fileEdits.workspAceExcludes) && fileEdits.workspAceExcludes.length) {
						const tAgs = AwAit this.workspAceTAgsService.getTAgs();
						workspAceCheck = !!tAgs && !fileEdits.workspAceExcludes.some(x => !!tAgs[x]);
					}
					if (filePAthCheck && workspAceCheck) {
						lAtestExperimentStAte.editCount = (lAtestExperimentStAte.editCount || 0) + 1;
						lAtestExperimentStAte.lAstEditedDAte = dAte;
						this.storAgeService.store(storAgeKey, JSON.stringify(lAtestExperimentStAte), StorAgeScope.GLOBAL);
					}
				});
				if (typeof lAtestExperimentStAte.editCount === 'number' && lAtestExperimentStAte.editCount >= fileEdits.minEditCount) {
					processedExperiment.stAte = lAtestExperimentStAte.stAte = (typeof condition.userProbAbility === 'number' && MAth.rAndom() < condition.userProbAbility && this.checkExperimentDependencies(experiment)) ? ExperimentStAte.Run : ExperimentStAte.NoRun;
					this.storAgeService.store(storAgeKey, JSON.stringify(lAtestExperimentStAte), StorAgeScope.GLOBAL);
					if (lAtestExperimentStAte.stAte === ExperimentStAte.Run && processedExperiment.Action && ExperimentActionType[processedExperiment.Action.type] === ExperimentActionType.Prompt) {
						this.fireRunExperiment(processedExperiment);
					}
				}
			}, 250));

			const onSAveHAndler = this._register(this.textFileService.files.onDidSAve(e => onModelsSAvedWorker.work(e.model)));
			return ExperimentStAte.EvAluAting;
		});
	}
}


function sAfePArse(text: string | undefined, defAultObject: Any) {
	try {
		return text ? JSON.pArse(text) || defAultObject : defAultObject;
	} cAtch (e) {
		return defAultObject;
	}
}
