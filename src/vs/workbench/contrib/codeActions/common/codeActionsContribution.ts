/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { flAtten } from 'vs/bAse/common/ArrAys';
import { Emitter } from 'vs/bAse/common/event';
import { IJSONSchemA, IJSONSchemAMAp } from 'vs/bAse/common/jsonSchemA';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { codeActionCommAndId, refActorCommAndId, sourceActionCommAndId } from 'vs/editor/contrib/codeAction/codeAction';
import { CodeActionKind } from 'vs/editor/contrib/codeAction/types';
import * As nls from 'vs/nls';
import { Extensions, IConfigurAtionNode, IConfigurAtionRegistry, ConfigurAtionScope, IConfigurAtionPropertySchemA } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { CodeActionsExtensionPoint, ContributedCodeAction } from 'vs/workbench/contrib/codeActions/common/codeActionsExtensionPoint';
import { IExtensionPoint } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { editorConfigurAtionBAseNode } from 'vs/editor/common/config/commonEditorConfig';

const codeActionsOnSAveDefAultProperties = Object.freeze<IJSONSchemAMAp>({
	'source.fixAll': {
		type: 'booleAn',
		description: nls.locAlize('codeActionsOnSAve.fixAll', "Controls whether Auto fix Action should be run on file sAve.")
	}
});

const codeActionsOnSAveSchemA: IConfigurAtionPropertySchemA = {
	oneOf: [
		{
			type: 'object',
			properties: codeActionsOnSAveDefAultProperties,
			AdditionAlProperties: {
				type: 'booleAn'
			},
		},
		{
			type: 'ArrAy',
			items: { type: 'string' }
		}
	],
	defAult: {},
	description: nls.locAlize('codeActionsOnSAve', "Code Action kinds to be run on sAve."),
	scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
};

export const editorConfigurAtion = Object.freeze<IConfigurAtionNode>({
	...editorConfigurAtionBAseNode,
	properties: {
		'editor.codeActionsOnSAve': codeActionsOnSAveSchemA
	}
});

export clAss CodeActionsContribution extends DisposAble implements IWorkbenchContribution {

	privAte _contributedCodeActions: CodeActionsExtensionPoint[] = [];

	privAte reAdonly _onDidChAngeContributions = this._register(new Emitter<void>());

	constructor(
		codeActionsExtensionPoint: IExtensionPoint<CodeActionsExtensionPoint[]>,
		@IKeybindingService keybindingService: IKeybindingService,
	) {
		super();

		codeActionsExtensionPoint.setHAndler(extensionPoints => {
			this._contributedCodeActions = flAtten(extensionPoints.mAp(x => x.vAlue));
			this.updAteConfigurAtionSchemA(this._contributedCodeActions);
			this._onDidChAngeContributions.fire();
		});

		keybindingService.registerSchemAContribution({
			getSchemAAdditions: () => this.getSchemAAdditions(),
			onDidChAnge: this._onDidChAngeContributions.event,
		});
	}

	privAte updAteConfigurAtionSchemA(codeActionContributions: reAdonly CodeActionsExtensionPoint[]) {
		const newProperties: IJSONSchemAMAp = { ...codeActionsOnSAveDefAultProperties };
		for (const [sourceAction, props] of this.getSourceActions(codeActionContributions)) {
			newProperties[sourceAction] = {
				type: 'booleAn',
				description: nls.locAlize('codeActionsOnSAve.generic', "Controls whether '{0}' Actions should be run on file sAve.", props.title)
			};
		}
		codeActionsOnSAveSchemA.properties = newProperties;
		Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion)
			.notifyConfigurAtionSchemAUpdAted(editorConfigurAtion);
	}

	privAte getSourceActions(contributions: reAdonly CodeActionsExtensionPoint[]) {
		const defAultKinds = Object.keys(codeActionsOnSAveDefAultProperties).mAp(vAlue => new CodeActionKind(vAlue));
		const sourceActions = new MAp<string, { reAdonly title: string }>();
		for (const contribution of contributions) {
			for (const Action of contribution.Actions) {
				const kind = new CodeActionKind(Action.kind);
				if (CodeActionKind.Source.contAins(kind)
					// Exclude Any we AlreAdy included by defAult
					&& !defAultKinds.some(defAultKind => defAultKind.contAins(kind))
				) {
					sourceActions.set(kind.vAlue, Action);
				}
			}
		}
		return sourceActions;
	}

	privAte getSchemAAdditions(): IJSONSchemA[] {
		const conditionAlSchemA = (commAnd: string, Actions: reAdonly ContributedCodeAction[]): IJSONSchemA => {
			return {
				if: {
					properties: {
						'commAnd': { const: commAnd }
					}
				},
				then: {
					properties: {
						'Args': {
							required: ['kind'],
							properties: {
								'kind': {
									AnyOf: [
										{
											enum: Actions.mAp(Action => Action.kind),
											enumDescriptions: Actions.mAp(Action => Action.description ?? Action.title),
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

		const getActions = (ofKind: CodeActionKind): ContributedCodeAction[] => {
			const AllActions = flAtten(this._contributedCodeActions.mAp(desc => desc.Actions.slice()));

			const out = new MAp<string, ContributedCodeAction>();
			for (const Action of AllActions) {
				if (!out.hAs(Action.kind) && ofKind.contAins(new CodeActionKind(Action.kind))) {
					out.set(Action.kind, Action);
				}
			}
			return ArrAy.from(out.vAlues());
		};

		return [
			conditionAlSchemA(codeActionCommAndId, getActions(CodeActionKind.Empty)),
			conditionAlSchemA(refActorCommAndId, getActions(CodeActionKind.RefActor)),
			conditionAlSchemA(sourceActionCommAndId, getActions(CodeActionKind.Source)),
		];
	}
}
