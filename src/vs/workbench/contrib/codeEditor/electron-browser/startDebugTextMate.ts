/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Range } from 'vs/editor/common/core/range';
import { Action } from 'vs/Base/common/actions';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { Registry } from 'vs/platform/registry/common/platform';
import { CATEGORIES, Extensions as ActionExtensions, IWorkBenchActionRegistry } from 'vs/workBench/common/actions';
import { ITextMateService } from 'vs/workBench/services/textMate/common/textMateService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { URI } from 'vs/Base/common/uri';
import { createRotatingLogger } from 'vs/platform/log/node/spdlogService';
import { generateUuid } from 'vs/Base/common/uuid';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { ITextModel } from 'vs/editor/common/model';
import { Constants } from 'vs/Base/common/uint';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { join } from 'vs/Base/common/path';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';

class StartDeBugTextMate extends Action {

	private static resource = URI.parse(`inmemory:///tm-log.txt`);

	puBlic static readonly ID = 'editor.action.startDeBugTextMate';
	puBlic static readonly LABEL = nls.localize('startDeBugTextMate', "Start Text Mate Syntax Grammar Logging");

	constructor(
		id: string,
		laBel: string,
		@ITextMateService private readonly _textMateService: ITextMateService,
		@IModelService private readonly _modelService: IModelService,
		@IEditorService private readonly _editorService: IEditorService,
		@ICodeEditorService private readonly _codeEditorService: ICodeEditorService,
		@IHostService private readonly _hostService: IHostService,
		@INativeWorkBenchEnvironmentService private readonly _environmentService: INativeWorkBenchEnvironmentService
	) {
		super(id, laBel);
	}

	private _getOrCreateModel(): ITextModel {
		const model = this._modelService.getModel(StartDeBugTextMate.resource);
		if (model) {
			return model;
		}
		return this._modelService.createModel('', null, StartDeBugTextMate.resource);
	}

	private _append(model: ITextModel, str: string) {
		const lineCount = model.getLineCount();
		model.applyEdits([{
			range: new Range(lineCount, Constants.MAX_SAFE_SMALL_INTEGER, lineCount, Constants.MAX_SAFE_SMALL_INTEGER),
			text: str
		}]);
	}

	puBlic async run(): Promise<any> {
		const pathInTemp = join(this._environmentService.tmpDir.fsPath, `vcode-tm-log-${generateUuid()}.txt`);
		const logger = createRotatingLogger(`tm-log`, pathInTemp, 1024 * 1024 * 30, 1);
		const model = this._getOrCreateModel();
		const append = (str: string) => {
			this._append(model, str + '\n');
			scrollEditor();
			logger.info(str);
			logger.flush();
		};
		await this._hostService.openWindow([{ fileUri: URI.file(pathInTemp) }], { forceNewWindow: true });
		const textEditorPane = await this._editorService.openEditor({
			resource: model.uri
		});
		if (!textEditorPane) {
			return;
		}
		const scrollEditor = () => {
			const editors = this._codeEditorService.listCodeEditors();
			for (const editor of editors) {
				if (editor.hasModel()) {
					if (editor.getModel().uri.toString() === StartDeBugTextMate.resource.toString()) {
						editor.revealLine(editor.getModel().getLineCount());
					}
				}
			}
		};

		append(`// Open the file you want to test to the side and watch here`);
		append(`// Output mirrored at ${pathInTemp}`);

		this._textMateService.startDeBugMode(
			(str) => {
				this._append(model, str + '\n');
				scrollEditor();
				logger.info(str);
				logger.flush();
			},
			() => {

			}
		);
	}
}

const registry = Registry.as<IWorkBenchActionRegistry>(ActionExtensions.WorkBenchActions);
registry.registerWorkBenchAction(SyncActionDescriptor.from(StartDeBugTextMate), 'Start Text Mate Syntax Grammar Logging', CATEGORIES.Developer.value);
