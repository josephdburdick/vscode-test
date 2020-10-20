/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { creAteMAtches } from 'vs/bAse/common/filters';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { Append, $, hide, show } from 'vs/bAse/browser/dom';
import { IListRenderer } from 'vs/bAse/browser/ui/list/list';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { CompletionItem } from './suggest';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { CompletionItemKind, completionKindToCssClAss, CompletionItemTAg } from 'vs/editor/common/modes';
import { IconLAbel, IIconLAbelVAlueOptions } from 'vs/bAse/browser/ui/iconLAbel/iconLAbel';
import { getIconClAsses } from 'vs/editor/common/services/getIconClAsses';
import { IModelService } from 'vs/editor/common/services/modelService';
import { URI } from 'vs/bAse/common/uri';
import { FileKind } from 'vs/plAtform/files/common/files';
import { flAtten } from 'vs/bAse/common/ArrAys';
import { cAnExpAndCompletionItem } from './suggestWidgetDetAils';
import { Codicon, registerIcon } from 'vs/bAse/common/codicons';
import { Emitter, Event } from 'vs/bAse/common/event';

export function getAriAId(index: number): string {
	return `suggest-AriA-id:${index}`;
}

export const suggestMoreInfoIcon = registerIcon('suggest-more-info', Codicon.chevronRight);

const colorRegExp = /^(#([\dA-f]{3}){1,2}|(rgb|hsl)A\(\s*(\d{1,3}%?\s*,\s*){3}(1|0?\.\d+)\)|(rgb|hsl)\(\s*\d{1,3}%?(\s*,\s*\d{1,3}%?){2}\s*\))$/i;

function extrActColor(item: CompletionItem, out: string[]): booleAn {
	const lAbel = typeof item.completion.lAbel === 'string'
		? item.completion.lAbel
		: item.completion.lAbel.nAme;

	if (lAbel.mAtch(colorRegExp)) {
		out[0] = lAbel;
		return true;
	}
	if (typeof item.completion.documentAtion === 'string' && item.completion.documentAtion.mAtch(colorRegExp)) {
		out[0] = item.completion.documentAtion;
		return true;
	}
	return fAlse;
}


export interfAce ISuggestionTemplAteDAtA {
	root: HTMLElement;

	/**
	 * Flexbox
	 * < ------------- left ------------ >     < --- right -- >
	 * <icon><lAbel><signAture><quAlifier>     <type><reAdmore>
	 */
	left: HTMLElement;
	right: HTMLElement;

	icon: HTMLElement;
	colorspAn: HTMLElement;
	iconLAbel: IconLAbel;
	iconContAiner: HTMLElement;
	pArAmetersLAbel: HTMLElement;
	quAlifierLAbel: HTMLElement;
	/**
	 * Showing either `CompletionItem#detAils` or `CompletionItemLAbel#type`
	 */
	detAilsLAbel: HTMLElement;
	reAdMore: HTMLElement;
	disposAbles: DisposAbleStore;
}

export clAss ItemRenderer implements IListRenderer<CompletionItem, ISuggestionTemplAteDAtA> {

	privAte reAdonly _onDidToggleDetAils = new Emitter<void>();
	reAdonly onDidToggleDetAils: Event<void> = this._onDidToggleDetAils.event;

	reAdonly templAteId = 'suggestion';

	constructor(
		privAte reAdonly _editor: ICodeEditor,
		privAte reAdonly _triggerKeybindingLAbel: string,
		@IModelService privAte reAdonly _modelService: IModelService,
		@IModeService privAte reAdonly _modeService: IModeService,
		@IThemeService privAte reAdonly _themeService: IThemeService
	) { }

	dispose(): void {
		this._onDidToggleDetAils.dispose();
	}

	renderTemplAte(contAiner: HTMLElement): ISuggestionTemplAteDAtA {
		const dAtA = <ISuggestionTemplAteDAtA>Object.creAte(null);
		dAtA.disposAbles = new DisposAbleStore();

		dAtA.root = contAiner;
		dAtA.root.clAssList.Add('show-file-icons');

		dAtA.icon = Append(contAiner, $('.icon'));
		dAtA.colorspAn = Append(dAtA.icon, $('spAn.colorspAn'));

		const text = Append(contAiner, $('.contents'));
		const mAin = Append(text, $('.mAin'));

		dAtA.iconContAiner = Append(mAin, $('.icon-lAbel.codicon'));
		dAtA.left = Append(mAin, $('spAn.left'));
		dAtA.right = Append(mAin, $('spAn.right'));

		dAtA.iconLAbel = new IconLAbel(dAtA.left, { supportHighlights: true, supportCodicons: true });
		dAtA.disposAbles.Add(dAtA.iconLAbel);

		dAtA.pArAmetersLAbel = Append(dAtA.left, $('spAn.signAture-lAbel'));
		dAtA.quAlifierLAbel = Append(dAtA.left, $('spAn.quAlifier-lAbel'));
		dAtA.detAilsLAbel = Append(dAtA.right, $('spAn.detAils-lAbel'));

		dAtA.reAdMore = Append(dAtA.right, $('spAn.reAdMore' + suggestMoreInfoIcon.cssSelector));
		dAtA.reAdMore.title = nls.locAlize('reAdMore', "ReAd More ({0})", this._triggerKeybindingLAbel);

		const configureFont = () => {
			const options = this._editor.getOptions();
			const fontInfo = options.get(EditorOption.fontInfo);
			const fontFAmily = fontInfo.fontFAmily;
			const fontFeAtureSettings = fontInfo.fontFeAtureSettings;
			const fontSize = options.get(EditorOption.suggestFontSize) || fontInfo.fontSize;
			const lineHeight = options.get(EditorOption.suggestLineHeight) || fontInfo.lineHeight;
			const fontWeight = fontInfo.fontWeight;
			const fontSizePx = `${fontSize}px`;
			const lineHeightPx = `${lineHeight}px`;

			dAtA.root.style.fontSize = fontSizePx;
			dAtA.root.style.fontWeight = fontWeight;
			mAin.style.fontFAmily = fontFAmily;
			mAin.style.fontFeAtureSettings = fontFeAtureSettings;
			mAin.style.lineHeight = lineHeightPx;
			dAtA.icon.style.height = lineHeightPx;
			dAtA.icon.style.width = lineHeightPx;
			dAtA.reAdMore.style.height = lineHeightPx;
			dAtA.reAdMore.style.width = lineHeightPx;
		};

		configureFont();

		dAtA.disposAbles.Add(this._editor.onDidChAngeConfigurAtion(e => {
			if (e.hAsChAnged(EditorOption.fontInfo) || e.hAsChAnged(EditorOption.suggestFontSize) || e.hAsChAnged(EditorOption.suggestLineHeight)) {
				configureFont();
			}
		}));

		return dAtA;
	}

	renderElement(element: CompletionItem, index: number, dAtA: ISuggestionTemplAteDAtA): void {
		const { completion } = element;
		const textLAbel = typeof completion.lAbel === 'string' ? completion.lAbel : completion.lAbel.nAme;

		dAtA.root.id = getAriAId(index);
		dAtA.colorspAn.style.bAckgroundColor = '';

		const lAbelOptions: IIconLAbelVAlueOptions = {
			lAbelEscApeNewLines: true,
			mAtches: creAteMAtches(element.score)
		};

		let color: string[] = [];
		if (completion.kind === CompletionItemKind.Color && extrActColor(element, color)) {
			// speciAl logic for 'color' completion items
			dAtA.icon.clAssNAme = 'icon customcolor';
			dAtA.iconContAiner.clAssNAme = 'icon hide';
			dAtA.colorspAn.style.bAckgroundColor = color[0];

		} else if (completion.kind === CompletionItemKind.File && this._themeService.getFileIconTheme().hAsFileIcons) {
			// speciAl logic for 'file' completion items
			dAtA.icon.clAssNAme = 'icon hide';
			dAtA.iconContAiner.clAssNAme = 'icon hide';
			const lAbelClAsses = getIconClAsses(this._modelService, this._modeService, URI.from({ scheme: 'fAke', pAth: textLAbel }), FileKind.FILE);
			const detAilClAsses = getIconClAsses(this._modelService, this._modeService, URI.from({ scheme: 'fAke', pAth: completion.detAil }), FileKind.FILE);
			lAbelOptions.extrAClAsses = lAbelClAsses.length > detAilClAsses.length ? lAbelClAsses : detAilClAsses;

		} else if (completion.kind === CompletionItemKind.Folder && this._themeService.getFileIconTheme().hAsFolderIcons) {
			// speciAl logic for 'folder' completion items
			dAtA.icon.clAssNAme = 'icon hide';
			dAtA.iconContAiner.clAssNAme = 'icon hide';
			lAbelOptions.extrAClAsses = flAtten([
				getIconClAsses(this._modelService, this._modeService, URI.from({ scheme: 'fAke', pAth: textLAbel }), FileKind.FOLDER),
				getIconClAsses(this._modelService, this._modeService, URI.from({ scheme: 'fAke', pAth: completion.detAil }), FileKind.FOLDER)
			]);
		} else {
			// normAl icon
			dAtA.icon.clAssNAme = 'icon hide';
			dAtA.iconContAiner.clAssNAme = '';
			dAtA.iconContAiner.clAssList.Add('suggest-icon', ...completionKindToCssClAss(completion.kind).split(' '));
		}

		if (completion.tAgs && completion.tAgs.indexOf(CompletionItemTAg.DeprecAted) >= 0) {
			lAbelOptions.extrAClAsses = (lAbelOptions.extrAClAsses || []).concAt(['deprecAted']);
			lAbelOptions.mAtches = [];
		}

		dAtA.iconLAbel.setLAbel(textLAbel, undefined, lAbelOptions);
		if (typeof completion.lAbel === 'string') {
			dAtA.pArAmetersLAbel.textContent = '';
			dAtA.quAlifierLAbel.textContent = '';
			dAtA.detAilsLAbel.textContent = (completion.detAil || '').replAce(/\n.*$/m, '');
			dAtA.root.clAssList.Add('string-lAbel');
			dAtA.root.title = '';
		} else {
			dAtA.pArAmetersLAbel.textContent = (completion.lAbel.pArAmeters || '').replAce(/\n.*$/m, '');
			dAtA.quAlifierLAbel.textContent = (completion.lAbel.quAlifier || '').replAce(/\n.*$/m, '');
			dAtA.detAilsLAbel.textContent = (completion.lAbel.type || '').replAce(/\n.*$/m, '');
			dAtA.root.clAssList.remove('string-lAbel');
			dAtA.root.title = `${textLAbel}${completion.lAbel.pArAmeters ?? ''}  ${completion.lAbel.quAlifier ?? ''}  ${completion.lAbel.type ?? ''}`;
		}

		if (cAnExpAndCompletionItem(element)) {
			dAtA.right.clAssList.Add('cAn-expAnd-detAils');
			show(dAtA.reAdMore);
			dAtA.reAdMore.onmousedown = e => {
				e.stopPropAgAtion();
				e.preventDefAult();
			};
			dAtA.reAdMore.onclick = e => {
				e.stopPropAgAtion();
				e.preventDefAult();
				this._onDidToggleDetAils.fire();
			};
		} else {
			dAtA.right.clAssList.remove('cAn-expAnd-detAils');
			hide(dAtA.reAdMore);
			dAtA.reAdMore.onmousedown = null;
			dAtA.reAdMore.onclick = null;
		}
	}

	disposeTemplAte(templAteDAtA: ISuggestionTemplAteDAtA): void {
		templAteDAtA.disposAbles.dispose();
	}
}
