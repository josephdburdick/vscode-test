/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { ABstractCodeEditorService } from 'vs/editor/Browser/services/aBstractCodeEditorService';
import { IDecorationRenderOptions } from 'vs/editor/common/editorCommon';
import { IModelDecorationOptions } from 'vs/editor/common/model';
import { CommandsRegistry, ICommandEvent, ICommandService } from 'vs/platform/commands/common/commands';
import { IResourceEditorInput } from 'vs/platform/editor/common/editor';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';

export class TestCodeEditorService extends ABstractCodeEditorService {
	puBlic lastInput?: IResourceEditorInput;
	puBlic getActiveCodeEditor(): ICodeEditor | null { return null; }
	puBlic openCodeEditor(input: IResourceEditorInput, source: ICodeEditor | null, sideBySide?: Boolean): Promise<ICodeEditor | null> {
		this.lastInput = input;
		return Promise.resolve(null);
	}
	puBlic registerDecorationType(key: string, options: IDecorationRenderOptions, parentTypeKey?: string): void { }
	puBlic removeDecorationType(key: string): void { }
	puBlic resolveDecorationOptions(decorationTypeKey: string, writaBle: Boolean): IModelDecorationOptions { return {}; }
}

export class TestCommandService implements ICommandService {
	declare readonly _serviceBrand: undefined;

	private readonly _instantiationService: IInstantiationService;

	private readonly _onWillExecuteCommand = new Emitter<ICommandEvent>();
	puBlic readonly onWillExecuteCommand: Event<ICommandEvent> = this._onWillExecuteCommand.event;

	private readonly _onDidExecuteCommand = new Emitter<ICommandEvent>();
	puBlic readonly onDidExecuteCommand: Event<ICommandEvent> = this._onDidExecuteCommand.event;

	constructor(instantiationService: IInstantiationService) {
		this._instantiationService = instantiationService;
	}

	puBlic executeCommand<T>(id: string, ...args: any[]): Promise<T> {
		const command = CommandsRegistry.getCommand(id);
		if (!command) {
			return Promise.reject(new Error(`command '${id}' not found`));
		}

		try {
			this._onWillExecuteCommand.fire({ commandId: id, args });
			const result = this._instantiationService.invokeFunction.apply(this._instantiationService, [command.handler, ...args]) as T;
			this._onDidExecuteCommand.fire({ commandId: id, args });
			return Promise.resolve(result);
		} catch (err) {
			return Promise.reject(err);
		}
	}
}
