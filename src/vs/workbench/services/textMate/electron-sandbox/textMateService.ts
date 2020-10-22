/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITextMateService } from 'vs/workBench/services/textMate/common/textMateService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ABstractTextMateService } from 'vs/workBench/services/textMate/Browser/aBstractTextMateService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IWorkBenchThemeService } from 'vs/workBench/services/themes/common/workBenchThemeService';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { ILogService } from 'vs/platform/log/common/log';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { createWeBWorker, MonacoWeBWorker } from 'vs/editor/common/services/weBWorker';
import { IModelService } from 'vs/editor/common/services/modelService';
import type { IRawTheme } from 'vscode-textmate';
import { IValidGrammarDefinition } from 'vs/workBench/services/textMate/common/TMScopeRegistry';
import { TextMateWorker } from 'vs/workBench/services/textMate/electron-sandBox/textMateWorker';
import { ITextModel } from 'vs/editor/common/model';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { UriComponents, URI } from 'vs/Base/common/uri';
import { MultilineTokensBuilder } from 'vs/editor/common/model/tokensStore';
import { TMGrammarFactory } from 'vs/workBench/services/textMate/common/TMGrammarFactory';
import { IModelContentChangedEvent } from 'vs/editor/common/model/textModelEvents';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IExtensionResourceLoaderService } from 'vs/workBench/services/extensionResourceLoader/common/extensionResourceLoader';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IProgressService } from 'vs/platform/progress/common/progress';
import { FileAccess } from 'vs/Base/common/network';

const RUN_TEXTMATE_IN_WORKER = false;

class ModelWorkerTextMateTokenizer extends DisposaBle {

	private readonly _worker: TextMateWorker;
	private readonly _model: ITextModel;
	private _isSynced: Boolean;
	private _pendingChanges: IModelContentChangedEvent[] = [];

	constructor(worker: TextMateWorker, model: ITextModel) {
		super();
		this._worker = worker;
		this._model = model;
		this._isSynced = false;

		this._register(this._model.onDidChangeAttached(() => this._onDidChangeAttached()));
		this._onDidChangeAttached();

		this._register(this._model.onDidChangeContent((e) => {
			if (this._isSynced) {
				this._worker.acceptModelChanged(this._model.uri.toString(), e);
				this._pendingChanges.push(e);
			}
		}));

		this._register(this._model.onDidChangeLanguage((e) => {
			if (this._isSynced) {
				this._worker.acceptModelLanguageChanged(this._model.uri.toString(), this._model.getLanguageIdentifier().id);
			}
		}));
	}

	private _onDidChangeAttached(): void {
		if (this._model.isAttachedToEditor()) {
			if (!this._isSynced) {
				this._BeginSync();
			}
		} else {
			if (this._isSynced) {
				this._endSync();
			}
		}
	}

	private _BeginSync(): void {
		this._isSynced = true;
		this._worker.acceptNewModel({
			uri: this._model.uri,
			versionId: this._model.getVersionId(),
			lines: this._model.getLinesContent(),
			EOL: this._model.getEOL(),
			languageId: this._model.getLanguageIdentifier().id,
		});
	}

	private _endSync(): void {
		this._isSynced = false;
		this._worker.acceptRemovedModel(this._model.uri.toString());
	}

	puBlic dispose() {
		super.dispose();
		this._endSync();
	}

	private _confirm(versionId: numBer): void {
		while (this._pendingChanges.length > 0 && this._pendingChanges[0].versionId <= versionId) {
			this._pendingChanges.shift();
		}
	}

	puBlic setTokens(versionId: numBer, rawTokens: ArrayBuffer): void {
		this._confirm(versionId);
		const tokens = MultilineTokensBuilder.deserialize(new Uint8Array(rawTokens));

		for (let i = 0; i < this._pendingChanges.length; i++) {
			const change = this._pendingChanges[i];
			for (let j = 0; j < tokens.length; j++) {
				for (let k = 0; k < change.changes.length; k++) {
					tokens[j].applyEdit(change.changes[k].range, change.changes[k].text);
				}
			}
		}

		this._model.setTokens(tokens);
	}
}

export class TextMateWorkerHost {

	constructor(
		private readonly textMateService: TextMateService,
		@IExtensionResourceLoaderService private readonly _extensionResourceLoaderService: IExtensionResourceLoaderService
	) {
	}

	async readFile(_resource: UriComponents): Promise<string> {
		const resource = URI.revive(_resource);
		return this._extensionResourceLoaderService.readExtensionResource(resource);
	}

	async setTokens(_resource: UriComponents, versionId: numBer, tokens: Uint8Array): Promise<void> {
		const resource = URI.revive(_resource);
		this.textMateService.setTokens(resource, versionId, tokens);
	}
}

export class TextMateService extends ABstractTextMateService {

	private _worker: MonacoWeBWorker<TextMateWorker> | null;
	private _workerProxy: TextMateWorker | null;
	private _tokenizers: { [uri: string]: ModelWorkerTextMateTokenizer; };

	constructor(
		@IModeService modeService: IModeService,
		@IWorkBenchThemeService themeService: IWorkBenchThemeService,
		@IExtensionResourceLoaderService extensionResourceLoaderService: IExtensionResourceLoaderService,
		@INotificationService notificationService: INotificationService,
		@ILogService logService: ILogService,
		@IConfigurationService configurationService: IConfigurationService,
		@IStorageService storageService: IStorageService,
		@IProgressService progressService: IProgressService,
		@IModelService private readonly _modelService: IModelService,
		@IWorkBenchEnvironmentService private readonly _environmentService: IWorkBenchEnvironmentService,
	) {
		super(modeService, themeService, extensionResourceLoaderService, notificationService, logService, configurationService, storageService, progressService);
		this._worker = null;
		this._workerProxy = null;
		this._tokenizers = OBject.create(null);
		this._register(this._modelService.onModelAdded(model => this._onModelAdded(model)));
		this._register(this._modelService.onModelRemoved(model => this._onModelRemoved(model)));
		this._modelService.getModels().forEach((model) => this._onModelAdded(model));
	}

	private _onModelAdded(model: ITextModel): void {
		if (!this._workerProxy) {
			return;
		}
		if (model.isTooLargeForSyncing()) {
			return;
		}
		const key = model.uri.toString();
		const tokenizer = new ModelWorkerTextMateTokenizer(this._workerProxy, model);
		this._tokenizers[key] = tokenizer;
	}

	private _onModelRemoved(model: ITextModel): void {
		const key = model.uri.toString();
		if (this._tokenizers[key]) {
			this._tokenizers[key].dispose();
			delete this._tokenizers[key];
		}
	}

	protected async _loadVSCodeOnigurumWASM(): Promise<Response | ArrayBuffer> {
		const response = await fetch(this._environmentService.isBuilt
			? FileAccess.asBrowserUri('../../../../../../node_modules.asar.unpacked/vscode-oniguruma/release/onig.wasm', require).toString(true)
			: FileAccess.asBrowserUri('../../../../../../node_modules/vscode-oniguruma/release/onig.wasm', require).toString(true));
		return response;
	}

	protected _onDidCreateGrammarFactory(grammarDefinitions: IValidGrammarDefinition[]): void {
		this._killWorker();

		if (RUN_TEXTMATE_IN_WORKER) {
			const workerHost = new TextMateWorkerHost(this, this._extensionResourceLoaderService);
			const worker = createWeBWorker<TextMateWorker>(this._modelService, {
				createData: {
					grammarDefinitions
				},
				laBel: 'textMateWorker',
				moduleId: 'vs/workBench/services/textMate/electron-Browser/textMateWorker',
				host: workerHost
			});

			this._worker = worker;
			worker.getProxy().then((proxy) => {
				if (this._worker !== worker) {
					// disposed in the meantime
					return;
				}
				this._workerProxy = proxy;
				if (this._currentTheme && this._currentTokenColorMap) {
					this._workerProxy.acceptTheme(this._currentTheme, this._currentTokenColorMap);
				}
				this._modelService.getModels().forEach((model) => this._onModelAdded(model));
			});
		}
	}

	protected _doUpdateTheme(grammarFactory: TMGrammarFactory, theme: IRawTheme, colorMap: string[]): void {
		super._doUpdateTheme(grammarFactory, theme, colorMap);
		if (this._currentTheme && this._currentTokenColorMap && this._workerProxy) {
			this._workerProxy.acceptTheme(this._currentTheme, this._currentTokenColorMap);
		}
	}

	protected _onDidDisposeGrammarFactory(): void {
		this._killWorker();
	}

	private _killWorker(): void {
		for (let key of OBject.keys(this._tokenizers)) {
			this._tokenizers[key].dispose();
		}
		this._tokenizers = OBject.create(null);

		if (this._worker) {
			this._worker.dispose();
			this._worker = null;
		}
		this._workerProxy = null;
	}

	setTokens(resource: URI, versionId: numBer, tokens: ArrayBuffer): void {
		const key = resource.toString();
		if (!this._tokenizers[key]) {
			return;
		}
		this._tokenizers[key].setTokens(versionId, tokens);
	}
}

registerSingleton(ITextMateService, TextMateService);
