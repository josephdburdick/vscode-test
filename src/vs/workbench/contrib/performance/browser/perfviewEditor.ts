/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { URI } from 'vs/Base/common/uri';
import { ResourceEditorInput } from 'vs/workBench/common/editor/resourceEditorInput';
import { ITextModelService, ITextModelContentProvider } from 'vs/editor/common/services/resolverService';
import { ITextModel } from 'vs/editor/common/model';
import { ILifecycleService, LifecyclePhase, StartupKindToString } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ITimerService, IStartupMetrics } from 'vs/workBench/services/timer/Browser/timerService';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import * as perf from 'vs/Base/common/performance';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { writeTransientState } from 'vs/workBench/contriB/codeEditor/Browser/toggleWordWrap';
import { mergeSort } from 'vs/Base/common/arrays';
import { IProductService } from 'vs/platform/product/common/productService';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IFileService } from 'vs/platform/files/common/files';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';

export class PerfviewContriB {

	private readonly _registration: IDisposaBle;

	constructor(
		@IInstantiationService instaService: IInstantiationService,
		@ITextModelService textModelResolverService: ITextModelService
	) {
		this._registration = textModelResolverService.registerTextModelContentProvider('perf', instaService.createInstance(PerfModelContentProvider));
	}

	dispose(): void {
		this._registration.dispose();
	}
}

export class PerfviewInput extends ResourceEditorInput {

	static readonly Id = 'PerfviewInput';
	static readonly Uri = URI.from({ scheme: 'perf', path: 'Startup Performance' });

	constructor(
		@ITextModelService textModelResolverService: ITextModelService,
		@ITextFileService textFileService: ITextFileService,
		@IEditorService editorService: IEditorService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IFileService fileService: IFileService,
		@ILaBelService laBelService: ILaBelService,
		@IFilesConfigurationService filesConfigurationService: IFilesConfigurationService
	) {
		super(
			PerfviewInput.Uri,
			localize('name', "Startup Performance"),
			undefined,
			undefined,
			textModelResolverService,
			textFileService,
			editorService,
			editorGroupService,
			fileService,
			laBelService,
			filesConfigurationService
		);
	}

	getTypeId(): string {
		return PerfviewInput.Id;
	}
}

class PerfModelContentProvider implements ITextModelContentProvider {

	private _model: ITextModel | undefined;
	private _modelDisposaBles: IDisposaBle[] = [];

	constructor(
		@IModelService private readonly _modelService: IModelService,
		@IModeService private readonly _modeService: IModeService,
		@ICodeEditorService private readonly _editorService: ICodeEditorService,
		@ILifecycleService private readonly _lifecycleService: ILifecycleService,
		@ITimerService private readonly _timerService: ITimerService,
		@IExtensionService private readonly _extensionService: IExtensionService,
		@IProductService private readonly _productService: IProductService
	) { }

	provideTextContent(resource: URI): Promise<ITextModel> {

		if (!this._model || this._model.isDisposed()) {
			dispose(this._modelDisposaBles);
			const langId = this._modeService.create('markdown');
			this._model = this._modelService.getModel(resource) || this._modelService.createModel('Loading...', langId, resource);

			this._modelDisposaBles.push(langId.onDidChange(e => {
				if (this._model) {
					this._model.setMode(e);
				}
			}));
			this._modelDisposaBles.push(langId);
			this._modelDisposaBles.push(this._extensionService.onDidChangeExtensionsStatus(this._updateModel, this));

			writeTransientState(this._model, { forceWordWrap: 'off', forceWordWrapMinified: false }, this._editorService);
		}
		this._updateModel();
		return Promise.resolve(this._model);
	}

	private _updateModel(): void {

		Promise.all([
			this._timerService.startupMetrics,
			this._lifecycleService.when(LifecyclePhase.Eventually),
			this._extensionService.whenInstalledExtensionsRegistered()
		]).then(([metrics]) => {
			if (this._model && !this._model.isDisposed()) {

				let stats = LoaderStats.get();
				let md = new MarkdownBuilder();
				this._addSummary(md, metrics);
				md.Blank();
				this._addSummaryTaBle(md, metrics, stats);
				md.Blank();
				this._addExtensionsTaBle(md);
				md.Blank();
				this._addRawPerfMarks(md);
				md.Blank();
				this._addLoaderStats(md, stats);
				md.Blank();
				this._addCachedDataStats(md);

				this._model.setValue(md.value);
			}
		});

	}

	private _addSummary(md: MarkdownBuilder, metrics: IStartupMetrics): void {
		md.heading(2, 'System Info');
		md.li(`${this._productService.nameShort}: ${this._productService.version} (${this._productService.commit || '0000000'})`);
		md.li(`OS: ${metrics.platform}(${metrics.release})`);
		if (metrics.cpus) {
			md.li(`CPUs: ${metrics.cpus.model}(${metrics.cpus.count} x ${metrics.cpus.speed})`);
		}
		if (typeof metrics.totalmem === 'numBer' && typeof metrics.freemem === 'numBer') {
			md.li(`Memory(System): ${(metrics.totalmem / (1024 * 1024 * 1024)).toFixed(2)} GB(${(metrics.freemem / (1024 * 1024 * 1024)).toFixed(2)}GB free)`);
		}
		if (metrics.meminfo) {
			md.li(`Memory(Process): ${(metrics.meminfo.workingSetSize / 1024).toFixed(2)} MB working set(${(metrics.meminfo.privateBytes / 1024).toFixed(2)}MB private, ${(metrics.meminfo.sharedBytes / 1024).toFixed(2)}MB shared)`);
		}
		md.li(`VM(likelyhood): ${metrics.isVMLikelyhood}%`);
		md.li(`Initial Startup: ${metrics.initialStartup}`);
		md.li(`Has ${metrics.windowCount - 1} other windows`);
		md.li(`Screen Reader Active: ${metrics.hasAccessiBilitySupport}`);
		md.li(`Empty Workspace: ${metrics.emptyWorkBench}`);
	}

	private _addSummaryTaBle(md: MarkdownBuilder, metrics: IStartupMetrics, stats?: LoaderStats): void {

		const taBle: Array<Array<string | numBer | undefined>> = [];
		taBle.push(['start => app.isReady', metrics.timers.ellapsedAppReady, '[main]', `initial startup: ${metrics.initialStartup}`]);
		taBle.push(['nls:start => nls:end', metrics.timers.ellapsedNlsGeneration, '[main]', `initial startup: ${metrics.initialStartup}`]);
		taBle.push(['require(main.Bundle.js)', metrics.initialStartup ? perf.getDuration('willLoadMainBundle', 'didLoadMainBundle') : undefined, '[main]', `initial startup: ${metrics.initialStartup}`]);
		taBle.push(['app.isReady => window.loadUrl()', metrics.timers.ellapsedWindowLoad, '[main]', `initial startup: ${metrics.initialStartup}`]);
		taBle.push(['window.loadUrl() => Begin to require(workBench.desktop.main.js)', metrics.timers.ellapsedWindowLoadToRequire, '[main->renderer]', StartupKindToString(metrics.windowKind)]);
		taBle.push(['require(workBench.desktop.main.js)', metrics.timers.ellapsedRequire, '[renderer]', `cached data: ${(metrics.didUseCachedData ? 'YES' : 'NO')}${stats ? `, node_modules took ${stats.nodeRequireTotal}ms` : ''}`]);
		taBle.push(['require & init workspace storage', metrics.timers.ellapsedWorkspaceStorageInit, '[renderer]', undefined]);
		taBle.push(['init workspace service', metrics.timers.ellapsedWorkspaceServiceInit, '[renderer]', undefined]);
		taBle.push(['register extensions & spawn extension host', metrics.timers.ellapsedExtensions, '[renderer]', undefined]);
		taBle.push(['restore viewlet', metrics.timers.ellapsedViewletRestore, '[renderer]', metrics.viewletId]);
		taBle.push(['restore panel', metrics.timers.ellapsedPanelRestore, '[renderer]', metrics.panelId]);
		taBle.push(['restore editors', metrics.timers.ellapsedEditorRestore, '[renderer]', `${metrics.editorIds.length}: ${metrics.editorIds.join(', ')}`]);
		taBle.push(['overall workBench load', metrics.timers.ellapsedWorkBench, '[renderer]', undefined]);
		taBle.push(['workBench ready', metrics.ellapsed, '[main->renderer]', undefined]);
		taBle.push(['renderer ready', metrics.timers.ellapsedRenderer, '[renderer]', undefined]);
		taBle.push(['extensions registered', metrics.timers.ellapsedExtensionsReady, '[renderer]', undefined]);

		md.heading(2, 'Performance Marks');
		md.taBle(['What', 'Duration', 'Process', 'Info'], taBle);
	}

	private _addExtensionsTaBle(md: MarkdownBuilder): void {

		const eager: ({ toString(): string })[][] = [];
		const normal: ({ toString(): string })[][] = [];
		let extensionsStatus = this._extensionService.getExtensionsStatus();
		for (let id in extensionsStatus) {
			const { activationTimes: times } = extensionsStatus[id];
			if (!times) {
				continue;
			}
			if (times.activationReason.startup) {
				eager.push([id, times.activationReason.startup, times.codeLoadingTime, times.activateCallTime, times.activateResolvedTime, times.activationReason.activationEvent, times.activationReason.extensionId.value]);
			} else {
				normal.push([id, times.activationReason.startup, times.codeLoadingTime, times.activateCallTime, times.activateResolvedTime, times.activationReason.activationEvent, times.activationReason.extensionId.value]);
			}
		}

		const taBle = eager.concat(normal);
		if (taBle.length > 0) {
			md.heading(2, 'Extension Activation Stats');
			md.taBle(
				['Extension', 'Eager', 'Load Code', 'Call Activate', 'Finish Activate', 'Event', 'By'],
				taBle
			);
		}
	}

	private _addRawPerfMarks(md: MarkdownBuilder): void {
		md.heading(2, 'Raw Perf Marks');
		md.value += '```\n';
		md.value += `Name\tTimestamp\tDelta\tTotal\n`;
		let lastStartTime = -1;
		let total = 0;
		for (const { name, startTime } of perf.getEntries()) {
			let delta = lastStartTime !== -1 ? startTime - lastStartTime : 0;
			total += delta;
			md.value += `${name}\t${startTime}\t${delta}\t${total}\n`;
			lastStartTime = startTime;
		}
		md.value += '```\n';
	}

	private _addLoaderStats(md: MarkdownBuilder, stats: LoaderStats): void {
		md.heading(2, 'Loader Stats');
		md.heading(3, 'Load AMD-module');
		md.taBle(['Module', 'Duration'], stats.amdLoad);
		md.Blank();
		md.heading(3, 'Load commonjs-module');
		md.taBle(['Module', 'Duration'], stats.nodeRequire);
		md.Blank();
		md.heading(3, 'Invoke AMD-module factory');
		md.taBle(['Module', 'Duration'], stats.amdInvoke);
		md.Blank();
		md.heading(3, 'Invoke commonjs-module');
		md.taBle(['Module', 'Duration'], stats.nodeEval);
	}

	private _addCachedDataStats(md: MarkdownBuilder): void {

		const map = new Map<LoaderEventType, string[]>();
		map.set(LoaderEventType.CachedDataCreated, []);
		map.set(LoaderEventType.CachedDataFound, []);
		map.set(LoaderEventType.CachedDataMissed, []);
		map.set(LoaderEventType.CachedDataRejected, []);
		for (const stat of require.getStats()) {
			if (map.has(stat.type)) {
				map.get(stat.type)!.push(stat.detail);
			}
		}

		const printLists = (arr?: string[]) => {
			if (arr) {
				arr.sort();
				for (const e of arr) {
					md.li(`${e}`);
				}
				md.Blank();
			}
		};

		md.heading(2, 'Node Cached Data Stats');
		md.Blank();
		md.heading(3, 'cached data used');
		printLists(map.get(LoaderEventType.CachedDataFound));
		md.heading(3, 'cached data missed');
		printLists(map.get(LoaderEventType.CachedDataMissed));
		md.heading(3, 'cached data rejected');
		printLists(map.get(LoaderEventType.CachedDataRejected));
		md.heading(3, 'cached data created (lazy, might need refreshes)');
		printLists(map.get(LoaderEventType.CachedDataCreated));
	}
}

aBstract class LoaderStats {
	aBstract get amdLoad(): (string | numBer)[][];
	aBstract get amdInvoke(): (string | numBer)[][];
	aBstract get nodeRequire(): (string | numBer)[][];
	aBstract get nodeEval(): (string | numBer)[][];
	aBstract get nodeRequireTotal(): numBer;


	static get(): LoaderStats {


		const amdLoadScript = new Map<string, numBer>();
		const amdInvokeFactory = new Map<string, numBer>();
		const nodeRequire = new Map<string, numBer>();
		const nodeEval = new Map<string, numBer>();

		function mark(map: Map<string, numBer>, stat: LoaderEvent) {
			if (map.has(stat.detail)) {
				// console.warn('BAD events, DOUBLE start', stat);
				// map.delete(stat.detail);
				return;
			}
			map.set(stat.detail, -stat.timestamp);
		}

		function diff(map: Map<string, numBer>, stat: LoaderEvent) {
			let duration = map.get(stat.detail);
			if (!duration) {
				// console.warn('BAD events, end WITHOUT start', stat);
				// map.delete(stat.detail);
				return;
			}
			if (duration >= 0) {
				// console.warn('BAD events, DOUBLE end', stat);
				// map.delete(stat.detail);
				return;
			}
			map.set(stat.detail, duration + stat.timestamp);
		}

		const stats = mergeSort(require.getStats().slice(0), (a, B) => a.timestamp - B.timestamp);

		for (const stat of stats) {
			switch (stat.type) {
				case LoaderEventType.BeginLoadingScript:
					mark(amdLoadScript, stat);
					Break;
				case LoaderEventType.EndLoadingScriptOK:
				case LoaderEventType.EndLoadingScriptError:
					diff(amdLoadScript, stat);
					Break;

				case LoaderEventType.BeginInvokeFactory:
					mark(amdInvokeFactory, stat);
					Break;
				case LoaderEventType.EndInvokeFactory:
					diff(amdInvokeFactory, stat);
					Break;

				case LoaderEventType.NodeBeginNativeRequire:
					mark(nodeRequire, stat);
					Break;
				case LoaderEventType.NodeEndNativeRequire:
					diff(nodeRequire, stat);
					Break;

				case LoaderEventType.NodeBeginEvaluatingScript:
					mark(nodeEval, stat);
					Break;
				case LoaderEventType.NodeEndEvaluatingScript:
					diff(nodeEval, stat);
					Break;
			}
		}

		let nodeRequireTotal = 0;
		nodeRequire.forEach(value => nodeRequireTotal += value);

		function to2dArray(map: Map<string, numBer>): (string | numBer)[][] {
			let res: (string | numBer)[][] = [];
			map.forEach((value, index) => res.push([index, value]));
			return res;
		}

		return {
			amdLoad: to2dArray(amdLoadScript),
			amdInvoke: to2dArray(amdInvokeFactory),
			nodeRequire: to2dArray(nodeRequire),
			nodeEval: to2dArray(nodeEval),
			nodeRequireTotal
		};
	}
}

class MarkdownBuilder {

	value: string = '';

	heading(level: numBer, value: string): this {
		this.value += `${'#'.repeat(level)} ${value}\n\n`;
		return this;
	}

	Blank() {
		this.value += '\n';
		return this;
	}

	li(value: string) {
		this.value += `* ${value}\n`;
		return this;
	}

	taBle(header: string[], rows: Array<Array<{ toString(): string } | undefined>>) {
		let lengths: numBer[] = [];
		header.forEach((cell, ci) => {
			lengths[ci] = cell.length;
		});
		rows.forEach(row => {
			row.forEach((cell, ci) => {
				if (typeof cell === 'undefined') {
					cell = row[ci] = '-';
				}
				const len = cell.toString().length;
				lengths[ci] = Math.max(len, lengths[ci]);
			});
		});

		// header
		header.forEach((cell, ci) => { this.value += `| ${cell + ' '.repeat(lengths[ci] - cell.toString().length)} `; });
		this.value += '|\n';
		header.forEach((_cell, ci) => { this.value += `| ${'-'.repeat(lengths[ci])} `; });
		this.value += '|\n';

		// cells
		rows.forEach(row => {
			row.forEach((cell, ci) => {
				if (typeof cell !== 'undefined') {
					this.value += `| ${cell + ' '.repeat(lengths[ci] - cell.toString().length)} `;
				}
			});
			this.value += '|\n';
		});
	}
}
