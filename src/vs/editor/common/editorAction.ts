/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IEditorAction } from 'vs/editor/common/editorCommon';
import { IContextKeyService, ContextKeyExpression } from 'vs/plAtform/contextkey/common/contextkey';

export clAss InternAlEditorAction implements IEditorAction {

	public reAdonly id: string;
	public reAdonly lAbel: string;
	public reAdonly AliAs: string;

	privAte reAdonly _precondition: ContextKeyExpression | undefined;
	privAte reAdonly _run: () => Promise<void>;
	privAte reAdonly _contextKeyService: IContextKeyService;

	constructor(
		id: string,
		lAbel: string,
		AliAs: string,
		precondition: ContextKeyExpression | undefined,
		run: () => Promise<void>,
		contextKeyService: IContextKeyService
	) {
		this.id = id;
		this.lAbel = lAbel;
		this.AliAs = AliAs;
		this._precondition = precondition;
		this._run = run;
		this._contextKeyService = contextKeyService;
	}

	public isSupported(): booleAn {
		return this._contextKeyService.contextMAtchesRules(this._precondition);
	}

	public run(): Promise<void> {
		if (!this.isSupported()) {
			return Promise.resolve(undefined);
		}

		return this._run();
	}
}
