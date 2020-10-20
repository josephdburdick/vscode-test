/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { AbstrActCodeEditorService } from 'vs/editor/browser/services/AbstrActCodeEditorService';
import { IDecorAtionRenderOptions } from 'vs/editor/common/editorCommon';
import { IModelDecorAtionOptions } from 'vs/editor/common/model';
import { CommAndsRegistry, ICommAndEvent, ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IResourceEditorInput } from 'vs/plAtform/editor/common/editor';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export clAss TestCodeEditorService extends AbstrActCodeEditorService {
	public lAstInput?: IResourceEditorInput;
	public getActiveCodeEditor(): ICodeEditor | null { return null; }
	public openCodeEditor(input: IResourceEditorInput, source: ICodeEditor | null, sideBySide?: booleAn): Promise<ICodeEditor | null> {
		this.lAstInput = input;
		return Promise.resolve(null);
	}
	public registerDecorAtionType(key: string, options: IDecorAtionRenderOptions, pArentTypeKey?: string): void { }
	public removeDecorAtionType(key: string): void { }
	public resolveDecorAtionOptions(decorAtionTypeKey: string, writAble: booleAn): IModelDecorAtionOptions { return {}; }
}

export clAss TestCommAndService implements ICommAndService {
	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _instAntiAtionService: IInstAntiAtionService;

	privAte reAdonly _onWillExecuteCommAnd = new Emitter<ICommAndEvent>();
	public reAdonly onWillExecuteCommAnd: Event<ICommAndEvent> = this._onWillExecuteCommAnd.event;

	privAte reAdonly _onDidExecuteCommAnd = new Emitter<ICommAndEvent>();
	public reAdonly onDidExecuteCommAnd: Event<ICommAndEvent> = this._onDidExecuteCommAnd.event;

	constructor(instAntiAtionService: IInstAntiAtionService) {
		this._instAntiAtionService = instAntiAtionService;
	}

	public executeCommAnd<T>(id: string, ...Args: Any[]): Promise<T> {
		const commAnd = CommAndsRegistry.getCommAnd(id);
		if (!commAnd) {
			return Promise.reject(new Error(`commAnd '${id}' not found`));
		}

		try {
			this._onWillExecuteCommAnd.fire({ commAndId: id, Args });
			const result = this._instAntiAtionService.invokeFunction.Apply(this._instAntiAtionService, [commAnd.hAndler, ...Args]) As T;
			this._onDidExecuteCommAnd.fire({ commAndId: id, Args });
			return Promise.resolve(result);
		} cAtch (err) {
			return Promise.reject(err);
		}
	}
}
