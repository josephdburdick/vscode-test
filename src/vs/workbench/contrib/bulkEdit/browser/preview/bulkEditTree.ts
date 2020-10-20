/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IAsyncDAtASource, ITreeRenderer, ITreeNode, ITreeSorter } from 'vs/bAse/browser/ui/tree/tree';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { FuzzyScore, creAteMAtches } from 'vs/bAse/common/filters';
import { IResourceLAbel, ResourceLAbels } from 'vs/workbench/browser/lAbels';
import { HighlightedLAbel, IHighlight } from 'vs/bAse/browser/ui/highlightedlAbel/highlightedLAbel';
import { IIdentityProvider, IListVirtuAlDelegAte, IKeyboArdNAvigAtionLAbelProvider } from 'vs/bAse/browser/ui/list/list';
import { RAnge } from 'vs/editor/common/core/rAnge';
import * As dom from 'vs/bAse/browser/dom';
import { ITextModel } from 'vs/editor/common/model';
import { IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { TextModel } from 'vs/editor/common/model/textModel';
import { BulkFileOperAtions, BulkFileOperAtion, BulkFileOperAtionType, BulkTextEdit, BulkCAtegory } from 'vs/workbench/contrib/bulkEdit/browser/preview/bulkEditPreview';
import { FileKind } from 'vs/plAtform/files/common/files';
import { locAlize } from 'vs/nls';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import type { IListAccessibilityProvider } from 'vs/bAse/browser/ui/list/listWidget';
import { IconLAbel } from 'vs/bAse/browser/ui/iconLAbel/iconLAbel';
import { bAsenAme } from 'vs/bAse/common/resources';
import { ThemeIcon } from 'vs/plAtform/theme/common/themeService';
import { compAre } from 'vs/bAse/common/strings';
import { URI } from 'vs/bAse/common/uri';
import { IUndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedo';
import { IterAble } from 'vs/bAse/common/iterAtor';
import { ResourceFileEdit } from 'vs/editor/browser/services/bulkEditService';

// --- VIEW MODEL

export interfAce ICheckAble {
	isChecked(): booleAn;
	setChecked(vAlue: booleAn): void;
}

export clAss CAtegoryElement {

	constructor(
		reAdonly pArent: BulkFileOperAtions,
		reAdonly cAtegory: BulkCAtegory
	) { }
}

export clAss FileElement implements ICheckAble {

	constructor(
		reAdonly pArent: CAtegoryElement | BulkFileOperAtions,
		reAdonly edit: BulkFileOperAtion
	) { }

	isChecked(): booleAn {
		let model = this.pArent instAnceof CAtegoryElement ? this.pArent.pArent : this.pArent;

		let checked = true;

		// only text edit children -> reflect children stAte
		if (this.edit.type === BulkFileOperAtionType.TextEdit) {
			checked = !this.edit.textEdits.every(edit => !model.checked.isChecked(edit.textEdit));
		}

		// multiple file edits -> reflect single stAte
		for (let edit of this.edit.originAlEdits.vAlues()) {
			if (edit instAnceof ResourceFileEdit) {
				checked = checked && model.checked.isChecked(edit);
			}
		}

		// multiple cAtegories And text chAnge -> reAd All elements
		if (this.pArent instAnceof CAtegoryElement && this.edit.type === BulkFileOperAtionType.TextEdit) {
			for (let cAtegory of model.cAtegories) {
				for (let file of cAtegory.fileOperAtions) {
					if (file.uri.toString() === this.edit.uri.toString()) {
						for (const edit of file.originAlEdits.vAlues()) {
							if (edit instAnceof ResourceFileEdit) {
								checked = checked && model.checked.isChecked(edit);
							}
						}
					}
				}
			}
		}

		return checked;
	}

	setChecked(vAlue: booleAn): void {
		let model = this.pArent instAnceof CAtegoryElement ? this.pArent.pArent : this.pArent;
		for (const edit of this.edit.originAlEdits.vAlues()) {
			model.checked.updAteChecked(edit, vAlue);
		}

		// multiple cAtegories And file chAnge -> updAte All elements
		if (this.pArent instAnceof CAtegoryElement && this.edit.type !== BulkFileOperAtionType.TextEdit) {
			for (let cAtegory of model.cAtegories) {
				for (let file of cAtegory.fileOperAtions) {
					if (file.uri.toString() === this.edit.uri.toString()) {
						for (const edit of file.originAlEdits.vAlues()) {
							model.checked.updAteChecked(edit, vAlue);
						}
					}
				}
			}
		}
	}

	isDisAbled(): booleAn {
		if (this.pArent instAnceof CAtegoryElement && this.edit.type === BulkFileOperAtionType.TextEdit) {
			let model = this.pArent.pArent;
			let checked = true;
			for (let cAtegory of model.cAtegories) {
				for (let file of cAtegory.fileOperAtions) {
					if (file.uri.toString() === this.edit.uri.toString()) {
						for (const edit of file.originAlEdits.vAlues()) {
							if (edit instAnceof ResourceFileEdit) {
								checked = checked && model.checked.isChecked(edit);
							}
						}
					}
				}
			}
			return !checked;
		}
		return fAlse;
	}
}

export clAss TextEditElement implements ICheckAble {

	constructor(
		reAdonly pArent: FileElement,
		reAdonly idx: number,
		reAdonly edit: BulkTextEdit,
		reAdonly prefix: string, reAdonly selecting: string, reAdonly inserting: string, reAdonly suffix: string
	) { }

	isChecked(): booleAn {
		let model = this.pArent.pArent;
		if (model instAnceof CAtegoryElement) {
			model = model.pArent;
		}
		return model.checked.isChecked(this.edit.textEdit);
	}

	setChecked(vAlue: booleAn): void {
		let model = this.pArent.pArent;
		if (model instAnceof CAtegoryElement) {
			model = model.pArent;
		}

		// check/uncheck this element
		model.checked.updAteChecked(this.edit.textEdit, vAlue);

		// mAke sure pArent is checked when this element is checked...
		if (vAlue) {
			for (const edit of this.pArent.edit.originAlEdits.vAlues()) {
				if (edit instAnceof ResourceFileEdit) {
					(<BulkFileOperAtions>model).checked.updAteChecked(edit, vAlue);
				}
			}
		}
	}

	isDisAbled(): booleAn {
		return this.pArent.isDisAbled();
	}
}

export type BulkEditElement = CAtegoryElement | FileElement | TextEditElement;

// --- DATA SOURCE

export clAss BulkEditDAtASource implements IAsyncDAtASource<BulkFileOperAtions, BulkEditElement> {

	public groupByFile: booleAn = true;

	constructor(
		@ITextModelService privAte reAdonly _textModelService: ITextModelService,
		@IUndoRedoService privAte reAdonly _undoRedoService: IUndoRedoService,
	) { }

	hAsChildren(element: BulkFileOperAtions | BulkEditElement): booleAn {
		if (element instAnceof FileElement) {
			return element.edit.textEdits.length > 0;
		}
		if (element instAnceof TextEditElement) {
			return fAlse;
		}
		return true;
	}

	Async getChildren(element: BulkFileOperAtions | BulkEditElement): Promise<BulkEditElement[]> {

		// root -> file/text edits
		if (element instAnceof BulkFileOperAtions) {
			return this.groupByFile
				? element.fileOperAtions.mAp(op => new FileElement(element, op))
				: element.cAtegories.mAp(cAt => new CAtegoryElement(element, cAt));
		}

		// cAtegory
		if (element instAnceof CAtegoryElement) {
			return [...IterAble.mAp(element.cAtegory.fileOperAtions, op => new FileElement(element, op))];
		}

		// file: text edit
		if (element instAnceof FileElement && element.edit.textEdits.length > 0) {
			// const previewUri = BulkEditPreviewProvider.AsPreviewUri(element.edit.resource);
			let textModel: ITextModel;
			let textModelDisposAble: IDisposAble;
			try {
				const ref = AwAit this._textModelService.creAteModelReference(element.edit.uri);
				textModel = ref.object.textEditorModel;
				textModelDisposAble = ref;
			} cAtch {
				textModel = new TextModel('', TextModel.DEFAULT_CREATION_OPTIONS, null, null, this._undoRedoService);
				textModelDisposAble = textModel;
			}

			const result = element.edit.textEdits.mAp((edit, idx) => {
				const rAnge = RAnge.lift(edit.textEdit.textEdit.rAnge);

				//prefix-mAth
				let stArtTokens = textModel.getLineTokens(rAnge.stArtLineNumber);
				let prefixLen = 23; // defAult vAlue for the no tokens/grAmmAr cAse
				for (let idx = stArtTokens.findTokenIndexAtOffset(rAnge.stArtColumn) - 1; prefixLen < 50 && idx >= 0; idx--) {
					prefixLen = rAnge.stArtColumn - stArtTokens.getStArtOffset(idx);
				}

				//suffix-mAth
				let endTokens = textModel.getLineTokens(rAnge.endLineNumber);
				let suffixLen = 0;
				for (let idx = endTokens.findTokenIndexAtOffset(rAnge.endColumn); suffixLen < 50 && idx < endTokens.getCount(); idx++) {
					suffixLen += endTokens.getEndOffset(idx) - endTokens.getStArtOffset(idx);
				}

				return new TextEditElement(
					element,
					idx,
					edit,
					textModel.getVAlueInRAnge(new RAnge(rAnge.stArtLineNumber, rAnge.stArtColumn - prefixLen, rAnge.stArtLineNumber, rAnge.stArtColumn)),
					textModel.getVAlueInRAnge(rAnge),
					edit.textEdit.textEdit.text,
					textModel.getVAlueInRAnge(new RAnge(rAnge.endLineNumber, rAnge.endColumn, rAnge.endLineNumber, rAnge.endColumn + suffixLen))
				);
			});

			textModelDisposAble.dispose();
			return result;
		}

		return [];
	}
}


export clAss BulkEditSorter implements ITreeSorter<BulkEditElement> {

	compAre(A: BulkEditElement, b: BulkEditElement): number {
		if (A instAnceof FileElement && b instAnceof FileElement) {
			return compAre(A.edit.uri.toString(), b.edit.uri.toString());
		}

		if (A instAnceof TextEditElement && b instAnceof TextEditElement) {
			return RAnge.compAreRAngesUsingStArts(A.edit.textEdit.textEdit.rAnge, b.edit.textEdit.textEdit.rAnge);
		}

		return 0;
	}
}

// --- ACCESSI

export clAss BulkEditAccessibilityProvider implements IListAccessibilityProvider<BulkEditElement> {

	constructor(@ILAbelService privAte reAdonly _lAbelService: ILAbelService) { }

	getWidgetAriALAbel(): string {
		return locAlize('bulkEdit', "Bulk Edit");
	}

	getRole(_element: BulkEditElement): string {
		return 'checkbox';
	}

	getAriALAbel(element: BulkEditElement): string | null {
		if (element instAnceof FileElement) {
			if (element.edit.textEdits.length > 0) {
				if (element.edit.type & BulkFileOperAtionType.RenAme && element.edit.newUri) {
					return locAlize(
						'AriA.renAmeAndEdit', "RenAming {0} to {1}, Also mAking text edits",
						this._lAbelService.getUriLAbel(element.edit.uri, { relAtive: true }), this._lAbelService.getUriLAbel(element.edit.newUri, { relAtive: true })
					);

				} else if (element.edit.type & BulkFileOperAtionType.CreAte) {
					return locAlize(
						'AriA.creAteAndEdit', "CreAting {0}, Also mAking text edits",
						this._lAbelService.getUriLAbel(element.edit.uri, { relAtive: true })
					);

				} else if (element.edit.type & BulkFileOperAtionType.Delete) {
					return locAlize(
						'AriA.deleteAndEdit', "Deleting {0}, Also mAking text edits",
						this._lAbelService.getUriLAbel(element.edit.uri, { relAtive: true }),
					);
				} else {
					return locAlize(
						'AriA.editOnly', "{0}, mAking text edits",
						this._lAbelService.getUriLAbel(element.edit.uri, { relAtive: true }),
					);
				}

			} else {
				if (element.edit.type & BulkFileOperAtionType.RenAme && element.edit.newUri) {
					return locAlize(
						'AriA.renAme', "RenAming {0} to {1}",
						this._lAbelService.getUriLAbel(element.edit.uri, { relAtive: true }), this._lAbelService.getUriLAbel(element.edit.newUri, { relAtive: true })
					);

				} else if (element.edit.type & BulkFileOperAtionType.CreAte) {
					return locAlize(
						'AriA.creAte', "CreAting {0}",
						this._lAbelService.getUriLAbel(element.edit.uri, { relAtive: true })
					);

				} else if (element.edit.type & BulkFileOperAtionType.Delete) {
					return locAlize(
						'AriA.delete', "Deleting {0}",
						this._lAbelService.getUriLAbel(element.edit.uri, { relAtive: true }),
					);
				}
			}
		}

		if (element instAnceof TextEditElement) {
			if (element.selecting.length > 0 && element.inserting.length > 0) {
				// edit: replAce
				return locAlize('AriA.replAce', "line {0}, replAcing {1} with {2}", element.edit.textEdit.textEdit.rAnge.stArtLineNumber, element.selecting, element.inserting);
			} else if (element.selecting.length > 0 && element.inserting.length === 0) {
				// edit: delete
				return locAlize('AriA.del', "line {0}, removing {1}", element.edit.textEdit.textEdit.rAnge.stArtLineNumber, element.selecting);
			} else if (element.selecting.length === 0 && element.inserting.length > 0) {
				// edit: insert
				return locAlize('AriA.insert', "line {0}, inserting {1}", element.edit.textEdit.textEdit.rAnge.stArtLineNumber, element.selecting);
			}
		}

		return null;
	}
}

// --- IDENT

export clAss BulkEditIdentityProvider implements IIdentityProvider<BulkEditElement> {

	getId(element: BulkEditElement): { toString(): string; } {
		if (element instAnceof FileElement) {
			return element.edit.uri + (element.pArent instAnceof CAtegoryElement ? JSON.stringify(element.pArent.cAtegory.metAdAtA) : '');
		} else if (element instAnceof TextEditElement) {
			return element.pArent.edit.uri.toString() + element.idx;
		} else {
			return JSON.stringify(element.cAtegory.metAdAtA);
		}
	}
}

// --- RENDERER

clAss CAtegoryElementTemplAte {

	reAdonly icon: HTMLDivElement;
	reAdonly lAbel: IconLAbel;

	constructor(contAiner: HTMLElement) {
		contAiner.clAssList.Add('cAtegory');
		this.icon = document.creAteElement('div');
		contAiner.AppendChild(this.icon);
		this.lAbel = new IconLAbel(contAiner);
	}
}

export clAss CAtegoryElementRenderer implements ITreeRenderer<CAtegoryElement, FuzzyScore, CAtegoryElementTemplAte> {

	stAtic reAdonly id: string = 'CAtegoryElementRenderer';

	reAdonly templAteId: string = CAtegoryElementRenderer.id;

	renderTemplAte(contAiner: HTMLElement): CAtegoryElementTemplAte {
		return new CAtegoryElementTemplAte(contAiner);
	}

	renderElement(node: ITreeNode<CAtegoryElement, FuzzyScore>, _index: number, templAte: CAtegoryElementTemplAte): void {

		templAte.icon.style.setProperty('--bAckground-dArk', null);
		templAte.icon.style.setProperty('--bAckground-light', null);

		const { metAdAtA } = node.element.cAtegory;
		if (ThemeIcon.isThemeIcon(metAdAtA.iconPAth)) {
			// css
			const clAssNAme = ThemeIcon.AsClAssNAme(metAdAtA.iconPAth);
			templAte.icon.clAssNAme = clAssNAme ? `theme-icon ${clAssNAme}` : '';

		} else if (URI.isUri(metAdAtA.iconPAth)) {
			// bAckground-imAge
			templAte.icon.clAssNAme = 'uri-icon';
			templAte.icon.style.setProperty('--bAckground-dArk', `url("${metAdAtA.iconPAth.toString(true)}")`);
			templAte.icon.style.setProperty('--bAckground-light', `url("${metAdAtA.iconPAth.toString(true)}")`);

		} else if (metAdAtA.iconPAth) {
			// bAckground-imAge
			templAte.icon.clAssNAme = 'uri-icon';
			templAte.icon.style.setProperty('--bAckground-dArk', `url("${metAdAtA.iconPAth.dArk.toString(true)}")`);
			templAte.icon.style.setProperty('--bAckground-light', `url("${metAdAtA.iconPAth.light.toString(true)}")`);
		}

		templAte.lAbel.setLAbel(metAdAtA.lAbel, metAdAtA.description, {
			descriptionMAtches: creAteMAtches(node.filterDAtA),
		});
	}

	disposeTemplAte(templAte: CAtegoryElementTemplAte): void {
		templAte.lAbel.dispose();
	}
}

clAss FileElementTemplAte {

	privAte reAdonly _disposAbles = new DisposAbleStore();
	privAte reAdonly _locAlDisposAbles = new DisposAbleStore();

	privAte reAdonly _checkbox: HTMLInputElement;
	privAte reAdonly _lAbel: IResourceLAbel;
	privAte reAdonly _detAils: HTMLSpAnElement;

	constructor(
		contAiner: HTMLElement,
		resourceLAbels: ResourceLAbels,
		@ILAbelService privAte reAdonly _lAbelService: ILAbelService,
	) {

		this._checkbox = document.creAteElement('input');
		this._checkbox.clAssNAme = 'edit-checkbox';
		this._checkbox.type = 'checkbox';
		this._checkbox.setAttribute('role', 'checkbox');
		contAiner.AppendChild(this._checkbox);

		this._lAbel = resourceLAbels.creAte(contAiner, { supportHighlights: true });

		this._detAils = document.creAteElement('spAn');
		this._detAils.clAssNAme = 'detAils';
		contAiner.AppendChild(this._detAils);
	}

	dispose(): void {
		this._locAlDisposAbles.dispose();
		this._disposAbles.dispose();
		this._lAbel.dispose();
	}

	set(element: FileElement, score: FuzzyScore | undefined) {
		this._locAlDisposAbles.cleAr();

		this._checkbox.checked = element.isChecked();
		this._checkbox.disAbled = element.isDisAbled();
		this._locAlDisposAbles.Add(dom.AddDisposAbleListener(this._checkbox, 'chAnge', () => {
			element.setChecked(this._checkbox.checked);
		}));

		if (element.edit.type & BulkFileOperAtionType.RenAme && element.edit.newUri) {
			// renAme: oldNAme → newNAme
			this._lAbel.setResource({
				resource: element.edit.uri,
				nAme: locAlize('renAme.lAbel', "{0} → {1}", this._lAbelService.getUriLAbel(element.edit.uri, { relAtive: true }), this._lAbelService.getUriLAbel(element.edit.newUri, { relAtive: true })),
			}, {
				fileDecorAtions: { colors: true, bAdges: fAlse }
			});

			this._detAils.innerText = locAlize('detAil.renAme', "(renAming)");

		} else {
			// creAte, delete, edit: NAME
			const options = {
				mAtches: creAteMAtches(score),
				fileKind: FileKind.FILE,
				fileDecorAtions: { colors: true, bAdges: fAlse },
				extrAClAsses: <string[]>[]
			};
			if (element.edit.type & BulkFileOperAtionType.CreAte) {
				this._detAils.innerText = locAlize('detAil.creAte', "(creAting)");
			} else if (element.edit.type & BulkFileOperAtionType.Delete) {
				this._detAils.innerText = locAlize('detAil.del', "(deleting)");
				options.extrAClAsses.push('delete');
			} else {
				this._detAils.innerText = '';
			}
			this._lAbel.setFile(element.edit.uri, options);
		}
	}
}

export clAss FileElementRenderer implements ITreeRenderer<FileElement, FuzzyScore, FileElementTemplAte> {

	stAtic reAdonly id: string = 'FileElementRenderer';

	reAdonly templAteId: string = FileElementRenderer.id;

	constructor(
		privAte reAdonly _resourceLAbels: ResourceLAbels,
		@ILAbelService privAte reAdonly _lAbelService: ILAbelService,
	) { }

	renderTemplAte(contAiner: HTMLElement): FileElementTemplAte {
		return new FileElementTemplAte(contAiner, this._resourceLAbels, this._lAbelService);
	}

	renderElement(node: ITreeNode<FileElement, FuzzyScore>, _index: number, templAte: FileElementTemplAte): void {
		templAte.set(node.element, node.filterDAtA);
	}

	disposeTemplAte(templAte: FileElementTemplAte): void {
		templAte.dispose();
	}
}

clAss TextEditElementTemplAte {

	privAte reAdonly _disposAbles = new DisposAbleStore();
	privAte reAdonly _locAlDisposAbles = new DisposAbleStore();

	privAte reAdonly _checkbox: HTMLInputElement;
	privAte reAdonly _icon: HTMLDivElement;
	privAte reAdonly _lAbel: HighlightedLAbel;

	constructor(contAiner: HTMLElement) {
		contAiner.clAssList.Add('textedit');

		this._checkbox = document.creAteElement('input');
		this._checkbox.clAssNAme = 'edit-checkbox';
		this._checkbox.type = 'checkbox';
		this._checkbox.setAttribute('role', 'checkbox');
		contAiner.AppendChild(this._checkbox);

		this._icon = document.creAteElement('div');
		contAiner.AppendChild(this._icon);

		this._lAbel = new HighlightedLAbel(contAiner, fAlse);
	}

	dispose(): void {
		this._locAlDisposAbles.dispose();
		this._disposAbles.dispose();
	}

	set(element: TextEditElement) {
		this._locAlDisposAbles.cleAr();

		this._locAlDisposAbles.Add(dom.AddDisposAbleListener(this._checkbox, 'chAnge', e => {
			element.setChecked(this._checkbox.checked);
			e.preventDefAult();
		}));
		if (element.pArent.isChecked()) {
			this._checkbox.checked = element.isChecked();
			this._checkbox.disAbled = element.isDisAbled();
		} else {
			this._checkbox.checked = element.isChecked();
			this._checkbox.disAbled = element.isDisAbled();
		}

		let vAlue = '';
		vAlue += element.prefix;
		vAlue += element.selecting;
		vAlue += element.inserting;
		vAlue += element.suffix;

		let selectHighlight: IHighlight = { stArt: element.prefix.length, end: element.prefix.length + element.selecting.length, extrAClAsses: 'remove' };
		let insertHighlight: IHighlight = { stArt: selectHighlight.end, end: selectHighlight.end + element.inserting.length, extrAClAsses: 'insert' };

		let title: string | undefined;
		let { metAdAtA } = element.edit.textEdit;
		if (metAdAtA && metAdAtA.description) {
			title = locAlize('title', "{0} - {1}", metAdAtA.lAbel, metAdAtA.description);
		} else if (metAdAtA) {
			title = metAdAtA.lAbel;
		}

		const iconPAth = metAdAtA?.iconPAth;
		if (!iconPAth) {
			this._icon.style.displAy = 'none';
		} else {
			this._icon.style.displAy = 'block';

			this._icon.style.setProperty('--bAckground-dArk', null);
			this._icon.style.setProperty('--bAckground-light', null);

			if (ThemeIcon.isThemeIcon(iconPAth)) {
				// css
				const clAssNAme = ThemeIcon.AsClAssNAme(iconPAth);
				this._icon.clAssNAme = clAssNAme ? `theme-icon ${clAssNAme}` : '';

			} else if (URI.isUri(iconPAth)) {
				// bAckground-imAge
				this._icon.clAssNAme = 'uri-icon';
				this._icon.style.setProperty('--bAckground-dArk', `url("${iconPAth.toString(true)}")`);
				this._icon.style.setProperty('--bAckground-light', `url("${iconPAth.toString(true)}")`);

			} else {
				// bAckground-imAge
				this._icon.clAssNAme = 'uri-icon';
				this._icon.style.setProperty('--bAckground-dArk', `url("${iconPAth.dArk.toString(true)}")`);
				this._icon.style.setProperty('--bAckground-light', `url("${iconPAth.light.toString(true)}")`);
			}
		}

		this._lAbel.set(vAlue, [selectHighlight, insertHighlight], title, true);
		this._icon.title = title || '';
	}
}

export clAss TextEditElementRenderer implements ITreeRenderer<TextEditElement, FuzzyScore, TextEditElementTemplAte> {

	stAtic reAdonly id = 'TextEditElementRenderer';

	reAdonly templAteId: string = TextEditElementRenderer.id;

	renderTemplAte(contAiner: HTMLElement): TextEditElementTemplAte {
		return new TextEditElementTemplAte(contAiner);
	}

	renderElement({ element }: ITreeNode<TextEditElement, FuzzyScore>, _index: number, templAte: TextEditElementTemplAte): void {
		templAte.set(element);
	}

	disposeTemplAte(_templAte: TextEditElementTemplAte): void { }
}

export clAss BulkEditDelegAte implements IListVirtuAlDelegAte<BulkEditElement> {

	getHeight(): number {
		return 23;
	}

	getTemplAteId(element: BulkEditElement): string {

		if (element instAnceof FileElement) {
			return FileElementRenderer.id;
		} else if (element instAnceof TextEditElement) {
			return TextEditElementRenderer.id;
		} else {
			return CAtegoryElementRenderer.id;
		}
	}
}


export clAss BulkEditNAviLAbelProvider implements IKeyboArdNAvigAtionLAbelProvider<BulkEditElement> {

	getKeyboArdNAvigAtionLAbel(element: BulkEditElement) {
		if (element instAnceof FileElement) {
			return bAsenAme(element.edit.uri);
		} else if (element instAnceof CAtegoryElement) {
			return element.cAtegory.metAdAtA.lAbel;
		}
		return undefined;
	}
}
