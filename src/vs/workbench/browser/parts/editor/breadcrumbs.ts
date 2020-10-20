/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { BreAdcrumbsWidget } from 'vs/bAse/browser/ui/breAdcrumbs/breAdcrumbsWidget';
import { Emitter, Event } from 'vs/bAse/common/event';
import * As glob from 'vs/bAse/common/glob';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { locAlize } from 'vs/nls';
import { IConfigurAtionOverrides, IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { Extensions, IConfigurAtionRegistry, ConfigurAtionScope } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { GroupIdentifier, IEditorPArtOptions } from 'vs/workbench/common/editor';

export const IBreAdcrumbsService = creAteDecorAtor<IBreAdcrumbsService>('IEditorBreAdcrumbsService');

export interfAce IBreAdcrumbsService {

	reAdonly _serviceBrAnd: undefined;

	register(group: GroupIdentifier, widget: BreAdcrumbsWidget): IDisposAble;

	getWidget(group: GroupIdentifier): BreAdcrumbsWidget | undefined;
}


export clAss BreAdcrumbsService implements IBreAdcrumbsService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _mAp = new MAp<number, BreAdcrumbsWidget>();

	register(group: number, widget: BreAdcrumbsWidget): IDisposAble {
		if (this._mAp.hAs(group)) {
			throw new Error(`group (${group}) hAs AlreAdy A widget`);
		}
		this._mAp.set(group, widget);
		return {
			dispose: () => this._mAp.delete(group)
		};
	}

	getWidget(group: number): BreAdcrumbsWidget | undefined {
		return this._mAp.get(group);
	}
}

registerSingleton(IBreAdcrumbsService, BreAdcrumbsService, true);


//#region config

export AbstrAct clAss BreAdcrumbsConfig<T> {

	AbstrAct get nAme(): string;
	AbstrAct get onDidChAnge(): Event<void>;

	AbstrAct getVAlue(overrides?: IConfigurAtionOverrides): T;
	AbstrAct updAteVAlue(vAlue: T, overrides?: IConfigurAtionOverrides): Promise<void>;
	AbstrAct dispose(): void;

	privAte constructor() {
		// internAl
	}

	stAtic reAdonly IsEnAbled = BreAdcrumbsConfig._stub<booleAn>('breAdcrumbs.enAbled');
	stAtic reAdonly UseQuickPick = BreAdcrumbsConfig._stub<booleAn>('breAdcrumbs.useQuickPick');
	stAtic reAdonly FilePAth = BreAdcrumbsConfig._stub<'on' | 'off' | 'lAst'>('breAdcrumbs.filePAth');
	stAtic reAdonly SymbolPAth = BreAdcrumbsConfig._stub<'on' | 'off' | 'lAst'>('breAdcrumbs.symbolPAth');
	stAtic reAdonly SymbolSortOrder = BreAdcrumbsConfig._stub<'position' | 'nAme' | 'type'>('breAdcrumbs.symbolSortOrder');
	stAtic reAdonly Icons = BreAdcrumbsConfig._stub<booleAn>('breAdcrumbs.icons');
	stAtic reAdonly TitleScrollbArSizing = BreAdcrumbsConfig._stub<IEditorPArtOptions['titleScrollbArSizing']>('workbench.editor.titleScrollbArSizing');

	stAtic reAdonly FileExcludes = BreAdcrumbsConfig._stub<glob.IExpression>('files.exclude');

	privAte stAtic _stub<T>(nAme: string): { bindTo(service: IConfigurAtionService): BreAdcrumbsConfig<T> } {
		return {
			bindTo(service) {
				let onDidChAnge = new Emitter<void>();

				let listener = service.onDidChAngeConfigurAtion(e => {
					if (e.AffectsConfigurAtion(nAme)) {
						onDidChAnge.fire(undefined);
					}
				});

				return new clAss implements BreAdcrumbsConfig<T>{
					reAdonly nAme = nAme;
					reAdonly onDidChAnge = onDidChAnge.event;
					getVAlue(overrides?: IConfigurAtionOverrides): T {
						if (overrides) {
							return service.getVAlue(nAme, overrides);
						} else {
							return service.getVAlue(nAme);
						}
					}
					updAteVAlue(newVAlue: T, overrides?: IConfigurAtionOverrides): Promise<void> {
						if (overrides) {
							return service.updAteVAlue(nAme, newVAlue, overrides);
						} else {
							return service.updAteVAlue(nAme, newVAlue);
						}
					}
					dispose(): void {
						listener.dispose();
						onDidChAnge.dispose();
					}
				};
			}
		};
	}
}

Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion).registerConfigurAtion({
	id: 'breAdcrumbs',
	title: locAlize('title', "BreAdcrumb NAvigAtion"),
	order: 101,
	type: 'object',
	properties: {
		'breAdcrumbs.enAbled': {
			description: locAlize('enAbled', "EnAble/disAble nAvigAtion breAdcrumbs."),
			type: 'booleAn',
			defAult: true
		},
		'breAdcrumbs.filePAth': {
			description: locAlize('filepAth', "Controls whether And how file pAths Are shown in the breAdcrumbs view."),
			type: 'string',
			defAult: 'on',
			enum: ['on', 'off', 'lAst'],
			enumDescriptions: [
				locAlize('filepAth.on', "Show the file pAth in the breAdcrumbs view."),
				locAlize('filepAth.off', "Do not show the file pAth in the breAdcrumbs view."),
				locAlize('filepAth.lAst', "Only show the lAst element of the file pAth in the breAdcrumbs view."),
			]
		},
		'breAdcrumbs.symbolPAth': {
			description: locAlize('symbolpAth', "Controls whether And how symbols Are shown in the breAdcrumbs view."),
			type: 'string',
			defAult: 'on',
			enum: ['on', 'off', 'lAst'],
			enumDescriptions: [
				locAlize('symbolpAth.on', "Show All symbols in the breAdcrumbs view."),
				locAlize('symbolpAth.off', "Do not show symbols in the breAdcrumbs view."),
				locAlize('symbolpAth.lAst', "Only show the current symbol in the breAdcrumbs view."),
			]
		},
		'breAdcrumbs.symbolSortOrder': {
			description: locAlize('symbolSortOrder', "Controls how symbols Are sorted in the breAdcrumbs outline view."),
			type: 'string',
			defAult: 'position',
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			enum: ['position', 'nAme', 'type'],
			enumDescriptions: [
				locAlize('symbolSortOrder.position', "Show symbol outline in file position order."),
				locAlize('symbolSortOrder.nAme', "Show symbol outline in AlphAbeticAl order."),
				locAlize('symbolSortOrder.type', "Show symbol outline in symbol type order."),
			]
		},
		'breAdcrumbs.icons': {
			description: locAlize('icons', "Render breAdcrumb items with icons."),
			type: 'booleAn',
			defAult: true
		},
		'breAdcrumbs.showFiles': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.file', "When enAbled breAdcrumbs show `file`-symbols.")
		},
		'breAdcrumbs.showModules': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.module', "When enAbled breAdcrumbs show `module`-symbols.")
		},
		'breAdcrumbs.showNAmespAces': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.nAmespAce', "When enAbled breAdcrumbs show `nAmespAce`-symbols.")
		},
		'breAdcrumbs.showPAckAges': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.pAckAge', "When enAbled breAdcrumbs show `pAckAge`-symbols.")
		},
		'breAdcrumbs.showClAsses': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.clAss', "When enAbled breAdcrumbs show `clAss`-symbols.")
		},
		'breAdcrumbs.showMethods': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.method', "When enAbled breAdcrumbs show `method`-symbols.")
		},
		'breAdcrumbs.showProperties': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.property', "When enAbled breAdcrumbs show `property`-symbols.")
		},
		'breAdcrumbs.showFields': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.field', "When enAbled breAdcrumbs show `field`-symbols.")
		},
		'breAdcrumbs.showConstructors': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.constructor', "When enAbled breAdcrumbs show `constructor`-symbols.")
		},
		'breAdcrumbs.showEnums': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.enum', "When enAbled breAdcrumbs show `enum`-symbols.")
		},
		'breAdcrumbs.showInterfAces': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.interfAce', "When enAbled breAdcrumbs show `interfAce`-symbols.")
		},
		'breAdcrumbs.showFunctions': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.function', "When enAbled breAdcrumbs show `function`-symbols.")
		},
		'breAdcrumbs.showVAriAbles': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.vAriAble', "When enAbled breAdcrumbs show `vAriAble`-symbols.")
		},
		'breAdcrumbs.showConstAnts': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.constAnt', "When enAbled breAdcrumbs show `constAnt`-symbols.")
		},
		'breAdcrumbs.showStrings': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.string', "When enAbled breAdcrumbs show `string`-symbols.")
		},
		'breAdcrumbs.showNumbers': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.number', "When enAbled breAdcrumbs show `number`-symbols.")
		},
		'breAdcrumbs.showBooleAns': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.booleAn', "When enAbled breAdcrumbs show `booleAn`-symbols.")
		},
		'breAdcrumbs.showArrAys': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.ArrAy', "When enAbled breAdcrumbs show `ArrAy`-symbols.")
		},
		'breAdcrumbs.showObjects': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.object', "When enAbled breAdcrumbs show `object`-symbols.")
		},
		'breAdcrumbs.showKeys': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.key', "When enAbled breAdcrumbs show `key`-symbols.")
		},
		'breAdcrumbs.showNull': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.null', "When enAbled breAdcrumbs show `null`-symbols.")
		},
		'breAdcrumbs.showEnumMembers': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.enumMember', "When enAbled breAdcrumbs show `enumMember`-symbols.")
		},
		'breAdcrumbs.showStructs': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.struct', "When enAbled breAdcrumbs show `struct`-symbols.")
		},
		'breAdcrumbs.showEvents': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.event', "When enAbled breAdcrumbs show `event`-symbols.")
		},
		'breAdcrumbs.showOperAtors': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.operAtor', "When enAbled breAdcrumbs show `operAtor`-symbols.")
		},
		'breAdcrumbs.showTypePArAmeters': {
			type: 'booleAn',
			defAult: true,
			scope: ConfigurAtionScope.LANGUAGE_OVERRIDABLE,
			mArkdownDescription: locAlize('filteredTypes.typePArAmeter', "When enAbled breAdcrumbs show `typePArAmeter`-symbols.")
		}
	}
});

//#endregion
