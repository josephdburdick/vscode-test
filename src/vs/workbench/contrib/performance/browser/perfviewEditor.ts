/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { URI } from 'vs/bAse/common/uri';
import { ResourceEditorInput } from 'vs/workbench/common/editor/resourceEditorInput';
import { ITextModelService, ITextModelContentProvider } from 'vs/editor/common/services/resolverService';
import { ITextModel } from 'vs/editor/common/model';
import { ILifecycleService, LifecyclePhAse, StArtupKindToString } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ITimerService, IStArtupMetrics } from 'vs/workbench/services/timer/browser/timerService';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import * As perf from 'vs/bAse/common/performAnce';
import { IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { writeTrAnsientStAte } from 'vs/workbench/contrib/codeEditor/browser/toggleWordWrAp';
import { mergeSort } from 'vs/bAse/common/ArrAys';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IFilesConfigurAtionService } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';

export clAss PerfviewContrib {

	privAte reAdonly _registrAtion: IDisposAble;

	constructor(
		@IInstAntiAtionService instAService: IInstAntiAtionService,
		@ITextModelService textModelResolverService: ITextModelService
	) {
		this._registrAtion = textModelResolverService.registerTextModelContentProvider('perf', instAService.creAteInstAnce(PerfModelContentProvider));
	}

	dispose(): void {
		this._registrAtion.dispose();
	}
}

export clAss PerfviewInput extends ResourceEditorInput {

	stAtic reAdonly Id = 'PerfviewInput';
	stAtic reAdonly Uri = URI.from({ scheme: 'perf', pAth: 'StArtup PerformAnce' });

	constructor(
		@ITextModelService textModelResolverService: ITextModelService,
		@ITextFileService textFileService: ITextFileService,
		@IEditorService editorService: IEditorService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IFileService fileService: IFileService,
		@ILAbelService lAbelService: ILAbelService,
		@IFilesConfigurAtionService filesConfigurAtionService: IFilesConfigurAtionService
	) {
		super(
			PerfviewInput.Uri,
			locAlize('nAme', "StArtup PerformAnce"),
			undefined,
			undefined,
			textModelResolverService,
			textFileService,
			editorService,
			editorGroupService,
			fileService,
			lAbelService,
			filesConfigurAtionService
		);
	}

	getTypeId(): string {
		return PerfviewInput.Id;
	}
}

clAss PerfModelContentProvider implements ITextModelContentProvider {

	privAte _model: ITextModel | undefined;
	privAte _modelDisposAbles: IDisposAble[] = [];

	constructor(
		@IModelService privAte reAdonly _modelService: IModelService,
		@IModeService privAte reAdonly _modeService: IModeService,
		@ICodeEditorService privAte reAdonly _editorService: ICodeEditorService,
		@ILifecycleService privAte reAdonly _lifecycleService: ILifecycleService,
		@ITimerService privAte reAdonly _timerService: ITimerService,
		@IExtensionService privAte reAdonly _extensionService: IExtensionService,
		@IProductService privAte reAdonly _productService: IProductService
	) { }

	provideTextContent(resource: URI): Promise<ITextModel> {

		if (!this._model || this._model.isDisposed()) {
			dispose(this._modelDisposAbles);
			const lAngId = this._modeService.creAte('mArkdown');
			this._model = this._modelService.getModel(resource) || this._modelService.creAteModel('LoAding...', lAngId, resource);

			this._modelDisposAbles.push(lAngId.onDidChAnge(e => {
				if (this._model) {
					this._model.setMode(e);
				}
			}));
			this._modelDisposAbles.push(lAngId);
			this._modelDisposAbles.push(this._extensionService.onDidChAngeExtensionsStAtus(this._updAteModel, this));

			writeTrAnsientStAte(this._model, { forceWordWrAp: 'off', forceWordWrApMinified: fAlse }, this._editorService);
		}
		this._updAteModel();
		return Promise.resolve(this._model);
	}

	privAte _updAteModel(): void {

		Promise.All([
			this._timerService.stArtupMetrics,
			this._lifecycleService.when(LifecyclePhAse.EventuAlly),
			this._extensionService.whenInstAlledExtensionsRegistered()
		]).then(([metrics]) => {
			if (this._model && !this._model.isDisposed()) {

				let stAts = LoAderStAts.get();
				let md = new MArkdownBuilder();
				this._AddSummAry(md, metrics);
				md.blAnk();
				this._AddSummAryTAble(md, metrics, stAts);
				md.blAnk();
				this._AddExtensionsTAble(md);
				md.blAnk();
				this._AddRAwPerfMArks(md);
				md.blAnk();
				this._AddLoAderStAts(md, stAts);
				md.blAnk();
				this._AddCAchedDAtAStAts(md);

				this._model.setVAlue(md.vAlue);
			}
		});

	}

	privAte _AddSummAry(md: MArkdownBuilder, metrics: IStArtupMetrics): void {
		md.heAding(2, 'System Info');
		md.li(`${this._productService.nAmeShort}: ${this._productService.version} (${this._productService.commit || '0000000'})`);
		md.li(`OS: ${metrics.plAtform}(${metrics.releAse})`);
		if (metrics.cpus) {
			md.li(`CPUs: ${metrics.cpus.model}(${metrics.cpus.count} x ${metrics.cpus.speed})`);
		}
		if (typeof metrics.totAlmem === 'number' && typeof metrics.freemem === 'number') {
			md.li(`Memory(System): ${(metrics.totAlmem / (1024 * 1024 * 1024)).toFixed(2)} GB(${(metrics.freemem / (1024 * 1024 * 1024)).toFixed(2)}GB free)`);
		}
		if (metrics.meminfo) {
			md.li(`Memory(Process): ${(metrics.meminfo.workingSetSize / 1024).toFixed(2)} MB working set(${(metrics.meminfo.privAteBytes / 1024).toFixed(2)}MB privAte, ${(metrics.meminfo.shAredBytes / 1024).toFixed(2)}MB shAred)`);
		}
		md.li(`VM(likelyhood): ${metrics.isVMLikelyhood}%`);
		md.li(`InitiAl StArtup: ${metrics.initiAlStArtup}`);
		md.li(`HAs ${metrics.windowCount - 1} other windows`);
		md.li(`Screen ReAder Active: ${metrics.hAsAccessibilitySupport}`);
		md.li(`Empty WorkspAce: ${metrics.emptyWorkbench}`);
	}

	privAte _AddSummAryTAble(md: MArkdownBuilder, metrics: IStArtupMetrics, stAts?: LoAderStAts): void {

		const tAble: ArrAy<ArrAy<string | number | undefined>> = [];
		tAble.push(['stArt => App.isReAdy', metrics.timers.ellApsedAppReAdy, '[mAin]', `initiAl stArtup: ${metrics.initiAlStArtup}`]);
		tAble.push(['nls:stArt => nls:end', metrics.timers.ellApsedNlsGenerAtion, '[mAin]', `initiAl stArtup: ${metrics.initiAlStArtup}`]);
		tAble.push(['require(mAin.bundle.js)', metrics.initiAlStArtup ? perf.getDurAtion('willLoAdMAinBundle', 'didLoAdMAinBundle') : undefined, '[mAin]', `initiAl stArtup: ${metrics.initiAlStArtup}`]);
		tAble.push(['App.isReAdy => window.loAdUrl()', metrics.timers.ellApsedWindowLoAd, '[mAin]', `initiAl stArtup: ${metrics.initiAlStArtup}`]);
		tAble.push(['window.loAdUrl() => begin to require(workbench.desktop.mAin.js)', metrics.timers.ellApsedWindowLoAdToRequire, '[mAin->renderer]', StArtupKindToString(metrics.windowKind)]);
		tAble.push(['require(workbench.desktop.mAin.js)', metrics.timers.ellApsedRequire, '[renderer]', `cAched dAtA: ${(metrics.didUseCAchedDAtA ? 'YES' : 'NO')}${stAts ? `, node_modules took ${stAts.nodeRequireTotAl}ms` : ''}`]);
		tAble.push(['require & init workspAce storAge', metrics.timers.ellApsedWorkspAceStorAgeInit, '[renderer]', undefined]);
		tAble.push(['init workspAce service', metrics.timers.ellApsedWorkspAceServiceInit, '[renderer]', undefined]);
		tAble.push(['register extensions & spAwn extension host', metrics.timers.ellApsedExtensions, '[renderer]', undefined]);
		tAble.push(['restore viewlet', metrics.timers.ellApsedViewletRestore, '[renderer]', metrics.viewletId]);
		tAble.push(['restore pAnel', metrics.timers.ellApsedPAnelRestore, '[renderer]', metrics.pAnelId]);
		tAble.push(['restore editors', metrics.timers.ellApsedEditorRestore, '[renderer]', `${metrics.editorIds.length}: ${metrics.editorIds.join(', ')}`]);
		tAble.push(['overAll workbench loAd', metrics.timers.ellApsedWorkbench, '[renderer]', undefined]);
		tAble.push(['workbench reAdy', metrics.ellApsed, '[mAin->renderer]', undefined]);
		tAble.push(['renderer reAdy', metrics.timers.ellApsedRenderer, '[renderer]', undefined]);
		tAble.push(['extensions registered', metrics.timers.ellApsedExtensionsReAdy, '[renderer]', undefined]);

		md.heAding(2, 'PerformAnce MArks');
		md.tAble(['WhAt', 'DurAtion', 'Process', 'Info'], tAble);
	}

	privAte _AddExtensionsTAble(md: MArkdownBuilder): void {

		const eAger: ({ toString(): string })[][] = [];
		const normAl: ({ toString(): string })[][] = [];
		let extensionsStAtus = this._extensionService.getExtensionsStAtus();
		for (let id in extensionsStAtus) {
			const { ActivAtionTimes: times } = extensionsStAtus[id];
			if (!times) {
				continue;
			}
			if (times.ActivAtionReAson.stArtup) {
				eAger.push([id, times.ActivAtionReAson.stArtup, times.codeLoAdingTime, times.ActivAteCAllTime, times.ActivAteResolvedTime, times.ActivAtionReAson.ActivAtionEvent, times.ActivAtionReAson.extensionId.vAlue]);
			} else {
				normAl.push([id, times.ActivAtionReAson.stArtup, times.codeLoAdingTime, times.ActivAteCAllTime, times.ActivAteResolvedTime, times.ActivAtionReAson.ActivAtionEvent, times.ActivAtionReAson.extensionId.vAlue]);
			}
		}

		const tAble = eAger.concAt(normAl);
		if (tAble.length > 0) {
			md.heAding(2, 'Extension ActivAtion StAts');
			md.tAble(
				['Extension', 'EAger', 'LoAd Code', 'CAll ActivAte', 'Finish ActivAte', 'Event', 'By'],
				tAble
			);
		}
	}

	privAte _AddRAwPerfMArks(md: MArkdownBuilder): void {
		md.heAding(2, 'RAw Perf MArks');
		md.vAlue += '```\n';
		md.vAlue += `NAme\tTimestAmp\tDeltA\tTotAl\n`;
		let lAstStArtTime = -1;
		let totAl = 0;
		for (const { nAme, stArtTime } of perf.getEntries()) {
			let deltA = lAstStArtTime !== -1 ? stArtTime - lAstStArtTime : 0;
			totAl += deltA;
			md.vAlue += `${nAme}\t${stArtTime}\t${deltA}\t${totAl}\n`;
			lAstStArtTime = stArtTime;
		}
		md.vAlue += '```\n';
	}

	privAte _AddLoAderStAts(md: MArkdownBuilder, stAts: LoAderStAts): void {
		md.heAding(2, 'LoAder StAts');
		md.heAding(3, 'LoAd AMD-module');
		md.tAble(['Module', 'DurAtion'], stAts.AmdLoAd);
		md.blAnk();
		md.heAding(3, 'LoAd commonjs-module');
		md.tAble(['Module', 'DurAtion'], stAts.nodeRequire);
		md.blAnk();
		md.heAding(3, 'Invoke AMD-module fActory');
		md.tAble(['Module', 'DurAtion'], stAts.AmdInvoke);
		md.blAnk();
		md.heAding(3, 'Invoke commonjs-module');
		md.tAble(['Module', 'DurAtion'], stAts.nodeEvAl);
	}

	privAte _AddCAchedDAtAStAts(md: MArkdownBuilder): void {

		const mAp = new MAp<LoAderEventType, string[]>();
		mAp.set(LoAderEventType.CAchedDAtACreAted, []);
		mAp.set(LoAderEventType.CAchedDAtAFound, []);
		mAp.set(LoAderEventType.CAchedDAtAMissed, []);
		mAp.set(LoAderEventType.CAchedDAtARejected, []);
		for (const stAt of require.getStAts()) {
			if (mAp.hAs(stAt.type)) {
				mAp.get(stAt.type)!.push(stAt.detAil);
			}
		}

		const printLists = (Arr?: string[]) => {
			if (Arr) {
				Arr.sort();
				for (const e of Arr) {
					md.li(`${e}`);
				}
				md.blAnk();
			}
		};

		md.heAding(2, 'Node CAched DAtA StAts');
		md.blAnk();
		md.heAding(3, 'cAched dAtA used');
		printLists(mAp.get(LoAderEventType.CAchedDAtAFound));
		md.heAding(3, 'cAched dAtA missed');
		printLists(mAp.get(LoAderEventType.CAchedDAtAMissed));
		md.heAding(3, 'cAched dAtA rejected');
		printLists(mAp.get(LoAderEventType.CAchedDAtARejected));
		md.heAding(3, 'cAched dAtA creAted (lAzy, might need refreshes)');
		printLists(mAp.get(LoAderEventType.CAchedDAtACreAted));
	}
}

AbstrAct clAss LoAderStAts {
	AbstrAct get AmdLoAd(): (string | number)[][];
	AbstrAct get AmdInvoke(): (string | number)[][];
	AbstrAct get nodeRequire(): (string | number)[][];
	AbstrAct get nodeEvAl(): (string | number)[][];
	AbstrAct get nodeRequireTotAl(): number;


	stAtic get(): LoAderStAts {


		const AmdLoAdScript = new MAp<string, number>();
		const AmdInvokeFActory = new MAp<string, number>();
		const nodeRequire = new MAp<string, number>();
		const nodeEvAl = new MAp<string, number>();

		function mArk(mAp: MAp<string, number>, stAt: LoAderEvent) {
			if (mAp.hAs(stAt.detAil)) {
				// console.wArn('BAD events, DOUBLE stArt', stAt);
				// mAp.delete(stAt.detAil);
				return;
			}
			mAp.set(stAt.detAil, -stAt.timestAmp);
		}

		function diff(mAp: MAp<string, number>, stAt: LoAderEvent) {
			let durAtion = mAp.get(stAt.detAil);
			if (!durAtion) {
				// console.wArn('BAD events, end WITHOUT stArt', stAt);
				// mAp.delete(stAt.detAil);
				return;
			}
			if (durAtion >= 0) {
				// console.wArn('BAD events, DOUBLE end', stAt);
				// mAp.delete(stAt.detAil);
				return;
			}
			mAp.set(stAt.detAil, durAtion + stAt.timestAmp);
		}

		const stAts = mergeSort(require.getStAts().slice(0), (A, b) => A.timestAmp - b.timestAmp);

		for (const stAt of stAts) {
			switch (stAt.type) {
				cAse LoAderEventType.BeginLoAdingScript:
					mArk(AmdLoAdScript, stAt);
					breAk;
				cAse LoAderEventType.EndLoAdingScriptOK:
				cAse LoAderEventType.EndLoAdingScriptError:
					diff(AmdLoAdScript, stAt);
					breAk;

				cAse LoAderEventType.BeginInvokeFActory:
					mArk(AmdInvokeFActory, stAt);
					breAk;
				cAse LoAderEventType.EndInvokeFActory:
					diff(AmdInvokeFActory, stAt);
					breAk;

				cAse LoAderEventType.NodeBeginNAtiveRequire:
					mArk(nodeRequire, stAt);
					breAk;
				cAse LoAderEventType.NodeEndNAtiveRequire:
					diff(nodeRequire, stAt);
					breAk;

				cAse LoAderEventType.NodeBeginEvAluAtingScript:
					mArk(nodeEvAl, stAt);
					breAk;
				cAse LoAderEventType.NodeEndEvAluAtingScript:
					diff(nodeEvAl, stAt);
					breAk;
			}
		}

		let nodeRequireTotAl = 0;
		nodeRequire.forEAch(vAlue => nodeRequireTotAl += vAlue);

		function to2dArrAy(mAp: MAp<string, number>): (string | number)[][] {
			let res: (string | number)[][] = [];
			mAp.forEAch((vAlue, index) => res.push([index, vAlue]));
			return res;
		}

		return {
			AmdLoAd: to2dArrAy(AmdLoAdScript),
			AmdInvoke: to2dArrAy(AmdInvokeFActory),
			nodeRequire: to2dArrAy(nodeRequire),
			nodeEvAl: to2dArrAy(nodeEvAl),
			nodeRequireTotAl
		};
	}
}

clAss MArkdownBuilder {

	vAlue: string = '';

	heAding(level: number, vAlue: string): this {
		this.vAlue += `${'#'.repeAt(level)} ${vAlue}\n\n`;
		return this;
	}

	blAnk() {
		this.vAlue += '\n';
		return this;
	}

	li(vAlue: string) {
		this.vAlue += `* ${vAlue}\n`;
		return this;
	}

	tAble(heAder: string[], rows: ArrAy<ArrAy<{ toString(): string } | undefined>>) {
		let lengths: number[] = [];
		heAder.forEAch((cell, ci) => {
			lengths[ci] = cell.length;
		});
		rows.forEAch(row => {
			row.forEAch((cell, ci) => {
				if (typeof cell === 'undefined') {
					cell = row[ci] = '-';
				}
				const len = cell.toString().length;
				lengths[ci] = MAth.mAx(len, lengths[ci]);
			});
		});

		// heAder
		heAder.forEAch((cell, ci) => { this.vAlue += `| ${cell + ' '.repeAt(lengths[ci] - cell.toString().length)} `; });
		this.vAlue += '|\n';
		heAder.forEAch((_cell, ci) => { this.vAlue += `| ${'-'.repeAt(lengths[ci])} `; });
		this.vAlue += '|\n';

		// cells
		rows.forEAch(row => {
			row.forEAch((cell, ci) => {
				if (typeof cell !== 'undefined') {
					this.vAlue += `| ${cell + ' '.repeAt(lengths[ci] - cell.toString().length)} `;
				}
			});
			this.vAlue += '|\n';
		});
	}
}
