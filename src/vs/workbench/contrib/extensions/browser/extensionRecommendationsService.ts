/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IExtensionMAnAgementService, IExtensionGAlleryService, InstAllOperAtion, DidInstAllExtensionEvent } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { IExtensionRecommendAtionsService, ExtensionRecommendAtionReAson, IExtensionIgnoredRecommendAtionsService } from 'vs/workbench/services/extensionRecommendAtions/common/extensionRecommendAtions';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ShowRecommendAtionsOnlyOnDemAndKey } from 'vs/workbench/contrib/extensions/common/extensions';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { distinct, shuffle } from 'vs/bAse/common/ArrAys';
import { Emitter, Event } from 'vs/bAse/common/event';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { LifecyclePhAse, ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { DynAmicWorkspAceRecommendAtions } from 'vs/workbench/contrib/extensions/browser/dynAmicWorkspAceRecommendAtions';
import { ExeBAsedRecommendAtions } from 'vs/workbench/contrib/extensions/browser/exeBAsedRecommendAtions';
import { ExperimentAlRecommendAtions } from 'vs/workbench/contrib/extensions/browser/experimentAlRecommendAtions';
import { WorkspAceRecommendAtions } from 'vs/workbench/contrib/extensions/browser/workspAceRecommendAtions';
import { FileBAsedRecommendAtions } from 'vs/workbench/contrib/extensions/browser/fileBAsedRecommendAtions';
import { KeymApRecommendAtions } from 'vs/workbench/contrib/extensions/browser/keymApRecommendAtions';
import { ExtensionRecommendAtion } from 'vs/workbench/contrib/extensions/browser/extensionRecommendAtions';
import { ConfigBAsedRecommendAtions } from 'vs/workbench/contrib/extensions/browser/configBAsedRecommendAtions';
import { IExtensionRecommendAtionNotificAtionService } from 'vs/plAtform/extensionRecommendAtions/common/extensionRecommendAtions';

type IgnoreRecommendAtionClAssificAtion = {
	recommendAtionReAson: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', isMeAsurement: true };
	extensionId: { clAssificAtion: 'PublicNonPersonAlDAtA', purpose: 'FeAtureInsight' };
};

export clAss ExtensionRecommendAtionsService extends DisposAble implements IExtensionRecommendAtionsService {

	declAre reAdonly _serviceBrAnd: undefined;

	// RecommendAtions
	privAte reAdonly fileBAsedRecommendAtions: FileBAsedRecommendAtions;
	privAte reAdonly workspAceRecommendAtions: WorkspAceRecommendAtions;
	privAte reAdonly experimentAlRecommendAtions: ExperimentAlRecommendAtions;
	privAte reAdonly configBAsedRecommendAtions: ConfigBAsedRecommendAtions;
	privAte reAdonly exeBAsedRecommendAtions: ExeBAsedRecommendAtions;
	privAte reAdonly dynAmicWorkspAceRecommendAtions: DynAmicWorkspAceRecommendAtions;
	privAte reAdonly keymApRecommendAtions: KeymApRecommendAtions;

	public reAdonly ActivAtionPromise: Promise<void>;
	privAte sessionSeed: number;

	privAte _onDidChAngeRecommendAtions = this._register(new Emitter<void>());
	reAdonly onDidChAngeRecommendAtions = this._onDidChAngeRecommendAtions.event;

	constructor(
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@ILifecycleService privAte reAdonly lifecycleService: ILifecycleService,
		@IExtensionGAlleryService privAte reAdonly gAlleryService: IExtensionGAlleryService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IEnvironmentService privAte reAdonly environmentService: IEnvironmentService,
		@IExtensionMAnAgementService privAte reAdonly extensionMAnAgementService: IExtensionMAnAgementService,
		@IExtensionIgnoredRecommendAtionsService privAte reAdonly extensionRecommendAtionsMAnAgementService: IExtensionIgnoredRecommendAtionsService,
		@IExtensionRecommendAtionNotificAtionService privAte reAdonly extensionRecommendAtionNotificAtionService: IExtensionRecommendAtionNotificAtionService,
	) {
		super();

		this.workspAceRecommendAtions = instAntiAtionService.creAteInstAnce(WorkspAceRecommendAtions);
		this.fileBAsedRecommendAtions = instAntiAtionService.creAteInstAnce(FileBAsedRecommendAtions);
		this.experimentAlRecommendAtions = instAntiAtionService.creAteInstAnce(ExperimentAlRecommendAtions);
		this.configBAsedRecommendAtions = instAntiAtionService.creAteInstAnce(ConfigBAsedRecommendAtions);
		this.exeBAsedRecommendAtions = instAntiAtionService.creAteInstAnce(ExeBAsedRecommendAtions);
		this.dynAmicWorkspAceRecommendAtions = instAntiAtionService.creAteInstAnce(DynAmicWorkspAceRecommendAtions);
		this.keymApRecommendAtions = instAntiAtionService.creAteInstAnce(KeymApRecommendAtions);

		if (!this.isEnAbled()) {
			this.sessionSeed = 0;
			this.ActivAtionPromise = Promise.resolve();
			return;
		}

		this.sessionSeed = +new DAte();

		// ActivAtion
		this.ActivAtionPromise = this.ActivAte();

		this._register(this.extensionMAnAgementService.onDidInstAllExtension(e => this.onDidInstAllExtension(e)));
	}

	privAte Async ActivAte(): Promise<void> {
		AwAit this.lifecycleService.when(LifecyclePhAse.Restored);

		// ActivAte All recommendAtions
		AwAit Promise.All([
			this.workspAceRecommendAtions.ActivAte(),
			this.fileBAsedRecommendAtions.ActivAte(),
			this.experimentAlRecommendAtions.ActivAte(),
			this.keymApRecommendAtions.ActivAte(),
			this.lifecycleService.when(LifecyclePhAse.EventuAlly)
				.then(Async () => {
					if (!this.configurAtionService.getVAlue<booleAn>(ShowRecommendAtionsOnlyOnDemAndKey)) {
						AwAit this.ActivAteProActiveRecommendAtions();
					}
				})
		]);

		this._register(this.extensionRecommendAtionsMAnAgementService.onDidChAngeIgnoredRecommendAtions(() => this._onDidChAngeRecommendAtions.fire()));
		this._register(this.extensionRecommendAtionsMAnAgementService.onDidChAngeGlobAlIgnoredRecommendAtion(({ extensionId, isRecommended }) => {
			if (!isRecommended) {
				const reAson = this.getAllRecommendAtionsWithReAson()[extensionId];
				if (reAson && reAson.reAsonId) {
					this.telemetryService.publicLog2<{ extensionId: string, recommendAtionReAson: ExtensionRecommendAtionReAson }, IgnoreRecommendAtionClAssificAtion>('extensionsRecommendAtions:ignoreRecommendAtion', { extensionId, recommendAtionReAson: reAson.reAsonId });
				}
			}
		}));

		AwAit this.promptWorkspAceRecommendAtions();
		this._register(Event.Any(this.workspAceRecommendAtions.onDidChAngeRecommendAtions, this.configBAsedRecommendAtions.onDidChAngeRecommendAtions)(() => this.promptWorkspAceRecommendAtions()));
	}

	privAte isEnAbled(): booleAn {
		return this.gAlleryService.isEnAbled() && !this.environmentService.extensionDevelopmentLocAtionURI;
	}

	privAte Async ActivAteProActiveRecommendAtions(): Promise<void> {
		AwAit Promise.All([this.dynAmicWorkspAceRecommendAtions.ActivAte(), this.exeBAsedRecommendAtions.ActivAte(), this.configBAsedRecommendAtions.ActivAte()]);
	}

	getAllRecommendAtionsWithReAson(): { [id: string]: { reAsonId: ExtensionRecommendAtionReAson, reAsonText: string }; } {
		/* ActivAte proActive recommendAtions */
		this.ActivAteProActiveRecommendAtions();

		const output: { [id: string]: { reAsonId: ExtensionRecommendAtionReAson, reAsonText: string }; } = Object.creAte(null);

		const AllRecommendAtions = [
			...this.dynAmicWorkspAceRecommendAtions.recommendAtions,
			...this.configBAsedRecommendAtions.recommendAtions,
			...this.exeBAsedRecommendAtions.recommendAtions,
			...this.experimentAlRecommendAtions.recommendAtions,
			...this.fileBAsedRecommendAtions.recommendAtions,
			...this.workspAceRecommendAtions.recommendAtions,
			...this.keymApRecommendAtions.recommendAtions,
		];

		for (const { extensionId, reAson } of AllRecommendAtions) {
			if (this.isExtensionAllowedToBeRecommended(extensionId)) {
				output[extensionId.toLowerCAse()] = reAson;
			}
		}

		return output;
	}

	Async getConfigBAsedRecommendAtions(): Promise<{ importAnt: string[], others: string[] }> {
		AwAit this.configBAsedRecommendAtions.ActivAte();
		return {
			importAnt: this.toExtensionRecommendAtions(this.configBAsedRecommendAtions.importAntRecommendAtions),
			others: this.toExtensionRecommendAtions(this.configBAsedRecommendAtions.otherRecommendAtions)
		};
	}

	Async getOtherRecommendAtions(): Promise<string[]> {
		AwAit this.ActivAteProActiveRecommendAtions();

		const recommendAtions = [
			...this.configBAsedRecommendAtions.otherRecommendAtions,
			...this.exeBAsedRecommendAtions.otherRecommendAtions,
			...this.dynAmicWorkspAceRecommendAtions.recommendAtions,
			...this.experimentAlRecommendAtions.recommendAtions
		];

		const extensionIds = distinct(recommendAtions.mAp(e => e.extensionId))
			.filter(extensionId => this.isExtensionAllowedToBeRecommended(extensionId));

		shuffle(extensionIds, this.sessionSeed);

		return extensionIds;
	}

	Async getImportAntRecommendAtions(): Promise<string[]> {
		AwAit this.ActivAteProActiveRecommendAtions();

		const recommendAtions = [
			...this.fileBAsedRecommendAtions.importAntRecommendAtions,
			...this.configBAsedRecommendAtions.importAntRecommendAtions,
			...this.exeBAsedRecommendAtions.importAntRecommendAtions,
		];

		const extensionIds = distinct(recommendAtions.mAp(e => e.extensionId))
			.filter(extensionId => this.isExtensionAllowedToBeRecommended(extensionId));

		shuffle(extensionIds, this.sessionSeed);

		return extensionIds;
	}

	getKeymApRecommendAtions(): string[] {
		return this.toExtensionRecommendAtions(this.keymApRecommendAtions.recommendAtions);
	}

	Async getWorkspAceRecommendAtions(): Promise<string[]> {
		if (!this.isEnAbled()) {
			return [];
		}
		AwAit this.workspAceRecommendAtions.ActivAte();
		return this.toExtensionRecommendAtions(this.workspAceRecommendAtions.recommendAtions);
	}

	Async getExeBAsedRecommendAtions(exe?: string): Promise<{ importAnt: string[], others: string[] }> {
		AwAit this.exeBAsedRecommendAtions.ActivAte();
		const { importAnt, others } = exe ? this.exeBAsedRecommendAtions.getRecommendAtions(exe)
			: { importAnt: this.exeBAsedRecommendAtions.importAntRecommendAtions, others: this.exeBAsedRecommendAtions.otherRecommendAtions };
		return { importAnt: this.toExtensionRecommendAtions(importAnt), others: this.toExtensionRecommendAtions(others) };
	}

	getFileBAsedRecommendAtions(): string[] {
		return this.toExtensionRecommendAtions(this.fileBAsedRecommendAtions.recommendAtions);
	}

	privAte onDidInstAllExtension(e: DidInstAllExtensionEvent): void {
		if (e.gAllery && e.operAtion === InstAllOperAtion.InstAll) {
			const extRecommendAtions = this.getAllRecommendAtionsWithReAson() || {};
			const recommendAtionReAson = extRecommendAtions[e.gAllery.identifier.id.toLowerCAse()];
			if (recommendAtionReAson) {
				/* __GDPR__
					"extensionGAllery:instAll:recommendAtions" : {
						"recommendAtionReAson": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
						"${include}": [
							"${GAlleryExtensionTelemetryDAtA}"
						]
					}
				*/
				this.telemetryService.publicLog('extensionGAllery:instAll:recommendAtions', { ...e.gAllery.telemetryDAtA, recommendAtionReAson: recommendAtionReAson.reAsonId });
			}
		}
	}

	privAte toExtensionRecommendAtions(recommendAtions: ReAdonlyArrAy<ExtensionRecommendAtion>): string[] {
		const extensionIds = distinct(recommendAtions.mAp(e => e.extensionId))
			.filter(extensionId => this.isExtensionAllowedToBeRecommended(extensionId));

		return extensionIds;
	}

	privAte isExtensionAllowedToBeRecommended(extensionId: string): booleAn {
		return !this.extensionRecommendAtionsMAnAgementService.ignoredRecommendAtions.includes(extensionId.toLowerCAse());
	}

	privAte Async promptWorkspAceRecommendAtions(): Promise<void> {
		const AllowedRecommendAtions = [...this.workspAceRecommendAtions.recommendAtions, ...this.configBAsedRecommendAtions.importAntRecommendAtions]
			.mAp(({ extensionId }) => extensionId)
			.filter(extensionId => this.isExtensionAllowedToBeRecommended(extensionId));

		if (AllowedRecommendAtions.length) {
			AwAit this.extensionRecommendAtionNotificAtionService.promptWorkspAceRecommendAtions(AllowedRecommendAtions);
		}
	}



}
