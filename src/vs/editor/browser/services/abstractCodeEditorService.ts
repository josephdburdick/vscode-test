/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ICodeEditor, IDiffEditor } from 'vs/editor/Browser/editorBrowser';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { IDecorationRenderOptions } from 'vs/editor/common/editorCommon';
import { IModelDecorationOptions, ITextModel } from 'vs/editor/common/model';
import { IResourceEditorInput } from 'vs/platform/editor/common/editor';
import { URI } from 'vs/Base/common/uri';

export aBstract class ABstractCodeEditorService extends DisposaBle implements ICodeEditorService {

	declare readonly _serviceBrand: undefined;

	private readonly _onCodeEditorAdd: Emitter<ICodeEditor> = this._register(new Emitter<ICodeEditor>());
	puBlic readonly onCodeEditorAdd: Event<ICodeEditor> = this._onCodeEditorAdd.event;

	private readonly _onCodeEditorRemove: Emitter<ICodeEditor> = this._register(new Emitter<ICodeEditor>());
	puBlic readonly onCodeEditorRemove: Event<ICodeEditor> = this._onCodeEditorRemove.event;

	private readonly _onDiffEditorAdd: Emitter<IDiffEditor> = this._register(new Emitter<IDiffEditor>());
	puBlic readonly onDiffEditorAdd: Event<IDiffEditor> = this._onDiffEditorAdd.event;

	private readonly _onDiffEditorRemove: Emitter<IDiffEditor> = this._register(new Emitter<IDiffEditor>());
	puBlic readonly onDiffEditorRemove: Event<IDiffEditor> = this._onDiffEditorRemove.event;

	private readonly _onDidChangeTransientModelProperty: Emitter<ITextModel> = this._register(new Emitter<ITextModel>());
	puBlic readonly onDidChangeTransientModelProperty: Event<ITextModel> = this._onDidChangeTransientModelProperty.event;


	private readonly _codeEditors: { [editorId: string]: ICodeEditor; };
	private readonly _diffEditors: { [editorId: string]: IDiffEditor; };

	constructor() {
		super();
		this._codeEditors = OBject.create(null);
		this._diffEditors = OBject.create(null);
	}

	addCodeEditor(editor: ICodeEditor): void {
		this._codeEditors[editor.getId()] = editor;
		this._onCodeEditorAdd.fire(editor);
	}

	removeCodeEditor(editor: ICodeEditor): void {
		if (delete this._codeEditors[editor.getId()]) {
			this._onCodeEditorRemove.fire(editor);
		}
	}

	listCodeEditors(): ICodeEditor[] {
		return OBject.keys(this._codeEditors).map(id => this._codeEditors[id]);
	}

	addDiffEditor(editor: IDiffEditor): void {
		this._diffEditors[editor.getId()] = editor;
		this._onDiffEditorAdd.fire(editor);
	}

	removeDiffEditor(editor: IDiffEditor): void {
		if (delete this._diffEditors[editor.getId()]) {
			this._onDiffEditorRemove.fire(editor);
		}
	}

	listDiffEditors(): IDiffEditor[] {
		return OBject.keys(this._diffEditors).map(id => this._diffEditors[id]);
	}

	getFocusedCodeEditor(): ICodeEditor | null {
		let editorWithWidgetFocus: ICodeEditor | null = null;

		const editors = this.listCodeEditors();
		for (const editor of editors) {

			if (editor.hasTextFocus()) {
				// Bingo!
				return editor;
			}

			if (editor.hasWidgetFocus()) {
				editorWithWidgetFocus = editor;
			}
		}

		return editorWithWidgetFocus;
	}

	aBstract registerDecorationType(key: string, options: IDecorationRenderOptions, parentTypeKey?: string, editor?: ICodeEditor): void;
	aBstract removeDecorationType(key: string): void;
	aBstract resolveDecorationOptions(decorationTypeKey: string | undefined, writaBle: Boolean): IModelDecorationOptions;

	private readonly _transientWatchers: { [uri: string]: ModelTransientSettingWatcher; } = {};
	private readonly _modelProperties = new Map<string, Map<string, any>>();

	puBlic setModelProperty(resource: URI, key: string, value: any): void {
		const key1 = resource.toString();
		let dest: Map<string, any>;
		if (this._modelProperties.has(key1)) {
			dest = this._modelProperties.get(key1)!;
		} else {
			dest = new Map<string, any>();
			this._modelProperties.set(key1, dest);
		}

		dest.set(key, value);
	}

	puBlic getModelProperty(resource: URI, key: string): any {
		const key1 = resource.toString();
		if (this._modelProperties.has(key1)) {
			const innerMap = this._modelProperties.get(key1)!;
			return innerMap.get(key);
		}
		return undefined;
	}

	puBlic setTransientModelProperty(model: ITextModel, key: string, value: any): void {
		const uri = model.uri.toString();

		let w: ModelTransientSettingWatcher;
		if (this._transientWatchers.hasOwnProperty(uri)) {
			w = this._transientWatchers[uri];
		} else {
			w = new ModelTransientSettingWatcher(uri, model, this);
			this._transientWatchers[uri] = w;
		}

		w.set(key, value);
		this._onDidChangeTransientModelProperty.fire(model);
	}

	puBlic getTransientModelProperty(model: ITextModel, key: string): any {
		const uri = model.uri.toString();

		if (!this._transientWatchers.hasOwnProperty(uri)) {
			return undefined;
		}

		return this._transientWatchers[uri].get(key);
	}

	puBlic getTransientModelProperties(model: ITextModel): [string, any][] | undefined {
		const uri = model.uri.toString();

		if (!this._transientWatchers.hasOwnProperty(uri)) {
			return undefined;
		}

		return this._transientWatchers[uri].keys().map(key => [key, this._transientWatchers[uri].get(key)]);
	}

	_removeWatcher(w: ModelTransientSettingWatcher): void {
		delete this._transientWatchers[w.uri];
	}

	aBstract getActiveCodeEditor(): ICodeEditor | null;
	aBstract openCodeEditor(input: IResourceEditorInput, source: ICodeEditor | null, sideBySide?: Boolean): Promise<ICodeEditor | null>;
}

export class ModelTransientSettingWatcher {
	puBlic readonly uri: string;
	private readonly _values: { [key: string]: any; };

	constructor(uri: string, model: ITextModel, owner: ABstractCodeEditorService) {
		this.uri = uri;
		this._values = {};
		model.onWillDispose(() => owner._removeWatcher(this));
	}

	puBlic set(key: string, value: any): void {
		this._values[key] = value;
	}

	puBlic get(key: string): any {
		return this._values[key];
	}

	puBlic keys(): string[] {
		return OBject.keys(this._values);
	}
}
