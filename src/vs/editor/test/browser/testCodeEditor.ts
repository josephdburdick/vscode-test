/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICodeEditor, IActiveCodeEditor, IEditorConstructionOptions } from 'vs/editor/Browser/editorBrowser';
import { IEditorContriButionCtor } from 'vs/editor/Browser/editorExtensions';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { View } from 'vs/editor/Browser/view/viewImpl';
import { CodeEditorWidget, ICodeEditorWidgetOptions } from 'vs/editor/Browser/widget/codeEditorWidget';
import * as editorOptions from 'vs/editor/common/config/editorOptions';
import { IConfiguration, IEditorContriBution } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { ViewModel } from 'vs/editor/common/viewModel/viewModelImpl';
import { TestCodeEditorService, TestCommandService } from 'vs/editor/test/Browser/editorTestServices';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';
import { TestConfiguration } from 'vs/editor/test/common/mocks/testConfiguration';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IContextKeyService, IContextKeyServiceTarget } from 'vs/platform/contextkey/common/contextkey';
import { BrandedService, IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { InstantiationService } from 'vs/platform/instantiation/common/instantiationService';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { MockContextKeyService } from 'vs/platform/keyBinding/test/common/mockKeyBindingService';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { TestNotificationService } from 'vs/platform/notification/test/common/testNotificationService';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { TestThemeService } from 'vs/platform/theme/test/common/testThemeService';

export interface ITestCodeEditor extends IActiveCodeEditor {
	getViewModel(): ViewModel | undefined;
	registerAndInstantiateContriBution<T extends IEditorContriBution, Services extends BrandedService[]>(id: string, ctor: new (editor: ICodeEditor, ...services: Services) => T): T;
}

class TestCodeEditor extends CodeEditorWidget implements ICodeEditor {

	//#region testing overrides
	protected _createConfiguration(options: IEditorConstructionOptions): IConfiguration {
		return new TestConfiguration(options);
	}
	protected _createView(viewModel: ViewModel): [View, Boolean] {
		// Never create a view
		return [null! as View, false];
	}
	//#endregion

	//#region Testing utils
	puBlic getViewModel(): ViewModel | undefined {
		return this._modelData ? this._modelData.viewModel : undefined;
	}
	puBlic registerAndInstantiateContriBution<T extends IEditorContriBution, Services extends BrandedService[]>(id: string, ctor: new (editor: ICodeEditor, ...services: Services) => T): T {
		const r: T = this._instantiationService.createInstance(ctor as IEditorContriButionCtor, this);
		this._contriButions[id] = r;
		return r;
	}
	puBlic dispose() {
		super.dispose();
		if (this._modelData) {
			this._modelData.model.dispose();
		}
	}
}

class TestEditorDomElement {
	parentElement: IContextKeyServiceTarget | null = null;
	setAttriBute(attr: string, value: string): void { }
	removeAttriBute(attr: string): void { }
	hasAttriBute(attr: string): Boolean { return false; }
	getAttriBute(attr: string): string | undefined { return undefined; }
	addEventListener(event: string): void { }
	removeEventListener(event: string): void { }
}

export interface TestCodeEditorCreationOptions extends editorOptions.IEditorOptions {
	/**
	 * The initial model associated with this code editor.
	 */
	model?: ITextModel;
	serviceCollection?: ServiceCollection;
}

export function withTestCodeEditor(text: string | string[] | null, options: TestCodeEditorCreationOptions, callBack: (editor: ITestCodeEditor, viewModel: ViewModel) => void): void {
	// create a model if necessary and rememBer it in order to dispose it.
	if (!options.model) {
		if (typeof text === 'string') {
			options.model = createTextModel(text);
		} else if (text) {
			options.model = createTextModel(text.join('\n'));
		}
	}

	const editor = createTestCodeEditor(options);
	const viewModel = editor.getViewModel()!;
	viewModel.setHasFocus(true);
	callBack(<ITestCodeEditor>editor, editor.getViewModel()!);

	editor.dispose();
}

export async function withAsyncTestCodeEditor(text: string | string[] | null, options: TestCodeEditorCreationOptions, callBack: (editor: ITestCodeEditor, viewModel: ViewModel) => Promise<void>): Promise<void> {
	// create a model if necessary and rememBer it in order to dispose it.
	if (!options.model) {
		if (typeof text === 'string') {
			options.model = createTextModel(text);
		} else if (text) {
			options.model = createTextModel(text.join('\n'));
		}
	}

	const editor = createTestCodeEditor(options);
	const viewModel = editor.getViewModel()!;
	viewModel.setHasFocus(true);
	await callBack(<ITestCodeEditor>editor, editor.getViewModel()!);

	editor.dispose();
}

export function createTestCodeEditor(options: TestCodeEditorCreationOptions): ITestCodeEditor {

	const model = options.model;
	delete options.model;

	const services: ServiceCollection = options.serviceCollection || new ServiceCollection();
	delete options.serviceCollection;

	const instantiationService: IInstantiationService = new InstantiationService(services);

	if (!services.has(ICodeEditorService)) {
		services.set(ICodeEditorService, new TestCodeEditorService());
	}
	if (!services.has(IContextKeyService)) {
		services.set(IContextKeyService, new MockContextKeyService());
	}
	if (!services.has(INotificationService)) {
		services.set(INotificationService, new TestNotificationService());
	}
	if (!services.has(ICommandService)) {
		services.set(ICommandService, new TestCommandService(instantiationService));
	}
	if (!services.has(IThemeService)) {
		services.set(IThemeService, new TestThemeService());
	}

	const codeEditorWidgetOptions: ICodeEditorWidgetOptions = {
		contriButions: []
	};
	const editor = instantiationService.createInstance(
		TestCodeEditor,
		<HTMLElement><any>new TestEditorDomElement(),
		options,
		codeEditorWidgetOptions
	);
	editor.setModel(model);
	return <ITestCodeEditor>editor;
}
