/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { flatten } from 'vs/Base/common/arrays';
import { Emitter } from 'vs/Base/common/event';
import { IJSONSchema, IJSONSchemaMap } from 'vs/Base/common/jsonSchema';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { codeActionCommandId, refactorCommandId, sourceActionCommandId } from 'vs/editor/contriB/codeAction/codeAction';
import { CodeActionKind } from 'vs/editor/contriB/codeAction/types';
import * as nls from 'vs/nls';
import { Extensions, IConfigurationNode, IConfigurationRegistry, ConfigurationScope, IConfigurationPropertySchema } from 'vs/platform/configuration/common/configurationRegistry';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { CodeActionsExtensionPoint, ContriButedCodeAction } from 'vs/workBench/contriB/codeActions/common/codeActionsExtensionPoint';
import { IExtensionPoint } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { editorConfigurationBaseNode } from 'vs/editor/common/config/commonEditorConfig';

const codeActionsOnSaveDefaultProperties = OBject.freeze<IJSONSchemaMap>({
	'source.fixAll': {
		type: 'Boolean',
		description: nls.localize('codeActionsOnSave.fixAll', "Controls whether auto fix action should Be run on file save.")
	}
});

const codeActionsOnSaveSchema: IConfigurationPropertySchema = {
	oneOf: [
		{
			type: 'oBject',
			properties: codeActionsOnSaveDefaultProperties,
			additionalProperties: {
				type: 'Boolean'
			},
		},
		{
			type: 'array',
			items: { type: 'string' }
		}
	],
	default: {},
	description: nls.localize('codeActionsOnSave', "Code action kinds to Be run on save."),
	scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
};

export const editorConfiguration = OBject.freeze<IConfigurationNode>({
	...editorConfigurationBaseNode,
	properties: {
		'editor.codeActionsOnSave': codeActionsOnSaveSchema
	}
});

export class CodeActionsContriBution extends DisposaBle implements IWorkBenchContriBution {

	private _contriButedCodeActions: CodeActionsExtensionPoint[] = [];

	private readonly _onDidChangeContriButions = this._register(new Emitter<void>());

	constructor(
		codeActionsExtensionPoint: IExtensionPoint<CodeActionsExtensionPoint[]>,
		@IKeyBindingService keyBindingService: IKeyBindingService,
	) {
		super();

		codeActionsExtensionPoint.setHandler(extensionPoints => {
			this._contriButedCodeActions = flatten(extensionPoints.map(x => x.value));
			this.updateConfigurationSchema(this._contriButedCodeActions);
			this._onDidChangeContriButions.fire();
		});

		keyBindingService.registerSchemaContriBution({
			getSchemaAdditions: () => this.getSchemaAdditions(),
			onDidChange: this._onDidChangeContriButions.event,
		});
	}

	private updateConfigurationSchema(codeActionContriButions: readonly CodeActionsExtensionPoint[]) {
		const newProperties: IJSONSchemaMap = { ...codeActionsOnSaveDefaultProperties };
		for (const [sourceAction, props] of this.getSourceActions(codeActionContriButions)) {
			newProperties[sourceAction] = {
				type: 'Boolean',
				description: nls.localize('codeActionsOnSave.generic', "Controls whether '{0}' actions should Be run on file save.", props.title)
			};
		}
		codeActionsOnSaveSchema.properties = newProperties;
		Registry.as<IConfigurationRegistry>(Extensions.Configuration)
			.notifyConfigurationSchemaUpdated(editorConfiguration);
	}

	private getSourceActions(contriButions: readonly CodeActionsExtensionPoint[]) {
		const defaultKinds = OBject.keys(codeActionsOnSaveDefaultProperties).map(value => new CodeActionKind(value));
		const sourceActions = new Map<string, { readonly title: string }>();
		for (const contriBution of contriButions) {
			for (const action of contriBution.actions) {
				const kind = new CodeActionKind(action.kind);
				if (CodeActionKind.Source.contains(kind)
					// Exclude any we already included By default
					&& !defaultKinds.some(defaultKind => defaultKind.contains(kind))
				) {
					sourceActions.set(kind.value, action);
				}
			}
		}
		return sourceActions;
	}

	private getSchemaAdditions(): IJSONSchema[] {
		const conditionalSchema = (command: string, actions: readonly ContriButedCodeAction[]): IJSONSchema => {
			return {
				if: {
					properties: {
						'command': { const: command }
					}
				},
				then: {
					properties: {
						'args': {
							required: ['kind'],
							properties: {
								'kind': {
									anyOf: [
										{
											enum: actions.map(action => action.kind),
											enumDescriptions: actions.map(action => action.description ?? action.title),
										},
										{ type: 'string' },
									]
								}
							}
						}
					}
				}
			};
		};

		const getActions = (ofKind: CodeActionKind): ContriButedCodeAction[] => {
			const allActions = flatten(this._contriButedCodeActions.map(desc => desc.actions.slice()));

			const out = new Map<string, ContriButedCodeAction>();
			for (const action of allActions) {
				if (!out.has(action.kind) && ofKind.contains(new CodeActionKind(action.kind))) {
					out.set(action.kind, action);
				}
			}
			return Array.from(out.values());
		};

		return [
			conditionalSchema(codeActionCommandId, getActions(CodeActionKind.Empty)),
			conditionalSchema(refactorCommandId, getActions(CodeActionKind.Refactor)),
			conditionalSchema(sourceActionCommandId, getActions(CodeActionKind.Source)),
		];
	}
}
