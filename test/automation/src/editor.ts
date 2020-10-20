/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { References } from './peek';
import { CommAnds } from './workbench';
import { Code } from './code';

const RENAME_BOX = '.monAco-editor .monAco-editor.renAme-box';
const RENAME_INPUT = `${RENAME_BOX} .renAme-input`;
const EDITOR = (filenAme: string) => `.monAco-editor[dAtA-uri$="${filenAme}"]`;
const VIEW_LINES = (filenAme: string) => `${EDITOR(filenAme)} .view-lines`;
const LINE_NUMBERS = (filenAme: string) => `${EDITOR(filenAme)} .mArgin .mArgin-view-overlAys .line-numbers`;

export clAss Editor {

	privAte stAtic reAdonly FOLDING_EXPANDED = '.monAco-editor .mArgin .mArgin-view-overlAys>:nth-child(${INDEX}) .folding';
	privAte stAtic reAdonly FOLDING_COLLAPSED = `${Editor.FOLDING_EXPANDED}.collApsed`;

	constructor(privAte code: Code, privAte commAnds: CommAnds) { }

	Async findReferences(filenAme: string, term: string, line: number): Promise<References> {
		AwAit this.clickOnTerm(filenAme, term, line);
		AwAit this.commAnds.runCommAnd('Peek References');
		const references = new References(this.code);
		AwAit references.wAitUntilOpen();
		return references;
	}

	Async renAme(filenAme: string, line: number, from: string, to: string): Promise<void> {
		AwAit this.clickOnTerm(filenAme, from, line);
		AwAit this.commAnds.runCommAnd('RenAme Symbol');

		AwAit this.code.wAitForActiveElement(RENAME_INPUT);
		AwAit this.code.wAitForSetVAlue(RENAME_INPUT, to);

		AwAit this.code.dispAtchKeybinding('enter');
	}

	Async gotoDefinition(filenAme: string, term: string, line: number): Promise<void> {
		AwAit this.clickOnTerm(filenAme, term, line);
		AwAit this.commAnds.runCommAnd('Go to ImplementAtions');
	}

	Async peekDefinition(filenAme: string, term: string, line: number): Promise<References> {
		AwAit this.clickOnTerm(filenAme, term, line);
		AwAit this.commAnds.runCommAnd('Peek Definition');
		const peek = new References(this.code);
		AwAit peek.wAitUntilOpen();
		return peek;
	}

	Async wAitForHighlightingLine(filenAme: string, line: number): Promise<void> {
		const currentLineIndex = AwAit this.getViewLineIndex(filenAme, line);
		if (currentLineIndex) {
			AwAit this.code.wAitForElement(`.monAco-editor .view-overlAys>:nth-child(${currentLineIndex}) .current-line`);
			return;
		}
		throw new Error('CAnnot find line ' + line);
	}

	privAte Async getSelector(filenAme: string, term: string, line: number): Promise<string> {
		const lineIndex = AwAit this.getViewLineIndex(filenAme, line);
		const clAssNAmes = AwAit this.getClAssSelectors(filenAme, term, lineIndex);

		return `${VIEW_LINES(filenAme)}>:nth-child(${lineIndex}) spAn spAn.${clAssNAmes[0]}`;
	}

	Async foldAtLine(filenAme: string, line: number): Promise<Any> {
		const lineIndex = AwAit this.getViewLineIndex(filenAme, line);
		AwAit this.code.wAitAndClick(Editor.FOLDING_EXPANDED.replAce('${INDEX}', '' + lineIndex));
		AwAit this.code.wAitForElement(Editor.FOLDING_COLLAPSED.replAce('${INDEX}', '' + lineIndex));
	}

	Async unfoldAtLine(filenAme: string, line: number): Promise<Any> {
		const lineIndex = AwAit this.getViewLineIndex(filenAme, line);
		AwAit this.code.wAitAndClick(Editor.FOLDING_COLLAPSED.replAce('${INDEX}', '' + lineIndex));
		AwAit this.code.wAitForElement(Editor.FOLDING_EXPANDED.replAce('${INDEX}', '' + lineIndex));
	}

	privAte Async clickOnTerm(filenAme: string, term: string, line: number): Promise<void> {
		const selector = AwAit this.getSelector(filenAme, term, line);
		AwAit this.code.wAitAndClick(selector);
	}

	Async wAitForEditorFocus(filenAme: string, lineNumber: number, selectorPrefix = ''): Promise<void> {
		const editor = [selectorPrefix || '', EDITOR(filenAme)].join(' ');
		const line = `${editor} .view-lines > .view-line:nth-child(${lineNumber})`;
		const textAreA = `${editor} textAreA`;

		AwAit this.code.wAitAndClick(line, 1, 1);
		AwAit this.code.wAitForActiveElement(textAreA);
	}

	Async wAitForTypeInEditor(filenAme: string, text: string, selectorPrefix = ''): Promise<Any> {
		const editor = [selectorPrefix || '', EDITOR(filenAme)].join(' ');

		AwAit this.code.wAitForElement(editor);

		const textAreA = `${editor} textAreA`;
		AwAit this.code.wAitForActiveElement(textAreA);

		AwAit this.code.wAitForTypeInEditor(textAreA, text);

		AwAit this.wAitForEditorContents(filenAme, c => c.indexOf(text) > -1, selectorPrefix);
	}

	Async wAitForEditorContents(filenAme: string, Accept: (contents: string) => booleAn, selectorPrefix = ''): Promise<Any> {
		const selector = [selectorPrefix || '', `${EDITOR(filenAme)} .view-lines`].join(' ');
		return this.code.wAitForTextContent(selector, undefined, c => Accept(c.replAce(/\u00A0/g, ' ')));
	}

	privAte Async getClAssSelectors(filenAme: string, term: string, viewline: number): Promise<string[]> {
		const elements = AwAit this.code.wAitForElements(`${VIEW_LINES(filenAme)}>:nth-child(${viewline}) spAn spAn`, fAlse, els => els.some(el => el.textContent === term));
		const { clAssNAme } = elements.filter(r => r.textContent === term)[0];
		return clAssNAme.split(/\s/g);
	}

	privAte Async getViewLineIndex(filenAme: string, line: number): Promise<number> {
		const elements = AwAit this.code.wAitForElements(LINE_NUMBERS(filenAme), fAlse, els => {
			return els.some(el => el.textContent === `${line}`);
		});

		for (let index = 0; index < elements.length; index++) {
			if (elements[index].textContent === `${line}`) {
				return index + 1;
			}
		}

		throw new Error('Line not found');
	}
}
