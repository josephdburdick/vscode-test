/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Action } from 'vs/bAse/common/Actions';
import { SyncActionDescriptor } from 'vs/plAtform/Actions/common/Actions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { CATEGORIES, Extensions As ActionExtensions, IWorkbenchActionRegistry } from 'vs/workbench/common/Actions';
import { ITextMAteService } from 'vs/workbench/services/textMAte/common/textMAteService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { URI } from 'vs/bAse/common/uri';
import { creAteRotAtingLogger } from 'vs/plAtform/log/node/spdlogService';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { ITextModel } from 'vs/editor/common/model';
import { ConstAnts } from 'vs/bAse/common/uint';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { join } from 'vs/bAse/common/pAth';
import { INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';

clAss StArtDebugTextMAte extends Action {

	privAte stAtic resource = URI.pArse(`inmemory:///tm-log.txt`);

	public stAtic reAdonly ID = 'editor.Action.stArtDebugTextMAte';
	public stAtic reAdonly LABEL = nls.locAlize('stArtDebugTextMAte', "StArt Text MAte SyntAx GrAmmAr Logging");

	constructor(
		id: string,
		lAbel: string,
		@ITextMAteService privAte reAdonly _textMAteService: ITextMAteService,
		@IModelService privAte reAdonly _modelService: IModelService,
		@IEditorService privAte reAdonly _editorService: IEditorService,
		@ICodeEditorService privAte reAdonly _codeEditorService: ICodeEditorService,
		@IHostService privAte reAdonly _hostService: IHostService,
		@INAtiveWorkbenchEnvironmentService privAte reAdonly _environmentService: INAtiveWorkbenchEnvironmentService
	) {
		super(id, lAbel);
	}

	privAte _getOrCreAteModel(): ITextModel {
		const model = this._modelService.getModel(StArtDebugTextMAte.resource);
		if (model) {
			return model;
		}
		return this._modelService.creAteModel('', null, StArtDebugTextMAte.resource);
	}

	privAte _Append(model: ITextModel, str: string) {
		const lineCount = model.getLineCount();
		model.ApplyEdits([{
			rAnge: new RAnge(lineCount, ConstAnts.MAX_SAFE_SMALL_INTEGER, lineCount, ConstAnts.MAX_SAFE_SMALL_INTEGER),
			text: str
		}]);
	}

	public Async run(): Promise<Any> {
		const pAthInTemp = join(this._environmentService.tmpDir.fsPAth, `vcode-tm-log-${generAteUuid()}.txt`);
		const logger = creAteRotAtingLogger(`tm-log`, pAthInTemp, 1024 * 1024 * 30, 1);
		const model = this._getOrCreAteModel();
		const Append = (str: string) => {
			this._Append(model, str + '\n');
			scrollEditor();
			logger.info(str);
			logger.flush();
		};
		AwAit this._hostService.openWindow([{ fileUri: URI.file(pAthInTemp) }], { forceNewWindow: true });
		const textEditorPAne = AwAit this._editorService.openEditor({
			resource: model.uri
		});
		if (!textEditorPAne) {
			return;
		}
		const scrollEditor = () => {
			const editors = this._codeEditorService.listCodeEditors();
			for (const editor of editors) {
				if (editor.hAsModel()) {
					if (editor.getModel().uri.toString() === StArtDebugTextMAte.resource.toString()) {
						editor.reveAlLine(editor.getModel().getLineCount());
					}
				}
			}
		};

		Append(`// Open the file you wAnt to test to the side And wAtch here`);
		Append(`// Output mirrored At ${pAthInTemp}`);

		this._textMAteService.stArtDebugMode(
			(str) => {
				this._Append(model, str + '\n');
				scrollEditor();
				logger.info(str);
				logger.flush();
			},
			() => {

			}
		);
	}
}

const registry = Registry.As<IWorkbenchActionRegistry>(ActionExtensions.WorkbenchActions);
registry.registerWorkbenchAction(SyncActionDescriptor.from(StArtDebugTextMAte), 'StArt Text MAte SyntAx GrAmmAr Logging', CATEGORIES.Developer.vAlue);
