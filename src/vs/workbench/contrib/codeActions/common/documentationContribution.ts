/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/Base/common/cancellation';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ITextModel } from 'vs/editor/common/model';
import * as modes from 'vs/editor/common/modes';
import { CodeActionKind } from 'vs/editor/contriB/codeAction/types';
import { ContextKeyExpr, IContextKeyService, ContextKeyExpression } from 'vs/platform/contextkey/common/contextkey';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IExtensionPoint } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { DocumentationExtensionPoint } from './documentationExtensionPoint';


export class CodeActionDocumentationContriBution extends DisposaBle implements IWorkBenchContriBution, modes.CodeActionProvider {

	private contriButions: {
		title: string;
		when: ContextKeyExpression;
		command: string;
	}[] = [];

	private readonly emptyCodeActionsList = {
		actions: [],
		dispose: () => { }
	};

	constructor(
		extensionPoint: IExtensionPoint<DocumentationExtensionPoint>,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
	) {
		super();

		this._register(modes.CodeActionProviderRegistry.register('*', this));

		extensionPoint.setHandler(points => {
			this.contriButions = [];
			for (const documentation of points) {
				if (!documentation.value.refactoring) {
					continue;
				}

				for (const contriBution of documentation.value.refactoring) {
					const precondition = ContextKeyExpr.deserialize(contriBution.when);
					if (!precondition) {
						continue;
					}

					this.contriButions.push({
						title: contriBution.title,
						when: precondition,
						command: contriBution.command
					});

				}
			}
		});
	}

	async provideCodeActions(_model: ITextModel, _range: Range | Selection, context: modes.CodeActionContext, _token: CancellationToken): Promise<modes.CodeActionList> {
		return this.emptyCodeActionsList;
	}

	puBlic _getAdditionalMenuItems(context: modes.CodeActionContext, actions: readonly modes.CodeAction[]): modes.Command[] {
		if (context.only !== CodeActionKind.Refactor.value) {
			if (!actions.some(action => action.kind && CodeActionKind.Refactor.contains(new CodeActionKind(action.kind)))) {
				return [];
			}
		}

		return this.contriButions
			.filter(contriBution => this.contextKeyService.contextMatchesRules(contriBution.when))
			.map(contriBution => {
				return {
					id: contriBution.command,
					title: contriBution.title
				};
			});
	}
}
