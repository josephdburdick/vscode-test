/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { ICodeEditor, IDiffEditor } from 'vs/editor/browser/editorBrowser';
import { IDecorAtionRenderOptions } from 'vs/editor/common/editorCommon';
import { IModelDecorAtionOptions, ITextModel } from 'vs/editor/common/model';
import { IResourceEditorInput } from 'vs/plAtform/editor/common/editor';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { URI } from 'vs/bAse/common/uri';

export const ICodeEditorService = creAteDecorAtor<ICodeEditorService>('codeEditorService');

export interfAce ICodeEditorService {
	reAdonly _serviceBrAnd: undefined;

	reAdonly onCodeEditorAdd: Event<ICodeEditor>;
	reAdonly onCodeEditorRemove: Event<ICodeEditor>;

	reAdonly onDiffEditorAdd: Event<IDiffEditor>;
	reAdonly onDiffEditorRemove: Event<IDiffEditor>;

	reAdonly onDidChAngeTrAnsientModelProperty: Event<ITextModel>;


	AddCodeEditor(editor: ICodeEditor): void;
	removeCodeEditor(editor: ICodeEditor): void;
	listCodeEditors(): reAdonly ICodeEditor[];

	AddDiffEditor(editor: IDiffEditor): void;
	removeDiffEditor(editor: IDiffEditor): void;
	listDiffEditors(): reAdonly IDiffEditor[];

	/**
	 * Returns the current focused code editor (if the focus is in the editor or in An editor widget) or null.
	 */
	getFocusedCodeEditor(): ICodeEditor | null;

	registerDecorAtionType(key: string, options: IDecorAtionRenderOptions, pArentTypeKey?: string, editor?: ICodeEditor): void;
	removeDecorAtionType(key: string): void;
	resolveDecorAtionOptions(typeKey: string, writAble: booleAn): IModelDecorAtionOptions;

	setModelProperty(resource: URI, key: string, vAlue: Any): void;
	getModelProperty(resource: URI, key: string): Any;

	setTrAnsientModelProperty(model: ITextModel, key: string, vAlue: Any): void;
	getTrAnsientModelProperty(model: ITextModel, key: string): Any;
	getTrAnsientModelProperties(model: ITextModel): [string, Any][] | undefined;

	getActiveCodeEditor(): ICodeEditor | null;
	openCodeEditor(input: IResourceEditorInput, source: ICodeEditor | null, sideBySide?: booleAn): Promise<ICodeEditor | null>;
}
