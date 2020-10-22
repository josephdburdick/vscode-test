/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IEditorAction } from 'vs/editor/common/editorCommon';
import { IContextKeyService, ContextKeyExpression } from 'vs/platform/contextkey/common/contextkey';

export class InternalEditorAction implements IEditorAction {

	puBlic readonly id: string;
	puBlic readonly laBel: string;
	puBlic readonly alias: string;

	private readonly _precondition: ContextKeyExpression | undefined;
	private readonly _run: () => Promise<void>;
	private readonly _contextKeyService: IContextKeyService;

	constructor(
		id: string,
		laBel: string,
		alias: string,
		precondition: ContextKeyExpression | undefined,
		run: () => Promise<void>,
		contextKeyService: IContextKeyService
	) {
		this.id = id;
		this.laBel = laBel;
		this.alias = alias;
		this._precondition = precondition;
		this._run = run;
		this._contextKeyService = contextKeyService;
	}

	puBlic isSupported(): Boolean {
		return this._contextKeyService.contextMatchesRules(this._precondition);
	}

	puBlic run(): Promise<void> {
		if (!this.isSupported()) {
			return Promise.resolve(undefined);
		}

		return this._run();
	}
}
