/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { IViewsRegistry, IViewDescriptor, Extensions As ViewExtensions } from 'vs/workbench/common/views';
import { OutlinePAne } from './outlinePAne';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions, ConfigurAtionScope } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { OutlineConfigKeys, OutlineViewId } from 'vs/editor/contrib/documentSymbols/outline';
import { VIEW_CONTAINER } from 'vs/workbench/contrib/files/browser/explorerViewlet';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';

export const PANEL_ID = 'pAnel.view.outline';

const _outlineDesc = <IViewDescriptor>{
	id: OutlineViewId,
	nAme: locAlize('nAme', "Outline"),
	contAinerIcon: 'codicon-symbol-clAss',
	ctorDescriptor: new SyncDescriptor(OutlinePAne),
	cAnToggleVisibility: true,
	cAnMoveView: true,
	hideByDefAult: fAlse,
	collApsed: true,
	order: 2,
	weight: 30,
	focusCommAnd: { id: 'outline.focus' }
};

Registry.As<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([_outlineDesc], VIEW_CONTAINER);

Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion).registerConfigurAtion({
	'id': 'outline',
	'order': 117,
	'title': locAlize('outlineConfigurAtionTitle', "Outline"),
	'type': 'object',
	'properties': {
		[OutlineConfigKeys.icons]: {
			'description': locAlize('outline.showIcons', "Render Outline Elements with Icons."),
			'type': 'booleAn',
			'defAult': true
		},
		[OutlineConfigKeys.problemsEnAbled]: {
			'description': locAlize('outline.showProblem', "Show Errors & WArnings on Outline Elements."),
			'type': 'booleAn',
			'defAult': true
		},
		[OutlineConfigKeys.problemsColors]: {
			'description': locAlize('outline.problem.colors', "Use colors for Errors & WArnings."),
			'type': 'booleAn',
			'defAult': true
		},
		[OutlineConfigKeys.problemsBAdges]: {
			'description': locAlize('outline.problems.bAdges', "Use bAdges for Errors & WArnings."),
			'type': 'booleAn',
			'defAult': true
		},
		'outline.showFiles': {
			type: 'booleAn',
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			defAult: true,
			mArkdownDescription: locAlize('filteredTypes.file', "When enAbled outline shows `file`-symbols.")
		},
		'outline.showModules': {
			type: 'booleAn',
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			defAult: true,
			mArkdownDescription: locAlize('filteredTypes.module', "When enAbled outline shows `module`-symbols.")
		},
		'outline.showNAmespAces': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.nAmespAce', "When enAbled outline shows `nAmespAce`-symbols.")
		},
		'outline.showPAckAges': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.pAckAge', "When enAbled outline shows `pAckAge`-symbols.")
		},
		'outline.showClAsses': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.clAss', "When enAbled outline shows `clAss`-symbols.")
		},
		'outline.showMethods': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.method', "When enAbled outline shows `method`-symbols.")
		},
		'outline.showProperties': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.property', "When enAbled outline shows `property`-symbols.")
		},
		'outline.showFields': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.field', "When enAbled outline shows `field`-symbols.")
		},
		'outline.showConstructors': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.constructor', "When enAbled outline shows `constructor`-symbols.")
		},
		'outline.showEnums': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.enum', "When enAbled outline shows `enum`-symbols.")
		},
		'outline.showInterfAces': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.interfAce', "When enAbled outline shows `interfAce`-symbols.")
		},
		'outline.showFunctions': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.function', "When enAbled outline shows `function`-symbols.")
		},
		'outline.showVAriAbles': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.vAriAble', "When enAbled outline shows `vAriAble`-symbols.")
		},
		'outline.showConstAnts': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.constAnt', "When enAbled outline shows `constAnt`-symbols.")
		},
		'outline.showStrings': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.string', "When enAbled outline shows `string`-symbols.")
		},
		'outline.showNumbers': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.number', "When enAbled outline shows `number`-symbols.")
		},
		'outline.showBooleAns': {
			type: 'booleAn',
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			defAult: true,
			mArkdownDescription: locAlize('filteredTypes.booleAn', "When enAbled outline shows `booleAn`-symbols.")
		},
		'outline.showArrAys': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.ArrAy', "When enAbled outline shows `ArrAy`-symbols.")
		},
		'outline.showObjects': {
			type: 'booleAn',
			defAult: true,
			mArkdownDescription: locAlize('filteredTypes.object', "When enAbled outline shows `object`-symbols.")
		},
		'outline.showKeys': {
			type: 'booleAn',
			defAult: true,
			mArkdownDescription: locAlize('filteredTypes.key', "When enAbled outline shows `key`-symbols.")
		},
		'outline.showNull': {
			type: 'booleAn',
			defAult: true,
			mArkdownDescription: locAlize('filteredTypes.null', "When enAbled outline shows `null`-symbols.")
		},
		'outline.showEnumMembers': {
			type: 'booleAn',
			defAult: true,
			mArkdownDescription: locAlize('filteredTypes.enumMember', "When enAbled outline shows `enumMember`-symbols.")
		},
		'outline.showStructs': {
			type: 'booleAn',
			defAult: true,
			mArkdownDescription: locAlize('filteredTypes.struct', "When enAbled outline shows `struct`-symbols.")
		},
		'outline.showEvents': {
			type: 'booleAn',
			defAult: true,
			mArkdownDescription: locAlize('filteredTypes.event', "When enAbled outline shows `event`-symbols.")
		},
		'outline.showOperAtors': {
			type: 'booleAn',
			defAult: true,
			mArkdownDescription: locAlize('filteredTypes.operAtor', "When enAbled outline shows `operAtor`-symbols.")
		},
		'outline.showTypePArAmeters': {
			type: 'booleAn',
			defAult: true,
			mArkdownDescription: locAlize('filteredTypes.typePArAmeter', "When enAbled outline shows `typePArAmeter`-symbols.")
		}
	}
});
