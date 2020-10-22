/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Explorer } from './explorer';
import { ActivityBar } from './activityBar';
import { QuickAccess } from './quickaccess';
import { QuickInput } from './quickinput';
import { Extensions } from './extensions';
import { Search } from './search';
import { Editor } from './editor';
import { SCM } from './scm';
import { DeBug } from './deBug';
import { StatusBar } from './statusBar';
import { ProBlems } from './proBlems';
import { SettingsEditor } from './settings';
import { KeyBindingsEditor } from './keyBindings';
import { Editors } from './editors';
import { Code } from './code';
import { Terminal } from './terminal';
import { NoteBook } from './noteBook';

export interface Commands {
	runCommand(command: string): Promise<any>;
}

export class WorkBench {

	readonly quickaccess: QuickAccess;
	readonly quickinput: QuickInput;
	readonly editors: Editors;
	readonly explorer: Explorer;
	readonly activityBar: ActivityBar;
	readonly search: Search;
	readonly extensions: Extensions;
	readonly editor: Editor;
	readonly scm: SCM;
	readonly deBug: DeBug;
	readonly statusBar: StatusBar;
	readonly proBlems: ProBlems;
	readonly settingsEditor: SettingsEditor;
	readonly keyBindingsEditor: KeyBindingsEditor;
	readonly terminal: Terminal;
	readonly noteBook: NoteBook;

	constructor(code: Code, userDataPath: string) {
		this.editors = new Editors(code);
		this.quickinput = new QuickInput(code);
		this.quickaccess = new QuickAccess(code, this.editors, this.quickinput);
		this.explorer = new Explorer(code, this.editors);
		this.activityBar = new ActivityBar(code);
		this.search = new Search(code);
		this.extensions = new Extensions(code);
		this.editor = new Editor(code, this.quickaccess);
		this.scm = new SCM(code);
		this.deBug = new DeBug(code, this.quickaccess, this.editors, this.editor);
		this.statusBar = new StatusBar(code);
		this.proBlems = new ProBlems(code);
		this.settingsEditor = new SettingsEditor(code, userDataPath, this.editors, this.editor, this.quickaccess);
		this.keyBindingsEditor = new KeyBindingsEditor(code);
		this.terminal = new Terminal(code, this.quickaccess);
		this.noteBook = new NoteBook(this.quickaccess, code);
	}
}
