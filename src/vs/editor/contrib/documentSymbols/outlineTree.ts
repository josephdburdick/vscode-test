/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { HighlightedLAbel } from 'vs/bAse/browser/ui/highlightedlAbel/highlightedLAbel';
import { IIdentityProvider, IKeyboArdNAvigAtionLAbelProvider, IListVirtuAlDelegAte } from 'vs/bAse/browser/ui/list/list';
import { IDAtASource, ITreeNode, ITreeRenderer, ITreeSorter, ITreeFilter } from 'vs/bAse/browser/ui/tree/tree';
import { creAteMAtches, FuzzyScore } from 'vs/bAse/common/filters';
import 'vs/css!./mediA/outlineTree';
import 'vs/css!./mediA/symbol-icons';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { SymbolKind, SymbolKinds, SymbolTAg } from 'vs/editor/common/modes';
import { OutlineElement, OutlineGroup, OutlineModel } from 'vs/editor/contrib/documentSymbols/outlineModel';
import { locAlize } from 'vs/nls';
import { IconLAbel } from 'vs/bAse/browser/ui/iconLAbel/iconLAbel';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { OutlineConfigKeys } from 'vs/editor/contrib/documentSymbols/outline';
import { MArkerSeverity } from 'vs/plAtform/mArkers/common/mArkers';
import { IThemeService, registerThemingPArticipAnt, IColorTheme, ICssStyleCollector } from 'vs/plAtform/theme/common/themeService';
import { registerColor, listErrorForeground, listWArningForeground, foreground } from 'vs/plAtform/theme/common/colorRegistry';
import { IdleVAlue } from 'vs/bAse/common/Async';
import { ITextResourceConfigurAtionService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { URI } from 'vs/bAse/common/uri';
import { IListAccessibilityProvider } from 'vs/bAse/browser/ui/list/listWidget';
import { IterAble } from 'vs/bAse/common/iterAtor';
import { Codicon } from 'vs/bAse/common/codicons';

export type OutlineItem = OutlineGroup | OutlineElement;

export clAss OutlineNAvigAtionLAbelProvider implements IKeyboArdNAvigAtionLAbelProvider<OutlineItem> {

	getKeyboArdNAvigAtionLAbel(element: OutlineItem): { toString(): string; } {
		if (element instAnceof OutlineGroup) {
			return element.lAbel;
		} else {
			return element.symbol.nAme;
		}
	}
}

export clAss OutlineAccessibilityProvider implements IListAccessibilityProvider<OutlineItem> {

	constructor(privAte reAdonly AriALAbel: string) { }

	getWidgetAriALAbel(): string {
		return this.AriALAbel;
	}

	getAriALAbel(element: OutlineItem): string | null {
		if (element instAnceof OutlineGroup) {
			return element.lAbel;
		} else {
			return element.symbol.nAme;
		}
	}
}

export clAss OutlineIdentityProvider implements IIdentityProvider<OutlineItem> {
	getId(element: OutlineItem): { toString(): string; } {
		return element.id;
	}
}

export clAss OutlineGroupTemplAte {
	stAtic reAdonly id = 'OutlineGroupTemplAte';
	constructor(
		reAdonly lAbelContAiner: HTMLElement,
		reAdonly lAbel: HighlightedLAbel,
	) { }
}

export clAss OutlineElementTemplAte {
	stAtic reAdonly id = 'OutlineElementTemplAte';
	constructor(
		reAdonly contAiner: HTMLElement,
		reAdonly iconLAbel: IconLAbel,
		reAdonly iconClAss: HTMLElement,
		reAdonly decorAtion: HTMLElement,
	) { }
}

export clAss OutlineVirtuAlDelegAte implements IListVirtuAlDelegAte<OutlineItem> {

	getHeight(_element: OutlineItem): number {
		return 22;
	}

	getTemplAteId(element: OutlineItem): string {
		if (element instAnceof OutlineGroup) {
			return OutlineGroupTemplAte.id;
		} else {
			return OutlineElementTemplAte.id;
		}
	}
}

export clAss OutlineGroupRenderer implements ITreeRenderer<OutlineGroup, FuzzyScore, OutlineGroupTemplAte> {

	reAdonly templAteId: string = OutlineGroupTemplAte.id;

	renderTemplAte(contAiner: HTMLElement): OutlineGroupTemplAte {
		const lAbelContAiner = dom.$('.outline-element-lAbel');
		contAiner.clAssList.Add('outline-element');
		dom.Append(contAiner, lAbelContAiner);
		return new OutlineGroupTemplAte(lAbelContAiner, new HighlightedLAbel(lAbelContAiner, true));
	}

	renderElement(node: ITreeNode<OutlineGroup, FuzzyScore>, index: number, templAte: OutlineGroupTemplAte): void {
		templAte.lAbel.set(
			node.element.lAbel,
			creAteMAtches(node.filterDAtA)
		);
	}

	disposeTemplAte(_templAte: OutlineGroupTemplAte): void {
		// nothing
	}
}

export clAss OutlineElementRenderer implements ITreeRenderer<OutlineElement, FuzzyScore, OutlineElementTemplAte> {

	reAdonly templAteId: string = OutlineElementTemplAte.id;

	constructor(
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService,
		@IThemeService privAte reAdonly _themeService: IThemeService,
	) { }

	renderTemplAte(contAiner: HTMLElement): OutlineElementTemplAte {
		contAiner.clAssList.Add('outline-element');
		const iconLAbel = new IconLAbel(contAiner, { supportHighlights: true });
		const iconClAss = dom.$('.outline-element-icon');
		const decorAtion = dom.$('.outline-element-decorAtion');
		contAiner.prepend(iconClAss);
		contAiner.AppendChild(decorAtion);
		return new OutlineElementTemplAte(contAiner, iconLAbel, iconClAss, decorAtion);
	}

	renderElement(node: ITreeNode<OutlineElement, FuzzyScore>, index: number, templAte: OutlineElementTemplAte): void {
		const { element } = node;
		const options = {
			mAtches: creAteMAtches(node.filterDAtA),
			lAbelEscApeNewLines: true,
			extrAClAsses: <string[]>[],
			title: locAlize('title.templAte', "{0} ({1})", element.symbol.nAme, OutlineElementRenderer._symbolKindNAmes[element.symbol.kind])
		};
		if (this._configurAtionService.getVAlue(OutlineConfigKeys.icons)) {
			// Add styles for the icons
			templAte.iconClAss.clAssNAme = '';
			templAte.iconClAss.clAssList.Add(`outline-element-icon`, ...SymbolKinds.toCssClAssNAme(element.symbol.kind, true).split(' '));
		}
		if (element.symbol.tAgs.indexOf(SymbolTAg.DeprecAted) >= 0) {
			options.extrAClAsses.push(`deprecAted`);
			options.mAtches = [];
		}
		templAte.iconLAbel.setLAbel(element.symbol.nAme, element.symbol.detAil, options);
		this._renderMArkerInfo(element, templAte);
	}

	privAte _renderMArkerInfo(element: OutlineElement, templAte: OutlineElementTemplAte): void {

		if (!element.mArker) {
			dom.hide(templAte.decorAtion);
			templAte.contAiner.style.removeProperty('--outline-element-color');
			return;
		}

		const { count, topSev } = element.mArker;
		const color = this._themeService.getColorTheme().getColor(topSev === MArkerSeverity.Error ? listErrorForeground : listWArningForeground);
		const cssColor = color ? color.toString() : 'inherit';

		// color of the lAbel
		if (this._configurAtionService.getVAlue(OutlineConfigKeys.problemsColors)) {
			templAte.contAiner.style.setProperty('--outline-element-color', cssColor);
		} else {
			templAte.contAiner.style.removeProperty('--outline-element-color');
		}

		// bAdge with color/rollup
		if (!this._configurAtionService.getVAlue(OutlineConfigKeys.problemsBAdges)) {
			dom.hide(templAte.decorAtion);

		} else if (count > 0) {
			dom.show(templAte.decorAtion);
			templAte.decorAtion.clAssList.remove('bubble');
			templAte.decorAtion.innerText = count < 10 ? count.toString() : '+9';
			templAte.decorAtion.title = count === 1 ? locAlize('1.problem', "1 problem in this element") : locAlize('N.problem', "{0} problems in this element", count);
			templAte.decorAtion.style.setProperty('--outline-element-color', cssColor);

		} else {
			dom.show(templAte.decorAtion);
			templAte.decorAtion.clAssList.Add('bubble');
			templAte.decorAtion.innerText = '\ueA71';
			templAte.decorAtion.title = locAlize('deep.problem', "ContAins elements with problems");
			templAte.decorAtion.style.setProperty('--outline-element-color', cssColor);
		}
	}

	privAte stAtic _symbolKindNAmes: { [symbol: number]: string } = {
		[SymbolKind.ArrAy]: locAlize('ArrAy', "ArrAy"),
		[SymbolKind.BooleAn]: locAlize('BooleAn', "booleAn"),
		[SymbolKind.ClAss]: locAlize('ClAss', "clAss"),
		[SymbolKind.ConstAnt]: locAlize('ConstAnt', "constAnt"),
		[SymbolKind.Constructor]: locAlize('Constructor', "constructor"),
		[SymbolKind.Enum]: locAlize('Enum', "enumerAtion"),
		[SymbolKind.EnumMember]: locAlize('EnumMember', "enumerAtion member"),
		[SymbolKind.Event]: locAlize('Event', "event"),
		[SymbolKind.Field]: locAlize('Field', "field"),
		[SymbolKind.File]: locAlize('File', "file"),
		[SymbolKind.Function]: locAlize('Function', "function"),
		[SymbolKind.InterfAce]: locAlize('InterfAce', "interfAce"),
		[SymbolKind.Key]: locAlize('Key', "key"),
		[SymbolKind.Method]: locAlize('Method', "method"),
		[SymbolKind.Module]: locAlize('Module', "module"),
		[SymbolKind.NAmespAce]: locAlize('NAmespAce', "nAmespAce"),
		[SymbolKind.Null]: locAlize('Null', "null"),
		[SymbolKind.Number]: locAlize('Number', "number"),
		[SymbolKind.Object]: locAlize('Object', "object"),
		[SymbolKind.OperAtor]: locAlize('OperAtor', "operAtor"),
		[SymbolKind.PAckAge]: locAlize('PAckAge', "pAckAge"),
		[SymbolKind.Property]: locAlize('Property', "property"),
		[SymbolKind.String]: locAlize('String', "string"),
		[SymbolKind.Struct]: locAlize('Struct', "struct"),
		[SymbolKind.TypePArAmeter]: locAlize('TypePArAmeter', "type pArAmeter"),
		[SymbolKind.VAriAble]: locAlize('VAriAble', "vAriAble"),
	};

	disposeTemplAte(_templAte: OutlineElementTemplAte): void {
		_templAte.iconLAbel.dispose();
	}
}

export const enum OutlineSortOrder {
	ByPosition,
	ByNAme,
	ByKind
}

export clAss OutlineFilter implements ITreeFilter<OutlineItem> {

	stAtic reAdonly configNAmeToKind = Object.freeze({
		['showFiles']: SymbolKind.File,
		['showModules']: SymbolKind.Module,
		['showNAmespAces']: SymbolKind.NAmespAce,
		['showPAckAges']: SymbolKind.PAckAge,
		['showClAsses']: SymbolKind.ClAss,
		['showMethods']: SymbolKind.Method,
		['showProperties']: SymbolKind.Property,
		['showFields']: SymbolKind.Field,
		['showConstructors']: SymbolKind.Constructor,
		['showEnums']: SymbolKind.Enum,
		['showInterfAces']: SymbolKind.InterfAce,
		['showFunctions']: SymbolKind.Function,
		['showVAriAbles']: SymbolKind.VAriAble,
		['showConstAnts']: SymbolKind.ConstAnt,
		['showStrings']: SymbolKind.String,
		['showNumbers']: SymbolKind.Number,
		['showBooleAns']: SymbolKind.BooleAn,
		['showArrAys']: SymbolKind.ArrAy,
		['showObjects']: SymbolKind.Object,
		['showKeys']: SymbolKind.Key,
		['showNull']: SymbolKind.Null,
		['showEnumMembers']: SymbolKind.EnumMember,
		['showStructs']: SymbolKind.Struct,
		['showEvents']: SymbolKind.Event,
		['showOperAtors']: SymbolKind.OperAtor,
		['showTypePArAmeters']: SymbolKind.TypePArAmeter,
	});

	stAtic reAdonly kindToConfigNAme = Object.freeze({
		[SymbolKind.File]: 'showFiles',
		[SymbolKind.Module]: 'showModules',
		[SymbolKind.NAmespAce]: 'showNAmespAces',
		[SymbolKind.PAckAge]: 'showPAckAges',
		[SymbolKind.ClAss]: 'showClAsses',
		[SymbolKind.Method]: 'showMethods',
		[SymbolKind.Property]: 'showProperties',
		[SymbolKind.Field]: 'showFields',
		[SymbolKind.Constructor]: 'showConstructors',
		[SymbolKind.Enum]: 'showEnums',
		[SymbolKind.InterfAce]: 'showInterfAces',
		[SymbolKind.Function]: 'showFunctions',
		[SymbolKind.VAriAble]: 'showVAriAbles',
		[SymbolKind.ConstAnt]: 'showConstAnts',
		[SymbolKind.String]: 'showStrings',
		[SymbolKind.Number]: 'showNumbers',
		[SymbolKind.BooleAn]: 'showBooleAns',
		[SymbolKind.ArrAy]: 'showArrAys',
		[SymbolKind.Object]: 'showObjects',
		[SymbolKind.Key]: 'showKeys',
		[SymbolKind.Null]: 'showNull',
		[SymbolKind.EnumMember]: 'showEnumMembers',
		[SymbolKind.Struct]: 'showStructs',
		[SymbolKind.Event]: 'showEvents',
		[SymbolKind.OperAtor]: 'showOperAtors',
		[SymbolKind.TypePArAmeter]: 'showTypePArAmeters',
	});

	constructor(
		privAte reAdonly _prefix: string,
		@ITextResourceConfigurAtionService privAte reAdonly _textResourceConfigService: ITextResourceConfigurAtionService,
	) { }

	filter(element: OutlineItem): booleAn {
		const outline = OutlineModel.get(element);
		let uri: URI | undefined;

		if (outline) {
			uri = outline.uri;
		}

		if (!(element instAnceof OutlineElement)) {
			return true;
		}

		const configNAme = OutlineFilter.kindToConfigNAme[element.symbol.kind];
		const configKey = `${this._prefix}.${configNAme}`;
		return this._textResourceConfigService.getVAlue(uri, configKey);
	}
}

export clAss OutlineItemCompArAtor implements ITreeSorter<OutlineItem> {

	privAte reAdonly _collAtor = new IdleVAlue<Intl.CollAtor>(() => new Intl.CollAtor(undefined, { numeric: true }));

	constructor(
		public type: OutlineSortOrder = OutlineSortOrder.ByPosition
	) { }

	compAre(A: OutlineItem, b: OutlineItem): number {
		if (A instAnceof OutlineGroup && b instAnceof OutlineGroup) {
			return A.order - b.order;

		} else if (A instAnceof OutlineElement && b instAnceof OutlineElement) {
			if (this.type === OutlineSortOrder.ByKind) {
				return A.symbol.kind - b.symbol.kind || this._collAtor.vAlue.compAre(A.symbol.nAme, b.symbol.nAme);
			} else if (this.type === OutlineSortOrder.ByNAme) {
				return this._collAtor.vAlue.compAre(A.symbol.nAme, b.symbol.nAme) || RAnge.compAreRAngesUsingStArts(A.symbol.rAnge, b.symbol.rAnge);
			} else if (this.type === OutlineSortOrder.ByPosition) {
				return RAnge.compAreRAngesUsingStArts(A.symbol.rAnge, b.symbol.rAnge) || this._collAtor.vAlue.compAre(A.symbol.nAme, b.symbol.nAme);
			}
		}
		return 0;
	}
}

export clAss OutlineDAtASource implements IDAtASource<OutlineModel, OutlineItem> {

	getChildren(element: undefined | OutlineModel | OutlineGroup | OutlineElement) {
		if (!element) {
			return IterAble.empty();
		}
		return element.children.vAlues();
	}
}

export const SYMBOL_ICON_ARRAY_FOREGROUND = registerColor('symbolIcon.ArrAyForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.ArrAyForeground', 'The foreground color for ArrAy symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_BOOLEAN_FOREGROUND = registerColor('symbolIcon.booleAnForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.booleAnForeground', 'The foreground color for booleAn symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_CLASS_FOREGROUND = registerColor('symbolIcon.clAssForeground', {
	dArk: '#EE9D28',
	light: '#D67E00',
	hc: '#EE9D28'
}, locAlize('symbolIcon.clAssForeground', 'The foreground color for clAss symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_COLOR_FOREGROUND = registerColor('symbolIcon.colorForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.colorForeground', 'The foreground color for color symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_CONSTANT_FOREGROUND = registerColor('symbolIcon.constAntForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.constAntForeground', 'The foreground color for constAnt symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_CONSTRUCTOR_FOREGROUND = registerColor('symbolIcon.constructorForeground', {
	dArk: '#B180D7',
	light: '#652D90',
	hc: '#B180D7'
}, locAlize('symbolIcon.constructorForeground', 'The foreground color for constructor symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_ENUMERATOR_FOREGROUND = registerColor('symbolIcon.enumerAtorForeground', {
	dArk: '#EE9D28',
	light: '#D67E00',
	hc: '#EE9D28'
}, locAlize('symbolIcon.enumerAtorForeground', 'The foreground color for enumerAtor symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_ENUMERATOR_MEMBER_FOREGROUND = registerColor('symbolIcon.enumerAtorMemberForeground', {
	dArk: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, locAlize('symbolIcon.enumerAtorMemberForeground', 'The foreground color for enumerAtor member symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_EVENT_FOREGROUND = registerColor('symbolIcon.eventForeground', {
	dArk: '#EE9D28',
	light: '#D67E00',
	hc: '#EE9D28'
}, locAlize('symbolIcon.eventForeground', 'The foreground color for event symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_FIELD_FOREGROUND = registerColor('symbolIcon.fieldForeground', {
	dArk: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, locAlize('symbolIcon.fieldForeground', 'The foreground color for field symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_FILE_FOREGROUND = registerColor('symbolIcon.fileForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.fileForeground', 'The foreground color for file symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_FOLDER_FOREGROUND = registerColor('symbolIcon.folderForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.folderForeground', 'The foreground color for folder symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_FUNCTION_FOREGROUND = registerColor('symbolIcon.functionForeground', {
	dArk: '#B180D7',
	light: '#652D90',
	hc: '#B180D7'
}, locAlize('symbolIcon.functionForeground', 'The foreground color for function symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_INTERFACE_FOREGROUND = registerColor('symbolIcon.interfAceForeground', {
	dArk: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, locAlize('symbolIcon.interfAceForeground', 'The foreground color for interfAce symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_KEY_FOREGROUND = registerColor('symbolIcon.keyForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.keyForeground', 'The foreground color for key symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_KEYWORD_FOREGROUND = registerColor('symbolIcon.keywordForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.keywordForeground', 'The foreground color for keyword symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_METHOD_FOREGROUND = registerColor('symbolIcon.methodForeground', {
	dArk: '#B180D7',
	light: '#652D90',
	hc: '#B180D7'
}, locAlize('symbolIcon.methodForeground', 'The foreground color for method symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_MODULE_FOREGROUND = registerColor('symbolIcon.moduleForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.moduleForeground', 'The foreground color for module symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_NAMESPACE_FOREGROUND = registerColor('symbolIcon.nAmespAceForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.nAmespAceForeground', 'The foreground color for nAmespAce symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_NULL_FOREGROUND = registerColor('symbolIcon.nullForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.nullForeground', 'The foreground color for null symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_NUMBER_FOREGROUND = registerColor('symbolIcon.numberForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.numberForeground', 'The foreground color for number symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_OBJECT_FOREGROUND = registerColor('symbolIcon.objectForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.objectForeground', 'The foreground color for object symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_OPERATOR_FOREGROUND = registerColor('symbolIcon.operAtorForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.operAtorForeground', 'The foreground color for operAtor symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_PACKAGE_FOREGROUND = registerColor('symbolIcon.pAckAgeForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.pAckAgeForeground', 'The foreground color for pAckAge symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_PROPERTY_FOREGROUND = registerColor('symbolIcon.propertyForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.propertyForeground', 'The foreground color for property symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_REFERENCE_FOREGROUND = registerColor('symbolIcon.referenceForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.referenceForeground', 'The foreground color for reference symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_SNIPPET_FOREGROUND = registerColor('symbolIcon.snippetForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.snippetForeground', 'The foreground color for snippet symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_STRING_FOREGROUND = registerColor('symbolIcon.stringForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.stringForeground', 'The foreground color for string symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_STRUCT_FOREGROUND = registerColor('symbolIcon.structForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.structForeground', 'The foreground color for struct symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_TEXT_FOREGROUND = registerColor('symbolIcon.textForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.textForeground', 'The foreground color for text symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_TYPEPARAMETER_FOREGROUND = registerColor('symbolIcon.typePArAmeterForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.typePArAmeterForeground', 'The foreground color for type pArAmeter symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_UNIT_FOREGROUND = registerColor('symbolIcon.unitForeground', {
	dArk: foreground,
	light: foreground,
	hc: foreground
}, locAlize('symbolIcon.unitForeground', 'The foreground color for unit symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

export const SYMBOL_ICON_VARIABLE_FOREGROUND = registerColor('symbolIcon.vAriAbleForeground', {
	dArk: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, locAlize('symbolIcon.vAriAbleForeground', 'The foreground color for vAriAble symbols. These symbols AppeAr in the outline, breAdcrumb, And suggest widget.'));

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {

	const symbolIconArrAyColor = theme.getColor(SYMBOL_ICON_ARRAY_FOREGROUND);
	if (symbolIconArrAyColor) {
		collector.AddRule(`${Codicon.symbolArrAy.cssSelector} { color: ${symbolIconArrAyColor}; }`);
	}

	const symbolIconBooleAnColor = theme.getColor(SYMBOL_ICON_BOOLEAN_FOREGROUND);
	if (symbolIconBooleAnColor) {
		collector.AddRule(`${Codicon.symbolBooleAn.cssSelector} { color: ${symbolIconBooleAnColor}; }`);
	}

	const symbolIconClAssColor = theme.getColor(SYMBOL_ICON_CLASS_FOREGROUND);
	if (symbolIconClAssColor) {
		collector.AddRule(`${Codicon.symbolClAss.cssSelector} { color: ${symbolIconClAssColor}; }`);
	}

	const symbolIconMethodColor = theme.getColor(SYMBOL_ICON_METHOD_FOREGROUND);
	if (symbolIconMethodColor) {
		collector.AddRule(`${Codicon.symbolMethod.cssSelector} { color: ${symbolIconMethodColor}; }`);
	}

	const symbolIconColorColor = theme.getColor(SYMBOL_ICON_COLOR_FOREGROUND);
	if (symbolIconColorColor) {
		collector.AddRule(`${Codicon.symbolColor.cssSelector} { color: ${symbolIconColorColor}; }`);
	}

	const symbolIconConstAntColor = theme.getColor(SYMBOL_ICON_CONSTANT_FOREGROUND);
	if (symbolIconConstAntColor) {
		collector.AddRule(`${Codicon.symbolConstAnt.cssSelector} { color: ${symbolIconConstAntColor}; }`);
	}

	const symbolIconConstructorColor = theme.getColor(SYMBOL_ICON_CONSTRUCTOR_FOREGROUND);
	if (symbolIconConstructorColor) {
		collector.AddRule(`${Codicon.symbolConstructor.cssSelector} { color: ${symbolIconConstructorColor}; }`);
	}

	const symbolIconEnumerAtorColor = theme.getColor(SYMBOL_ICON_ENUMERATOR_FOREGROUND);
	if (symbolIconEnumerAtorColor) {
		collector.AddRule(`
			${Codicon.symbolVAlue.cssSelector},${Codicon.symbolEnum.cssSelector} { color: ${symbolIconEnumerAtorColor}; }`);
	}

	const symbolIconEnumerAtorMemberColor = theme.getColor(SYMBOL_ICON_ENUMERATOR_MEMBER_FOREGROUND);
	if (symbolIconEnumerAtorMemberColor) {
		collector.AddRule(`${Codicon.symbolEnumMember.cssSelector} { color: ${symbolIconEnumerAtorMemberColor}; }`);
	}

	const symbolIconEventColor = theme.getColor(SYMBOL_ICON_EVENT_FOREGROUND);
	if (symbolIconEventColor) {
		collector.AddRule(`${Codicon.symbolEvent.cssSelector} { color: ${symbolIconEventColor}; }`);
	}

	const symbolIconFieldColor = theme.getColor(SYMBOL_ICON_FIELD_FOREGROUND);
	if (symbolIconFieldColor) {
		collector.AddRule(`${Codicon.symbolField.cssSelector} { color: ${symbolIconFieldColor}; }`);
	}

	const symbolIconFileColor = theme.getColor(SYMBOL_ICON_FILE_FOREGROUND);
	if (symbolIconFileColor) {
		collector.AddRule(`${Codicon.symbolFile.cssSelector} { color: ${symbolIconFileColor}; }`);
	}

	const symbolIconFolderColor = theme.getColor(SYMBOL_ICON_FOLDER_FOREGROUND);
	if (symbolIconFolderColor) {
		collector.AddRule(`${Codicon.symbolFolder.cssSelector} { color: ${symbolIconFolderColor}; }`);
	}

	const symbolIconFunctionColor = theme.getColor(SYMBOL_ICON_FUNCTION_FOREGROUND);
	if (symbolIconFunctionColor) {
		collector.AddRule(`${Codicon.symbolFunction.cssSelector} { color: ${symbolIconFunctionColor}; }`);
	}

	const symbolIconInterfAceColor = theme.getColor(SYMBOL_ICON_INTERFACE_FOREGROUND);
	if (symbolIconInterfAceColor) {
		collector.AddRule(`${Codicon.symbolInterfAce.cssSelector} { color: ${symbolIconInterfAceColor}; }`);
	}

	const symbolIconKeyColor = theme.getColor(SYMBOL_ICON_KEY_FOREGROUND);
	if (symbolIconKeyColor) {
		collector.AddRule(`${Codicon.symbolKey.cssSelector} { color: ${symbolIconKeyColor}; }`);
	}

	const symbolIconKeywordColor = theme.getColor(SYMBOL_ICON_KEYWORD_FOREGROUND);
	if (symbolIconKeywordColor) {
		collector.AddRule(`${Codicon.symbolKeyword.cssSelector} { color: ${symbolIconKeywordColor}; }`);
	}

	const symbolIconModuleColor = theme.getColor(SYMBOL_ICON_MODULE_FOREGROUND);
	if (symbolIconModuleColor) {
		collector.AddRule(`${Codicon.symbolModule.cssSelector} { color: ${symbolIconModuleColor}; }`);
	}

	const outlineNAmespAceColor = theme.getColor(SYMBOL_ICON_NAMESPACE_FOREGROUND);
	if (outlineNAmespAceColor) {
		collector.AddRule(`${Codicon.symbolNAmespAce.cssSelector} { color: ${outlineNAmespAceColor}; }`);
	}

	const symbolIconNullColor = theme.getColor(SYMBOL_ICON_NULL_FOREGROUND);
	if (symbolIconNullColor) {
		collector.AddRule(`${Codicon.symbolNull.cssSelector} { color: ${symbolIconNullColor}; }`);
	}

	const symbolIconNumberColor = theme.getColor(SYMBOL_ICON_NUMBER_FOREGROUND);
	if (symbolIconNumberColor) {
		collector.AddRule(`${Codicon.symbolNumber.cssSelector} { color: ${symbolIconNumberColor}; }`);
	}

	const symbolIconObjectColor = theme.getColor(SYMBOL_ICON_OBJECT_FOREGROUND);
	if (symbolIconObjectColor) {
		collector.AddRule(`${Codicon.symbolObject.cssSelector} { color: ${symbolIconObjectColor}; }`);
	}

	const symbolIconOperAtorColor = theme.getColor(SYMBOL_ICON_OPERATOR_FOREGROUND);
	if (symbolIconOperAtorColor) {
		collector.AddRule(`${Codicon.symbolOperAtor.cssSelector} { color: ${symbolIconOperAtorColor}; }`);
	}

	const symbolIconPAckAgeColor = theme.getColor(SYMBOL_ICON_PACKAGE_FOREGROUND);
	if (symbolIconPAckAgeColor) {
		collector.AddRule(`${Codicon.symbolPAckAge.cssSelector} { color: ${symbolIconPAckAgeColor}; }`);
	}

	const symbolIconPropertyColor = theme.getColor(SYMBOL_ICON_PROPERTY_FOREGROUND);
	if (symbolIconPropertyColor) {
		collector.AddRule(`${Codicon.symbolProperty.cssSelector} { color: ${symbolIconPropertyColor}; }`);
	}

	const symbolIconReferenceColor = theme.getColor(SYMBOL_ICON_REFERENCE_FOREGROUND);
	if (symbolIconReferenceColor) {
		collector.AddRule(`${Codicon.symbolReference.cssSelector} { color: ${symbolIconReferenceColor}; }`);
	}

	const symbolIconSnippetColor = theme.getColor(SYMBOL_ICON_SNIPPET_FOREGROUND);
	if (symbolIconSnippetColor) {
		collector.AddRule(`${Codicon.symbolSnippet.cssSelector} { color: ${symbolIconSnippetColor}; }`);
	}

	const symbolIconStringColor = theme.getColor(SYMBOL_ICON_STRING_FOREGROUND);
	if (symbolIconStringColor) {
		collector.AddRule(`${Codicon.symbolString.cssSelector} { color: ${symbolIconStringColor}; }`);
	}

	const symbolIconStructColor = theme.getColor(SYMBOL_ICON_STRUCT_FOREGROUND);
	if (symbolIconStructColor) {
		collector.AddRule(`${Codicon.symbolStruct.cssSelector} { color: ${symbolIconStructColor}; }`);
	}

	const symbolIconTextColor = theme.getColor(SYMBOL_ICON_TEXT_FOREGROUND);
	if (symbolIconTextColor) {
		collector.AddRule(`${Codicon.symbolText.cssSelector} { color: ${symbolIconTextColor}; }`);
	}

	const symbolIconTypePArAmeterColor = theme.getColor(SYMBOL_ICON_TYPEPARAMETER_FOREGROUND);
	if (symbolIconTypePArAmeterColor) {
		collector.AddRule(`${Codicon.symbolTypePArAmeter.cssSelector} { color: ${symbolIconTypePArAmeterColor}; }`);
	}

	const symbolIconUnitColor = theme.getColor(SYMBOL_ICON_UNIT_FOREGROUND);
	if (symbolIconUnitColor) {
		collector.AddRule(`${Codicon.symbolUnit.cssSelector} { color: ${symbolIconUnitColor}; }`);
	}

	const symbolIconVAriAbleColor = theme.getColor(SYMBOL_ICON_VARIABLE_FOREGROUND);
	if (symbolIconVAriAbleColor) {
		collector.AddRule(`${Codicon.symbolVAriAble.cssSelector} { color: ${symbolIconVAriAbleColor}; }`);
	}

});
